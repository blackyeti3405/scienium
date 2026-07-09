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

  const staleBefore = new Date(Date.now() - 5 * 60_000)
  const jobs = await db.paperProcessingJob.findMany({
    where: {
      attempts: { lt: 3 },
      OR: [
        { status: 'pending' },
        { status: 'failed' },
        { status: 'running', claimedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: { paperId: true },
  })

  await Promise.all(jobs.map((job) => processPaperJob(job.paperId)))
  return NextResponse.json({ processed: jobs.length })
}
