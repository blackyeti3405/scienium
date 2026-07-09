/**
 * Optional notification email — a thin Resend REST call (no SDK dependency, same
 * fetch-based approach as the Upstash rate-limit store). Email is strictly
 * opt-in: a student must enable it in their notification preferences, and the
 * sender is a NO-OP unless `RESEND_API_KEY` is configured, so the in-app channel
 * always works without any email infra.
 *
 * Never throws — a delivery failure must never break the cron batch.
 */

import { serverEnv } from '@/lib/env'

const FROM = serverEnv.NOTIFICATION_EMAIL_FROM() ?? 'scienium <notifications@scienium.app>'

export function emailConfigured(): boolean {
  return !!serverEnv.RESEND_API_KEY()
}

export async function sendNotificationEmail(opts: {
  to: string
  subject: string
  body: string
}): Promise<boolean> {
  const apiKey = serverEnv.RESEND_API_KEY()
  if (!apiKey) return false // not configured — in-app notification stands alone

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
