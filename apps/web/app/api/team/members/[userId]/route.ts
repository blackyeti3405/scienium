import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { MembershipError, removeMember } from '@/lib/team/membership'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/team/members/[userId] — the lead removes a member
 * (REFACTOR2 P1-R8). Removing yourself is refused: leaving has different
 * consequences (archive-if-last, lead handover) and should be chosen
 * deliberately, not reached by accident through the wrong verb.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const { userId } = await props.params
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  try {
    const result = await removeMember(ctx.teamId, ctx.dbUserId, userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MembershipError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
