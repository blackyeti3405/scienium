import { NextRequest, NextResponse } from 'next/server'
import { assertCron } from '@/lib/cron/auth'
import { db } from '@/lib/db'
import { processPaperJob } from '@/lib/literature/process-paper'
import { logEvent } from '@/lib/observability/log'
import { reclaimAbandonedAssets, reconcileOrphanedAssets } from '@/lib/uploads/assets'

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
  if (stuck.length) {
    const ids = stuck.map((s) => s.paperId)
    await db.$transaction([
      db.paperProcessingJob.updateMany({
        where: { paperId: { in: ids } },
        data: {
          status: 'failed',
          terminalAt: now,
          nextRunAt: null,
          lastError: 'Processing timed out after the maximum number of attempts.',
        },
      }),
      db.paper.updateMany({ where: { id: { in: ids } }, data: { status: 'error' } }),
    ])
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

  await Promise.all(jobs.map((job) => processPaperJob(job.paperId)))

  // Reclaim abandoned uploads: orphaned attachments (a deleted/edited log) plus
  // temporary assets never attached within the stale window. Physical delete of the
  // object happens here — the only site that removes stored objects. Bounded.
  // Repair pre-fix `attached` rows with a dead owner FIRST, so the sweep below
  // can reclaim them in the same run rather than a day later (P1-S8).
  const reconciled = await reconcileOrphanedAssets()
  const cleanedAssets = await reclaimAbandonedAssets({ olderThanMs: STALE_ASSET_MS, limit: 50 })

  logEvent({
    event: 'cron.papers',
    route: '/api/cron/papers',
    durationMs: Date.now() - now.getTime(),
    outcome: 'ok',
    detail: `processed=${jobs.length} terminalized=${stuck.length} reconciled=${reconciled} cleanedAssets=${cleanedAssets}`,
  })

  return NextResponse.json({
    processed: jobs.length,
    terminalized: stuck.length,
    reconciled,
    cleanedAssets,
  })
}
