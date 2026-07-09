import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'

/**
 * Shared guard for scheduled (cron) routes.
 *
 * Cron endpoints mutate state and call paid APIs but have no signed-in user, so
 * they're protected by a shared secret instead. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set;
 * the same header works for any external scheduler.
 *
 * Fails CLOSED: if `CRON_SECRET` is unset the route is treated as locked (503)
 * rather than world-open, so a misconfiguration can't expose it. Returns a ready
 * NextResponse to return when unauthorized, or null to proceed.
 */
export function assertCron(req: NextRequest): NextResponse | null {
  const secret = serverEnv.CRON_SECRET()
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }
  const header = req.headers.get('authorization')
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
