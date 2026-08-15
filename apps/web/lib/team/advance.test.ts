import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    team: { updateMany: vi.fn() },
    teamCurrency: { upsert: vi.fn() },
  }
  return {
    tx,
    paperFindMany: vi.fn(),
    memberFindMany: vi.fn(),
    proficiencyFindMany: vi.fn(),
    teamFindUnique: vi.fn(),
    transaction: vi.fn(),
    activity: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({
  db: {
    paper: { findMany: mocks.paperFindMany },
    teamMember: { findMany: mocks.memberFindMany },
    paperProficiency: { findMany: mocks.proficiencyFindMany },
    team: { findUnique: mocks.teamFindUnique },
    $transaction: mocks.transaction,
  },
}))
vi.mock('@/lib/activity/log', () => ({ recordActivity: mocks.activity }))

import {
  LITERATURE_BONUS_KP_PER_MEMBER,
  LITERATURE_TIERS,
  advanceTeamPhase,
  getLiteratureAdvanceProgress,
  maybeGrantLiteratureBonus,
} from './advance'

const papers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `paper_${index + 1}` }))
const members = (...rows: Array<[string, string]>) =>
  rows.map(([userId, name]) => ({ userId, user: { name } }))
const proficiencies = (userId: string, count: number) =>
  Array.from({ length: count }, () => ({ userId }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-11T12:00:00.000Z'))
  mocks.paperFindMany.mockResolvedValue([])
  mocks.memberFindMany.mockResolvedValue([])
  mocks.proficiencyFindMany.mockResolvedValue([])
  mocks.teamFindUnique.mockResolvedValue({ literatureBonusAt: null })
  mocks.tx.team.updateMany.mockResolvedValue({ count: 1 })
  mocks.tx.teamCurrency.upsert.mockResolvedValue({})
  mocks.transaction.mockImplementation(async (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getLiteratureAdvanceProgress', () => {
  it('counts only ready team papers and demonstrated rows for those paper ids', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(10))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A'], ['user_b', 'B']))
    mocks.proficiencyFindMany.mockResolvedValue([
      ...proficiencies('user_a', 10),
      ...proficiencies('user_b', 10),
    ])

    await expect(getLiteratureAdvanceProgress('team_1', 'literature_review')).resolves.toEqual({
      fromPhase: 'literature_review',
      toPhase: 'plan_refinement',
      sourceCount: 10,
      sourceTarget: LITERATURE_TIERS.idea,
      members: [
        { userId: 'user_a', name: 'A', demonstratedCount: 10, ready: true },
        { userId: 'user_b', name: 'B', demonstratedCount: 10, ready: true },
      ],
      membersReady: 2,
      memberCount: 2,
      canAdvance: true,
    })

    expect(mocks.paperFindMany).toHaveBeenCalledWith({
      where: { teamId: 'team_1', status: 'ready' },
      select: { id: true },
    })
    expect(mocks.memberFindMany).toHaveBeenCalledWith({
      where: { teamId: 'team_1' },
      orderBy: { joinedAt: 'asc' },
      select: { userId: true, user: { select: { name: true } } },
    })
    expect(mocks.proficiencyFindMany).toHaveBeenCalledWith({
      where: {
        paperId: { in: papers(10).map((paper) => paper.id) },
        demonstrated: true,
      },
      select: { userId: true },
    })
  })

  it('holds the whole lab when even one member is below the tier', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(10))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A'], ['user_b', 'B']))
    mocks.proficiencyFindMany.mockResolvedValue([
      ...proficiencies('user_a', 10),
      ...proficiencies('user_b', 9),
    ])

    const progress = await getLiteratureAdvanceProgress('team_1', 'literature_review')
    expect(progress.membersReady).toBe(1)
    expect(progress.members[1]).toMatchObject({ demonstratedCount: 9, ready: false })
    expect(progress.canAdvance).toBe(false)
  })

  it('does not treat an empty team as unanimously ready', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(10))

    const progress = await getLiteratureAdvanceProgress('team_1', 'literature_review')
    expect(progress.memberCount).toBe(0)
    expect(progress.canAdvance).toBe(false)
  })

  it('skips the proficiency query when there are no ready papers', async () => {
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A']))

    const progress = await getLiteratureAdvanceProgress('team_1', 'plan_refinement')
    expect(progress).toMatchObject({
      toPhase: 'project_development',
      sourceCount: 0,
      sourceTarget: LITERATURE_TIERS.projectDevelopment,
      canAdvance: false,
    })
    expect(mocks.proficiencyFindMany).not.toHaveBeenCalled()
  })

  it('never opens an accidental literature gate from a non-literature phase', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(25))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A']))
    mocks.proficiencyFindMany.mockResolvedValue(proficiencies('user_a', 25))

    const progress = await getLiteratureAdvanceProgress('team_1', 'project_development')
    expect(progress).toMatchObject({
      toPhase: null,
      sourceTarget: 25,
      membersReady: 1,
      canAdvance: false,
    })
  })
})

describe('advanceTeamPhase', () => {
  it('compare-and-sets the phase, clock and durable activity in one transaction', async () => {
    await expect(
      advanceTeamPhase('team_1', 'user_1', 'discovery', 'literature_review'),
    ).resolves.toBe(true)

    expect(mocks.tx.team.updateMany).toHaveBeenCalledWith({
      where: { id: 'team_1', phase: 'discovery' },
      data: {
        phase: 'literature_review',
        phaseEnteredAt: new Date('2026-08-11T12:00:00.000Z'),
      },
    })
    expect(mocks.activity).toHaveBeenCalledWith(
      mocks.tx,
      'team_1',
      'user_1',
      'phase_advanced',
      { fromPhase: 'discovery', toPhase: 'literature_review' },
    )
  })

  it('returns false and writes no activity when another request won the phase race', async () => {
    mocks.tx.team.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      advanceTeamPhase('team_1', 'user_1', 'discovery', 'literature_review'),
    ).resolves.toBe(false)
    expect(mocks.activity).not.toHaveBeenCalled()
  })
})

describe('maybeGrantLiteratureBonus', () => {
  it('does no counting or transaction work after the bonus has been paid', async () => {
    mocks.teamFindUnique.mockResolvedValue({ literatureBonusAt: new Date() })

    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(0)
    expect(mocks.paperFindMany).not.toHaveBeenCalled()
    expect(mocks.memberFindMany).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('does nothing for a missing team, too few sources, or an empty team', async () => {
    mocks.teamFindUnique.mockResolvedValueOnce(null)
    await expect(maybeGrantLiteratureBonus('missing', 'user_1')).resolves.toBe(0)

    mocks.paperFindMany.mockResolvedValueOnce(papers(24)).mockResolvedValueOnce(papers(25))
    mocks.memberFindMany
      .mockResolvedValueOnce(members(['user_a', 'A']))
      .mockResolvedValueOnce([])
    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(0)
    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(0)

    expect(mocks.proficiencyFindMany).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('requires every member to demonstrate all 25 ready sources', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(25))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A'], ['user_b', 'B']))
    mocks.proficiencyFindMany.mockResolvedValue([
      ...proficiencies('user_a', 25),
      ...proficiencies('user_b', 24),
    ])

    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(0)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('credits the member-scaled bonus only after winning the null-to-date claim', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(25))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A'], ['user_b', 'B']))
    mocks.proficiencyFindMany.mockResolvedValue([
      ...proficiencies('user_a', 25),
      ...proficiencies('user_b', 25),
    ])
    const kp = LITERATURE_BONUS_KP_PER_MEMBER * 2

    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(kp)
    expect(mocks.tx.team.updateMany).toHaveBeenCalledWith({
      where: { id: 'team_1', literatureBonusAt: null },
      data: { literatureBonusAt: new Date('2026-08-11T12:00:00.000Z') },
    })
    expect(mocks.tx.teamCurrency.upsert).toHaveBeenCalledWith({
      where: { teamId: 'team_1' },
      create: { teamId: 'team_1', kp },
      update: { kp: { increment: kp } },
    })
    expect(mocks.activity).toHaveBeenCalledWith(
      mocks.tx,
      'team_1',
      'user_1',
      'literature_bonus',
      { sources: 25, members: 2, kp },
    )
  })

  it('pays nothing when a concurrent caller already flipped the claim', async () => {
    mocks.paperFindMany.mockResolvedValue(papers(25))
    mocks.memberFindMany.mockResolvedValue(members(['user_a', 'A']))
    mocks.proficiencyFindMany.mockResolvedValue(proficiencies('user_a', 25))
    mocks.tx.team.updateMany.mockResolvedValue({ count: 0 })

    await expect(maybeGrantLiteratureBonus('team_1', 'user_1')).resolves.toBe(0)
    expect(mocks.tx.teamCurrency.upsert).not.toHaveBeenCalled()
    expect(mocks.activity).not.toHaveBeenCalled()
  })
})
