/**
 * Vocabulary Builder — pure Leitner spaced-repetition scheduling. Leitner
 * over SM-2: 5 integer boxes, no floating-point ease factor to drift or
 * tune, and it is explainable to a 14-year-old ("box 1 = tomorrow, box 5 =
 * 16 days"). SM-2's ease factor buys nothing at a 50-200-card,
 * one-semester scale.
 *
 * THE ANTI-FARM INVARIANT lives here in spirit, and is enforced by the
 * review route: `POST /review` refuses a card whose `dueAt > now`. A
 * student cannot grind a deck in one sitting — real time must pass between
 * reviews of the same card. Reaching `VOCAB_MASTERY_BOX` (box 4) requires
 * >=2 accepted reviews separated by real, server-enforced days.
 *
 * Pure, DB-free, LLM-free — zero Anthropic dependency, isomorphic (safe to
 * import client-side for the grade-button interval labels).
 */

export const VOCAB_BOXES = 5
/** Box N (1-indexed) -> days until next due. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const
/** First entry to this box pays KP, once ever. */
export const VOCAB_MASTERY_BOX = 4
/** Cards served per day by `selectDueCards`. */
export const VOCAB_DAILY_REVIEW_LIMIT = 20

/** Flat KP paid once-ever on first entry to `VOCAB_MASTERY_BOX`. */
export const VOCAB_KP_PER_TERM = 3
/** Team-wide-per-student daily KP cap for vocabulary mastery payouts. */
export const VOCAB_DAILY_KP_CAP = 12

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

export interface CardSrsState {
  box: number
  dueAt: Date
  lapses: number
  reviewCount: number
}

/** UTC-midnight Date for "today" — mirrors `todayUtc()` in codex/complete/route.ts. */
export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * `again` resets to box 1; `hard` steps back one (floored at 1); `good`
 * steps forward one (ceilinged at `VOCAB_BOXES`); `easy` steps forward two
 * (ceilinged at `VOCAB_BOXES`).
 */
export function nextBox(box: number, grade: ReviewGrade): number {
  switch (grade) {
    case 'again':
      return 1
    case 'hard':
      return Math.max(1, box - 1)
    case 'good':
      return Math.min(VOCAB_BOXES, box + 1)
    case 'easy':
      return Math.min(VOCAB_BOXES, box + 2)
  }
}

/**
 * Computes the next SRS state for a card. `dueAt` is anchored to UTC
 * midnight of `now` (not `now` itself), so a review at 23:59 and one at
 * 00:01 the same calendar day produce the same due date.
 */
export function scheduleNext(
  state: { box: number; lapses: number; reviewCount: number },
  grade: ReviewGrade,
  now: Date,
): CardSrsState {
  const box = nextBox(state.box, grade)
  const lapses = grade === 'again' ? state.lapses + 1 : state.lapses
  const reviewCount = state.reviewCount + 1
  const dayMs = 24 * 60 * 60 * 1000
  const dueAt = new Date(startOfUtcDay(now).getTime() + BOX_INTERVAL_DAYS[box - 1] * dayMs)
  return { box, dueAt, lapses, reviewCount }
}

/** A card due exactly `now` IS due (boundary inclusive). */
export function isDue(card: { dueAt: Date }, now: Date): boolean {
  return card.dueAt.getTime() <= now.getTime()
}

/**
 * Filters to due cards, sorts most-overdue first (tie-break by box asc,
 * then termKey asc for determinism), and caps at `limit`.
 */
export function selectDueCards<T extends { dueAt: Date; box: number; termKey: string }>(
  cards: T[],
  now: Date,
  limit: number = VOCAB_DAILY_REVIEW_LIMIT,
): T[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => {
      if (a.dueAt.getTime() !== b.dueAt.getTime()) return a.dueAt.getTime() - b.dueAt.getTime()
      if (a.box !== b.box) return a.box - b.box
      return a.termKey < b.termKey ? -1 : a.termKey > b.termKey ? 1 : 0
    })
    .slice(0, limit)
}
