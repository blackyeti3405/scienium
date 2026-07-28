import { describe, it, expect, afterEach, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  readCapped,
  readJsonCapped,
  fetchWithRetry,
  isPrivateAddress,
  retryAfterMs,
} from './fetch-retry'

/**
 * `res.json()` / `res.text()` buffer whatever a provider sends. REFACTOR2 §0.7
 * flags uncapped provider bodies in both `lib/discovery/openalex.ts` and
 * `lib/discovery/articles.ts`; the cap lives here so there is one of it.
 *
 * Reproduced against the pre-fix code: a chunked 40MB response was buffered in
 * full — `content-length` never appeared, so header inspection alone would not
 * have caught it.
 */

const servers: http.Server[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
  )
})

async function serve(handler: http.RequestListener): Promise<string> {
  const server = http.createServer(handler)
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
}

describe('readCapped', () => {
  it('returns a body under the ceiling', async () => {
    const url = await serve((_req, res) => res.end('hello'))
    expect(await readCapped(await fetch(url), 1024)).toBe('hello')
  })

  it('rejects an oversized body that declares its length', async () => {
    const body = 'x'.repeat(4096)
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Length': String(body.length) })
      res.end(body)
    })
    await expect(readCapped(await fetch(url), 1024)).rejects.toThrow(/exceeds 1024 bytes/)
  })

  it('rejects a CHUNKED body over the ceiling — no content-length to inspect', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      for (let i = 0; i < 200; i++) res.write('y'.repeat(1024))
      res.end()
    })
    const res = await fetch(url)
    expect(res.headers.get('content-length')).toBeNull()
    await expect(readCapped(res, 8 * 1024)).rejects.toThrow(/exceeds 8192 bytes/)
  })

  it('does not truncate — a body at exactly the ceiling still parses', async () => {
    const payload = JSON.stringify({ v: 'z'.repeat(100) })
    const url = await serve((_req, res) => res.end(payload))
    expect(await readJsonCapped(await fetch(url), payload.length)).toEqual({
      v: 'z'.repeat(100),
    })
  })

  it('readJsonCapped throws on malformed JSON rather than returning a partial', async () => {
    const url = await serve((_req, res) => res.end('{"results":['))
    await expect(readJsonCapped(await fetch(url), 1024)).rejects.toThrow()
  })

  it('a body that NEVER ends costs the ceiling, not the invocation', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      const t = setInterval(() => res.write('z'.repeat(1024)), 1)
      res.on('close', () => clearInterval(t))
    })
    await expect(readCapped(await fetch(url), 8 * 1024)).rejects.toThrow(/exceeds 8192 bytes/)
  })
})

/**
 * REFACTOR2 P2-S10 + the P2-2 remainder — the outbound-request policy.
 *
 * Reproduced against the pre-fix `fetchWithRetry` before any of this was
 * written: `Retry-After: 86400` was multiplied straight into `sleep()` (the
 * call sat for a day), `redirect` was left at its `follow` default so no hop
 * after the first was ever inspected, retry responses were dropped without
 * `cancel()`, and only the per-attempt timeout existed — three slow attempts
 * cost 3× `timeoutMs` plus unbounded backoff with nothing bounding the whole.
 *
 * These pin the ATTACK: a real listening server, and a request that must not
 * arrive. Where the guard would (correctly) refuse to talk to a test server on
 * 127.0.0.1, `fetch` is stubbed to route a PUBLIC literal address to it — the
 * same technique `lib/fairs/geocode.test.ts` uses. Only the DNS hop is skipped;
 * every socket, redirect and body below is real.
 */
const PUBLIC = 'https://93.184.216.34'

/** A server that records the path of every request that reaches it. */
async function trap(handler: http.RequestListener): Promise<{ url: string; hits: string[] }> {
  const hits: string[] = []
  const url = await serve((req, res) => {
    hits.push(req.url ?? '')
    handler(req, res)
  })
  return { url, hits }
}

/** Send `PUBLIC/<path>` down the socket to `base/<path>`, init untouched. */
function stubFetchTo(base: string): void {
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
    const u = new URL(String(input))
    return realFetch(base.replace(/\/$/, '') + u.pathname + u.search, init)
  })
}

describe('fetchWithRetry — the provider does not get to choose the address', () => {
  it('never opens a socket to 127.0.0.1', async () => {
    const { url, hits } = await trap((_req, res) => res.end('secret'))
    await expect(fetchWithRetry(url, { timeoutMs: 2000 })).rejects.toThrow(
      /refusing non-public address 127\.0\.0\.1/,
    )
    expect(hits).toEqual([]) // not "a request with no data" — no request at all
  })

  it('refuses a REDIRECT to 127.0.0.1', async () => {
    const { url, hits } = await trap((req, res) => {
      if (req.url?.startsWith('/start')) {
        res.writeHead(302, { location: 'http://127.0.0.1:9/internal' })
        return res.end()
      }
      res.end('reached the internal host')
    })
    stubFetchTo(url)
    await expect(fetchWithRetry(`${PUBLIC}/start`, { timeoutMs: 2000 })).rejects.toThrow(
      /refusing non-public address 127\.0\.0\.1/,
    )
    expect(hits).toEqual(['/start']) // the second hop never happened
  })

  it('checks EVERY hop — a chain that only turns internal at hop three', async () => {
    const { url, hits } = await trap((req, res) => {
      if (req.url === '/hop1') {
        res.writeHead(302, { location: `${PUBLIC}/hop2` })
        return res.end()
      }
      if (req.url === '/hop2') {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
        return res.end()
      }
      res.end('metadata')
    })
    stubFetchTo(url)
    await expect(fetchWithRetry(`${PUBLIC}/hop1`, { timeoutMs: 2000 })).rejects.toThrow(
      /refusing non-public address 169\.254\.169\.254/,
    )
    expect(hits).toEqual(['/hop1', '/hop2'])
  })

  it('classifies the private ranges the register names', () => {
    for (const ip of [
      '127.0.0.1', '10.0.0.5', '172.16.0.1', '192.168.1.1', '169.254.169.254',
      '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:169.254.169.254',
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true)
    }
    for (const ip of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) {
      expect(isPrivateAddress(ip), ip).toBe(false)
    }
  })
})

describe('fetchWithRetry — a provider cannot park the invocation', () => {
  it('does not sleep for a day on Retry-After: 86400', async () => {
    const { url, hits } = await trap((_req, res) => {
      res.writeHead(503, { 'Retry-After': '86400' })
      res.end('slow down')
    })
    stubFetchTo(url)
    const started = Date.now()
    // Pre-fix this slept 86,400,000ms. Now the clamp caps the wait and the
    // total deadline refuses a wait it cannot afford.
    await expect(fetchWithRetry(PUBLIC, { timeoutMs: 500 })).rejects.toThrow(/total deadline/)
    expect(Date.now() - started).toBeLessThan(2500)
    expect(hits.length).toBe(1)
  })

  /**
   * The end-to-end 86400 case above is also caught by the total deadline, so it
   * cannot fail on the clamp alone (its negative control proved exactly that:
   * unclamping left all 14 green). Pinning a 10s clamp end-to-end would cost a
   * 10s test, so the clamp is pinned here — where an hour and a day are one
   * cheap assertion each, and both header forms get exercised.
   */
  it('clamps every Retry-After form a provider can send', () => {
    expect(retryAfterMs('86400')).toBe(10_000)
    expect(retryAfterMs('3600')).toBe(10_000)
    expect(retryAfterMs(new Date(Date.now() + 86_400_000).toUTCString())).toBe(10_000)
    expect(retryAfterMs('2')).toBe(2000) // under the ceiling, honoured as sent
    expect(retryAfterMs(null)).toBeNull()
    expect(retryAfterMs('not-a-date')).toBeNull()
    expect(retryAfterMs('-5')).toBeNull()
    expect(retryAfterMs(new Date(Date.now() - 60_000).toUTCString())).toBeNull()
  })

  it('still honours a SANE Retry-After (the clamp is not a disabled retry)', async () => {
    let n = 0
    const { url, hits } = await trap((_req, res) => {
      if (n++ === 0) {
        res.writeHead(503, { 'Retry-After': '1' })
        return res.end()
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"ok":true}')
    })
    stubFetchTo(url)
    const started = Date.now()
    const res = await fetchWithRetry(PUBLIC, { timeoutMs: 4000 })
    expect(res.status).toBe(200)
    expect(hits.length).toBe(2)
    expect(Date.now() - started).toBeGreaterThanOrEqual(900) // it really waited the 1s
  })

  it('gives up at the TOTAL deadline instead of paying for a third slow attempt', async () => {
    const { url, hits } = await trap((_req, res) => {
      setTimeout(() => {
        res.writeHead(503)
        res.end()
      }, 200)
    })
    stubFetchTo(url)
    const started = Date.now()
    await expect(
      fetchWithRetry(PUBLIC, { timeoutMs: 1000, totalTimeoutMs: 700, backoffMs: 100 }),
    ).rejects.toThrow(/exceeded its 700ms total deadline/)
    const elapsed = Date.now() - started
    expect(hits.length).toBe(2) // pre-fix: 3 attempts, and no deadline at all
    expect(elapsed).toBeLessThan(900)
  })

  it('refuses a body whose content-type is not what the adapter asked for', async () => {
    const { url } = await trap((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end('<html>login</html>')
    })
    stubFetchTo(url)
    await expect(
      fetchWithRetry(PUBLIC, { timeoutMs: 2000, contentTypes: ['application/json'] }),
    ).rejects.toThrow(/unexpected content-type "text\/html/)
  })
})
