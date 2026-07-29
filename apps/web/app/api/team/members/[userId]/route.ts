import { NextResponse } from 'next/server'
import { withTeamRoute, RouteError } from '@/lib/api/with-route'
import { MembershipError, removeMember } from '@/lib/team/membership'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/team/members/[userId] — the lead removes a member
 * (REFACTOR2 P1-R8). Removing yourself is refused: leaving has different
 * consequences (archive-if-last, lead handover) and should be chosen
 * deliberately, not reached by accident through the wrong verb.
 *
 * On the shared envelope (REFACTOR2 P1-5) for the same reason as the lead
 * handover: ending someone's access to a lab is a risk-bearing command, so its
 * denials and latency belong in the drain alongside the ledger row the
 * membership service writes.
 */
export const DELETE = withTeamRoute({ tier: 'mutate' }, async ({ ctx, params }) => {
  try {
    const result = await removeMember(ctx.teamId, ctx.dbUserId, params.userId!)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof MembershipError) throw new RouteError(err.message, err.status)
    throw err
  }
})
