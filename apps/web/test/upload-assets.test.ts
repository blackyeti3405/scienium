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
  deleteObject: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    uploadedAsset: { findMany: mocks.assetFindMany, updateMany: mocks.assetUpdateMany },
  },
}))
vi.mock('@/lib/storage', () => ({ deleteObject: mocks.deleteObject }))

import {
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
