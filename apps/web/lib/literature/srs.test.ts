import { describe, it, expect } from 'vitest'
import {
  VOCAB_BOXES,
  BOX_INTERVAL_DAYS,
  VOCAB_MASTERY_BOX,
  VOCAB_DAILY_REVIEW_LIMIT,
  startOfUtcDay,
  nextBox,
  scheduleNext,
  isDue,
  selectDueCards,
} from './srs'

describe('nextBox', () => {
  it('again always resets to box 1, from any starting box', () => {
    for (let box = 1; box <= VOCAB_BOXES; box++) {
      expect(nextBox(box, 'again')).toBe(1)
    }
  })

  it('hard steps back one, floored at box 1', () => {
    expect(nextBox(1, 'hard')).toBe(1) // floor
    expect(nextBox(2, 'hard')).toBe(1)
    expect(nextBox(3, 'hard')).toBe(2)
    expect(nextBox(5, 'hard')).toBe(4)
  })

  it('good steps forward one, ceilinged at VOCAB_BOXES', () => {
    expect(nextBox(1, 'good')).toBe(2)
    expect(nextBox(4, 'good')).toBe(5)
    expect(nextBox(5, 'good')).toBe(5) // ceiling
  })

  it('easy steps forward two, ceilinged at VOCAB_BOXES', () => {
    expect(nextBox(1, 'easy')).toBe(3)
    expect(nextBox(3, 'easy')).toBe(5)
    expect(nextBox(4, 'easy')).toBe(5) // ceiling
    expect(nextBox(5, 'easy')).toBe(5) // ceiling
  })
})

describe('scheduleNext', () => {
  it('again resets to box 1 and increments lapses', () => {
    const now = new Date('2026-07-14T12:00:00Z')
    const next = scheduleNext({ box: 4, lapses: 1, reviewCount: 6 }, 'again', now)
    expect(next.box).toBe(1)
    expect(next.lapses).toBe(2)
    expect(next.reviewCount).toBe(7)
  })

  it('non-again grades never increment lapses', () => {
    const now = new Date('2026-07-14T12:00:00Z')
    for (const grade of ['hard', 'good', 'easy'] as const) {
      const next = scheduleNext({ box: 2, lapses: 0, reviewCount: 0 }, grade, now)
      expect(next.lapses).toBe(0)
    }
  })

  it('dueAt maps to the exact BOX_INTERVAL_DAYS day count off UTC midnight, not off `now`', () => {
    // A review at 23:59 UTC and one at 00:01 UTC the SAME calendar day must
    // produce the identical due date (anchored to startOfUtcDay, not `now`).
    const late = new Date('2026-07-14T23:59:00Z')
    const early = new Date('2026-07-14T00:01:00Z')
    const nextLate = scheduleNext({ box: 1, lapses: 0, reviewCount: 0 }, 'good', late)
    const nextEarly = scheduleNext({ box: 1, lapses: 0, reviewCount: 0 }, 'good', early)
    expect(nextLate.dueAt.getTime()).toBe(nextEarly.dueAt.getTime())

    // box 1 -> good -> box 2 -> due BOX_INTERVAL_DAYS[1] (2) days after UTC midnight.
    const expected = startOfUtcDay(late).getTime() + BOX_INTERVAL_DAYS[1] * 24 * 60 * 60 * 1000
    expect(nextLate.dueAt.getTime()).toBe(expected)
  })

  it('every box maps to its exact BOX_INTERVAL_DAYS interval', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    for (let box = 1; box <= VOCAB_BOXES; box++) {
      const next = scheduleNext({ box, lapses: 0, reviewCount: 0 }, 'good', now)
      const expectedDays = BOX_INTERVAL_DAYS[next.box - 1]
      const actualDays = Math.round((next.dueAt.getTime() - startOfUtcDay(now).getTime()) / (24 * 60 * 60 * 1000))
      expect(actualDays).toBe(expectedDays)
    }
  })
})

describe('isDue', () => {
  it('a card due exactly now IS due (boundary inclusive)', () => {
    const now = new Date('2026-07-14T12:00:00Z')
    expect(isDue({ dueAt: now }, now)).toBe(true)
  })

  it('a card due in the past is due; a card due in the future is not', () => {
    const now = new Date('2026-07-14T12:00:00Z')
    expect(isDue({ dueAt: new Date('2026-07-14T11:59:59Z') }, now)).toBe(true)
    expect(isDue({ dueAt: new Date('2026-07-14T12:00:01Z') }, now)).toBe(false)
  })
})

describe('selectDueCards', () => {
  const now = new Date('2026-07-14T12:00:00Z')

  it('excludes future-dated cards', () => {
    const cards = [
      { termKey: 'a', box: 1, dueAt: new Date('2026-07-13T00:00:00Z') },
      { termKey: 'b', box: 1, dueAt: new Date('2026-07-20T00:00:00Z') }, // future
    ]
    const due = selectDueCards(cards, now)
    expect(due.map((c) => c.termKey)).toEqual(['a'])
  })

  it('orders most-overdue first, tie-breaks by box asc then termKey asc', () => {
    const cards = [
      { termKey: 'z', box: 3, dueAt: new Date('2026-07-10T00:00:00Z') },
      { termKey: 'a', box: 3, dueAt: new Date('2026-07-10T00:00:00Z') },
      { termKey: 'm', box: 1, dueAt: new Date('2026-07-10T00:00:00Z') },
      { termKey: 'x', box: 1, dueAt: new Date('2026-07-05T00:00:00Z') }, // most overdue
    ]
    const due = selectDueCards(cards, now)
    expect(due.map((c) => c.termKey)).toEqual(['x', 'm', 'a', 'z'])
  })

  it('caps at the given limit (defaults to VOCAB_DAILY_REVIEW_LIMIT)', () => {
    const cards = Array.from({ length: 30 }, (_, i) => ({
      termKey: `t${i}`,
      box: 1,
      dueAt: new Date('2026-07-01T00:00:00Z'),
    }))
    expect(selectDueCards(cards, now).length).toBe(VOCAB_DAILY_REVIEW_LIMIT)
    expect(selectDueCards(cards, now, 5).length).toBe(5)
  })

  it('is pure — never mutates the input array', () => {
    const cards = [
      { termKey: 'b', box: 1, dueAt: new Date('2026-07-01T00:00:00Z') },
      { termKey: 'a', box: 1, dueAt: new Date('2026-07-02T00:00:00Z') },
    ]
    const copy = [...cards]
    selectDueCards(cards, now)
    expect(cards).toEqual(copy)
  })
})

describe('mastery path', () => {
  it('box 1 --easy--> 3 --easy--> 5 crosses VOCAB_MASTERY_BOX exactly once', () => {
    const now = new Date('2026-01-01T00:00:00Z')
    const first = scheduleNext({ box: 1, lapses: 0, reviewCount: 0 }, 'easy', now)
    expect(first.box).toBe(3)
    expect(first.box >= VOCAB_MASTERY_BOX).toBe(false) // not yet mastery-eligible

    const second = scheduleNext({ box: first.box, lapses: first.lapses, reviewCount: first.reviewCount }, 'easy', now)
    expect(second.box).toBe(5)
    expect(second.box >= VOCAB_MASTERY_BOX).toBe(true) // crosses here, and only here
  })
})
