import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { buildCitations, parseYear } from '@/lib/literature/citation'

// ── GET /api/citations (#13) ──────────────────────────────────────────────────
// The team's formatted citations, joined to their papers. Team-scoped `where` is
// the IDOR guard. Backfills citations for legacy uploaded papers (pdf/text) that
// predate this feature — built LOCALLY (no LLM), idempotent (guarded on existence).

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  // Backfill: team papers (any source) with no citation row yet. External papers
  // already get a citation at promote time; this covers pre-existing pdf/text ones.
  const missing = await db.paper.findMany({
    where: { teamId: ctx.teamId, citation: null },
    select: { id: true, title: true, authors: true, fileUrl: true, createdAt: true },
  })
  if (missing.length > 0) {
    await Promise.all(
      missing.map((p) => {
        const built = buildCitations({
          title: p.title,
          authors: p.authors,
          // Uploaded papers have no published date; leave the year null.
          year: parseYear(null),
          url: p.fileUrl ?? null,
        })
        return db.citation
          .create({
            data: {
              paperId: p.id,
              teamId: ctx.teamId,
              year: built.year,
              apa: built.apa,
              mla: built.mla,
              ieee: built.ieee,
            },
          })
          // A concurrent request may have created it first — ignore the dupe.
          .catch(() => undefined)
      }),
    )
  }

  const rows = await db.citation.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      apa: true,
      mla: true,
      ieee: true,
      year: true,
      paper: { select: { id: true, title: true, authors: true, sourceType: true } },
    },
  })

  return NextResponse.json({ citations: rows })
}
