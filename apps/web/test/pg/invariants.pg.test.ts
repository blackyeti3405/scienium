import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Narrow REAL-Postgres invariant suite (A11). The in-memory route-policy
 * harness proves access policy; it deliberately cannot prove database
 * behavior — constraints, rollback, and conditional-update atomicity under
 * true concurrency. This file covers exactly those, for the invariants the
 * v0.29.4 audit reopened:
 *
 *   - A12: the storage-quota reservation serializes concurrent uploads
 *   - A6:  the daily LC claim's unique key admits exactly one award
 *   - A8:  the retry-generation claim elects exactly one generator
 *   - A13: concurrent showcase views count once per visitor per day
 *
 * Runs against the LOCAL dev database (docker `scienium-postgres`, loaded from
 * apps/web/.env.local) with self-created, self-cleaned fixture rows. When no
 * database is reachable (e.g. unit-test CI), every test here self-skips —
 * the suite is additive, never a hidden dependency.
 */

vi.mock('server-only', () => ({}))

function loadEnvLocal(): void {
  if (process.env.DATABASE_URL) return
  try {
    const raw = readFileSync(join(__dirname, '..', '..', '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?\s*$/)
      if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!
    }
  } catch {
    /* no .env.local — the ping below decides */
  }
}

loadEnvLocal()

async function pingDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  try {
    const { PrismaClient } = await import('@prisma/client')
    const probe = new PrismaClient()
    try {
      await Promise.race([
        probe.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ])
      return true
    } finally {
      await probe.$disconnect().catch(() => {})
    }
  } catch {
    return false
  }
}

const dbUp = await pingDatabase()
const describePg = describe.skipIf(!dbUp)

// Loaded lazily so an unreachable-DB run never imports app modules at all.
type Db = typeof import('@/lib/db')['db']
let db: Db
let reserveUploadAsset: typeof import('@/lib/uploads/assets')['reserveUploadAsset']
let TEAM_STORAGE_QUOTA_BYTES: number
let awardDailyLabCredit: typeof import('@/lib/economy/lab-credit')['awardDailyLabCredit']
let recordShowcaseView: typeof import('@/lib/showcase-server')['recordShowcaseView']

const ns = `pgtest_${randomUUID().slice(0, 8)}`
let userId: string
let teamId: string

beforeAll(async () => {
  if (!dbUp) return
  ;({ db } = await import('@/lib/db'))
  ;({ reserveUploadAsset, TEAM_STORAGE_QUOTA_BYTES } = await import('@/lib/uploads/assets'))
  ;({ awardDailyLabCredit } = await import('@/lib/economy/lab-credit'))
  ;({ recordShowcaseView } = await import('@/lib/showcase-server'))

  const user = await db.user.create({
    data: {
      clerkUserId: `clerk_${ns}`,
      name: 'PG Invariant Fixture',
      email: `${ns}@invariants.test`,
      role: 'student',
    },
    select: { id: true },
  })
  userId = user.id
  const team = await db.team.create({
    data: { name: `PG Fixture Lab ${ns}`, teamLeadId: userId },
    select: { id: true },
  })
  teamId = team.id
})

afterAll(async () => {
  if (!dbUp || !db) return
  // Children first, then the fixture principals.
  await db.uploadedAsset.deleteMany({ where: { teamId } }).catch(() => {})
  await db.labCreditClaim.deleteMany({ where: { teamId } }).catch(() => {})
  await db.teamCurrency.deleteMany({ where: { teamId } }).catch(() => {})
  const papers = await db.paper.findMany({ where: { teamId }, select: { id: true } })
  await db.paperQuizSession
    .deleteMany({ where: { paperId: { in: papers.map((p) => p.id) } } })
    .catch(() => {})
  await db.paper.deleteMany({ where: { teamId } }).catch(() => {})
  const showcase = await db.showcase.findUnique({ where: { teamId }, select: { id: true } })
  if (showcase) {
    await db.showcaseView.deleteMany({ where: { showcaseId: showcase.id } }).catch(() => {})
    await db.showcase.delete({ where: { id: showcase.id } }).catch(() => {})
  }
  await db.team.delete({ where: { id: teamId } }).catch(() => {})
  await db.user.delete({ where: { id: userId } }).catch(() => {})
  await db.$disconnect().catch(() => {})
})

describePg('A12 — storage reservation is atomic under real concurrency', () => {
  it('two concurrent reservations that only fit one admit exactly one', async () => {
    // Fill the quota to within 150 bytes, then race two 100-byte reservations.
    await db.uploadedAsset.create({
      data: {
        teamId,
        userId,
        objectKey: `${ns}/filler`,
        url: '',
        contentType: 'application/octet-stream',
        sizeBytes: TEAM_STORAGE_QUOTA_BYTES - 150,
        purpose: 'pg_test',
        status: 'attached',
      },
    })
    const [a, b] = await Promise.all([
      reserveUploadAsset({
        teamId,
        userId,
        objectKey: `${ns}/a`,
        url: '',
        contentType: 'image/png',
        sizeBytes: 100,
        purpose: 'pg_test',
      }),
      reserveUploadAsset({
        teamId,
        userId,
        objectKey: `${ns}/b`,
        url: '',
        contentType: 'image/png',
        sizeBytes: 100,
        purpose: 'pg_test',
      }),
    ])
    expect([a.ok, b.ok].sort()).toEqual([false, true])
    const held = await db.uploadedAsset.count({ where: { teamId, status: { not: 'deleted' } } })
    expect(held).toBe(2) // the filler + exactly ONE reservation
  })
})

describePg('A6 — the daily LC claim admits exactly one award', () => {
  it('concurrent awards yield one awarded + one already_claimed, LC += 1', async () => {
    const [a, b] = await Promise.all([
      awardDailyLabCredit({ teamId, dbUserId: userId }),
      awardDailyLabCredit({ teamId, dbUserId: userId }),
    ])
    expect([a, b].sort()).toEqual(['already_claimed', 'awarded'])
    const currency = await db.teamCurrency.findUnique({ where: { teamId } })
    expect(currency?.lc).toBe(1)
  })
})

describePg('A8 — the retry-generation claim elects exactly one generator', () => {
  it('two concurrent conditional claims: one count=1, one count=0', async () => {
    const paper = await db.paper.create({
      data: { teamId, title: 'PG fixture paper', authors: [], sourceType: 'pdf', uploadedByUserId: userId },
      select: { id: true },
    })
    const session = await db.paperQuizSession.create({
      data: { paperId: paper.id, userId, questionsJson: [] },
      select: { id: true },
    })
    const claim = () =>
      db.paperQuizSession.updateMany({
        where: {
          id: session.id,
          OR: [
            { retryGenClaimedAt: null },
            { retryGenClaimedAt: { lt: new Date(Date.now() - 120_000) } },
          ],
        },
        data: { retryGenClaimedAt: new Date() },
      })
    const [a, b] = await Promise.all([claim(), claim()])
    expect([a.count, b.count].sort()).toEqual([0, 1])
  })
})

describePg('A13 — concurrent showcase views count once per visitor per day', () => {
  it('three concurrent first visits produce exactly one row', async () => {
    const showcase = await db.showcase.create({
      data: {
        teamId,
        slug: `pg-fixture-${ns}`,
        title: 'PG fixture showcase',
        abstract: 'fixture',
      },
      select: { id: true },
    })
    const fp = `fp_${ns}`
    const results = await Promise.all([
      recordShowcaseView(showcase.id, fp),
      recordShowcaseView(showcase.id, fp),
      recordShowcaseView(showcase.id, fp),
    ])
    expect(results.filter((r) => r === 'counted')).toHaveLength(1)
    const rows = await db.showcaseView.count({
      where: { showcaseId: showcase.id, visitorFingerprint: fp },
    })
    expect(rows).toBe(1)
  })
})
