import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Upload asset ownership + reclaim race discipline (PILOT-3 matrix).
 *
 * Ownership: attachment references resolve ONLY through the caller team's own
 * ledger rows / upload prefix (SEC-6) — a reference to another team's object,
 * a traversal path, or a swept asset rejects the whole batch.
 *
 * Reclaim: the sweep is the single physical-delete site and uses
 * claim-then-delete — an asset attached in the race window is never deleted,
 * and a failed storage delete releases the claim for a later sweep.
 */

const mocks = vi.hoisted(() => ({
  assetFindMany: vi.fn(),
  paperFindMany: vi.fn((): Promise<{ id: string }[]> => Promise.resolve([])),
  projectLogFindMany: vi.fn((): Promise<{ id: string }[]> => Promise.resolve([])),
  showcaseAssetFindMany: vi.fn((): Promise<{ id: string }[]> => Promise.resolve([])),
  assetUpdateMany: vi.fn(),
  assetAggregate: vi.fn(),
  assetCreate: vi.fn(),
  deleteObject: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    uploadedAsset: {
      findMany: mocks.assetFindMany,
      updateMany: mocks.assetUpdateMany,
      aggregate: mocks.assetAggregate,
      create: mocks.assetCreate,
    },
    paper: { findMany: mocks.paperFindMany },
    projectLog: { findMany: mocks.projectLogFindMany },
    showcaseAsset: { findMany: mocks.showcaseAssetFindMany },
  },
}))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))

import {
  TEAM_STORAGE_QUOTA_BYTES,
  checkTeamStorageQuota,
  orphanObjectKey,
  resolveAttachmentKeys,
  reclaimAbandonedAssets,
  reconcileOrphanedAssets,
} from '@/lib/uploads/assets'

beforeEach(() => {
  // `resetAllMocks`, not `clearAllMocks`: the latter clears call RECORDS but
  // leaves `mockResolvedValue` implementations in place, so a value stubbed in
  // one test silently leaks into the next. No assertion depends on the leak
  // today; this is the safer default before one does.
  vi.resetAllMocks()
})

describe('resolveAttachmentKeys ownership (SEC-6)', () => {
  it("accepts legacy key URLs only under the caller team's prefix", async () => {
    const map = await resolveAttachmentKeys('team_1', [
      '/api/view?key=log-attachments%2Fteam_1%2Fphoto.png',
    ])
    expect(map?.get('/api/view?key=log-attachments%2Fteam_1%2Fphoto.png')).toBe(
      'log-attachments/team_1/photo.png',
    )
  })

  it("rejects a reference to another team's prefix", async () => {
    expect(
      await resolveAttachmentKeys('team_1', ['/api/view?key=log-attachments%2Fteam_2%2Fx.png']),
    ).toBeNull()
  })

  it('rejects path traversal', async () => {
    expect(
      await resolveAttachmentKeys('team_1', [
        '/api/view?key=log-attachments%2Fteam_1%2F..%2Fteam_2%2Fx.png',
      ]),
    ).toBeNull()
  })

  it('resolves id references through team-scoped ledger rows only', async () => {
    mocks.assetFindMany.mockResolvedValue([{ id: 'asset_1', objectKey: 'log-attachments/team_1/a.png' }])

    const map = await resolveAttachmentKeys('team_1', ['/api/view?id=asset_1'])

    expect(map?.get('/api/view?id=asset_1')).toBe('log-attachments/team_1/a.png')
    expect(mocks.assetFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: 'team_1', status: { not: 'deleted' } }),
      }),
    )
  })

  it("rejects the whole batch when any id is another team's or already deleted", async () => {
    // Two ids requested, the team-scoped query only finds one → null.
    mocks.assetFindMany.mockResolvedValue([{ id: 'asset_1', objectKey: 'log-attachments/team_1/a.png' }])
    expect(
      await resolveAttachmentKeys('team_1', ['/api/view?id=asset_1', '/api/view?id=stolen']),
    ).toBeNull()
  })
})

describe('reclaimAbandonedAssets claim-then-delete', () => {
  const CANDIDATE = { id: 'asset_1', objectKey: 'log-attachments/team_1/a.png', status: 'temporary' }

  it('never deletes an object whose claim is lost (attached in the race window)', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 }) // attach won the race

    const cleaned = await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    expect(cleaned).toBe(0)
    expect(mocks.deleteObject).not.toHaveBeenCalled()
  })

  it('deletes the object only after owning the claim', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    mocks.deleteObject.mockResolvedValue(undefined)

    const cleaned = await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    expect(cleaned).toBe(1)
    // The claim guards on the status we read, so a concurrent attach loses cleanly.
    expect(mocks.assetUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'asset_1', status: 'temporary' } }),
    )
    expect(mocks.deleteObject).toHaveBeenCalledWith('log-attachments/team_1/a.png')
  })

  // REFACTOR2 P1-R12: the terminal write now happens ONLY after the object is
  // confirmed gone. Writing `deleted` first meant a crash before the R2 call
  // left a live object behind a terminal row no later sweep would ever select.
  it('claims into the intermediate `deleting` state, never straight to terminal', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    mocks.deleteObject.mockResolvedValue(undefined)

    await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    const [claim, terminal] = mocks.assetUpdateMany.mock.calls
    expect(claim![0].data).toMatchObject({ status: 'deleting' })
    expect(terminal![0]).toMatchObject({
      where: { id: 'asset_1', status: 'deleting' },
      data: expect.objectContaining({ status: 'deleted' }),
    })
    // Terminal write comes AFTER the object delete.
    expect(mocks.deleteObject.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.assetUpdateMany.mock.invocationCallOrder[1]!,
    )
  })

  it('leaves a failed delete in `deleting` for the lease to retry — never terminal', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    mocks.deleteObject.mockRejectedValue(new Error('r2 down'))

    const cleaned = await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    expect(cleaned).toBe(0)
    // Exactly one write — the claim. Nothing terminalizes an object still there.
    expect(mocks.assetUpdateMany).toHaveBeenCalledTimes(1)
    expect(mocks.assetUpdateMany.mock.calls[0]![0].data).toMatchObject({ status: 'deleting' })
  })

  it('selects stale `deleting` rows so a crashed sweep is recoverable', async () => {
    mocks.assetFindMany.mockResolvedValue([])

    await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10, leaseMs: 60_000 })

    const where = mocks.assetFindMany.mock.calls[0]![0].where as { OR: unknown[] }
    expect(where.OR).toContainEqual({
      status: 'deleting',
      deleteLeaseAt: { lt: expect.any(Date) },
    })
  })

  it('counts attempts so a poison object is visible rather than retried silently', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    mocks.deleteObject.mockResolvedValue(undefined)

    await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    expect(mocks.assetUpdateMany.mock.calls[0]![0].data).toMatchObject({
      deleteAttempts: { increment: 1 },
    })
  })
})

// REFACTOR2 P1-S8 (reconciliation half): deletion now retires the ledger row in
// the same transaction, so new orphans of this shape cannot form. These are the
// ones that formed BEFORE that fix — `attached` with a dead owner is invisible
// to the reclaim sweep and stays charged against the team's quota forever.
describe('reconcileOrphanedAssets', () => {
  const ROWS = [
    { id: 'a1', attachedToType: 'paper', attachedToId: 'paper_live' },
    { id: 'a2', attachedToType: 'paper', attachedToId: 'paper_gone' },
    { id: 'a3', attachedToType: 'project_log', attachedToId: 'log_gone' },
  ]

  it('orphans only the rows whose owner is gone', async () => {
    mocks.assetFindMany.mockResolvedValue(ROWS)
    mocks.paperFindMany.mockResolvedValue([{ id: 'paper_live' }])
    mocks.projectLogFindMany.mockResolvedValue([])
    mocks.assetUpdateMany.mockResolvedValue({ count: 2 })

    expect(await reconcileOrphanedAssets()).toBe(2)
    expect(mocks.assetUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a2', 'a3'] }, status: 'attached' },
      data: { status: 'orphaned' },
    })
  })

  it('writes nothing when every owner is alive', async () => {
    mocks.assetFindMany.mockResolvedValue([ROWS[0]])
    mocks.paperFindMany.mockResolvedValue([{ id: 'paper_live' }])

    expect(await reconcileOrphanedAssets()).toBe(0)
    expect(mocks.assetUpdateMany).not.toHaveBeenCalled()
  })

  // Guessing here would mean deleting assets whose owner we simply cannot see.
  it('leaves an UNRECOGNISED attach type alone rather than assuming it is dead', async () => {
    mocks.assetFindMany.mockResolvedValue([
      { id: 'a9', attachedToType: 'something_new', attachedToId: 'x' },
    ])

    expect(await reconcileOrphanedAssets()).toBe(0)
    expect(mocks.assetUpdateMany).not.toHaveBeenCalled()
  })

  it('guards the write on `attached` so a concurrent re-attach is not undone', async () => {
    mocks.assetFindMany.mockResolvedValue([ROWS[1]])
    mocks.paperFindMany.mockResolvedValue([])
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 })

    expect(await reconcileOrphanedAssets()).toBe(0)
    expect(mocks.assetUpdateMany.mock.calls[0]![0].where).toMatchObject({ status: 'attached' })
  })
})

describe('team storage quota (v0.28.0)', () => {
  it('allows an upload landing exactly AT the quota (<= boundary)', async () => {
    mocks.assetAggregate.mockResolvedValue({ _sum: { sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 100 } })
    expect(await checkTeamStorageQuota('team_1', 100)).toBeNull()
  })

  it('rejects one byte over the quota with a {used, quota} snapshot', async () => {
    mocks.assetAggregate.mockResolvedValue({ _sum: { sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 100 } })
    expect(await checkTeamStorageQuota('team_1', 101)).toEqual({
      used: TEAM_STORAGE_QUOTA_BYTES - 100,
      quota: TEAM_STORAGE_QUOTA_BYTES,
    })
  })

  it('treats a team with no ledger rows (null sum) as 0 bytes used', async () => {
    mocks.assetAggregate.mockResolvedValue({ _sum: { sizeBytes: null } })
    expect(await checkTeamStorageQuota('team_1', 1)).toBeNull()
  })

  it('counts everything except physically-deleted rows', async () => {
    // Counting `deleted` rows would lock a team out of storage it no longer
    // uses; excluding `orphaned`/`temporary` would unbound the R2 bill while
    // the sweep drains. Only `deleted` is out of the sum.
    mocks.assetAggregate.mockResolvedValue({ _sum: { sizeBytes: 0 } })
    await checkTeamStorageQuota('team_1', 1)
    expect(mocks.assetAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team_1', status: { not: 'deleted' } },
      }),
    )
  })
})

// The old direct-creation helpers (recordAttachedAsset / recordTemporaryAsset)
// were replaced by the reservation-first lifecycle (A5): every upload path now
// starts with `reserveUploadAsset` (atomic quota + `temporary` row BEFORE the
// R2 put) and flips to `attached` inside the domain commit via
// `attachAssetsByKey`. That contract is covered in
// test/upload-reservation.test.ts.

describe('orphanObjectKey (single-physical-delete-site invariant)', () => {
  it('flips a live ledger row and does NOT create a duplicate', async () => {
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    await orphanObjectKey({
      teamId: 'team_1', userId: 'u1', objectKey: 'showcase/team_1/x.pdf',
      contentType: 'application/pdf', purpose: 'showcase_board',
    })
    expect(mocks.assetUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teamId: 'team_1', objectKey: 'showcase/team_1/x.pdf' }),
        data: { status: 'orphaned' },
      }),
    )
    expect(mocks.assetCreate).not.toHaveBeenCalled()
  })

  it('adopts a legacy object (no ledger row) as an already-orphaned row', async () => {
    // Pre-ledger showcase objects have no row; a plain updateMany would no-op
    // and the object would leak forever. Adoption hands it to the sweep.
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 })
    mocks.assetCreate.mockResolvedValue({ id: 'a1' })
    await orphanObjectKey({
      teamId: 'team_1', userId: 'u1', objectKey: 'showcase/team_1/legacy.pdf',
      contentType: 'application/pdf', purpose: 'showcase_board',
    })
    expect(mocks.assetCreate.mock.calls[0][0].data).toMatchObject({
      teamId: 'team_1',
      objectKey: 'showcase/team_1/legacy.pdf',
      status: 'orphaned',
    })
  })

  it('swallows a lost adoption race — a VERIFIED Prisma P2002 only (A5)', async () => {
    const { Prisma } = await import('@prisma/client')
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 })
    mocks.assetCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    )
    await expect(
      orphanObjectKey({
        teamId: 'team_1', userId: 'u1', objectKey: 'k',
        contentType: 'application/pdf', purpose: 'showcase_board',
      }),
    ).resolves.toBeUndefined()
  })

  it('propagates any OTHER adoption failure — silence would leak the object (A5)', async () => {
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 })
    mocks.assetCreate.mockRejectedValue(new Error('db outage'))
    await expect(
      orphanObjectKey({
        teamId: 'team_1', userId: 'u1', objectKey: 'k',
        contentType: 'application/pdf', purpose: 'showcase_board',
      }),
    ).rejects.toThrow('db outage')
  })

  it('never touches storage directly (the sweep owns physical deletes)', async () => {
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    await orphanObjectKey({
      teamId: 'team_1', userId: 'u1', objectKey: 'k',
      contentType: 'application/pdf', purpose: 'showcase_board',
    })
    expect(mocks.deleteObject).not.toHaveBeenCalled()
  })
})
