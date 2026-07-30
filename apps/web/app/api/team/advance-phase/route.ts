import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LAB_TYPE_LABELS, PHASE_INFO } from '@/lib/phase'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import {
  getLiteratureAdvanceProgress,
  isSelfAdvance,
  SELF_ADVANCE_TRANSITIONS,
} from '@/lib/team/advance'
import { classifyLabType } from '@/lib/lab-type/classify'
import { enforceRateLimit } from '@/lib/rate-limit'
import { recordActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

/** A dead advance claim is taken over after this, so a crash cannot wedge a team. */
const ADVANCE_CLAIM_TTL_MS = 2 * 60_000

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
    // Durable (REFACTOR2 P1-R5): the compare-and-set phase bump and its
    // record commit together — no paid call on this path, so one transaction
    // costs nothing.
    await db.$transaction(async (tx) => {
      const { count } = await tx.team.updateMany({
        where: { id: ctx.teamId, phase: ctx.phase },
        // The phase clock is stamped BY the compare-and-set, so only the
        // request that actually moved the team sets it (REFACTOR2 P2-S14).
        data: { phase: toPhase, phaseEnteredAt: new Date() },
      })
      if (count > 0) {
        await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'phase_advanced', {
          fromPhase: ctx.phase,
          toPhase,
        })
      }
    })
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

  // ── Claim the advance BEFORE paying (REFACTOR2 P1-R2) ─────────────────────
  // The claim is predicated on the phase too, so it doubles as the "still in
  // literature_review" check: two concurrent clicks can no longer both pay.
  // A stale claim is taken over so a crashed request cannot wedge the team.
  const claimStamp = new Date()
  const claim = await db.team.updateMany({
    where: {
      id: ctx.teamId,
      phase: 'literature_review',
      OR: [
        { advanceClaimedAt: null },
        { advanceClaimedAt: { lt: new Date(claimStamp.getTime() - ADVANCE_CLAIM_TTL_MS) } },
      ],
    },
    data: { advanceClaimedAt: claimStamp },
  })
  if (claim.count !== 1) {
    return NextResponse.json(
      { error: 'Your lab is already advancing — give it a moment.' },
      { status: 409 },
    )
  }
  /** Hand the slot back so a failure does not hold the team for the full TTL. */
  const releaseClaim = () =>
    db.team
      .updateMany({ where: { id: ctx.teamId, advanceClaimedAt: claimStamp }, data: { advanceClaimedAt: null } })
      .catch(() => {})

  let labType: Awaited<ReturnType<typeof classifyLabType>>['labType']
  let rationale: string
  try {
    ;({ labType, rationale } = await classifyLabType(researchIdea))
  } catch (err) {
    await releaseClaim()
    throw err
  }

  // COMPARE-AND-SET, not an unconditional write. The paid call above takes
  // seconds; without the `phase` predicate a response arriving after another
  // transition would stamp `research_planning` over whatever the team had moved
  // on to — a later result rolling the lab BACKWARDS through the arc.
  //
  // The classify call already happened above — this transaction opens only
  // now, so it never holds a DB transaction across the paid Anthropic call
  // (REFACTOR2 P1-R5). The write and its durable record commit together.
  const advanced = await db.$transaction(async (tx) => {
    const result = await tx.team.updateMany({
      where: { id: ctx.teamId, phase: 'literature_review' },
      data: {
        phase: 'research_planning',
        // Same rule on the paid path: the CAS is the one place a phase change
        // is real, so it is the one place the clock is set (P2-S14).
        phaseEnteredAt: new Date(),
        labType,
        researchIdea,
        advanceClaimedAt: null,
      },
    })
    if (result.count === 1) {
      await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'phase_advanced', {
        fromPhase: 'literature_review',
        toPhase: 'research_planning',
        labType: LAB_TYPE_LABELS[labType],
        researchIdea,
      })
    }
    return result
  })
  if (advanced.count !== 1) {
    // Someone else advanced while we were classifying. Report where the team
    // actually is rather than dragging it back.
    await releaseClaim()
    const fresh = await db.team.findUnique({
      where: { id: ctx.teamId },
      select: { phase: true, labType: true },
    })
    return NextResponse.json({
      phase: fresh?.phase ?? 'research_planning',
      labType: fresh?.labType ?? null,
      labTypeLabel: fresh?.labType ? LAB_TYPE_LABELS[fresh.labType] : null,
      alreadyAdvanced: true,
    })
  }

  return NextResponse.json({
    phase: 'research_planning',
    labType,
    labTypeLabel: LAB_TYPE_LABELS[labType],
    rationale,
    progress,
  })
}
