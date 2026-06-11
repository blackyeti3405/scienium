export const MOVES = [
  // Empirical moves
  { name: 'Sharp Observation', type: 'empirical', baseDamage: 40, accuracy: 100, pp: 30, secondaryEffect: null, flavorText: 'A reliable, precise strike from careful measurement.' },
  { name: 'Confounding Variable', type: 'empirical', baseDamage: 60, accuracy: 85, pp: 20, secondaryEffect: { type: 'confusion', target: 'opponent' }, flavorText: 'Introduces unexpected noise into the opponent\'s reasoning.' },
  { name: 'Controlled Sample', type: 'empirical', baseDamage: 45, accuracy: 95, pp: 25, secondaryEffect: null, flavorText: 'A measured, reproducible hit.' },
  { name: 'Field Observation', type: 'empirical', baseDamage: 55, accuracy: 90, pp: 20, secondaryEffect: null, flavorText: 'Data collected directly in the wild.' },
  { name: 'Replication Study', type: 'empirical', baseDamage: 35, accuracy: 100, pp: 35, secondaryEffect: { type: 'scaling_power', target: 'self', condition: 'consecutive_use' }, flavorText: 'Results become more powerful the more times reproduced.' },
  { name: 'Null Hypothesis', type: 'empirical', baseDamage: 50, accuracy: 90, pp: 20, secondaryEffect: null, flavorText: 'Tests the baseline before striking.' },

  // Theoretical moves
  { name: 'Pattern Recognition', type: 'theoretical', baseDamage: 50, accuracy: 90, pp: 20, secondaryEffect: { type: 'crit_boost', target: 'self', condition: 'opponent_repeated_move' }, flavorText: 'Doubles damage if the opponent has used the same move twice.' },
  { name: 'Edge Case', type: 'theoretical', baseDamage: 30, accuracy: 100, pp: 25, secondaryEffect: { type: 'crit_boost', target: 'self', condition: 'opponent_high_hp' }, flavorText: 'Always crits if the opponent is above 75% HP.' },
  { name: 'Formal Proof', type: 'theoretical', baseDamage: 70, accuracy: 75, pp: 15, secondaryEffect: null, flavorText: 'High damage but requires precision to land.' },
  { name: 'Logical Deduction', type: 'theoretical', baseDamage: 55, accuracy: 90, pp: 20, secondaryEffect: null, flavorText: 'Methodical reasoning guides every strike.' },
  { name: 'Falsification', type: 'theoretical', baseDamage: 65, accuracy: 80, pp: 15, secondaryEffect: null, flavorText: 'Attacks the weakest assumption in the opponent\'s stance.' },
  { name: 'Occam\'s Razor', type: 'theoretical', baseDamage: 45, accuracy: 95, pp: 25, secondaryEffect: { type: 'stat_change', target: 'opponent', stat: 'def', delta: -1 }, flavorText: 'Cuts away complexity, lowering defenses.' },

  // Applied moves
  { name: 'Iterative Design', type: 'applied', baseDamage: 35, accuracy: 100, pp: 30, secondaryEffect: { type: 'scaling_power', target: 'self', condition: 'consecutive_use' }, flavorText: 'Power increases each turn it is used.' },
  { name: 'Stress Test', type: 'applied', baseDamage: 70, accuracy: 90, pp: 15, secondaryEffect: { type: 'stat_change', target: 'self', stat: 'def', delta: -1 }, flavorText: 'High damage but lowers user\'s defense.' },
  { name: 'Prototype Build', type: 'applied', baseDamage: 50, accuracy: 90, pp: 20, secondaryEffect: null, flavorText: 'A rapid first implementation hits hard.' },
  { name: 'System Integration', type: 'applied', baseDamage: 55, accuracy: 85, pp: 20, secondaryEffect: { type: 'stat_change', target: 'self', stat: 'atk', delta: 1 }, flavorText: 'Connecting components boosts attack power.' },
  { name: 'Optimization Pass', type: 'applied', baseDamage: 45, accuracy: 95, pp: 25, secondaryEffect: { type: 'stat_change', target: 'self', stat: 'spd', delta: 1 }, flavorText: 'Streamlining improves speed for follow-up.' },
  { name: 'Load Test', type: 'applied', baseDamage: 60, accuracy: 85, pp: 20, secondaryEffect: null, flavorText: 'Pushes the opponent to their operational limit.' },
]
