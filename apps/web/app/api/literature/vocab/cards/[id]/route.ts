import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'

/**
 * DELETE /api/literature/vocab/cards/[id] — the precision escape hatch that
 * replaces an LLM-based filter: the student decides "I already know this
 * one" and removes it from their own deck. Scoped by BOTH `userId` and
 * `teamId` in the delete's WHERE clause, so a 0-count result (another
 * student's card, or a nonexistent id) is indistinguishable from Not Found.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'literature' })
  if (error) return error

  const result = await db.vocabCard.deleteMany({
    where: { id: params.id, userId: ctx.dbUserId, teamId: ctx.teamId },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
