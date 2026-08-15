import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    teamDailyTaskDay: { findUnique: mocks.findUnique },
    $queryRaw: mocks.queryRaw,
  },
}))

import { spellPowerTierFor } from '@scienium/shared-types'
import { getSpellPower, getTierForTaskCount, incrementDailyTaskCount } from './spell-power'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-11T23:59:59.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('spell-power tiers', () => {
  it.each([
    [0, 'NONE', 0.5],
    [1, 'BASE', 1],
    [2, 'BASE', 1],
    [3, 'BOOSTED', 1.5],
    [4, 'BOOSTED', 1.5],
    [5, 'MAX', 2],
    [100, 'MAX', 2],
  ] as const)('maps %i completed tasks to %s', (tasks, tier, multiplier) => {
    expect(getTierForTaskCount(tasks)).toEqual({ tier, multiplier })
  })

  it('stays in lockstep with the shared client tier table', () => {
    for (let tasks = 0; tasks <= 20; tasks += 1) {
      const shared = spellPowerTierFor(tasks)
      expect(getTierForTaskCount(tasks)).toEqual({
        tier: shared.tier,
        multiplier: shared.multiplier,
      })
    }
  })

  it('fails closed to the dormant tier for an impossible negative count', () => {
    expect(getTierForTaskCount(-1)).toEqual({ tier: 'NONE', multiplier: 0.5 })
  })
})

describe('daily persistence', () => {
  it('reads the caller team at UTC midnight and defaults a missing day to zero', async () => {
    mocks.findUnique.mockResolvedValue(null)

    await expect(getSpellPower('team_1')).resolves.toEqual({
      tier: 'NONE',
      multiplier: 0.5,
      tasksCompleted: 0,
    })
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        teamId_date: { teamId: 'team_1', date: new Date('2026-08-11T00:00:00.000Z') },
      },
      select: { tasksCompleted: true },
    })
  })

  it('returns the tier derived from the persisted count', async () => {
    mocks.findUnique.mockResolvedValue({ tasksCompleted: 4 })

    await expect(getSpellPower('team_1')).resolves.toEqual({
      tier: 'BOOSTED',
      multiplier: 1.5,
      tasksCompleted: 4,
    })
  })

  it('atomically increments the team/day row and returns the database value', async () => {
    mocks.queryRaw.mockResolvedValue([{ tasks_completed: 6 }])

    await expect(incrementDailyTaskCount('team_1')).resolves.toBe(6)
    const [, teamId, date] = mocks.queryRaw.mock.calls[0]
    expect(teamId).toBe('team_1')
    expect(date).toEqual(new Date('2026-08-11T00:00:00.000Z'))
  })

  it('uses one as the conservative result if RETURNING unexpectedly yields no row', async () => {
    mocks.queryRaw.mockResolvedValue([])

    await expect(incrementDailyTaskCount('team_1')).resolves.toBe(1)
  })
})
