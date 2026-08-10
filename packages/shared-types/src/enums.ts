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
//
// THREE phases since v0.80.0, down from six. The arc a student actually walks is
// "explore → read → build", and each of the three is entered by a real event:
//
//   discovery          a new lab starts here — explore topics, browse the fair hub,
//                      keep the Project and Failure logs
//   literature_review  entered by locking a FINAL TOPIC, which also assigns the
//                      lab type; unlocks the Literature Review and the Battle Arena
//   plan_refinement    entered by entering a research idea, which every member must
//                      earn by demonstrating proficiency on 10 sources; unlocks the
//                      Research Plan
//   project_development entered at 20 fully-proficient sources; unlocks the rest of
//                      the Operations Hub (Field Codex, Proof of Expertise, Data
//                      Terminal) and the Showcase
//
// The retired three were never events. `lab_selection` and `research_planning`
// were passed through automatically, and `showcase` only ever gated the Showcase
// gateway — three enum values, no student-visible transition, and a phase gate
// that made features look live while every write 403'd.
export const PHASE_ORDER = [
  'discovery',
  'literature_review',
  'plan_refinement',
  'project_development',
] as const

export type ProjectPhase = (typeof PHASE_ORDER)[number]

// PvP-raid spell type; cycle: empirical > theoretical > applied > empirical (spec §11.4)
export type SpellType = 'empirical' | 'theoretical' | 'applied'
