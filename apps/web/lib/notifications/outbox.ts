import 'server-only'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { mapWithConcurrency } from '@/lib/concurrency'
import { sendNotificationEmail } from '@/lib/notifications/email'
import { logEvent } from '@/lib/observability/log'

/**
 * Email outbox delivery (REFACTOR2 P1-R5).
 *
 * Reminder emails used to be sent inline from the roster pass, driven by the
 * list of notifications that run believed were fresh. Two overlapping runs
 * therefore both emailed, even though `notifications.dedupe_key` kept the
 * notification ROW singular — the send was keyed on a run's in-memory belief
 * rather than on anything durable.
 *
 * Now the roster pass only ENQUEUES, in the same transaction as the notification
 * rows, and `(dedupeKey, recipient)` unique makes "one email per event per
 * person" a property of PostgreSQL. This module drains that queue under a fenced
 * claim, so two concurrent drains cannot both send the same row.
 *
 * At-most-once, not exactly-once: a process that dies after the provider
 * accepted the message but before the `sent` write leaves the row `sending`, and
 * a later run retries it — one duplicate is a better failure than a reminder
 * silently never arriving. The claim token bounds that to the crash case.
 */

/** A `sending` row older than this is a crashed drain's and may be retried. */
const SEND_LEASE_MS = 5 * 60_000
/** Attempts before a row is parked as `failed` rather than retried forever. */
const MAX_ATTEMPTS = 3
/** Provider sends in flight at once. */
const SEND_CONCURRENCY = 5

export interface OutboxRow {
  id: string
  recipient: string
  subject: string
  body: string
  attempts: number
}

/**
 * Deliver up to `limit` queued emails. Returns how many were sent.
 *
 * Never throws: this runs at the end of a cron whose primary job (computing
 * reminders) has already succeeded, and a delivery problem must not turn that
 * into a failed run.
 */
export async function deliverNotificationEmails(limit: number): Promise<number> {
  try {
    const claimed = await claimBatch(limit)
    if (claimed.length === 0) return 0

    const results = await mapWithConcurrency(claimed, SEND_CONCURRENCY, async (row) => {
      // `sendNotificationEmail` reports success as a boolean and never throws.
      const ok = await sendNotificationEmail({
        to: row.recipient,
        subject: row.subject,
        body: row.body,
      })
      await settle(row, ok)
      return ok
    })

    const sent = results.filter(Boolean).length
    if (sent !== claimed.length) {
      logEvent({
        event: 'notification_outbox.partial',
        outcome: 'error',
        detail: `claimed=${claimed.length} sent=${sent}`,
      })
    }
    return sent
  } catch (err) {
    logEvent({
      event: 'notification_outbox.drain_failed',
      outcome: 'error',
      detail: err instanceof Error ? err.constructor.name : 'unknown',
    })
    return 0
  }
}

/**
 * Take ownership of a batch.
 *
 * Stamp first, read second: `updateMany` cannot return rows, so the token is
 * what turns "I updated some number of rows" into "these exact rows are mine".
 * Same fenced-claim shape as the paper-job lease (P1-S5).
 */
async function claimBatch(limit: number): Promise<OutboxRow[]> {
  const now = new Date()
  const staleBefore = new Date(now.getTime() - SEND_LEASE_MS)

  const candidates = await db.notificationEmail.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [
        { status: 'pending' },
        // A drain that died mid-send; its lease has expired.
        { status: 'sending', claimedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })
  if (candidates.length === 0) return []

  const claimToken = randomUUID()
  await db.notificationEmail.updateMany({
    where: {
      id: { in: candidates.map((c) => c.id) },
      attempts: { lt: MAX_ATTEMPTS },
      // Re-assert the selection predicate on the WRITE: between the read above
      // and here, another drain may legitimately have claimed these.
      OR: [{ status: 'pending' }, { status: 'sending', claimedAt: { lt: staleBefore } }],
    },
    data: { status: 'sending', claimToken, claimedAt: now, attempts: { increment: 1 } },
  })

  return db.notificationEmail.findMany({
    where: { claimToken },
    select: { id: true, recipient: true, subject: true, body: true, attempts: true },
  })
}

/**
 * Terminalize one row. A failure that has used its last attempt is parked as
 * `failed` rather than left to be retried forever; anything else returns to
 * `pending` for the next drain.
 */
async function settle(row: OutboxRow, ok: boolean): Promise<void> {
  const exhausted = row.attempts >= MAX_ATTEMPTS
  await db.notificationEmail
    .updateMany({
      where: { id: row.id, status: 'sending' },
      data: ok
        ? { status: 'sent', sentAt: new Date(), claimToken: null, lastError: null }
        : exhausted
          ? { status: 'failed', claimToken: null, lastError: 'send failed' }
          : { status: 'pending', claimToken: null, claimedAt: null, lastError: 'send failed' },
    })
    .catch(() => {
      // The email is already sent or already failed; losing the bookkeeping write
      // costs at most one retry, and must not fail the drain.
    })
}
