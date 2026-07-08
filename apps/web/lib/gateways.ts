/**
 * Gateway building configuration — the navigation spine of the lab scene.
 *
 * The 7 gateway buildings ARE the app's primary navigation (spec §9.6). Each is
 * a structure on the plot that opens one feature panel as an overlay. This file
 * is the single source for which buildings exist, what they open, when they
 * appear (phase), and where they stand on the plot.
 *
 * Visibility derives from `teams.phase >= unlockPhase` (via isPhaseAtLeast).
 * Skin derives from `teams.lab_type` (generic until specialization).
 * Size derives from `getLabSize(phase)`. All of these live in lib/phase.ts —
 * this file holds only the per-gateway config, mirroring the `gateway_buildings`
 * seed concept in schema.prisma (not per-team, not purchasable).
 */

import type { Phase, Feature } from '@/lib/phase'
import type { GatewayKey } from '@/lib/sprites/manifest'

/**
 * An isometric grid cell, relative to the central Discovery building at (0,0).
 * Screen offset from the cluster centre is:
 *   dx = (gx - gy) * STEP_X      dy = (gx + gy) * STEP_Y
 * so the lab expands right / left / up / down around Discovery, and depth order
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
  /** Canonical route (kept for deep-links/back-compat; primary access is the overlay). */
  route: string
  /** One-line description shown on hover. */
  hint: string
  /** Becomes the central structure once present (Operations Hub). */
  isCentral?: boolean
  /** Position on the isometric plot, around the central Discovery building. */
  cell: IsoCell
}

// Compact diamond cluster centred on Discovery (0,0): Science Fair to the right,
// Literature to the left, the daily Operations Hub up front-centre, Research Plan
// and PvP flanking the front, Showcase grandly at the back.
export const GATEWAYS: Gateway[] = [
  {
    key: 'showcase',
    label: 'Showcase',
    feature: 'showcase',
    unlockPhase: 'showcase',
    route: '/showcase/edit',
    hint: 'Publish your research to the world',
    cell: { gx: -1, gy: -1 }, // back-centre
  },
  {
    key: 'discovery',
    label: 'Discovery',
    feature: 'discovery',
    unlockPhase: 'discovery',
    route: '/discovery',
    hint: 'Explore topics & Wikipedia deep dives',
    cell: { gx: 0, gy: 0 }, // centre
  },
  {
    key: 'science_fair',
    label: 'Science Fair',
    feature: 'fair_hub',
    unlockPhase: 'discovery',
    route: '/fair-hub/calendar',
    hint: 'Fair dates, rubric, categories & forms',
    cell: { gx: 1, gy: -1 }, // right
  },
  {
    key: 'literature_review',
    label: 'Literature Review',
    feature: 'literature',
    unlockPhase: 'literature_review',
    route: '/literature/library',
    hint: 'Review papers, library & citation graph',
    cell: { gx: -1, gy: 1 }, // left
  },
  {
    key: 'operations_hub',
    label: 'Operations Hub',
    feature: 'daily',
    unlockPhase: 'literature_review',
    route: '/daily/codex',
    hint: 'Field Codex, Proof of Expertise, Project & Failure Logs',
    isCentral: true,
    cell: { gx: 1, gy: 1 }, // front-centre (closest)
  },
  {
    key: 'research_plan',
    label: 'Research Plan',
    feature: 'research_plan',
    unlockPhase: 'research_planning',
    route: '/research-plan',
    hint: 'Hypothesis, methodology & study design',
    cell: { gx: 0, gy: 1 }, // front-left
  },
  {
    key: 'pvp',
    label: 'Battle Arena',
    feature: 'pvp',
    unlockPhase: 'working',
    route: '/pvp/lobby',
    hint: 'PvP combat with your lab characters',
    cell: { gx: 1, gy: 0 }, // front-right
  },
]

