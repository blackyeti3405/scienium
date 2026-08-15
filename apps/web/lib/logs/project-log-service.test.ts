import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = { projectLog: { create: vi.fn() } }
  return {
    tx,
    logFindMany: vi.fn(),
    logCount: vi.fn(),
    memberFindMany: vi.fn(),
    queryRaw: vi.fn(),
    transaction: vi.fn(),
    resolveKeys: vi.fn(),
    attachKeys: vi.fn(),
    activity: vi.fn(),
    award: vi.fn(),
  }
})

vi.mock('@/lib/db', () => ({
  db: {
    projectLog: { findMany: mocks.logFindMany, count: mocks.logCount },
    teamMember: { findMany: mocks.memberFindMany },
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
  },
}))
vi.mock('@/lib/uploads/assets', () => ({
  resolveAttachmentKeys: mocks.resolveKeys,
  attachAssetsByKey: mocks.attachKeys,
}))
vi.mock('@/lib/activity/log', () => ({ logActivityBestEffort: mocks.activity }))
vi.mock('@/lib/economy/lab-credit', () => ({ awardDailyLabCredit: mocks.award }))

import { createProjectLogEntry, listProjectLog } from './project-log-service'

const principal = { teamId: 'team_1', dbUserId: 'user_1', labType: 'biocore' }
const input = {
  body: '  What we did  ',
  nextSteps: '  Analyze it  ',
  stage: '  Testing  ',
  attendeeIds: ['user_1'],
  attachmentUrls: ['/api/project-log/attachment/view/photo-1'],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.logFindMany.mockResolvedValue([])
  mocks.logCount.mockResolvedValue(0)
  mocks.memberFindMany.mockResolvedValue([])
  mocks.queryRaw.mockResolvedValue([])
  mocks.resolveKeys.mockResolvedValue(new Map())
  mocks.attachKeys.mockResolvedValue(0)
  mocks.tx.projectLog.create.mockResolvedValue({ id: 'log_1', body: 'What we did' })
  mocks.activity.mockResolvedValue(undefined)
  mocks.award.mockResolvedValue({ awarded: true, amount: 1 })
  mocks.transaction.mockImplementation(async (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx))
})

describe('listProjectLog', () => {
  it('scopes and numbers entries, links and roster members for the first page', async () => {
    const date = new Date('2026-08-01T00:00:00.000Z')
    mocks.logFindMany.mockResolvedValue([
      {
        id: 'log_2',
        body: 'Second',
        nextSteps: 'Next',
        stage: 'Testing',
        attendeeIds: ['user_1'],
        attachmentUrls: [],
        createdAt: date,
        lastEditedAt: null,
        createdBy: { id: 'user_1', name: 'A' },
        lastEditedBy: null,
        references: [
          {
            to: {
              id: 'log_1',
              stage: 'Planning',
              createdAt: date,
              createdBy: { name: 'A' },
            },
          },
        ],
        referencedBy: [],
      },
    ])
    mocks.queryRaw.mockResolvedValue([
      { id: 'log_1', entry_number: 1, total: 2 },
      { id: 'log_2', entry_number: 2, total: 2 },
    ])
    mocks.memberFindMany.mockResolvedValue([
      { userId: 'user_1', user: { name: 'A' } },
      { userId: 'user_2', user: { name: 'B' } },
    ])

    const result = await listProjectLog(principal, null)

    expect(mocks.logFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 'team_1', entryType: 'progress' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 31,
      }),
    )
    expect(result).toMatchObject({
      total: 2,
      nextCursor: null,
      members: [
        { userId: 'user_1', name: 'A' },
        { userId: 'user_2', name: 'B' },
      ],
      labType: 'biocore',
      currentUserId: 'user_1',
    })
    expect(result.entries[0]).toMatchObject({
      id: 'log_2',
      entryNumber: 2,
      links: [{ id: 'log_1', entryNumber: 1, stage: 'Planning', createdByName: 'A' }],
      backlinks: [],
    })
    expect(result.entries[0]).not.toHaveProperty('references')
  })

  it('uses count for an empty page and omits the roster on cursor pages', async () => {
    mocks.logCount.mockResolvedValue(47)

    const result = await listProjectLog(principal, 'oldest_loaded')

    expect(mocks.logFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'oldest_loaded' }, skip: 1 }),
    )
    expect(mocks.queryRaw).not.toHaveBeenCalled()
    expect(mocks.memberFindMany).not.toHaveBeenCalled()
    expect(result.total).toBe(47)
    expect(result).not.toHaveProperty('members')
  })

  it('returns exactly 30 rows and a stable cursor when an older page exists', async () => {
    const rows = Array.from({ length: 31 }, (_, index) => ({
      id: `log_${31 - index}`,
      body: '',
      nextSteps: '',
      stage: null,
      attendeeIds: [],
      attachmentUrls: [],
      createdAt: new Date(index),
      lastEditedAt: null,
      createdBy: { id: 'user_1', name: 'A' },
      lastEditedBy: null,
      references: [],
      referencedBy: [],
    }))
    mocks.logFindMany.mockResolvedValue(rows)
    mocks.queryRaw.mockResolvedValue(
      rows.slice(0, 30).map((row, index) => ({
        id: row.id,
        entry_number: 31 - index,
        total: 31,
      })),
    )

    const result = await listProjectLog(principal, null)
    expect(result.entries).toHaveLength(30)
    expect(result.nextCursor).toBe('log_2')
    expect(result.total).toBe(31)
  })
})

describe('createProjectLogEntry', () => {
  it('requires a real attendee for a multi-member lab before doing attachment work', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }, { userId: 'user_2' }])

    await expect(
      createProjectLogEntry(principal, { ...input, attendeeIds: ['forged_user'] }),
    ).resolves.toEqual({ ok: false, error: 'Select who was present', status: 400 })
    expect(mocks.resolveKeys).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('allows an implicit attendee for a solo lab', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }])

    await expect(
      createProjectLogEntry(principal, { ...input, attendeeIds: [] }),
    ).resolves.toMatchObject({ ok: true })
    expect(mocks.tx.projectLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attendeeIds: [] }) }),
    )
  })

  it('rejects a cross-team or expired attachment before writing a log', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }])
    mocks.resolveKeys.mockResolvedValue(null)

    await expect(createProjectLogEntry(principal, input)).resolves.toEqual({
      ok: false,
      error: 'Invalid attachment reference',
      status: 400,
    })
    expect(mocks.logCount).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('filters forged attendees, trims text, deduplicates keys and awards LC after commit', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }, { userId: 'user_2' }])
    mocks.resolveKeys.mockResolvedValue(
      new Map([
        ['/a', 'object-1'],
        ['/b', 'object-1'],
      ]),
    )
    mocks.attachKeys.mockResolvedValue(1)
    mocks.logCount.mockResolvedValue(4)

    const result = await createProjectLogEntry(principal, {
      ...input,
      attendeeIds: ['user_1', 'forged_user'],
      attachmentUrls: ['/a', '/b'],
    })

    expect(result).toEqual({
      ok: true,
      entry: { id: 'log_1', body: 'What we did', entryNumber: 5 },
      lcAward: { awarded: true, amount: 1 },
    })
    expect(mocks.tx.projectLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          teamId: 'team_1',
          createdByUserId: 'user_1',
          entryType: 'progress',
          body: 'What we did',
          nextSteps: 'Analyze it',
          stage: 'Testing',
          attendeeIds: ['user_1'],
          attachmentUrls: ['/a', '/b'],
        },
      }),
    )
    expect(mocks.attachKeys).toHaveBeenCalledWith(mocks.tx, {
      teamId: 'team_1',
      objectKeys: ['object-1'],
      attachedToType: 'project_log',
      attachedToId: 'log_1',
    })
    expect(mocks.activity).toHaveBeenCalledWith('team_1', 'user_1', 'log_created', {
      kind: 'progress',
    })
    expect(mocks.award).toHaveBeenCalledWith({ teamId: 'team_1', dbUserId: 'user_1' })
  })

  it('rolls back the save when any referenced object failed to attach', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }])
    mocks.resolveKeys.mockResolvedValue(new Map([['/a', 'object-1']]))
    mocks.attachKeys.mockResolvedValue(0)

    await expect(createProjectLogEntry(principal, input)).resolves.toEqual({
      ok: false,
      error: 'One or more photos are no longer available. Please re-upload and try again.',
      status: 409,
    })
    expect(mocks.activity).not.toHaveBeenCalled()
    expect(mocks.award).not.toHaveBeenCalled()
  })

  it('does not mislabel an unexpected database failure as an expired attachment', async () => {
    mocks.memberFindMany.mockResolvedValue([{ userId: 'user_1' }])
    mocks.transaction.mockRejectedValue(new Error('database unavailable'))

    await expect(createProjectLogEntry(principal, input)).rejects.toThrow('database unavailable')
  })
})
