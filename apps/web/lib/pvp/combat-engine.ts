import type { BattleAction, BattleCharacter, BattleEvent, BattleTurnResult, Move } from '@scienium/shared-types'

const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
  empirical: { theoretical: 2, applied: 0.5, empirical: 1 },
  theoretical: { applied: 2, empirical: 0.5, theoretical: 1 },
  applied: { empirical: 2, theoretical: 0.5, applied: 1 },
}

function calcDamage(attacker: BattleCharacter, defender: BattleCharacter, move: Move): number {
  const typeMultiplier = TYPE_EFFECTIVENESS[move.type]?.[defender.type] ?? 1
  const stab = move.type === attacker.type ? 1.5 : 1
  const base = move.baseDamage * (attacker.stats.atk / defender.stats.def) * typeMultiplier * stab
  return Math.max(1, Math.round(base))
}

function pickMoveForAi(attacker: BattleCharacter, defender: BattleCharacter): Move {
  // Heuristic: pick move with best expected damage
  return attacker.moves.reduce((best, move) => {
    const dmg = calcDamage(attacker, defender, move)
    return dmg > calcDamage(attacker, defender, best) ? move : best
  })
}

export function resolveTurn(
  attacker: BattleCharacter,
  defender: BattleCharacter,
  attackerAction: BattleAction,
  defenderAction: BattleAction,
): BattleTurnResult {
  const events: BattleEvent[] = []
  let battleOver = false
  let winnerId: string | undefined

  // Simple resolution: attacker with higher speed goes first
  // Full implementation handles switch actions, status effects, etc.
  if (attackerAction.type === 'move' && attackerAction.moveId) {
    const move = attacker.moves.find((m) => m.id === attackerAction.moveId)
    if (move) {
      const hit = Math.random() * 100 < move.accuracy
      if (hit) {
        const dmg = calcDamage(attacker, defender, move)
        defender.currentHp = Math.max(0, defender.currentHp - dmg)
        const effectiveness = TYPE_EFFECTIVENESS[move.type]?.[defender.type] ?? 1
        events.push({
          type: 'damage',
          characterId: defender.id,
          value: dmg,
          effectiveness:
            effectiveness === 2
              ? 'super_effective'
              : effectiveness === 0.5
              ? 'not_very_effective'
              : 'normal',
          message: `${attacker.name} used ${move.name}! Dealt ${dmg} damage.`,
        })
        if (defender.currentHp === 0) {
          events.push({ type: 'faint', characterId: defender.id, message: `${defender.name} fainted!` })
          battleOver = true
          winnerId = attacker.id
        }
      } else {
        events.push({ type: 'miss', characterId: attacker.id, message: `${attacker.name}'s attack missed!` })
      }
    }
  }

  return { attackerAction, defenderAction, events, battleOver, winnerId }
}

export function aiChooseAction(
  aiCharacter: BattleCharacter,
  opponentCharacter: BattleCharacter,
): BattleAction {
  const move = pickMoveForAi(aiCharacter, opponentCharacter)
  return { type: 'move', moveId: move.id }
}
