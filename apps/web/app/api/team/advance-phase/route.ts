import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext, LAB_TYPE_LABELS } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { getLiteratureAdvanceProgress } from '@/lib/team/advance'
import { classifyLabType } from '@/lib/lab-type/classify'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

const AdvanceBody = z
  .object({
    // Required when advancing from literature_review: one-sentence summary of
    // the student's project, used to auto-assign a lab type via Haiku.
    researchIdea: z.string().min(10).max(500).optional(),
  })
  .strict()

/**
 * POST /api/team/advance-phase — runs the phase gate and, if satisfied, bumps
 * the team's phase.
 *
 * literature_review → research_planning:
 *   - Gate: 25 sources uploaded AND every member proficient on all of them
 *   - Requires `researchIdea` in body: one sentence describing the project
 *   - Haiku classifies the idea → auto-assigns `teams.lab_type`
 *   - Skips `lab_selection`; jumps directly to `research_planning`
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (ctx.phase !== 'literature_review') {
    return NextResponse.json(
      { error: `No phase gate is defined for "${ctx.phase}" yet` },
      { status: 400 },
    )
  }

  const { data, error } = await parseJson(req, AdvanceBody)
  if (error) return error

  const researchIdea = data.researchIdea?.trim() ?? ''
  if (!researchIdea) {
    return NextResponse.json(
      { error: 'Describe your research project in one sentence to advance.' },
      { status: 400 },
    )
  }

  const progress = await getLiteratureAdvanceProgress(ctx.teamId, ctx.phase)
  if (!progress.canAdvance) {
    return NextResponse.json(
      { error: 'Your lab is not ready to advance yet', progress },
      { status: 409 },
    )
  }

  // Classify the research idea → assign lab type. Done synchronously so the
  // user sees their lab type immediately on advance.
  const { labType, rationale } = await classifyLabType(researchIdea)

  // Skip lab_selection; jump straight to research_planning with lab type set.
  await db.team.update({
    where: { id: ctx.teamId },
    data: { phase: 'research_planning', labType, researchIdea },
  })

  logActivity(ctx.teamId, dbUser.id, 'phase_advanced', {
    fromPhase: 'literature_review',
    toPhase: 'research_planning',
    labType: LAB_TYPE_LABELS[labType],
    researchIdea,
  }).catch(console.error)

  return NextResponse.json({
    phase: 'research_planning',
    labType,
    labTypeLabel: LAB_TYPE_LABELS[labType],
    rationale,
    progress,
  })
}
