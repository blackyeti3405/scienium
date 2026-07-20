import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, boundedText } from '@/lib/validation'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'
import { logEvent } from '@/lib/observability/log'
import { paperTextBlock } from '@/lib/literature/grading'
import { extractJson } from '@/lib/literature/quiz'
import { logActivity } from '@/lib/activity/log'
import { lockAggregate } from '@/lib/db-lock'
import {
  EXPLAIN_MAX_CHARS,
  EXPLAIN_PASS_ACCURACY,
  EXPLAIN_PASS_COMPLETENESS,
  EXPLAIN_KP_AWARD,
  ExplainVerdictSchema,
  normalizeVerdict,
  computeExplainOutcome,
  EXPLAIN_INSTRUCTIONS,
  EXPLAIN_PROMPT_INTRO,
  e2eFixtureVerdict,
  type ExplainVerdict,
} from '@/lib/literature/explain'

const ExplainBody = z.object({ text: boundedText(EXPLAIN_MAX_CHARS) }).strict()

/**
 * GET /api/papers/[id]/explain — this student's current explanation state
 * (parent high-water row) for the panel to reload on mount/reload.
 *
 * POST /api/papers/[id]/explain — grade one submission against the paper,
 * persist the revise-loop history, and (once-ever) mint flat KP on a pass.
 * Server-side only; the Anthropic key never reaches the browser.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, status: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const explanation = await db.paperExplanation.findUnique({
    where: { paperId_userId: { paperId: params.id, userId: ctx.dbUserId } },
  })

  if (!explanation) return NextResponse.json({ explanation: null })

  return NextResponse.json({
    explanation: {
      attemptCount: explanation.attemptCount,
      bestScore: explanation.bestScore,
      passed: explanation.passed,
      latestText: explanation.latestText,
      verdict: explanation.latestVerdictJson,
      threshold: { accuracy: EXPLAIN_PASS_ACCURACY, completeness: EXPLAIN_PASS_COMPLETENESS },
    },
  })
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Strict per-user + per-IP limit: grading is a paid Claude call.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error: bodyError } = await parseJson(req, ExplainBody)
  if (bodyError) return bodyError

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true, title: true, teamId: true, fullText: true, status: true },
  })
  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (paper.status !== 'ready') {
    return NextResponse.json({ error: 'Paper is still processing' }, { status: 409 })
  }

  const existing = await db.paperExplanation.findUnique({
    where: { paperId_userId: { paperId: paper.id, userId: ctx.dbUserId } },
    select: { attemptCount: true, bestScore: true, kpAwarded: true, passed: true },
  })
  const priorBest = existing?.bestScore ?? 0
  const priorKp = existing?.kpAwarded ?? 0
  const attemptCount = existing?.attemptCount ?? 0

  let verdict: ExplainVerdict
  if (process.env.E2E_SKIP_LLM === '1') {
    // E2E test-mode short-circuit: skip the real Anthropic call when
    // E2E_SKIP_LLM=1 is set in the environment. Fails the first submission,
    // passes any revision — deterministic, exercises the revise loop AND the
    // KP award with no paid call. Never set this in production.
    verdict = e2eFixtureVerdict(attemptCount)
  } else {
    const response = await anthropic().messages.create({
      model: 'claude-sonnet-5',
      // Sonnet 5 runs adaptive thinking when `thinking` is omitted (4.6 did not),
      // and thinking shares this `max_tokens` budget. Disabled to preserve the
      // cost, latency, and output length this route was tuned for.
      // `max_tokens` was also raised ~1.5x: Sonnet 5's tokenizer
      // spends ~30% more tokens on the same text, so a budget tuned against
      // 4.6 truncates. That is not a visible error — it silently cuts the
      // response mid-sentence (it broke idea-check's JSON verdict outright).
      thinking: { type: 'disabled' },
      max_tokens: 1536,
      // Cached paper block FIRST (PERF-8) — byte-identical to chat/quiz/grade/retry
      // so the same 30k-token prefix cache entry serves this route too.
      system: [paperTextBlock(paper.fullText), { type: 'text', text: EXPLAIN_INSTRUCTIONS() }],
      messages: [
        {
          role: 'user',
          content: `${EXPLAIN_PROMPT_INTRO}\n\n<student_explanation>\n${data.text}\n</student_explanation>`,
        },
      ],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const parsed = extractJson<unknown>(raw)
    const result = parsed ? ExplainVerdictSchema.safeParse(parsed) : null
    if (!result || !result.success) {
      // Verdict can quote the student's explanation — log lengths only (A7).
      logEvent({
        event: 'explain.verdict_parse_failed',
        outcome: 'error',
        detail: `len=${raw.length}`,
      })
      return NextResponse.json({ error: 'Failed to grade your explanation' }, { status: 502 })
    }
    verdict = normalizeVerdict(result.data)
  }

  const { overall, passed, kpEligible, newBestScore } = computeExplainOutcome({
    accuracy: verdict.accuracy,
    completeness: verdict.completeness,
    priorBest,
    priorKp,
  })

  const attemptNo = attemptCount + 1

  // Persist atomically: the attempt-history row, the parent high-water row,
  // and — only when eligible — the once-ever flat KP claim.
  const kpEarned = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `paper-explain:${paper.id}:${ctx.dbUserId}`)

    await tx.paperExplanationAttempt.create({
      data: {
        paperId: paper.id,
        userId: ctx.dbUserId,
        attemptNo,
        text: data.text,
        accuracy: verdict.accuracy,
        completeness: verdict.completeness,
        overall,
        passed,
        verdictJson: verdict as unknown as Prisma.InputJsonValue,
      },
    })

    // Upsert the parent's high-water fields. Must NOT set `kpAwarded` — that
    // is claimed separately below via the WHERE-gated RETURNING statement.
    await tx.paperExplanation.upsert({
      where: { paperId_userId: { paperId: paper.id, userId: ctx.dbUserId } },
      create: {
        paperId: paper.id,
        userId: ctx.dbUserId,
        attemptCount: 1,
        bestScore: newBestScore,
        passed,
        latestText: data.text,
        latestVerdictJson: verdict as unknown as Prisma.InputJsonValue,
      },
      update: {
        attemptCount: { increment: 1 },
        bestScore: newBestScore,
        passed: passed || (existing?.passed ?? false),
        latestText: data.text,
        latestVerdictJson: verdict as unknown as Prisma.InputJsonValue,
      },
    })

    if (!kpEligible) return 0

    // KP claim (money-shaped — mirrors app/api/ops/codex/complete/route.ts):
    // a raw WHERE-gated UPDATE ... RETURNING, NOT a caught unique violation —
    // a caught constraint error inside a Prisma $transaction still aborts the
    // surrounding Postgres transaction (25P02 lesson), so a race between two
    // concurrent passing submissions MUST be resolved by RETURNING-set
    // emptiness. The parent row is guaranteed to exist — the upsert above ran
    // in this same transaction.
    const claimRows = await tx.$queryRaw<{ kp_awarded: number }[]>(Prisma.sql`
      UPDATE "paper_explanations"
         SET kp_awarded = ${EXPLAIN_KP_AWARD}, updated_at = now()
       WHERE paper_id = ${paper.id} AND user_id = ${ctx.dbUserId} AND kp_awarded = 0
      RETURNING kp_awarded
    `)
    if (claimRows.length === 0) return 0

    await tx.teamCurrency.upsert({
      where: { teamId: paper.teamId },
      create: { teamId: paper.teamId, kp: EXPLAIN_KP_AWARD },
      update: { kp: { increment: EXPLAIN_KP_AWARD } },
    })
    return EXPLAIN_KP_AWARD
  })

  // "First pass" and "KP minted" coincide by construction (kpEligible requires
  // priorKp === 0, and priorKp only ever becomes non-zero on a passing KP
  // claim) — so gating the activity log on kpEarned > 0 is exactly "on a
  // first pass", per the plan.
  if (passed && kpEarned > 0) {
    logActivity(ctx.teamId, ctx.dbUserId, 'explanation_passed', {
      paperTitle: paper.title,
      score: overall,
    }).catch(console.error)
  }

  return NextResponse.json({
    attemptNo,
    accuracy: verdict.accuracy,
    completeness: verdict.completeness,
    overall,
    passed,
    kpEarned,
    verdict,
    threshold: { accuracy: EXPLAIN_PASS_ACCURACY, completeness: EXPLAIN_PASS_COMPLETENESS },
  })
}
