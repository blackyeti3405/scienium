import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Two-phase topic-change removal protocol (v0.28.0) — "the model proposes,
 * the student disposes".
 *
 * The batch relevance check interpolates paper text the team does not control,
 * so its verdict must never drive the hard delete directly. These tests pin the
 * protocol a well-meaning refactor could quietly undo:
 *   - phase 1 (`confirmWipe`) runs the model but deletes NOTHING;
 *   - phase 2 (`confirmRemoveIds`) deletes ONLY caller-approved ids, resolved
 *     through a team-scoped query (IDOR), with NO model call at all;
 *   - the paid `ai` tier is cleared before the model fires.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  enforceRateLimit: vi.fn(),
  batchCheckRelevance: vi.fn(),
  deleteObject: vi.fn(() => Promise.resolve()),
  logActivity: vi.fn(() => Promise.resolve()),
  matchInterests: vi.fn(() => []),
  teamFindUnique: vi.fn(),
  teamUpdate: vi.fn(() => Promise.resolve({})),
  paperCount: vi.fn(),
  paperFindMany: vi.fn(),
  paperDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  topicInterestFindMany: vi.fn(() => Promise.resolve([])),
  transaction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/literature/relevance', () => ({ batchCheckRelevance: mocks.batchCheckRelevance }))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/discovery/interest-match', () => ({ matchInterests: mocks.matchInterests }))
vi.mock('@/lib/db', () => ({
  db: {
    team: { findUnique: mocks.teamFindUnique, update: mocks.teamUpdate },
    paper: {
      count: mocks.paperCount,
      findMany: mocks.paperFindMany,
      deleteMany: mocks.paperDeleteMany,
    },
    topicInterest: { findMany: mocks.topicInterestFindMany },
    $transaction: mocks.transaction,
  },
}))

import { POST } from '@/app/api/discovery/topic/route'

const CTX = { userId: 'clerk_1', dbUserId: 'u1', teamId: 'team_1' }

function topicReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/discovery/topic', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({ ctx: CTX, error: null })
  mocks.enforceRateLimit.mockResolvedValue(null)
  mocks.teamFindUnique.mockResolvedValue({ topic: 'Old topic about corals' })
  mocks.matchInterests.mockReturnValue([])
  mocks.topicInterestFindMany.mockResolvedValue([])
  // Topic-lock bonus transaction: pretend already granted (P2002-shaped throw).
  mocks.transaction.mockRejectedValue({ code: 'P2002' })
})

describe('phase 0 — topic changing with papers, no confirmation yet', () => {
  it('409s with requiresConfirmation and deletes nothing', async () => {
    mocks.paperCount.mockResolvedValue(3)
    const res = await POST(topicReq({ topic: 'New topic about magnets' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ requiresConfirmation: true, paperCount: 3 })
    expect(mocks.paperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.batchCheckRelevance).not.toHaveBeenCalled()
  })
})

describe('phase 1 — confirmWipe proposes, never deletes', () => {
  const PAPERS = [
    { id: 'p_keep', title: 'Magnet paper', abstract: 'magnets', pdfKey: 'k1' },
    { id: 'p_drop', title: 'Coral paper', abstract: 'corals', pdfKey: 'k2' },
  ]

  it('clears the paid ai tier BEFORE the model call', async () => {
    mocks.paperFindMany.mockResolvedValue(PAPERS)
    const limited = new Response(JSON.stringify({ error: 'limited' }), { status: 429 })
    mocks.enforceRateLimit.mockResolvedValue(limited)

    const res = await POST(topicReq({ topic: 'New topic about magnets', confirmWipe: true }))

    expect(res.status).toBe(429)
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(expect.anything(), 'ai', CTX.userId)
    expect(mocks.batchCheckRelevance).not.toHaveBeenCalled()
    expect(mocks.paperDeleteMany).not.toHaveBeenCalled()
  })

  it('returns the proposed removals as {id, title} and deletes NOTHING', async () => {
    mocks.paperFindMany.mockResolvedValue(PAPERS)
    mocks.batchCheckRelevance.mockResolvedValue(
      new Map([
        ['p_keep', true],
        ['p_drop', false],
      ]),
    )

    const res = await POST(topicReq({ topic: 'New topic about magnets', confirmWipe: true }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.requiresRemovalConfirmation).toBe(true)
    expect(body.papers).toEqual([{ id: 'p_drop', title: 'Coral paper' }])
    expect(mocks.paperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.deleteObject).not.toHaveBeenCalled()
  })

  it('proceeds straight to the topic change when the model keeps everything', async () => {
    mocks.paperFindMany.mockResolvedValue(PAPERS)
    mocks.batchCheckRelevance.mockResolvedValue(
      new Map([
        ['p_keep', true],
        ['p_drop', true],
      ]),
    )

    const res = await POST(topicReq({ topic: 'New topic about magnets', confirmWipe: true }))

    expect(res.status).toBe(200)
    expect(mocks.paperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.teamUpdate).toHaveBeenCalled()
  })
})

describe('phase 2 — confirmRemoveIds deletes only approved, team-scoped, NO model', () => {
  it('resolves approved ids through a team-scoped query and deletes only those', async () => {
    // The student approved two ids, but the team-scoped resolution only finds
    // one — the other is foreign or stale and must be silently dropped.
    mocks.paperFindMany.mockResolvedValue([{ id: 'p_mine', title: 'Mine', pdfKey: 'k1' }])
    mocks.paperDeleteMany.mockResolvedValue({ count: 1 })

    const res = await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p_mine', 'p_foreign'],
      }),
    )

    expect(res.status).toBe(200)
    // Resolution query is team-scoped (the IDOR boundary).
    expect(mocks.paperFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: CTX.teamId, status: 'ready' }),
      }),
    )
    // Delete carries teamId AND only the resolved id — never the foreign one.
    expect(mocks.paperDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: CTX.teamId, id: { in: ['p_mine'] } }),
      }),
    )
    expect((await res.json()).removedCount).toBe(1)
  })

  it('makes NO model call — the student list, not the verdict, authorizes', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p1', title: 'T', pdfKey: null }])
    mocks.paperDeleteMany.mockResolvedValue({ count: 1 })

    await POST(
      topicReq({ topic: 'New topic about magnets', confirmWipe: true, confirmRemoveIds: ['p1'] }),
    )

    expect(mocks.batchCheckRelevance).not.toHaveBeenCalled()
    expect(mocks.enforceRateLimit).not.toHaveBeenCalledWith(expect.anything(), 'ai', expect.anything())
  })
})

describe('input validation', () => {
  it('rejects unknown body fields (strict schema)', async () => {
    const res = await POST(topicReq({ topic: 'x', role: 'admin' }))
    expect(res.status).toBe(400)
  })

  it('rejects an oversized confirmRemoveIds list', async () => {
    const res = await POST(
      topicReq({ topic: 'x', confirmWipe: true, confirmRemoveIds: Array(201).fill('a'.repeat(10)) }),
    )
    expect(res.status).toBe(400)
  })
})
