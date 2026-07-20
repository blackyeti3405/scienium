import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { reviewPlan } from '@/lib/research-plan/review-service'

/**
 * POST /api/research-plan/review — thin adapter (Track B P1-2). The rubric
 * critique workflow — cache replay, prompt construction, streaming parse,
 * persistence — lives in `lib/research-plan/review-service.ts`; this route
 * only guards, calls the one operation, and maps the typed result to HTTP
 * (JSON error, or NDJSON body for both the replay and live-stream variants).
 */

const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-store',
} as const

export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: a full plan review is a large paid Claude call.
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const result = await reviewPlan({ teamId: ctx.teamId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return new Response(result.kind === 'replay' ? result.ndjson : result.stream, {
    headers: NDJSON_HEADERS,
  })
}
