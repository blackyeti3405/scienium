import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * REFACTOR2 §0.8 — the reminder destination was unverified free text.
 *
 * `PUT /api/notifications/prefs` accepted any syntactically valid address and
 * stored it as the send-to for that member's deadline mail. Nothing tied it to
 * an address Clerk had verified for them, so a student could turn the app into
 * a recurring mailer aimed at someone who never signed up for anything.
 *
 * The attack below is exactly that request. It must be REFUSED at the boundary
 * rather than ignored: a silently-dropped field reads as accepted to whoever
 * sent it.
 */

vi.mock('server-only', () => ({}))

const { requireTeamContext, upsert, findUnique } = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext }))
vi.mock('@/lib/db', () => ({
  db: { notificationPref: { upsert, findUnique: async () => null }, user: { findUnique } },
}))

import { GET, PUT } from '@/app/api/notifications/prefs/route'

const ACCOUNT_EMAIL = 'student@school.test'

function put(body: unknown): Promise<Response> {
  return PUT(
    new NextRequest('http://localhost:3000/api/notifications/prefs', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  upsert.mockClear()
  requireTeamContext.mockResolvedValue({
    ctx: { userId: 'clerk_1', dbUserId: 'user_1', teamId: 'team_1', phase: 'plan_refinement', labType: null },
    error: null,
  })
  findUnique.mockResolvedValue({ email: ACCOUNT_EMAIL, deletedAt: null })
  upsert.mockImplementation(async (args: { create: unknown; update: unknown }) => ({
    emailEnabled: true,
    deadlineDays: [30, 14, 7, 1],
    ...(args.update as object),
  }))
})

describe('§0.8 — a member cannot choose where reminders are sent', () => {
  it("REFUSES a request carrying someone else's address", async () => {
    const res = await put({ emailEnabled: true, email: 'a-stranger@example.com' })

    expect(res.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('enables reminders to the Clerk-verified account address with no address in the body', async () => {
    const res = await put({ emailEnabled: true, deadlineDays: [7] })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ emailEnabled: true, email: ACCOUNT_EMAIL })
    // Nothing address-shaped is ever written.
    expect(JSON.stringify(upsert.mock.calls[0]![0])).not.toContain('@')
  })

  it('refuses to arm reminders for an account with no routable address', async () => {
    findUnique.mockResolvedValue({ email: 'deleted+u1@invalid.scienium.app', deletedAt: new Date() })

    const res = await put({ emailEnabled: true })

    expect(res.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('reports the destination on GET so the UI can say where mail goes', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/notifications/prefs'))

    expect(await res.json()).toMatchObject({ email: ACCOUNT_EMAIL, emailEnabled: false })
  })
})
