import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { quizHistorySchema } from './api'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * `components/literature/usePaperQuiz.ts` — the Q&A panel spent money on mount.
 *
 * REPRODUCED against the pre-fix effect (lines 39–73), transcribed verbatim
 * with a stubbed fetch: a history read answering `200 {}` produced
 *
 *     ['GET /api/papers/p1/quiz', 'POST /api/papers/p1/quiz']
 *
 * — the POST being a paid Anthropic quiz generation, with no student click. Two
 * separate faults reached that line:
 *
 *   1. `session: null` (the honest "you have never taken this quiz") fell
 *      straight through to `generateQuiz()`;
 *   2. `data.session` was read off an UNVALIDATED body, so a truncated,
 *      wrong-shaped, or error-shaped 200 was indistinguishable from (1).
 *
 * (1) is fixed in the hook — `session: null` now lands on an `idle` phase whose
 * only way forward is the student pressing "Start the quiz". (2) is fixed here:
 * the body is parsed, so a malformed one THROWS and can never be mistaken for
 * "no quiz yet". These tests pin (2) against the real client, over a real
 * socket, with no mocked fetch to be wrong about.
 */

const servers: http.Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

/** Serve `body` once, recording every request path+method that arrives. */
async function serve(status: number, body: unknown, seen: string[] = []): Promise<string> {
  const server = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`)
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

const session = {
  sessionId: 'sess_1',
  questions: [{ id: 'q1', prompt: 'What did they measure?', focus: 'methods' }],
  answers: { q1: 'the pH' },
  score: 80,
  passed: true,
  threshold: 70,
  results: [{ questionId: 'q1', score: 80, rationale: 'clear' }],
}

describe('the quiz history read is parsed, not cast', () => {
  it('a malformed-but-200 body THROWS instead of reading as "no quiz yet"', async () => {
    const seen: string[] = []
    const base = await serve(200, {}, seen)

    await expect(requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)).rejects.toThrow()
    // And nothing else was requested — no paid generation followed.
    expect(seen).toEqual(['GET /api/papers/p1/quiz'])
  })

  it('a session missing its questions is malformed too, not a usable session', async () => {
    // The shape that used to slip through: truthy `session`, unusable content.
    // The panel would have rendered a quiz with no questions and an always-
    // disabled submit button.
    const base = await serve(200, { session: { sessionId: 'sess_1', score: 80 } })

    await expect(requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)).rejects.toThrow()
  })

  it('an error body served with 200 does not read as "no quiz yet" either', async () => {
    const base = await serve(200, { error: 'Something went wrong' })

    await expect(requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)).rejects.toThrow()
  })

  it('a non-2xx surfaces the route’s message as a retryable ApiError', async () => {
    const base = await serve(429, { error: 'Rate limit exceeded' })

    await expect(requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)).rejects.toThrow(ApiError)
  })

  it('an explicit null session resolves to null — the ONE honest "never taken"', async () => {
    const base = await serve(200, { session: null })

    await expect(requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)).resolves.toEqual({ session: null })
  })

  it('a real graded session round-trips, extra server keys and all', async () => {
    const base = await serve(200, { session: { ...session, gradedAt: 'x', retried: false } })

    const { session: parsed } = await requestJson(`${base}/api/papers/p1/quiz`, quizHistorySchema)
    expect(parsed).toMatchObject({ sessionId: 'sess_1', passed: true, threshold: 70 })
    expect(parsed?.questions).toHaveLength(1)
  })
})
