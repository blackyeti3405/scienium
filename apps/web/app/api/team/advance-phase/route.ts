import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getLiteratureAdvanceProgress } from '@/lib/team/advance'
import { db } from '@/lib/db'

/**
 * POST /api/team/advance-phase — runs the phase gate and, if satisfied, bumps the
 * team's phase (Feature 1e). Today only the literature_review → research_planning
 * gate is implemented: 25 sources uploaded AND every member proficient on all of
 * them. The gate is recomputed server-side here so the client can't skip it.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  if (ctx.phase !== 'literature_review') {
    return NextResponse.json(
      { error: `No phase gate is defined for "${ctx.phase}" yet` },
      { status: 400 },
    )
  }

  const progress = await getLiteratureAdvanceProgress(ctx.teamId, ctx.phase)
  if (!progress.canAdvance || !progress.toPhase) {
    return NextResponse.json(
      { error: 'Your lab is not ready to advance yet', progress },
      { status: 409 },
    )
  }

  await db.team.update({ where: { id: ctx.teamId }, data: { phase: progress.toPhase } })

  return NextResponse.json({ phase: progress.toPhase, progress })
}
