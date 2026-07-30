import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 §0.7/§0.9 — `lib/ops/codex/complete-service.ts` monotonic writes
 * (v0.68.0).
 *
 * Two named defects, both reproduced against the pre-fix code before this
 * batch touched anything:
 *
 *  1. A re-pass of an already-completed lesson unconditionally overwrote
 *     `completedAt` with "now" — no concurrency needed, every replay of a
 *     passed lesson silently rewrote the student's first-completion time.
 *  2. The failed-attempt `bestScore` write was a plain read-then-write (a
 *     `findUnique` + app-computed `Math.max` + an absolute-value `upsert`,
 *     no transaction). Two concurrent failed attempts could interleave so a
 *     LOWER score's write landed last, silently overwriting a higher one.
 *
 * These tests pin the ATTACK (an actual `Promise.all` interleaving for #2,
 * and a real elapsed-time re-pass for #1) rather than restating the fix, per
 * this codebase's "tests pin the attack, not the shape" convention (see
 * `test/paid-plan-writeback.test.ts`, `test/quiz-retry-concurrency.test.ts`).
 */

type Row = {
  userId: string
  teamId: string
  trackSlug: string
  lessonId: string
  completed: boolean
  bestScore: number
  kpAwarded: number
  completedAt: Date | null
}

const rows = new Map<string, Row>()
function rowKey(userId: string, teamId: string, trackSlug: string, lessonId: string): string {
  return `${userId}::${teamId}::${trackSlug}::${lessonId}`
}
function seedRow(row: Row) {
  rows.set(rowKey(row.userId, row.teamId, row.trackSlug, row.lessonId), { ...row })
}

let kpDayCount = 0
const teamCurrencyCalls: number[] = []
const recordActivityCalls: unknown[] = []

vi.mock('@/lib/db', () => ({
  db: {
    codexLessonProgress: {
      findMany: async () => [],
      findUnique: async ({ where }: any) => {
        const k = where.userId_teamId_trackSlug_lessonId
        const row = rows.get(rowKey(k.userId, k.teamId, k.trackSlug, k.lessonId))
        return row ? { kpAwarded: row.kpAwarded } : null
      },
      // Conditional update — atomic exactly like a single `UPDATE ... WHERE`
      // statement: the match check and the write happen with no `await`
      // between them, so no interleaving can split them.
      updateMany: async ({ where, data }: any) => {
        const row = rows.get(rowKey(where.userId, where.teamId, where.trackSlug, where.lessonId))
        if (!row) return { count: 0 }
        if (where.bestScore && typeof where.bestScore === 'object' && 'lt' in where.bestScore) {
          if (!(row.bestScore < where.bestScore.lt)) return { count: 0 }
        }
        Object.assign(row, data)
        return { count: 1 }
      },
    },
    codexKpDay: {
      findUnique: async () => ({ lessonsCompleted: kpDayCount }),
    },
    teamCurrency: { upsert: async () => {} },
    // Failed-attempt path: `db.$executeRaw(Prisma.sql\`INSERT ... ON CONFLICT
    // DO UPDATE SET best_score = GREATEST(...)\`)`. Only ONE `$executeRaw`
    // call site exists in the whole file, so we can read the interpolated
    // values positionally: [userId, teamId, trackSlug, lessonId, scorePct, scorePct].
    $executeRaw: async (sql: { values: unknown[] }) => {
      const [userId, teamId, trackSlug, lessonId, scorePct] = sql.values as [
        string,
        string,
        string,
        string,
        number,
      ]
      const key = rowKey(userId, teamId, trackSlug, lessonId)
      const row = rows.get(key)
      if (!row) {
        rows.set(key, { userId, teamId, trackSlug, lessonId, completed: false, bestScore: scorePct, kpAwarded: 0, completedAt: null })
      } else {
        row.bestScore = Math.max(row.bestScore, scorePct)
      }
      return 1
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      let queryRawCall = 0
      return fn({
        $queryRaw: async (sql: { values: unknown[] }) => {
          queryRawCall++
          if (queryRawCall === 1) {
            // Lesson claim: [userId, teamId, trackSlug, lessonId, scorePct, kpEarned, scorePct, kpEarned]
            const [userId, teamId, trackSlug, lessonId, scorePct, kpEarned] = sql.values as [
              string,
              string,
              string,
              string,
              number,
              number,
            ]
            const key = rowKey(userId, teamId, trackSlug, lessonId)
            const row = rows.get(key)
            if (!row) {
              const created: Row = {
                userId,
                teamId,
                trackSlug,
                lessonId,
                completed: true,
                bestScore: scorePct,
                kpAwarded: kpEarned,
                completedAt: new Date(),
              }
              rows.set(key, created)
              return [{ kp_awarded: kpEarned }]
            }
            if (row.kpAwarded !== 0) return [] // WHERE kp_awarded = 0 excludes this row
            row.completed = true
            row.bestScore = Math.max(row.bestScore, scorePct)
            row.kpAwarded = kpEarned
            row.completedAt = new Date()
            return [{ kp_awarded: kpEarned }]
          }
          // Daily-cap claim.
          if (kpDayCount >= 3) return []
          kpDayCount++
          return [{ lessons_completed: kpDayCount }]
        },
        teamCurrency: {
          upsert: async () => {
            teamCurrencyCalls.push(1)
          },
        },
      })
    },
  },
}))
vi.mock('@/lib/activity/log', () => ({
  recordActivity: vi.fn(async (_tx: unknown, ...rest: unknown[]) => {
    recordActivityCalls.push(rest)
  }),
}))

const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({
  kind: 'mc' as const,
  id: `q${i + 1}`,
  prompt: `Q${i + 1}?`,
  options: [
    { id: 'a', text: 'a' },
    { id: 'b', text: 'b' },
  ],
  answerId: 'a',
  explanations: { a: 'right', b: 'wrong' },
}))

const FAKE_TRACK = {
  slug: 'test-track',
  label: 'Test Track',
  core: {
    id: 'core',
    kind: 'core' as const,
    label: 'Core',
    units: [
      {
        id: 'unit1',
        label: 'Unit 1',
        lessons: [
          {
            id: 'lesson1',
            label: 'Lesson 1',
            readingMinutes: 5,
            sections: [],
            workedExample: '',
            judgeFraming: '',
            checkpoint: { questions: QUESTIONS },
          },
        ],
      },
    ],
  },
  branches: [],
}
vi.mock('@/lib/ops/codex/index', () => ({ loadTrack: async () => FAKE_TRACK }))

import { completeLesson } from '@/lib/ops/codex/complete-service'

function submissionScoring(correctCount: number) {
  return {
    answers: QUESTIONS.map((q, i) => ({
      kind: 'mc' as const,
      id: q.id,
      selectedOptionId: i < correctCount ? 'a' : 'b',
    })),
  }
}

const PRINCIPAL = { dbUserId: 'user1', teamId: 'team1' }
const INPUT_BASE = { trackSlug: 'test-track', lessonId: 'lesson1' }

beforeEach(() => {
  rows.clear()
  kpDayCount = 0
  teamCurrencyCalls.length = 0
  recordActivityCalls.length = 0
})

describe('re-pass never overwrites the first completion time', () => {
  it('a passing re-attempt (with a HIGHER score) leaves completedAt untouched', async () => {
    const firstCompletedAt = new Date('2026-01-01T00:00:00.000Z')
    seedRow({
      userId: 'user1',
      teamId: 'team1',
      trackSlug: 'test-track',
      lessonId: 'lesson1',
      completed: true,
      bestScore: 60,
      kpAwarded: 8,
      completedAt: firstCompletedAt,
    })

    const result = await completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(5) }) // 100%

    expect(result).toMatchObject({ ok: true, passed: true, kpEarned: 0 })
    const row = rows.get(rowKey('user1', 'team1', 'test-track', 'lesson1'))!
    expect(row.completedAt?.getTime()).toBe(firstCompletedAt.getTime())
    expect(row.bestScore).toBe(100)
  })

  it('a passing re-attempt never pays KP twice (idempotency untouched)', async () => {
    seedRow({
      userId: 'user1',
      teamId: 'team1',
      trackSlug: 'test-track',
      lessonId: 'lesson1',
      completed: true,
      bestScore: 60,
      kpAwarded: 8,
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(5) })

    expect(result).toMatchObject({ ok: true, kpEarned: 0 })
    expect(teamCurrencyCalls).toHaveLength(0)
  })

  it('MONOTONIC: a re-attempt with a LOWER score never lowers bestScore', async () => {
    seedRow({
      userId: 'user1',
      teamId: 'team1',
      trackSlug: 'test-track',
      lessonId: 'lesson1',
      completed: true,
      bestScore: 80,
      kpAwarded: 8,
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(4) }) // 80% (still a pass)

    expect(result.ok).toBe(true)
    const row = rows.get(rowKey('user1', 'team1', 'test-track', 'lesson1'))!
    expect(row.bestScore).toBe(80)
  })
})

describe('concurrent failed attempts never leave the lower score stored', () => {
  it('two interleaved failed submissions (60%, 20%) converge on the HIGHER score, whichever lands last', async () => {
    seedRow({
      userId: 'user1',
      teamId: 'team1',
      trackSlug: 'test-track',
      lessonId: 'lesson1',
      completed: false,
      bestScore: 0,
      kpAwarded: 0,
      completedAt: null,
    })

    const [resA, resB] = await Promise.all([
      completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(3) }), // 60%
      completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(1) }), // 20%
    ])

    expect(resA).toMatchObject({ ok: true, passed: false })
    expect(resB).toMatchObject({ ok: true, passed: false })
    const row = rows.get(rowKey('user1', 'team1', 'test-track', 'lesson1'))!
    // THE ATTACK: pre-fix, whichever write landed LAST won outright (an
    // absolute-value write), so the 20% attempt could stomp the 60% one. The
    // fix makes the write a `GREATEST`, so the final value is always the max
    // regardless of write order.
    expect(row.bestScore).toBe(60)
  })

  it('a failed attempt on a lesson already passed at a higher score cannot lower it', async () => {
    seedRow({
      userId: 'user1',
      teamId: 'team1',
      trackSlug: 'test-track',
      lessonId: 'lesson1',
      completed: true,
      bestScore: 90,
      kpAwarded: 8,
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(1) }) // 20%, fails

    expect(result).toMatchObject({ ok: true, passed: false })
    const row = rows.get(rowKey('user1', 'team1', 'test-track', 'lesson1'))!
    expect(row.bestScore).toBe(90)
    expect(row.completed).toBe(true) // a failed retry can never un-complete a lesson
  })
})

describe('first-time completion is unaffected by the monotonic rewrite', () => {
  it('a genuine first pass still mints KP and completes the lesson', async () => {
    const result = await completeLesson(PRINCIPAL, { ...INPUT_BASE, submission: submissionScoring(5) })

    expect(result).toMatchObject({ ok: true, passed: true, kpEarned: 8 })
    const row = rows.get(rowKey('user1', 'team1', 'test-track', 'lesson1'))!
    expect(row.completed).toBe(true)
    expect(row.kpAwarded).toBe(8)
    expect(row.bestScore).toBe(100)
    expect(teamCurrencyCalls).toHaveLength(1)
    expect(recordActivityCalls).toHaveLength(1)
  })
})
