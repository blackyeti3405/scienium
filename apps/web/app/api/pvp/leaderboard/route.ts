/**
 * PvP Leaderboard API — GET /api/pvp/leaderboard
 *
 * Returns sorted class trophy rankings scoped to the requesting team's class.
 * Class-only per D-20 (no school/global tabs).
 *
 * Depends on: requireTeamContext (auth + phase gate), PvpTrophies model joined
 * with Team (name, labType).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'

/**
 * GET /api/pvp/leaderboard
 *
 * Returns trophy rankings for all teams in the requesting team's class,
 * ordered by currentTrophies descending.
 *
 * Response shape: { rankings: Array<{ teamId, teamName, labType, trophies }> }
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, {
    tier: 'read',
    feature: 'pvp',
  })
  if (error) return error

  const { teamId } = ctx

  // Get the requesting team's classId
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { classId: true },
  })
  if (!team?.classId) {
    return NextResponse.json({ rankings: [] })
  }

  // Query all PvpTrophies for teams in the same class, ordered descending
  const rankings = await db.pvpTrophies.findMany({
    where: {
      team: { classId: team.classId },
    },
    orderBy: { currentTrophies: 'desc' },
    include: {
      team: {
        select: { name: true, labType: true },
      },
    },
  })

  return NextResponse.json({
    rankings: rankings.map((row) => ({
      teamId: row.teamId,
      teamName: row.team.name,
      labType: row.team.labType,
      trophies: row.currentTrophies,
    })),
  })
}