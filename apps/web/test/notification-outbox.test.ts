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
const sendResult = { ok: true }

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/notifications/email', () => ({
  sendNotificationEmail: async (o: { to: string }) => {
    sent.push(o.to)
    return sendResult.ok
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
  sendResult.ok = true
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

    // Parked, not retried forever — a bad address must not consume every run.
    sent.length = 0
    await deliverNotificationEmails(10)
    expect(sent).toEqual([])
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
})
