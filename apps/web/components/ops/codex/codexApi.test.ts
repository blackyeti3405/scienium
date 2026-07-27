import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { CodexProgressPayload } from './codexApi'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * REFACTOR2 §0.7 — `components/ops/CodexTab.tsx`.
 *
 * REPRODUCED against the pre-fix tab: `refresh` did `fetch(...).then(r => r.json())
 * .then((d: ProgressPayload) => setPayload(d))` with **no `r.ok` check**, so a
 * 429's `{ error: "…" }` body was committed as the payload. The guard after it
 * is `if (loadError || !payload)`, and an error object is truthy, so it passed
 * and `CodexHome` read `payload.progress.filter(...)` on `undefined` —
 * *"Cannot read properties of undefined (reading 'filter')"*, the whole tab
 * gone. `refresh()` runs after every completed lesson, so one lesson too many
 * in a minute was enough.
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

const VALID = {
  progress: [
    {
      trackSlug: 'physics',
      lessonId: 'l1',
      completed: true,
      bestScore: 90,
      kpAwarded: 20,
      completedAt: '2026-07-26T00:00:00.000Z',
    },
  ],
  dailyCap: { limit: 5, completedToday: 1 },
  studyPlan: {
    tracks: [{ trackSlug: 'physics', branchSlugs: ['mechanics'], rationale: 'because' }],
    manualTrackSlugs: [],
    generatedAt: '2026-07-26T00:00:00.000Z',
  },
}

describe('the Codex progress payload is parsed, not cast', () => {
  it('accepts the route’s real shape, including a null study plan', async () => {
    const url = await serve(200, { ...VALID, studyPlan: null })
    const payload = await requestJson(url, CodexProgressPayload)
    expect(payload.studyPlan).toBeNull()
    expect(payload.progress[0]!.trackSlug).toBe('physics')
  })

  it('THROWS on a 429 instead of committing the error body as the payload', async () => {
    const url = await serve(429, { error: 'Too many requests' })
    await expect(requestJson(url, CodexProgressPayload)).rejects.toBeInstanceOf(ApiError)
    // And it carries the server's own message, so the tab can say what happened.
    await expect(requestJson(url, CodexProgressPayload)).rejects.toThrow('Too many requests')
  })

  it('THROWS on a 200 whose body is the wrong shape', async () => {
    const url = await serve(200, { progress: 'not an array', dailyCap: {}, studyPlan: null })
    await expect(requestJson(url, CodexProgressPayload)).rejects.toThrow()
  })

  it('rejects a payload missing dailyCap — the field CodexHome renders first', async () => {
    const url = await serve(200, { progress: [], studyPlan: null })
    await expect(requestJson(url, CodexProgressPayload)).rejects.toThrow()
  })
})
