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
  },
}))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))

import {
  TEAM_STORAGE_QUOTA_BYTES,
  checkTeamStorageQuota,
  orphanObjectKey,
  recordAttachedAsset,
  recordTemporaryAsset,
  resolveAttachmentKeys,
  reclaimAbandonedAssets,
} from '@/lib/uploads/assets'

beforeEach(() => {
  vi.clearAllMocks()
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

  it('releases the claim when the storage delete fails, so a later sweep retries', async () => {
    mocks.assetFindMany.mockResolvedValue([CANDIDATE])
    mocks.assetUpdateMany.mockResolvedValue({ count: 1 })
    mocks.deleteObject.mockRejectedValue(new Error('r2 down'))

    const cleaned = await reclaimAbandonedAssets({ olderThanMs: 1000, limit: 10 })

    expect(cleaned).toBe(0)
    // Second updateMany call is the release back to the prior status.
    expect(mocks.assetUpdateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'asset_1', status: 'deleted' },
        data: { status: 'temporary', deletedAt: null },
      }),
    )
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

describe('recordAttachedAsset vs recordTemporaryAsset (sweep-safety semantics)', () => {
  // The module's own docstring names the failure mode: an object bound to its
  // domain row in the same request but recorded `temporary` gets DELETED by the
  // sweep a day later — live-data loss. These pins keep the two creators honest.
  it('recordAttachedAsset creates status=attached with attachedAt set', async () => {
    mocks.assetCreate.mockResolvedValue({ id: 'a1' })
    await recordAttachedAsset({
      teamId: 'team_1', userId: 'u1', objectKey: 'k', url: '/f', contentType: 'application/pdf',
      sizeBytes: 10, purpose: 'paper_pdf', attachedToType: 'paper', attachedToId: 'p1',
    })
    const data = mocks.assetCreate.mock.calls[0][0].data
    expect(data.status).toBe('attached')
    expect(data.attachedAt).toBeInstanceOf(Date)
  })

  it('recordTemporaryAsset creates status=temporary (reclaimable if abandoned)', async () => {
    mocks.assetCreate.mockResolvedValue({ id: 'a1' })
    await recordTemporaryAsset({
      teamId: 'team_1', userId: 'u1', objectKey: 'k', url: '/f', contentType: 'image/png',
      sizeBytes: 10, purpose: 'log_attachment',
    })
    expect(mocks.assetCreate.mock.calls[0][0].data.status).toBe('temporary')
  })
})

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

  it('swallows a lost adoption race (unique objectKey) instead of throwing', async () => {
    mocks.assetUpdateMany.mockResolvedValue({ count: 0 })
    mocks.assetCreate.mockRejectedValue(new Error('P2002 unique constraint'))
    await expect(
      orphanObjectKey({
        teamId: 'team_1', userId: 'u1', objectKey: 'k',
        contentType: 'application/pdf', purpose: 'showcase_board',
      }),
    ).resolves.toBeUndefined()
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
