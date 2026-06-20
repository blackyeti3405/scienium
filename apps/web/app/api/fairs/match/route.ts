import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { matchFairs } from '@/lib/fairs/match'
import { db } from '@/lib/db'

/**
 * GET /api/fairs/match — the current team's matched fairs (regional, state, ISEF)
 * plus the saved location so the gateway can show/edit it.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { locationZip: true, locationState: true, locationLat: true, locationLng: true },
  })

  const coords: readonly [number, number] | null =
    team?.locationLat != null && team?.locationLng != null
      ? [team.locationLat, team.locationLng]
      : null

  const match = await matchFairs(team?.locationState ?? null, coords)

  return NextResponse.json({
    location: { zip: team?.locationZip ?? null, state: team?.locationState ?? null },
    match,
  })
}
