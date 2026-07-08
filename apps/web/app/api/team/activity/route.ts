import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { describeActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

/** GET /api/team/activity — last 60 team activity entries with actor name. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const entries = await db.activityFeed.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: {
      id: true,
      actionType: true,
      payloadJson: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })

  const feed = entries.map((e) => ({
    id: e.id,
    actor: e.user.name,
    action: e.actionType,
    description: describeActivity(e.actionType, e.payloadJson as Record<string, unknown>),
    createdAt: e.createdAt,
  }))

  return NextResponse.json({ feed })
}
