import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Every route that changes public showcase content must re-derive the revision
 * IN THE SAME TRANSACTION as the write (REFACTOR2 P0-R3).
 *
 * `syncShowcaseRevision` is unit-tested on its own in showcase-revision, and the
 * showcase PUT's call is covered in showcase-write-policy. These pin the asset
 * routes — link submission, Works Cited export, and asset deletion — because
 * swapping a video link, re-exporting the bibliography, or deleting the board is
 * exactly the "replace-after-approval" attack.
 *
 * The REAL synchronizer runs here, against a fake transaction client. That is
 * deliberate: mocking it could only prove "was called", and the defect these
 * cover was a call that happened on the base `db` client AFTER the transaction
 * committed. Asserting the state change lands on `tx` before commit is the only
 * form of the assertion the old bug could not pass.
 */

const mocks = vi.hoisted(() => ({
  // db (outside the transaction)
  showcaseFindUnique: vi.fn(),
  citationFindMany: vi.fn(),
  assetFindFirst: vi.fn(),
  commit: vi.fn(),
  // tx (inside the transaction)
  assetFindMany: vi.fn(),
  assetDelete: vi.fn(() => Promise.resolve({})),
  assetCreate: vi.fn(),
  assetDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  assetCount: vi.fn(() => Promise.resolve(0)),
  txShowcaseFindUnique: vi.fn(),
  txShowcaseUpdate: vi.fn(() => Promise.resolve({})),
  txEventCreate: vi.fn(() => Promise.resolve({})),
  // collaborators
  lockAggregate: vi.fn(() => Promise.resolve()),
  orphanObjectKey: vi.fn(() => Promise.resolve()),
  ctx: { teamId: 'team_1', dbUserId: 'user_1' },
}))

const tx = {
  showcaseAsset: {
    findFirst: mocks.assetFindFirst,
    findMany: mocks.assetFindMany,
    deleteMany: mocks.assetDeleteMany,
    delete: mocks.assetDelete,
    create: mocks.assetCreate,
    count: mocks.assetCount,
  },
  showcase: { findUnique: mocks.txShowcaseFindUnique, update: mocks.txShowcaseUpdate },
  showcaseModerationEvent: { create: mocks.txEventCreate },
}

vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/uploads/assets', () => ({ orphanObjectKey: mocks.orphanObjectKey }))
// `withTeamRoute` / `requireTeamContext` are the shared guards; stub them to the
// authenticated path so these tests exercise the handler bodies rather than
// re-testing the guards.
vi.mock('@/lib/api/with-route', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/with-route')>()
  return {
    ...actual,
    withTeamRoute:
      (
        _opts: unknown,
        handler: (a: { req: NextRequest; ctx: typeof mocks.ctx; params: Record<string, string> }) => unknown,
      ) =>
      (req: NextRequest, params?: Record<string, string>) =>
        handler({ req, ctx: mocks.ctx, params: params ?? { id: 'asset_1' } }),
  }
})
vi.mock('@/lib/api/route-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/route-context')>()),
  requireTeamContext: () => Promise.resolve({ ctx: mocks.ctx, error: null }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.showcaseFindUnique },
    showcaseAsset: { findFirst: mocks.assetFindFirst, delete: mocks.assetDelete },
    citation: { findMany: mocks.citationFindMany },
    // Interactive transaction: `commit` marks the boundary, so a sync that ran
    // after the commit (the P0-R3 defect) is visible in the call order.
    $transaction: async (fn: (t: typeof tx) => unknown) => {
      const out = await fn(tx)
      mocks.commit()
      return out
    },
  },
}))

// The guards are stubbed above, so the exported handlers are really the raw
// bodies with a fixed ctx. Their declared Next route signatures no longer apply;
// call them through a narrow local type rather than fighting the framework types.
import { DELETE as DELETE_RAW } from '@/app/api/showcase/asset/[id]/route'
import { POST as POST_LINK_RAW } from '@/app/api/showcase/asset/link/route'
import { POST as POST_EXPORT } from '@/app/api/citations/export/route'
import { showcaseContentDigest } from '@/lib/showcase-server'

type StubbedHandler = (req: NextRequest, params?: Record<string, string>) => Promise<Response>
const DELETE = DELETE_RAW as unknown as StubbedHandler
const POST_LINK = POST_LINK_RAW as unknown as StubbedHandler

const BASE = {
  shortTitle: 'Mould',
  title: 'Mould growth on bread',
  abstract: 'We grew mould.',
  privacyLevel: 'public',
}
const BOARD = { assetType: 'board', fileUrl: 'showcase/t1/board.pdf', metadataJson: null }
const OLD_VIDEO = { assetType: 'video', fileUrl: null, metadataJson: { url: 'https://youtu.be/old' } }
const NEW_VIDEO = { assetType: 'video', fileUrl: null, metadataJson: { url: 'https://youtu.be/dQw4w9WgXcQ' } }
const WORKS_CITED = {
  assetType: 'supplement',
  fileUrl: null,
  metadataJson: { kind: 'works_cited', style: 'apa', text: 'Works Cited (APA)' },
}

/** The revision the teacher signed off on: board + the ORIGINAL video, nothing else. */
const APPROVED_DIGEST = showcaseContentDigest({ ...BASE, assets: [BOARD, OLD_VIDEO] })

/** What the synchronizer reads back inside the tx once the route has written `assets`. */
function approvedButNowHolding(
  assets: { assetType: string; fileUrl: string | null; metadataJson: unknown }[],
) {
  return {
    ...BASE,
    moderationStatus: 'approved',
    approvedDigest: APPROVED_DIGEST,
    contentDigest: APPROVED_DIGEST,
    assets,
  }
}

/**
 * The approval was withdrawn ATOMICALLY: the state change and its audit event
 * both landed on the TRANSACTION client (`db.showcase` has no `update` at all
 * here), and both ran before the transaction committed.
 */
function expectReturnedToReviewInsideTx() {
  expect(mocks.txShowcaseUpdate).toHaveBeenCalledWith({
    where: { id: 'sc_1' },
    data: expect.objectContaining({
      moderationStatus: 'pending_review',
      moderatedAt: null,
      approvedDigest: null,
    }),
  })
  expect(mocks.txEventCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        showcaseId: 'sc_1',
        action: 'revision_invalidated',
        actorUserId: 'user_1',
      }),
    }),
  )
  expect(mocks.txShowcaseUpdate.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.commit.mock.invocationCallOrder[0],
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.showcaseFindUnique.mockResolvedValue({ id: 'sc_1' })
  mocks.assetDeleteMany.mockResolvedValue({ count: 0 })
  mocks.assetFindMany.mockResolvedValue([])
  mocks.assetCount.mockResolvedValue(0)
  mocks.assetCreate.mockResolvedValue({ id: 'a_new', assetType: 'video', metadataJson: {} })
  mocks.citationFindMany.mockResolvedValue([
    { apa: 'Doe, J. (2026). Mould.', mla: 'Doe, John. "Mould."', ieee: '[1] J. Doe, "Mould."' },
  ])
  // Content unchanged unless a test says otherwise.
  mocks.txShowcaseFindUnique.mockResolvedValue(approvedButNowHolding([BOARD, OLD_VIDEO]))
  mocks.txShowcaseUpdate.mockResolvedValue({})
  mocks.txEventCreate.mockResolvedValue({})
})

describe('asset deletion re-derives the revision', () => {
  it('returns an approved showcase to review in the same transaction as the delete', async () => {
    mocks.assetFindFirst.mockResolvedValue({
      id: 'asset_1',
      assetType: 'board',
      fileUrl: 'showcase/t1/board.pdf',
      showcaseId: 'sc_1',
    })
    mocks.txShowcaseFindUnique.mockResolvedValue(approvedButNowHolding([OLD_VIDEO])) // board gone

    await DELETE(new NextRequest('http://app.example.com/api/showcase/asset/asset_1', {
      method: 'DELETE',
    }), { id: 'asset_1' })

    // P1-S8: the row delete, the revision re-derivation, and the ledger orphan
    // all run on the SAME transaction client, so a crash cannot leave an
    // `attached` asset with no live owner.
    expect(mocks.assetDelete).toHaveBeenCalled()
    expectReturnedToReviewInsideTx()
    expect(mocks.orphanObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({ objectKey: 'showcase/t1/board.pdf' }),
      tx,
    )
  })

  it('retires nothing in storage for a link-only asset', async () => {
    mocks.assetFindFirst.mockResolvedValue({
      id: 'asset_1',
      assetType: 'video',
      fileUrl: 'https://youtu.be/abc',
      showcaseId: 'sc_1',
    })

    await DELETE(new NextRequest('http://app.example.com/api/showcase/asset/asset_1', {
      method: 'DELETE',
    }), { id: 'asset_1' })

    expect(mocks.orphanObjectKey).not.toHaveBeenCalled()
  })

  it('does not sync when the asset belongs to another team', async () => {
    mocks.assetFindFirst.mockResolvedValue(null) // team-scoped lookup found nothing

    await DELETE(new NextRequest('http://app.example.com/api/showcase/asset/asset_1', {
      method: 'DELETE',
    }), { id: 'asset_1' }).catch(() => {})

    expect(mocks.assetDelete).not.toHaveBeenCalled()
    expect(mocks.txShowcaseFindUnique).not.toHaveBeenCalled() // sync never started
  })
})

describe('link replacement re-derives the revision', () => {
  function linkReq(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://app.example.com/api/showcase/asset/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns an approved showcase to review in the same transaction as the link swap', async () => {
    mocks.txShowcaseFindUnique.mockResolvedValue(approvedButNowHolding([BOARD, NEW_VIDEO]))

    await POST_LINK(linkReq({ assetType: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }))

    expect(mocks.assetCreate).toHaveBeenCalled()
    expectReturnedToReviewInsideTx()
  })

  it('does not sync when there is no showcase to attach to', async () => {
    mocks.showcaseFindUnique.mockResolvedValue(null)

    const res = await POST_LINK(linkReq({ assetType: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }))

    expect(res.status).toBe(409)
    expect(mocks.txShowcaseFindUnique).not.toHaveBeenCalled()
  })

  it('does not sync when the URL is rejected', async () => {
    const res = await POST_LINK(linkReq({ assetType: 'video', url: 'https://evil.example/x' }))

    expect(res.status).toBe(400)
    expect(mocks.assetCreate).not.toHaveBeenCalled()
    expect(mocks.txShowcaseFindUnique).not.toHaveBeenCalled()
  })
})

describe('Works Cited export re-derives the revision', () => {
  function exportReq(style = 'apa'): NextRequest {
    return new NextRequest('http://app.example.com/api/citations/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ style }),
    })
  }

  it('returns an approved showcase to review in the same transaction as the supplement swap', async () => {
    mocks.assetCreate.mockResolvedValue({ id: 'a_wc', assetType: 'supplement', metadataJson: {} })
    mocks.txShowcaseFindUnique.mockResolvedValue(
      approvedButNowHolding([BOARD, OLD_VIDEO, WORKS_CITED]),
    )

    const res = await POST_EXPORT(exportReq())

    expect(res.status).toBe(201)
    expect(mocks.assetCreate).toHaveBeenCalled()
    expectReturnedToReviewInsideTx()
  })

  it('does not sync when there are no citations to export', async () => {
    mocks.citationFindMany.mockResolvedValue([])

    const res = await POST_EXPORT(exportReq())

    expect(res.status).toBe(409)
    expect(mocks.assetCreate).not.toHaveBeenCalled()
    expect(mocks.txShowcaseFindUnique).not.toHaveBeenCalled()
  })

  it('does not sync when the team has no showcase yet', async () => {
    mocks.showcaseFindUnique.mockResolvedValue(null)

    const res = await POST_EXPORT(exportReq())

    expect(res.status).toBe(409)
    expect(mocks.txShowcaseFindUnique).not.toHaveBeenCalled()
  })
})
