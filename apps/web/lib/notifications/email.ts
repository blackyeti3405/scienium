import 'server-only'
/**
 * Optional notification email — a thin Resend REST call (no SDK dependency, same
 * fetch-based approach as the Upstash rate-limit store). Email is strictly
 * opt-in: a student must enable it in their notification preferences, and the
 * sender is a NO-OP unless `RESEND_API_KEY` is configured, so the in-app channel
 * always works without any email infra.
 *
 * Never throws — a delivery failure must never break the cron batch.
 *
 * Two guarantees are added here rather than at the call site, so no future
 * sender can forget them (P1-2):
 *
 *  - SUPPRESSION. A hard bounce or a spam complaint reported by Resend's webhook
 *    (`app/api/webhooks/resend`) parks the address in `email_suppressions`, and
 *    this function refuses to mail it again. Continuing to mail an address that
 *    bounced or reported us as spam is how a sending domain's reputation dies —
 *    and with it, every other student's reminders.
 *  - IDEMPOTENCY. `Idempotency-Key` makes the outbox's crash window survivable
 *    at the provider instead of at-least-once on our side. Resend keeps a key for
 *    24 hours and replies with the ORIGINAL response instead of sending again
 *    (https://resend.com/docs/dashboard/emails/idempotency-keys), which covers
 *    both the retry of a row whose `sent` write never landed and the duplicate a
 *    taken-over drain would otherwise produce.
 *
 *    Residual risk, accepted: a key is only good for 24 hours, so a row retried
 *    later than that (a queue parked over a weekend outage) can genuinely send
 *    twice, and a duplicate reminder is a better outcome than a silent one. The
 *    key deliberately excludes the attempt number — keying per attempt would
 *    dedupe nothing, since the crash window and the takeover BOTH re-send the
 *    same row under a new attempt.
 */

import { db } from '@/lib/db'
import { serverEnv } from '@/lib/env'

const FROM = serverEnv.NOTIFICATION_EMAIL_FROM() ?? 'scienium <notifications@scienium.app>'

export function emailConfigured(): boolean {
  return !!serverEnv.RESEND_API_KEY()
}

export async function sendNotificationEmail(opts: {
  to: string
  subject: string
  body: string
  /** Stable per logical send (the outbox row id) — see the module note. */
  idempotencyKey?: string
}): Promise<boolean> {
  const apiKey = serverEnv.RESEND_API_KEY()
  if (!apiKey) return false // not configured — in-app notification stands alone

  try {
    // Fail-closed: a suppression lookup that throws falls through to the catch
    // and reports failure, so an unreadable list never becomes permission to
    // mail a complained address.
    const suppressed = await db.emailSuppression.findUnique({
      where: { email: opts.to.toLowerCase() },
      select: { reason: true },
    })
    if (suppressed) {
      // No address, no subject, no body — the reason is the whole operator story.
      console.error(`[notifications/email] suppressed recipient (${suppressed.reason})`)
      return false
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        text: opts.body,
      }),
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) {
      console.error(`[notifications/email] Resend HTTP ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[notifications/email] send failed:', err)
    return false
  }
}