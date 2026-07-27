import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson, boundedText } from '@/lib/validation'
import { db } from '@/lib/db'
import { aiCreate } from '@/lib/ai/spend'
import { logEvent } from '@/lib/observability/log'
import { paperTextBlock } from '@/lib/literature/grading'
import { extractJson } from '@/lib/literature/quiz'
import { recordActivity } from '@/lib/activity/log'
import { lockAggregate } from '@/lib/db-lock'
import { aiIdempotencyKey, runAiOperation } from '@/lib/ai/operation'
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

/** Unusable model output. Thrown inside the operation so the row records a real
 *  failed attempt; mapped to the route's existing 502 outside it. */
class ExplainGradingError extends Error {}

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

  // Read ONLY to shape the deterministic E2E fixture. Every value that decides
  // the stored outcome is re-read under the lock after the paid call (P1-S6) —
  // nothing here may reach `bestScore`, `passed`, or `attemptNo`.
  const existing = await db.paperExplanation.findUnique({
    where: { paperId_userId: { paperId: paper.id, userId: ctx.dbUserId } },
    select: { attemptCount: true },
  })
  const attemptCount = existing?.attemptCount ?? 0

  // Replay an identical submission rather than re-grading it (REFACTOR2 P1-S6
  // remainder). The lock below stops two callers grading at the same instant; it
  // cannot help a client that timed out and retried, or a student who submitted
  // the same text twice — both used to pay again. The key is the exact input.
  const idempotencyKey = aiIdempotencyKey(['explain', paper.id, ctx.dbUserId, data.text])

  let verdict: ExplainVerdict
  if (process.env.E2E_SKIP_LLM === '1') {
    // E2E test-mode short-circuit: skip the real Anthropic call when
    // E2E_SKIP_LLM=1 is set in the environment. Fails the first submission,
    // passes any revision — deterministic, exercises the revise loop AND the
    // KP award with no paid call. Never set this in production.
    verdict = e2eFixtureVerdict(attemptCount)
  } else {
    const graded = await runAiOperation<ExplainVerdict>({
      operation: 'explain_grade',
      idempotencyKey,
      teamId: paper.teamId,
      run: async () => {
    const response = await aiCreate('explain_grade', {
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
          throw new ExplainGradingError()
        }
        return normalizeVerdict(result.data)
      },
    })

    if (!graded.ok) {
      if (graded.reason === 'in_flight') {
        return NextResponse.json(
          { error: 'That explanation is still being graded — give it a moment.' },
          { status: 409 },
        )
      }
      if (graded.error instanceof ExplainGradingError) {
        return NextResponse.json({ error: 'Failed to grade your explanation' }, { status: 502 })
      }
      throw graded.error
    }
    verdict = graded.result
  }

  // Persist atomically: the attempt-history row, the parent high-water row,
  // and — only when eligible — the once-ever flat KP claim.
  //
  // EVERYTHING that decides the outcome is re-read INSIDE the lock (REFACTOR2
  // P1-S6). The `existing` snapshot above was taken before a multi-second paid
  // call, so two concurrent submissions computed the same `attemptNo`, and a
  // slower FAILING result recomputed `bestScore`/`passed` from that stale read
  // and overwrote a pass that had landed in the meantime — a late result
  // lowering visible truth.
  const { attemptNo, overall, passed, kpEarned } = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `paper-explain:${paper.id}:${ctx.dbUserId}`)

    const fresh = await tx.paperExplanation.findUnique({
      where: { paperId_userId: { paperId: paper.id, userId: ctx.dbUserId } },
      select: { attemptCount: true, bestScore: true, kpAwarded: true, passed: true },
    })
    const { overall, passed, kpEligible, newBestScore } = computeExplainOutcome({
      accuracy: verdict.accuracy,
      completeness: verdict.completeness,
      priorBest: fresh?.bestScore ?? 0,
      priorKp: fresh?.kpAwarded ?? 0,
    })
    // Monotonic: a pass is never un-set by a later failure.
    const nextPassed = passed || (fresh?.passed ?? false)
    const attemptNo = (fresh?.attemptCount ?? 0) + 1

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
        passed: nextPassed,
        latestText: data.text,
        latestVerdictJson: verdict as unknown as Prisma.InputJsonValue,
      },
      update: {
        attemptCount: { increment: 1 },
        bestScore: newBestScore,
        passed: nextPassed,
        latestText: data.text,
        latestVerdictJson: verdict as unknown as Prisma.InputJsonValue,
      },
    })

    if (!kpEligible) return { attemptNo, overall, passed, kpEarned: 0 }

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
    if (claimRows.length === 0) return { attemptNo, overall, passed, kpEarned: 0 }

    await tx.teamCurrency.upsert({
      where: { teamId: paper.teamId },
      create: { teamId: paper.teamId, kp: EXPLAIN_KP_AWARD },
      update: { kp: { increment: EXPLAIN_KP_AWARD } },
    })
    // Durable (REFACTOR2 P1-R5): the once-ever flat KP claim and its record
    // commit together. "First pass" and "KP minted" coincide by construction
    // (kpEligible requires priorKp === 0, and priorKp only ever becomes
    // non-zero on a passing KP claim), so this IS "on a first pass".
    await recordActivity(tx, ctx.teamId, ctx.dbUserId, 'explanation_passed', {
      paperTitle: paper.title,
      score: overall,
    })
    return { attemptNo, overall, passed, kpEarned: EXPLAIN_KP_AWARD }
  })

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
