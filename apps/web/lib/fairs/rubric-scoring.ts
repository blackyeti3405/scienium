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

/**
 * Parse what a scorer typed into a score box. `null` means "no score", which is
 * NOT the same as zero.
 *
 * The teacher card used to do `Number(e.target.value)` straight into state.
 * `Number('') === 0`, so selecting a 15 and deleting it made the local score a
 * real 0 — and because 0 differed from the stored 15, the blur autosave then
 * PUT it. Reproduced against the original: clearing the box on a criterion
 * scored 15 sent `{ score: 0 }`, and "Last scored by <teacher>" vouched for it.
 * A cleared box means the scorer is mid-edit or gave up; it never means zero.
 *
 * Deliberately does NOT clamp. Dirtiness is decided against what the scorer
 * typed, and clamping happens at the moment of sending — clamping first makes
 * 99 equal to a stored 10, and then the save that would have corrected it never
 * fires.
 */
export function parseScoreInput(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** Clamp a parsed score to `[0, maxScore]` at send time. The server re-checks. */
export function clampScore(score: number, maxScore: number): number {
  return Math.max(0, Math.min(Math.round(score), maxScore))
}
