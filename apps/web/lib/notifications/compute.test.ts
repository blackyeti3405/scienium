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
