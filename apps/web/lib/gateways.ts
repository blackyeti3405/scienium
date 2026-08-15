/**
 * Gateway building configuration — the navigation spine of the lab scene.
 *
 * The 7 gateway buildings ARE the app's primary navigation (spec §9.6). Each is
 * a structure on the plot that opens one feature panel as an overlay. This file
 * is the single source for which buildings exist, what they open, when they
 * appear (phase), and where they stand on the plot.
 *
 * A gateway is UNLOCKED once `teams.phase >= unlockPhase` (isPhaseAtLeast), which
 * only makes it available in the shop. It appears on the plot when the team has
 * PLACED it — one `TeamGatewayPlacement` row per placed gateway. The three
 * `discovery` gateways are placed automatically when the lab is created, so a new
 * lab opens with exactly Discovery, Science Fair and Operations Hub standing.
 *
 * Gateways are free: the milestone IS the price. Skin derives from
 * `teams.lab_type` (generic until specialization); size from `getLabSize(phase)`.
 */

import { isPhaseAtLeast, type Phase, type Feature } from '@/lib/phase'
import type { GatewayKey } from '@/lib/sprites/manifest'

/**
 * An isometric grid cell, relative to the central Operations Hub at (0,0).
 * Screen offset from the cluster centre is:
 *   dx = (gx - gy) * STEP_X      dy = (gx + gy) * STEP_Y
 * so the lab expands right / left / up / down around the Hub, and depth order
 * is (gx + gy) — higher = nearer the viewer = drawn on top.
 */
export interface IsoCell {
  gx: number
  gy: number
}

export interface Gateway {
  key: GatewayKey
  label: string
  /** Feature key in lib/phase.ts — drives both client + server gating. */
  feature: Feature
  /** Building appears once the team's phase reaches this. */
  unlockPhase: Phase
  /** One-line description shown on hover. */
  hint: string
  /** Position on the isometric plot, around the central Operations Hub. */
  cell: IsoCell
}

// Compact diamond cluster centred on the Operations Hub (0,0). The three
// starting gateways stand in one row — Discovery left, Operations Hub centre,
// Science Fair right — with Literature up front-centre, Research Plan and PvP
// flanking the front, Showcase grandly at the back.
export const GATEWAYS: Gateway[] = [
  {
    key: 'showcase',
    label: 'Showcase',
    feature: 'showcase',
    unlockPhase: 'project_development',
    hint: 'Publish your research to the world',
    cell: { gx: -1, gy: -1 }, // back-centre
  },
  {
    key: 'discovery',
    label: 'Discovery',
    feature: 'discovery',
    unlockPhase: 'discovery',
    hint: 'Explore topics & Wikipedia deep dives',
    cell: { gx: -1, gy: 1 }, // left
  },
  {
    key: 'science_fair',
    label: 'Science Fair',
    feature: 'fair_hub',
    unlockPhase: 'discovery',
    hint: 'Fair dates, rubric, categories & forms',
    cell: { gx: 1, gy: -1 }, // right
  },
  {
    key: 'literature_review',
    label: 'Literature Review',
    feature: 'literature',
    unlockPhase: 'literature_review',
    hint: 'Review papers, library & citation graph',
    cell: { gx: 1, gy: 1 }, // front-centre
  },
  {
    key: 'operations_hub',
    label: 'Operations Hub',
    // Opens on day one, but only its LOGS half — the Field Codex and Proof of
    // Expertise tabs gate on `daily` inside (OperationsHubFeature). Recording a
    // failed experiment is how a lab starts, not a reward for progress.
    feature: 'logs',
    unlockPhase: 'discovery',
    hint: 'Project & Failure Logs — Field Codex and Expertise unlock later',
    cell: { gx: 0, gy: 0 }, // centre
  },
  {
    key: 'research_plan',
    label: 'Research Plan',
    feature: 'research_plan',
    unlockPhase: 'plan_refinement',
    hint: 'Hypothesis, methodology & study design',
    cell: { gx: 0, gy: 1 }, // front-left
  },
  {
    key: 'pvp',
    label: 'Battle Arena',
    feature: 'pvp',
    unlockPhase: 'literature_review',
    hint: 'PvP combat with your lab characters',
    cell: { gx: 1, gy: 0 }, // front-right
  },
]


/** Gateways unlocked at `phase` — everything a team may have placed by now. */
export function unlockedGateways(phase: Phase): Gateway[] {
  return GATEWAYS.filter((g) => isPhaseAtLeast(phase, g.unlockPhase))
}

/**
 * The gateways a brand-new lab opens with, already standing. Everything else is
 * earned: it appears in the shop when its phase arrives and the student places it.
 */
export const STARTING_GATEWAYS: Gateway[] = unlockedGateways('discovery')

/**
 * Gateways unlocked EXACTLY at `phase` — the ones a team gains on arriving
 * there, as opposed to everything it now holds. This is what the unlock
 * ceremony announces.
 */
export function gatewaysUnlockedAt(phase: Phase): Gateway[] {
  return GATEWAYS.filter((g) => g.unlockPhase === phase)
}

/**
 * What the ceremony should announce, or null when nothing is owed.
 *
 * Derived rather than queued: a team is owed a ceremony when its CURRENT phase
 * unlocked gateways it has not placed yet and it has not already acknowledged
 * that phase. Deriving it is what makes it survive a reload for free — there is
 * no in-flight state to lose — and what stops a second ceremony firing for a
 * building the student already put down.
 */
export function pendingUnlock(
  phase: Phase,
  placedKeys: ReadonlySet<string>,
  ackPhase: Phase | null,
): { phase: Phase; keys: GatewayKey[] } | null {
  if (ackPhase === phase) return null
  const keys = gatewaysUnlockedAt(phase)
    .filter((g) => !placedKeys.has(g.key))
    .map((g) => g.key)
  return keys.length > 0 ? { phase, keys } : null
}
