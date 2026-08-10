import type { LabType, SpellType } from './enums'

// ─── Spell Power Tiers (Option B — spec §4.4) ─────────────────────────────
// The multiplier is applied to every spell's baseDamage on the attacker's side
// for the entire day. Resets at midnight. Raiding does NOT drain it.

export type SpellPowerTier = 'NONE' | 'BASE' | 'BOOSTED' | 'MAX'

export interface SpellPowerTierDef {
  tier: SpellPowerTier
  label: string
  minTasks: number
  maxTasks: number
  multiplier: number
  /** Tailwind class for the tier badge / meter fill (shared by lobby + HUD). */
  color: string
}

/**
 * THE tier table. Server (spell-power.ts), the lobby badge and the battle HUD
 * all read this — it was previously duplicated in four files, which is how the
 * spec drifted from the code.
 */
export const SPELL_POWER_TIERS: SpellPowerTierDef[] = [
  {
    tier: 'NONE',
    label: 'Dormant',
    minTasks: 0,
    maxTasks: 0,
    multiplier: 0.5,
    color: 'bg-slate-600',
  },
  {
    tier: 'BASE',
    label: 'Active',
    minTasks: 1,
    maxTasks: 2,
    multiplier: 1.0,
    color: 'bg-blue-500',
  },
  {
    tier: 'BOOSTED',
    label: 'Charged',
    minTasks: 3,
    maxTasks: 4,
    multiplier: 1.5,
    color: 'bg-violet-500',
  },
  {
    tier: 'MAX',
    label: 'Overcharged',
    minTasks: 5,
    maxTasks: Infinity,
    multiplier: 2.0,
    color: 'bg-amber-400',
  },
]

/** Tasks needed for the top tier — the meter fills linearly up to this. */
export const SPELL_POWER_MAX_TASKS = 5

/** Tier for a daily task count (floor: 4 tasks is still Charged). */
export function spellPowerTierFor(tasksCompleted: number): SpellPowerTierDef {
  return (
    [...SPELL_POWER_TIERS]
      .reverse()
      .find((t) => tasksCompleted >= t.minTasks) ?? SPELL_POWER_TIERS[0]
  )
}

// ─── Spell (Option B — spec §3, §4) ───────────────────────────────────────
// Each economy building grants one spell. Damage = base 25 + 5 per building
// level. Aoe radius and cast delay are fixed per spell. Flavored by labType
// (six visual skins, identical mechanics underneath).

export interface Spell {
  id: string
  name: string
  buildingId: string
  level: number
  damage: number // computed: 25 + 5 * level
  /** Blast radius in PLOT TILES (lib/plot.ts grid units), from the spell catalog. */
  aoeRadius: number
  /** Per-spell cooldown in ms, from the spell catalog. */
  castDelay: number
  labType: LabType
  type: SpellType // empirical | theoretical | applied
  /**
   * Hotbar sprite slug from the spell catalog — `sig_<buildingKey>` for a lab
   * signature, `<shape>_<type>` for a shared archetype. Optional: raids
   * snapshotted before this field existed fall back to a coloured tile.
   */
  icon?: string
  /** Damage-over-time in the design — drives which cast FX plays. */
  lingering?: boolean
}

// ─── Building Target (Option B — spec §4.3) ───────────────────────────────
// A building in the defender's base, visible to the attacker before they
// commit to a raid. Health scales with level.

export interface BuildingTarget {
  buildingId: string
  name: string
  maxHealth: number // 100 + 20 * level
  currentHealth: number
  /** Plot cell (lib/plot.ts gx/gy) — the defender's real layout, not a grid slot. */
  position: { x: number; y: number }
  type: SpellType
  level: number
  /**
   * Sprite slug for the raid view (`ShopBuilding.sprite`), resolved against the
   * defender's lab type. Optional: raids started before this field existed
   * fall back to a placeholder tile.
   */
  sprite?: string | null
  /**
   * True when this target is a GATEWAY (the feature buildings — Discovery,
   * Literature Review, the Ops Hub…) rather than an economy building.
   *
   * They are raidable and destructible like anything else, but they differ in
   * two ways the client has to know about: their art comes from the gateway
   * sprite set keyed by lab skin (`getGatewaySprite`) rather than the economy
   * set keyed by upgrade tier, and they have no upgrade level — so `sprite`
   * carries the gateway KEY and `level` is 0.
   */
  isGateway?: boolean
}

// ─── Raid Session (Option B — spec §4) ────────────────────────────────────
// The full state of an active or completed raid. Created server-side when a
// raid is initiated; mutated by cast events streamed from the client.

export interface RaidSession {
  id: string
  attackerTeamId: string // references Team.id (cuid)
  defenderTeamId: string // references Team.id (cuid)
  timeLimit: number // 15000ms (15 seconds)
  spellsAvailable: Spell[]
  defenderBase: BuildingTarget[]
  /** Defender's lab type — picks the sprite skin the raid view renders. */
  defenderLabType?: LabType | null
  startedAt: number // epoch ms
  endedAt?: number // epoch ms
  result?: RaidResult
}

// ─── Raid Cast Event ───────────────────────────────────────────────────────
// One cast event streamed from the client during a raid; the server validates
// the timer window and resolves damage server-side.

export interface RaidCastEvent {
  spellId: string
  x: number
  y: number
  clientTs: number
}

// ─── Raid Result ───────────────────────────────────────────────────────────

export interface RaidResult {
  raidId: string
  percentDestroyed: number // 0–100
  trophyDelta: number // positive = gained by attacker, negative = lost
  attackerTrophiesAfter: number // defender loses same trophies in v1
}
