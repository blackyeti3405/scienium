import 'server-only'
import { z } from 'zod'
import { fetchWithRetry, readJsonCapped } from '@/lib/fetch-retry'
import { LruCache } from '@/lib/lru'
import { normalizeArxivId } from '@/lib/discovery/arxiv'
import { sanitizeAbstract } from '@/lib/discovery/sanitize'
import { DISCOVERY_UA } from '@/lib/discovery/sources'
import type { CredibilityTier } from '@prisma/client'
import { serverEnv } from '@/lib/env'
import {
  MOCK_REFERENCES,
  MOCK_CITED_BY,
  MOCK_WORK,
  MOCK_PUBMED_WORK,
  MOCK_SEARCH_ARXIV_QUERY,
  MOCK_SEARCH_PUBMED_QUERY,
  MOCK_ARXIV_SEED,
  MOCK_PUBMED_SEED,
  MOCK_ARXIV_RELATED,
  MOCK_PUBMED_RELATED,
  MOCK_OA_RELATED,
  MOCK_WORK_BY_EXTID,
} from './openalex.fixtures'

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

/** The ONLY host this module may talk to. */
const OPENALEX_HOST = 'api.openalex.org'

/** Largest OpenAlex response we will buffer. A 50-row `select`ed page is ~1MB. */
const MAX_BODY_BYTES = 8 * 1024 * 1024

/**
 * Build an OpenAlex request URL — and enforce that it IS one.
 *
 * `getCitedBy` follows `cited_by_api_url` **out of the provider's own JSON**.
 * Nothing checked it, so a compromised, spoofed, or simply wrong upstream
 * response could point this server at any host it liked: an SSRF from inside a
 * request handler, and — because the politeness params are appended *after* the
 * URL is chosen — it also handed `OPENALEX_API_KEY` to whoever answered. That
 * was reproduced against the original: a work whose `cited_by_api_url` named a
 * local server received exactly one request, carrying `api_key=…`.
 *
 * So the credential is attached only once the host has been proven, and every
 * request in this module is built here — there is no second door.
 */
function oaUrl(input: string): URL {
  const url = new URL(input)
  if (url.protocol !== 'https:' || url.hostname !== OPENALEX_HOST) {
    throw new Error(`refusing non-OpenAlex URL: ${url.protocol}//${url.hostname}`)
  }
  url.searchParams.set('mailto', MAILTO)
  if (OPENALEX_API_KEY) url.searchParams.set('api_key', OPENALEX_API_KEY)
  return url
}

const oaFetch = (url: URL) =>
  fetchWithRetry(url.toString(), {
    headers: { 'User-Agent': DISCOVERY_UA, Accept: 'application/json' },
    timeoutMs: 8000,
    timeoutMessage: 'OpenAlex request timed out',
  })

/**
 * Provider JSON, PARSED — the house rule is `safeParse`, never a cast, and this
 * module had `as Record<string, unknown>` at every read.
 *
 * The schemas are deliberately shallow. The field mappers below (`toWork`,
 * `toNeighbour`, `toNormalized`) already `typeof`-guard every field they touch,
 * so they are a hand-written parser that works; re-declaring OpenAlex's ~40-field
 * Work here would be a second source of truth to keep in step for no defect.
 * What the casts actually *lied* about is the envelope shape — `results` being an
 * array of objects — and that is what these pin.
 */
const OaObject = z.record(z.unknown())
const OaList = z.object({ results: z.array(OaObject).optional() })

/** One capped, parsed Work object. */
const oaWork = async (res: Response): Promise<Record<string, unknown>> =>
  OaObject.parse(await readJsonCapped(res, MAX_BODY_BYTES))

/** One capped, parsed result page. */
const oaResults = async (res: Response): Promise<Array<Record<string, unknown>>> =>
  OaList.parse(await readJsonCapped(res, MAX_BODY_BYTES)).results ?? []

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
    // `Array.isArray` proved the container, never the ELEMENTS — the `as string[]`
    // was the lie. A non-string in here reaches `id.replace(...)` in
    // `getReferences` and throws, taking the whole citation lane down with it.
    referencedWorks: Array.isArray(raw.referenced_works)
      ? raw.referenced_works.filter((id): id is string => typeof id === 'string')
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
  const doiUrl = oaUrl(`${OPENALEX_API}/works/https://doi.org/10.48550/arXiv.${arxivId}`)
  doiUrl.searchParams.set('select', WORK_SELECT)

  try {
    const res = await oaFetch(doiUrl)
    if (res.ok) {
      const work = toWork(await oaWork(res))
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

/** Resolve an openalex-platform node's work by its bare W… id (citation lanes). */
export async function resolveOpenalexWork(rawId: string): Promise<OpenAlexWork | null> {
  const oaId = rawId.trim().replace(/^openalex:/i, '')
  if (!/^W\d+$/.test(oaId)) return null
  // MOCK: no citation-graph fixtures for openalex nodes — lanes fall back to the
  // always-populated related-papers search, which IS mocked.
  if (MOCK) return null
  const cacheKey = `openalex:${oaId}`
  const cached = workCache.get(cacheKey)
  if (cached !== undefined) return cached

  const url = oaUrl(`${OPENALEX_API}/works/${oaId}`)
  url.searchParams.set('select', WORK_SELECT)

  try {
    const res = await oaFetch(url)
    if (!res.ok) {
      workCache.set(cacheKey, null)
      return null
    }
    const work = toWork(await oaWork(res))
    workCache.set(cacheKey, work)
    return work
  } catch (err) {
    console.error('[discovery/openalex] resolveOpenalexWork failed:', err)
    return null
  }
}

export async function resolvePubmedWork(rawPmid: string): Promise<OpenAlexWork | null> {
  const pmid = rawPmid.trim()
  if (!pmid) return null
  if (MOCK) return pmid === '99900001' ? MOCK_PUBMED_WORK : null
  const cacheKey = `pmid:${pmid}`
  const cached = workCache.get(cacheKey)
  if (cached !== undefined) return cached

  const url = oaUrl(`${OPENALEX_API}/works/pmid:${pmid}`)
  url.searchParams.set('select', WORK_SELECT)

  try {
    const res = await oaFetch(url)
    if (res.ok) {
      const work = toWork(await oaWork(res))
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
  const url = oaUrl(`${OPENALEX_API}/works`)
  url.searchParams.set('filter', `openalex_id:${shortIds.join('|')}`)
  url.searchParams.set('select', NEIGHBOUR_SELECT)
  url.searchParams.set('per-page', String(Math.min(limit, 25)))

  try {
    const res = await oaFetch(url)
    if (!res.ok) return []
    const neighbours = (await oaResults(res)).map(toNeighbour)
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

  try {
    // Inside the try on purpose: `oaUrl` THROWS on a URL that is not OpenAlex's,
    // and this lane's contract is to degrade to an empty list, not to fail the
    // student's request. The refusal is logged, so it is a signal and not a shrug.
    const url = oaUrl(work.citedByApiUrl)
    url.searchParams.set('select', NEIGHBOUR_SELECT)
    url.searchParams.set('per-page', String(Math.min(limit, 25)))
    url.searchParams.set('sort', 'cited_by_count:desc')

    const res = await oaFetch(url)
    if (!res.ok) return []
    const neighbours = (await oaResults(res)).slice(0, limit).map(toNeighbour)
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
  'id,doi,title,display_name,type,publication_year,publication_date,authorships,ids,abstract_inverted_index,primary_location,locations'

export interface NormalizedWork {
  platform: 'arxiv' | 'pubmed' | 'openalex'
  externalId: string
  title: string
  authors: string[]
  abstract: string | null
  publishedAt: string | null
  host: string
  tier: CredibilityTier
  /** OpenAlex work type `review` — a survey of a field, the best novice entry point. */
  isReview?: boolean
  arxivId: string | null
  pmid: string | null
  doi: string | null
  openAlexId: string | null
}

/**
 * Rebuild plain-text abstract from OpenAlex's inverted index, then sanitize it.
 *
 * Positions are provider data. The old version wrote them into a plain array —
 * `slots[pos] = word` — so ONE out-of-range position sized the array to it, and
 * the following `slots.filter(...)` walked every index. Measured against the
 * original: a two-word abstract whose second position was 50,000,000 took
 * **1.8 seconds**, and a search page normalizes up to 50 rows. A `Map` keyed by
 * position makes the magnitude irrelevant — the cost is the number of words that
 * are actually there.
 */
export function reconstructAbstract(
  inverted: Record<string, number[]> | null | undefined,
): string | null {
  if (!inverted || typeof inverted !== 'object') return null
  const slots = new Map<number, string>()
  for (const [word, positions] of Object.entries(inverted)) {
    if (!Array.isArray(positions)) continue
    for (const pos of positions) {
      if (typeof pos === 'number' && Number.isInteger(pos) && pos >= 0) slots.set(pos, word)
    }
  }
  const text = [...slots.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, word]) => word)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
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
/** Bare OpenAlex work id (`W…`) from the raw work's id URL, or null. */
function openalexIdOf(raw: Record<string, unknown>): string | null {
  const id = typeof raw.id === 'string' ? raw.id : ''
  const m = id.match(/(W\d+)\s*$/)
  return m ? m[1]! : null
}

/**
 * Tier + display host for a work resolved on the `openalex` platform (no arXiv
 * id, no PMID). Tier comes from OpenAlex METADATA, not the host string:
 * repository-hosted (bioRxiv/medRxiv/PsyArXiv/…) → `preprint`; a DOAJ-indexed
 * journal → `peer_reviewed`; any other venue → `open_access` (the honest
 * "check whether it was peer-reviewed" middle tier).
 */
function openalexTierAndHost(raw: Record<string, unknown>): { tier: CredibilityTier; host: string } {
  const loc = raw.primary_location as Record<string, unknown> | undefined
  const source = loc?.source as Record<string, unknown> | undefined
  const sourceType = typeof source?.type === 'string' ? source.type : null
  const inDoaj = source?.is_in_doaj === true
  let host = 'openalex.org'
  const landing = typeof loc?.landing_page_url === 'string' ? loc.landing_page_url : null
  try {
    if (landing) host = new URL(landing).hostname.replace(/^www\./, '')
  } catch {
    // Malformed landing URL — keep the openalex.org fallback.
  }
  const tier: CredibilityTier =
    sourceType === 'repository' ? 'preprint' : inDoaj ? 'peer_reviewed' : 'open_access'
  return { tier, host }
}

/**
 * Normalize one raw OpenAlex work. With a platform preference ('arxiv' /
 * 'pubmed'), behaves strictly as before: the platform id must exist or the row
 * is dropped. With 'any' (the open-access sweep), the platform is derived from
 * the ids the work actually has — pmid → pubmed, arXiv id → arxiv, otherwise
 * the `openalex` platform keyed by the work's own OpenAlex id.
 */
function toNormalized(
  raw: Record<string, unknown>,
  platform: 'arxiv' | 'pubmed' | 'any',
): NormalizedWork | null {
  const ids = raw.ids as Record<string, unknown> | undefined
  const doi =
    (typeof raw.doi === 'string' && raw.doi) || (typeof ids?.doi === 'string' ? ids.doi : null)
  const arxivId = arxivIdFromWork(raw)
  const pmid = pmidFromWork(raw)

  let resolved: 'arxiv' | 'pubmed' | 'openalex'
  if (platform === 'any') {
    resolved = pmid ? 'pubmed' : arxivId ? 'arxiv' : 'openalex'
  } else {
    resolved = platform
  }

  let externalId: string
  let host: string
  let tier: CredibilityTier
  if (resolved === 'arxiv') {
    if (!arxivId) return null
    externalId = `arxiv:${arxivId}`
    host = 'arxiv.org'
    tier = 'preprint'
  } else if (resolved === 'pubmed') {
    if (!pmid) return null
    externalId = `pmid:${pmid}`
    host = 'pubmed.ncbi.nlm.nih.gov'
    tier = 'peer_reviewed'
  } else {
    const oaId = openalexIdOf(raw)
    if (!oaId) return null
    externalId = `openalex:${oaId}`
    ;({ tier, host } = openalexTierAndHost(raw))
  }

  const title =
    (typeof raw.title === 'string' && raw.title) ||
    (typeof raw.display_name === 'string' && raw.display_name) ||
    ''

  return {
    platform: resolved,
    externalId,
    title: title.replace(/\s+/g, ' ').trim(),
    authors: authorsOf(raw),
    abstract: reconstructAbstract(raw.abstract_inverted_index as Record<string, number[]> | undefined),
    publishedAt:
      (typeof raw.publication_date === 'string' && raw.publication_date) ||
      (typeof raw.publication_year === 'number' ? String(raw.publication_year) : null),
    host,
    tier,
    isReview: raw.type === 'review',
    arxivId,
    pmid,
    doi: doi || null,
    openAlexId: typeof raw.id === 'string' ? raw.id : null,
  }
}

export interface SearchWorksParams {
  query: string
  /** 'oa': the open-access sweep — any `is_oa:true` work, platform derived per row. */
  platform: 'arxiv' | 'pubmed' | 'oa'
  limit?: number
}

/**
 * Keyword search via OpenAlex. 'arxiv' / 'pubmed' are the strict platform
 * filters; 'oa' sweeps ALL open-access works (`is_oa:true`) — which is what
 * brings bioRxiv/medRxiv/PsyArXiv/SocArXiv/ChemRxiv preprints and open-access
 * journal articles (ecology, psychology, …) into the merged Papers search —
 * with each row's platform derived from the ids it actually has.
 */
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
    if (platform === 'oa') return MOCK_OA_RELATED.slice(0, limit)
    const list = q.includes(MOCK_SEARCH_PUBMED_QUERY) ? [MOCK_PUBMED_SEED] : MOCK_PUBMED_RELATED
    return list.slice(0, limit)
  }
  const cacheKey = `searchWorks:${platform}:${query}:${limit}`
  const cached = searchWorksCache.get(cacheKey)
  if (cached) return cached

  const url = oaUrl(`${OPENALEX_API}/works`)
  url.searchParams.set('search', query)
  url.searchParams.set('select', SEARCH_SELECT)
  // Over-fetch: some rows are dropped for lacking a resolvable id.
  url.searchParams.set('per-page', String(Math.min(limit * 2, 50)))
  url.searchParams.set(
    'filter',
    platform === 'arxiv'
      ? `primary_location.source.id:${ARXIV_SOURCE_ID}`
      : platform === 'pubmed'
        ? 'has_pmid:true'
        : 'is_oa:true',
  )

  try {
    const res = await oaFetch(url)
    if (!res.ok) return []
    const works = (await oaResults(res))
      .map((r) => toNormalized(r, platform === 'oa' ? 'any' : platform))
      .filter((w): w is NormalizedWork => w !== null)
      .slice(0, limit)
    searchWorksCache.set(cacheKey, works)
    return works
  } catch (err) {
    console.error('[discovery/openalex] searchWorks failed:', err)
    return []
  }
}

/** Resolve ONE work by its arxiv:/pmid:/openalex: id via OpenAlex (never touches arXiv/NCBI). */
export async function getWorkByExternalId(
  platform: 'arxiv' | 'pubmed' | 'openalex',
  bareId: string,
): Promise<NormalizedWork | null> {
  if (!bareId) return null
  if (MOCK) {
    // Resolve any fixture work deterministically (opening a search result, a
    // direct resolve — AC8 — or BRANCHING a cites/citedBy chip — AC5 — all route
    // here). The map covers the seeds, the search-related works, AND the
    // citation-graph neighbours, so no branch/open ever hits the live API.
    const extId =
      platform === 'arxiv' ? `arxiv:${bareId}` : platform === 'pubmed' ? `pmid:${bareId}` : `openalex:${bareId}`
    return MOCK_WORK_BY_EXTID.get(extId) ?? null
  }
  const cacheKey = `workByExt:${platform}:${bareId}`
  const cached = workByExtCache.get(cacheKey)
  if (cached !== undefined) return cached

  const path =
    platform === 'arxiv'
      ? `${OPENALEX_API}/works/https://doi.org/10.48550/arXiv.${normalizeArxivId(bareId)}`
      : platform === 'pubmed'
        ? `${OPENALEX_API}/works/pmid:${bareId}`
        : `${OPENALEX_API}/works/${bareId}`
  const url = oaUrl(path)
  url.searchParams.set('select', SEARCH_SELECT)

  try {
    const res = await oaFetch(url)
    if (!res.ok) {
      workByExtCache.set(cacheKey, null)
      return null
    }
    const work = toNormalized(await oaWork(res), platform === 'openalex' ? 'any' : platform)
    workByExtCache.set(cacheKey, work)
    return work
  } catch (err) {
    console.error('[discovery/openalex] getWorkByExternalId failed:', err)
    return null
  }
}