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
  it('a model with no default retains everything, however old', async () => {
    // The MECHANISM, not the placeholder list. This used to assert
    // `withDefaults.map(m => m.key)` deep-equals `['showcase_view']`, which
    // turned "not yet decided" into "asserted correct": HANDOFF lists P1-R9's
    // retention numbers as blocked on qualified FERPA/COPPA input, and
    // `retention_policies` ships EMPTY on purpose. The day real windows are
    // authored, an exact-list pin reads as a regression. What must not change
    // is that a `null` default means KEEP — a 400-day-old row survives a prune.
    const unreviewed = PRUNABLE_MODELS.filter((m) => m.defaultRetainDays === null)
    expect(unreviewed.length, 'no unreviewed models left to check').toBeGreaterThan(0)

    const pruned = await runRetentionPrune(100)

    for (const m of unreviewed) {
      const table = m.key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      expect(pruned[m.key], `${m.key} was pruned with no reviewed window`).toBeUndefined()
      expect(tables[table], `${m.key} lost a row`).toHaveLength(2)
    }
  })

  it('a model WITH a default prunes to that window without any policy row', async () => {
    const withDefaults = PRUNABLE_MODELS.filter((m) => m.defaultRetainDays !== null)
    expect(withDefaults.length, 'no defaulted models left to check').toBeGreaterThan(0)

    const pruned = await runRetentionPrune(100)

    for (const m of withDefaults) {
      const table = m.key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      // The fixture's old row is 400 days back; every authored window is shorter.
      expect(m.defaultRetainDays!).toBeLessThan(400)
      expect(pruned[m.key]).toBe(1)
      expect(tables[table]!.map((r) => r.id)).toEqual([`${m.key}-new`])
    }
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
