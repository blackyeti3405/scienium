import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Failure-log follow-ups claim before they spend (REFACTOR2 P1-S7).
 *
 * "One follow-up per entry" and the per-team daily cap were both pre-reads taken
 * BEFORE the paid Anthropic call, with no constraint behind either. Two
 * concurrent requests both saw "none yet" and "under the limit", both paid, and
 * both inserted. The answer write had the same shape: a `response === null`
 * pre-read then an unconditional update, so the second answer silently
 * overwrote the first.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  logFindFirst: vi.fn(),
  followupCreate: vi.fn(() => Promise.resolve({})),
  followupUpdate: vi.fn(),
  followupUpdateMany: vi.fn(),
  followupDeleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  followupFindFirst: vi.fn((): Promise<unknown> => Promise.resolve(null)),
  followupFindUniqueOrThrow: vi.fn(),
  followupDelete: vi.fn(() => Promise.resolve({})),
  followupCount: vi.fn(() => Promise.resolve(0)),
  lockAggregate: vi.fn(() => Promise.resolve()),
  logActivity: vi.fn(() => Promise.resolve()),
  anthropicCreate: vi.fn(),
}))

const tx = {
  projectLogFollowup: {
    findFirst: mocks.followupFindFirst,
    delete: mocks.followupDelete,
    create: mocks.followupCreate,
    count: mocks.followupCount,
  },
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.anthropicCreate } }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    projectLog: { findFirst: mocks.logFindFirst },
    projectLogFollowup: {
      update: mocks.followupUpdate,
      updateMany: mocks.followupUpdateMany,
      deleteMany: mocks.followupDeleteMany,
      findFirst: mocks.followupFindFirst,
      findUniqueOrThrow: mocks.followupFindUniqueOrThrow,
      count: mocks.followupCount,
    },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import { POST, PATCH } from '@/app/api/failure-log/[id]/followup/route'

const params = { params: Promise.resolve({ id: 'log_1' }) }

function postReq(): NextRequest {
  return new NextRequest('http://app.example.com/api/failure-log/log_1/followup', { method: 'POST' })
}
function patchReq(response: string): NextRequest {
  return new NextRequest('http://app.example.com/api/failure-log/log_1/followup', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('E2E_SKIP_LLM', '1') // deterministic question, no paid call
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.logFindFirst.mockResolvedValue({
    id: 'log_1',
    body: JSON.stringify({ happened: 'it broke', learned: 'check wiring' }),
    followups: [],
  })
  mocks.followupCount.mockResolvedValue(0)
  mocks.followupFindFirst.mockResolvedValue(null)
  mocks.followupCreate.mockResolvedValue({})
  mocks.followupUpdate.mockResolvedValue({
    id: 'f1',
    question: 'Why?',
    response: null,
    answeredAt: null,
  })
  mocks.followupUpdateMany.mockResolvedValue({ count: 1 })
  mocks.followupFindUniqueOrThrow.mockResolvedValue({
    id: 'f1',
    question: 'Why?',
    response: 'because',
    answeredAt: new Date(),
  })
})

describe('POST — claim before spending', () => {
  it('inserts the claim row before generating anything', async () => {
    const res = await POST(postReq(), params)

    expect(res.status).toBe(201)
    // The claim is an empty-question row; the real question fills it afterwards.
    expect(mocks.followupCreate).toHaveBeenCalledWith({
      data: { projectLogId: 'log_1', question: '', response: null, answeredAt: null },
    })
    expect(mocks.followupUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectLogId: 'log_1' } }),
    )
  })

  it('counts the daily cap under a per-team lock, not as a bare read', async () => {
    await POST(postReq(), params)

    expect(mocks.lockAggregate).toHaveBeenCalledWith(tx, 'followup-daily:team_1')
    expect(mocks.lockAggregate.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.followupCount.mock.invocationCallOrder[0]!,
    )
  })

  it('never inserts a second row — it fills the claim it already holds', async () => {
    await POST(postReq(), params)

    expect(mocks.followupCreate).toHaveBeenCalledTimes(1)
  })

  // The unique index is the real per-entry cap; a loser has spent nothing.
  it('turns a lost claim race into 409 without generating', async () => {
    const { Prisma } = await import('@prisma/client')
    mocks.followupCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )

    const res = await POST(postReq(), params)

    expect(res.status).toBe(409)
    expect(mocks.followupUpdate).not.toHaveBeenCalled()
  })

  it('refuses at the daily cap before claiming', async () => {
    mocks.followupCount.mockResolvedValue(10)

    const res = await POST(postReq(), params)

    expect(res.status).toBe(429)
    expect(mocks.followupCreate).not.toHaveBeenCalled()
  })

  it('reclaims a stale empty claim so a crash cannot burn the entry forever', async () => {
    mocks.followupFindFirst.mockResolvedValue({ id: 'stale_claim' })

    await POST(postReq(), params)

    expect(mocks.followupDelete).toHaveBeenCalledWith({ where: { id: 'stale_claim' } })
    expect(mocks.followupCreate).toHaveBeenCalled()
  })

  it('releases the claim when generation fails, so the student can retry', async () => {
    vi.stubEnv('E2E_SKIP_LLM', '')
    mocks.anthropicCreate.mockRejectedValue(new Error('provider down'))

    const res = await POST(postReq(), params)

    expect(res.status).toBe(502)
    expect(mocks.followupDeleteMany).toHaveBeenCalledWith({
      where: { projectLogId: 'log_1', question: '' },
    })
  })

  it('releases the claim when the model returns nothing usable', async () => {
    vi.stubEnv('E2E_SKIP_LLM', '')
    mocks.anthropicCreate.mockResolvedValue({ content: [{ type: 'text', text: '   ' }] })

    const res = await POST(postReq(), params)

    expect(res.status).toBe(502)
    expect(mocks.followupDeleteMany).toHaveBeenCalled()
  })

  it('short-circuits an entry that already has a real follow-up', async () => {
    mocks.logFindFirst.mockResolvedValue({
      id: 'log_1',
      body: '{}',
      followups: [{ id: 'f1', question: 'Already asked?', response: null, answeredAt: null }],
    })

    const res = await POST(postReq(), params)

    expect(res.status).toBe(409)
    expect(mocks.followupCreate).not.toHaveBeenCalled()
  })
})

describe('PATCH — the answer is claimed, not pre-read', () => {
  beforeEach(() => {
    mocks.followupFindFirst.mockResolvedValue({
      id: 'f1',
      question: 'Why?',
      response: null,
      answeredAt: null,
    })
  })

  it('writes the answer under a response-is-null predicate', async () => {
    const res = await PATCH(patchReq('because the wiring was loose'), params)

    expect(res.status).toBe(200)
    expect(mocks.followupUpdateMany).toHaveBeenCalledWith({
      where: { id: 'f1', response: null },
      data: expect.objectContaining({ response: 'because the wiring was loose' }),
    })
  })

  // Both callers saw `response: null`; only the predicate can separate them.
  it('409s the loser of a concurrent answer instead of overwriting', async () => {
    mocks.followupUpdateMany.mockResolvedValue({ count: 0 })

    const res = await PATCH(patchReq('second answer'), params)

    expect(res.status).toBe(409)
    expect(mocks.followupFindUniqueOrThrow).not.toHaveBeenCalled()
  })
})
