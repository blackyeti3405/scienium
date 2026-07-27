import { describe, it, expect, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { readCapped, readJsonCapped } from './fetch-retry'

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
})
