import { NextResponse, type NextRequest } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { selectDueCards } from '@/lib/literature/srs'

/**
 * GET /api/literature/vocab/deck — the CALLING STUDENT's own vocabulary
 * deck. Scoped by BOTH `userId` and `teamId`, so a card can never leak
 * across either boundary (a co-member's deck is invisible; another team's
 * papers/cards are invisible).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'literature' })
  if (error) return error

  const cards = await db.vocabCard.findMany({
    where: { userId: ctx.dbUserId, teamId: ctx.teamId },
    include: { paper: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const now = new Date()
  const shaped = cards.map((c) => ({
    id: c.id,
    term: c.term,
    aliases: c.aliases,
    definition: c.definition,
    source: c.source,
    sourceEntryId: c.sourceEntryId,
    quote: c.quote,
    box: c.box,
    dueAt: c.dueAt,
    termKey: c.termKey,
    paperId: c.paper.id,
    paperTitle: c.paper.title,
  }))

  const due = selectDueCards(shaped, now)

  const byBox: Record<number, number> = {}
  for (const c of shaped) {
    byBox[c.box] = (byBox[c.box] ?? 0) + 1
  }

  return NextResponse.json({
    cards: shaped,
    due,
    counts: {
      total: shaped.length,
      dueToday: due.length,
      byBox,
    },
  })
}
