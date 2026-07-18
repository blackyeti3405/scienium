import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LAB_TYPE_LABELS, PHASE_INFO, type Phase } from '@/lib/phase'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import {
  getLiteratureAdvanceProgress,
  isSelfAdvance,
  SELF_ADVANCE_TRANSITIONS,
} from '@/lib/team/advance'
import { classifyLabType } from '@/lib/lab-type/classify'
import { enforceRateLimit } from '@/lib/rate-limit'
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
 *
 * research_planning → working and working → showcase:
 *   - Self-paced: a free "Advance" click bumps the phase (no gate, no teacher).
 */
export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  // Self-paced transitions (research_planning → working, working → showcase):
  // the student advances at their own pace — a conditional bump keeps concurrent
  // clicks from skipping a phase.
  if (isSelfAdvance(ctx.phase)) {
    const toPhase = SELF_ADVANCE_TRANSITIONS[ctx.phase]!
    const { count } = await db.team.updateMany({
      where: { id: ctx.teamId, phase: ctx.phase },
      data: { phase: toPhase },
    })
    if (count > 0) {
      logActivity(ctx.teamId, ctx.dbUserId, 'phase_advanced', {
        fromPhase: ctx.phase,
        toPhase,
      }).catch(console.error)
    }
    return NextResponse.json({ phase: toPhase, phaseLabel: PHASE_INFO[toPhase].label })
  }

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
  // user sees their lab type immediately on advance. This is an Anthropic call,
  // so it must clear the paid `ai` tier (fail-closed in production without a
  // shared limiter store) — the route-level `mutate` tier alone doesn't cover
  // paid work. Checked only on this transition; self-advance stays free.
  const aiLimited = await enforceRateLimit(req, 'ai', ctx.userId)
  if (aiLimited) return aiLimited

  const { labType, rationale } = await classifyLabType(researchIdea)

  // Skip lab_selection; jump straight to research_planning with lab type set.
  await db.team.update({
    where: { id: ctx.teamId },
    data: { phase: 'research_planning', labType, researchIdea },
  })

  logActivity(ctx.teamId, ctx.dbUserId, 'phase_advanced', {
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
