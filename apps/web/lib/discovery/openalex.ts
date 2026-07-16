import 'server-only'
import { LruCache } from '@/lib/lru'
import { normalizeArxivId } from '@/lib/discovery/arxiv'
import { sanitizeAbstract } from '@/lib/discovery/sanitize'
import type { CredibilityTier } from '@prisma/client'
import { serverEnv } from '@/lib/env'

// ── OpenAlex (arXiv citation graph — Option A) ────────────────────────────────
//
//  ┌──────────────────────────── BANNED FIELDS ────────────────────────────────┐
//  │ NEVER read `related_works` or `concepts` from an OpenAlex Work. Those are   │
//  │ ML-DERIVED (algorithmic similarity / topic inference) and are BANNED under  │
//  │ Discovery v2's no-AI rule (judge-defensible: no AI ranking in research).    │
//  │ ONLY these citation-graph fields are permitted:                            │
//  │   • referenced_works   (works this paper CITES)                            │
//  │   • cited_by_api_url / cited_by_count  (works that CITE this paper)         │
//  │ Every hop is a FACTUAL citation edge, never a recommendation.               │
//  └────────────────────────────────────────────────────────────────────────────┘
//
// Free + keyless. `mailto=` is a politeness param that gets us the faster pool.

const OPENALEX_API = 'https://api.openalex.org'
const MAILTO = serverEnv.OPENALEX_MAILTO() || 'hello@scienium.app'
// Optional free OpenAlex API key. Set OPENALEX_API_KEY in .env.local to stop the
// anonymous-pool 503s ("retry shortly, or use a free API key for uninterrupted access").
const OPENALEX_API_KEY = serverEnv.OPENALEX_API_KEY()
const UA = 'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

const CACHE_TTL_MS = 1000 * 60 * 30
const CACHE_MAX_ENTRIES = 500

/** A minimal, cited-only projection of an OpenAlex Work. */
export interface OpenAlexWork {
  /** OpenAlex id URL, e.g. "https://openalex.org/W2963403868". */
  id: string
  title: string | null
  publicationYear: number | null
  /** arXiv id if this work has an arXiv locator, else null. */
  arxivId: string | null
  doi: string | null
  authors: string[]
  /** ONLY permitted citation field (works this cites). */
  referencedWorks: string[]
  citedByApiUrl: string | null
  citedByCount: number
}

/** A resolved citation neighbour (a chip in the Cites / Cited-by lane). */
export interface OpenAlexNeighbour {
  openAlexId: string
  title: string | null
  publicationYear: number | null
  arxivId: string | null
  pmid: string | null
  authors: string[]
}

const workCache = new LruCache<OpenAlexWork | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const neighboursCache = new LruCache<OpenAlexNeighbour[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const searchWorksCache = new LruCache<NormalizedWork[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const workByExtCache = new LruCache<NormalizedWork | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

// ── TEST-ONLY mock seam (E2E) ──────────────────────────────────────────────────
// See lib/discovery/arxiv.ts for the full rationale. E2E_MOCK_SOURCES=1 is set
// ONLY in apps/web/.env.local for the Playwright webServer — never in
// production/staging. Fixtures: 2 deterministic "cites" + 2 "cited by" neighbours,
// each arXiv-locatable so the citations route can turn them into branchable chips.
const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_REFERENCES: OpenAlexNeighbour[] = [
  {
    openAlexId: 'https://openalex.org/W-e2e-ref-1',
    title: 'E2E Fixture: A Reference This Paper Cites',
    publicationYear: 2020,
    arxivId: '2001.00011',
    pmid: '99900002',
    authors: ['Ref One Author'],
  },
  {
    openAlexId: 'https://openalex.org/W-e2e-ref-2',
    title: 'E2E Fixture: A Second Reference This Paper Cites',
    publicationYear: 2021,
    arxivId: '2101.00012',
    pmid: '90000012',
    authors: ['Ref Two Author'],
  },
]

const MOCK_CITED_BY: OpenAlexNeighbour[] = [
  {
    openAlexId: 'https://openalex.org/W-e2e-citedby-1',
    title: 'E2E Fixture: A Paper That Cites This One',
    publicationYear: 2024,
    arxivId: '2402.00021',
    pmid: '99900003',
    authors: ['CitedBy One Author'],
  },
  {
    openAlexId: 'https://openalex.org/W-e2e-citedby-2',
    title: 'E2E Fixture: A Second Paper That Cites This One',
    publicationYear: 2024,
    arxivId: '2402.00022',
    pmid: '90000022',
    authors: ['CitedBy Two Author'],
  },
]

const MOCK_WORK: OpenAlexWork = {
  id: 'https://openalex.org/W-e2e-seed',
  title: 'E2E Fixture: Attention Mechanisms for Deterministic Testing',
  publicationYear: 2024,
  arxivId: '2401.00001',
  doi: '10.48550/arxiv.2401.00001',
  authors: ['Ada Fixture', 'Grace Mocker'],
  referencedWorks: MOCK_REFERENCES.map((r) => r.openAlexId),
  citedByApiUrl: 'https://api.openalex.org/works?filter=cites:W-e2e-seed',
  citedByCount: MOCK_CITED_BY.length,
}

// Mirrors MOCK_WORK but keyed to the ncbi.ts MOCK_SEED_PMID ('99900001') so the
// pubmed citations branch (resolvePubmedWork) has a deterministic seed too. The
// MOCK getReferences/getCitedBy branches below return the mock arrays regardless
// of work contents — referencedWorks/citedByApiUrl/citedByCount just need to be
// non-empty/non-zero so the route's `if (oaWork)` gate fires.
const MOCK_PUBMED_WORK: OpenAlexWork = {
  id: 'https://openalex.org/W-e2e-pubmed-seed',
  title: 'E2E Fixture: A Deterministic PubMed Paper for Testing',
  publicationYear: 2024,
  arxivId: null,
  doi: null,
  authors: ['Beatrix Fixture', 'Carl Mocker'],
  referencedWorks: MOCK_REFERENCES.map((r) => r.openAlexId),
  citedByApiUrl: 'https://api.openalex.org/works?filter=cites:W-e2e-pubmed-seed',
  citedByCount: MOCK_CITED_BY.length,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function withMailto(url: URL): URL {
  url.searchParams.set('mailto', MAILTO)
  if (OPENALEX_API_KEY) url.searchParams.set('api_key', OPENALEX_API_KEY)
  return url
}

// Hard per-request cap. Promise.race guarantees we give up at FETCH_TIMEOUT_MS even
// if aborting the socket doesn't interrupt a stalled OS-level connect (which can
// otherwise hang ~2 min). The losing fetch is left to GC — we never await it.
const FETCH_TIMEOUT_MS = 8000

async function oaFetch(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const res = await Promise.race([
    fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => {
        controller.abort()
        reject(new Error('OpenAlex request timed out'))
      }, FETCH_TIMEOUT_MS),
    ),
  ])
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const backoff =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt
    await sleep(backoff)
    return oaFetch(url, attempt + 1)
  }
  return res
}

/**
 * Extract the arXiv id (if any) from an OpenAlex Work. arXiv shows up either in a
 * DOI (10.48550/arXiv.<id>) or in the work's `locations[].landing_page_url`.
 */
function arxivIdFromWork(raw: Record<string, unknown>): string | null {
  const doi = typeof raw.doi === 'string' ? raw.doi : ''
  const doiMatch = doi.match(/10\.48550\/arxiv\.([^/\s]+)/i)
  if (doiMatch) return normalizeArxivId(doiMatch[1])

  const locations = (raw.locations as Array<Record<string, unknown>> | undefined) ?? []
  for (const loc of locations) {
    const lp = typeof loc.landing_page_url === 'string' ? loc.landing_page_url : ''
    const m = lp.match(/arxiv\.org\/abs\/([^/?\s]+)/i)
    if (m) return normalizeArxivId(m[1])
  }
  return null
}

// IMPORTANT: only reads permitted fields (see BANNED FIELDS above).
function toWork(raw: Record<string, unknown>): OpenAlexWork {
  const authorships = (raw.authorships as Array<Record<string, unknown>> | undefined) ?? []
  const authors = authorships
    .map((a) => {
      const author = a.author as Record<string, unknown> | undefined
      return typeof author?.display_name === 'string' ? author.display_name : ''
    })
    .filter(Boolean)

  return {
    id: String(raw.id ?? ''),
    title: typeof raw.title === 'string' ? raw.title : null,
    publicationYear: typeof raw.publication_year === 'number' ? raw.publication_year : null,
    arxivId: arxivIdFromWork(raw),
    doi: typeof raw.doi === 'string' ? raw.doi : null,
    authors,
    referencedWorks: Array.isArray(raw.referenced_works)
      ? (raw.referenced_works as string[])
      : [],
    citedByApiUrl: typeof raw.cited_by_api_url === 'string' ? raw.cited_by_api_url : null,
    citedByCount: typeof raw.cited_by_count === 'number' ? raw.cited_by_count : 0,
  }
}

// Only fetch the fields we're allowed to use — keeps payloads small AND makes the
// no-ML constraint explicit in the request itself.
const WORK_SELECT =
  'id,title,publication_year,doi,authorships,referenced_works,cited_by_api_url,cited_by_count,locations'
const NEIGHBOUR_SELECT = 'id,title,publication_year,doi,authorships,locations,ids'

/** Resolve an arXiv id → its OpenAlex Work (via the arXiv DOI). Null if not found. */
export async function resolveArxivWork(rawArxivId: string): Promise<OpenAlexWork | null> {
  const arxivId = normalizeArxivId(rawArxivId)
  if (!arxivId) return null
  if (MOCK) return arxivId === MOCK_WORK.arxivId ? MOCK_WORK : null
  const cacheKey = `arxiv:${arxivId}`
  const cached = workCache.get(cacheKey)
  if (cached !== undefined) return cached

  // arXiv works are registered in OpenAlex under the DataCite DOI 10.48550/arXiv.<id>.
  const doiUrl = withMailto(
    new URL(`${OPENALEX_API}/works/https://doi.org/10.48550/arXiv.${arxivId}`),
  )
  doiUrl.searchParams.set('select', WORK_SELECT)

  try {
    const res = await oaFetch(doiUrl.toString())
    if (res.ok) {
      const work = toWork((await res.json()) as Record<string, unknown>)
      workCache.set(cacheKey, work)
      return work
    }
    workCache.set(cacheKey, null)
    return null
  } catch (err) {
    console.error('[discovery/openalex] resolveArxivWork failed:', err)
    return null
  }
}

/** Resolve a PubMed id → its OpenAlex Work (via `works/pmid:<id>`). Null if not found. */
export async function resolvePubmedWork(rawPmid: string): Promise<OpenAlexWork | null> {
  const pmid = rawPmid.trim()
  if (!pmid) return null
  if (MOCK) return pmid === '99900001' ? MOCK_PUBMED_WORK : null
  const cacheKey = `pmid:${pmid}`
  const cached = workCache.get(cacheKey)
  if (cached !== undefined) return cached

  const url = withMailto(new URL(`${OPENALEX_API}/works/pmid:${pmid}`))
  url.searchParams.set('select', WORK_SELECT)

  try {
    const res = await oaFetch(url.toString())
    if (res.ok) {
      const work = toWork((await res.json()) as Record<string, unknown>)
      workCache.set(cacheKey, work)
      return work
    }
    workCache.set(cacheKey, null)
    return null
  } catch (err) {
    console.error('[discovery/openalex] resolvePubmedWork failed:', err)
    return null
  }
}

/**
 * Works this paper CITES — resolves `referenced_works` (OpenAlex ids) to neighbour
 * projections, capped. Returns [] when absent (~64% of works have no refs → degrade
 * gracefully, never a dead end).
 */
export async function getReferences(work: OpenAlexWork, limit = 6): Promise<OpenAlexNeighbour[]> {
  if (MOCK) return MOCK_REFERENCES.slice(0, limit)
  const ids = work.referencedWorks.slice(0, limit)
  if (ids.length === 0) return []
  const cacheKey = `refs:${work.id}:${limit}`
  const cached = neighboursCache.get(cacheKey)
  if (cached) return cached

  // Batch-fetch by OR-ing the OpenAlex ids in a single filter query.
  const shortIds = ids.map((id) => id.replace(`${OPENALEX_API}/`, '').replace('https://openalex.org/', ''))
  const url = withMailto(new URL(`${OPENALEX_API}/works`))
  url.searchParams.set('filter', `openalex_id:${shortIds.join('|')}`)
  url.searchParams.set('select', NEIGHBOUR_SELECT)
  url.searchParams.set('per-page', String(Math.min(limit, 25)))

  try {
    const res = await oaFetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    const neighbours = (data.results ?? []).map(toNeighbour)
    neighboursCache.set(cacheKey, neighbours)
    return neighbours
  } catch (err) {
    console.error('[discovery/openalex] getReferences failed:', err)
    return []
  }
}

/**
 * Works that CITE this paper — follows `cited_by_api_url` (one page), capped.
 * Returns [] gracefully when absent.
 */
export async function getCitedBy(work: OpenAlexWork, limit = 6): Promise<OpenAlexNeighbour[]> {
  if (MOCK) return MOCK_CITED_BY.slice(0, limit)
  if (!work.citedByApiUrl || work.citedByCount === 0) return []
  const cacheKey = `citedby:${work.id}:${limit}`
  const cached = neighboursCache.get(cacheKey)
  if (cached) return cached

  const url = withMailto(new URL(work.citedByApiUrl))
  url.searchParams.set('select', NEIGHBOUR_SELECT)
  url.searchParams.set('per-page', String(Math.min(limit, 25)))
  url.searchParams.set('sort', 'cited_by_count:desc')

  try {
    const res = await oaFetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    const neighbours = (data.results ?? []).slice(0, limit).map(toNeighbour)
    neighboursCache.set(cacheKey, neighbours)
    return neighbours
  } catch (err) {
    console.error('[discovery/openalex] getCitedBy failed:', err)
    return []
  }
}

function toNeighbour(raw: Record<string, unknown>): OpenAlexNeighbour {
  const authorships = (raw.authorships as Array<Record<string, unknown>> | undefined) ?? []
  const authors = authorships
    .slice(0, 5)
    .map((a) => {
      const author = a.author as Record<string, unknown> | undefined
      return typeof author?.display_name === 'string' ? author.display_name : ''
    })
    .filter(Boolean)
  return {
    openAlexId: String(raw.id ?? ''),
    title: typeof raw.title === 'string' ? raw.title : null,
    publicationYear: typeof raw.publication_year === 'number' ? raw.publication_year : null,
    arxivId: arxivIdFromWork(raw),
    pmid: pmidFromWork(raw),
    authors,
  }
}

// ── Unified search + single-work resolve (Phase A) ────────────────────────────
// OpenAlex indexes BOTH arXiv preprints and PubMed papers, returns JSON, is keyless,
// and — unlike arXiv's Atom API / NCBI — does not 429 datacenter IPs. This is now the
// PRIMARY source for the Papers search box AND for resolving a single work on open,
// so neither path hits the flaky arXiv/NCBI endpoints. externalIds stay in the
// arxiv:/pmid: scheme so the tree-branch + citation flow is unchanged. Still keyword
// search only — NEVER `related_works`/`concepts` (see BANNED FIELDS at top).

/** arXiv's stable source id in OpenAlex (used to filter search to preprints). */
const ARXIV_SOURCE_ID = 'S4306400194'

const SEARCH_SELECT =
  'id,doi,title,display_name,publication_year,publication_date,authorships,ids,abstract_inverted_index,primary_location,locations'

export interface NormalizedWork {
  platform: 'arxiv' | 'pubmed'
  externalId: string
  title: string
  authors: string[]
  abstract: string | null
  publishedAt: string | null
  host: string
  tier: CredibilityTier
  arxivId: string | null
  pmid: string | null
  doi: string | null
  openAlexId: string | null
}

/** Rebuild plain-text abstract from OpenAlex's inverted index, then sanitize it. */
function reconstructAbstract(inverted: Record<string, number[]> | null | undefined): string | null {
  if (!inverted || typeof inverted !== 'object') return null
  const slots: string[] = []
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) slots[pos] = word
  }
  const text = slots.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return text ? sanitizeAbstract(`<p>${text}</p>`) : null
}

function pmidFromWork(raw: Record<string, unknown>): string | null {
  const ids = raw.ids as Record<string, unknown> | undefined
  const rawPmid = typeof ids?.pmid === 'string' ? ids.pmid : ''
  const m = rawPmid.match(/(\d+)\s*$/)
  return m ? m[1] : null
}

function authorsOf(raw: Record<string, unknown>): string[] {
  const authorships = (raw.authorships as Array<Record<string, unknown>> | undefined) ?? []
  return authorships
    .map((a) => {
      const author = a.author as Record<string, unknown> | undefined
      return typeof author?.display_name === 'string' ? author.display_name : ''
    })
    .filter(Boolean)
}

/** Map a raw OpenAlex work → NormalizedWork for the platform; null if it lacks that id. */
function toNormalized(raw: Record<string, unknown>, platform: 'arxiv' | 'pubmed'): NormalizedWork | null {
  const ids = raw.ids as Record<string, unknown> | undefined
  const doi =
    (typeof raw.doi === 'string' && raw.doi) || (typeof ids?.doi === 'string' ? ids.doi : null)
  const arxivId = arxivIdFromWork(raw)
  const pmid = pmidFromWork(raw)

  let externalId: string
  let host: string
  let tier: CredibilityTier
  if (platform === 'arxiv') {
    if (!arxivId) return null
    externalId = `arxiv:${arxivId}`
    host = 'arxiv.org'
    tier = 'preprint'
  } else {
    if (!pmid) return null
    externalId = `pmid:${pmid}`
    host = 'pubmed.ncbi.nlm.nih.gov'
    tier = 'peer_reviewed'
  }

  const title =
    (typeof raw.title === 'string' && raw.title) ||
    (typeof raw.display_name === 'string' && raw.display_name) ||
    ''

  return {
    platform,
    externalId,
    title: title.replace(/\s+/g, ' ').trim(),
    authors: authorsOf(raw),
    abstract: reconstructAbstract(raw.abstract_inverted_index as Record<string, number[]> | undefined),
    publishedAt:
      (typeof raw.publication_date === 'string' && raw.publication_date) ||
      (typeof raw.publication_year === 'number' ? String(raw.publication_year) : null),
    host,
    tier,
    arxivId,
    pmid,
    doi: doi || null,
    openAlexId: typeof raw.id === 'string' ? raw.id : null,
  }
}

export interface SearchWorksParams {
  query: string
  platform: 'arxiv' | 'pubmed'
  limit?: number
}

// ── TEST-ONLY search fixtures (E2E) ─────────────────────────────────────────────
// The Papers search box (GET /api/discovery/sources/search) hits OpenAlex live,
// so under E2E it returned non-deterministic rows and flaked the platform/tier
// assertion. These fixtures make the whole Papers loop hermetic, keyed to the
// SAME seed queries ('attention' / 'fixture') and resolve-seed externalIds
// (arxiv:2401.00001 / pmid:99900001) the papers-tab spec asserts on. The seed
// query returns the seed work first (so opening result[0] resolves into the
// getWorkByExternalId seed below); any OTHER query returns a small deterministic
// RELATED list so the citations route's byAuthor/byCategory fallback lanes are
// never empty. All values must match apps/web/e2e/papers-tab.spec.ts.
const MOCK_SEARCH_ARXIV_QUERY = 'attention'
const MOCK_SEARCH_PUBMED_QUERY = 'fixture'

const MOCK_ARXIV_SEED: NormalizedWork = {
  platform: 'arxiv',
  externalId: 'arxiv:2401.00001',
  title: 'E2E Fixture: Attention Mechanisms for Deterministic Testing',
  authors: ['Ada Fixture', 'Grace Mocker'],
  abstract: 'This is a deterministic E2E fixture abstract standing in for a real arXiv paper.',
  publishedAt: '2024-01-01',
  host: 'arxiv.org',
  tier: 'preprint',
  arxivId: '2401.00001',
  pmid: null,
  doi: '10.48550/arxiv.2401.00001',
  openAlexId: 'https://openalex.org/W-e2e-seed',
}

const MOCK_PUBMED_SEED: NormalizedWork = {
  platform: 'pubmed',
  externalId: 'pmid:99900001',
  title: 'E2E Fixture: A Deterministic PubMed Paper for Testing',
  authors: ['Beatrix Fixture', 'Carl Mocker'],
  abstract: 'This is a deterministic E2E fixture abstract standing in for a real PubMed paper.',
  publishedAt: '2024',
  host: 'pubmed.ncbi.nlm.nih.gov',
  tier: 'peer_reviewed',
  arxivId: null,
  pmid: '99900001',
  doi: null,
  openAlexId: 'https://openalex.org/W-e2e-pubmed-seed',
}

// Distinct non-seed works — the 2nd arXiv search result AND the always-populated
// byAuthor/byCategory fallback lanes (their externalIds differ from the open
// source's, so they survive the citations route's self-filter).
const MOCK_ARXIV_RELATED: NormalizedWork[] = [
  {
    platform: 'arxiv', externalId: 'arxiv:2402.00021',
    title: 'E2E Fixture: A Related arXiv Paper', authors: ['Related Arxiv Author'],
    abstract: null, publishedAt: '2024', host: 'arxiv.org', tier: 'preprint',
    arxivId: '2402.00021', pmid: null, doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-a1',
  },
  {
    platform: 'arxiv', externalId: 'arxiv:2402.00022',
    title: 'E2E Fixture: Another Related arXiv Paper', authors: ['Related Arxiv Author Two'],
    abstract: null, publishedAt: '2024', host: 'arxiv.org', tier: 'preprint',
    arxivId: '2402.00022', pmid: null, doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-a2',
  },
]

const MOCK_PUBMED_RELATED: NormalizedWork[] = [
  {
    platform: 'pubmed', externalId: 'pmid:90000022',
    title: 'E2E Fixture: A Related PubMed Paper', authors: ['Related Pubmed Author'],
    abstract: null, publishedAt: '2024', host: 'pubmed.ncbi.nlm.nih.gov', tier: 'peer_reviewed',
    arxivId: null, pmid: '90000022', doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-p1',
  },
  {
    platform: 'pubmed', externalId: 'pmid:99900003',
    title: 'E2E Fixture: Another Related PubMed Paper', authors: ['Related Pubmed Author Two'],
    abstract: null, publishedAt: '2024', host: 'pubmed.ncbi.nlm.nih.gov', tier: 'peer_reviewed',
    arxivId: null, pmid: '99900003', doi: null, openAlexId: 'https://openalex.org/W-e2e-rel-p2',
  },
]

/** A citation-graph neighbour fixture → a resolvable arXiv NormalizedWork. */
function mockNeighbourToWork(n: OpenAlexNeighbour): NormalizedWork | null {
  if (!n.arxivId) return null
  return {
    platform: 'arxiv',
    externalId: `arxiv:${n.arxivId}`,
    title: n.title ?? n.arxivId,
    authors: n.authors,
    abstract: null,
    publishedAt: n.publicationYear ? String(n.publicationYear) : null,
    host: 'arxiv.org',
    tier: 'preprint',
    arxivId: n.arxivId,
    pmid: n.pmid ?? null,
    doi: null,
    openAlexId: n.openAlexId,
  }
}

// Every resolvable fixture work, keyed by externalId: the seeds, the search
// related works, and the cites/citedBy neighbours (so branching any chip — AC5 —
// resolves). Later entries win on a duplicate id, which is fine (same fixture).
const MOCK_WORK_BY_EXTID = new Map<string, NormalizedWork>(
  [
    MOCK_ARXIV_SEED,
    MOCK_PUBMED_SEED,
    ...MOCK_ARXIV_RELATED,
    ...MOCK_PUBMED_RELATED,
    ...[...MOCK_REFERENCES, ...MOCK_CITED_BY]
      .map(mockNeighbourToWork)
      .filter((w): w is NormalizedWork => w !== null),
  ].map((w) => [w.externalId, w]),
)

/** Keyword search via OpenAlex, restricted to the platform (arXiv source / has pmid). */
export async function searchWorks({ query, platform, limit = 12 }: SearchWorksParams): Promise<NormalizedWork[]> {
  if (!query.trim()) return []
  if (MOCK) {
    const q = query.trim().toLowerCase()
    if (platform === 'arxiv') {
      // Seed query → seed first + one related (spec: "attention → 2 results");
      // any other query (byAuthor/byCategory fallback) → the related list only.
      const list = q.includes(MOCK_SEARCH_ARXIV_QUERY)
        ? [MOCK_ARXIV_SEED, MOCK_ARXIV_RELATED[0]]
        : MOCK_ARXIV_RELATED
      return list.slice(0, limit)
    }
    const list = q.includes(MOCK_SEARCH_PUBMED_QUERY) ? [MOCK_PUBMED_SEED] : MOCK_PUBMED_RELATED
    return list.slice(0, limit)
  }
  const cacheKey = `searchWorks:${platform}:${query}:${limit}`
  const cached = searchWorksCache.get(cacheKey)
  if (cached) return cached

  const url = withMailto(new URL(`${OPENALEX_API}/works`))
  url.searchParams.set('search', query)
  url.searchParams.set('select', SEARCH_SELECT)
  // Over-fetch: some rows are dropped for lacking the platform id (arXiv/pmid).
  url.searchParams.set('per-page', String(Math.min(limit * 2, 50)))
  url.searchParams.set(
    'filter',
    platform === 'arxiv' ? `primary_location.source.id:${ARXIV_SOURCE_ID}` : 'has_pmid:true',
  )

  try {
    const res = await oaFetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    const works = (data.results ?? [])
      .map((r) => toNormalized(r, platform))
      .filter((w): w is NormalizedWork => w !== null)
      .slice(0, limit)
    searchWorksCache.set(cacheKey, works)
    return works
  } catch (err) {
    console.error('[discovery/openalex] searchWorks failed:', err)
    return []
  }
}

/** Resolve ONE work by its arxiv:/pmid: id via OpenAlex (never touches arXiv/NCBI). */
export async function getWorkByExternalId(
  platform: 'arxiv' | 'pubmed',
  bareId: string,
): Promise<NormalizedWork | null> {
  if (!bareId) return null
  if (MOCK) {
    // Resolve any fixture work deterministically (opening a search result, a
    // direct resolve — AC8 — or BRANCHING a cites/citedBy chip — AC5 — all route
    // here). The map covers the seeds, the search-related works, AND the
    // citation-graph neighbours, so no branch/open ever hits the live API.
    const extId = platform === 'arxiv' ? `arxiv:${bareId}` : `pmid:${bareId}`
    return MOCK_WORK_BY_EXTID.get(extId) ?? null
  }
  const cacheKey = `workByExt:${platform}:${bareId}`
  const cached = workByExtCache.get(cacheKey)
  if (cached !== undefined) return cached

  const path =
    platform === 'arxiv'
      ? `${OPENALEX_API}/works/https://doi.org/10.48550/arXiv.${normalizeArxivId(bareId)}`
      : `${OPENALEX_API}/works/pmid:${bareId}`
  const url = withMailto(new URL(path))
  url.searchParams.set('select', SEARCH_SELECT)

  try {
    const res = await oaFetch(url.toString())
    if (!res.ok) {
      workByExtCache.set(cacheKey, null)
      return null
    }
    const raw = (await res.json()) as Record<string, unknown>
    const work = toNormalized(raw, platform)
    workByExtCache.set(cacheKey, work)
    return work
  } catch (err) {
    console.error('[discovery/openalex] getWorkByExternalId failed:', err)
    return null
  }
}