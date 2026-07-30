import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * REFACTOR2 P2-1 — the two discovery routes that talked to a provider WITHOUT
 * the shared outbound boundary.
 *
 * Before this: `/api/discovery/search` read Wikipedia's OpenSearch answer as
 * `(await res.json()) as [string, string[]]` — no byte ceiling, no content-type
 * check, no redirect revalidation, and a cast where a parse belongs, so a
 * non-array in the titles lane became the student's suggestion list.
 * `/api/discovery/youtube/resolve` did the same with oEmbed's `data.title`.
 * Both now go through `fetchWithRetry` + `readJsonCapped` and a zod schema.
 *
 * Method follows the repo's provider-test precedent (`lib/fetch-retry.test.ts`,
 * `lib/discovery/adapters.test.ts`): the REAL route handler, the REAL guard
 * chain, a real `node:http` server and real sockets. Two hops are faked, both so
 * the test can be hermetic rather than to dodge a guard — DNS (the redirect
 * policy resolves provider hostnames, which a unit test must not do) and, via
 * the route-policy harness, Clerk + the DB.
 */

vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.216.34', family: 4 }],
}))

import { routeHarness, type RoutePolicyHarness } from './harness/route-policy'
import { GET as searchGET } from '@/app/api/discovery/search/route'
import { POST as youtubePOST } from '@/app/api/discovery/youtube/resolve/route'

const servers: http.Server[] = []
/** Every request path that actually reached the provider stand-in, newest last. */
let hits: string[] = []
let h: RoutePolicyHarness

beforeEach(() => {
  hits = []
  h = routeHarness()
})

afterEach(async () => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

/** Serve `handler`, and route every outbound fetch to it whatever host it named. */
async function serve(handler: http.RequestListener): Promise<void> {
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '')
    handler(req, res)
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
    const u = new URL(String(input))
    return realFetch(base + u.pathname + u.search, init)
  })
}

const body = (payload: string, contentType = 'application/json'): http.RequestListener => (
  (_req, res) => {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(payload)
  }
)

/** A provider that answers a redirect into our own network on the first hop. */
const redirectToPrivateHost: http.RequestListener = (_req, res) => {
  res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
  res.end()
}

/** A provider that never answers at all. */
function stubNeverAnswers(): void {
  vi.stubGlobal('fetch', () => new Promise<Response>(() => {}))
}

// ── /api/discovery/search — Wikipedia OpenSearch ──────────────────────────────

/** Distinct per test: the route caches suggestions for 5 minutes, keyed by `q`. */
let qSeq = 0
const suggest = (label: string) =>
  h.asStudentA().get(searchGET, undefined, { query: { q: `${label}-${qSeq++}` } })

describe('GET /api/discovery/search — the provider boundary', () => {
  it('returns the titles lane of a well-formed OpenSearch answer', async () => {
    await serve(body(JSON.stringify(['photo', ['Photosynthesis', 'Photon'], [], []])))
    expect(await suggest('ok').expect(200)).toEqual(['Photosynthesis', 'Photon'])
  })

  it('refuses an oversized body — valid JSON, only too big', async () => {
    // Parses fine and satisfies the schema; the CAP is the only thing that can
    // reject it, which is what makes this a cap test and not a parser test.
    await serve(body(JSON.stringify(['q', ['Title', 'x'.repeat(300 * 1024)], [], []])))
    expect(await suggest('oversized').expect(200)).toEqual([])
  })

  it('refuses a body whose content-type is not JSON', async () => {
    // Deliberately valid JSON that satisfies the schema: the parser would accept
    // it, so the declared content-type is the ONLY thing that can refuse it.
    // (A captive portal serving an HTML login page is caught twice over; that
    // version of this test passed with the check deleted.)
    await serve(body(JSON.stringify(['q', ['Served as HTML'], [], []]), 'text/html; charset=utf-8'))
    expect(await suggest('html').expect(200)).toEqual([])
  })

  it('THE ATTACK: refuses a redirect into our own network, and never dials it', async () => {
    await serve(redirectToPrivateHost)
    expect(await suggest('redirect').expect(200)).toEqual([])
    expect(hits).toHaveLength(1) // the metadata endpoint was never reached
  })

  it('degrades to [] on malformed JSON rather than throwing', async () => {
    await serve(body('["q",["Title"'))
    expect(await suggest('malformed').expect(200)).toEqual([])
  })

  it('THE CAST: a titles lane that is not an array of strings never reaches the client', async () => {
    // The pre-fix `as [string, string[]]` accepted this verbatim and shipped it
    // to the suggestion dropdown.
    await serve(body(JSON.stringify(['q', { evil: 'object' }, [], []])))
    expect(await suggest('badshape').expect(200)).toEqual([])
  })

  it('gives up on a provider that never answers instead of hanging the request', async () => {
    stubNeverAnswers()
    vi.useFakeTimers()
    const pending = suggest('deadline').response()
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(5_000)
    const res = await pending
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

// ── /api/discovery/youtube/resolve — oEmbed ───────────────────────────────────

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const GENERIC = 'YouTube video'
const resolve = () => h.asStudentA().post(youtubePOST, undefined, { body: { url: VIDEO } })

describe('POST /api/discovery/youtube/resolve — the provider boundary', () => {
  it('uses the oEmbed title when the provider answers well', async () => {
    await serve(body(JSON.stringify({ title: '  A Real Title  ', author_name: 'Someone' })))
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: 'A Real Title' })
  })

  it('spends nothing on a link that is not YouTube', async () => {
    await serve(body(JSON.stringify({ title: 'never' })))
    await h.asStudentA().post(youtubePOST, undefined, { body: { url: 'https://evil.test/x' } }).expect(422)
    expect(hits).toEqual([])
  })

  it('refuses an oversized body and keeps the generic title', async () => {
    await serve(body(JSON.stringify({ title: 'Fits the schema', pad: 'x'.repeat(80 * 1024) })))
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
  })

  it('refuses a body whose content-type is not JSON', async () => {
    // Valid JSON, valid schema — only the content-type is wrong, so nothing but
    // the content-type check can reject it.
    await serve(body(JSON.stringify({ title: 'Served as HTML' }), 'text/html'))
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
  })

  it('THE ATTACK: refuses a redirect into our own network, and never dials it', async () => {
    await serve(redirectToPrivateHost)
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
    expect(hits).toHaveLength(1)
  })

  it('degrades to the generic title on malformed JSON rather than throwing', async () => {
    await serve(body('{"title":'))
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
  })

  it('THE CAST: a non-string title never becomes the stored title', async () => {
    // `if (data.title) title = data.title` accepted anything truthy — an object
    // here reached the client as the video's name.
    await serve(body(JSON.stringify({ title: { toString: 'nope' } })))
    expect(await resolve().expect(200)).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
  })

  it('gives up on a provider that never answers instead of hanging the request', async () => {
    stubNeverAnswers()
    vi.useFakeTimers()
    const pending = resolve().response()
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(5_000)
    const res = await pending
    expect(await res.json()).toEqual({ videoId: 'dQw4w9WgXcQ', title: GENERIC })
  })
})
