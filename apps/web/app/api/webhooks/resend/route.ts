import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'
import { db } from '@/lib/db'
import { logEvent, requestIdFrom } from '@/lib/observability/log'

/**
 * POST /api/webhooks/resend — bounce and complaint suppression (REFACTOR2 P1-2).
 *
 * A hard bounce and a spam complaint are the only two signals that say "never
 * mail this address again", and neither is visible at send time: Resend accepts
 * the message and reports both asynchronously. Without this route the outbox
 * cheerfully re-mails a dead mailbox on every future deadline, which is how a
 * sending domain's reputation — and therefore every other student's reminders —
 * gets destroyed.
 *
 * Only the two PERMANENT events are honoured. `email.delivery_delayed` is
 * temporary trouble and belongs to the outbox's retry, not to suppression.
 *
 * Verified, not trusted: an unauthenticated writer here could silently mute any
 * student's reminders, so an unsigned or misdated request is rejected before the
 * body is looked at. Resend signs with Svix headers; the scheme is a small HMAC
 * (see `verify`) rather than a new dependency for one route.
 */

export const dynamic = 'force-dynamic'

/** Replay window for `svix-timestamp`. Svix's own default tolerance. */
const TOLERANCE_MS = 5 * 60_000

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = serverEnv.RESEND_WEBHOOK_SECRET()
  // Fails CLOSED, like `assertCron`: unconfigured means locked, not world-open.
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  // The RAW body: the signature covers the exact bytes sent, and re-serializing
  // parsed JSON changes them.
  const raw = await req.text()
  if (!verify(raw, req, secret)) {
    logEvent({
      event: 'email_webhook.auth_denied',
      route: req.nextUrl.pathname,
      requestId: requestIdFrom(req),
      outcome: 'denied',
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let event: { type?: unknown; data?: { to?: unknown } }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 })
  }

  const reason =
    event.type === 'email.bounced' ? 'bounced' : event.type === 'email.complained' ? 'complained' : null
  // Acknowledge everything else: a 4xx makes Resend retry an event we will never
  // want, and the delivered/opened stream is far larger than these two.
  if (!reason) return new NextResponse(null, { status: 204 })

  // `to` is an array on Resend's email payloads; tolerate the scalar form rather
  // than drop a suppression over its shape.
  const recipients = (Array.isArray(event.data?.to) ? event.data.to : [event.data?.to])
    .filter((v): v is string => typeof v === 'string' && v.includes('@'))
    .map((v) => v.toLowerCase())

  for (const email of recipients) {
    // Upsert, not create: the same mailbox can bounce for years. First reason
    // wins on re-report of the same kind; a later complaint upgrades the record.
    await db.emailSuppression.upsert({
      where: { email },
      create: { email, reason },
      update: { reason },
    })
  }

  // Addresses are student PII — the count and the reason are the whole event.
  logEvent({
    event: 'email_suppression.recorded',
    requestId: requestIdFrom(req),
    outcome: 'ok',
    detail: `reason=${reason} recipients=${recipients.length}`,
  })
  return new NextResponse(null, { status: 204 })
}

/**
 * Svix signature check (https://docs.svix.com/receiving/verifying-payloads/how-manual).
 *
 * `v1,<base64 HMAC-SHA256>` over `<id>.<timestamp>.<body>`, keyed by the secret's
 * base64 body. The header may carry several space-delimited signatures during a
 * secret rotation, so ANY match is a pass — compared in constant time, since a
 * `!==` here leaks how much of a forged signature was right.
 */
function verify(raw: string, req: NextRequest, secret: string): boolean {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signatures = req.headers.get('svix-signature')
  if (!id || !timestamp || !signatures) return false

  // Without this a captured request replays forever.
  const sentAt = Number(timestamp) * 1000
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > TOLERANCE_MS) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest()

  return signatures.split(' ').some((part) => {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) return false
    const provided = Buffer.from(value, 'base64')
    return provided.length === expected.length && timingSafeEqual(provided, expected)
  })
}
