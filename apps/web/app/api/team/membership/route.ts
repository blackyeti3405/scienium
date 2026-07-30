import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { MembershipError, leaveTeam } from '@/lib/team/membership'
import { logActivityBestEffort } from '@/lib/activity/log'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/team/membership — leave your own lab (REFACTOR2 P1-R8).
 *
 * There was no way to leave a team at all before this, which is why stale
 * memberships accumulated. The consequences (lead handover, archive-if-last,
 * clearing `activeTeamId`) all belong to the membership service and commit in
 * one transaction with the departure.
 */
export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  try {
    const result = await leaveTeam(ctx.teamId, ctx.dbUserId)
    logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'member_left', {}).catch(console.error)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MembershipError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
