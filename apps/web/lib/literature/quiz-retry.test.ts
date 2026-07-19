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
  attemptCreateMany: vi.fn<(...args: unknown[]) => unknown>(),
  proficiencyFindUnique: vi.fn<(...args: unknown[]) => unknown>(),
  proficiencyUpsert: vi.fn<(...args: unknown[]) => unknown>(),
  currencyUpsert: vi.fn<(...args: unknown[]) => unknown>(),
  lockAggregate: vi.fn<(...args: unknown[]) => unknown>(),
  logActivity: vi.fn<(...args: unknown[]) => unknown>(),
  anthropicCreate: vi.fn<(...args: unknown[]) => unknown>(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: mocks.lockAggregate }))
vi.mock('@/lib/activity/log', () => ({ logActivity: mocks.logActivity }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({ messages: { create: mocks.anthropicCreate } }),
}))
vi.mock('@/lib/db', () => ({
  db: {
    paperQuizSession: { findFirst: mocks.sessionFindFirst, update: mocks.sessionUpdate },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        paperQuizAttempt: { createMany: mocks.attemptCreateMany },
        paperQuizSession: { update: mocks.sessionUpdate },
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
  mocks.attemptCreateMany.mockResolvedValue({ count: 0 })
  mocks.proficiencyFindUnique.mockResolvedValue(null)
  mocks.proficiencyUpsert.mockResolvedValue({})
  mocks.currencyUpsert.mockResolvedValue({})
  mocks.lockAggregate.mockResolvedValue(undefined)
  mocks.logActivity.mockResolvedValue(undefined)
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
    // The stub path still persists — that write is the idempotency marker.
    expect(mocks.sessionUpdate).toHaveBeenCalledTimes(1)
    const saved = mocks.sessionUpdate.mock.calls[0][0] as {
      data: { questionsJson: Array<{ id: string }> }
    }
    expect(saved.data.questionsJson).toHaveLength(QUIZ_QUESTION_COUNT + 1)
  })

  it('a session already carrying the extra question generates NOTHING new', async () => {
    mocks.sessionFindFirst.mockResolvedValue(failedSession({ withExtra: true }))
    vi.stubEnv('E2E_SKIP_LLM', '') // force the REAL generation path...
    const res = await prepareRetry('sess_1', 'paper_1', PRINCIPAL)

    expect(res.ok).toBe(true)
    // ...and prove it was never reached: no model call, no questionsJson write.
    expect(mocks.anthropicCreate).not.toHaveBeenCalled()
    expect(mocks.sessionUpdate).not.toHaveBeenCalled()
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
    mocks.proficiencyFindUnique.mockResolvedValue({ kpAwarded: 100, bestScore: 95 })
    const res = await submitRetry('sess_1', 'paper_1', PRINCIPAL, [
      { questionId: 'q1', response: 'a' },
      { questionId: 'q2', response: 'a' },
      { questionId: 'q6', response: 'a' },
    ])
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.kpEarned).toBe(0) // 100 KP already banked — high-water pays nothing
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
