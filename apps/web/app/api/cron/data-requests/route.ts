import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertCron } from '@/lib/cron/auth'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { decideDataRequest, runDataRequests } from '@/lib/data-requests/workflow'
import { runRetentionPrune } from '@/lib/retention/policies'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Requests executed per invocation. Erasure is rare; the bound is a safety rail. */
const REQUEST_BATCH = 5
/** Rows pruned per model per invocation — a backlog drains over several runs. */
const PRUNE_LIMIT = 5_000

/**
 * The operator surface for data requests (REFACTOR2 P1-R9).
 *
 * GET  — the scheduled pass: run approved requests, then prune by retention.
 * POST — the operator decision: approve or reject one request.
 *
 * Both are behind `assertCron`, which is the same shared-secret guard the other
 * scheduled routes use. "The operator" is whoever holds `CRON_SECRET` — the same
 * person the runbook already assumed had database access, now working through a
 * durable, idempotent, ordered workflow instead of psql. Approval intentionally
 * has no in-app UI: the authority to erase a minor's record is the school's, and
 * putting that button in the product is how it gets clicked by accident.
 */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const requests = await runDataRequests(REQUEST_BATCH)
  const pruned = await runRetentionPrune(PRUNE_LIMIT)
  return NextResponse.json({ requests, pruned })
}

const Decision = z
  .object({
    requestId: z.string().min(1).max(64),
    action: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

/** POST /api/cron/data-requests — approve or reject a pending request. */
export async function POST(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const parsed = await parseJson(req, Decision)
  if (parsed.error) return parsed.error
  const { requestId, action, note } = parsed.data

  const decided = await decideDataRequest(requestId, action, note)
  if (!decided) {
    // Lost the CAS: already decided, already running, or no such request. The
    // standing state is more useful to an operator than a bare 409.
    const current = await db.dataRequest.findUnique({
      where: { id: requestId },
      select: { id: true, kind: true, status: true, decidedAt: true },
    })
    return NextResponse.json(
      { error: current ? 'Already decided' : 'No such request', request: current },
      { status: current ? 409 : 404 },
    )
  }

  return NextResponse.json({ ok: true, requestId, action })
}
