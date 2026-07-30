// Canonical const arrays — must match schema.prisma LabType / ProjectPhase
// exactly. apps/web/lib/phase.ts re-exports these; nothing else should
// redefine them.

export const LAB_TYPES = [
  'biocore',
  'chemworks',
  'volt_lab',
  'terrabase',
  'mindframe',
  'axiom',
] as const

export type LabType = (typeof LAB_TYPES)[number]

// Phase order is meaningful: later phases inherit all earlier unlocks.
export const PHASE_ORDER = [
  'discovery',
  'lab_selection',
  'literature_review',
  'research_planning',
  'working',
  'showcase',
] as const

export type ProjectPhase = (typeof PHASE_ORDER)[number]

// PvP-raid spell type; cycle: empirical > theoretical > applied > empirical (spec §11.4)
export type SpellType = 'empirical' | 'theoretical' | 'applied'
