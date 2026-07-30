import { NextRequest, NextResponse } from 'next/server'
import { checkDailySpendPressure } from '@/lib/ai/spend'
import { assertCron } from '@/lib/cron/auth'
import { mapWithConcurrency } from '@/lib/concurrency'
import { db } from '@/lib/db'
import { ensureFairsSeeded } from '@/lib/fairs/match'
import { ensureFormsSeeded } from '@/lib/fairs/forms-server'
import { backfillMissingCitations } from '@/lib/literature/citation-backfill'
import { processPaperJob } from '@/lib/literature/process-paper'
import { logEvent } from '@/lib/observability/log'
import { reclaimAbandonedAssets, reconcileOrphanedAssets } from '@/lib/uploads/assets'

/** Paper jobs processed at once. Each is one Anthropic call; the wait is network. */
const PAPER_JOB_CONCURRENCY = 4

/** Reclaim uploads that were never attached to a domain row within this window. */
const STALE_ASSET_MS = 24 * 60 * 60 * 1000

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Retry a bounded batch of paper jobs that outlived their upload request. */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const now = new Date()
  const staleBefore = new Date(now.getTime() - 5 * 60_000)

  // Terminalize jobs whose FINAL attempt crashed mid-run — a stale `running` claim
  // that has already used every attempt is never re-claimed, so mark it a terminal
  // error rather than leave the paper stuck in `processing` forever.
  const stuck = await db.paperProcessingJob.findMany({
    where: { status: 'running', claimedAt: { lt: staleBefore }, attempts: { gte: 3 } },
    take: 20,
    select: { paperId: true },
  })
  let terminalized = 0
  if (stuck.length) {
    const ids = stuck.map((s) => s.paperId)
    terminalized = await db.$transaction(async (tx) => {
      // Re-assert the selection predicate on the WRITE (P1-S5). The `findMany`
      // above is a snapshot: by the time this runs a worker may have re-claimed
      // the job, and a write keyed on `paper_id` alone would erase its progress.
      const wrote = await tx.paperProcessingJob.updateMany({
        where: {
          paperId: { in: ids },
          status: 'running',
          claimedAt: { lt: staleBefore },
          attempts: { gte: 3 },
        },
        data: {
          status: 'failed',
          terminalAt: now,
          nextRunAt: null,
          lastError: 'Processing timed out after the maximum number of attempts.',
        },
      })
      // Only the papers whose job this transaction actually terminalized.
      await tx.paper.updateMany({
        where: { id: { in: ids }, processingJob: { terminalAt: now } },
        data: { status: 'error' },
      })
      return wrote.count
    })
  }

  const jobs = await db.paperProcessingJob.findMany({
    where: {
      attempts: { lt: 3 },
      OR: [
        { status: 'pending' },
        // Retryable failures whose backoff window has elapsed (respects nextRunAt).
        { status: 'failed', OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
        { status: 'running', claimedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    // Sized above a full classroom (30 uploads at lesson start), not at 3 — with
    // the old batch size a room's worth of stalled papers took ~50 min to drain.
    // Jobs run concurrently and each is one bounded LLM call, so a batch fits
    // comfortably inside maxDuration.
    take: 30,
    select: { paperId: true },
  })

  // BOUNDED, not `Promise.all` (P1-R5). The batch of 30 exists so a classroom's
  // backlog drains in one invocation; firing all 30 at once meant 30 simultaneous
  // Anthropic calls inside a 60-second function, against provider rate limits and
  // a database URL configured with `connection_limit=1`. Per-job claims made that
  // safe, not sane. Four at a time still drains 30 jobs well inside maxDuration,
  // because each job is one bounded call and the wait is network, not CPU.
  await mapWithConcurrency(jobs, PAPER_JOB_CONCURRENCY, (job) => processPaperJob(job.paperId))

  // Reclaim abandoned uploads: orphaned attachments (a deleted/edited log) plus
  // temporary assets never attached within the stale window. Physical delete of the
  // object happens here — the only site that removes stored objects. Bounded.
  // Repair pre-fix `attached` rows with a dead owner FIRST, so the sweep below
  // can reclaim them in the same run rather than a day later (P1-S8).
  const reconciled = await reconcileOrphanedAssets()
  const cleanedAssets = await reclaimAbandonedAssets({ olderThanMs: STALE_ASSET_MS, limit: 50 })

  // ── The catalog/domain writes that used to ride on student GETs (P2-S6) ─────
  // A read request is not a place to reconcile a global catalog or repair
  // history. All three are idempotent, bounded, and unpaid; this five-minute
  // sweep is their explicit home, so `/api/fairs/match`, `/api/fairs/forms` and
  // `/api/citations` are pure reads. Each is isolated: a catalog that fails to
  // reconcile must not stop the paper jobs above from being reported.
  let catalogFailures = 0
  const isolate = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run()
    } catch (err) {
      catalogFailures++
      console.error('[cron/papers] catalog reconcile failed:', err)
      return fallback
    }
  }
  await isolate(ensureFairsSeeded, undefined)
  await isolate(ensureFormsSeeded, undefined)
  const citationsBackfilled = await isolate(backfillMissingCitations, 0)

  // Provider-budget pressure (REFACTOR2 P1-5). One aggregate over today's
  // `ai_usage`, isolated like the reconciles above: an alert that fails must not
  // fail the sweep it is riding on. This cron is its home because it is the
  // frequent one — checking on the paid path would add a query to every LLM call
  // to answer a question that moves in hours.
  await isolate(checkDailySpendPressure, undefined)

  logEvent({
    event: 'cron.papers',
    route: '/api/cron/papers',
    durationMs: Date.now() - now.getTime(),
    outcome: catalogFailures ? 'error' : 'ok',
    detail: `processed=${jobs.length} terminalized=${terminalized} reconciled=${reconciled} cleanedAssets=${cleanedAssets} citations=${citationsBackfilled} catalogFailures=${catalogFailures}`,
  })

  return NextResponse.json({
    processed: jobs.length,
    terminalized,
    reconciled,
    citationsBackfilled,
    cleanedAssets,
  })
}
