import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * `lib/discovery/{medlineplus,patents,semanticscholar}.ts` — all three were
 * EDITED in the 0.75.1–0.75.9 range (rebound onto `fetchWithRetry`/`readCapped`)
 * and none had a single executable check (test-audit-after §3, ranked #3). They
 * are untrusted-payload parsers on a student-facing tab.
 *
 * Method follows the repo's provider-test precedent (`lib/fairs/geocode.test.ts`,
 * `lib/discovery/openalex.test.ts`, `lib/fetch-retry.test.ts`): a real
 * `node:http` server, real sockets, real bodies, and the REAL outbound primitive.
 * Only two hops are faked, both of them so a test can be hermetic rather than to
 * dodge a guard:
 *
 *  - DNS, because `assertPublicUrl` (correctly) refuses to resolve a provider
 *    host to 127.0.0.1 — `fetch` is then rewritten to the local server exactly
 *    as `fetch-retry.test.ts` does it;
 *  - `serverEnv`, because the key getters memoize on first read and the keyless
 *    DEGRADE path is half of what is being pinned.
 */

vi.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.216.34', family: 4 }],
}))

const env = vi.hoisted(() => ({ patentsKey: undefined as string | undefined }))
vi.mock('@/lib/env', () => ({
  serverEnv: {
    PATENTSVIEW_API_KEY: () => env.patentsKey,
    S2_API_KEY: () => undefined,
  },
}))

const servers: http.Server[] = []
/** Every request that reached the local server, newest last. */
let hits: string[]
/** …and the headers each one carried. */
let sentHeaders: http.IncomingHttpHeaders[]

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))))
})

beforeEach(() => {
  hits = []
  sentHeaders = []
  env.patentsKey = undefined
  // The adapters log their degrade paths; keep the run readable, and let a test
  // assert that the degrade was REPORTED rather than silent.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/** Serve `handler`, and route every outbound fetch to it whatever host it named. */
async function serve(handler: http.RequestListener): Promise<void> {
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '')
    sentHeaders.push(req.headers)
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

const xml = (body: string, contentType = 'application/xml') => (
  (_req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(body)
  }
)

const { searchHealthTopics, resolveHealthTopic } = await import('./medlineplus')
const { searchPatents } = await import('./patents')
const { getTldr, getInfluentialCitingIds } = await import('./semanticscholar')

// ── MedlinePlus (keyless XML, in-app rendering) ───────────────────────────────

/** One `<document>` block in the shape `wsearch.nlm.nih.gov` returns. */
function doc(url: string, fields: Record<string, string>): string {
  const contents = Object.entries(fields)
    .map(([name, value]) => `<content name="${name}">${value}</content>`)
    .join('')
  return `<document rank="0" url="${url}">${contents}</document>`
}

describe('medlineplus', () => {
  it('parses a topic, stripping the API’s match-highlight markup', async () => {
    await serve(
      xml(
        `<nlmSearchResult>${doc('https://medlineplus.gov/diabetes.html', {
          title: '&lt;span class="qt0"&gt;Diabetes&lt;/span&gt; Basics',
          snippet: 'What &lt;span class="qt0"&gt;diabetes&lt;/span&gt; is.',
          FullSummary: '&lt;p&gt;Plain language.&lt;/p&gt;',
        })}</nlmSearchResult>`,
      ),
    )

    const [topic] = await searchHealthTopics('mlp-basics')

    expect(topic!.title).toBe('Diabetes Basics')
    expect(topic!.snippet).toBe('What diabetes is.')
    expect(topic!.url).toBe('https://medlineplus.gov/diabetes.html')
    expect(topic!.externalId).toMatch(/^mlp:[0-9a-f]{16}$/)
  })

  it('THE ATTACK: a document naming another host never becomes a topic', async () => {
    // `medlineplus.gov.evil.test` passes any `includes`/prefix check that forgets
    // the trailing slash, and the topic it produces is a full-render card
    // carrying attacker HTML into the reader.
    await serve(
      xml(
        `<nlmSearchResult>
          ${doc('https://medlineplus.gov.evil.test/x.html', { title: 'Suffix host' })}
          ${doc('https://evil.test/y.html', { title: 'Foreign host' })}
          ${doc('http://medlineplus.gov/z.html', { title: 'Scheme downgrade' })}
          ${doc('https://medlineplus.gov/real.html', { title: 'Real topic' })}
        </nlmSearchResult>`,
      ),
    )

    const topics = await searchHealthTopics('mlp-hosts')

    expect(topics.map((t) => t.title)).toEqual(['Real topic'])
  })

  it('THE ATTACK: `&amp;` is decoded LAST, so double-encoded markup stays text', async () => {
    // The provider sends `&amp;lt;script&amp;gt;`. Decoding `&amp;` first turns
    // that into `&lt;script&gt;` and then into a live `<script>` element — a
    // provider-supplied tag laundered into the one payload this lane renders
    // in-app. Correct order leaves it as inert text.
    await serve(
      xml(
        `<nlmSearchResult>${doc('https://medlineplus.gov/order.html', {
          title: 'Entity order',
          FullSummary:
            '&lt;p&gt;Safe &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;&lt;/p&gt;',
        })}</nlmSearchResult>`,
      ),
    )

    const [topic] = await searchHealthTopics('mlp-entities')
    const resolved = await resolveHealthTopic(topic!.externalId)

    expect(resolved!.html).toContain('&lt;script&gt;')
    expect(resolved!.html).toContain('alert(1)') // kept as readable text…
    expect(resolved!.html).not.toMatch(/<script/i) // …and never as an element
  })

  it('degrades to [] on a provider error instead of 500ing the tab', async () => {
    await serve((_req, res) => {
      res.writeHead(404)
      res.end('gone')
    })

    expect(await searchHealthTopics('mlp-missing')).toEqual([])
  })

  it('never calls the provider for a query too short to mean anything', async () => {
    await serve(xml('<nlmSearchResult/>'))

    expect(await searchHealthTopics(' a ')).toEqual([])
    expect(hits).toEqual([])
  })

  it('resolves an id that was never searched to null, not to a fabricated card', async () => {
    expect(await resolveHealthTopic('mlp:0000000000000000')).toBeNull()
  })
})

// ── PatentsView (keyed, degrades to a Google Patents link-out) ────────────────

describe('patents', () => {
  it('THE ATTACK: keyless, it degrades to a link-out and opens NO socket', async () => {
    await serve(xml('{"patents":[]}', 'application/json'))

    const [card, ...rest] = await searchPatents('pv-keyless turbidity')

    expect(rest).toEqual([])
    expect(card!.url).toBe('https://patents.google.com/?q=pv-keyless%20turbidity')
    expect(card!.title).toContain('Search Google Patents')
    // A keyless request to a keyed API is a 403 per student keystroke.
    expect(hits).toEqual([])
  })

  it('maps live results, and sends the key in a HEADER rather than the URL', async () => {
    env.patentsKey = 'pv-secret-key'
    await serve(
      xml(
        JSON.stringify({
          patents: [
            {
              patent_id: '10000001',
              patent_title: '  Adjustable   Growth\nChamber ',
              patent_date: '2020-01-01',
              patent_abstract: 'A  chamber.',
            },
            { patent_id: '10000002' }, // no title — unusable as a card
          ],
        }),
        'application/json',
      ),
    )

    const hitsOut = await searchPatents('pv-live chamber')

    expect(hitsOut.map((h) => h.externalId)).toEqual(['pat:10000001'])
    expect(hitsOut[0]!.url).toBe('https://patents.google.com/patent/US10000001')
    expect(hitsOut[0]!.title).toBe('Adjustable Growth Chamber')
    expect(hitsOut[0]!.excerpt).toBe('A chamber.')
    // The credential must not ride in the query string — that is the failure
    // `openalex.ts` shipped, where politeness params were appended after the
    // host had already been chosen by the provider.
    expect(sentHeaders[0]!['x-api-key']).toBe('pv-secret-key')
    expect(hits[0]).not.toContain('pv-secret-key')
  })

  it('degrades to the link-out when the keyed API refuses the key', async () => {
    env.patentsKey = 'pv-rejected-key'
    await serve((_req, res) => {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end('{"error":"forbidden"}')
    })

    const out = await searchPatents('pv-forbidden sensor')

    expect(out).toHaveLength(1)
    expect(out[0]!.url).toContain('patents.google.com/?q=')
    // Degrading is a decision, not an accident: it is reported.
    expect(console.error).toHaveBeenCalled()
  })

  it('degrades — and does not throw — on a body that is not JSON at all', async () => {
    env.patentsKey = 'pv-html-key'
    await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<html>login</html>')
    })

    const out = await searchPatents('pv-html sensor')

    expect(out[0]!.url).toContain('patents.google.com/?q=')
  })
})

// ── Semantic Scholar (keyless shared pool, hard cache, no retry) ─────────────

describe('semanticscholar', () => {
  it('THE ATTACK: a throttled pool costs ONE request and returns null', async () => {
    await serve((_req, res) => {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '3600' })
      res.end('{}')
    })

    expect(await getTldr('arxiv:2401.11111')).toBeNull()
    // `attempts: 1` is deliberate: retrying a shared pool that just told us to
    // slow down stalls the reader behind two more timeouts for nothing.
    expect(hits).toHaveLength(1)
  })

  it('returns the TL;DR, and a second read costs no request at all', async () => {
    await serve(xml('{"tldr":{"text":"  A  short   summary. "}}', 'application/json'))

    expect(await getTldr('arxiv:2401.22222')).toEqual({ text: 'A short summary.' })
    expect(await getTldr('arxiv:2401.22222')).toEqual({ text: 'A short summary.' })
    // Budget: ≤2 S2 GETs per opened node on a miss, 0 on a hit.
    expect(hits).toHaveLength(1)
  })

  it('spends nothing on an id scheme S2 cannot resolve', async () => {
    await serve(xml('{"tldr":{"text":"never"}}', 'application/json'))

    expect(await getTldr('openalex:W123', 'https://example.com/not-a-doi')).toBeNull()
    expect(await getInfluentialCitingIds('wiki:Photosynthesis')).toEqual(new Set())
    expect(hits).toEqual([])
  })

  it('maps a DOI sourceUrl onto the id S2 resolves keylessly', async () => {
    await serve(xml('{"tldr":{"text":"From a DOI."}}', 'application/json'))

    expect(await getTldr('openalex:W999', 'https://doi.org/10.1234/abc.999')).toEqual({
      text: 'From a DOI.',
    })
    expect(hits[0]).toContain(encodeURIComponent('DOI:10.1234/abc.999'))
  })

  it('keeps only the citations S2 marks influential', async () => {
    await serve(
      xml(
        JSON.stringify({
          data: [
            { isInfluential: true, citingPaper: { externalIds: { ArXiv: '2402.00022' } } },
            { isInfluential: false, citingPaper: { externalIds: { ArXiv: '2402.00033' } } },
            { isInfluential: true, citingPaper: { externalIds: { PubMed: '99900003' } } },
            { isInfluential: true, citingPaper: {} }, // no id we can map
          ],
        }),
        'application/json',
      ),
    )

    expect(await getInfluentialCitingIds('arxiv:2401.33333')).toEqual(
      new Set(['arxiv:2402.00022', 'pmid:99900003']),
    )
  })

  it('degrades to an empty set on a malformed body', async () => {
    await serve(xml('{"data":[', 'application/json'))

    expect(await getInfluentialCitingIds('arxiv:2401.44444')).toEqual(new Set())
  })
})
