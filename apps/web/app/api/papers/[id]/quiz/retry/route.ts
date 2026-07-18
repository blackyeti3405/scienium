import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { AnswersBody } from '@/lib/literature/grading'
import { prepareRetry, submitRetry } from '@/lib/literature/quiz-retry'

/**
 * Thin route adapter over the quiz-retry application service
 * (lib/literature/quiz-retry.ts): resolve the principal, parse input, call one
 * operation, map the typed result to HTTP. All workflow — eligibility, the
 * idempotent one-time question generation, the single grading call, and the
 * KP/proficiency transaction — lives in the service.
 */

// GET: idempotently prepare a retry — generates (once) the ONE fresh extra
// question and returns it alongside the failed questions, keys stripped, so
// the retry FORM can show the new question with an empty textarea before the
// student answers anything. Re-opening the retry view never regenerates.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const sessionId = new URL(req.url).searchParams.get('sessionId') ?? ''
  const result = await prepareRetry(sessionId, params.id, {
    dbUserId: ctx.dbUserId,
    teamId: ctx.teamId,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { ok: _ok, ...body } = result
  return NextResponse.json(body)
}

// POST: targeted retry — grade the re-answered failed Qs + the already-
// generated new Q (generated via GET, or generated in the service as a
// fallback if the client posts without ever calling GET) in ONE grading call.
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Strict per-user + per-IP limit: retry makes at most a grading call (plus a
  // generation call only on the fallback path) — same rate cap as generate/grade.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, AnswersBody)
  if (error) return error

  const result = await submitRetry(
    data.sessionId,
    params.id,
    { dbUserId: ctx.dbUserId, teamId: ctx.teamId },
    data.answers,
  )
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  const { ok: _ok, ...body } = result
  return NextResponse.json(body)
}
