import 'server-only'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { mapWithConcurrency } from '@/lib/concurrency'
import { sendNotificationEmail } from '@/lib/notifications/email'
import { logEvent } from '@/lib/observability/log'
import { recordSecurityEvent } from '@/lib/observability/security-event'

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
 * The claim token is ownership, not decoration (P1-2): it travels with the
 * claimed row and every settlement is a compare-and-set on it, so a drain whose
 * lease expired and was taken over writes NOTHING. Guarding on status alone is
 * not enough — the dangerous window is the one where the new owner is itself
 * `sending`, which a status-only predicate cannot tell apart from the stale
 * owner's own claim.
 *
 * CRASH WINDOW (decided, P1-2). Between the provider accepting the message and
 * the local `sent` write there is no atomicity to be had: a process that dies in
 * between leaves the row `sending`, and a later run retries it. Resend supports
 * idempotency keys, so the retry is deduped AT THE PROVIDER rather than merely
 * tolerated — `sendNotificationEmail` sends `Idempotency-Key: <row id>`, which is
 * stable across attempts and across owners precisely so a crash retry and a
 * taken-over drain's duplicate collapse into the one send Resend already made.
 * The residual risk is bounded and stated in `lib/notifications/email.ts`.
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
  /** This drain's proof of ownership. Every settlement below is a CAS on it. */
  claimToken: string
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
        // The ROW id, not this attempt's token: the crash window and the
        // taken-over-drain duplicate are both "this same row, sent twice".
        idempotencyKey: row.id,
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

  const claimed = await db.notificationEmail.findMany({
    where: { claimToken },
    select: { id: true, recipient: true, subject: true, body: true, attempts: true },
  })
  // The token travels WITH the work. Re-reading it at settlement time would read
  // whatever the current owner wrote, which is exactly the thing being checked.
  return claimed.map((row) => ({ ...row, claimToken }))
}

/**
 * Terminalize one row. A failure that has used its last attempt is parked as
 * `failed` rather than left to be retried forever; anything else returns to
 * `pending` for the next drain.
 *
 * Fenced on the claim token: a drain that was taken over while its provider call
 * was in flight settles nothing. Without the token this write matches whenever
 * the row is `sending` — including while the NEW owner is sending it — so a
 * stale drain could hand a row that is actively being delivered back to
 * `pending` and invite a third send.
 */
async function settle(row: OutboxRow, ok: boolean): Promise<void> {
  const exhausted = row.attempts >= MAX_ATTEMPTS
  if (!ok && exhausted) {
    // A parked row is a student who will never get their reminder, and nothing
    // retries it (REFACTOR2 P1-5). Keyed to the ROW, so a drain that crashes and
    // retries the same settlement appends one dead-letter event, not two — and
    // the threshold therefore counts DISTINCT stuck jobs rather than attempts.
    void recordSecurityEvent({
      kind: 'worker.dead_letter',
      outcome: 'error',
      actorType: 'system',
      targetType: 'notification_email',
      targetId: row.id,
      reason: 'attempts_exhausted',
      dedupeKey: `dead_letter:notification_email:${row.id}`,
    })
  }
  const settled = await db.notificationEmail
    .updateMany({
      where: { id: row.id, status: 'sending', claimToken: row.claimToken },
      data: ok
        ? { status: 'sent', sentAt: new Date(), claimToken: null, lastError: null }
        : exhausted
          ? { status: 'failed', claimToken: null, lastError: 'send failed' }
          : { status: 'pending', claimToken: null, claimedAt: null, lastError: 'send failed' },
    })
    // A database blip, not a lost claim: `null` skips the ownership event, and
    // the lease means the row is retried anyway. Must not fail the drain.
    .catch(() => null)

  if (settled?.count === 0) {
    // Ids and a bounded state name only — never the recipient, subject, or body.
    logEvent({
      event: 'notification_outbox.claim_lost',
      outcome: 'error',
      detail: `row=${row.id} attempted=${ok ? 'sent' : exhausted ? 'failed' : 'pending'}`,
    })
  }
}
