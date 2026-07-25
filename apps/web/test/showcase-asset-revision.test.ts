import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Asset routes must re-derive the revision (REFACTOR2 P0-R3).
 *
 * `syncShowcaseRevision` is unit-tested on its own, and the showcase PUT's call
 * is covered in showcase-write-policy. These pin the two remaining callers — the
 * link route and asset deletion — because replacing a video link or deleting the
 * board is exactly the "replace-after-approval" attack, and a missing call there
 * would leave an approved showcase serving content nobody reviewed.
 */

const mocks = vi.hoisted(() => ({
  showcaseFindUnique: vi.fn(),
  assetFindFirst: vi.fn(),
  assetDelete: vi.fn(() => Promise.resolve({})),
  assetCreate: vi.fn(),
  assetDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  assetCount: vi.fn(() => Promise.resolve(0)),
  lockAggregate: vi.fn(() => Promise.resolve()),
  orphanObjectKey: vi.fn(() => Promise.resolve()),
  syncShowcaseRevision: vi.fn(() => Promise.resolve({ digest: 'd'.repeat(64), invalidated: false })),
  ctx: { teamId: 'team_1', dbUserId: 'user_1' },
}))

const tx = {
  showcaseAsset: {
    findFirst: mocks.assetFindFirst,
    deleteMany: mocks.assetDeleteMany,
    create: mocks.assetCreate,
    count: mocks.assetCount,
  },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/uploads/assets', () => ({ orphanObjectKey: mocks.orphanObjectKey }))
vi.mock('@/lib/showcase-server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/showcase-server')>()),
  syncShowcaseRevision: mocks.syncShowcaseRevision,
}))
// `withTeamRoute` is the shared guard wrapper; stub it to the authenticated path
// so these tests exercise the handler body rather than re-testing the guard.
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
vi.mock('@/lib/db', () => ({
  db: {
    showcase: { findUnique: mocks.showcaseFindUnique },
    showcaseAsset: { findFirst: mocks.assetFindFirst, delete: mocks.assetDelete },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

// `withTeamRoute` is stubbed above, so the exported handlers are really the raw
// bodies with a fixed ctx. Their declared Next route signatures no longer apply;
// call them through a narrow local type rather than fighting the framework types.
import { DELETE as DELETE_RAW } from '@/app/api/showcase/asset/[id]/route'
import { POST as POST_LINK_RAW } from '@/app/api/showcase/asset/link/route'

type StubbedHandler = (req: NextRequest, params?: Record<string, string>) => Promise<Response>
const DELETE = DELETE_RAW as unknown as StubbedHandler
const POST_LINK = POST_LINK_RAW as unknown as StubbedHandler

beforeEach(() => {
  vi.clearAllMocks()
  mocks.syncShowcaseRevision.mockResolvedValue({ digest: 'd'.repeat(64), invalidated: false })
  mocks.showcaseFindUnique.mockResolvedValue({ id: 'sc_1' })
  mocks.assetDeleteMany.mockResolvedValue({ count: 0 })
  mocks.assetCount.mockResolvedValue(0)
  mocks.assetCreate.mockResolvedValue({ id: 'a_new', assetType: 'video', metadataJson: {} })
})

describe('asset deletion re-derives the revision', () => {
  it('syncs after removing a required asset', async () => {
    mocks.assetFindFirst.mockResolvedValue({
      id: 'asset_1',
      assetType: 'board',
      fileUrl: 'showcase/t1/board.pdf',
      showcaseId: 'sc_1',
    })

    await DELETE(new NextRequest('http://app.example.com/api/showcase/asset/asset_1', {
      method: 'DELETE',
    }), { id: 'asset_1' })

    expect(mocks.assetDelete).toHaveBeenCalled()
    expect(mocks.syncShowcaseRevision).toHaveBeenCalledWith(expect.anything(), 'sc_1', 'user_1')
  })

  it('does not sync when the asset belongs to another team', async () => {
    mocks.assetFindFirst.mockResolvedValue(null) // team-scoped lookup found nothing

    await DELETE(new NextRequest('http://app.example.com/api/showcase/asset/asset_1', {
      method: 'DELETE',
    }), { id: 'asset_1' }).catch(() => {})

    expect(mocks.assetDelete).not.toHaveBeenCalled()
    expect(mocks.syncShowcaseRevision).not.toHaveBeenCalled()
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

  it('syncs after a video link is swapped', async () => {
    await POST_LINK(linkReq({ assetType: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }))

    expect(mocks.assetCreate).toHaveBeenCalled()
    expect(mocks.syncShowcaseRevision).toHaveBeenCalledWith(expect.anything(), 'sc_1', 'user_1')
  })

  it('does not sync when there is no showcase to attach to', async () => {
    mocks.showcaseFindUnique.mockResolvedValue(null)

    const res = await POST_LINK(linkReq({ assetType: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' }))

    expect(res.status).toBe(409)
    expect(mocks.syncShowcaseRevision).not.toHaveBeenCalled()
  })

  it('does not sync when the URL is rejected', async () => {
    const res = await POST_LINK(linkReq({ assetType: 'video', url: 'https://evil.example/x' }))

    expect(res.status).toBe(400)
    expect(mocks.assetCreate).not.toHaveBeenCalled()
    expect(mocks.syncShowcaseRevision).not.toHaveBeenCalled()
  })
})
