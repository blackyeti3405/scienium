import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `app/api/cron/papers/route.ts` — zero tests before this file (audit §3), and
 * it is the one job in the system that runs unattended across EVERY team.
 *
 * The load-bearing line is the terminalize transaction's second write:
 *
 *   tx.paper.updateMany({ where: { id: { in: ids }, processingJob: { terminalAt: now } } })
 *
 * `ids` is a snapshot taken before the transaction. The `processingJob:
 * { terminalAt: now }` join filter is the only thing narrowing that list to the
 * papers THIS transaction actually terminalized. Drop it — the shape a cleanup
 * refactor produces, because it reads like a redundant re-filter of `ids` — and
 * every paper in the batch flips to `status: 'error'` regardless of whose team
 * it belongs to or whether a worker legitimately re-claimed it in the interim.
 * Silent, batch-sized, cross-team data loss.
 *
 * The DB fake is a dumb row store driven by the REAL `where` clauses, including
 * the relational one, so the filter is exercised rather than restated.
 */

interface JobRow {
  paperId: string
  status: string
  attempts: number
  claimedAt: Date | null
  nextRunAt: Date | null
  terminalAt: Date | null
  lastError: string | null
  createdAt: Date
}

interface PaperRow {
  id: string
  teamId: string
  status: string
}

let jobs: JobRow[]
let papers: PaperRow[]
/** Papers with no `Citation` row — the maintenance sweep's input. */
let uncited: Array<{ id: string; teamId: string; title: string; authors: string[]; fileUrl: string | null }>
let processed: string[]
/**
 * Fired ONCE, immediately after the route's first `findMany` returns — i.e.
 * after the stuck-job snapshot is taken and before the transaction writes.
 * That window is the whole point: `ids` is already fixed, and the write has to
 * narrow it again on its own.
 */
let interleave: (() => void) | null

const mocks = vi.hoisted(() => ({
  assertCron: vi.fn(),
  processPaperJob: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/cron/auth', () => ({ assertCron: mocks.assertCron }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn(), requestIdFrom: () => 'r' }))
vi.mock('@/lib/uploads/assets', () => ({
  reclaimAbandonedAssets: async () => 0,
  reconcileOrphanedAssets: async () => 0,
}))
vi.mock('@/lib/literature/process-paper', () => ({ processPaperJob: mocks.processPaperJob }))

/** Scalar/relational `where` matcher, driven by whatever the route passes. */
function matchJob(job: JobRow, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    if (field === 'OR') {
      if (!(cond as any[]).some((c) => matchJob(job, c))) return false
      continue
    }
    const actual = (job as any)[field]
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as any
      if (c.in !== undefined && !c.in.includes(actual)) return false
      if (c.lt !== undefined && !(actual !== null && actual < c.lt)) return false
      if (c.lte !== undefined && !(actual !== null && actual <= c.lte)) return false
      if (c.gte !== undefined && !(actual !== null && actual >= c.gte)) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

/** Paper `where`, including the `processingJob: {...}` relational filter. */
function matchPaper(paper: PaperRow, where: any): boolean {
  for (const [field, cond] of Object.entries(where ?? {})) {
    if (field === 'processingJob') {
      const job = jobs.find((j) => j.paperId === paper.id)
      if (!job || !matchJob(job, cond)) return false
      continue
    }
    const actual = (paper as any)[field]
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      if ((cond as any).in !== undefined && !(cond as any).in.includes(actual)) return false
      continue
    }
    if (actual !== cond) return false
  }
  return true
}

function apply(row: Record<string, unknown>, data: any): void {
  for (const [k, v] of Object.entries(data ?? {})) row[k] = v
}

vi.mock('@/lib/db', () => {
  const db = {
    paperProcessingJob: {
      findMany: async ({ where, take }: any) => {
        const hits = jobs.filter((j) => matchJob(j, where))
        hits.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        const out = (take ? hits.slice(0, take) : hits).map((j) => ({ ...j }))
        const fire = interleave
        interleave = null
        fire?.()
        return out
      },
      updateMany: async ({ where, data }: any) => {
        const hits = jobs.filter((j) => matchJob(j, where))
        for (const j of hits) apply(j as unknown as Record<string, unknown>, data)
        return { count: hits.length }
      },
    },
    paper: {
      updateMany: async ({ where, data }: any) => {
        const hits = papers.filter((p) => matchPaper(p, where))
        for (const p of hits) apply(p as unknown as Record<string, unknown>, data)
        return { count: hits.length }
      },
      // The citation backfill's input, kept as its own list: the `citation: null`
      // predicate and the row it builds are owned by
      // `lib/literature/citation-backfill.test.ts`. What this file owns is the
      // WIRING — the sweep runs inside `isolate()`, so before these two members
      // existed it threw on this fake db, was swallowed, and reported 0 forever.
      findMany: async () => uncited.map((p) => ({ ...p })),
    },
    citation: { createMany: async ({ data }: any) => ({ count: data.length }) },
    $transaction: async (fn: any) => fn(db),
  }
  return { db }
})

const { GET } = await import('@/app/api/cron/papers/route')

const MINUTE = 60_000
const ago = (ms: number) => new Date(Date.now() - ms)

function job(paperId: string, overrides: Partial<JobRow> = {}): JobRow {
  return {
    paperId,
    status: 'pending',
    attempts: 0,
    claimedAt: null,
    nextRunAt: null,
    terminalAt: null,
    lastError: null,
    createdAt: new Date(),
    ...overrides,
  }
}

/** A job whose FINAL attempt crashed: stale `running` claim, attempts exhausted. */
const stuckJob = (paperId: string) =>
  job(paperId, { status: 'running', claimedAt: ago(10 * MINUTE), attempts: 3 })

const cronReq = () => new NextRequest('http://app.example.com/api/cron/papers')

beforeEach(() => {
  vi.clearAllMocks()
  jobs = []
  papers = []
  uncited = []
  processed = []
  interleave = null
  mocks.assertCron.mockReturnValue(null)
  mocks.processPaperJob.mockImplementation(async (paperId: string) => {
    processed.push(paperId)
  })
})

describe('the cron guard comes first', () => {
  it('a denied request touches no job at all', async () => {
    mocks.assertCron.mockReturnValue(new Response('nope', { status: 401 }))
    jobs = [job('p1')]

    const res = await GET(cronReq())

    expect(res.status).toBe(401)
    expect(processed).toEqual([])
  })
})

describe('terminalizing a job whose final attempt crashed', () => {
  it('marks the job failed and its paper errored', async () => {
    jobs = [stuckJob('p1')]
    papers = [{ id: 'p1', teamId: 'team_1', status: 'processing' }]

    const body = await (await GET(cronReq())).json()

    expect(body.terminalized).toBe(1)
    expect(jobs[0]!.status).toBe('failed')
    expect(jobs[0]!.terminalAt).not.toBeNull()
    expect(papers[0]!.status).toBe('error')
  })

  it('does NOT touch a paper whose job this transaction did not terminalize', async () => {
    // THE ATTACK. Two teams' papers in one batch. `p2`'s job was re-claimed
    // between the snapshot and the write (fresh `claimedAt`), so the job
    // `updateMany`'s re-asserted predicate skips it — and the paper write must
    // skip it too. Without the `processingJob: { terminalAt: now }` join filter
    // it is inside `ids`, so another team's paper flips to `error` and a
    // student loses a paper that was processing perfectly well.
    jobs = [stuckJob('p1'), stuckJob('p2')]
    papers = [
      { id: 'p1', teamId: 'team_1', status: 'processing' },
      { id: 'p2', teamId: 'team_2', status: 'processing' },
    ]
    // A worker re-claims p2's job in the window between the snapshot and the
    // write. `ids` already contains p2 — only the write's own predicates can
    // still keep it out.
    interleave = () => {
      jobs[1]!.claimedAt = new Date()
    }

    const body = await (await GET(cronReq())).json()

    expect(body.terminalized).toBe(1)
    expect(papers[0]!.status).toBe('error') // ours
    expect(papers[1]!.status).toBe('processing') // the other team's, untouched
    expect(jobs[1]!.status).toBe('running')
  })

  it('leaves a stale claim that still has attempts left for the retry lane', async () => {
    jobs = [job('p1', { status: 'running', claimedAt: ago(10 * MINUTE), attempts: 1 })]
    papers = [{ id: 'p1', teamId: 'team_1', status: 'processing' }]

    const body = await (await GET(cronReq())).json()

    expect(body.terminalized).toBe(0)
    expect(papers[0]!.status).toBe('processing')
    expect(processed).toEqual(['p1']) // re-claimable, so it is retried instead
  })

  it('leaves a FRESH running claim alone even with attempts exhausted', async () => {
    jobs = [job('p1', { status: 'running', claimedAt: ago(MINUTE), attempts: 3 })]
    papers = [{ id: 'p1', teamId: 'team_1', status: 'processing' }]

    const body = await (await GET(cronReq())).json()

    expect(body.terminalized).toBe(0)
    expect(papers[0]!.status).toBe('processing')
    expect(processed).toEqual([])
  })
})

describe('the 3-way job-selection OR', () => {
  it('takes pending jobs, backoff-elapsed failures, and stale running claims', async () => {
    jobs = [
      job('pending', { createdAt: ago(5 * MINUTE) }),
      job('failed-due', { status: 'failed', attempts: 1, nextRunAt: ago(MINUTE), createdAt: ago(4 * MINUTE) }),
      job('failed-no-backoff', { status: 'failed', attempts: 1, nextRunAt: null, createdAt: ago(3 * MINUTE) }),
      job('stale-running', { status: 'running', attempts: 1, claimedAt: ago(10 * MINUTE), createdAt: ago(2 * MINUTE) }),
    ]

    const body = await (await GET(cronReq())).json()

    expect(body.processed).toBe(4)
    // Oldest first — a classroom's backlog drains in upload order.
    expect(processed).toEqual(['pending', 'failed-due', 'failed-no-backoff', 'stale-running'])
  })

  it('respects a backoff window that has not elapsed', async () => {
    jobs = [job('later', { status: 'failed', attempts: 1, nextRunAt: new Date(Date.now() + MINUTE) })]

    expect((await (await GET(cronReq())).json()).processed).toBe(0)
    expect(processed).toEqual([])
  })

  it('never re-runs a job that has used all 3 attempts', async () => {
    jobs = [job('spent', { status: 'failed', attempts: 3, nextRunAt: null })]

    expect((await (await GET(cronReq())).json()).processed).toBe(0)
    expect(processed).toEqual([])
  })

  it('caps the batch at 30 so one invocation cannot be swamped', async () => {
    jobs = Array.from({ length: 45 }, (_, i) => job(`p${i}`, { createdAt: ago(45 * MINUTE - i) }))

    expect((await (await GET(cronReq())).json()).processed).toBe(30)
    expect(processed).toHaveLength(30)
  })
})

describe('the maintenance sweeps the cron also carries', () => {
  it('reports the citation backfill instead of swallowing it', async () => {
    // `isolate()` turns any throw into a `catalogFailures` bump and a 0, so a
    // backfill that is broken — or silently unwired — looks identical to one
    // with nothing to do. The count has to come back on the response.
    uncited = [
      { id: 'legacy_1', teamId: 'team_1', title: 'An Older Upload', authors: [], fileUrl: null },
    ]

    const body = await (await GET(cronReq())).json()

    expect(body.citationsBackfilled).toBe(1)
  })

  it('reports 0, not a failure, when there is nothing to backfill', async () => {
    const body = await (await GET(cronReq())).json()

    expect(body.citationsBackfilled).toBe(0)
  })

  // The other two sweeps (`ensureFairsSeeded`, `ensureFormsSeeded`) still throw
  // against this fake db and are still swallowed by `isolate` — deliberately not
  // stubbed, because that is what proves the isolation: the paper-job results
  // above are reported whatever the catalog does. `catalogFailures` itself is
  // NOT assertable here: it goes to the log line only, never to the response.
})
