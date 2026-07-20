import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { runIdeaCheck } from '@/lib/research-plan/idea-check-service'

/**
 * POST /api/research-plan/idea-check — thin adapter (Track B P1-2). The
 * "has this been done before?" workflow — daily cap, web-search streaming,
 * verdict parsing, persistence — lives in
 * `lib/research-plan/idea-check-service.ts`; this route guards, calls the one
 * operation, and maps the typed result to HTTP (JSON error or NDJSON stream).
 */
export async function POST(req: NextRequest) {
  // Per-minute burst cap on top of the 3/day-per-team cap in the service:
  // stops a single caller from racing many concurrent web-search runs before
  // the daily counter catches up (each run is a multi-search paid Claude call).
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const result = await runIdeaCheck({ teamId: ctx.teamId, dbUserId: ctx.dbUserId })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return new Response(result.stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
