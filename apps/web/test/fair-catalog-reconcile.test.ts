import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R16 (fairs half) — the catalog seeder must not suppress a
 * correction just because the row COUNT did not change.
 *
 * The old first line was `count >= FAIRS.length → return`. Every test here
 * describes a database that passes that check and is nonetheless WRONG: a
 * renamed fair, a swapped key, a fair that left the edition. Each one used to
 * be a silent no-op.
 *
 * The other half is the opposite obligation: the static dataset must never
 * clobber a date somebody corrected. Those cases assert nothing is written.
 */

const { FAIRS_FIXTURE } = vi.hoisted(() => ({ FAIRS_FIXTURE: [
  {
    key: 'isef',
    name: 'ISEF',
    level: 'international' as const,
    state: null,
    websiteUrl: 'https://isef.example',
    latitude: 1,
    longitude: 1,
    year: 2027,
    eventDate: '2027-05-10T00:00:00.000Z',
    status: 'estimated' as const,
  },
  {
    key: 'ca-state',
    name: 'California State Fair',
    level: 'state' as const,
    state: 'CA',
    websiteUrl: 'https://ca.example',
    latitude: 36,
    longitude: -119,
    parentKey: 'isef',
    year: 2027,
    eventDate: '2027-04-01T00:00:00.000Z',
    status: 'estimated' as const,
  },
] }))

vi.mock('@/content/fairs/dataset', () => ({ FAIRS: FAIRS_FIXTURE }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))

const mocks = vi.hoisted(() => ({
  fairFindMany: vi.fn(),
  fairCreateMany: vi.fn(),
  fairUpdate: vi.fn((a: unknown) => a),
  fairUpdateMany: vi.fn(),
  eventFindMany: vi.fn(),
  eventCreateMany: vi.fn(),
  eventUpdateMany: vi.fn((a: unknown) => a),
  transaction: vi.fn(async () => []),
}))

vi.mock('@/lib/db', () => ({
  db: {
    fair: {
      findMany: mocks.fairFindMany,
      createMany: mocks.fairCreateMany,
      update: mocks.fairUpdate,
      updateMany: mocks.fairUpdateMany,
    },
    fairEvent: {
      findMany: mocks.eventFindMany,
      createMany: mocks.eventCreateMany,
      updateMany: mocks.eventUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { ensureFairsSeeded, resetFairSeedMemo } from '@/lib/fairs/match'

/** A fully-seeded row matching the fixture — the state the old fast path trusted. */
function row(key: string, over: Record<string, unknown> = {}): Record<string, unknown> & { id: string; seedKey: string } {
  const f = FAIRS_FIXTURE.find((x) => x.key === key)!
  return {
    id: `fair_${key}`,
    seedKey: key,
    name: f.name,
    level: f.level,
    state: f.state,
    websiteUrl: f.websiteUrl,
    latitude: f.latitude,
    longitude: f.longitude,
    parentFairId: f.parentKey ? `fair_${f.parentKey}` : null,
    retiredAt: null,
    lastSyncedAt: null,
    ...over,
  }
}

function event(key: string, over: Record<string, unknown> = {}) {
  const f = FAIRS_FIXTURE.find((x) => x.key === key)!
  return {
    id: `ev_${key}`,
    fairId: `fair_${key}`,
    year: f.year,
    eventDate: f.eventDate ? new Date(f.eventDate) : null,
    registrationDeadline: null,
    abstractDeadline: null,
    status: 'estimated' as const,
    ...over,
  }
}

/** Seed the DB mock with a given set of fair rows and event rows. */
function given(fairs: ReturnType<typeof row>[], events: ReturnType<typeof event>[]) {
  mocks.fairFindMany.mockImplementation(async (args: any) =>
    // Second call re-reads only the keys just inserted.
    args?.where?.seedKey?.in ? [] : fairs,
  )
  mocks.eventFindMany.mockResolvedValue(events)
}

/** Every `fair.update` this run issued, as `{ id, data }`. */
function fairUpdates() {
  return mocks.fairUpdate.mock.calls.map((c) => c[0] as { where: { id: string }; data: any })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetFairSeedMemo()
  mocks.fairCreateMany.mockResolvedValue({ count: 0 })
  mocks.fairUpdateMany.mockResolvedValue({ count: 0 })
  mocks.eventCreateMany.mockResolvedValue({ count: 0 })
  given(FAIRS_FIXTURE.map((f) => row(f.key)), FAIRS_FIXTURE.map((f) => event(f.key)))
})

describe('P1-R16 — a same-size correction is not suppressed', () => {
  it('applies a renamed fair even though the row count already matches', async () => {
    given(
      [row('isef'), row('ca-state', { name: 'STALE NAME', websiteUrl: 'https://old.example' })],
      FAIRS_FIXTURE.map((f) => event(f.key)),
    )

    await ensureFairsSeeded()

    const updated = fairUpdates()
    expect(updated).toHaveLength(1)
    expect(updated[0]!.where.id).toBe('fair_ca-state')
    expect(updated[0]!.data).toMatchObject({
      name: 'California State Fair',
      websiteUrl: 'https://ca.example',
    })
  })

  it('touches nothing when the database already matches the edition', async () => {
    await ensureFairsSeeded()

    expect(mocks.fairUpdate).not.toHaveBeenCalled()
    expect(mocks.fairUpdateMany).not.toHaveBeenCalled()
    expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
    expect(mocks.eventCreateMany).not.toHaveBeenCalled()
  })

  it('a swapped key — one dropped, one added, count unchanged — inserts AND retires', async () => {
    given(
      [row('isef'), { ...row('ca-state'), id: 'fair_gone', seedKey: 'defunct-regional' }],
      [event('isef')],
    )

    await ensureFairsSeeded()

    // The new key is inserted…
    const created = mocks.fairCreateMany.mock.calls.flatMap((c) => (c[0] as any).data)
    expect(created.map((f: any) => f.seedKey)).toContain('ca-state')
    // …and the key the edition dropped is retired, not deleted or left live.
    const retire = mocks.fairUpdateMany.mock.calls[0]![0] as any
    expect(retire.where.id.in).toEqual(['fair_gone'])
    expect(retire.data.retiredAt).toBeInstanceOf(Date)
  })

  it('a key that returns in a later edition is un-retired', async () => {
    given(
      [row('isef'), row('ca-state', { retiredAt: new Date('2026-01-01') })],
      FAIRS_FIXTURE.map((f) => event(f.key)),
    )

    await ensureFairsSeeded()

    const updated = fairUpdates()
    expect(updated).toHaveLength(1)
    expect(updated[0]!.data.retiredAt).toBeNull()
  })

  it('re-retiring is a no-op — an already-retired key is not rewritten every request', async () => {
    given(
      [row('isef'), row('ca-state'), { ...row('isef'), id: 'fair_old', seedKey: 'old', retiredAt: new Date() }],
      FAIRS_FIXTURE.map((f) => event(f.key)),
    )

    await ensureFairsSeeded()

    expect(mocks.fairUpdateMany).not.toHaveBeenCalled()
  })
})

describe('P1-R16 — the dataset never clobbers a local correction', () => {
  it('refreshes an uncorrected estimated event whose authored dates changed', async () => {
    given(
      FAIRS_FIXTURE.map((f) => row(f.key)),
      [event('isef'), event('ca-state', { eventDate: new Date('2027-01-01') })],
    )

    await ensureFairsSeeded()

    expect(mocks.eventUpdateMany).toHaveBeenCalledOnce()
    const call = mocks.eventUpdateMany.mock.calls[0]![0] as any
    expect(call.data.eventDate).toEqual(new Date('2027-04-01T00:00:00.000Z'))
    // Compare-and-set: a crawl landing between the read and this write wins.
    expect(call.where).toMatchObject({ id: 'ev_ca-state', status: 'estimated' })
  })

  it('leaves a crawled fair’s dates alone — provenance beats the static dataset', async () => {
    given(
      [row('isef'), row('ca-state', { lastSyncedAt: new Date('2026-11-01') })],
      [event('isef'), event('ca-state', { eventDate: new Date('2027-01-01') })],
    )

    await ensureFairsSeeded()

    expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
  })

  it('leaves a confirmed event alone even on a never-crawled fair', async () => {
    given(
      FAIRS_FIXTURE.map((f) => row(f.key)),
      [event('isef'), event('ca-state', { eventDate: new Date('2027-01-01'), status: 'confirmed' })],
    )

    await ensureFairsSeeded()

    expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
  })

  it('creates a missing fair-year rather than updating a neighbouring one', async () => {
    given(FAIRS_FIXTURE.map((f) => row(f.key)), [event('isef')])

    await ensureFairsSeeded()

    const created = (mocks.eventCreateMany.mock.calls[0]![0] as any).data
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ fairId: 'fair_ca-state', year: 2027 })
    expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
  })
})

describe('P1-R16 — the edition digest replaces the count fast path', () => {
  it('the second call in a process issues no queries at all', async () => {
    await ensureFairsSeeded()
    const after = mocks.fairFindMany.mock.calls.length
    expect(after).toBeGreaterThan(0)

    await ensureFairsSeeded()
    await ensureFairsSeeded()

    expect(mocks.fairFindMany.mock.calls.length).toBe(after)
  })

  it('a failed reconcile is retried rather than memoised as done', async () => {
    mocks.fairFindMany.mockRejectedValueOnce(new Error('db down'))
    await expect(ensureFairsSeeded()).rejects.toThrow('db down')

    given(FAIRS_FIXTURE.map((f) => row(f.key)), FAIRS_FIXTURE.map((f) => event(f.key)))
    await expect(ensureFairsSeeded()).resolves.toBeUndefined()
  })
})
