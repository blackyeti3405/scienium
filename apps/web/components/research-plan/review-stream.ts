/**
 * The plan-review shape shared by the student panel, the teacher card and the
 * NDJSON stream that fills it in — plus the pure accumulator that turns the
 * stream's events into it (REFACTOR2 P2-2).
 *
 * Terminal-event rule: both `/api/research-plan/review` and
 * `/api/research-plan/idea-check` end a successful run with an explicit
 * `{type:'done'}` line (the review's cache-replay path emits it too). Anything
 * else that ends the body — a dropped connection, a truncated response, an
 * `{type:'error'}` line — leaves a PARTIAL accumulation behind. Presenting
 * that partial as the result is how half a rubric came to stand in for the
 * team's last complete review, so `settleStream` only lets the accumulation
 * through when `done` actually arrived and otherwise hands back the last known
 * good result with an error beside the (still enabled) run button.
 *
 * No React and no I/O here so the state machine is unit-testable in node.
 */

// ─── Shape ─────────────────────────────────────────────────────────────────────

export interface PlanReviewSection {
  title: string
  score: number
  max: number
  assessment: string
}
export interface PlanReview {
  overall: { readiness: string; score: number; summary: string } | null
  sections: PlanReviewSection[]
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}
export const EMPTY_REVIEW: PlanReview = {
  overall: null,
  sections: [],
  strengths: [],
  gaps: [],
  recommendations: [],
}

// ─── Stream accumulation ───────────────────────────────────────────────────────

/** What a stream has produced so far, and whether it ended properly. */
export interface StreamOutcome<T> {
  value: T
  /** The explicit successful terminal event arrived. */
  done: boolean
  /** An `{type:'error'}` event arrived (the server's own message). */
  error: string | null
}

export const TRUNCATED_STREAM_ERROR =
  'The connection dropped before that finished — your last result is unchanged. Try again.'

export function initReviewStream(): StreamOutcome<PlanReview> {
  return { value: EMPTY_REVIEW, done: false, error: null }
}

/** Fold one NDJSON event into the accumulating review. Unknown types are ignored. */
export function reduceReviewEvent(
  s: StreamOutcome<PlanReview>,
  e: { type?: string; [k: string]: any },
): StreamOutcome<PlanReview> {
  const cur = s.value
  switch (e.type) {
    case 'error':
      return { ...s, error: String(e.error ?? 'Review failed') }
    case 'done':
      return { ...s, done: true }
    case 'overall':
      return {
        ...s,
        value: { ...cur, overall: { readiness: e.readiness, score: e.score, summary: e.summary } },
      }
    case 'section':
      return {
        ...s,
        value: {
          ...cur,
          sections: [
            ...cur.sections,
            { title: e.title, score: e.score, max: e.max, assessment: e.assessment },
          ],
        },
      }
    case 'strength':
      return { ...s, value: { ...cur, strengths: [...cur.strengths, e.text] } }
    case 'gap':
      return { ...s, value: { ...cur, gaps: [...cur.gaps, e.text] } }
    case 'recommendation':
      return { ...s, value: { ...cur, recommendations: [...cur.recommendations, e.text] } }
    default:
      return s
  }
}

/**
 * What survives a finished stream. `lastGood` is what was on screen before the
 * run started; it is only replaced when the run reached its terminal event.
 */
export function settleStream<T>(
  outcome: { done: boolean; error: string | null },
  streamed: T,
  lastGood: T | null,
): { value: T | null; error: string | null } {
  if (outcome.done && !outcome.error) return { value: streamed, error: null }
  return { value: lastGood, error: outcome.error ?? TRUNCATED_STREAM_ERROR }
}
