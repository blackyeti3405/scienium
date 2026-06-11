/**
 * Single source of truth for phase-based feature gating.
 *
 * Both UI components and API route handlers import from here.
 * Never gate features client-only — always mirror checks server-side.
 *
 * Phase order (cumulative — later phases inherit all earlier unlocks):
 *   discovery → lab_selection → literature_review → research_planning → working → showcase
 */

// ─── Phase type (must match schema.prisma ProjectPhase enum exactly) ──────────

export const PHASE_ORDER = [
  'discovery',
  'lab_selection',
  'literature_review',
  'research_planning',
  'working',
  'showcase',
] as const

export type Phase = (typeof PHASE_ORDER)[number]

// ─── Lab type (must match schema.prisma LabType enum exactly) ─────────────────

export const LAB_TYPES = [
  'biocore',
  'chemworks',
  'volt_lab',
  'terrabase',
  'mindframe',
  'axiom',
] as const

export type LabType = (typeof LAB_TYPES)[number]

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
  | 'lab_selection'  // UI to pick one of 6 lab types (one-time action)
  | 'literature'     // Literature review, library, citation graph
  | 'research_plan'  // Research planning tools
  | 'daily'          // Field Dispatch, Proof of Expertise, Project Log, Failure Log
  | 'buildings'      // Lab building purchases and upgrades
  | 'minigames'      // Building mini-games
  | 'pvp'            // PvP combat system
  | 'showcase'       // Showcase Wing (also requires Presenter figurine)

// Which new features each phase unlocks (additive — cumulative after ordering)
const PHASE_UNLOCKS: Record<Phase, Feature[]> = {
  discovery:          ['discovery', 'fair_hub'],
  lab_selection:      ['lab_selection'],
  literature_review:  ['literature', 'daily'],
  research_planning:  ['research_plan'],
  working:            ['buildings', 'minigames', 'pvp'],
  showcase:           ['showcase'],
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
  lab_selection:  'lab_selection',
  literature:     'literature_review',
  research_plan:  'research_planning',
  daily:          'literature_review',
  buildings:      'working',
  minigames:      'working',
  pvp:            'working',
  showcase:       'showcase',
}

// ─── Lab visual properties ────────────────────────────────────────────────────

export type LabSize = 'small' | 'grown'

/**
 * Size is small during early exploration; grows permanently when the team
 * commits to a lab type at the lab_selection phase.
 */
export function getLabSize(phase: Phase): LabSize {
  return phase === 'discovery' || phase === 'lab_selection' ? 'small' : 'grown'
}

// ─── Phase metadata (for UI labels and descriptions) ──────────────────────────

export interface PhaseInfo {
  label: string
  description: string
  color: string  // Tailwind color class for badges
}

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  discovery:         { label: 'Discovery',         description: 'Exploring topics',              color: 'bg-blue-100 text-blue-800' },
  lab_selection:     { label: 'Lab Selection',     description: 'Choosing your specialty',       color: 'bg-purple-100 text-purple-800' },
  literature_review: { label: 'Literature Review', description: 'Processing research papers',    color: 'bg-yellow-100 text-yellow-800' },
  research_planning: { label: 'Research Planning', description: 'Designing your study',          color: 'bg-orange-100 text-orange-800' },
  working:           { label: 'Working',           description: 'Running experiments',           color: 'bg-green-100 text-green-800' },
  showcase:          { label: 'Showcase',          description: 'Publishing your work',          color: 'bg-red-100 text-red-800' },
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

// ─── DB helper: resolve current user's team phase ─────────────────────────────
// Kept here so both API routes and layouts import from one place.

import { db } from '@/lib/db'

export interface TeamContext {
  teamId: string
  phase: Phase
  labType: LabType | null
}

/**
 * Looks up the most-recently-joined team for a Clerk user.
 * Returns null if the user doesn't have a team yet (common during onboarding).
 */
export async function getTeamContext(clerkUserId: string): Promise<TeamContext | null> {
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: {
          team: {
            select: { id: true, phase: true, labType: true },
          },
        },
      },
    },
  })

  const team = user?.teamMemberships[0]?.team
  if (!team) return null

  return {
    teamId: team.id,
    phase: team.phase as Phase,
    labType: team.labType as LabType | null,
  }
}
