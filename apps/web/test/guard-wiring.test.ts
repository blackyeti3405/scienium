import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Wiring tests: the three shared guards actually INVOKE the CSRF check (and in
 * the right order). `assertSameOrigin` itself is covered by same-origin.test.ts,
 * but nothing previously proved the guards call it — deleting one call site
 * would regress CSRF on every mutation behind that guard with a green suite.
 *
 * Ordering pinned here mirrors the implementations: auth → rate limit → CSRF →
 * data access. A cross-origin request must be rejected BEFORE any DB resolution
 * runs, so the CSRF failure cases also assert the resolver was never called.
 */

vi.mock('server-only', () => ({}))

const auth = vi.fn()
const currentUser = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => auth(),
  currentUser: () => currentUser(),
}))

const enforceRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}))

const resolveActiveTeam = vi.fn()
vi.mock('@/lib/team/context', () => ({
  resolveActiveTeam: (...args: unknown[]) => resolveActiveTeam(...args),
}))

const dbUserFindUnique = vi.fn()
const dbClassFindMany = vi.fn()
vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => dbUserFindUnique(...args) },
    class: { findMany: (...args: unknown[]) => dbClassFindMany(...args) },
  },
}))

import { requireTeamContext, requireUserContext } from '@/lib/api/route-context'
import { requireTeacher } from '@/lib/teacher/auth'

/** POST from a foreign origin — the request every one of these must reject. */
function crossOriginPost(): NextRequest {
  return new NextRequest('http://localhost:3000/api/anything', {
    method: 'POST',
    headers: { origin: 'https://evil.example.net', host: 'localhost:3000' },
  })
}

function sameOriginPost(): NextRequest {
  return new NextRequest('http://localhost:3000/api/anything', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ userId: 'user_clerk1', sessionClaims: null })
  enforceRateLimit.mockResolvedValue(null)
  resolveActiveTeam.mockResolvedValue({
    dbUserId: 'u1',
    team: { id: 't1', phase: 'discovery', labType: null },
  })
  dbUserFindUnique.mockResolvedValue({ id: 'u1', role: 'teacher' })
  dbClassFindMany.mockResolvedValue([{ id: 'c1' }])
})

describe('requireTeamContext CSRF wiring', () => {
  it('403s a cross-origin POST before resolving the team', async () => {
    const { ctx, error } = await requireTeamContext(crossOriginPost(), { tier: 'mutate' })
    expect(ctx).toBeNull()
    expect(error?.status).toBe(403)
    expect(resolveActiveTeam).not.toHaveBeenCalled()
  })

  it('passes a same-origin POST through to team resolution', async () => {
    const { ctx, error } = await requireTeamContext(sameOriginPost(), { tier: 'mutate' })
    expect(error).toBeNull()
    expect(ctx?.teamId).toBe('t1')
  })

  it('401s before rate limiting when signed out', async () => {
    auth.mockResolvedValue({ userId: null })
    const { error } = await requireTeamContext(sameOriginPost(), { tier: 'mutate' })
    expect(error?.status).toBe(401)
    expect(enforceRateLimit).not.toHaveBeenCalled()
  })

  it('rate-limits before the CSRF check and team resolution', async () => {
    const limited = new Response(null, { status: 429 })
    enforceRateLimit.mockResolvedValue(limited)
    const { error } = await requireTeamContext(crossOriginPost(), { tier: 'mutate' })
    expect(error?.status).toBe(429)
    expect(resolveActiveTeam).not.toHaveBeenCalled()
  })
})

describe('requireUserContext CSRF wiring', () => {
  it('403s a cross-origin POST', async () => {
    const { ctx, error } = await requireUserContext(crossOriginPost(), { tier: 'mutate' })
    expect(ctx).toBeNull()
    expect(error?.status).toBe(403)
  })

  it('passes a same-origin POST', async () => {
    const { ctx, error } = await requireUserContext(sameOriginPost(), { tier: 'mutate' })
    expect(error).toBeNull()
    expect(ctx?.userId).toBe('user_clerk1')
  })
})

describe('requireTeacher CSRF wiring', () => {
  it('403s a cross-origin POST before touching the DB', async () => {
    const { ctx, error } = await requireTeacher(crossOriginPost(), { tier: 'mutate' })
    expect(ctx).toBeNull()
    expect(error?.status).toBe(403)
    expect(dbUserFindUnique).not.toHaveBeenCalled()
  })

  it('passes a same-origin POST through to the DB-authoritative role check', async () => {
    const { ctx, error } = await requireTeacher(sameOriginPost(), { tier: 'mutate' })
    expect(error).toBeNull()
    expect(ctx?.classIds).toEqual(['c1'])
  })
})
