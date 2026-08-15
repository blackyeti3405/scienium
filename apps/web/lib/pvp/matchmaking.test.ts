import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  teamClassIds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: { team: { findMany: mocks.findMany } },
}))
vi.mock('@/lib/team/class-scope', () => ({ teamClassIds: mocks.teamClassIds }))

import { findRandomOpponent, inClasses, sharesClass } from './matchmaking'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PvP class filters', () => {
  it('expresses class ownership through member users, never vestigial Team.classId', () => {
    expect(inClasses(['class_a', 'class_b'])).toEqual({
      members: { some: { user: { classId: { in: ['class_a', 'class_b'] } } } },
    })
  })

  it('requires a real class intersection between both teams', async () => {
    mocks.teamClassIds.mockResolvedValueOnce(['class_a', 'class_b']).mockResolvedValueOnce([
      'class_b',
      'class_c',
    ])

    await expect(sharesClass('team_a', 'team_b')).resolves.toBe(true)
    expect(mocks.teamClassIds).toHaveBeenNthCalledWith(1, 'team_a')
    expect(mocks.teamClassIds).toHaveBeenNthCalledWith(2, 'team_b')
  })

  it('fails closed when either team is unclassified or the sets do not intersect', async () => {
    mocks.teamClassIds.mockResolvedValueOnce([]).mockResolvedValueOnce(['class_a'])
    await expect(sharesClass('team_a', 'team_b')).resolves.toBe(false)

    mocks.teamClassIds.mockResolvedValueOnce(['class_a']).mockResolvedValueOnce(['class_b'])
    await expect(sharesClass('team_a', 'team_b')).resolves.toBe(false)
  })
})

describe('findRandomOpponent', () => {
  it('spends no query when the attacker belongs to no class', async () => {
    await expect(findRandomOpponent('team_a', [])).resolves.toBeNull()
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('queries only same-class, unlocked, placed opponents and applies exclusions', async () => {
    const eligible = [
      { id: 'team_b', name: 'B', labType: 'biocore' },
      { id: 'team_c', name: 'C', labType: 'axiom' },
      { id: 'team_d', name: 'D', labType: null },
    ]
    mocks.findMany.mockResolvedValue(eligible)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    await expect(
      findRandomOpponent('team_a', ['class_a'], ['already_seen']),
    ).resolves.toEqual(eligible[1])

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        members: { some: { user: { classId: { in: ['class_a'] } } } },
        id: { not: 'team_a', notIn: ['already_seen'] },
        phase: {
          in: ['literature_review', 'plan_refinement', 'project_development'],
        },
        shopBuildings: { some: { posX: { not: null } } },
      },
      select: { id: true, name: true, labType: true },
    })
    vi.mocked(Math.random).mockRestore()
  })

  it('returns null when the scoped query finds nobody', async () => {
    mocks.findMany.mockResolvedValue([])

    await expect(findRandomOpponent('team_a', ['class_a'])).resolves.toBeNull()
  })
})
