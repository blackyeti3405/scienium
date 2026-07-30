import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

/**
 * A13 — showcase views must match the documented "one view per visitor per
 * day" contract, decided by the `(showcaseId, visitorFingerprint, day)`
 * unique key rather than a raceable read-then-write. The mock store enforces
 * the unique exactly as Postgres would (P2002 on duplicate), with no await
 * between check and insert — the same atomicity a single INSERT has.
 */

interface ViewRow {
  showcaseId: string
  visitorFingerprint: string
  day: Date
}
let views: ViewRow[]

function uniqueKey(r: ViewRow): string {
  return `${r.showcaseId}|${r.visitorFingerprint}|${r.day.toISOString()}`
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    showcaseView: {
      create: async ({ data }: { data: ViewRow }) => {
        if (views.some((v) => uniqueKey(v) === uniqueKey(data))) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          })
        }
        views.push({ ...data })
        return data
      },
    },
  },
}))

import { recordShowcaseView } from '@/lib/showcase-server'

const JULY_19 = new Date('2026-07-19T15:30:00Z')
const JULY_19_LATER = new Date('2026-07-19T22:05:00Z')
const JULY_20 = new Date('2026-07-20T01:00:00Z')

beforeEach(() => {
  views = []
})

describe('recordShowcaseView (A13)', () => {
  it('counts the first visit of the day', async () => {
    await expect(recordShowcaseView('sc1', 'fp1', JULY_19)).resolves.toBe('counted')
    expect(views).toHaveLength(1)
    expect(views[0]!.day.toISOString()).toBe('2026-07-19T00:00:00.000Z')
  })

  it('same visitor, same day → counted once', async () => {
    await recordShowcaseView('sc1', 'fp1', JULY_19)
    await expect(recordShowcaseView('sc1', 'fp1', JULY_19_LATER)).resolves.toBe('already_counted')
    expect(views).toHaveLength(1)
  })

  it('same visitor, NEXT day → counted again (not lifetime dedupe)', async () => {
    await recordShowcaseView('sc1', 'fp1', JULY_19)
    await expect(recordShowcaseView('sc1', 'fp1', JULY_20)).resolves.toBe('counted')
    expect(views).toHaveLength(2)
  })

  it('concurrent first visits count exactly once', async () => {
    const results = await Promise.all([
      recordShowcaseView('sc1', 'fp1', JULY_19),
      recordShowcaseView('sc1', 'fp1', JULY_19),
      recordShowcaseView('sc1', 'fp1', JULY_19),
    ])
    expect(views).toHaveLength(1)
    expect(results.filter((r) => r === 'counted')).toHaveLength(1)
    expect(results.filter((r) => r === 'already_counted')).toHaveLength(2)
  })

  it('different visitors and showcases stay independent', async () => {
    await recordShowcaseView('sc1', 'fp1', JULY_19)
    await expect(recordShowcaseView('sc1', 'fp2', JULY_19)).resolves.toBe('counted')
    await expect(recordShowcaseView('sc2', 'fp1', JULY_19)).resolves.toBe('counted')
    expect(views).toHaveLength(3)
  })

  it('propagates non-duplicate DB failures to the caller', async () => {
    const { db } = await import('@/lib/db')
    vi.spyOn(db.showcaseView, 'create').mockRejectedValueOnce(new Error('connection lost'))
    await expect(recordShowcaseView('sc1', 'fp1', JULY_19)).rejects.toThrow('connection lost')
  })
})
