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
 * Also pins the invariant that makes this correct: the route records INTENT via
 * `orphanObjectKey` and never calls `deleteObject` itself, because the reclaim
 * sweep is the single physical-delete site.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  orphanObjectKey: vi.fn(() => Promise.resolve()),
  deleteObject: vi.fn(() => Promise.resolve()),
  logActivity: vi.fn(() => Promise.resolve()),
  paperFindFirst: vi.fn(),
  transaction: vi.fn(() => Promise.resolve([])),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/uploads/assets', () => ({ orphanObjectKey: mocks.orphanObjectKey }))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
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
})

describe('DELETE /api/papers/[id] — asset lifecycle', () => {
  it('orphans the stored PDF so the sweep reclaims it and the quota is released', async () => {
    const res = await DELETE(deleteReq(), { params })

    expect(res.status).toBe(200)
    expect(mocks.orphanObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team_1',
        objectKey: 'papers/team_1/paper_1.pdf',
        purpose: 'paper_pdf',
      }),
    )
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
