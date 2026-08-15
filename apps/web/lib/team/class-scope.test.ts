import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { team: { findUnique: mocks.findUnique } },
}))

import { isTeacherPaced, teamClassIds } from './class-scope'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('teamClassIds', () => {
  it('derives distinct class scope from members, preserving first-seen order', async () => {
    mocks.findUnique.mockResolvedValue({
      members: [
        { user: { classId: 'class_b' } },
        { user: { classId: null } },
        { user: { classId: 'class_a' } },
        { user: { classId: 'class_b' } },
      ],
    })

    await expect(teamClassIds('team_1')).resolves.toEqual(['class_b', 'class_a'])
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: 'team_1' },
      select: { members: { select: { user: { select: { classId: true } } } } },
    })
  })

  it('returns an empty scope for a missing team or unenrolled members', async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      members: [{ user: { classId: null } }],
    })

    await expect(teamClassIds('missing')).resolves.toEqual([])
    await expect(teamClassIds('unenrolled')).resolves.toEqual([])
  })
})

describe('isTeacherPaced', () => {
  it('paces any classroom lab through its teacher', async () => {
    mocks.findUnique.mockResolvedValue({
      members: [{ user: { classId: 'class_1' } }],
    })

    await expect(isTeacherPaced('team_1')).resolves.toBe(true)
  })

  it('leaves a lab with no enrolled members self-paced', async () => {
    mocks.findUnique.mockResolvedValue({ members: [] })

    await expect(isTeacherPaced('team_1')).resolves.toBe(false)
  })
})
