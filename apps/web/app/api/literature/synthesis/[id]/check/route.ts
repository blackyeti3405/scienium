import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'
import { extractJson } from '@/lib/literature/quiz'
import { lockAggregate } from '@/lib/db-lock'
import { logActivity } from '@/lib/activity/log'
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

/**
 * POST /api/literature/synthesis/[id]/check — Vega's synthesis check.
 *
 * Cost shape (Decision 2 of the plan): reads the papers' ABSTRACTS (or a
 * short `fullText` head slice), never full texts, on its OWN cache prefix —
 * deliberately does not import `paperTextBlock`/`paperTextContext`/
 * `PAPER_TEXT_SLICE_CHARS` from lib/literature/grading.ts, so this never
 * touches the PERF-8 single-paper cached prefix. Exactly ONE
 * `anthropic().messages.create(` call site and exactly ONE
 * `cache_control: { type: 'ephemeral' }` block below.
 *
 * KP is flat, server-chosen, once-per-matrix, and capped at
 * MAX_KP_AWARDED_MATRICES paid matrices per team — the model never emits a
 * number that reaches the economy (see `SYNTHESIS_KP_AWARD`).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Strict per-user + per-IP limit: the required rate cap for an LLM-backed route.
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const matrix = await db.synthesisMatrix.findFirst({ where: { id: params.id, teamId: ctx.teamId } })
  if (!matrix) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [papers, cells] = await Promise.all([
    db.paper.findMany({
      where: { id: { in: matrix.paperIds }, teamId: ctx.teamId },
      select: { id: true, title: true, authors: true, abstract: true, fullText: true },
    }),
    db.synthesisCell.findMany({ where: { matrixId: matrix.id } }),
  ])

  if (!cells.some((c) => c.text.trim().length > 0)) {
    return NextResponse.json(
      { error: 'Fill in some cells first — Vega checks YOUR reading, not a blank grid.' },
      { status: 400 },
    )
  }

  const columns = parseColumns(matrix.columnsJson)
  const columnIds = columns.map((c) => c.id)
  const paperIds = matrix.paperIds
  const cellViews = cells.map((c) => ({ paperId: c.paperId, columnId: c.columnId, text: c.text }))

  const inputHash = matrixInputHash(matrix.templateId, columns, paperIds, cellViews)

  // Replay cache (PERF-7): a re-check of a byte-identical grid never pays for
  // another call.
  const stored = StoredCheckSchema.safeParse(matrix.lastCheckJson)
  if (stored.success && stored.data.inputHash === inputHash) {
    return NextResponse.json({ verdict: stored.data.verdict, cached: true, kpEarned: 0 })
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

    let response
    try {
      response = await anthropic().messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
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
    } catch (err) {
      console.error('[synthesis] check call failed:', err)
      return NextResponse.json({ error: 'Vega could not check your synthesis — try again' }, { status: 502 })
    }
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    verdictRaw = extractJson<unknown>(raw)
  }

  const parsed = verdictRaw ? VerdictSchema.safeParse(verdictRaw) : null
  if (!parsed || !parsed.success) {
    console.error('[synthesis] verdict failed to parse:', verdictRaw)
    return NextResponse.json({ error: 'Vega could not check your synthesis — try again' }, { status: 502 })
  }

  const columnLabels = columns.map((c) => c.label)
  const verdict = sanitizeVerdict(parsed.data, { paperIds, columnIds, columnLabels })

  const missed =
    verdict.agreements.filter((f) => !f.studentNoticed).length +
    verdict.contradictions.filter((f) => !f.studentNoticed).length

  let kpEarned = 0
  await db.$transaction(async (tx) => {
    await tx.synthesisMatrix.update({
      where: { id: matrix.id },
      data: {
        lastCheckJson: { inputHash, verdict } as unknown as Prisma.InputJsonValue,
        lastCheckedAt: new Date(),
      },
    })

    if (matrix.kpAwarded > 0) return

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

  logActivity(ctx.teamId, ctx.dbUserId, 'synthesis_checked', { matrixId: matrix.id, missed }).catch(console.error)

  return NextResponse.json({ verdict, cached: false, kpEarned })
}
