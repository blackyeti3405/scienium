import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Team-join invariants (PILOT-3 matrix: join/invite races). The join runs in a
 * transaction that serializes on the team's membership lock and re-checks the
 * invite + capacity INSIDE it, so the racing outcomes are deterministic: the
 * loser of an invite race sees 409 "already been used", the loser of a
 * capacity race sees 409 "already full", and re-joining your own team is
 * idempotent without burning the code. Cross-class joins are allowed by design
 * (ADR-004: class membership is per-student).
 */

const mocks = vi.hoisted(() => ({
  requireUserContext: vi.fn(),
  currentUser: vi.fn(),
  applySchoolAndClass: vi.fn(() => Promise.resolve()),
  syncClerkDisplayName: vi.fn(() => Promise.resolve()),
  logActivity: vi.fn(() => Promise.resolve()),
  lockAggregate: vi.fn(() => Promise.resolve()),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  txInviteFindUnique: vi.fn(),
  txInviteUpdateMany: vi.fn(() => Promise.resolve({ count: 1 })),
  txTeamFindUnique: vi.fn(),
  txMemberCreate: vi.fn(() => Promise.resolve({})),
  txUserUpdate: vi.fn(() => Promise.resolve({})),
}))

const tx = {
  teamInvite: { findUnique: mocks.txInviteFindUnique, updateMany: mocks.txInviteUpdateMany },
  team: { findUnique: mocks.txTeamFindUnique },
  teamMember: { create: mocks.txMemberCreate },
  user: { update: mocks.txUserUpdate },
}

vi.mock('@/lib/api/route-context', () => ({ requireUserContext: mocks.requireUserContext }))
vi.mock('@clerk/nextjs/server', () => ({ currentUser: mocks.currentUser, auth: vi.fn() }))
vi.mock('@/lib/onboarding/profile', () => ({
  applySchoolAndClass: mocks.applySchoolAndClass,
  syncClerkDisplayName: mocks.syncClerkDisplayName,
  resolvePrimaryEmail: (u: { primaryEmailAddressId?: string | null; emailAddresses?: { id: string; emailAddress: string }[] } | null) =>
    u?.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
    u?.emailAddresses?.[0]?.emailAddress ??
    null,
}))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mocks.userFindUnique, create: mocks.userCreate },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  },
}))

import { POST } from '@/app/api/team/join/route'

function joinReq(code = 'ABC123'): NextRequest {
  return new NextRequest('http://app.example.com/api/team/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

const USER = { id: 'db_user_1', name: 'Sam', classId: 'class_mine' }
const FUTURE = new Date(Date.now() + 60_000)

function invite(overrides: Record<string, unknown> = {}) {
  return { teamId: 'team_1', usedByUserId: null, expiresAt: FUTURE, ...overrides }
}

function team(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team_1',
    classId: null,
    maxMembers: 3,
    members: [{ userId: 'other_member' }],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireUserContext.mockResolvedValue({ ctx: { userId: 'clerk_1' }, error: null })
  mocks.currentUser.mockResolvedValue({
    firstName: 'Sam',
    primaryEmailAddressId: 'em_1',
    emailAddresses: [{ id: 'em_1', emailAddress: 'sam@example.com' }],
  })
  mocks.userFindUnique.mockResolvedValue(USER)
  // clearAllMocks keeps implementations — restore the "consume succeeded" default.
  mocks.txInviteUpdateMany.mockResolvedValue({ count: 1 })
})

describe('team join invariants', () => {
  it('an unknown code is 404 and creates nothing', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(null)
    const res = await POST(joinReq())
    expect(res.status).toBe(404)
    expect(mocks.txMemberCreate).not.toHaveBeenCalled()
  })

  it('the loser of an invite race (code already burned) gets 409', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite({ usedByUserId: 'someone_else' }))
    const res = await POST(joinReq())
    expect(res.status).toBe(409)
    expect(mocks.txMemberCreate).not.toHaveBeenCalled()
  })

  it('an expired code is 410', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite({ expiresAt: new Date(Date.now() - 1) }))
    const res = await POST(joinReq())
    expect(res.status).toBe(410)
  })

  it('the loser of a capacity race gets 409 after the lock, with no membership row', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite())
    mocks.txTeamFindUnique.mockResolvedValue(
      team({ maxMembers: 2, members: [{ userId: 'a' }, { userId: 'b' }] }),
    )

    const res = await POST(joinReq())

    expect(res.status).toBe(409)
    expect(mocks.txMemberCreate).not.toHaveBeenCalled()
    // Capacity must be evaluated under the membership lock (the race guard).
    expect(mocks.lockAggregate).toHaveBeenCalledWith(tx, 'team-membership:team_1')
    expect(mocks.lockAggregate.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.txTeamFindUnique.mock.invocationCallOrder[0]!,
    )
  })

  it('re-joining your own team is idempotent and leaves the code unused', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite())
    mocks.txTeamFindUnique.mockResolvedValue(team({ members: [{ userId: USER.id }] }))

    const res = await POST(joinReq())

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ teamId: 'team_1' })
    expect(mocks.txMemberCreate).not.toHaveBeenCalled()
    expect(mocks.txInviteUpdateMany).not.toHaveBeenCalled()
  })

  it('a successful join adds the member, burns the code, and sets the active team', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite())
    mocks.txTeamFindUnique.mockResolvedValue(team())

    const res = await POST(joinReq())

    expect(res.status).toBe(200)
    expect(mocks.txMemberCreate).toHaveBeenCalledWith({
      data: { userId: USER.id, teamId: 'team_1', role: 'member' },
    })
    // The code must be consumed CONDITIONALLY (unused + unexpired) and BEFORE
    // the membership row exists, so a racing joiner's whole transaction rolls
    // back rather than joining on a spent code.
    expect(mocks.txInviteUpdateMany).toHaveBeenCalledWith({
      where: { code: 'ABC123', usedByUserId: null, expiresAt: { gt: expect.any(Date) } },
      data: { usedByUserId: USER.id, usedAt: expect.any(Date) },
    })
    expect(mocks.txInviteUpdateMany.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.txMemberCreate.mock.invocationCallOrder[0]!,
    )
    expect(mocks.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activeTeamId: 'team_1' } }),
    )
  })

  // REFACTOR2 P1-S1: the pre-read is a stale snapshot. Both racing joiners see
  // `usedByUserId: null` and serialize on the team lock; only the conditional
  // consume can tell them apart. `count: 0` IS the loser.
  it('the loser of a true interleaved race is rejected by the conditional consume', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite()) // stale: still looks unused
    mocks.txTeamFindUnique.mockResolvedValue(team())
    mocks.txInviteUpdateMany.mockResolvedValue({ count: 0 }) // the other joiner won

    const res = await POST(joinReq())

    expect(res.status).toBe(409)
    expect(mocks.txMemberCreate).not.toHaveBeenCalled()
  })

  it('a cross-class join is allowed by design (ADR-004: per-student class membership)', async () => {
    mocks.txInviteFindUnique.mockResolvedValue(invite())
    mocks.txTeamFindUnique.mockResolvedValue(team({ classId: 'class_other' }))

    const res = await POST(joinReq())

    expect(res.status).toBe(200)
    expect(mocks.txMemberCreate).toHaveBeenCalled()
  })
})
