import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R5 — the email outbox.
 *
 * Reminder emails used to be sent inline, driven by the list of notifications a
 * run believed were fresh. `notifications.dedupe_key` kept the notification ROW
 * singular; nothing kept the SEND singular, because the send was keyed on a
 * run's in-memory belief. Two overlapping runs therefore emailed twice.
 *
 * These tests pin the delivery half: a fenced claim so two drains cannot both
 * send one row, a failure that returns to the queue rather than vanishing, and
 * a cap so a permanently-bad address is parked instead of retried forever.
 *
 * P1-2 adds the other half of the fence. Claiming wrote a token but settling
 * never checked it, so a drain whose lease expired mid-send could still write
 * the row it no longer owned. The dangerous state is the one where the NEW owner
 * is itself `sending`: a status-only predicate matches then, which is exactly
 * when it must not.
 */

interface Row {
  id: string
  recipient: string
  subject: string
  body: string
  status: string
  attempts: number
  claimToken: string | null
  claimedAt: Date | null
  sentAt: Date | null
  lastError: string | null
  createdAt: Date
}

let rows: Row[]
const sent: string[] = []
const sentKeys: (string | undefined)[] = []
const sendResult = { ok: true }
/** When held, a send parks in `held` until a test releases it — a drain frozen
 *  inside its provider call, which is the only place a lease can expire. */
const gate = { hold: false }
const held: Array<(ok: boolean) => void> = []

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/notifications/email', () => ({
  sendNotificationEmail: async (o: { to: string; idempotencyKey?: string }) => {
    sent.push(o.to)
    sentKeys.push(o.idempotencyKey)
    if (!gate.hold) return sendResult.ok
    return new Promise<boolean>((resolve) => held.push(resolve))
  },
}))

function matches(r: Row, where: any): boolean {
  if (where.id?.in && !where.id.in.includes(r.id)) return false
  if (where.id && typeof where.id === 'string' && r.id !== where.id) return false
  if (where.claimToken !== undefined && r.claimToken !== where.claimToken) return false
  if (where.status !== undefined && r.status !== where.status) return false
  if (where.attempts?.lt !== undefined && !(r.attempts < where.attempts.lt)) return false
  if (where.OR) {
    const any = where.OR.some((c: any) => {
      if (c.status && c.status !== r.status) return false
      if (c.claimedAt?.lt) return r.claimedAt !== null && r.claimedAt < c.claimedAt.lt
      return true
    })
    if (!any) return false
  }
  return true
}

vi.mock('@/lib/db', () => ({
  db: {
    notificationEmail: {
      findMany: async (args: any) => {
        const out = rows.filter((r) => matches(r, args.where ?? {}))
        return (args.take ? out.slice(0, args.take) : out).map((r) => ({ ...r }))
      },
      updateMany: async (args: any) => {
        let count = 0
        for (const r of rows) {
          if (!matches(r, args.where ?? {})) continue
          for (const [k, v] of Object.entries(args.data as Record<string, unknown>)) {
            if (k === 'attempts' && typeof v === 'object' && v !== null) {
              r.attempts += (v as { increment: number }).increment
            } else {
              ;(r as unknown as Record<string, unknown>)[k] = v
            }
          }
          count++
        }
        return { count }
      },
    },
  },
}))

import { deliverNotificationEmails } from '@/lib/notifications/outbox'
import { logEvent } from '@/lib/observability/log'

/** Lets the suspended drain's continuation run before the assertions. */
const flush = () => new Promise((r) => setTimeout(r, 0))
/** A drain that expired and wrote nothing announces itself here. */
const claimLost = () =>
  vi.mocked(logEvent).mock.calls.filter((c) => c[0]?.event === 'notification_outbox.claim_lost')
const staleClaimedAt = () => new Date(Date.now() - 10 * 60_000)

function row(over: Partial<Row> = {}): Row {
  return {
    id: `row_${rows.length + 1}`,
    recipient: `a${rows.length + 1}@example.com`,
    subject: 'Deadline soon',
    body: 'body',
    status: 'pending',
    attempts: 0,
    claimToken: null,
    claimedAt: null,
    sentAt: null,
    lastError: null,
    createdAt: new Date(),
    ...over,
  }
}

beforeEach(() => {
  rows = []
  sent.length = 0
  sentKeys.length = 0
  sendResult.ok = true
  gate.hold = false
  held.length = 0
  vi.mocked(logEvent).mockClear()
})

describe('outbox delivery', () => {
  it('sends a queued email once and marks it sent', async () => {
    rows.push(row())

    expect(await deliverNotificationEmails(10)).toBe(1)
    expect(sent).toEqual(['a1@example.com'])
    expect(rows[0]!.status).toBe('sent')
    expect(rows[0]!.sentAt).toBeInstanceOf(Date)
    expect(rows[0]!.claimToken).toBeNull()
  })

  it('a second drain finds nothing left to send', async () => {
    rows.push(row())
    await deliverNotificationEmails(10)
    sent.length = 0

    expect(await deliverNotificationEmails(10)).toBe(0)
    expect(sent).toEqual([])
  })

  it('two overlapping drains never send the same row twice', async () => {
    for (let i = 0; i < 5; i++) rows.push(row())

    await Promise.all([deliverNotificationEmails(10), deliverNotificationEmails(10)])

    expect(sent).toHaveLength(5)
    expect(new Set(sent).size).toBe(5)
  })

  it('leaves an in-flight row alone until its lease expires', async () => {
    rows.push(row({ status: 'sending', claimToken: 'other', claimedAt: new Date(), attempts: 1 }))

    expect(await deliverNotificationEmails(10)).toBe(0)
    expect(sent).toEqual([])
  })

  it('takes over a row whose drain died mid-send', async () => {
    rows.push(
      row({
        status: 'sending',
        claimToken: 'dead-drain',
        claimedAt: new Date(Date.now() - 10 * 60_000),
        attempts: 1,
      }),
    )

    expect(await deliverNotificationEmails(10)).toBe(1)
    expect(rows[0]!.status).toBe('sent')
  })

  it('a failed send returns to the queue rather than vanishing', async () => {
    rows.push(row())
    sendResult.ok = false

    expect(await deliverNotificationEmails(10)).toBe(0)
    expect(rows[0]!.status).toBe('pending')
    expect(rows[0]!.attempts).toBe(1)
    expect(rows[0]!.claimToken).toBeNull()
  })

  it('parks a permanently-failing address after its attempts run out', async () => {
    rows.push(row())
    sendResult.ok = false

    await deliverNotificationEmails(10)
    await deliverNotificationEmails(10)
    await deliverNotificationEmails(10)
    expect(rows[0]!.status).toBe('failed')
    expect(rows[0]!.attempts).toBe(3)

    // The ATTEMPT CAP, not the terminal status, is what parks it. The previous
    // version re-drained and asserted `sent` was empty — but the drain's `OR`
    // only selects pending/sending, so it found nothing because of `failed`,
    // and the cap it credited was never exercised. Force the row back to
    // `pending` with its attempts intact: only `attempts: { lt: MAX_ATTEMPTS }`
    // can keep it out of the batch now.
    sent.length = 0
    rows[0]!.status = 'pending'
    await deliverNotificationEmails(10)
    expect(sent).toEqual([])
    expect(rows[0]!.attempts).toBe(3) // not even claimed
  })

  it('never throws: a broken outbox must not fail a cron whose real work succeeded', async () => {
    const { db } = await import('@/lib/db')
    vi.spyOn(db.notificationEmail, 'findMany').mockRejectedValueOnce(new Error('table gone'))

    await expect(deliverNotificationEmails(10)).resolves.toBe(0)
  })

  it('respects the batch limit so one run cannot be swamped', async () => {
    for (let i = 0; i < 30; i++) rows.push(row())

    expect(await deliverNotificationEmails(10)).toBe(10)
    expect(sent).toHaveLength(10)
  })

  it('sends the row id as the provider idempotency key, not the attempt', async () => {
    // The crash window (provider accepted, `sent` write never landed) and a
    // taken-over drain's duplicate are both "this row, sent twice". A key that
    // varied per attempt or per claim would dedupe neither.
    rows.push(row())
    await deliverNotificationEmails(10)
    expect(sentKeys).toEqual([rows[0]!.id])

    rows[0]!.status = 'pending'
    rows[0]!.attempts = 1
    await deliverNotificationEmails(10)
    expect(sentKeys).toEqual([rows[0]!.id, rows[0]!.id])
  })
})

describe('a replaced drain cannot settle the row it lost', () => {
  /** Claim under drain A, then expire its lease while it sits in its send. */
  async function stallPastLease() {
    rows.push(row())
    gate.hold = true
    const a = deliverNotificationEmails(10)
    await flush()
    const aToken = rows[0]!.claimToken
    expect(aToken).not.toBeNull()
    rows[0]!.claimedAt = staleClaimedAt()
    return { a, aToken }
  }

  it('does not requeue a row while the new owner is still sending it', async () => {
    const { a, aToken } = await stallPastLease()

    // B takes over and is itself suspended in its provider call: the row is
    // `sending` for BOTH drains, which is precisely what status cannot tell
    // apart. Drop the `claimToken` clause from `settle` and this test fails —
    // A's requeue lands, and a third drain then sends the same email again.
    const b = deliverNotificationEmails(10)
    await flush()
    const bToken = rows[0]!.claimToken
    expect(bToken).not.toBe(aToken)

    held[0]!(false) // A's send finally fails; A tries to hand the row back
    await a
    expect(rows[0]!.status).toBe('sending')
    expect(rows[0]!.claimToken).toBe(bToken)
    expect(rows[0]!.claimedAt).not.toBeNull()
    expect(rows[0]!.lastError).toBeNull()
    expect(claimLost()).toHaveLength(1)

    held[1]!(true)
    expect(await b).toBe(1)
    expect(rows[0]!.status).toBe('sent')
  })

  it('does not mark sent a row a later drain claimed after the new owner settled', async () => {
    const { a, aToken } = await stallPastLease()

    // B takes over, fails, and SETTLES the row back to `pending`.
    gate.hold = false
    sendResult.ok = false
    expect(await deliverNotificationEmails(10)).toBe(0)
    expect(rows[0]!.status).toBe('pending')
    expect(rows[0]!.claimToken).toBeNull()

    // C then claims it for a fresh attempt and is mid-send.
    gate.hold = true
    sendResult.ok = true
    const c = deliverNotificationEmails(10)
    await flush()
    const cToken = rows[0]!.claimToken
    expect(cToken).not.toBe(aToken)

    // A returns successful long after the drain that replaced it already
    // settled. Marking this `sent` would credit C's in-flight send to A's claim
    // and null out the token C still needs.
    held[0]!(true)
    await a
    expect(rows[0]!.status).toBe('sending')
    expect(rows[0]!.claimToken).toBe(cToken)
    expect(rows[0]!.sentAt).toBeNull()
    expect(claimLost()).toHaveLength(1)

    held[1]!(true)
    expect(await c).toBe(1)
    expect(rows[0]!.status).toBe('sent')
    expect(rows[0]!.sentAt).toBeInstanceOf(Date)
  })
})
