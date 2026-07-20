import { ISEF_RUBRIC } from '@/lib/fairs/isef-rubric'

/**
 * Rubric self-assessment scoring (Feature F1 — Rubric self-assessment).
 *
 * Pure, no-LLM helpers derived from the `ISEF_RUBRIC` literal — the rubric
 * CONTENT (numerals, titles, checklist items, point values) stays authored in
 * code and is never duplicated into the DB. Only the team's numeric scores +
 * notes are persisted, in `TeamRubricScore` (see prisma/schema.prisma), keyed
 * by `(teamId, criterionKey)`. This module is the single source of truth for
 * deriving a `criterionKey` and its max score, so the API route and the client
 * component never hand-roll that logic independently.
 *
 * Section V (Presentation) has Poster (10) + Interview (25) subsections in the
 * read-only rubric, but is scored here as ONE 35-point criterion — self-check
 * simplicity, matching the plan.
 */

export type RubricTrackKey = 'science' | 'engineering'

/**
 * The `TeamRubricScore.scorerRole` contract (the column is a plain String in
 * Prisma). Always write/filter through these — a bare literal like 'Teacher'
 * would silently create a third scorer namespace under the
 * `(teamId, criterionKey, scorerRole)` unique that no view reads.
 */
export const SCORER_ROLES = { student: 'student', teacher: 'teacher' } as const

export function isRubricTrack(value: string): value is RubricTrackKey {
  return value === 'science' || value === 'engineering'
}

/** One scoreable row: a track's criterion flattened to {key, numeral, title, maxScore}. */
export interface ScoreableCriterion {
  /** `"${track}:${numeral}"`, e.g. "science:III" — the DB's unique key. */
  key: string
  numeral: string
  title: string
  maxScore: number
}

/** Flattens a track's criteria (from ISEF_RUBRIC) into scoreable rows, in rubric order. */
export function rubricCriteriaFor(track: RubricTrackKey): ScoreableCriterion[] {
  const rubricTrack = ISEF_RUBRIC.find((t) => t.key === track)
  if (!rubricTrack) return []
  return rubricTrack.criteria.map((c) => ({
    key: `${track}:${c.numeral}`,
    numeral: c.numeral,
    title: c.title,
    maxScore: c.points,
  }))
}

/**
 * Server-side score-cap lookup: resolves `criterionKey` (e.g. "science:III") to
 * its max score, or `null` when the key doesn't match a real criterion for that
 * track (bad/forged input). Authoritative for PUT validation — never trust a
 * client-sent maxScore.
 */
export function criterionMaxScore(track: RubricTrackKey, criterionKey: string): number | null {
  const criterion = rubricCriteriaFor(track).find((c) => c.key === criterionKey)
  return criterion?.maxScore ?? null
}

/** 100 for both tracks today (10 + 15 + 20 + 20 + 35), computed from the literal so it never drifts. */
export function totalMaxFor(track: RubricTrackKey): number {
  return rubricCriteriaFor(track).reduce((sum, c) => sum + c.maxScore, 0)
}

/** Sums stored scores (e.g. from `db.teamRubricScore.findMany`) for a track's readiness total. */
export function sumReadiness(scores: { score: number }[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0)
}
