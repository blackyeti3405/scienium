import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Two-phase topic-change removal protocol — "the model proposes, the student
 * disposes", with the SERVER holding the permission slip (REFACTOR2 P1-R1).
 *
 * The batch relevance check interpolates paper text the team does not control,
 * so its verdict must never drive the hard delete directly. These tests pin the
 * protocol a well-meaning refactor could quietly undo:
 *   - phase 1 (`confirmWipe`) runs the model, deletes NOTHING, and issues a
 *     single-use proposal token bound to the exact ids it proposed;
 *   - phase 2 deletes ONLY those ids, resolved through a team-scoped query
 *     (IDOR), with NO model call — and ONLY when the matching token is present;
 *   - the paid `ai` tier is cleared before the model fires.
 *
 * The v0.28.0 version of this file asserted phase 2 with `confirmRemoveIds`
 * alone, which pinned the bypass rather than preventing it: the "phases" were
 * client-sent booleans, so a direct caller could post an arbitrary id list and
 * delete any ready paper it knew. The token is what makes the confirmation the
 * server's.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  enforceRateLimit: vi.fn(),
  batchCheckRelevance: vi.fn(),
  deleteObject: vi.fn(() => Promise.resolve()),
  logActivityBestEffort: vi.fn(() => Promise.resolve()),
  matchInterests: vi.fn(() => []),
  teamFindUnique: vi.fn(),
  teamUpdate: vi.fn(() => Promise.resolve({})),
  paperCount: vi.fn(),
  paperFindMany: vi.fn(),
  paperDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  orphanObjectKey: vi.fn((): Promise<void> => Promise.resolve()),
  txPaperDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  topicInterestFindMany: vi.fn(() => Promise.resolve([])),
  proposeDestructive: vi.fn(() => Promise.resolve('proposal_token_1')),
  consumeDestructive: vi.fn(
    (): Promise<{ ok: boolean; reason?: string }> => Promise.resolve({ ok: true }),
  ),
  transaction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: mocks.enforceRateLimit }))
vi.mock('@/lib/literature/relevance', () => ({ batchCheckRelevance: mocks.batchCheckRelevance }))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))
vi.mock('@/lib/uploads/assets', () => ({ orphanObjectKey: mocks.orphanObjectKey }))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.logActivityBestEffort }))
vi.mock('@/lib/discovery/interest-match', () => ({ matchInterests: mocks.matchInterests }))
vi.mock('@/lib/api/destructive-proposal', () => ({
  proposeDestructive: mocks.proposeDestructive,
  consumeDestructive: mocks.consumeDestructive,
}))
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
  mocks.txPaperDeleteMany.mockResolvedValue({ count: 0 })
  mocks.orphanObjectKey.mockResolvedValue(undefined)
  // ONE `$transaction` mock now serves two callers: the paper-removal commit
  // (P1-S8 — domain delete + ledger orphan together) and the topic-lock KP
  // bonus. Run the callback for real; the bonus fails from INSIDE via its own
  // P2002-shaped throw, exactly as an already-granted bonus would.
  mocks.transaction.mockImplementation((fn: (t: unknown) => unknown) =>
    fn({
      paper: { deleteMany: mocks.txPaperDeleteMany },
      discoveryTopicBonus: {
        create: () => Promise.reject({ code: 'P2002' }),
      },
      teamCurrency: { upsert: () => Promise.resolve({}) },
    }),
  )
  mocks.proposeDestructive.mockResolvedValue('proposal_token_1')
  mocks.consumeDestructive.mockResolvedValue({ ok: true })
})

describe('phase 0 — topic changing with papers, no confirmation yet', () => {
  it('409s with requiresConfirmation and deletes nothing', async () => {
    mocks.paperCount.mockResolvedValue(3)
    const res = await POST(topicReq({ topic: 'New topic about magnets' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ requiresConfirmation: true, paperCount: 3 })
    expect(mocks.txPaperDeleteMany).not.toHaveBeenCalled()
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
    expect(mocks.txPaperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.deleteObject).not.toHaveBeenCalled()

    // The server records what it proposed, bound to actor/team/topic-change.
    expect(body.proposalToken).toBe('proposal_token_1')
    expect(mocks.proposeDestructive).toHaveBeenCalledWith({
      teamId: CTX.teamId,
      actorUserId: CTX.dbUserId,
      command: 'topic_paper_removal',
      targetIds: ['p_drop'],
      context: ['Old topic about corals', 'New topic about magnets'],
    })
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
    expect(mocks.txPaperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.teamUpdate).toHaveBeenCalled()
  })
})

describe('phase 2 — the server’s own proposal authorizes the delete', () => {
  it('resolves approved ids through a team-scoped query and deletes only those', async () => {
    // The student approved two ids, but the team-scoped resolution only finds
    // one — the other is foreign or stale and must be silently dropped.
    mocks.paperFindMany.mockResolvedValue([{ id: 'p_mine', title: 'Mine', pdfKey: 'k1' }])
    mocks.txPaperDeleteMany.mockResolvedValue({ count: 1 })

    const res = await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p_mine', 'p_foreign'],
        proposalToken: 'proposal_token_1',
      }),
    )

    expect(res.status).toBe(200)
    // Resolution query is team-scoped (the IDOR boundary).
    expect(mocks.paperFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: CTX.teamId, status: 'ready' }),
      }),
    )
    // Delete carries teamId AND only the resolved id — never the foreign one,
    // and runs on the TRANSACTION client alongside the ledger retirement.
    expect(mocks.txPaperDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: CTX.teamId, id: { in: ['p_mine'] } }),
      }),
    )
    expect((await res.json()).removedCount).toBe(1)
  })

  it('makes NO model call — the student list, not the verdict, authorizes', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p1', title: 'T', pdfKey: null }])
    mocks.txPaperDeleteMany.mockResolvedValue({ count: 1 })

    await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p1'],
        proposalToken: 'proposal_token_1',
      }),
    )

    expect(mocks.batchCheckRelevance).not.toHaveBeenCalled()
    expect(mocks.enforceRateLimit).not.toHaveBeenCalledWith(expect.anything(), 'ai', expect.anything())
  })
})

// The bypass the previous version of this file pinned instead of preventing.
// REFACTOR2 P1-S8: the removal used to delete rows, then best-effort-delete
// bytes with a direct `deleteObject` outside any transaction. A crash between
// them stranded both — rows gone, object leaked, quota still charged.
describe('deletion and storage retirement commit together (P1-S8)', () => {
  it('retires each PDF through the ledger on the SAME transaction client', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p1', title: 'T', pdfKey: 'papers/team_1/p1.pdf' }])
    mocks.txPaperDeleteMany.mockResolvedValue({ count: 1 })

    await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p1'],
        proposalToken: 'proposal_token_1',
      }),
    )

    expect(mocks.orphanObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({ objectKey: 'papers/team_1/p1.pdf', purpose: 'paper_pdf' }),
      expect.objectContaining({ paper: expect.anything() }),
    )
    // The reclaim sweep remains the single physical-delete site.
    expect(mocks.deleteObject).not.toHaveBeenCalled()
  })

  it('skips the ledger for a paper with no stored PDF', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p1', title: 'T', pdfKey: null }])
    mocks.txPaperDeleteMany.mockResolvedValue({ count: 1 })

    await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p1'],
        proposalToken: 'proposal_token_1',
      }),
    )

    expect(mocks.orphanObjectKey).not.toHaveBeenCalled()
  })
})

describe('a client-asserted confirmation is not a capability (P1-R1)', () => {
  it('deletes NOTHING when confirmRemoveIds arrives with no proposal token', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p_mine', title: 'Mine', pdfKey: 'k1' }])

    const res = await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p_mine'],
      }),
    )

    expect(res.status).toBe(409)
    expect(mocks.txPaperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.deleteObject).not.toHaveBeenCalled()
    // The topic must not change either — the command failed as a whole.
    expect(mocks.teamUpdate).not.toHaveBeenCalled()
    expect(mocks.consumeDestructive).not.toHaveBeenCalled()
  })

  it('deletes NOTHING when the token does not match what the server proposed', async () => {
    mocks.consumeDestructive.mockResolvedValue({ ok: false, reason: 'invalid' })
    mocks.paperFindMany.mockResolvedValue([{ id: 'p_mine', title: 'Mine', pdfKey: 'k1' }])

    const res = await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p_someone_elses'],
        proposalToken: 'guessed_or_replayed',
      }),
    )

    expect(res.status).toBe(409)
    expect(mocks.txPaperDeleteMany).not.toHaveBeenCalled()
    expect(mocks.teamUpdate).not.toHaveBeenCalled()
  })

  it('consumes the proposal against the EXACT ids the caller sent', async () => {
    mocks.paperFindMany.mockResolvedValue([{ id: 'p_mine', title: 'Mine', pdfKey: 'k1' }])
    mocks.txPaperDeleteMany.mockResolvedValue({ count: 1 })

    await POST(
      topicReq({
        topic: 'New topic about magnets',
        confirmWipe: true,
        confirmRemoveIds: ['p_mine'],
        proposalToken: 'proposal_token_1',
      }),
    )

    // Swapping in extra ids changes the digest, so the consume would fail —
    // this is the binding that stops an expanded delete list riding a real token.
    expect(mocks.consumeDestructive).toHaveBeenCalledWith({
      token: 'proposal_token_1',
      teamId: CTX.teamId,
      actorUserId: CTX.dbUserId,
      command: 'topic_paper_removal',
      targetIds: ['p_mine'],
      context: ['Old topic about corals', 'New topic about magnets'],
    })
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
