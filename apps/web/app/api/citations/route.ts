import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'

// ── GET /api/citations (#13) ──────────────────────────────────────────────────
// The team's formatted citations, joined to their papers. Team-scoped `where` is
// the IDOR guard. A PURE READ (REFACTOR2 P2-S6): this used to create Citation
// rows for any paper missing one — a domain write on a GET, so a student merely
// opening the tab wrote to the database. Citations are now written where the
// facts arrive: at promote time for discovery sources, and when a paper's
// metadata lands (`lib/literature/process-paper.ts`, PERF-10a). Papers that
// predate those are swept by `backfillMissingCitations` on the maintenance cron
// (`app/api/cron/papers`), not by the next reader.

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

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
