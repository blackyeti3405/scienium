import { describe, it, expect, vi, afterEach } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { browseFeed } from './articles'

/**
 * REFACTOR2 §0.7 — `lib/discovery/articles.ts`.
 *
 * `res.text()` on a feed body had no ceiling — the same class of defect
 * `lib/discovery/openalex.ts` (v0.55.0) and `lib/fetch-retry.ts` already carry
 * a shared fix for. Every FEEDS url is a literal in this file, never
 * user/team data, so there is no per-request host to validate (unlike
 * OpenAlex's provider-chosen `cited_by_api_url`) — the genuine exposure here
 * is the byte ceiling on six third-party hosts we don't control.
 *
 * The feed urls are hard-coded, so `global.fetch` is stubbed to redirect to a
 * real local `node:http` server — the streaming/cap logic under test runs for
 * real; only the DNS hop is skipped.
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

describe('browseFeed — the byte ceiling on a provider feed', () => {
  it('degrades to [] rather than buffering an oversized CHUNKED feed body', async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/rss+xml' })
      // Chunked, no content-length — over the 8MB cap.
      for (let i = 0; i < 8500; i++) res.write('x'.repeat(1024))
      res.end()
    })
    stubFetchTo(url)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // Unique feed id per test file run isn't needed here — the cache only
      // stores SUCCESSFUL parses, and this one throws, so it's never cached.
      const result = await browseFeed('quanta')
      expect(result).toEqual([])
      expect(logged.mock.calls.some((c) => String(c[1]).includes('exceeds'))).toBe(true)
    } finally {
      logged.mockRestore()
    }
  })

  it('parses a normal, well-under-cap feed unchanged (student-visible output)', async () => {
    const atom = `<?xml version="1.0"?><feed><entry>
      <id>https://theconversation.com/articles/12345</id>
      <title>Why the sky is blue</title>
      <link rel="alternate" href="https://theconversation.com/why-the-sky-is-blue-12345"/>
      <author><name>Ada Lovelace, Professor of Light, Some University</name></author>
      <published>2024-01-01T00:00:00Z</published>
      <summary>A short summary.</summary>
      <content>&lt;p&gt;Full article body.&lt;/p&gt;</content>
    </entry></feed>`
    const url = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/atom+xml' })
      res.end(atom)
    })
    stubFetchTo(url)
    const result = await browseFeed('conversation-environment')
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('Why the sky is blue')
  })
})
