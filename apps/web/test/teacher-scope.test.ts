import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Teacher scope policy (PILOT-1 / ADR-004): team-shared data is visible to a
 * teacher iff at least one team member's own `User.classId` is a class the
 * teacher owns. An empty class scope must short-circuit to "not owned" without
 * ever querying, and the ownership query must go through per-student class
 * membership — never `Team.classId` (vestigial, see ADR-004).
 */

const mocks = vi.hoisted(() => ({
  teamFindFirst: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(), currentUser: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: { team: { findFirst: mocks.teamFindFirst } },
}))
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimit: vi.fn() }))
vi.mock('@/lib/api/route-context', () => ({ assertSameOrigin: vi.fn() }))

import { teacherOwnsTeam } from '@/lib/teacher/auth'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('teacherOwnsTeam', () => {
  it('an empty class scope is never in-scope and never queries', async () => {
    expect(await teacherOwnsTeam([], 'team_1')).toBe(false)
    expect(mocks.teamFindFirst).not.toHaveBeenCalled()
  })

  it('authorizes through member class membership, scoped to the given classes', async () => {
    mocks.teamFindFirst.mockResolvedValue({ id: 'team_1' })

    expect(await teacherOwnsTeam(['class_a', 'class_b'], 'team_1')).toBe(true)
    expect(mocks.teamFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'team_1',
        members: { some: { user: { classId: { in: ['class_a', 'class_b'] } } } },
      },
      select: { id: true },
    })
  })

  it('denies a team with no member in the teacher classes', async () => {
    mocks.teamFindFirst.mockResolvedValue(null)
    expect(await teacherOwnsTeam(['class_a'], 'team_other')).toBe(false)
  })
})
