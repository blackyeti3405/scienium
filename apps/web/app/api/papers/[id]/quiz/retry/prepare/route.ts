import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { prepareRetry } from '@/lib/literature/quiz-retry'

/**
 * POST /api/papers/[id]/quiz/retry/prepare
 *
 * Idempotently prepare a retry: generate (once) the ONE fresh extra question
 * and return it alongside the failed questions, keys stripped, so the retry
 * FORM can show the new question with an empty textarea before the student
 * answers anything. Re-opening the retry view never regenerates.
 *
 * **A POST because it spends money** (REFACTOR2 P2-S6). This was a GET on the
 * sibling route: a safe, idempotent-by-contract verb that a browser prefetch, a
 * link scanner or a retry-on-navigation could issue, sitting directly on top of
 * an Anthropic call. The claim/TTL/CAS discipline in the service made it
 * single-payer, never free. Nothing else changed — the same service operation,
 * the same `ai` tier, the same team scoping inside `prepareRetry`.
 */
const PrepareBody = z.object({ sessionId: z.string().min(1).max(64) }).strict()

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, PrepareBody)
  if (error) return error

  const result = await prepareRetry(data.sessionId, params.id, {
    dbUserId: ctx.dbUserId,
    teamId: ctx.teamId,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { ok: _ok, ...body } = result
  return NextResponse.json(body)
}
