import { describe, it, expect } from 'vitest'
import { computeNotifications, type FairDeadlineInput } from './compute'

const NOW = new Date('2026-03-01T00:00:00Z')

function daysFromNow(d: number): Date {
  return new Date(NOW.getTime() + d * 86_400_000)
}

function fair(overrides: Partial<FairDeadlineInput> = {}): FairDeadlineInput {
  return {
    fairName: 'Synopsys Regional',
    fairId: 'f1',
    eventId: 'e1',
    eventDate: null,
    registrationDeadline: null,
    abstractDeadline: null,
    ...overrides,
  }
}

describe('computeNotifications', () => {
  it('fires exactly one deadline reminder for the current bracket', () => {
    const drafts = computeNotifications({
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ registrationDeadline: daysFromNow(10) })],
      lastProgressLogAt: NOW, // fresh log → no urgency
    })
    const deadlines = drafts.filter((d) => d.kind === 'fair_deadline')
    expect(deadlines).toHaveLength(1)
    // 10 days out falls into the 14-day bracket.
    expect(deadlines[0]!.dedupeKey).toContain(':14')
  })

  it('does not fire for deadlines already passed', () => {
    const drafts = computeNotifications({
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ registrationDeadline: daysFromNow(-2) })],
      lastProgressLogAt: NOW,
    })
    expect(drafts).toHaveLength(0)
  })

  it('uses a deterministic dedupeKey so re-runs are idempotent', () => {
    const input = {
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ abstractDeadline: daysFromNow(5) })],
      lastProgressLogAt: NOW,
    }
    const a = computeNotifications(input)
    const b = computeNotifications(input)
    expect(a[0]!.dedupeKey).toEqual(b[0]!.dedupeKey)
  })

  it('raises an urgency nudge when a fair is near and the log is stale', () => {
    const drafts = computeNotifications({
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ eventDate: daysFromNow(20) })],
      lastProgressLogAt: daysFromNow(-20), // 20 days stale
    })
    expect(drafts.some((d) => d.kind === 'urgency')).toBe(true)
  })

  it('does not nudge when the log is fresh', () => {
    const drafts = computeNotifications({
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ eventDate: daysFromNow(20) })],
      lastProgressLogAt: daysFromNow(-2), // recent
    })
    expect(drafts.some((d) => d.kind === 'urgency')).toBe(false)
  })

  it('nudges teams that have never logged when a fair is near', () => {
    const drafts = computeNotifications({
      teamId: 't1',
      now: NOW,
      deadlineDays: [30, 14, 7, 1],
      fairs: [fair({ eventDate: daysFromNow(15) })],
      lastProgressLogAt: null,
    })
    expect(drafts.some((d) => d.kind === 'urgency')).toBe(true)
  })
})

// ─── Edge coverage added with the 0.28.x test sweep ──────────────────────────

describe('computeNotifications — bracket and window edges', () => {
  const base = { teamId: 't1', now: NOW, deadlineDays: [30, 14, 7, 1], lastProgressLogAt: NOW }

  it('a deadline exactly ON a window lands in that bracket, not the next', () => {
    const drafts = computeNotifications({
      ...base,
      fairs: [fair({ registrationDeadline: daysFromNow(14) })],
    })
    expect(drafts).toHaveLength(1)
    expect(drafts[0].dedupeKey).toContain(':registration:14')
  })

  it('a deadline TODAY (0 days) fires the tightest bracket with "today" wording', () => {
    const drafts = computeNotifications({
      ...base,
      fairs: [fair({ registrationDeadline: daysFromNow(0) })],
    })
    expect(drafts).toHaveLength(1)
    expect(drafts[0].body).toMatch(/is today\./)
    expect(drafts[0].dedupeKey).toContain(':registration:1')
  })

  it('deadlineDays hygiene: duplicates deduped, unsorted input sorted, nonpositive dropped', () => {
    const drafts = computeNotifications({
      ...base,
      deadlineDays: [7, 30, 7, -3, 0],
      fairs: [fair({ registrationDeadline: daysFromNow(6) })],
    })
    expect(drafts).toHaveLength(1)
    expect(drafts[0].dedupeKey).toContain(':registration:7')
  })

  it('all-nonpositive windows produce NO drafts (and no crash)', () => {
    expect(
      computeNotifications({
        ...base,
        deadlineDays: [0, -1],
        fairs: [fair({ registrationDeadline: daysFromNow(1) })],
      }),
    ).toEqual([])
  })
})

describe('computeNotifications — urgency selection edges', () => {
  const stale = { teamId: 't1', now: NOW, deadlineDays: [30, 14, 7, 1], lastProgressLogAt: null }

  it('only the NEAREST upcoming fair nudges when several are in window', () => {
    const drafts = computeNotifications({
      ...stale,
      fairs: [
        fair({ fairId: 'far', eventId: 'e_far', fairName: 'State Fair', eventDate: daysFromNow(25) }),
        fair({ fairId: 'near', eventId: 'e_near', fairName: 'Regional Fair', eventDate: daysFromNow(5) }),
      ],
    })
    const urgency = drafts.filter((d) => d.kind === 'urgency')
    expect(urgency).toHaveLength(1)
    expect(urgency[0].dedupeKey).toContain('e_near')
  })

  it('a fair with only a registration deadline (no eventDate) never triggers urgency', () => {
    const drafts = computeNotifications({
      ...stale,
      fairs: [fair({ registrationDeadline: daysFromNow(5) })],
    })
    expect(drafts.filter((d) => d.kind === 'urgency')).toHaveLength(0)
  })

  it('an event beyond the largest window does not nudge', () => {
    const drafts = computeNotifications({
      ...stale,
      fairs: [fair({ eventDate: daysFromNow(31) })],
    })
    expect(drafts.filter((d) => d.kind === 'urgency')).toHaveLength(0)
  })

  it('the urgency dedupeKey changes across an ISO-week boundary (weekly cadence)', () => {
    const fairs = [fair({ eventDate: daysFromNow(20) })]
    const week1 = computeNotifications({ ...stale, fairs })
    const week2 = computeNotifications({
      ...stale,
      now: daysFromNow(7),
      fairs,
    })
    const k1 = week1.find((d) => d.kind === 'urgency')?.dedupeKey
    const k2 = week2.find((d) => d.kind === 'urgency')?.dedupeKey
    expect(k1).toBeTruthy()
    expect(k2).toBeTruthy()
    expect(k1).not.toBe(k2)
  })
})
