import 'server-only'
import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'
import { beginRequest, logEvent } from '@/lib/observability/log'
import { recordSecurityEvent } from '@/lib/observability/security-event'

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
    denied(req, 'cron_unconfigured', 503)
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }
  // Weak secrets defeat the whole guard — refuse them in production rather
  // than let a 6-char value ship (SEC-10).
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    console.error('[cron] CRON_SECRET is shorter than 32 bytes — refusing to run.')
    denied(req, 'cron_secret_too_short', 503)
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }
  // Constant-time compare (SEC-10): `!==` short-circuits on the first differing
  // byte, which leaks how much of the guess matched. timingSafeEqual requires
  // equal lengths, so guard that first — the length itself is not secret.
  const expected = Buffer.from(`Bearer ${secret}`)
  const provided = Buffer.from(req.headers.get('authorization') ?? '')
  const ok = provided.length === expected.length && timingSafeEqual(provided, expected)
  if (!ok) {
    denied(req, 'cron_secret_mismatch', 401)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * An unauthorized hit on a cron route is either a probe or a scheduler
 * misconfiguration — both are operator-relevant, and neither is visible in a
 * drain that has already rolled over. The log line stays (it is what the runbook
 * greps during an incident); the durable row is what the "unauthorized cron
 * attempts" threshold counts over (REFACTOR2 P1-5).
 *
 * The 503 branches are included deliberately: a cron route that is LOCKED
 * because nobody set `CRON_SECRET` looks, from the outside, exactly like one
 * that is running — and it silently means notification email, paper retries, and
 * data requests all stopped.
 */
function denied(req: NextRequest, reason: string, status: number): void {
  logEvent({
    event: 'cron.auth_denied',
    route: req.nextUrl.pathname,
    requestId: beginRequest(req),
    outcome: 'denied',
    status,
    detail: reason,
  })
  void recordSecurityEvent({
    kind: 'cron.denied',
    outcome: 'denied',
    actorType: 'anonymous',
    targetType: 'route',
    targetId: req.nextUrl.pathname,
    reason,
  })
}