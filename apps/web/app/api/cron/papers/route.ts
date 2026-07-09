import { NextRequest, NextResponse } from 'next/server'
import { assertCron } from '@/lib/cron/auth'
import { db } from '@/lib/db'
import { processPaperJob } from '@/lib/literature/process-paper'

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
    take: 3,
    select: { paperId: true },
  })

  await Promise.all(jobs.map((job) => processPaperJob(job.paperId)))
  return NextResponse.json({ processed: jobs.length, terminalized: stuck.length })
}
