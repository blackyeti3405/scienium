import { describe, it, expect, afterEach, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { getCitedBy, reconstructAbstract, type OpenAlexWork } from './openalex'

/**
 * REFACTOR2 §0.7 — `lib/discovery/openalex.ts`.
 *
 * `getCitedBy` follows `cited_by_api_url` straight out of the provider's JSON.
 * Reproduced against the pre-fix code: a work whose `cited_by_api_url` named a
 * local server got exactly one request, and the query string carried
 * `api_key=<OPENALEX_API_KEY>` — the politeness params were appended *after* the
 * host was chosen, so the credential went wherever the URL pointed.
 *
 * These tests pin the ATTACK, not the shape: a real listening server, a real
 * request that must not arrive.
 */

const servers: http.Server[] = []
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
  )
})

/** A server that records every request that reaches it. */
async function trap(): Promise<{ url: string; hits: string[] }> {
  const hits: string[] = []
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ results: [] }))
  })
  servers.push(server)
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`, hits }
}

function work(id: string, citedByApiUrl: string): OpenAlexWork {
  return {
    id,
    title: 'Attention Is All You Need',
    publicationYear: 2017,
    arxivId: null,
    doi: null,
    authors: [],
    referencedWorks: [],
    citedByApiUrl,
    citedByCount: 12,
  }
}

/**
 * An empty list is ALSO what a healthy "this paper has no citers" call returns,
 * so `toEqual([])` alone would pass with the guard deleted — three of these did,
 * until the negative control said so. Every case therefore asserts the REFUSAL,
 * which only the guard can produce, and none of them may reach the network.
 */
async function refusal(id: string, citedByApiUrl: string): Promise<string> {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    // Cache keys are per-work-id; a fresh id each test keeps them independent.
    expect(await getCitedBy(work(id, citedByApiUrl))).toEqual([])
    return logged.mock.calls.map((c) => String(c[1] ?? '')).join(' ')
  } finally {
    logged.mockRestore()
  }
}

describe('getCitedBy — the provider does not get to choose the host', () => {
  it('sends NOTHING to a host that is not OpenAlex', async () => {
    const { url, hits } = await trap()

    expect(await refusal('https://openalex.org/W-foreign', url)).toMatch(/refusing non-OpenAlex/)
    expect(hits).toEqual([]) // not "one request with no key" — no request at all
  })

  it('refuses a link-local metadata address', async () => {
    expect(
      await refusal('https://openalex.org/W-metadata', 'http://169.254.169.254/latest/meta-data/'),
    ).toMatch(/refusing non-OpenAlex URL: http:\/\/169\.254\.169\.254/)
  })

  it('refuses a scheme downgrade on the right host', async () => {
    expect(
      await refusal('https://openalex.org/W-http', 'http://api.openalex.org/works?filter=cites:W1'),
    ).toMatch(/refusing non-OpenAlex URL: http:\/\/api\.openalex\.org/)
  })

  it('refuses a host that merely ends with the real one', async () => {
    expect(
      await refusal('https://openalex.org/W-suffix', 'https://api.openalex.org.evil.test/works'),
    ).toMatch(/refusing non-OpenAlex URL: https:\/\/api\.openalex\.org\.evil\.test/)
  })

  it('refuses userinfo pointing the authority elsewhere', async () => {
    expect(
      await refusal('https://openalex.org/W-userinfo', 'https://api.openalex.org@evil.test/works'),
    ).toMatch(/refusing non-OpenAlex URL: https:\/\/evil\.test/)
  })
})

describe('reconstructAbstract', () => {
  it('rebuilds words in position order', () => {
    expect(reconstructAbstract({ world: [1], hello: [0], again: [2] })).toBe('<p>hello world again</p>')
  })

  it('is cheap when a position is absurd — the pre-fix array took 1.8s for this', () => {
    const started = Date.now()
    const text = reconstructAbstract({ hello: [0], world: [50_000_000] })
    expect(text).toBe('<p>hello world</p>')
    expect(Date.now() - started).toBeLessThan(200)
  })

  it('ignores non-integer and negative positions instead of throwing', () => {
    const inverted = { a: [0], b: [-1], c: [1.5], d: [1] } as unknown as Record<string, number[]>
    expect(reconstructAbstract(inverted)).toBe('<p>a d</p>')
  })

  it('survives a positions value that is not an array', () => {
    const inverted = { a: [0], b: 'nope' } as unknown as Record<string, number[]>
    expect(reconstructAbstract(inverted)).toBe('<p>a</p>')
  })

  it('returns null for an empty or absent index', () => {
    expect(reconstructAbstract(null)).toBeNull()
    expect(reconstructAbstract({})).toBeNull()
  })
})
