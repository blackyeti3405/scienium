import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Quiz-retry application service. The promises pinned here, in the order a
 * regression would hurt:
 *  - loadRetryableSession: another user's/team's session is a 404 (no
 *    existence leak), an ungraded or already-passed session a 409;
 *  - ensureNewQuestion is IDEMPOTENT — a session already carrying the extra
 *    question never triggers another generation (the "at most ONE paid
 *    generation per retry loop" cost guarantee);
 *  - submitRetry ignores answers for already-passed questions (a client
 *    replaying a passed id cannot get it regraded), carries passed scores
 *    into the aggregate, and attaches strongAnswer only to fresh failures.
 *
 * Runs under E2E_SKIP_LLM=1 for the grading stub (every accepted answer
 * scores 90) — generation idempotency is asserted via the DB write, which the
 * stub path shares with the real one.
 */

// Untyped vi.fn()s: the tests read `.mock.calls` with their own assertions,
// and a zero-arg inferred signature would make those reads type errors.
const mocks = vi.hoisted(() => ({
  sessionFindFirst: vi.fn<(...args: unknown[]) => unknown>(),
  sessionUpdate: vi.fn<(...args: unknown[]) => unknown>(),
  sessionUpdateMany: vi.fn<(...args: unknown[]) => unknown>(),
  sessionFindUniqueTx: vi.fn<(...args: unknown[]) => unknown>(),
  attemptCreateMany: vi.fn<(...args: unknown[]) => unknown>(),
  proficiencyFindUnique: vi.fn<(...args: unknown[]) => unknown>(),
  proficiencyUpsert: vi.fn<(...args: unknown[]) => unknown>(),
  currencyUpsert: vi.fn<(...args: unknown[]) => unknown>(),
  lockAggregate: vi.fn<(...args: unknown[]) => unknown>(),
  logActivityBestEffort: vi.fn<(...args: unknown[]) => unknown>(),
  recordActivity: vi.fn<(...args: unknown[]) => unknown>(() => Promise.resolve()),
  anthropicCreate: vi.fn<(...args: unknown[]) => unknown>(),
  // Replay ledger (P1-R11 remainder): the real grading path now runs through
  // runAiOperation, so the retry service needs `db.aiOperation` present.
  aiOpCreate: vi.fn<(...args: unknown[]) => unknown>(),
  aiOpFindUnique: vi.fn<(...args: unknown[]) => unknown>(),
  aiOpUpdate: vi.fn<(...args: unknown[]) => unknown>(),
  aiOpUpdateMany: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/activity/log', () => ({
  logActivityBestEffort: mocks.logActivityBestEffort,
  // Progression events now write inside the caller's transaction (P1-R5), so the
  // mock records the tx it was handed — that IS the property under test.
  recordActivity: mocks.recordActivity,
}))
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.anthropicCreate } }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    paperQuizSession: {
      findFirst: mocks.sessionFindFirst,
      update: mocks.sessionUpdate,
      updateMany: mocks.sessionUpdateMany,
    },
    aiOperation: {
      create: mocks.aiOpCreate,
      findUnique: mocks.aiOpFindUnique,
      update: mocks.aiOpUpdate,
      updateMany: mocks.aiOpUpdateMany,
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        paperQuizAttempt: { createMany: mocks.attemptCreateMany },
        paperQuizSession: {
          update: mocks.sessionUpdate,
          findUnique: mocks.sessionFindUniqueTx,
        },
        paperProficiency: {
          findUnique: mocks.proficiencyFindUnique,
          upsert: mocks.proficiencyUpsert,
        },
        teamCurrency: { upsert: mocks.currencyUpsert },
      }),
  },
}))

import { prepareRetry, submitRetry } from './quiz-retry'
import { QUIZ_QUESTION_COUNT, RETRY_SCORE_CAP } from './quiz'
import { KP_PER_SOURCE_MAX } from '@/lib/economy'

const PRINCIPAL = { dbUserId: 'u1', teamId: 't1' }

/** The 5 original questions (q1..q5) + optionally the persisted extra q6. */
function questionSet(withExtra: boolean) {
  const qs = Array.from({ length: QUIZ_QUESTION_COUNT }, (_, i) => ({
    id: `q${i + 1}`,
    prompt: `Prompt ${i + 1}`,
    focus: 'findings',
    key: `Key ${i + 1}`,
  }))
  if (withExtra) {
    qs.push({ id: 'q6', prompt: '[extra] retry question', focus: 'findings', key: 'Extra key' })
  }
  return qs
}

/**
 * A graded, failed session: q1/q2 failed (40), q3-q5 passed (80). Attempts are
 * keyed by PROMPT text, as the service maps them.
 */
function failedSession(opts: { withExtra?: boolean; teamId?: string; passed?: boolean; gradedAt?: Date | null } = {}) {
  return {
    id: 'sess_1',
    passed: opts.passed ?? false,
    gradedAt: opts.gradedAt === undefined ? new Date('2026-07-01') : opts.gradedAt,
    questionsJson: questionSet(opts.withExtra ?? false),
    attempts: [
      { question: 'Prompt 1', score: 40, evaluation: 'weak' },
      { question: 'Prompt 2', score: 40, evaluation: 'weak' },
      { question: 'Prompt 3', score: 80, evaluation: 'good' },
      { question: 'Prompt 4', score: 80, evaluation: 'good' },
      { question: 'Prompt 5', score: 80, evaluation: 'good' },
    ],
    paper: { id: 'paper_1', teamId: opts.teamId ?? 't1', title: 'Paper', fullText: 'text' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('E2E_SKIP_LLM', '1')
  mocks.sessionUpdate.mockResolvedValue({})
  // Claim + commit both go through conditional updateMany (A8); a count of 1
  // means this caller won/held the claim.
  mocks.sessionUpdateMany.mockResolvedValue({ count: 1 })
  // Session state re-read INSIDE the transaction for the monotonic write (P1-R11).
  mocks.sessionFindUniqueTx.mockResolvedValue({ score: 0, passed: false })
  // Fresh operation each time: no prior result to replay.
  mocks.aiOpCreate.mockResolvedValue({ id: 'aiop_1' })
  mocks.aiOpUpdate.mockResolvedValue({})
  mocks.aiOpUpdateMany.mockResolvedValue({ count: 1 })
  mocks.attemptCreateMany.mockResolvedValue({ count: 0 })
  mocks.proficiencyFindUnique.mockResolvedValue(null)
  mocks.proficiencyUpsert.mockResolvedValue({})
  mocks.currencyUpsert.mockResolvedValue({})
  mocks.lockAggregate.mockResolvedValue(undefined)
  mocks.logActivityBestEffort.mockResolvedValue(undefined)
})

describe('loadRetryableSession scoping (via prepareRetry)', () => {
  it("another team's session is a 404, not a 403 (no existence leak)", async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ teamId: 'other_team' }))
    const res = await prepareRetry('sess_1', 'paper_1', PRINCIPAL)
    expect(res).toMatchObject({ ok: false, status: 404 })
  })

  it('the session query itself is scoped to the caller (userId + paperId in the where)', async () => {
    mocks.sessionFindFirst.mockResolvedValue(null)
    await prepareRetry('sess_1', 'paper_1', PRINCIPAL)
    expect(mocks.sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess_1', userId: 'u1', paperId: 'paper_1' },
      }),
    )
  })

  it('an ungraded session cannot be retried (409)', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ gradedAt: null }))
    expect(await prepareRetry('sess_1', 'paper_1', PRINCIPAL)).toMatchObject({
      ok: false,
      status: 409,
    })
  })

  it('an already-passed session cannot be retried (409)', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ passed: true }))
    expect(await prepareRetry('sess_1', 'paper_1', PRINCIPAL)).toMatchObject({
      ok: false,
      status: 409,
    })
  })
})

describe('ensureNewQuestion idempotency (the one-paid-generation guarantee)', () => {
  it('first prepare persists exactly one extra question', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: false }))
    const res = await prepareRetry('sess_1', 'paper_1', PRINCIPAL)

    expect(res.ok).toBe(true)
    // The stub path still persists — that (conditional) write is the
    // idempotency marker, and it must release the claim in the same commit.
    const commits = mocks.sessionUpdateMany.mock.calls
      .map((c) => c[0] as { data: { questionsJson?: Array<{ id: string }>; retryGenClaimedAt?: Date | null } })
      .filter((c) => c.data.questionsJson !== undefined)
    expect(commits).toHaveLength(1)
    expect(commits[0]!.data.questionsJson).toHaveLength(QUIZ_QUESTION_COUNT + 1)
    expect(commits[0]!.data.retryGenClaimedAt).toBeNull()
  })

  it('a session already carrying the extra question generates NOTHING new', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
    vi.stubEnv('E2E_SKIP_LLM', '') // force the REAL generation path...
    const res = await prepareRetry('sess_1', 'paper_1', PRINCIPAL)

    expect(res.ok).toBe(true)
    // ...and prove it was never reached: no model call, no claim, no write.
    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
    expect(mocks.sessionUpdate).not.toHaveBeenCalled()
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled()
  })

  it('prepare returns only still-failed questions + the new one, keys stripped', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
    const res = await prepareRetry('sess_1', 'paper_1', PRINCIPAL)

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.failedQuestionIds.sort()).toEqual(['q1', 'q2'])
      expect(res.newQuestionId).toBe('q6')
      expect(res.questions.map((q) => q.id).sort()).toEqual(['q1', 'q2', 'q6'])
      for (const q of res.questions) expect(q).not.toHaveProperty('key')
    }
  })
})

describe('submitRetry — score integrity', () => {
  beforeEach(() => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
  })

  it('a replayed id for an already-PASSED question is ignored, its old score stands', async () => {
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'better answer' },
      { questionId: 'q2', response: 'better answer' },
      { questionId: 'q3', response: 'regrade me please' }, // passed at 80 — must be ignored
      { questionId: 'q6', response: 'new answer' },
    ])

    expect(res.ok).toBe(true)
    if (res.ok) {
      const q3 = res.results.find((r) => r.questionId === 'q3')
      expect(q3?.score).toBe(80) // carried forward, NOT the stub's 90
      // And q3 was never sent to grading/persisted as a new attempt:
      const attemptRows = mocks.attemptCreateMany.mock.calls[0][0] as {
        data: Array<{ question: string }>
      }
      expect(attemptRows.data.map((a) => a.question).sort()).toEqual(
        ['Prompt 1', 'Prompt 2', '[extra] retry question'].sort(),
      )
    }
  })

  it('previously-passed scores carry into the aggregate', async () => {
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q2', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])

    expect(res.ok).toBe(true)
    if (res.ok) {
      // Scores: q1=90, q2=90, q3-5=80 (carried), q6=90 → mean 85, under the cap.
      expect(res.score).toBe(85)
      expect(res.passed).toBe(true)
    }
  })

  it('the retry cap BINDS: an uncapped mean above 95 aggregates to exactly the cap', async () => {
    // One failed question (q1), four carried at 100. Stub grades accepted
    // answers at 90 → uncapped mean (90+100+100+100+100+90)/6 ≈ 96.7 → 97,
    // which the cap must pull down to 95. A regression dropping the cap
    // returns 97 and fails here.
    mocks.sessionFindFirst.mockResolvedValue({
      ...failedSession({ withExtra: true }),
      attempts: [
        { question: 'Prompt 1', score: 40, evaluation: 'weak' },
        { question: 'Prompt 2', score: 100, evaluation: 'perfect' },
        { question: 'Prompt 3', score: 100, evaluation: 'perfect' },
        { question: 'Prompt 4', score: 100, evaluation: 'perfect' },
        { question: 'Prompt 5', score: 100, evaluation: 'perfect' },
      ],
    })
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.score).toBe(RETRY_SCORE_CAP)
  })

  it('an unanswered failed question grades as an empty response (0 from the grader), not skipped', async () => {
    // Only q1 is re-answered; q2 (failed) gets an empty answer in the payload.
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])
    expect(res.ok).toBe(true)
    const attemptRows = mocks.attemptCreateMany.mock.calls[0][0] as {
      data: Array<{ question: string; response: string }>
    }
    const q2Row = attemptRows.data.find((a) => a.question === 'Prompt 2')
    expect(q2Row?.response).toBe('')
  })

  it('KP flows through the transaction only when the award says so', async () => {
    mocks.proficiencyFindUnique.mockResolvedValue({ kpAwarded: KP_PER_SOURCE_MAX, bestScore: 95 })
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q2', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.kpEarned).toBe(0) // ceiling already banked — high-water pays nothing
    expect(mocks.currencyUpsert).not.toHaveBeenCalled()
  })

  it('a pass records proficiency with demonstrated=true inside the same transaction', async () => {
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q2', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])
    expect(res.ok).toBe(true)
    expect(mocks.proficiencyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ demonstrated: true }),
        update: expect.objectContaining({ demonstrated: true }),
      }),
    )
  })
})

// ── REFACTOR2 P1-R11 ────────────────────────────────────────────────────────
// Retry-question GENERATION had a pre-call claim (A8); retry GRADING had none,
// so two concurrent submits both graded and both paid — the advisory lock only
// protected the KP arithmetic that ran after the money was gone. And the session
// write was UNCONDITIONAL, so a later low-scoring retry could set passed=false
// on a session another retry had already passed, while PaperProficiency stayed
// demonstrated=true.
describe('submitRetry — grading claim and monotonic session write (P1-R11)', () => {
  beforeEach(() => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
  })

  /** The conditional stamp that elects one grader. */
  function gradeClaimCall() {
    return mocks.sessionUpdateMany.mock.calls.find(
      (c) => (c[0] as { data?: Record<string, unknown> })?.data?.retryGradeClaimedAt instanceof Date,
    )
  }

  it('claims the grading slot before doing any work', async () => {
    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'better' }])

    expect(gradeClaimCall()).toBeDefined()
    expect(mocks.sessionUpdateMany.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.attemptCreateMany.mock.invocationCallOrder[0]!,
    )
  })

  it('refuses a second concurrent submit instead of grading again', async () => {
    mocks.sessionUpdateMany.mockResolvedValue({ count: 0 }) // another submit holds it

    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q2', response: 'better' },
    ])

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(409)
    // Nothing was graded or persisted — the loser spends nothing.
    expect(mocks.attemptCreateMany).not.toHaveBeenCalled()
    expect(mocks.proficiencyUpsert).not.toHaveBeenCalled()
  })

  it('takes over a stale claim rather than wedging the session forever', async () => {
    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'better' }])

    const where = (gradeClaimCall()![0] as { where: { OR?: unknown[] } }).where
    expect(where.OR).toEqual([
      { retryGradeClaimedAt: null },
      { retryGradeClaimedAt: { lt: expect.any(Date) } },
    ])
  })

  // The headline: a late FAILING retry must not un-pass the session.
  it('never lowers a session another retry already passed', async () => {
    mocks.sessionFindUniqueTx.mockResolvedValue({ score: 88, passed: true })
    // Force the real grading path so this round genuinely fails.
    vi.stubEnv('E2E_SKIP_LLM', '')
    mocks.anthropicCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            { questionId: 'q1', score: 5, rationale: 'weak' },
            { questionId: 'q2', score: 5, rationale: 'weak' },
            { questionId: 'q6', score: 5, rationale: 'weak' },
          ]),
        },
      ],
    })

    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'weak' }])

    const write = mocks.sessionUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(write.data.passed).toBe(true)
    expect(write.data.score).toBe(88)
  })

  it('still raises a session that genuinely improves', async () => {
    mocks.sessionFindUniqueTx.mockResolvedValue({ score: 40, passed: false })

    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'better' }])

    const write = mocks.sessionUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(write.data.passed).toBe(true)
    expect(write.data.score as number).toBeGreaterThan(40)
  })

  it('clears the grading claim on the committing write', async () => {
    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'better' }])

    const write = mocks.sessionUpdate.mock.calls[0]![0] as { data: Record<string, unknown> }
    expect(write.data.retryGradeClaimedAt).toBeNull()
  })
})

// REFACTOR2 P1-R11 remainder: the claim stops two callers grading at the same
// instant, but a client that timed out and retried with the SAME answers used
// to pay again. The ledger replays the result it already paid for.
describe('submitRetry — identical resubmissions replay instead of re-grading', () => {
  beforeEach(() => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
    vi.stubEnv('E2E_SKIP_LLM', '') // exercise the real grading path
  })

  it('replays a stored grade without calling the provider again', async () => {
    const { Prisma } = await import('@prisma/client')
    mocks.aiOpCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    mocks.aiOpFindUnique.mockResolvedValue({
      id: 'aiop_1',
      status: 'succeeded',
      createdAt: new Date(),
      resultJson: [
        { questionId: 'q1', score: 91, rationale: 'replayed' },
        { questionId: 'q2', score: 91, rationale: 'replayed' },
        { questionId: 'q6', score: 91, rationale: 'replayed' },
      ],
    })

    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q2', response: 'same answer as before' },
    ])

    expect(res.ok).toBe(true)
    // The provider was never called — the stored grade was reused.
    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
    if (res.ok) expect(res.results.find((r) => r.questionId === 'q2')?.score).toBe(91)
  })

  it('keys the operation on the session AND the exact answers', async () => {
    mocks.anthropicCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify([{ questionId: 'q2', score: 80, rationale: 'ok' }]) }],
    })

    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'first' }])
    const keyA = (mocks.aiOpCreate.mock.calls[0]![0] as { data: { idempotencyKey: string } }).data.idempotencyKey

    vi.clearAllMocks()
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
    mocks.sessionUpdateMany.mockResolvedValue({ count: 1 })
    mocks.sessionFindUniqueTx.mockResolvedValue({ score: 0, passed: false })
    mocks.aiOpCreate.mockResolvedValue({ id: 'aiop_2' })
    mocks.aiOpUpdate.mockResolvedValue({})
    mocks.anthropicCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify([{ questionId: 'q2', score: 80, rationale: 'ok' }]) }],
    })

    await submitRetry('sess_1', 'paper_1', PRINCIPAL, [{ questionId: 'q2', response: 'DIFFERENT' }])
    const keyB = (mocks.aiOpCreate.mock.calls[0]![0] as { data: { idempotencyKey: string } }).data.idempotencyKey

    // Different answers must not replay each other's grade.
    expect(keyA).not.toBe(keyB)
  })

  it('refuses rather than double-grading while an identical submission is in flight', async () => {
    const { Prisma } = await import('@prisma/client')
    mocks.aiOpCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    )
    mocks.aiOpFindUnique.mockResolvedValue({
      id: 'aiop_1', status: 'running', createdAt: new Date(), resultJson: null,
    })

    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q2', response: 'same' },
    ])

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(409)
    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
  })
})
