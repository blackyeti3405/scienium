import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `resolveShowcaseViewer` is the only thing that decides who counts as a
 * moderator (P0-R3) — `canViewShowcase` just trusts the list it produces. The
 * predicate's own tests use hand-built viewers, so nothing else pins the rule
 * that `moderatorTeamIds` is derived from classes the caller actually teaches.
 *
 * Also covers `makeShareToken` (P1-R7).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  teamFindMany: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }))
vi.mock('@/lib/env', () => ({ viewFingerprintSalt: () => 'x'.repeat(16) }))
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: mocks.userFindUnique },
    team: { findMany: mocks.teamFindMany },
  },
}))

import { makeShareToken, resolveShowcaseViewer } from '@/lib/showcase-server'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.teamFindMany.mockResolvedValue([])
})

describe('resolveShowcaseViewer', () => {
  it('returns null when nobody is signed in', async () => {
    mocks.auth.mockResolvedValue({ userId: null })

    expect(await resolveShowcaseViewer()).toBeNull()
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it('gives a student no moderator scope and never runs the teacher query', async () => {
    mocks.auth.mockResolvedValue({ userId: 'clerk_s' })
    mocks.userFindUnique.mockResolvedValue({
      id: 'u1',
      role: 'student',
      schoolId: 'school_A',
      teamMemberships: [{ teamId: 'team_1' }],
    })

    const viewer = await resolveShowcaseViewer()

    expect(viewer).toEqual({
      userId: 'clerk_s',
      schoolId: 'school_A',
      teamIds: ['team_1'],
      moderatorTeamIds: [],
    })
    // The extra query must not run on the anonymous/student public-page path.
    expect(mocks.teamFindMany).not.toHaveBeenCalled()
  })

  it('scopes a teacher to teams with a member in a class THEY own', async () => {
    mocks.auth.mockResolvedValue({ userId: 'clerk_t' })
    mocks.userFindUnique.mockResolvedValue({
      id: 'teacher_1',
      role: 'teacher',
      schoolId: null,
      teamMemberships: [],
    })
    mocks.teamFindMany.mockResolvedValue([{ id: 'team_1' }, { id: 'team_2' }])

    const viewer = await resolveShowcaseViewer()

    expect(viewer?.moderatorTeamIds).toEqual(['team_1', 'team_2'])
    // The ownership predicate is what stops this being a global teacher bypass.
    expect(mocks.teamFindMany).toHaveBeenCalledWith({
      where: { members: { some: { user: { class: { teacherId: 'teacher_1' } } } } },
      select: { id: true },
    })
  })

  it('gives a teacher who owns no classes an empty moderator scope', async () => {
    mocks.auth.mockResolvedValue({ userId: 'clerk_t' })
    mocks.userFindUnique.mockResolvedValue({
      id: 'teacher_2',
      role: 'teacher',
      schoolId: null,
      teamMemberships: [],
    })
    mocks.teamFindMany.mockResolvedValue([])

    expect((await resolveShowcaseViewer())?.moderatorTeamIds).toEqual([])
  })

  it('treats admin as a moderator too', async () => {
    mocks.auth.mockResolvedValue({ userId: 'clerk_a' })
    mocks.userFindUnique.mockResolvedValue({
      id: 'admin_1',
      role: 'admin',
      schoolId: null,
      teamMemberships: [],
    })
    mocks.teamFindMany.mockResolvedValue([{ id: 'team_9' }])

    expect((await resolveShowcaseViewer())?.moderatorTeamIds).toEqual(['team_9'])
  })

  it('degrades to a scope-less viewer when the Clerk identity has no row yet', async () => {
    mocks.auth.mockResolvedValue({ userId: 'clerk_new' })
    mocks.userFindUnique.mockResolvedValue(null)

    expect(await resolveShowcaseViewer()).toEqual({
      userId: 'clerk_new',
      schoolId: null,
      teamIds: [],
      moderatorTeamIds: [],
    })
  })
})

describe('makeShareToken (P1-R7)', () => {
  it('carries at least 128 bits and is URL-path safe', () => {
    const t = makeShareToken()
    // 16 random bytes → 22 base64url characters, no padding or reserved chars.
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('does not repeat', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => makeShareToken()))
    expect(tokens.size).toBe(500)
  })
})
