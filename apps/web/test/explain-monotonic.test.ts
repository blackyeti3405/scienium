import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Explain-back reads its deciding state INSIDE the lock (REFACTOR2 P1-S6).
 *
 * `attemptNo`, `bestScore`, and `passed` were all derived from a snapshot taken
 * BEFORE a multi-second Anthropic call. Two concurrent submissions therefore
 * minted the same attempt number, and a slower FAILING result recomputed the
 * high-water fields from that stale read — overwriting a pass that had landed in
 * the meantime. A late result could lower visible truth.
 */

const mocks = vi.hoisted(() => ({
  requireTeamContext: vi.fn(),
  paperFindFirst: vi.fn(),
  explanationFindUnique: vi.fn(),
  txExplanationFindUnique: vi.fn(),
  attemptCreate: vi.fn(() => Promise.resolve({})),
  explanationUpsert: vi.fn(
    (_args: { update: Record<string, unknown>; create: Record<string, unknown> }) =>
      Promise.resolve({}),
  ),
  queryRaw: vi.fn((): Promise<unknown[]> => Promise.resolve([])),
  currencyUpsert: vi.fn(() => Promise.resolve({})),
  lockAggregate: vi.fn(() => Promise.resolve()),
  recordActivity: vi.fn(() => Promise.resolve()),
  // Replay ledger (P1-S6 remainder) — the real grading path runs through it.
  aiOpCreate: vi.fn(
    (_args: { data: { idempotencyKey: string } }): Promise<{ id: string }> =>
      Promise.resolve({ id: 'aiop_1' }),
  ),
  aiOpFindUnique: vi.fn((): Promise<unknown> => Promise.resolve(null)),
  aiOpUpdate: vi.fn(() => Promise.resolve({})),
  aiOpUpdateMany: vi.fn(() => Promise.resolve({ count: 1 })),
  anthropicCreate: vi.fn(),
}))

const tx = {
  paperExplanation: { findUnique: mocks.txExplanationFindUnique, upsert: mocks.explanationUpsert },
  paperExplanationAttempt: { create: mocks.attemptCreate },
  teamCurrency: { upsert: mocks.currencyUpsert },
  $queryRaw: mocks.queryRaw,
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/api/route-context', () => ({ requireTeamContext: mocks.requireTeamContext }))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/activity/log', () => ({ recordActivity: mocks.recordActivity }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.anthropicCreate } }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    paper: { findFirst: mocks.paperFindFirst },
    paperExplanation: { findUnique: mocks.explanationFindUnique },
    aiOperation: {
      create: mocks.aiOpCreate,
      findUnique: mocks.aiOpFindUnique,
      update: mocks.aiOpUpdate,
      updateMany: mocks.aiOpUpdateMany,
    },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}))

import { POST } from '@/app/api/papers/[id]/explain/route'

const params = { params: Promise.resolve({ id: 'paper_1' }) }

function explainReq(text = 'The paper shows that X causes Y under conditions Z.'): NextRequest {
  return new NextRequest('http://app.example.com/api/papers/paper_1/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

/** What the upsert was asked to write. */
function upsertUpdate(): Record<string, unknown> {
  return mocks.explanationUpsert.mock.calls[0]![0].update
}

beforeEach(() => {
  vi.clearAllMocks()
  // The fixture fails attempt 1 and passes any revision — so `attemptCount`
  // drives whether this submission passes.
  vi.stubEnv('E2E_SKIP_LLM', '1')
  mocks.requireTeamContext.mockResolvedValue({
    ctx: { teamId: 'team_1', dbUserId: 'user_1' },
    error: null,
  })
  mocks.paperFindFirst.mockResolvedValue({
    id: 'paper_1',
    title: 'A paper',
    teamId: 'team_1',
    fullText: 'text',
    status: 'ready',
  })
  mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 1 })
  mocks.txExplanationFindUnique.mockResolvedValue({
    attemptCount: 1,
    bestScore: 0,
    kpAwarded: 0,
    passed: false,
  })
  mocks.queryRaw.mockResolvedValue([{ kp_awarded: 25 }])
  mocks.aiOpCreate.mockResolvedValue({ id: 'aiop_1' })
  mocks.aiOpUpdate.mockResolvedValue({})
  mocks.aiOpUpdateMany.mockResolvedValue({ count: 1 })
})

// P1-S6 remainder: the lock stops two callers grading at the same instant, but a
// client that timed out and resubmitted the SAME text used to pay again.
describe('an identical resubmission replays instead of re-grading', () => {
  const VERDICT = { accuracy: 90, completeness: 90, strengths: [], gaps: [], nextSteps: [] }

  it('replays a stored verdict without calling the provider', async () => {
    vi.stubEnv('E2E_SKIP_LLM', '')
    const { Prisma } = await import('@prisma/client')
    mocks.aiOpCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    mocks.aiOpFindUnique.mockResolvedValue({
      id: 'aiop_1', status: 'succeeded', createdAt: new Date(), resultJson: VERDICT,
    })

    const body = await (await POST(explainReq(), params)).json()

    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
    expect(body.accuracy).toBe(90)
    expect(body.passed).toBe(true)
  })

  it('409s while an identical submission is still being graded', async () => {
    vi.stubEnv('E2E_SKIP_LLM', '')
    const { Prisma } = await import('@prisma/client')
    mocks.aiOpCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    mocks.aiOpFindUnique.mockResolvedValue({
      id: 'aiop_1', status: 'running', createdAt: new Date(), resultJson: null,
    })

    const res = await POST(explainReq(), params)

    expect(res.status).toBe(409)
    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
    expect(mocks.attemptCreate).not.toHaveBeenCalled()
  })

  it('keys on the submitted TEXT, so a revision is graded fresh', async () => {
    vi.stubEnv('E2E_SKIP_LLM', '')
    mocks.anthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(VERDICT) }],
    })

    await POST(explainReq('first version of my explanation'), params)
    const keyA = mocks.aiOpCreate.mock.calls[0]![0].data.idempotencyKey
    mocks.aiOpCreate.mockClear()
    await POST(explainReq('a genuinely revised explanation'), params)
    const keyB = mocks.aiOpCreate.mock.calls[0]![0].data.idempotencyKey

    expect(keyA).not.toBe(keyB)
  })
})

describe('deciding state is re-read inside the lock', () => {
  it('takes the lock before reading the state it will write from', async () => {
    await POST(explainReq(), params)

    expect(mocks.lockAggregate).toHaveBeenCalledWith(tx, 'paper-explain:paper_1:user_1')
    expect(mocks.lockAggregate.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.txExplanationFindUnique.mock.invocationCallOrder[0]!,
    )
  })

  // Two concurrent submits used to compute the same attemptNo from a pre-call read.
  it('derives attemptNo from the in-transaction read, not the pre-call one', async () => {
    mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 1 }) // stale
    mocks.txExplanationFindUnique.mockResolvedValue({
      attemptCount: 4, // another submission landed while we were grading
      bestScore: 60,
      kpAwarded: 0,
      passed: false,
    })

    const body = await (await POST(explainReq(), params)).json()

    expect(body.attemptNo).toBe(5)
    expect(mocks.attemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attemptNo: 5 }) }),
    )
  })
})

describe('a late result can raise truth but never lower it', () => {
  it('does not un-pass an explanation another submission already passed', async () => {
    // This round FAILS (fixture attempt 1) but a passing revision landed first.
    mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 0 })
    mocks.txExplanationFindUnique.mockResolvedValue({
      attemptCount: 2,
      bestScore: 90,
      kpAwarded: 25,
      passed: true,
    })

    const body = await (await POST(explainReq(), params)).json()

    expect(body.passed).toBe(false) // this attempt's own verdict is reported honestly
    expect(upsertUpdate().passed).toBe(true) // …but the stored truth is not lowered
  })

  it('never lowers bestScore below what already stands', async () => {
    mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 0 })
    mocks.txExplanationFindUnique.mockResolvedValue({
      attemptCount: 2,
      bestScore: 95,
      kpAwarded: 25,
      passed: true,
    })

    await POST(explainReq(), params)

    expect(upsertUpdate().bestScore).toBe(95)
  })

  it('does raise bestScore and passed on a genuine improvement', async () => {
    mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 1 })
    mocks.txExplanationFindUnique.mockResolvedValue({
      attemptCount: 1,
      bestScore: 20,
      kpAwarded: 0,
      passed: false,
    })

    await POST(explainReq(), params)

    expect(upsertUpdate().passed).toBe(true)
    expect(upsertUpdate().bestScore as number).toBeGreaterThan(20)
  })

  it('reads KP eligibility from the fresh row, so a concurrent claim is not paid twice', async () => {
    mocks.explanationFindUnique.mockResolvedValue({ attemptCount: 1 })
    mocks.txExplanationFindUnique.mockResolvedValue({
      attemptCount: 1,
      bestScore: 90,
      kpAwarded: 25, // already claimed by the other submission
      passed: true,
    })

    const body = await (await POST(explainReq(), params)).json()

    expect(body.kpEarned).toBe(0)
    expect(mocks.queryRaw).not.toHaveBeenCalled()
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })

  it('mints KP exactly once, gated by the RETURNING-set claim', async () => {
    mocks.queryRaw.mockResolvedValue([]) // the WHERE-gated UPDATE matched nothing

    const body = await (await POST(explainReq(), params)).json()

    expect(body.kpEarned).toBe(0)
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })
})
