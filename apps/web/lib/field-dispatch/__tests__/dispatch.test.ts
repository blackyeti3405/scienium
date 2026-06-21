import { describe, it, expect } from 'vitest'
import { computeStreak, dispatchDate } from '@/lib/field-dispatch/dispatch'

/** Build a UTC-midnight Date N calendar days before `anchor`. */
function daysAgo(n: number, anchor: Date = new Date('2025-06-15T12:00:00Z')): Date {
  const base = dispatchDate(anchor)
  return new Date(base.getTime() - n * 86_400_000)
}

/** A fixed "today" used as the anchor throughout the tests. */
const TODAY = new Date('2025-06-15T12:00:00Z')

describe('computeStreak', () => {
  it('returns 0 for empty input', () => {
    expect(computeStreak([], TODAY)).toBe(0)
  })

  it('returns 1 for a single entry that is today', () => {
    expect(computeStreak([daysAgo(0)], TODAY)).toBe(1)
  })

  it('returns 1 for a single entry that is yesterday (today not answered)', () => {
    expect(computeStreak([daysAgo(1)], TODAY)).toBe(1)
  })

  it('counts a consecutive run starting from today', () => {
    // answered today, yesterday, and 2 days ago → streak 3
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2)]
    expect(computeStreak(dates, TODAY)).toBe(3)
  })

  it('counts a consecutive run starting from yesterday when today is unanswered', () => {
    // answered yesterday, 2 days ago, 3 days ago → streak 3
    const dates = [daysAgo(1), daysAgo(2), daysAgo(3)]
    expect(computeStreak(dates, TODAY)).toBe(3)
  })

  it('stops at the first gap', () => {
    // answered today + yesterday, then a gap on day 2, then answered 3 days ago
    const dates = [daysAgo(0), daysAgo(1), daysAgo(3)]
    expect(computeStreak(dates, TODAY)).toBe(2)
  })

  it('does not zero a streak when today is unanswered but yesterday and before are consecutive', () => {
    // today NOT in set; 1, 2, 3 days ago all answered → streak 3
    const dates = [daysAgo(1), daysAgo(2), daysAgo(3)]
    expect(computeStreak(dates, TODAY)).toBe(3)
  })

  it('returns 0 when neither today nor yesterday is answered', () => {
    // only something from 5 days ago
    const dates = [daysAgo(5)]
    expect(computeStreak(dates, TODAY)).toBe(0)
  })

  it('handles out-of-order input correctly', () => {
    // dates given in random order; streak should still be 4
    const dates = [daysAgo(3), daysAgo(0), daysAgo(2), daysAgo(1)]
    expect(computeStreak(dates, TODAY)).toBe(4)
  })

  it('handles duplicate dates without double-counting', () => {
    // two entries for the same day should count as one
    const dates = [daysAgo(0), daysAgo(0), daysAgo(1)]
    expect(computeStreak(dates, TODAY)).toBe(2)
  })

  it('handles a single-day streak with a gap immediately before it', () => {
    // today answered but yesterday not → streak is 1, not 0
    const dates = [daysAgo(0), daysAgo(2)]
    expect(computeStreak(dates, TODAY)).toBe(1)
  })
})
