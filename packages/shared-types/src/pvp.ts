import type { CombatType } from './enums'

export interface MoveEffect {
  type: 'confusion' | 'stat_change' | 'crit_boost' | 'scaling_power'
  target: 'self' | 'opponent'
  stat?: 'atk' | 'def' | 'spd'
  delta?: number
  condition?: string
}

export interface Move {
  id: string
  name: string
  type: CombatType
  baseDamage: number
  accuracy: number
  pp: number
  secondaryEffect: MoveEffect | null
  flavorText: string
}

export interface CharacterStats {
  hp: number
  atk: number
  def: number
  spd: number
}

export interface BattleCharacter {
  id: string
  name: string
  type: CombatType
  level: number
  stats: CharacterStats
  currentHp: number
  moves: Move[]
  spriteUrl: string
  statusEffect: string | null
}

export interface BattleAction {
  type: 'move' | 'switch'
  moveId?: string
  switchToCharacterId?: string
}

export interface BattleTurnResult {
  attackerAction: BattleAction
  defenderAction: BattleAction
  events: BattleEvent[]
  battleOver: boolean
  winnerId?: string
}

export interface BattleEvent {
  type:
    | 'damage'
    | 'miss'
    | 'faint'
    | 'switch'
    | 'status_apply'
    | 'stat_change'
    | 'crit'
    | 'effectiveness'
  characterId: string
  value?: number
  effectiveness?: 'super_effective' | 'not_very_effective' | 'normal'
  message: string
}
