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
}

export const SPELL_POWER_TIERS: SpellPowerTierDef[] = [
  { tier: 'NONE', label: 'Dormant', minTasks: 0, maxTasks: 0, multiplier: 0.5 },
  { tier: 'BASE', label: 'Active', minTasks: 1, maxTasks: 2, multiplier: 1.0 },
  {
    tier: 'BOOSTED',
    label: 'Charged',
    minTasks: 3,
    maxTasks: 4,
    multiplier: 1.5,
  },
  {
    tier: 'MAX',
    label: 'Overcharged',
    minTasks: 5,
    maxTasks: Infinity,
    multiplier: 2.0,
  },
]

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
  aoeRadius: number // 80px
  castDelay: number // 1500ms
  labType: LabType
  type: SpellType // empirical | theoretical | applied
}

// ─── Building Target (Option B — spec §4.3) ───────────────────────────────
// A building in the defender's base, visible to the attacker before they
// commit to a raid. Health scales with level.

export interface BuildingTarget {
  buildingId: string
  name: string
  maxHealth: number // 100 + 20 * level
  currentHealth: number
  position: { x: number; y: number }
  type: SpellType
  level: number
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
  attackerTrophiesAfter: number // defender unaffected in v1
}
