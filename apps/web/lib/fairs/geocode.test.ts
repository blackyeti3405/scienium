import { describe, it, expect, vi, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { geocodeZip } from './zip'

/**
 * REFACTOR2 §0.7 — `lib/fairs/zip.ts`'s `geocodeZip`.
 *
 * Reproduced against the pre-fix code before writing any of this: two
 * concurrent calls hit the network back to back (measured gap: ~1ms, not the
 * 1000ms Nominatim's ToS requires); an identical ZIP requested twice fired the
 * network twice (no cache); and `results[0].lat` was read off whatever
 * `res.json()` returned with no shape check — a numeric `lat` (never valid
 * Nominatim output, which always encodes as JSON strings) sailed straight
 * through unnoticed.
 *
 * `geocodeZip`'s URL is hard-coded to Nominatim (not caller-injectable), so
 * these stub `global.fetch` to redirect to a real local `node:http` server —
 * the streaming/cap/throttle logic under test is exercised for real; only the
 * DNS hop is skipped.
 *
 * P2-1 moved `geocodeZip` onto the shared gateway (`fetchWithRetry`), which is
 * what brings it under the redirect policy. That policy resolves the hostname,
 * so the resolver is mocked below — the same seam `lib/discovery/adapters.test.ts`
 * uses. Nothing else is faked: the redirect refusals, the byte ceiling and the
 * content-type check below all run for real against a real socket.
 */

vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.216.34', family: 4 }],
}))

const servers: http.Server[] = []
/** Every request path that actually reached the local server, newest last. */
let hits: string[] = []

afterEach(async () => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  hits = []
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

async function serve(handler: http.RequestListener): Promise<string> {
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '')
    handler(req, res)
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

/** Send Nominatim's path down the socket to `base`, init untouched. */
function stubFetchTo(base: string): void {
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
    const u = new URL(String(input))
    return realFetch(base.replace(/\/$/, '') + u.pathname + u.search, init)
  })
}

describe('geocodeZip — caches an identical ZIP instead of re-fetching', () => {
  it('only hits the network once for the same ZIP called twice', async () => {
    let hits = 0
    const url = await serve((_req, res) => {
      hits++
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ lat: '41.76', lon: '-72.68' }]))
    })
    stubFetchTo(url)

    const first = await geocodeZip('06001-cache-test')
    const second = await geocodeZip('06001-cache-test')
    expect(first).toEqual([41.76, -72.68])
    expect(second).toEqual([41.76, -72.68])
    expect(hits).toBe(1)
  })
})

describe('geocodeZip — enforces Nominatim\'s 1 req/s ToS', () => {
  it('spaces two concurrent calls at least ~1s apart', async () => {
    const times: number[] = []
    const url = await serve((_req, res) => {
      times.push(Date.now())
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ lat: '1', lon: '1' }]))
    })
    stubFetchTo(url)

    await Promise.all([geocodeZip('11111-throttle-a'), geocodeZip('22222-throttle-b')])
    expect(times.length).toBe(2)
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(950)
  }, 10_000)
})

describe('geocodeZip — parses the response, never casts it', () => {
  it('resolves a well-formed result unchanged (student-visible output)', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ lat: '37.77', lon: '-122.42', extra: 'ignored' }]))
    })
    stubFetchTo(url)
    expect(await geocodeZip('94103-wellformed')).toEqual([37.77, -122.42])
  })

  it('refuses a shape Nominatim never sends (numeric lat/lon, not strings)', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      // Real Nominatim always encodes lat/lon as JSON strings. A response that
      // doesn't is not a real Nominatim response, cast-would-have-accepted-it.
      res.end(JSON.stringify([{ lat: 41.76, lon: -72.68 }]))
    })
    stubFetchTo(url)
    expect(await geocodeZip('06001-badshape')).toBeNull()
  })

  it('returns null for a body that is not an array at all', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not a geocode result' }))
    })
    stubFetchTo(url)
    expect(await geocodeZip('00000-notarray')).toBeNull()
  })
})

describe('geocodeZip — the byte ceiling', () => {
  it('refuses a body over the cap even though it is syntactically valid JSON', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      // Valid JSON, real coordinates at index 0 — only oversized. Proves the
      // CAP rejected it (a JSON-parse failure would reject a malformed body
      // too; this body parses fine without the cap).
      const filler = Array.from({ length: 3000 }, () => ({ lat: '0', lon: '0', pad: 'x'.repeat(30) }))
      res.end(JSON.stringify([{ lat: '41.76', lon: '-72.68' }, ...filler]))
    })
    stubFetchTo(url)
    expect(await geocodeZip('99999-oversized')).toBeNull()
  })
})

/**
 * P2-1 — what binding onto the shared gateway actually bought. Each of these
 * failed to be *possible* before: the raw `fetch` followed redirects itself
 * (`redirect: 'follow'`, no hop revalidated) and parsed any content-type.
 */
describe('geocodeZip — the outbound gateway', () => {
  it('THE ATTACK: refuses a redirect into our own network, and never dials it', async () => {
    const url = await serve((req, res) => {
      if (req.url?.startsWith('/search')) {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
        return res.end()
      }
      res.end('metadata')
    })
    stubFetchTo(url)

    expect(await geocodeZip('12345-redirect')).toBeNull()
    // Not "a response with no coordinates" — the second hop never happened.
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain('/search')
  })

  it('follows a PUBLIC redirect — the policy is a guard, not a disabled feature', async () => {
    const url = await serve((req, res) => {
      if (req.url?.startsWith('/search')) {
        res.writeHead(302, { location: 'https://93.184.216.34/moved' })
        return res.end()
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify([{ lat: '38.90', lon: '-77.04' }]))
    })
    stubFetchTo(url)

    expect(await geocodeZip('20001-publicredirect')).toEqual([38.9, -77.04])
    expect(hits).toHaveLength(2)
  })

  it('refuses a body served as something other than JSON', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      // Deliberately a valid, schema-satisfying Nominatim body: the parser would
      // accept it, so the declared content-type is the ONLY thing that can
      // refuse it. An HTML captive-portal page is caught twice over and proves
      // nothing about this guard.
      res.end(JSON.stringify([{ lat: '41.76', lon: '-72.68' }]))
    })
    stubFetchTo(url)
    expect(await geocodeZip('33333-html')).toBeNull()
  })

  it('degrades to null on a body that is not JSON syntax', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('[{"lat":"1",')
    })
    stubFetchTo(url)
    expect(await geocodeZip('44444-malformed')).toBeNull()
  })

  /**
   * LAST in the file on purpose. Fake timers move `Date.now()` forward past the
   * throttle's `lastNominatimRequestAt`, so any geocode after this one would sit
   * out the difference on the real clock.
   */
  it('gives up on a provider that never answers instead of hanging the caller', async () => {
    // Never settles — the per-attempt ceiling is the only thing that can end it.
    vi.stubGlobal('fetch', () => new Promise<Response>(() => {}))
    vi.useFakeTimers()
    const pending = geocodeZip('66666-deadline')
    await vi.advanceTimersByTimeAsync(1_000) // the 1 req/s queue wait
    await vi.advanceTimersByTimeAsync(6_000) // …then the 6s ceiling
    expect(await pending).toBeNull()
  })
})
