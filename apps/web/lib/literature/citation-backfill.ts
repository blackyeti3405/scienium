import 'server-only'
import { db } from '@/lib/db'
import { buildCitations, parseYear } from '@/lib/literature/citation'

/** One sweep's ceiling. Bounded so the cron's runtime cannot grow with history. */
const BATCH = 500

/**
 * Give a Citation row to any paper that still lacks one.
 *
 * This is the legacy half of `GET /api/citations` (REFACTOR2 P2-S6): a paper
 * uploaded before PERF-10a — or one whose processing job died between the
 * paper write and the citation write — has no citation, and the read used to
 * mint one on the fly. That made a GET a domain write, so it lives here and
 * runs from the maintenance cron instead.
 *
 * Local computation only (`buildCitations` — no LLM), idempotent
 * (`skipDuplicates` against the unique `paperId`), and bounded to {@link BATCH}
 * per sweep, so a large arrears burns down over several runs rather than
 * blowing one invocation.
 */
export async function backfillMissingCitations(): Promise<number> {
  const missing = await db.paper.findMany({
    where: { citation: null },
    take: BATCH,
    orderBy: { createdAt: 'asc' },
    select: { id: true, teamId: true, title: true, authors: true, fileUrl: true },
  })
  if (missing.length === 0) return 0

  const written = await db.citation.createMany({
    data: missing.map((p) => {
      const built = buildCitations({
        title: p.title,
        authors: p.authors,
        // Uploaded papers have no published date; leave the year null.
        year: parseYear(null),
        url: p.fileUrl ?? null,
      })
      return {
        paperId: p.id,
        teamId: p.teamId,
        year: built.year,
        apa: built.apa,
        mla: built.mla,
        ieee: built.ieee,
      }
    }),
    skipDuplicates: true,
  })
  return written.count
}
