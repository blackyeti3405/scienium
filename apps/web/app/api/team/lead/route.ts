import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamRoute, RouteError } from '@/lib/api/with-route'
import { db } from '@/lib/db'
import { MembershipError, transferLead } from '@/lib/team/membership'

export const dynamic = 'force-dynamic'

const Body = z.object({ toUserId: z.string().trim().min(1).max(64) })

/**
 * POST /api/team/lead — hand the lead role to another current member
 * (REFACTOR2 P1-R8). Only the current lead may do this; a teacher-initiated
 * reassignment is a different capability and is deliberately not folded in.
 *
 * Moved onto the shared envelope (REFACTOR2 P1-5): this route changes who holds
 * authority over a lab, and it was hand-rolling the standard prelude — so it
 * reported neither its latency nor its outcome, on one of the few routes where
 * that history is worth having.
 */
export const POST = withTeamRoute({ tier: 'mutate', body: Body }, async ({ ctx, data }) => {
  try {
    await db.$transaction((tx) =>
      transferLead(tx, { teamId: ctx.teamId, fromUserId: ctx.dbUserId, toUserId: data.toUserId }),
    )
    return NextResponse.json({ ok: true, teamLeadId: data.toUserId })
  } catch (err) {
    if (err instanceof MembershipError) throw new RouteError(err.message, err.status)
    throw err
  }
})
