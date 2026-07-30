import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The fair catalog is GLOBAL (REFACTOR2 P1-S10).
 *
 * `Fair` and `FairEvent` are shared by every team, but any student matched to a
 * fair could trigger a paid Firecrawl crawl: N students in one state each paid
 * for the same fair, concurrently, and the read-then-write on the shared event
 * row was last-writer-wins. Provider output was also cast rather than validated,
 * and the year was trusted unbounded.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  fairFindUnique: vi.fn(),
  fairUpdateMany: vi.fn(),
  teamFindUnique: vi.fn(),
  eventFindFirst: vi.fn(),
  eventFindFirstOrThrow: vi.fn(),
  eventUpdateMany: vi.fn(),
  eventCreate: vi.fn(),
  extract: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/env', () => ({ serverEnv: { FIRECRAWL_API_KEY: () => 'test-key' } }))
vi.mock('firecrawl', () => ({
  Firecrawl: class {
    extract = mocks.extract
  },
}))
vi.mock('@/lib/db', () => ({
  db: {
    fair: { findUnique: mocks.fairFindUnique, updateMany: mocks.fairUpdateMany },
    team: { findUnique: mocks.teamFindUnique },
    fairEvent: {
      findFirst: mocks.eventFindFirst,
      findFirstOrThrow: mocks.eventFindFirstOrThrow,
      updateMany: mocks.eventUpdateMany,
      create: mocks.eventCreate,
    },
  },
}))

import { POST } from '@/app/api/fairs/[id]/sync-deadlines/route'

const params = { params: Promise.resolve({ id: 'fair_1' }) }
const YEAR = new Date().getUTCFullYear() + 1

function syncReq(): NextRequest {
  return new NextRequest('http://app.example.com/api/fairs/fair_1/sync-deadlines', {
    method: 'POST',
  })
}

function goodExtract(over: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      year: YEAR,
      eventDate: `${YEAR}-03-14`,
      registrationDeadline: `${YEAR}-02-01`,
      abstractDeadline: null,
      venue: 'City Hall',
      ...over,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
    error: null,
  })
  mocks.fairFindUnique.mockResolvedValue({
    id: 'fair_1',
    name: 'State Fair',
    websiteUrl: 'https://fair.example',
    level: 'state',
    state: 'CA',
  })
  mocks.teamFindUnique.mockResolvedValue({ locationState: 'CA' })
  mocks.eventFindFirst.mockResolvedValue(null)
  mocks.fairUpdateMany.mockResolvedValue({ count: 1 })
  mocks.eventUpdateMany.mockResolvedValue({ count: 1 })
  mocks.eventFindFirstOrThrow.mockResolvedValue({
    year: YEAR,
    eventDate: new Date(`${YEAR}-03-14`),
    registrationDeadline: null,
    abstractDeadline: null,
    venue: 'City Hall',
  })
  mocks.extract.mockResolvedValue(goodExtract())
})

describe('one crawler per fair, with a cooldown', () => {
  it('claims the fair before spending', async () => {
    const res = await POST(syncReq(), params)

    expect(res.status).toBe(200)
    const claim = mocks.fairUpdateMany.mock.calls[0]![0]
    expect(claim.data).toMatchObject({ syncClaimedAt: expect.any(Date) })
    expect(mocks.fairUpdateMany.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.extract.mock.invocationCallOrder[0]!,
    )
  })

  // A second student in the same state must not start their own paid job.
  it('429s the loser without crawling', async () => {
    mocks.fairUpdateMany.mockResolvedValue({ count: 0 })

    const res = await POST(syncReq(), params)

    expect(res.status).toBe(429)
    expect(mocks.extract).not.toHaveBeenCalled()
  })

  it('the claim predicate covers BOTH a live claim and the cooldown', async () => {
    await POST(syncReq(), params)

    const where = mocks.fairUpdateMany.mock.calls[0]![0].where
    expect(where.OR).toEqual([
      { syncClaimedAt: null },
      { syncClaimedAt: { lt: expect.any(Date) } },
    ])
    expect(where.AND).toEqual([
      { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: expect.any(Date) } }] },
    ])
  })

  it('records who refreshed a shared row, and starts the cooldown', async () => {
    await POST(syncReq(), params)

    const release = mocks.fairUpdateMany.mock.calls.at(-1)![0]
    expect(release.data).toMatchObject({
      syncClaimedAt: null,
      lastSyncedAt: expect.any(Date),
      lastSyncedByUserId: 'user_1',
    })
  })

  it('releases the claim when the crawl fails, rather than holding the fair', async () => {
    mocks.extract.mockRejectedValue(new Error('firecrawl down'))

    const res = await POST(syncReq(), params)

    expect(res.status).toBe(502)
    expect(mocks.fairUpdateMany.mock.calls.at(-1)![0].data).toMatchObject({ syncClaimedAt: null })
  })
})

describe('provider output is validated, not cast', () => {
  it('rejects a response that does not match the schema', async () => {
    mocks.extract.mockResolvedValue({ success: true, data: { year: 'next year', venue: 42 } })

    const res = await POST(syncReq(), params)

    expect(res.status).toBe(422)
    expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
  })

  // A model that returns 1999 or 2190 has misread the page — and this row is
  // read by every team in the state.
  it('rejects an implausible year', async () => {
    for (const year of [1999, 2190, new Date().getUTCFullYear() + 9]) {
      vi.clearAllMocks()
      mocks.requireTeamContext.mockResolvedValue({
        ctx: { teamId: 'team_1', dbUserId: 'user_1', userId: 'clerk_1' },
        error: null,
      })
      mocks.fairFindUnique.mockResolvedValue({
        id: 'fair_1', name: 'State Fair', websiteUrl: 'https://fair.example',
        level: 'state', state: 'CA',
      })
      mocks.teamFindUnique.mockResolvedValue({ locationState: 'CA' })
      mocks.eventFindFirst.mockResolvedValue(null)
      mocks.fairUpdateMany.mockResolvedValue({ count: 1 })
      mocks.extract.mockResolvedValue(goodExtract({ year }))

      expect((await POST(syncReq(), params)).status).toBe(422)
      expect(mocks.eventUpdateMany).not.toHaveBeenCalled()
    }
  })
})

describe('publishing is a compare-and-set on the shared row', () => {
  it('only ever overwrites an `estimated` row', async () => {
    await POST(syncReq(), params)

    expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
      where: { fairId: 'fair_1', year: YEAR, status: 'estimated' },
      data: expect.objectContaining({ status: 'estimated' }),
    })
  })

  it('refuses to downgrade a confirmed row, whoever wins the race', async () => {
    mocks.eventUpdateMany.mockResolvedValue({ count: 0 }) // a confirmed row stands
    mocks.eventCreate.mockRejectedValue(new Error('unique (fairId, year)'))

    const res = await POST(syncReq(), params)

    expect(res.status).toBe(409)
  })

  it('creates the row when no event exists for that year yet', async () => {
    mocks.eventUpdateMany.mockResolvedValue({ count: 0 })
    mocks.eventCreate.mockResolvedValue({ id: 'ev_1' })

    expect((await POST(syncReq(), params)).status).toBe(200)
    expect(mocks.eventCreate).toHaveBeenCalled()
  })
})

describe('scope guard still holds', () => {
  it('404s a fair outside the team’s state without claiming or crawling', async () => {
    mocks.teamFindUnique.mockResolvedValue({ locationState: 'NY' })

    const res = await POST(syncReq(), params)

    expect(res.status).toBe(404)
    expect(mocks.fairUpdateMany).not.toHaveBeenCalled()
    expect(mocks.extract).not.toHaveBeenCalled()
  })
})
