import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * SVC-1 — `lib/literature/quiz-service.ts` is now the ONE owner of paper-quiz
 * reward minting, shared by the initial grade route and the retry service.
 * Consolidating money is only worth doing if the consolidated module is pinned,
 * so what is pinned here is the ATTACK on each rule, not the shape:
 *
 *  - a race loser on the INITIAL grade mints nothing and records nothing
 *    (the double-award a concurrent second grade would otherwise pay);
 *  - a RETRY is exempt from that bail — the session is graded by construction —
 *    and its session write is MONOTONIC, so a late low retry cannot erase a
 *    pass that `PaperProficiency.demonstrated` still asserts;
 *  - KP is topped up by the IMPROVEMENT over this student's high-water mark,
 *    so re-passing the same source at the same score pays zero;
 *  - a failing attempt writes attempt history and mints nothing;
 *  - the `quiz_passed` record is written INSIDE the same transaction as the
 *    money (P1-R5) — never best-effort afterwards.
 */

interface SessionRow {
  [key: string]: unknown
  id: string
  score: number | null
  passed: boolean | null
  gradedAt: Date | null
  questionsJson: unknown
  retryGradeClaimedAt: Date | null
}

let sessions: SessionRow[]
let proficiencies: { paperId: string; userId: string; kpAwarded: number; bestScore: number }[]
let currency: { teamId: string; kp: number }[]
let attempts: Record<string, unknown>[]
/** Records written through `recordActivity` — i.e. inside the transaction. */
let activities: { action: string; inTx: boolean }[]
let inTransaction = false

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: async () => undefined }))
vi.mock('@/lib/activity/log', () => ({
  recordActivity: async (_tx: unknown, _t: string, _u: string, action: string) => {
    activities.push({ action, inTx: inTransaction })
  },
}))

function applyData(row: Record<string, unknown>, data: Record<string, any>): void {
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v && typeof v === 'object' && 'increment' in (v as object)) {
      row[k] = ((row[k] as number) ?? 0) + (v as { increment: number }).increment
    } else {
      row[k] = v
    }
  }
}

vi.mock('@/lib/db', () => {
  const db = {
    paperQuizSession: {
      findUnique: async ({ where }: any) => sessions.find((s) => s.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = sessions.find((s) => s.id === where.id)!
        applyData(row as unknown as Record<string, unknown>, data)
        return row
      },
    },
    paperProficiency: {
      findUnique: async ({ where }: any) =>
        proficiencies.find(
          (p) =>
            p.paperId === where.paperId_userId.paperId && p.userId === where.paperId_userId.userId,
        ) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const found = proficiencies.find(
          (p) =>
            p.paperId === where.paperId_userId.paperId && p.userId === where.paperId_userId.userId,
        )
        if (found) applyData(found as unknown as Record<string, unknown>, update)
        else proficiencies.push({ ...create })
        return {}
      },
    },
    paperQuizAttempt: {
      createMany: async ({ data }: any) => {
        attempts.push(...data)
        return { count: data.length }
      },
    },
    teamCurrency: {
      upsert: async ({ where, create, update }: any) => {
        const found = currency.find((c) => c.teamId === where.teamId)
        if (found) applyData(found as unknown as Record<string, unknown>, update)
        else currency.push({ kp: 0, ...create })
        return {}
      },
    },
    $transaction: async (fn: any) => {
      inTransaction = true
      try {
        return await fn(db)
      } finally {
        inTransaction = false
      }
    },
  }
  return { db }
})

const { commitQuizGrade } = await import('@/lib/literature/quiz-service')

const QUESTIONS = [{ id: 'q1', prompt: 'Why?', focus: 'findings', key: 'k1' }]

function session(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'sess_1',
    score: null,
    passed: null,
    gradedAt: null,
    questionsJson: QUESTIONS,
    retryGradeClaimedAt: null,
    ...overrides,
  }
}

function commit(overrides: Partial<Parameters<typeof commitQuizGrade>[0]> = {}) {
  return commitQuizGrade({
    sessionId: 'sess_1',
    paperId: 'paper_1',
    paperTitle: 'A Paper',
    teamId: 'team_1',
    dbUserId: 'user_1',
    aggregate: 90,
    passed: true,
    questions: QUESTIONS,
    attempts: [{ question: 'Why?', response: 'because', evaluation: 'good', score: 90 }],
    retry: false,
    ...overrides,
  })
}

beforeEach(() => {
  sessions = [session()]
  proficiencies = []
  currency = [{ teamId: 'team_1', kp: 0 }]
  attempts = []
  activities = []
})

describe('the initial grade is first-writer-wins', () => {
  it('mints the KP and records the pass on the winning grade', async () => {
    const out = await commit()

    expect(out).toEqual({ graded: true, kpEarned: 90 })
    expect(currency[0]!.kp).toBe(90)
    expect(proficiencies[0]).toMatchObject({ demonstrated: true, bestScore: 90, kpAwarded: 90 })
    expect(activities).toEqual([{ action: 'quiz_passed', inTx: true }])
  })

  it('THE ATTACK: a race loser writes nothing at all', async () => {
    // A concurrent request already stamped `gradedAt` inside the lock. Without
    // the bail, this second commit pays a second 90 KP for one quiz and files a
    // second `quiz_passed` for the teacher.
    sessions[0] = session({ gradedAt: new Date(), score: 90, passed: true })

    const out = await commit()

    expect(out).toEqual({ graded: false, kpEarned: 0 })
    expect(currency[0]!.kp).toBe(0)
    expect(attempts).toEqual([])
    expect(activities).toEqual([])
  })
})

describe('a retry may raise a verdict but never lower it', () => {
  it('is exempt from the graded-bail — a retry session is graded by construction', async () => {
    sessions[0] = session({ gradedAt: new Date(), score: 40, passed: false })

    const out = await commit({ retry: true, aggregate: 85 })

    expect(out).toEqual({ graded: true, kpEarned: 85 })
    expect(sessions[0]).toMatchObject({ score: 85, passed: true, retryGradeClaimedAt: null })
  })

  it('THE ATTACK: a late low retry cannot erase an existing pass', async () => {
    sessions[0] = session({ gradedAt: new Date(), score: 88, passed: true })
    proficiencies.push({ paperId: 'paper_1', userId: 'user_1', kpAwarded: 88, bestScore: 88 })

    await commit({ retry: true, aggregate: 30, passed: false })

    // `score` max, `passed` OR — the record may not contradict
    // PaperProficiency.demonstrated, which stays true.
    expect(sessions[0]).toMatchObject({ score: 88, passed: true })
    expect(currency[0]!.kp).toBe(0)
    // `expect(activities).toEqual([])` used to sit here and was arithmetically
    // implied: `recordActivity` is inside `if (input.passed)` and this call
    // passes `passed: false`, so no guard in the award path can flip it. The two
    // assertions above are the ones that go red when the `Math.max` / `passed ||`
    // high-water is dropped.
  })
})

describe('KP is the improvement over this student’s high-water mark', () => {
  it('THE ATTACK: re-passing the same source at the same score pays nothing', async () => {
    proficiencies.push({ paperId: 'paper_1', userId: 'user_1', kpAwarded: 90, bestScore: 90 })

    const out = await commit({ retry: true, aggregate: 90 })

    expect(out.kpEarned).toBe(0)
    expect(currency[0]!.kp).toBe(0)
  })

  it('tops up only the difference when a retake beats the prior best', async () => {
    proficiencies.push({ paperId: 'paper_1', userId: 'user_1', kpAwarded: 70, bestScore: 70 })

    const out = await commit({ retry: true, aggregate: 95 })

    expect(out.kpEarned).toBe(25)
    expect(currency[0]!.kp).toBe(25)
    expect(proficiencies[0]).toMatchObject({ bestScore: 95, kpAwarded: 95 })
  })
})

describe('a failing attempt', () => {
  it('writes attempt history, mints nothing, records nothing', async () => {
    const out = await commit({ aggregate: 40, passed: false })

    expect(out).toEqual({ graded: true, kpEarned: 0 })
    expect(attempts).toHaveLength(1)
    expect(proficiencies).toEqual([])
    expect(currency[0]!.kp).toBe(0)
    expect(activities).toEqual([])
  })
})
