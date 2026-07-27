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
 */

const servers: http.Server[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

async function serve(handler: http.RequestListener): Promise<string> {
  const server = http.createServer(handler)
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

function stubFetchTo(url: string): void {
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', (_input: unknown, init?: RequestInit) => realFetch(url, init))
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
