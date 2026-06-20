import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { describeActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

/** GET /api/team/activity — last 60 team activity entries with actor name. */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

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
