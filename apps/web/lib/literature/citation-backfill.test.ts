import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `lib/literature/citation-backfill.ts` — new in v0.75.x with zero tests
 * (test-audit-after §3, ranked #2).
 *
 * `cron/papers` calls it inside `isolate()`, which swallows every throw into a
 * `catalogFailures` counter. So a backfill that throws on the first legacy row
 * is silent in production AND green in `cron-papers.test.ts` — the module has to
 * be exercised directly or not at all.
 *
 * The `where` clause is the load-bearing part: `{ citation: null }` is what makes
 * the sweep burn DOWN. Without it every run re-reads the same 500 oldest papers,
 * `skipDuplicates` throws all of them away, and the arrears never moves while the
 * cron reports success. The fake `findMany` therefore honours the real predicate
 * against rows that actually have (or lack) a citation.
 */

vi.mock('server-only', () => ({}))

interface PaperRow {
  id: string
  teamId: string
  title: string
  authors: string[]
  fileUrl: string | null
  citation: { id: string } | null
  createdAt: Date
}

let papers: PaperRow[]
let queries: Array<{ where: any; take?: number; orderBy?: any }>
let written: Array<Record<string, any>>
/** Rows the DB claims to have inserted — below `data.length` when it skips dupes. */
let insertedCount: number | null

vi.mock('@/lib/db', () => ({
  db: {
    paper: {
      findMany: async (args: any) => {
        queries.push(args)
        const hits = papers.filter((p) => {
          for (const [field, cond] of Object.entries(args.where ?? {})) {
            if (cond === null) {
              if ((p as any)[field] !== null) return false
              continue
            }
            if ((p as any)[field] !== cond) return false
          }
          return true
        })
        hits.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        return (args.take ? hits.slice(0, args.take) : hits).map((p) => ({ ...p }))
      },
    },
    citation: {
      createMany: async (args: any) => {
        written.push(...args.data)
        return { count: insertedCount ?? args.data.length }
      },
    },
  },
}))

const { backfillMissingCitations } = await import('./citation-backfill')

function paper(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: 'paper_1',
    teamId: 'team_1',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer'],
    fileUrl: 'https://cdn.test/p1.pdf',
    citation: null,
    createdAt: new Date('2026-01-01'),
    ...over,
  }
}

beforeEach(() => {
  queries = []
  written = []
  insertedCount = null
  papers = []
})

describe('backfillMissingCitations', () => {
  it('writes NOTHING when every paper already has a citation', async () => {
    papers = [paper({ id: 'p1', citation: { id: 'c1' } })]

    expect(await backfillMissingCitations()).toBe(0)
    expect(written).toEqual([])
  })

  it('THE ATTACK: it only ever touches papers that lack one', async () => {
    // Drop `{ citation: null }` from the query and this returns both — the sweep
    // then re-reads the same page every run, inserts nothing new past
    // `skipDuplicates`, and never reaches the papers that actually need a row.
    papers = [
      paper({ id: 'has', citation: { id: 'c1' } }),
      paper({ id: 'lacks', teamId: 'team_2' }),
    ]

    const count = await backfillMissingCitations()

    expect(written.map((c) => c.paperId)).toEqual(['lacks'])
    expect(count).toBe(1)
  })

  it('carries the paper’s OWN teamId onto its citation', async () => {
    papers = [paper({ id: 'a', teamId: 'team_a' }), paper({ id: 'b', teamId: 'team_b' })]

    await backfillMissingCitations()

    // Citations are team-scoped rows; a shared/first-row teamId would file one
    // team's source into another team's works-cited list.
    expect(written.map((c) => [c.paperId, c.teamId])).toEqual([
      ['a', 'team_a'],
      ['b', 'team_b'],
    ])
  })

  it('formats all three styles locally, with a null year for an upload', async () => {
    papers = [paper({ id: 'p1' })]

    await backfillMissingCitations()

    // Real `buildCitations` — no LLM, no network. An upload has no published
    // date, so the year is null rather than "now", which would date every
    // legacy paper to the day the cron happened to run.
    expect(written[0]).toMatchObject({ paperId: 'p1', year: null })
    expect(written[0]!.apa).toContain('Attention Is All You Need')
    expect(written[0]!.mla).toContain('Attention Is All You Need')
    expect(written[0]!.ieee).toContain('Attention Is All You Need')
  })

  it('survives a legacy row with no authors and no file', async () => {
    // `isolate()` in the cron turns any throw here into a silent counter, so
    // "the sparse row that blows it up" is the failure this module cannot report.
    papers = [paper({ id: 'sparse', title: 'Untitled', authors: [], fileUrl: null })]

    expect(await backfillMissingCitations()).toBe(1)
    expect(written[0]!.apa).toBeTypeOf('string')
  })

  it('reports what the DB WROTE, not what it was handed', async () => {
    // `skipDuplicates` means a concurrent run may have inserted some of these
    // already. The cron logs this number as `citations=`; returning
    // `missing.length` would report work that never happened.
    papers = [paper({ id: 'a' }), paper({ id: 'b' })]
    insertedCount = 1

    expect(await backfillMissingCitations()).toBe(1)
  })

  it('is bounded — one sweep cannot grow with history', async () => {
    papers = Array.from({ length: 20 }, (_, i) =>
      paper({ id: `p${i}`, createdAt: new Date(2026, 0, i + 1) }),
    )

    await backfillMissingCitations()

    // An unbounded read is a 60s serverless function loading the whole paper
    // table. Oldest first, so the arrears drains in order rather than starving.
    expect(queries[0]!.take).toBeLessThanOrEqual(500)
    expect(queries[0]!.orderBy).toEqual({ createdAt: 'asc' })
  })
})
