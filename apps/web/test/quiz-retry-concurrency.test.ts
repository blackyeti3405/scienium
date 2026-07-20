import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A8 — the retry question's one-generation guarantee must hold under
 * CONCURRENCY, not just sequential reopening. The claim election is a
 * conditional update on `retryGenClaimedAt`; this suite runs two prepares in
 * one `Promise.all` against a store whose `updateMany` is genuinely
 * conditional (the same atomic primitive Postgres provides) and proves:
 *
 *   - exactly ONE paid generation call happens,
 *   - both callers converge on the SAME committed sixth question,
 *   - a failed generation releases the claim so a later attempt can retry.
 */

type Row = Record<string, any>
let sessionRow: Row

function matchesWhere(row: Row, where: Record<string, any>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      if (!(cond as Record<string, any>[]).some((w) => matchesWhere(row, w))) return false
      continue
    }
    const value = row[key]
    if (cond === null) {
      if (value !== null) return false
    } else if (cond instanceof Date) {
      if (!(value instanceof Date) || value.getTime() !== cond.getTime()) return false
    } else if (typeof cond === 'object') {
      if ('lt' in cond) {
        if (!(value instanceof Date) || !(value.getTime() < (cond.lt as Date).getTime())) return false
      } else if ('not' in cond) {
        if (value === cond.not) return false
      } else {
        throw new Error(`unsupported where condition on ${key}: ${JSON.stringify(cond)}`)
      }
    } else if (value !== cond) {
      return false
    }
  }
  return true
}

vi.mock('@/lib/db', () => ({
  db: {
    paperQuizSession: {
      // The include/select shape doesn't matter here — the row carries its
      // attempts + paper inline, mirroring what Prisma would hydrate.
      findFirst: async (args: { where: Record<string, any> }) =>
        matchesWhere(sessionRow, args.where) ? { ...sessionRow } : null,
      // Conditional update — atomic because there is no await between the
      // match and the write, exactly like a single-statement UPDATE ... WHERE.
      updateMany: async (args: { where: Record<string, any>; data: Row }) => {
        if (!matchesWhere(sessionRow, args.where)) return { count: 0 }
        Object.assign(sessionRow, args.data)
        return { count: 1 }
      },
    },
  },
}))

let generationBehavior: 'succeed' | 'fail-once' = 'succeed'
const createCalls = vi.fn()
vi.mock('@/lib/anthropic', () => ({
  anthropic: () => ({
    messages: {
      create: async () => {
        createCalls()
        await new Promise((r) => setTimeout(r, 120))
        if (generationBehavior === 'fail-once') {
          generationBehavior = 'succeed'
          throw new Error('provider unavailable')
        }
        return {
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                prompt: 'What methodological choice most shaped the findings?',
                focus: 'methodology',
                key: 'k6',
              }),
            },
          ],
        }
      },
    },
  }),
}))

vi.mock('@/lib/activity/log', () => ({ logActivity: vi.fn(async () => {}) }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))

import { prepareRetry } from '@/lib/literature/quiz-retry'

const PRINCIPAL = { dbUserId: 'user', teamId: 'team' }
const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({
  id: `q${i + 1}`,
  prompt: `Question ${i + 1}?`,
  focus: 'findings',
  key: `k${i + 1}`,
}))

beforeEach(() => {
  vi.stubEnv('E2E_SKIP_LLM', '')
  createCalls.mockClear()
  generationBehavior = 'succeed'
  sessionRow = {
    id: 'sess',
    paperId: 'paper',
    userId: 'user',
    questionsJson: QUESTIONS.map((q) => ({ ...q })),
    gradedAt: new Date(0),
    passed: false,
    retryGenClaimedAt: null,
    attempts: QUESTIONS.map((q) => ({
      question: q.prompt,
      response: 'a weak answer',
      evaluation: 'missed the point',
      score: 10,
    })),
    paper: { id: 'paper', teamId: 'team', title: 'A paper', fullText: 'full text' },
  }
})

describe('quiz-retry concurrent idempotency (A8)', () => {
  it('two concurrent prepares pay for exactly ONE generation call', async () => {
    const [a, b] = await Promise.all([
      prepareRetry('sess', 'paper', PRINCIPAL),
      prepareRetry('sess', 'paper', PRINCIPAL),
    ])

    expect(createCalls).toHaveBeenCalledTimes(1)
    expect(a.ok, JSON.stringify(a)).toBe(true)
    expect(b.ok, JSON.stringify(b)).toBe(true)
    if (a.ok && b.ok) {
      expect(a.newQuestionId).toBe('q6')
      expect(b.newQuestionId).toBe('q6')
      // Both callers see the SAME committed question — no last-write-wins fork.
      const promptA = a.questions.find((q) => q.id === 'q6')?.prompt
      const promptB = b.questions.find((q) => q.id === 'q6')?.prompt
      expect(promptA).toBe(promptB)
    }
    expect(sessionRow.questionsJson).toHaveLength(6)
    expect(sessionRow.retryGenClaimedAt).toBeNull()
  })

  it('a sequential re-open reuses the persisted question (no second call)', async () => {
    const first = await prepareRetry('sess', 'paper', PRINCIPAL)
    const second = await prepareRetry('sess', 'paper', PRINCIPAL)
    expect(first.ok && second.ok).toBe(true)
    expect(createCalls).toHaveBeenCalledTimes(1)
  })

  it('a failed generation releases the claim so a later attempt succeeds', async () => {
    generationBehavior = 'fail-once'
    const failed = await prepareRetry('sess', 'paper', PRINCIPAL)
    expect(failed.ok).toBe(false)
    // The claim MUST be released — a dead claim would lock the session for the TTL.
    expect(sessionRow.retryGenClaimedAt).toBeNull()

    const retried = await prepareRetry('sess', 'paper', PRINCIPAL)
    expect(retried.ok, JSON.stringify(retried)).toBe(true)
    expect(createCalls).toHaveBeenCalledTimes(2)
    expect(sessionRow.questionsJson).toHaveLength(6)
  })
})
