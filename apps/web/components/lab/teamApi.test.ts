import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { teamSchema, joinClassSchema } from './teamApi'
import { requestJson, ApiError } from '@/lib/api/client'

/**
 * REFACTOR2 P2-3 — `components/lab/TeamPanel.tsx`.
 *
 * REPRODUCED against the pre-fix panel. Two shapes, both from the same three
 * lines:
 *
 *     const d = await fetch('/api/team').then((r) => r.json())
 *     if (!d.error) setData(d)
 *
 *   1. A 5xx re-read after a membership change returns `{ error }`, so the
 *      branch is skipped and the panel keeps rendering the roster from BEFORE
 *      the change — a removed researcher still listed, with nothing on screen
 *      admitting the list is stale.
 *   2. An expired Clerk session answers this GET with a 307 to the sign-in page
 *      (documented in HANDOFF: 307, not 401), which `fetch` follows: status 200,
 *      body HTML. `r.json()` REJECTS, and because `refresh()` was awaited inside
 *      `makeLead`'s `try`, the rejection was caught by the caller and shown as
 *      "Could not hand over the lead role" — about a handover the server had
 *      already committed.
 *
 * Both now reject at the client module, and `refresh()` owns the failure
 * (stale-list banner) instead of the mutation's catch.
 */

const servers: http.Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

async function serve(
  status: number,
  body: unknown,
  contentType = 'application/json',
): Promise<string> {
  const server = http.createServer((_req, res) => {
    res.writeHead(status, { 'Content-Type': contentType })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

const TEAM = {
  // The route returns more than the panel renders; the extra keys must not make
  // the parse fail, and must not survive it either.
  teamId: 't1',
  phase: 'working',
  researchIdea: 'Mould on bread',
  labType: 'volt_lab',
  advance: null,
  name: 'Volt Lab',
  maxMembers: 4,
  memberCount: 2,
  isLead: true,
  members: [
    { userId: 'u1', name: 'Ada', role: 'lead', isYou: true },
    { userId: 'u2', name: 'Linus', role: 'member', isYou: false },
  ],
  invite: { code: 'ABC123', expiresAt: '2026-08-01T00:00:00.000Z' },
  myClass: { id: 'c1', name: 'Period 3' },
}

describe('the team roster is parsed, not sniffed for an `error` key', () => {
  it('reads the panel’s slice out of the route’s larger response', async () => {
    const url = await serve(200, TEAM)
    const d = await requestJson(url, teamSchema)
    expect(d.members.map((m) => m.role)).toEqual(['lead', 'member'])
    expect(d.myClass?.name).toBe('Period 3')
    expect('researchIdea' in d).toBe(false) // stripped, not silently carried
  })

  it('THROWS on a 5xx re-read — the old `if (!d.error)` dropped it in silence', async () => {
    const url = await serve(503, { error: 'Database unavailable' })
    const err = await requestJson(url, teamSchema).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(503)
  })

  it('THROWS on the sign-in page a 307 redirects to (status 200, HTML body)', async () => {
    const url = await serve(200, '<!doctype html><title>Sign in</title>', 'text/html')
    await expect(requestJson(url, teamSchema)).rejects.toThrow()
  })

  it('THROWS rather than rendering a roster with no members array', async () => {
    const url = await serve(200, { ...TEAM, members: undefined })
    await expect(requestJson(url, teamSchema)).rejects.toThrow()
  })
})

describe('class join: two outcomes, two shapes', () => {
  it('an approved join carries the class it enrolled you in', async () => {
    const url = await serve(200, { status: 'approved', classId: 'c9', className: 'Period 7' })
    const d = await requestJson(url, joinClassSchema)
    expect(d.status === 'approved' && d.classId).toBe('c9')
  })

  it('a pending join has no classId, and that parses fine', async () => {
    const url = await serve(200, { status: 'pending', className: 'Period 7' })
    const d = await requestJson(url, joinClassSchema)
    expect(d.status).toBe('pending')
  })

  it('REJECTS an approved join with no classId — the panel used to set { id: undefined }', async () => {
    const url = await serve(200, { status: 'approved', className: 'Period 7' })
    await expect(requestJson(url, joinClassSchema)).rejects.toThrow()
  })

  it('REJECTS an unknown status instead of quietly showing "waiting for approval"', async () => {
    // The old branch was `d.status === 'approved' ? … : pending`, so ANY other
    // value — including a body that is not this route's at all — read as pending.
    const url = await serve(200, { status: 'rejected', className: 'Period 7' })
    await expect(requestJson(url, joinClassSchema)).rejects.toThrow()
  })
})
