import type { SpellType } from './enums'

// PvP raid system (spec §11). Each economy building grants one spell; the spell's
// level equals the building's level and all per-level scaling lives in code.

// Spell Power Meter tiers — determines how hard the attacker's spells hit today
// based on daily task completion (Option B, spec §4.4).
export type SpellPowerTier = 'NONE' | 'BASE' | 'BOOSTED' | 'MAX'
export interface Spell {
  id: string
  buildingKey: string
  type: SpellType
  baseDamage: number
  radius: number
  cooldownMs: number
}

// One cast event streamed from the client during a raid; the server validates
// the timer window + cooldown spacing and resolves damage server-side.
export interface RaidCastEvent {
  spellId: string
  x: number
  y: number
  clientTs: number
}

// A building in the server's snapshot of the defender's base during a raid.
export interface RaidBuildingState {
  buildingKey: string
  type: SpellType
  posX: number
  posY: number
  maxHp: number
  currentHp: number
}

export interface RaidResult {
  raidId: string
  percentDestroyed: number
  trophiesDelta: number
}
