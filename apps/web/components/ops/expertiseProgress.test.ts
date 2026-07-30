import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { expertiseStatusSchema, gradeResultSchema } from './expertiseProgress'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * REFACTOR2 P2-3 — `components/ops/ExpertisePanel.tsx`'s three raw fetches.
 *
 * The panel declared `interface GradeResult` and cast `await res.json()` to it,
 * against the HANDOFF's "provider AND own-API output gets a safeParse, never a
 * cast". This is the surface where the cast costs something: the grade response
 * is not displayed, it is ARITHMETIC on the lab's currency.
 *
 *     if (data.raised) {
 *       const prevClearance = status?.clearanceLevel ?? data.newClearance - 1
 *       addCurrency({ clearanceLevel: data.newClearance - prevClearance, kp: data.kpEarned })
 *     }
 *
 * `labCurrency.addCurrency` adds the delta straight onto the strip's numbers
 * with no guard, so a `raised: true` body with no `newClearance` writes NaN into
 * the clearance the student sees for the rest of the session — and NaN is
 * sticky: every later `addCurrency` keeps it. The old code had no step at which
 * that could be noticed.
 */

const servers: http.Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

async function serve(status: number, body: unknown): Promise<string> {
  const server = http.createServer((_req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

/** The currency delta, verbatim from the panel. */
const clearanceDelta = (data: { newClearance: number }, prev: number | undefined) =>
  data.newClearance - (prev ?? data.newClearance - 1)

const FULL_GRADE = {
  score: 82,
  passed: true,
  threshold: 70,
  targetLevel: 2,
  raised: true,
  newClearance: 2,
  kpEarned: 40,
  results: [{ questionId: 'q1', score: 82, rationale: 'Clear reasoning.' }],
}

describe('the grade response is parsed before it moves currency', () => {
  it('reads the route’s real body and computes the clearance delta', async () => {
    const url = await serve(200, FULL_GRADE)
    const d = await requestJson(url, gradeResultSchema)
    expect(clearanceDelta(d, 1)).toBe(1)
    expect(d.kpEarned).toBe(40)
  })

  it('REJECTS a raised result with no newClearance — the cast made it NaN', async () => {
    const body = { ...FULL_GRADE, newClearance: undefined }
    // What the cast produced, for the record: NaN, added to the visible strip.
    expect(Number.isNaN(clearanceDelta(body as never, 1))).toBe(true)

    const url = await serve(200, body)
    await expect(requestJson(url, gradeResultSchema)).rejects.toThrow()
  })

  it('REJECTS a null score rather than rendering "null / 100"', async () => {
    const url = await serve(200, { ...FULL_GRADE, score: null })
    await expect(requestJson(url, gradeResultSchema)).rejects.toThrow()
  })

  it('surfaces the server’s own message on a non-2xx, so the retry text is honest', async () => {
    const url = await serve(409, { error: 'This exam is already being graded' })
    const err = await requestJson(url, gradeResultSchema).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('This exam is already being graded')
    expect((err as ApiError).status).toBe(409)
  })
})

describe('the clearance status is parsed before it draws the ladder', () => {
  const FULL_STATUS = {
    clearanceLevel: 1,
    maxClearance: 5,
    threshold: 70,
    nextLevel: { level: 2, title: 'Analyst', theme: 'Data', blurb: 'b', kpBonus: 40 },
    activeExam: null,
    levels: [{ level: 1, title: 'Trainee', theme: 'Basics', blurb: 'b', kpBonus: 20, cleared: true }],
    history: [
      { id: 'e1', targetLevel: 1, score: 90, passed: true, gradedAt: '2026-07-01T00:00:00.000Z', by: 'Ada' },
    ],
  }

  it('parses a team with no exam in progress', async () => {
    const url = await serve(200, FULL_STATUS)
    const d = await requestJson(url, expertiseStatusSchema)
    expect(d.activeExam).toBeNull()
    expect(d.levels[0]!.cleared).toBe(true)
  })

  it('parses a resumable exam, including its saved answers and index', async () => {
    const url = await serve(200, {
      ...FULL_STATUS,
      activeExam: {
        examId: 'x1',
        targetLevel: 2,
        level: { title: 'Analyst', theme: 'Data', blurb: 'b', kpBonus: 40 },
        questions: [{ id: 'q1', prompt: 'Why?', focus: 'design' }],
        answers: { q1: 'Because.' },
        progressIndex: 1,
      },
    })
    const d = await requestJson(url, expertiseStatusSchema)
    expect(d.activeExam?.answers).toEqual({ q1: 'Because.' })
    expect(d.activeExam?.progressIndex).toBe(1)
  })

  it('REJECTS a status with no clearanceLevel — the ladder used to draw against undefined', async () => {
    const url = await serve(200, { ...FULL_STATUS, clearanceLevel: undefined })
    await expect(requestJson(url, expertiseStatusSchema)).rejects.toThrow()
  })
})
