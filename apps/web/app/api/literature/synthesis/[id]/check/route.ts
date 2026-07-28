import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { aiCreate, parseModelOutput } from '@/lib/ai/spend'
import { aiIdempotencyKey, runAiOperation } from '@/lib/ai/operation'
import { logEvent } from '@/lib/observability/log'
import { lockAggregate } from '@/lib/db-lock'
import { logActivityBestEffort } from '@/lib/activity/log'
import {
  parseColumns,
  matrixInputHash,
  buildSourcesBlock,
  buildStudentMatrixBlock,
  SYNTHESIS_INSTRUCTIONS,
  VerdictSchema,
  StoredCheckSchema,
  sanitizeVerdict,
  e2eStubVerdict,
  SYNTHESIS_KP_AWARD,
  MAX_KP_AWARDED_MATRICES,
} from '@/lib/literature/synthesis'

export const maxDuration = 60

/** Unusable model output. Thrown inside the operation so the ledger records a
 *  real failed attempt; mapped to the route's existing 502 outside it. Carries
 *  only `parseModelOutput`'s payload-free `logDetail`. */
class SynthesisOutputError extends Error {}

/**
 * The grid the client believes it is asking about (REFACTOR2 P1-R13).
 *
 * Required, not optional. Cells save asynchronously on blur, and clicking the
 * check button blurs the textarea and fired the check in the same tick — so the
 * paid call could read the PREVIOUS database value, cache a verdict for it, and
 * award KP for content the student could not see on screen. An optional hash
 * would leave that path open for any caller that simply omits it.
 */
const Body = z.object({ expectedHash: z.string().length(64) }).strict()

/**
 * POST /api/literature/synthesis/[id]/check — Vega's synthesis check.
 *
 * Cost shape (Decision 2 of the plan): reads the papers' ABSTRACTS (or a
 * short `fullText` head slice), never full texts, on its OWN cache prefix —
 * deliberately does not import `paperTextBlock`/`paperTextContext`/
 * `PAPER_TEXT_SLICE_CHARS` from lib/literature/grading.ts, so this never
 * touches the PERF-8 single-paper cached prefix. Exactly ONE paid call site
 * (`aiCreate`, the registry door carrying the kill switch and spend
 * accounting) and exactly ONE `cache_control: { type: 'ephemeral' }` block
 * below.
 *
 * KP is flat, server-chosen, once-per-matrix, and capped at
 * MAX_KP_AWARDED_MATRICES paid matrices per team — the model never emits a
 * number that reaches the economy (see `SYNTHESIS_KP_AWARD`).
 *
 * Three things bind this check to one snapshot of the grid (P1-R13):
 *  1. `expectedHash` — the client echoes the digest the server last handed it,
 *     so a check that would grade anything else is refused with 409 before a
 *     cent is spent.
 *  2. `runAiOperation` — two concurrent checks of the same snapshot no longer
 *     both pay; the loser replays or is told to ask again.
 *  3. A re-hash inside the commit transaction — the paid call takes seconds,
 *     and a teammate can edit during it. If the grid moved, the verdict is
 *     still returned (it is true of what was submitted) but nothing is cached
 *     as current and no KP is minted against a grid nobody can see.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Strict per-user + per-IP limit: the required rate cap for an LLM-backed route.
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  // Ownership BEFORE body validation: a matrix this team does not own must 404
  // whatever the body says, and a caller must never learn the difference
  // between "malformed request" and "not yours" (the harness pins this).
  const matrix = await db.synthesisMatrix.findFirst({ where: { id: params.id, teamId: ctx.teamId } })
  if (!matrix) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsedBody = await parseJson(req, Body)
  if (parsedBody.error) return parsedBody.error

  const [papers, cells] = await Promise.all([
    db.paper.findMany({
      where: { id: { in: matrix.paperIds }, teamId: ctx.teamId },
      select: { id: true, title: true, authors: true, abstract: true, fullText: true },
    }),
    db.synthesisCell.findMany({ where: { matrixId: matrix.id } }),
  ])

  const columns = parseColumns(matrix.columnsJson)
  const columnIds = columns.map((c) => c.id)
  const paperIds = matrix.paperIds
  const cellViews = cells.map((c) => ({ paperId: c.paperId, columnId: c.columnId, text: c.text }))

  const inputHash = matrixInputHash(matrix.templateId, columns, paperIds, cellViews)

  // THE STALE-GRID GATE. Before any spend, before the empty check: what the
  // server holds must be what the client last saw. A pending cell save that has
  // not landed, or a teammate's edit, both surface here as a 409 telling the
  // student to look again — never as a silently mis-graded check.
  if (inputHash !== parsedBody.data.expectedHash) {
    return NextResponse.json(
      { error: 'Your grid changed since it was last loaded — take another look, then check again.' },
      { status: 409 },
    )
  }

  if (!cells.some((c) => c.text.trim().length > 0)) {
    return NextResponse.json(
      { error: 'Fill in some cells first — Vega checks YOUR reading, not a blank grid.' },
      { status: 400 },
    )
  }

  // Replay cache (PERF-7): a re-check of a byte-identical grid never pays for
  // another call.
  const stored = StoredCheckSchema.safeParse(matrix.lastCheckJson)
  if (stored.success && stored.data.inputHash === inputHash) {
    return NextResponse.json({ verdict: stored.data.verdict, cached: true, kpEarned: 0, stale: false })
  }

  let verdictRaw: unknown
  if (process.env.E2E_SKIP_LLM === '1') {
    // E2E test-mode short-circuit: skip the real Anthropic call when
    // E2E_SKIP_LLM=1 is set in the environment. Deterministic, derived from
    // the matrix's own ids, and still runs through VerdictSchema.parse +
    // sanitizeVerdict + persistence below — never set this in production.
    verdictRaw = e2eStubVerdict({ paperIds, columnIds })
  } else {
    const orderedPapers = paperIds
      .map((id) => papers.find((p) => p.id === id))
      .filter((p): p is (typeof papers)[number] => p !== undefined)

    // At most one paid call per (matrix, snapshot). The `lastCheckJson` cache
    // above only helps SEQUENTIAL re-checks — two concurrent clicks both read it
    // before either writes, and both used to pay.
    const outcome = await runAiOperation<unknown>({
      operation: 'synthesis_check',
      idempotencyKey: aiIdempotencyKey(['synthesis_check', matrix.id, inputHash]),
      teamId: ctx.teamId,
      run: async () => {
        const response = await aiCreate('synthesis_check', {
          // Sonnet 5 runs adaptive thinking when `thinking` is omitted (4.6 did not),
          // and thinking shares this `max_tokens` budget. Disabled to preserve the
          // cost, latency, and output length this route was tuned for.
          // `max_tokens` was also raised ~1.5x: Sonnet 5's tokenizer
          // spends ~30% more tokens on the same text, so a budget tuned against
          // 4.6 truncates. That is not a visible error — it silently cuts the
          // response mid-sentence (it broke idea-check's JSON verdict outright).
          thinking: { type: 'disabled' },
          max_tokens: 1800,
          // The <sources> block goes FIRST and cached (ephemeral) — a re-check
          // after only editing cells (the common loop) re-reads it from cache.
          // A brand-new, SEPARATE cache prefix from paperTextContext (PERF-8) —
          // never mixed with the single-paper quiz/chat/grade/retry family.
          system: [
            { type: 'text', text: buildSourcesBlock(orderedPapers), cache_control: { type: 'ephemeral' } },
            { type: 'text', text: SYNTHESIS_INSTRUCTIONS(columns) },
          ],
          messages: [{ role: 'user', content: buildStudentMatrixBlock(columns, orderedPapers, cellViews) }],
        })
        // The ONE output boundary (P2-S9): first-text extraction, truncation
        // check, and the verdict schema. Thrown INSIDE the operation so the
        // ledger records a real failed attempt (matching the explain route) —
        // the replay cache must never hold an unusable verdict.
        const parsed = parseModelOutput(response, VerdictSchema)
        if (!parsed.ok) throw new SynthesisOutputError(parsed.logDetail)
        return parsed.data
      },
    })

    if (!outcome.ok) {
      if (outcome.reason === 'in_flight') {
        return NextResponse.json(
          { error: 'Vega is already checking this exact grid — give it a moment.' },
          { status: 409 },
        )
      }
      // A provider error can carry a response body, and this call's prompt is
      // the student's own synthesis grid — log the error CLASS only (A7/P2-S11).
      logEvent({
        event: 'synthesis.check_call_failed',
        route: '/api/literature/synthesis/[id]/check',
        outcome: 'error',
        detail: outcome.error instanceof Error ? outcome.error.constructor.name : 'unknown',
      })
      return NextResponse.json({ error: 'Vega could not check your synthesis — try again' }, { status: 502 })
    }
    verdictRaw = outcome.result
  }

  const parsed = verdictRaw ? VerdictSchema.safeParse(verdictRaw) : null
  if (!parsed || !parsed.success) {
    // Verdict text can quote the student's synthesis — log the failure class only (A7).
    logEvent({
      event: 'synthesis.verdict_parse_failed',
      outcome: 'error',
      detail: verdictRaw ? 'schema_mismatch' : 'no_json',
    })
    return NextResponse.json({ error: 'Vega could not check your synthesis — try again' }, { status: 502 })
  }

  const columnLabels = columns.map((c) => c.label)
  const verdict = sanitizeVerdict(parsed.data, { paperIds, columnIds, columnLabels })

  const missed =
    verdict.agreements.filter((f) => !f.studentNoticed).length +
    verdict.contradictions.filter((f) => !f.studentNoticed).length

  let kpEarned = 0
  let stale = false
  await db.$transaction(async (tx) => {
    // The paid call took seconds. Re-read and re-hash the grid INSIDE the
    // transaction: the cache and the KP describe one exact snapshot, so if the
    // grid moved under us they must describe nothing at all. The whole row is
    // re-read, not just the cells — a PATCH can change columns and papers too.
    const fresh = await tx.synthesisMatrix.findUnique({ where: { id: matrix.id } })
    if (!fresh) return
    const freshCells = await tx.synthesisCell.findMany({ where: { matrixId: matrix.id } })
    const freshHash = matrixInputHash(
      fresh.templateId,
      parseColumns(fresh.columnsJson),
      fresh.paperIds,
      freshCells.map((c) => ({ paperId: c.paperId, columnId: c.columnId, text: c.text })),
    )
    if (freshHash !== inputHash) {
      stale = true
      return
    }

    await tx.synthesisMatrix.update({
      where: { id: matrix.id },
      data: {
        lastCheckJson: { inputHash, verdict } as unknown as Prisma.InputJsonValue,
        lastCheckedAt: new Date(),
      },
    })

    if (fresh.kpAwarded > 0) return

    // TEAM-scoped advisory lock (not per-matrix): the cap below is a
    // correlated COUNT across every matrix on this team, so under READ
    // COMMITTED two concurrent check requests on two DIFFERENT unpaid
    // matrices of the SAME team would otherwise each take their own
    // snapshot, both see count < MAX_KP_AWARDED_MATRICES, and both mint —
    // pushing the team over the cap. Locking on the matrix id alone can't
    // prevent that (two txns lock two different keys and never contend).
    // Serializing on the TEAM key forces every one of this team's KP claims
    // through this section one at a time, so the COUNT a later transaction
    // reads always reflects every earlier transaction's committed claim.
    await lockAggregate(tx, `synthesis:kp:${ctx.teamId}`)

    // Flat, once-per-matrix (row-gated `WHERE kp_awarded = 0`), team-capped
    // (correlated COUNT, now serialized by the lock above) claim — a single
    // atomic WHERE-gated UPDATE, mirroring app/api/ops/codex/complete/route.ts
    // (a caught unique violation inside a Prisma $transaction still aborts
    // the whole transaction, so the claim MUST be resolved by RETURNING-set
    // emptiness, never a caught constraint error).
    const claimRows = await tx.$queryRaw<{ kp_awarded: number }[]>(Prisma.sql`
      UPDATE "synthesis_matrices"
         SET kp_awarded = ${SYNTHESIS_KP_AWARD}, updated_at = now()
       WHERE id = ${matrix.id}
         AND kp_awarded = 0
         AND (
           SELECT COUNT(*) FROM "synthesis_matrices"
           WHERE team_id = ${ctx.teamId} AND kp_awarded > 0
         ) < ${MAX_KP_AWARDED_MATRICES}
      RETURNING kp_awarded
    `)
    if (claimRows.length === 0) return

    await tx.teamCurrency.upsert({
      where: { teamId: ctx.teamId },
      create: { teamId: ctx.teamId, kp: SYNTHESIS_KP_AWARD },
      update: { kp: { increment: SYNTHESIS_KP_AWARD } },
    })
    kpEarned = SYNTHESIS_KP_AWARD
  })

  if (stale) {
    logEvent({
      event: 'synthesis.verdict_superseded',
      detail: `matrix=${matrix.id} — the grid changed during the check; verdict returned, not cached, no KP`,
    })
  }

  logActivityBestEffort(ctx.teamId, ctx.dbUserId, 'synthesis_checked', { matrixId: matrix.id, missed }).catch(console.error)

  return NextResponse.json({ verdict, cached: false, kpEarned, stale })
}
