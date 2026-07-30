import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Paper deletion must retire its stored PDF through the asset ledger.
 *
 * Regression guard: the v0.28.0 storage quota added an `attached` UploadedAsset
 * row for every uploaded paper, but the DELETE path was never updated. The row
 * outlived its paper, so the bytes stayed charged against the team's 2 GB quota
 * forever and the object was never reclaimed — reachable by an ordinary student
 * just tidying their library. Fixed in v0.29.2.
 *
 * Also pins the two invariants that make this correct: the route records INTENT
 * via `orphanObjectKey` and never calls `deleteObject` itself (the reclaim sweep
 * is the single physical-delete site), and the domain deletes and that ledger
 * transition commit in ONE transaction (REFACTOR2 P1-S8) — split across two
 * commits, a crash in between left an `attached` row with no live owner, which
 * the sweep cannot see and a retry cannot fix (it 404s on the missing paper).
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  orphanObjectKey: vi.fn((): Promise<void> => Promise.resolve()),
  deleteObject: vi.fn(() => Promise.resolve()),
  logActivityBestEffort: vi.fn(() => Promise.resolve()),
  paperFindFirst: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/uploads/assets', () => ({ orphanObjectKey: mocks.orphanObjectKey }))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.logActivityBestEffort }))
vi.mock('@/lib/db', () => ({
  db: {
    paper: { findFirst: mocks.paperFindFirst, delete: vi.fn() },
    paperChatMessage: { deleteMany: vi.fn() },
    paperQuizAttempt: { deleteMany: vi.fn() },
    paperQuizSession: { deleteMany: vi.fn() },
    paperRelevanceNote: { deleteMany: vi.fn() },
    paperProficiency: { deleteMany: vi.fn() },
    paperExplanationAttempt: { deleteMany: vi.fn() },
    paperExplanation: { deleteMany: vi.fn() },
    $transaction: mocks.transaction,
  },
}))

/** Prisma models the route touches inside its transaction. */
const txClient = {
  paper: { delete: vi.fn() },
  paperChatMessage: { deleteMany: vi.fn() },
  paperQuizAttempt: { deleteMany: vi.fn() },
  paperQuizSession: { deleteMany: vi.fn() },
  paperRelevanceNote: { deleteMany: vi.fn() },
  paperProficiency: { deleteMany: vi.fn() },
  paperExplanationAttempt: { deleteMany: vi.fn() },
  paperExplanation: { deleteMany: vi.fn() },
}

import { DELETE } from '@/app/api/papers/[id]/route'

const CTX = { userId: 'clerk_1', dbUserId: 'u1', teamId: 'team_1' }

function deleteReq(): NextRequest {
  return new NextRequest('http://localhost/api/papers/paper_1', { method: 'DELETE' })
}

const params = Promise.resolve({ id: 'paper_1' })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireTeamContext.mockResolvedValue({ ctx: CTX, error: null })
  mocks.paperFindFirst.mockResolvedValue({ id: 'paper_1', title: 'A Paper', pdfKey: 'papers/team_1/paper_1.pdf' })
  // Run the route's transaction callback against the stub client.
  mocks.transaction.mockImplementation((fn: (t: typeof txClient) => unknown) => fn(txClient))
  // clearAllMocks keeps implementations — restore the happy-path ledger write.
  mocks.orphanObjectKey.mockResolvedValue(undefined)
})

describe('DELETE /api/papers/[id] — asset lifecycle', () => {
  it('orphans the stored PDF so the sweep reclaims it and the quota is released', async () => {
    const res = await DELETE(deleteReq(), { params })

    expect(res.status).toBe(200)
    // Called with the TRANSACTION client, so the ledger transition commits with
    // the domain deletes rather than after them (P1-S8).
    expect(mocks.orphanObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team_1',
        objectKey: 'papers/team_1/paper_1.pdf',
        purpose: 'paper_pdf',
      }),
      txClient,
    )
    expect(txClient.paper.delete).toHaveBeenCalledWith({ where: { id: 'paper_1' } })
  })

  it('rolls the paper delete back when the ledger transition fails', async () => {
    // One transaction means one outcome: no half-state where the paper is gone
    // but its asset is still `attached` with nothing owning it.
    mocks.orphanObjectKey.mockRejectedValue(new Error('ledger write failed'))

    await expect(DELETE(deleteReq(), { params })).rejects.toThrow('ledger write failed')
  })

  it('records intent only — never deletes the object directly', async () => {
    // The reclaim sweep is the single physical-delete site; a direct
    // deleteObject here would drop the bytes while leaving the ledger row.
    await DELETE(deleteReq(), { params })
    expect(mocks.deleteObject).not.toHaveBeenCalled()
  })

  it('a paper with no stored PDF (text/external source) skips the ledger call', async () => {
    mocks.paperFindFirst.mockResolvedValue({ id: 'paper_1', title: 'A Paper', pdfKey: null })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(200)
    expect(mocks.orphanObjectKey).not.toHaveBeenCalled()
  })

  it("another team's paper 404s and touches no storage", async () => {
    mocks.paperFindFirst.mockResolvedValue(null)
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(404)
    expect(mocks.orphanObjectKey).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
