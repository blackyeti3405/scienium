/**
 * Single source of truth for phase-based feature gating.
 *
 * Both UI components and API route handlers import from here.
 * Never gate features client-only — always mirror checks server-side.
 *
 * Phase order (cumulative — later phases inherit all earlier unlocks):
 *   discovery → literature_review → working
 *
 * Each arrow is a real student action: locking a final topic, then finishing the
 * review and entering a research idea. See PHASE_ORDER in @scienium/shared-types
 * for why the other three phases were retired in v0.80.0.
 */

// ─── Phase + lab types ─────────────────────────────────────────────────────────
// Canonical definitions live in @scienium/shared-types (kept in lockstep with
// schema.prisma). Re-exported here so app code keeps importing from '@/lib/phase'.

import {
  PHASE_ORDER,
  LAB_TYPES,
  type ProjectPhase,
  type LabType,
} from '@scienium/shared-types'

export { PHASE_ORDER, LAB_TYPES }

export type Phase = ProjectPhase

export type { LabType }

export const LAB_TYPE_LABELS: Record<LabType, string> = {
  biocore: 'BioCore',
  chemworks: 'ChemWorks',
  volt_lab: 'Volt Lab',
  terrabase: 'TerraBase',
  mindframe: 'MindFrame',
  axiom: 'Axiom',
}

// ─── Features ─────────────────────────────────────────────────────────────────

export type Feature =
  | 'discovery'      // Topic exploration, Wikipedia tree
  | 'fair_hub'       // Science fair calendar, rubric, ISEF categories
  | 'literature'     // Literature review, library, citation graph
  | 'research_plan'  // Research planning tools
  | 'logs'           // Project Log + Failure Log — the Operations Hub's day-one half
  | 'daily'          // Field Codex + Proof of Expertise — its earned half
  | 'buildings'      // Lab building purchases, upgrades, and rearranging
  | 'pvp'            // PvP raid system (spec §11)
  | 'data_terminal'  // Experiment tracking + graphing (Operations Hub tab)
  | 'showcase'       // Showcase Wing (public portfolio)

// Which new features each phase unlocks (additive — cumulative after ordering)
//
// `buildings` is deliberately unlocked from the very first phase: the plot is
// the team's home screen, and arranging it is expression, not progression. KP
// cost and each building's `minClearance` are the real limits on what a team
// can put down — the phase gate only ever added a second, redundant lock that
// made the shop and ARRANGE controls look live while every write 403'd.
//
// `logs` and `daily` split what used to be one `daily` feature. A new lab can
// keep a Project Log and a Failure Log on day one — those are how you record an
// experiment that has not worked yet, so gating them behind progress is exactly
// backwards. The Field Codex and Proof of Expertise stay earned: they mint KP and
// raise clearance, and handing a brand-new lab the clearance ladder would let it
// skip the shop's pacing entirely.
const PHASE_UNLOCKS: Record<Phase, Feature[]> = {
  discovery:          ['discovery', 'fair_hub', 'buildings', 'logs'],
  literature_review:  ['literature', 'pvp'],
  working:            ['daily', 'data_terminal', 'research_plan', 'showcase'],
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/** Returns the index of a phase in the ordered sequence (0 = earliest). */
export function phaseIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase)
}

/** True if `current` is at or past `required` in the phase sequence. */
export function isPhaseAtLeast(current: Phase, required: Phase): boolean {
  return phaseIndex(current) >= phaseIndex(required)
}

/** Returns every feature unlocked at `phase` (includes all prior phases). */
export function getUnlockedFeatures(phase: Phase): Set<Feature> {
  const unlocked = new Set<Feature>()
  for (const p of PHASE_ORDER) {
    for (const f of PHASE_UNLOCKS[p]) {
      unlocked.add(f)
    }
    if (p === phase) break
  }
  return unlocked
}

/** True if a specific feature is available at `phase`. */
export function isFeatureUnlocked(phase: Phase, feature: Feature): boolean {
  return getUnlockedFeatures(phase).has(feature)
}

// ─── Feature → minimum required phase (for UI "locked" messaging) ─────────────

export const FEATURE_MIN_PHASE: Record<Feature, Phase> = {
  discovery:      'discovery',
  fair_hub:       'discovery',
  buildings:      'discovery',
  logs:           'discovery',
  literature:     'literature_review',
  pvp:            'literature_review',
  daily:          'working',
  data_terminal:  'working',
  research_plan:  'working',
  showcase:       'working',
}

// ─── Lab visual properties ────────────────────────────────────────────────────

export type LabSize = 'small' | 'grown'

/**
 * Size is small during early exploration; grows permanently once the team locks a
 * topic and the lab takes on its type.
 */
export function getLabSize(phase: Phase): LabSize {
  return phase === 'discovery' ? 'small' : 'grown'
}

// ─── Phase metadata (for UI labels and descriptions) ──────────────────────────

export interface PhaseInfo {
  label: string
  description: string
  color: string  // Tailwind color class for badges
}

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  discovery:         { label: 'Discovery',         description: 'Exploring topics',              color: 'bg-blue-100 text-blue-800' },
  literature_review: { label: 'Literature Review', description: 'Processing research papers',    color: 'bg-yellow-100 text-yellow-800' },
  working:           { label: 'Working',           description: 'Running experiments',           color: 'bg-green-100 text-green-800' },
}

// ─── API route gating ─────────────────────────────────────────────────────────

export class PhaseGateError extends Error {
  readonly statusCode = 403

  constructor(feature: Feature, teamPhase: Phase) {
    const required = FEATURE_MIN_PHASE[feature]
    super(
      `"${feature}" requires phase "${required}" — team is currently in "${teamPhase}"`
    )
    this.name = 'PhaseGateError'
  }
}

/**
 * Throws PhaseGateError if the feature isn't unlocked at teamPhase.
 * Call this at the top of API route handlers before doing any work.
 *
 * @example
 *   assertFeatureUnlocked(team.phase as Phase, 'pvp')
 */
export function assertFeatureUnlocked(teamPhase: Phase, feature: Feature): void {
  if (!isFeatureUnlocked(teamPhase, feature)) {
    throw new PhaseGateError(feature, teamPhase)
  }
}
