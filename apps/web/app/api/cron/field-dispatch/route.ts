import { NextRequest, NextResponse } from 'next/server'
import { assertCron } from '@/lib/cron/auth'
import { ensureTodayDispatch } from '@/lib/field-dispatch/dispatch'
import { LAB_TYPES, type LabType } from '@/lib/phase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/field-dispatch — pre-generates today's Field Dispatch for all six
 * lab types so the first student of the day doesn't pay the generation latency.
 * Idempotent (the `(labType, publishedDate)` unique constraint), so re-runs are
 * free and a missed run self-heals on the next GET to the feature.
 *
 * Schedule daily (see vercel.json). Each lab type is generated independently so
 * one failure can't abort the batch.
 */
export async function GET(req: NextRequest) {
  const denied = assertCron(req)
  if (denied) return denied

  const results = await Promise.allSettled(
    (LAB_TYPES as readonly LabType[]).map((labType) => ensureTodayDispatch(labType)),
  )

  const generated = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - generated
  if (failed > 0) {
    console.error(`[cron/field-dispatch] ${failed}/${results.length} lab types failed`)
  }
  return NextResponse.json({ generated, failed })
}
