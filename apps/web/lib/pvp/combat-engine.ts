import { db } from '@/lib/db'
import type { LabType, SpellType } from '@scienium/shared-types'
import type {
  BuildingTarget,
  RaidCastEvent,
  RaidResult,
  RaidSession,
  Spell,
} from '@scienium/shared-types'

// ─── Constants ──────────────────────────────────────────────────────────────

export const SPELL_BASE_DAMAGE = 25
/**
 * Fraction of a spell's base damage added per building level above 1, so a
 * level-15 building's spell hits at 1 + 14 × 0.04 = 1.56×. Deliberately flatter
 * than the building-health curve (100 + 20 × level = 3.3× at L15): a developed
 * base is meant to get relatively tankier, which caps late-game trophy farming.
 * This is THE balance knob — tune here, nowhere else.
 */
export const SPELL_DAMAGE_PER_LEVEL = 0.04
/**
 * Fallback blast radius, in PLOT TILES (lib/plot.ts grid units), used when a
 * catalog row has none. Was 80 — a pixel value compared against tile coordinates
 * (posX/posY are gx/gy in [-3, 3]), so every cast covered the entire base and
 * aiming did nothing. Radius is a tile distance now, matching the design sheet.
 */
export const SPELL_AOE_RADIUS = 1.5
export const SPELL_CAST_DELAY_MS = 1500

/** A spell's damage at a given building level. */
export function scaleDamage(baseDamage: number, level: number): number {
  return baseDamage * (1 + SPELL_DAMAGE_PER_LEVEL * Math.max(0, level - 1))
}

export const BUILDING_BASE_HEALTH = 100
export const BUILDING_HEALTH_PER_LEVEL = 20
export const RAID_TIME_LIMIT_MS = 15_000

export const TROPHY_GAIN_THRESHOLD = 30 // percent — below this = loss
export const MAX_TROPHY_GAIN = 10 // at 100% destruction
export const TROPHY_LOSS_THRESHOLD = 30 // percent — below this = loss
export const MAX_TROPHY_LOSS = 10 // at 0% destruction
export const TROPHY_LOSS_TODO = true // exact loss formula is a TODO tunable

// ─── Spell Construction ─────────────────────────────────────────────────────

/**
 * Build a Spell from a team's building row + the catalog `Spell` row it maps to.
 *
 * The catalog's baseDamage / radius / cooldownMs used to be ignored in favour of
 * the module constants, which made every spell identical and left three DB
 * columns dead. They are the source of truth now; the constants are only
 * fallbacks for rows that predate the seeded catalog.
 */
export function buildSpell(
  id: string,
  name: string,
  buildingId: string,
  level: number,
  labType: LabType,
  type: SpellType,
  catalog?: {
    baseDamage: number
    radius: number
    cooldownMs: number
    icon?: string
    lingering?: boolean
  },
): Spell {
  return {
    id,
    name,
    buildingId,
    level,
    damage: Math.round(scaleDamage(catalog?.baseDamage ?? SPELL_BASE_DAMAGE, level)),
    aoeRadius: catalog?.radius ?? SPELL_AOE_RADIUS,
    castDelay: catalog?.cooldownMs ?? SPELL_CAST_DELAY_MS,
    labType,
    type,
    icon: catalog?.icon,
    lingering: catalog?.lingering,
  }
}

// ─── Building Target Construction ──────────────────────────────────────────

/**
 * Build a BuildingTarget from a defender's building row.
 * Health = base 100 + 20 × level.  Always starts at full health at raid start.
 */
export function buildBuildingTarget(
  buildingId: string,
  name: string,
  level: number,
  posX: number,
  posY: number,
  type: SpellType,
  sprite?: string | null,
): BuildingTarget {
  const maxHealth = BUILDING_BASE_HEALTH + BUILDING_HEALTH_PER_LEVEL * level
  return {
    buildingId,
    name,
    maxHealth,
    currentHealth: maxHealth, // always full at raid start
    position: { x: posX, y: posY },
    type,
    level,
    sprite: sprite ?? null,
  }
}

// ─── Damage Resolution ─────────────────────────────────────────────────────

/**
 * Resolves a single spell cast against the defender base.
 * Damages every building within `spell.aoeRadius` TILES of (x, y) — the cast
 * point and every building position are plot cell coordinates (lib/plot.ts).
 * Damage is scaled by spell type effectiveness vs. building type:
 *   - Same type:      1×
 *   - Super-effective: 2×  (empirical > theoretical > applied > empirical)
 *   - Resist:         0.5×
 * Then multiplied by the Spell Power Meter multiplier.
 *
 * Returns the updated defenderBase array (mutates in place, also returned).
 */
export function resolveCast(
  session: RaidSession,
  event: RaidCastEvent,
  powerMultiplier: number,
): BuildingTarget[] {
  const spell = session.spellsAvailable.find((s) => s.id === event.spellId)
  if (!spell) return session.defenderBase

  const baseDamage = spell.damage * powerMultiplier
  const radius = spell.aoeRadius
  const radiusSq = radius * radius

  for (const building of session.defenderBase) {
    const dx = building.position.x - event.x
    const dy = building.position.y - event.y
    if (dx * dx + dy * dy > radiusSq) continue // outside AOE

    const effectiveness = typeEffectiveness(spell.type, building.type)
    const damage = baseDamage * effectiveness
    building.currentHealth = Math.max(0, building.currentHealth - damage)
  }

  return session.defenderBase
}

/**
 * Type effectiveness: empirical > theoretical > applied > empirical.
 * Returns 2.0 (super-effective), 0.5 (resist), or 1.0 (neutral).
 */
export function typeEffectiveness(
  spellType: SpellType,
  buildingType: SpellType,
): number {
  if (spellType === buildingType) return 1.0
  if (isSuperEffective(spellType, buildingType)) return 2.0
  return 0.5 // resisted
}

const TYPE_ORDER: SpellType[] = ['empirical', 'theoretical', 'applied']

export function isSuperEffective(attacker: SpellType, defender: SpellType): boolean {
  const a = TYPE_ORDER.indexOf(attacker)
  const d = TYPE_ORDER.indexOf(defender)
  return (a + 1) % 3 === d // next in cycle is super-effective
}

// ─── Raid Completion ────────────────────────────────────────────────────────

/**
 * Call when the raid ends (timeout or attacker finishes). Computes results,
 * persists the raid row, updates trophies for BOTH teams, and returns the result.
 *
 * If `existingRaidId` is provided, the PvpRaid row already exists (created by
 * start_raid) and is updated in-place — only endedAt / percentDestroyed /
 * trophiesDelta are written; raidLogJson is left as-is (the action route has
 * been updating it after each cast). Otherwise a new row is created — this
 * preserves backward compatibility for callers that don't pre-create the row.
 *
 * Trophy math (v1 spec §5): attacker gains trophyDelta, defender loses the
 * same amount. Both teams' current counts are read before the upsert so
 * neither side's history is overwritten.
 *
 * NOTE: does NOT touch TeamDailyTaskDay — raiding does not fill the meter.
 */
export async function completeRaid(
  session: RaidSession,
  existingRaidId?: string,
): Promise<RaidResult> {
  const now = Date.now()
  session.endedAt = now

  // 1. Compute percent destroyed
  const totalMaxHealth = session.defenderBase.reduce(
    (sum, b) => sum + b.maxHealth,
    0,
  )
  const totalDamageDealt = session.defenderBase.reduce(
    (sum, b) => sum + (b.maxHealth - b.currentHealth),
    0,
  )
  const percentDestroyed =
    totalMaxHealth > 0 ? (totalDamageDealt / totalMaxHealth) * 100 : 0

  // 2. Compute trophy delta
  const trophyDelta = calculateTrophyDelta(percentDestroyed)

  // 3. Read current trophy counts for BOTH teams
  const [attackerTrophiesRow, defenderTrophiesRow] = await Promise.all([
    db.pvpTrophies.findUnique({
      where: { teamId: session.attackerTeamId },
      select: { currentTrophies: true },
    }),
    db.pvpTrophies.findUnique({
      where: { teamId: session.defenderTeamId },
      select: { currentTrophies: true },
    }),
  ])
  const attackerBefore = attackerTrophiesRow?.currentTrophies ?? 0
  const defenderBefore = defenderTrophiesRow?.currentTrophies ?? 0

  // 4. Persist raid (create new or update existing row from start_raid)
  const raidData = {
    endedAt: new Date(now),
    percentDestroyed: percentDestroyed,
    trophiesDelta: trophyDelta,
    raidLogJson: {
      spellsAvailable: session.spellsAvailable,
      defenderBase: session.defenderBase,
    } as any,
  }

  if (existingRaidId) {
    // Row already exists — only mark ended + results; raidLogJson was
    // already kept up-to-date by the action route after each cast.
    await db.pvpRaid.update({
      where: { id: existingRaidId },
      data: {
        endedAt: raidData.endedAt,
        percentDestroyed: raidData.percentDestroyed,
        trophiesDelta: raidData.trophiesDelta,
      },
    })
  } else {
    await db.pvpRaid.create({
      data: {
        id: session.id,
        attackerTeamId: session.attackerTeamId,
        defenderTeamId: session.defenderTeamId,
        startedAt: new Date(session.startedAt),
        ...raidData,
      },
    })
  }

  // 5. Update trophy counts — attacker gains delta, defender loses same amount
  await Promise.all([
    db.pvpTrophies.upsert({
      where: { teamId: session.attackerTeamId },
      create: {
        teamId: session.attackerTeamId,
        currentTrophies: attackerBefore + trophyDelta,
      },
      update: { currentTrophies: { increment: trophyDelta } },
    }),
    db.pvpTrophies.upsert({
      where: { teamId: session.defenderTeamId },
      create: {
        teamId: session.defenderTeamId,
        currentTrophies: defenderBefore - trophyDelta,
      },
      update: { currentTrophies: { decrement: trophyDelta } },
    }),
  ])

  const result: RaidResult = {
    raidId: session.id,
    percentDestroyed: Math.round(percentDestroyed * 100) / 100,
    trophyDelta,
    attackerTrophiesAfter: attackerBefore + trophyDelta,
  }

  session.result = result
  return result
}

// ─── Trophy Calculation ─────────────────────────────────────────────────────

/**
 * Calculates trophy delta from percent destroyed.
 *
 *   percent >= 30%  →  GAIN, scaled proportionally to MAX_TROPHY_GAIN (10)
 *                      rounded UP:  51% → 6 trophies
 *   percent < 30%   →  LOSS, scaled proportionally (TODO: exact formula)
 *
 * @param percentDestroyed 0–100
 * @returns positive = gained, negative = lost
 */
export function calculateTrophyDelta(percentDestroyed: number): number {
  if (percentDestroyed >= TROPHY_GAIN_THRESHOLD) {
    // Gain: scale 30–100% → 0–10 trophies, round up
    const ratio =
      (percentDestroyed - TROPHY_GAIN_THRESHOLD) /
      (100 - TROPHY_GAIN_THRESHOLD)
    return Math.ceil(ratio * MAX_TROPHY_GAIN)
  }

  // Loss: below threshold — inversely scaled with Math.ceil for steppy integer loss.
	// 0% = -MAX_TROPHY_LOSS (worst), 29% = -1 (best loss), threshold boundary = 0.
	if (TROPHY_LOSS_TODO) {
	  const rawLoss =
	    MAX_TROPHY_LOSS -
	    Math.ceil(
	      (percentDestroyed / TROPHY_LOSS_THRESHOLD) * (MAX_TROPHY_LOSS - 1),
	    )
	  return -Math.min(Math.max(rawLoss, 1), MAX_TROPHY_LOSS)
	}

  return 0
}

// ─── Raid Quota Helpers ─────────────────────────────────────────────────────

/**
 * Checks whether `teamId` can initiate a raid today.
 * Returns the remaining raids and refinds, or null if the quota table has
 * no row yet (first raid of the day).
 */
export async function getRaidQuota(teamId: string): Promise<{
  raidsUsed: number
  refindsUsed: number
  raidsRemaining: number | null // null = unlimited (no row yet)
  refindsRemaining: number | null // null = unlimited
}> {
  const row = await db.pvpRaidQuota.findUnique({
    where: { teamId_date: { teamId, date: todayUtc() } },
  })

  if (!row) {
    return {
      raidsUsed: 0,
      refindsUsed: 0,
      raidsRemaining: null,
      refindsRemaining: null,
    }
  }

  return {
    raidsUsed: row.raidsUsed,
    refindsUsed: row.refindsUsed,
    raidsRemaining: null, // quota not enforced at engine level; routes decide caps
    refindsRemaining: null,
  }
}

/**
 * Records that a raid was used for `teamId` today.  Idempotent via upsert.
 */
export async function consumeRaid(teamId: string): Promise<void> {
  const today = todayUtc()
  await db.pvpRaidQuota.upsert({
    where: { teamId_date: { teamId, date: today } },
    create: { teamId, date: today, raidsUsed: 1, refindsUsed: 0 },
    update: { raidsUsed: { increment: 1 } },
  })
}

/**
 * Records that a refind was used for `teamId` today.  Idempotent via upsert.
 */
export async function consumeRefind(teamId: string): Promise<void> {
  const today = todayUtc()
  await db.pvpRaidQuota.upsert({
    where: { teamId_date: { teamId, date: today } },
    create: { teamId, date: today, raidsUsed: 0, refindsUsed: 1 },
    update: { refindsUsed: { increment: 1 } },
  })
}

// ─── Internal ──────────────────────────────────────────────────────────────

function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}
