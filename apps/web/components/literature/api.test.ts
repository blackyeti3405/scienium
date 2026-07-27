import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { teamPhaseSchema } from './api'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * REFACTOR2 §0.7 — `components/literature/LiteratureFeature.tsx`, the
 * "team-phase fetch ignores status and can hide advancement forever" reading.
 *
 * REPRODUCED against the pre-fix effect: `fetch('/api/team').then(r => r.json())`
 * with no `r.ok`, and a `.catch` commenting "degrade gracefully — fall through
 * to first-time path". There is no first-time path. On a 429 the body is
 * `{ error: "…" }`, so `d.phase` is `undefined`, and the gate
 *
 *     locked && (phase === 'literature_review' || !!researchIdea || !!ideaResult)
 *
 * is FALSE — a team with 25/25 sources sitting in `literature_review` with no
 * idea submitted saw no way to advance at all, and the effect's `[]` deps meant
 * nothing ever retried.
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

/** The gate condition, verbatim from the component. */
const gateVisible = (
  locked: boolean,
  phase: string | undefined,
  researchIdea: string | null,
  ideaResult: unknown,
) => locked && (phase === 'literature_review' || !!researchIdea || !!ideaResult)

describe('the team phase is parsed, not cast', () => {
  it('reads the phase from the route’s real (larger) response, ignoring the rest', async () => {
    const url = await serve(200, {
      teamId: 't1',
      name: 'Lab',
      phase: 'literature_review',
      researchIdea: null,
      labType: null,
      members: [{ userId: 'u1', name: 'A', role: 'lead', isYou: true }],
      invite: null,
      myClass: null,
    })
    const d = await requestJson(url, teamPhaseSchema)
    expect(d.phase).toBe('literature_review')
    expect(gateVisible(true, d.phase, d.researchIdea ?? null, null)).toBe(true)
  })

  it('THROWS on a 429 rather than yielding an undefined phase that hides the gate', async () => {
    const url = await serve(429, { error: 'Too many requests' })
    await expect(requestJson(url, teamPhaseSchema)).rejects.toBeInstanceOf(ApiError)
  })

  it('a 200 with no phase is a parse failure, not a silently hidden gate', async () => {
    // The exact pre-fix outcome: no throw, phase undefined, gate false.
    const url = await serve(200, { researchIdea: null, labType: null })
    expect(gateVisible(true, undefined, null, null)).toBe(false) // what used to happen
    await expect(requestJson(url, teamPhaseSchema)).rejects.toThrow() // what happens now
  })

  it('carries a submitted idea and lab type through', async () => {
    const url = await serve(200, {
      phase: 'research_planning',
      researchIdea: 'Soil pH and plant growth',
      labType: 'bio_core',
    })
    const d = await requestJson(url, teamPhaseSchema)
    expect(d.researchIdea).toBe('Soil pH and plant growth')
    expect(d.labType).toBe('bio_core')
    // Past the gate, but the read-only summary still shows.
    expect(gateVisible(true, d.phase, d.researchIdea ?? null, null)).toBe(true)
  })
})
