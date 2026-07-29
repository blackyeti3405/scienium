import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Result replay for paid provider calls (REFACTOR2 P1-R3; the replay half of
 * P1-R11, P1-S6, P1-R2).
 *
 * The claim columns those findings added solved the CONCURRENT case — two
 * callers can no longer pay at the same moment. They cannot solve the sequential
 * one: a client that timed out and retried, or a student submitting the same
 * answers twice, had only two outcomes — pay again, or be refused. Neither is
 * right when the first call already produced an answer somebody paid for.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  db: {
    aiOperation: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}))

import { aiIdempotencyKey, runAiOperation } from '@/lib/ai/operation'

async function p2002() {
  const { Prisma } = await import('@prisma/client')
  return new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
}

const KEY = aiIdempotencyKey(['test', 'input'])

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ id: 'op_1' })
  mocks.updateMany.mockResolvedValue({ count: 1 })
})

describe('aiIdempotencyKey', () => {
  it('is stable for identical input and differs for different input', () => {
    expect(aiIdempotencyKey(['a', 1])).toBe(aiIdempotencyKey(['a', 1]))
    expect(aiIdempotencyKey(['a', 1])).not.toBe(aiIdempotencyKey(['a', 2]))
  })

  // Replaying one student's grade onto another's answers is the failure mode.
  it('does not collide when parts could concatenate alike', () => {
    expect(aiIdempotencyKey(['ab', 'c'])).not.toBe(aiIdempotencyKey(['a', 'bc']))
  })
})

describe('runAiOperation', () => {
  it('runs the work once and stores the result', async () => {
    const run = vi.fn(async () => ({ score: 90 }))

    const out = await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })

    expect(out).toEqual({ ok: true, result: { score: 90 }, replayed: false })
    expect(run).toHaveBeenCalledOnce()
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'succeeded', resultJson: { score: 90 } }),
      }),
    )
  })

  // THE point: an identical later request pays nothing.
  it('replays a stored result without running the work again', async () => {
    mocks.create.mockRejectedValue(await p2002())
    mocks.findUnique.mockResolvedValue({
      id: 'op_1',
      status: 'succeeded',
      resultJson: { score: 90 },
      createdAt: new Date(),
    })
    const run = vi.fn()

    const out = await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })

    expect(out).toEqual({ ok: true, result: { score: 90 }, replayed: true })
    expect(run).not.toHaveBeenCalled()
  })

  it('reports in_flight while an identical call is still running', async () => {
    mocks.create.mockRejectedValue(await p2002())
    mocks.findUnique.mockResolvedValue({
      id: 'op_1', status: 'running', resultJson: null, createdAt: new Date(),
    })
    const run = vi.fn()

    const out = await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })

    expect(out).toEqual({ ok: false, reason: 'in_flight' })
    expect(run).not.toHaveBeenCalled()
  })

  it('takes over a `running` row whose owner never came back', async () => {
    mocks.create.mockRejectedValue(await p2002())
    mocks.findUnique.mockResolvedValue({
      id: 'op_1',
      status: 'running',
      claimToken: 'dead_worker',
      resultJson: null,
      createdAt: new Date(Date.now() - 10 * 60_000), // long dead
    })
    const run = vi.fn(async () => ({ score: 70 }))

    const out = await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })

    expect(out).toMatchObject({ ok: true, replayed: false })
    expect(run).toHaveBeenCalledOnce()
    // Compare-and-set on the PREVIOUS claim, not on status: `running` →
    // `running` matches for two takers, a token match cannot (P1-1).
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'op_1', status: 'running', claimToken: 'dead_worker' } }),
    )
  })

  it('lets an identical retry take over a failed attempt', async () => {
    mocks.create.mockRejectedValue(await p2002())
    mocks.findUnique.mockResolvedValue({
      id: 'op_1', status: 'failed', resultJson: null, createdAt: new Date(),
    })
    const run = vi.fn(async () => ({ score: 80 }))

    expect(await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })).toMatchObject({
      ok: true,
      result: { score: 80 },
    })
  })

  it('does not replay a failure as if it were a result', async () => {
    const boom = new Error('provider down')
    const run = vi.fn(async () => {
      throw boom
    })

    const out = await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })

    expect(out).toEqual({ ok: false, reason: 'failed', error: boom })
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    )
  })

  it('loses the takeover race without running the work twice', async () => {
    mocks.create.mockRejectedValue(await p2002())
    mocks.findUnique.mockResolvedValue({
      id: 'op_1', status: 'failed', resultJson: null, createdAt: new Date(),
    })
    mocks.updateMany.mockResolvedValue({ count: 0 }) // another taker won
    const run = vi.fn()

    expect(await runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run })).toEqual({
      ok: false,
      reason: 'in_flight',
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('propagates a non-P2002 database error rather than silently re-running', async () => {
    mocks.create.mockRejectedValue(new Error('connection lost'))

    await expect(
      runAiOperation({ operation: 'explain_grade', idempotencyKey: KEY, run: vi.fn() }),
    ).rejects.toThrow('connection lost')
  })
})
