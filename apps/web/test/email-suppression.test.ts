import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Bounce and complaint suppression (REFACTOR2 P1-2).
 *
 * Reminder email had no suppression at all: a hard bounce or a spam complaint
 * changed nothing, so the outbox re-mailed a dead mailbox on every future
 * deadline. That is how a sending domain's reputation dies, taking every other
 * student's reminders with it.
 *
 * Two halves are pinned here. The WEBHOOK is a write endpoint for a party we do
 * not authenticate with a session, so an unsigned or replayed request must not
 * be able to mute an arbitrary student's reminders. The SENDER must consult the
 * list, and must fail closed if it cannot read it — an unreadable suppression
 * list is not permission to mail a complained address.
 */

const SECRET_BYTES = Buffer.from('scienium-webhook-signing-key-32b')
const SECRET = `whsec_${SECRET_BYTES.toString('base64')}`

const mockEnv = {
  RESEND_WEBHOOK_SECRET: vi.fn<() => string | undefined>(() => SECRET),
  RESEND_API_KEY: vi.fn<() => string | undefined>(() => 're_test_key'),
  NOTIFICATION_EMAIL_FROM: vi.fn<() => string | undefined>(() => undefined),
}

let suppressions: { email: string; reason: string }[]
const findUnique = vi.fn(async ({ where }: { where: { email: string } }) => {
  return suppressions.find((s) => s.email === where.email) ?? null
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({ serverEnv: mockEnv }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn(), requestIdFrom: () => 'req_test' }))
vi.mock('@/lib/db', () => ({
  db: {
    emailSuppression: {
      findUnique: (args: { where: { email: string } }) => findUnique(args),
      upsert: async ({
        where,
        create,
      }: {
        where: { email: string }
        create: { email: string; reason: string }
      }) => {
        const existing = suppressions.find((s) => s.email === where.email)
        if (existing) existing.reason = create.reason
        else suppressions.push({ ...create })
        return create
      },
    },
  },
}))

const { POST } = await import('@/app/api/webhooks/resend/route')
const { sendNotificationEmail } = await import('@/lib/notifications/email')

/** A request signed the way Svix signs one — the real scheme, not a stub. */
function webhook(
  payload: unknown,
  over: { secret?: Buffer; timestamp?: number; signature?: string } = {},
): NextRequest {
  const body = JSON.stringify(payload)
  const id = 'msg_test'
  const timestamp = over.timestamp ?? Math.floor(Date.now() / 1000)
  const signature =
    over.signature ??
    `v1,${createHmac('sha256', over.secret ?? SECRET_BYTES)
      .update(`${id}.${timestamp}.${body}`)
      .digest('base64')}`
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers: {
      'svix-id': id,
      'svix-timestamp': String(timestamp),
      'svix-signature': signature,
    },
  })
}

const bounce = (to: string[] = ['ada@example.com']) => ({ type: 'email.bounced', data: { to } })

beforeEach(() => {
  vi.restoreAllMocks() // hands `fetch` back before the next test spies on it
  suppressions = []
  findUnique.mockClear()
  mockEnv.RESEND_WEBHOOK_SECRET.mockReturnValue(SECRET)
  mockEnv.RESEND_API_KEY.mockReturnValue('re_test_key')
})

describe('the suppression webhook', () => {
  it('records a hard bounce and a complaint', async () => {
    expect((await POST(webhook(bounce()))).status).toBe(204)
    expect(suppressions).toEqual([{ email: 'ada@example.com', reason: 'bounced' }])

    await POST(webhook({ type: 'email.complained', data: { to: ['grace@example.com'] } }))
    expect(suppressions.map((s) => s.reason).sort()).toEqual(['bounced', 'complained'])
  })

  it('lowercases the address so the sender’s lookup cannot miss it', async () => {
    await POST(webhook(bounce(['Ada@Example.COM'])))
    expect(suppressions[0]!.email).toBe('ada@example.com')
  })

  it('rejects a forged signature without writing anything', async () => {
    const res = await POST(webhook(bounce(), { secret: Buffer.from('not-the-signing-key-at-all') }))
    expect(res.status).toBe(401)
    expect(suppressions).toEqual([])
  })

  it('rejects a replayed request whose timestamp is outside the window', async () => {
    // Correctly signed, but captured an hour ago: without the timestamp check a
    // captured suppression can be replayed at any point in the future.
    const res = await POST(webhook(bounce(), { timestamp: Math.floor(Date.now() / 1000) - 3_600 }))
    expect(res.status).toBe(401)
    expect(suppressions).toEqual([])
  })

  it('rejects a request with no signature headers at all', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/webhooks/resend', {
        method: 'POST',
        body: JSON.stringify(bounce()),
      }),
    )
    expect(res.status).toBe(401)
    expect(suppressions).toEqual([])
  })

  it('fails CLOSED (503) when no signing secret is configured', async () => {
    mockEnv.RESEND_WEBHOOK_SECRET.mockReturnValue(undefined)
    const res = await POST(webhook(bounce()))
    expect(res.status).toBe(503)
    expect(suppressions).toEqual([])
  })

  it('acknowledges other events without suppressing anyone', async () => {
    // A `delivered` or `delivery_delayed` stream is far larger than the two that
    // matter, and a 4xx would make Resend retry events we never want.
    for (const type of ['email.delivered', 'email.delivery_delayed', 'email.opened']) {
      expect((await POST(webhook({ type, data: { to: ['ada@example.com'] } }))).status).toBe(204)
    }
    expect(suppressions).toEqual([])
  })
})

describe('the sender consults the list', () => {
  it('refuses a suppressed address without calling the provider', async () => {
    suppressions.push({ email: 'ada@example.com', reason: 'complained' })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const ok = await sendNotificationEmail({ to: 'Ada@example.com', subject: 's', body: 'b' })

    expect(ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fails closed when the list cannot be read', async () => {
    findUnique.mockRejectedValueOnce(new Error('connection reset'))
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const ok = await sendNotificationEmail({ to: 'ada@example.com', subject: 's', body: 'b' })

    expect(ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends an unsuppressed address with the idempotency key it was given', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))

    const ok = await sendNotificationEmail({
      to: 'ada@example.com',
      subject: 's',
      body: 'b',
      idempotencyKey: 'outbox_row_1',
    })

    expect(ok).toBe(true)
    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>
    expect(headers['Idempotency-Key']).toBe('outbox_row_1')
  })
})
