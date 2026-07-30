import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { researchPlanSummarySchema } from './api'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * REFACTOR2 §0.7 — `components/settings/LabProfileSettings.tsx`, the "silent
 * research-plan load failure" reading.
 *
 * REPRODUCED against the pre-fix effect:
 * `fetch('/api/research-plan').then(r => r.json()).then(d => { if (d.plan) {…} }).catch(() => {})`.
 * A rejected fetch was swallowed by the `.catch`; a non-2xx response (e.g. a
 * rate limit, `{ error: "…" }`) never even reached the `.catch` — `.json()`
 * parses fine, `d.plan` is simply `undefined`, so the `if (d.plan)` branch is
 * skipped and the panel renders exactly like a team that never connected a
 * plan, discarding whatever was already synced. `planLoaded` was set `true`
 * either way, so there was no loading OR error state left to react to — a
 * returning team on flaky wifi would see their connected doc silently vanish
 * from the form, with no signal and no retry.
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

describe('the research-plan summary is parsed, not silently swallowed', () => {
  it('reads a connected plan through the real (larger) response', async () => {
    const url = await serve(200, {
      plan: {
        googleDocUrl: 'https://docs.google.com/document/d/abc',
        projectType: 'science',
        projectSubtype: 'biology',
        lastSyncedAt: '2026-07-20T00:00:00.000Z',
        hasText: true,
        textPreview: 'Some synced text…',
        activeSource: 'google_doc',
        planTextFull: null,
        lastReview: null,
        lastIdeaCheck: null,
      },
      ideaCheck: { usedToday: 0, limit: 3, remaining: 3 },
    })
    const d = await requestJson(url, researchPlanSummarySchema)
    expect(d.plan?.googleDocUrl).toBe('https://docs.google.com/document/d/abc')
    expect(d.plan?.hasText).toBe(true)
  })

  it('a team with no plan yet gets plan: null, not a parse failure', async () => {
    const url = await serve(200, { plan: null, ideaCheck: { usedToday: 0, limit: 3, remaining: 3 } })
    const d = await requestJson(url, researchPlanSummarySchema)
    expect(d.plan).toBeNull()
  })

  it('THROWS on a non-2xx response — the old code just skipped the `if (d.plan)` branch', async () => {
    const url = await serve(429, { error: 'Too many requests' })
    // What used to happen: `.json()` succeeds, `d.plan` is undefined, the branch
    // that populates the form is skipped, and the `.catch` never even runs.
    // What happens now: the non-2xx status throws before the body is trusted.
    await expect(requestJson(url, researchPlanSummarySchema)).rejects.toBeInstanceOf(ApiError)
  })
})
