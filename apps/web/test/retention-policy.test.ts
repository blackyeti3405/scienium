import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R9 — age-based retention.
 *
 * The point of the split between `lib/retention/policies.ts` (mechanism) and the
 * `retention_policies` table (numbers) is that the table SHIPS EMPTY and the
 * fail-safe direction is KEEP. These tests pin exactly that: a model nobody has
 * reviewed is never pruned, the one endorsed default is, and a policy row can
 * both turn a model on and park it explicitly at "reviewed, do not prune".
 *
 * The failure this guards against is a retention pass that quietly deletes
 * student work because a default looked reasonable to whoever wrote the code.
 * Only a number a qualified person put in the table may delete anything beyond
 * the single endorsed case.
 */

interface Row {
  id: string
  ts: Date
}

/** Rows per model key, keyed by the table each prunable model reads. */
let tables: Record<string, Row[]>
/** What `retention_policies` currently holds. */
let policies: { key: string; retainDays: number | null }[]

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))

/** A delegate over one in-memory table, honouring `{ lt }` on any date column. */
function delegate(name: string) {
  return {
    async findMany(a: { where: Record<string, { lt: Date }>; take: number }) {
      const [, bound] = Object.entries(a.where)[0]!
      return (tables[name] ?? [])
        .filter((r) => r.ts < bound.lt)
        .slice(0, a.take)
        .map((r) => ({ id: r.id }))
    },
    async deleteMany(a: { where: { id: { in: string[] } } }) {
      const before = (tables[name] ?? []).length
      tables[name] = (tables[name] ?? []).filter((r) => !a.where.id.in.includes(r.id))
      return { count: before - tables[name].length }
    },
  }
}

vi.mock('@/lib/db', () => ({
  db: {
    retentionPolicy: { findMany: async () => policies },
    showcaseView: delegate('showcaseView'),
    activityFeed: delegate('activityFeed'),
    notification: delegate('notification'),
    notificationEmail: delegate('notificationEmail'),
    paperChatMessage: delegate('paperChatMessage'),
    vegaStudyMessage: delegate('vegaStudyMessage'),
    aiOperation: delegate('aiOperation'),
    aiUsage: delegate('aiUsage'),
    teacherFeedback: delegate('teacherFeedback'),
  },
}))

const { PRUNABLE_MODELS, effectiveRetention, runRetentionPrune } = await import(
  '@/lib/retention/policies'
)

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

beforeEach(() => {
  policies = []
  tables = {}
  // Every prunable model gets one ancient row and one fresh one.
  for (const m of PRUNABLE_MODELS) {
    const table = m.key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    tables[table] = [
      { id: `${m.key}-old`, ts: daysAgo(400) },
      { id: `${m.key}-new`, ts: daysAgo(1) },
    ]
  }
})

describe('retention registry', () => {
  it('ships exactly one default — everything else is unreviewed', () => {
    const withDefaults = PRUNABLE_MODELS.filter((m) => m.defaultRetainDays !== null)
    expect(withDefaults.map((m) => m.key)).toEqual(['showcase_view'])
    expect(withDefaults[0]!.defaultRetainDays).toBe(90)
  })

  it('prunes only the endorsed model when the policy table is empty', async () => {
    const pruned = await runRetentionPrune(100)

    expect(pruned).toEqual({ showcase_view: 1 })
    expect(tables.showcaseView!.map((r) => r.id)).toEqual(['showcase_view-new'])
    // Every unreviewed model keeps BOTH rows — including the 400-day-old one.
    expect(tables.activityFeed).toHaveLength(2)
    expect(tables.paperChatMessage).toHaveLength(2)
    expect(tables.teacherFeedback).toHaveLength(2)
  })

  it('a policy row turns an unreviewed model on', async () => {
    policies = [{ key: 'activity_feed', retainDays: 30 }]

    const pruned = await runRetentionPrune(100)

    expect(pruned.activity_feed).toBe(1)
    expect(tables.activityFeed!.map((r) => r.id)).toEqual(['activity_feed-new'])
  })

  it('a null policy row parks a model that has a default — reviewed, keep', async () => {
    policies = [{ key: 'showcase_view', retainDays: null }]

    const pruned = await runRetentionPrune(100)

    expect(pruned.showcase_view).toBeUndefined()
    expect(tables.showcaseView).toHaveLength(2)
    expect((await effectiveRetention()).get('showcase_view')).toBeNull()
  })

  it('bounds each model to one page per run', async () => {
    tables.showcaseView = Array.from({ length: 25 }, (_, i) => ({
      id: `v${i}`,
      ts: daysAgo(400),
    }))

    expect(await runRetentionPrune(10)).toEqual({ showcase_view: 10 })
    expect(tables.showcaseView).toHaveLength(15)
  })

  it('one model failing does not stop the rest', async () => {
    policies = [
      { key: 'activity_feed', retainDays: 30 },
      { key: 'notification', retainDays: 30 },
    ]
    const activity = PRUNABLE_MODELS.find((m) => m.key === 'activity_feed')!
    const original = activity.prune
    activity.prune = async () => {
      throw new Error('table locked')
    }
    try {
      const pruned = await runRetentionPrune(100)
      expect(pruned.activity_feed).toBeUndefined()
      expect(pruned.notification).toBe(1)
      expect(pruned.showcase_view).toBe(1)
    } finally {
      activity.prune = original
    }
  })
})
