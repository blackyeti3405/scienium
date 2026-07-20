import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

/**
 * A5/A12 — the upload reservation primitive and the orphan adoption rule.
 *
 * `reserveUploadAsset` must (a) take the per-team storage lock, (b) re-check
 * the quota INSIDE the transaction, and (c) create the `temporary` ledger row
 * in the same commit — that ordering is what closes the concurrent-overshoot
 * window. `orphanObjectKey` may swallow ONLY a lost P2002 adoption race; a DB
 * outage must propagate or the legacy object leaks forever.
 */

interface AssetRow {
  id: string
  teamId: string
  objectKey: string
  sizeBytes: number
  status: string
}
let assets: AssetRow[]
let idSeq: number
const lockCalls: string[] = []

const tx = {
  // lockAggregate passes one Prisma.sql template — the lock key is its first
  // interpolated value.
  $executeRaw: vi.fn(async (sql: { values?: unknown[] }) => {
    lockCalls.push(String(sql?.values?.[0]))
    return 0
  }),
  uploadedAsset: {
    aggregate: async ({ where }: { where: { teamId: string } }) => ({
      _sum: {
        sizeBytes: assets
          .filter((a) => a.teamId === where.teamId && a.status !== 'deleted')
          .reduce((s, a) => s + a.sizeBytes, 0),
      },
    }),
    create: async ({ data }: { data: Omit<AssetRow, 'id'> }) => {
      const row = { ...data, id: `asset_${idSeq++}` } as AssetRow
      assets.push(row)
      return { id: row.id }
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { teamId?: string; objectKey?: string; status?: { in: string[] } }
      data: { status: string }
    }) => {
      const hits = assets.filter(
        (a) =>
          (where.teamId === undefined || a.teamId === where.teamId) &&
          (where.objectKey === undefined || a.objectKey === where.objectKey) &&
          (where.status === undefined || where.status.in.includes(a.status)),
      )
      for (const h of hits) h.status = data.status
      return { count: hits.length }
    },
  },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/storage', () => ({ deleteObject: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    uploadedAsset: {
      updateMany: (args: never) => tx.uploadedAsset.updateMany(args),
      create: vi.fn(),
    },
  },
}))

import {
  reserveUploadAsset,
  orphanObjectKey,
  TEAM_STORAGE_QUOTA_BYTES,
} from '@/lib/uploads/assets'

const BASE = {
  teamId: 'team_1',
  userId: 'u1',
  url: '',
  contentType: 'image/png',
  purpose: 'project_log_attachment',
}

beforeEach(() => {
  vi.clearAllMocks()
  assets = []
  idSeq = 1
  lockCalls.length = 0
})

describe('reserveUploadAsset (A12 atomic quota)', () => {
  it('reserves under quota: takes the team lock, creates the temporary row', async () => {
    const res = await reserveUploadAsset({ ...BASE, objectKey: 'k1', sizeBytes: 1000 })
    expect(res).toMatchObject({ ok: true, id: 'asset_1' })
    expect(lockCalls).toEqual(['team-storage:team_1'])
    expect(assets[0]).toMatchObject({ objectKey: 'k1', status: 'temporary' })
  })

  it('rejects when the incoming object would exceed the ceiling — no row created', async () => {
    assets.push({
      id: 'a0',
      teamId: 'team_1',
      objectKey: 'existing',
      sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 10,
      status: 'attached',
    })
    const res = await reserveUploadAsset({ ...BASE, objectKey: 'k1', sizeBytes: 100 })
    expect(res).toMatchObject({ ok: false, quota: TEAM_STORAGE_QUOTA_BYTES })
    expect(assets).toHaveLength(1)
  })

  it('deleted rows do not count toward usage; a reservation itself does', async () => {
    assets.push(
      { id: 'a0', teamId: 'team_1', objectKey: 'gone', sizeBytes: TEAM_STORAGE_QUOTA_BYTES, status: 'deleted' },
      { id: 'a1', teamId: 'team_1', objectKey: 'held', sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 50, status: 'temporary' },
    )
    // The `deleted` row is free; the `temporary` reservation still holds bytes.
    const res = await reserveUploadAsset({ ...BASE, objectKey: 'k1', sizeBytes: 100 })
    expect(res.ok).toBe(false)
  })
})

describe('orphanObjectKey adoption (A5)', () => {
  it('swallows ONLY a lost P2002 adoption race', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(db.uploadedAsset.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    await expect(
      orphanObjectKey({ teamId: 'team_1', userId: 'u1', objectKey: 'legacy', contentType: 'application/pdf', purpose: 'showcase_board' }),
    ).resolves.toBeUndefined()
  })

  it('propagates a DB outage instead of silently leaking the legacy object', async () => {
    const { db } = await import('@/lib/db')
    vi.mocked(db.uploadedAsset.create).mockRejectedValueOnce(new Error('db unreachable'))
    await expect(
      orphanObjectKey({ teamId: 'team_1', userId: 'u1', objectKey: 'legacy', contentType: 'application/pdf', purpose: 'showcase_board' }),
    ).rejects.toThrow('db unreachable')
  })

  it('flips an existing live row to orphaned without adopting', async () => {
    assets.push({ id: 'a1', teamId: 'team_1', objectKey: 'live', sizeBytes: 5, status: 'attached' })
    const { db } = await import('@/lib/db')
    await orphanObjectKey({ teamId: 'team_1', userId: 'u1', objectKey: 'live', contentType: 'image/png', purpose: 'x' })
    expect(assets[0]!.status).toBe('orphaned')
    expect(db.uploadedAsset.create).not.toHaveBeenCalled()
  })
})
