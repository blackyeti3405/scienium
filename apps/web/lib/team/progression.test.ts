import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = { team: { update: vi.fn() } }
  return {
    tx,
    transaction: vi.fn(),
    classify: vi.fn(),
    transfer: vi.fn(),
    teacherPaced: vi.fn(),
    advance: vi.fn(),
    activity: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({
  db: { $transaction: mocks.transaction },
}))
vi.mock('@/lib/lab-type/classify', () => ({ classifyLabType: mocks.classify }))
vi.mock('@/lib/lab-type/transfer', () => ({ transferBuildingsToLabType: mocks.transfer }))
vi.mock('@/lib/team/class-scope', () => ({ isTeacherPaced: mocks.teacherPaced }))
vi.mock('@/lib/team/advance', () => ({ advanceTeamPhase: mocks.advance }))
vi.mock('@/lib/activity/log', () => ({ recordActivity: mocks.activity }))

import { applyTopicLock, reassignLabType } from './progression'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.classify.mockResolvedValue({ labType: 'biocore', rationale: 'biology' })
  mocks.transfer.mockResolvedValue({ moved: 0 })
  mocks.teacherPaced.mockResolvedValue(false)
  mocks.advance.mockResolvedValue(true)
  mocks.transaction.mockImplementation(async (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx))
})

describe('reassignLabType', () => {
  it('classifies before opening the transaction, then moves the plot atomically', async () => {
    mocks.transfer.mockResolvedValue({ moved: 3 })

    await expect(reassignLabType('team_1', 'user_1', 'How do cells divide?')).resolves.toEqual({
      labType: 'biocore',
    })

    expect(mocks.classify).toHaveBeenCalledWith('How do cells divide?')
    expect(mocks.classify.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.transaction.mock.invocationCallOrder[0],
    )
    expect(mocks.tx.team.update).toHaveBeenCalledWith({
      where: { id: 'team_1' },
      data: { labType: 'biocore' },
    })
    expect(mocks.transfer).toHaveBeenCalledWith(mocks.tx, 'team_1', 'biocore')
    expect(mocks.activity).toHaveBeenCalledWith(
      mocks.tx,
      'team_1',
      'user_1',
      'lab_type_assigned',
      { labType: 'biocore', buildingsTransferred: 3 },
    )
  })

  it('does not write a misleading transfer activity when no buildings moved', async () => {
    await reassignLabType('team_1', 'user_1', 'A topic')

    expect(mocks.tx.team.update).toHaveBeenCalledOnce()
    expect(mocks.activity).not.toHaveBeenCalled()
  })

  it('never opens a transaction when the paid classification fails', async () => {
    mocks.classify.mockRejectedValue(new Error('provider unavailable'))

    await expect(reassignLabType('team_1', 'user_1', 'A topic')).rejects.toThrow(
      'provider unavailable',
    )
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('does not record activity after a failed plot transfer', async () => {
    mocks.transfer.mockRejectedValue(new Error('transfer failed'))

    await expect(reassignLabType('team_1', 'user_1', 'A topic')).rejects.toThrow(
      'transfer failed',
    )
    expect(mocks.activity).not.toHaveBeenCalled()
  })
})

describe('applyTopicLock', () => {
  it('is a no-op after discovery, including no paid classification call', async () => {
    await expect(
      applyTopicLock('team_1', 'user_1', 'A topic', 'literature_review'),
    ).resolves.toEqual({ labType: null, advanced: false, teacherPaced: false })

    expect(mocks.classify).not.toHaveBeenCalled()
    expect(mocks.teacherPaced).not.toHaveBeenCalled()
    expect(mocks.advance).not.toHaveBeenCalled()
  })

  it('assigns classroom identity but leaves phase control with the teacher', async () => {
    mocks.teacherPaced.mockResolvedValue(true)

    await expect(applyTopicLock('team_1', 'user_1', 'Cell growth', 'discovery')).resolves.toEqual({
      labType: 'biocore',
      advanced: false,
      teacherPaced: true,
    })

    expect(mocks.teacherPaced).toHaveBeenCalledWith('team_1')
    expect(mocks.advance).not.toHaveBeenCalled()
  })

  it('advances a self-paced lab through the compare-and-set transition', async () => {
    await expect(applyTopicLock('team_1', 'user_1', 'Cell growth', 'discovery')).resolves.toEqual({
      labType: 'biocore',
      advanced: true,
      teacherPaced: false,
    })

    expect(mocks.advance).toHaveBeenCalledWith(
      'team_1',
      'user_1',
      'discovery',
      'literature_review',
    )
  })

  it('reports a lost phase race without claiming that the lab advanced', async () => {
    mocks.advance.mockResolvedValue(false)

    await expect(applyTopicLock('team_1', 'user_1', 'Cell growth', 'discovery')).resolves.toEqual({
      labType: 'biocore',
      advanced: false,
      teacherPaced: false,
    })
  })
})
