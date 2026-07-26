import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { MembershipError, transferLead } from '@/lib/team/membership'

export const dynamic = 'force-dynamic'

const Body = z.object({ toUserId: z.string().trim().min(1).max(64) })

/**
 * POST /api/team/lead — hand the lead role to another current member
 * (REFACTOR2 P1-R8). Only the current lead may do this; a teacher-initiated
 * reassignment is a different capability and is deliberately not folded in.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bad } = await parseJson(req, Body)
  if (bad) return bad

  try {
    await db.$transaction((tx) =>
      transferLead(tx, { teamId: ctx.teamId, fromUserId: ctx.dbUserId, toUserId: data.toUserId }),
    )
    return NextResponse.json({ ok: true, teamLeadId: data.toUserId })
  } catch (err) {
    if (err instanceof MembershipError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
