import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { matchFairs } from '@/lib/fairs/match'
import { db } from '@/lib/db'

/**
 * GET /api/fairs/match — the current team's matched fairs (regional, state, ISEF)
 * plus the saved location so the gateway can show/edit it.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

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
