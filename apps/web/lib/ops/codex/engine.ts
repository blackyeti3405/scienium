/**
 * Field Codex (Feature F13) — pure, DB-free engine: checkpoint grading,
 * retry shuffling, KP-award computation, unit gating, and fluency tiers.
 *
 * Every function here is deterministic and side-effect free so the highest-
 * stakes rules (grading + KP) get a full unit-test surface with no mocks,
 * exactly the same design goal as `lib/economy.ts`. The *atomicity* of
 * persisting a KP award still belongs to the DB/route (see
 * `app/api/ops/codex/complete/route.ts`); this module only computes the
 * numbers that go into that transaction.
 */

import type {
  CheckpointQuestion,
  CodexTrack,
  McQuestion,
  OrderingQuestion,
  MatchingQuestion,
} from './types'

// ─── Tunables (single source of truth) ─────────────────────────────────────

/** Fraction of checkpoint questions that must be correct to pass. */
export const CODEX_PASS_RATIO = 0.8

/** Flat KP paid on a student's first-ever pass of a lesson. */
export const CODEX_KP_PER_LESSON = 8

/** Max first-time lesson completions counted against one student's day. */
export const CODEX_DAILY_LESSON_CAP = 3

// ─── Submission shapes (what the client posts back) ────────────────────────

export type QuestionSubmission =
  | { kind: 'mc'; id: string; selectedOptionId: string }
  | { kind: 'ordering'; id: string; order: string[] }
  | { kind: 'matching'; id: string; pairs: [string, string][] }

export interface CheckpointSubmission {
  answers: QuestionSubmission[]
}

// ─── Grading ────────────────────────────────────────────────────────────────

export interface PerQuestionResult {
  id: string
  correct: boolean
  /** Present only when `correct` is false — the written explanation to show. */
  explanation?: string
}

export interface GradeResult {
  perQuestion: PerQuestionResult[]
  correctCount: number
  total: number
  /** correctCount / total, unrounded. */
  ratio: number
  passed: boolean
}

function gradeMc(question: McQuestion, submission: QuestionSubmission | undefined): PerQuestionResult {
  const selected = submission && submission.kind === 'mc' ? submission.selectedOptionId : null
  const correct = selected === question.answerId
  if (correct) return { id: question.id, correct: true }
  return {
    id: question.id,
    correct: false,
    explanation: (selected && question.explanations[selected]) || question.explanations[question.answerId],
  }
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function gradeOrdering(question: OrderingQuestion, submission: QuestionSubmission | undefined): PerQuestionResult {
  const order = submission && submission.kind === 'ordering' ? submission.order : []
  const correct = arraysEqual(order, question.correctOrder)
  return correct
    ? { id: question.id, correct: true }
    : { id: question.id, correct: false, explanation: question.explanation }
}

function pairSetsEqual(a: [string, string][], b: [string, string][]): boolean {
  if (a.length !== b.length) return false
  const normalize = (pairs: [string, string][]) =>
    new Set(pairs.map(([l, r]) => `${l}::${r}`))
  const setA = normalize(a)
  const setB = normalize(b)
  if (setA.size !== setB.size) return false
  for (const key of setA) {
    if (!setB.has(key)) return false
  }
  return true
}

function gradeMatching(question: MatchingQuestion, submission: QuestionSubmission | undefined): PerQuestionResult {
  const pairs = submission && submission.kind === 'matching' ? submission.pairs : []
  const correct = pairSetsEqual(pairs, question.correctPairs)
  return correct
    ? { id: question.id, correct: true }
    : { id: question.id, correct: false, explanation: question.explanation }
}

/**
 * Grades a checkpoint attempt against its authored answer key. Deterministic
 * and zero-LLM: MC compares the selected option to `answerId`; ordering
 * compares array equality; matching compares pair-SET equality (order of
 * pairs in the submission doesn't matter, only the set of left→right pairs).
 * Missing/malformed answers for a question are simply graded wrong (never
 * throw) so a partial or malformed submission still yields a full result.
 */
export function gradeCheckpoint(
  questions: CheckpointQuestion[],
  submission: CheckpointSubmission,
): GradeResult {
  const byId = new Map(submission.answers.map((a) => [a.id, a]))
  const perQuestion = questions.map((q) => {
    const ans = byId.get(q.id)
    if (q.kind === 'mc') return gradeMc(q, ans)
    if (q.kind === 'ordering') return gradeOrdering(q, ans)
    return gradeMatching(q, ans)
  })
  const correctCount = perQuestion.filter((r) => r.correct).length
  const total = questions.length
  const ratio = total > 0 ? correctCount / total : 0
  return { perQuestion, correctCount, total, ratio, passed: ratio >= CODEX_PASS_RATIO }
}

// ─── Retry shuffle ──────────────────────────────────────────────────────────

/** Deterministic seeded PRNG (mulberry32) — same seed always yields the same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** In-place-safe Fisher-Yates using a seeded RNG — returns a new array. */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function shuffleQuestion(question: CheckpointQuestion, rng: () => number): CheckpointQuestion {
  if (question.kind === 'mc') {
    return { ...question, options: seededShuffle(question.options, rng) }
  }
  if (question.kind === 'ordering') {
    return { ...question, items: seededShuffle(question.items, rng) }
  }
  return {
    ...question,
    left: seededShuffle(question.left, rng),
    right: seededShuffle(question.right, rng),
  }
}

/**
 * Deterministic re-shuffle for a retry: re-orders the QUESTION list itself
 * AND each question's internal options/items (MC options; ordering items;
 * matching left+right), seeded off `seed` (typically the 1-based attempt
 * number) so the same attempt number always reproduces the same shuffle
 * (useful for tests) while different attempts differ. The SET of questions/
 * options/items is preserved exactly — only order changes — so grading logic
 * is unaffected by a shuffle.
 */
export function shuffleCheckpoint(questions: CheckpointQuestion[], seed: number): CheckpointQuestion[] {
  const rng = mulberry32(seed >>> 0 || 1)
  const reordered = seededShuffle(questions, rng)
  return reordered.map((q) => shuffleQuestion(q, rng))
}

// ─── KP award ───────────────────────────────────────────────────────────────

export interface KpAwardInput {
  passed: boolean
  /** Whether this student has already claimed KP for this lesson (kpAwarded > 0). */
  alreadyClaimed: boolean
}

export interface KpAward {
  kpEarned: number
}

/**
 * A lesson pays its flat KP exactly once per student — a pass that isn't the
 * first-ever pass (or any fail) earns 0. Mirrors `computeQuizAward`'s
 * high-water shape but simplified to a flat per-lesson amount (no partial
 * credit — checkpoints are pass/fail, not scored 0-100 for KP purposes).
 */
export function computeKpAward({ passed, alreadyClaimed }: KpAwardInput): KpAward {
  return { kpEarned: passed && !alreadyClaimed ? CODEX_KP_PER_LESSON : 0 }
}

// ─── Unit gating ────────────────────────────────────────────────────────────

/**
 * Whether `unitId` inside `segmentId` of `track` is unlocked for a student
 * with `completedLessonIds` (lesson ids they've completed, any track — pass
 * only this track's ids for a track-scoped check). Rules:
 *  - The first unit of Core is always unlocked.
 *  - Unit N (N>0) of Core unlocks once every lesson in unit N-1 is complete.
 *  - The first unit of a BRANCH unlocks only once Core is 100% complete
 *    (every lesson across every Core unit).
 *  - Subsequent units within a branch follow the same N-1-complete rule as
 *    Core.
 */
export function unitUnlocked(
  track: CodexTrack,
  segmentId: string,
  unitId: string,
  completedLessonIds: Set<string>,
): boolean {
  const segment = track.core.id === segmentId ? track.core : track.branches.find((b) => b.id === segmentId)
  if (!segment) return false

  const unitIndex = segment.units.findIndex((u) => u.id === unitId)
  if (unitIndex === -1) return false

  if (unitIndex === 0) {
    if (segment.kind === 'core') return true
    // First unit of a branch requires Core 100% complete.
    return isSegmentComplete(track.core, completedLessonIds)
  }

  const priorUnit = segment.units[unitIndex - 1]
  return priorUnit.lessons.every((l) => completedLessonIds.has(l.id))
}

function isSegmentComplete(segment: import('./types').Segment, completedLessonIds: Set<string>): boolean {
  const lessons = segment.units.flatMap((u) => u.lessons)
  return lessons.length > 0 && lessons.every((l) => completedLessonIds.has(l.id))
}

/**
 * Locates a lesson anywhere in `track` (Core first, then every branch, in
 * declared order) and returns its owning segment/unit ids alongside its
 * index within the unit — the piece `unitUnlocked` alone can't answer, and
 * that both `complete/route.ts` (server-authoritative gate) and the panel
 * need in order to resolve gating for an arbitrary lessonId. Returns `null`
 * if the lesson isn't found anywhere in the track (an unknown/tampered id).
 */
export function findLessonLocation(
  track: CodexTrack,
  lessonId: string,
): { segmentId: string; unitId: string; lessonIndex: number; lesson: import('./types').Lesson } | null {
  for (const segment of [track.core, ...track.branches]) {
    for (const unit of segment.units) {
      const lessonIndex = unit.lessons.findIndex((l) => l.id === lessonId)
      if (lessonIndex !== -1) {
        return { segmentId: segment.id, unitId: unit.id, lessonIndex, lesson: unit.lessons[lessonIndex] }
      }
    }
  }
  return null
}

/**
 * Whether a SPECIFIC lesson is unlocked for a student with
 * `completedLessonIds` (this track's own lesson ids the student has
 * completed) — the full gate, combining BOTH rules a student must pass:
 *   1. `unitUnlocked` — the lesson's owning unit must itself be unlocked
 *      (prior unit 100% complete; a branch's first unit needs Core 100%).
 *   2. Sequential-within-unit — per `Unit.lessons`' doc comment ("lesson N
 *      unlocks only once lesson N-1 is complete"), every lesson BEFORE this
 *      one in the same unit must already be complete (the first lesson of
 *      an unlocked unit has no such prerequisite).
 * This is the authoritative gate both the server route and the panel must
 * agree on — the panel's own gating logic in CodexTab.tsx mirrors rule 2
 * inline; this function is the single source of truth the SERVER enforces
 * before ever grading or paying (see complete/route.ts).
 */
export function lessonUnlocked(track: CodexTrack, lessonId: string, completedLessonIds: Set<string>): boolean {
  const location = findLessonLocation(track, lessonId)
  if (!location) return false
  const { segmentId, unitId, lessonIndex } = location
  if (!unitUnlocked(track, segmentId, unitId, completedLessonIds)) return false

  if (lessonIndex === 0) return true
  const segment = track.core.id === segmentId ? track.core : track.branches.find((b) => b.id === segmentId)!
  const unit = segment.units.find((u) => u.id === unitId)!
  return unit.lessons.slice(0, lessonIndex).every((l) => completedLessonIds.has(l.id))
}

// ─── Fluency tiers ──────────────────────────────────────────────────────────

export type FluencyTier = 'novice' | 'conversant' | 'fluent' | 'field_expert'

/**
 * Fluency tier from the fraction of THIS track's own lessons (Core + every
 * branch) a student has completed:
 *   Novice (0%) → Conversant (>=25%) → Fluent (>=60%) → Field Expert (100%).
 */
export function fluencyTier(track: CodexTrack, completedLessonIds: Set<string>): FluencyTier {
  const allLessons = [track.core, ...track.branches].flatMap((seg) => seg.units.flatMap((u) => u.lessons))
  const total = allLessons.length
  if (total === 0) return 'novice'
  const completed = allLessons.filter((l) => completedLessonIds.has(l.id)).length
  const ratio = completed / total
  if (ratio >= 1) return 'field_expert'
  if (ratio >= 0.6) return 'fluent'
  if (ratio >= 0.25) return 'conversant'
  return 'novice'
}
