import { XMLParser } from 'fast-xml-parser'
import { LruCache } from '@/lib/lru'
import { sanitizeAbstract } from '@/lib/discovery/sanitize'

// ── arXiv Atom API ────────────────────────────────────────────────────────────
// Keyword / author / category search + single-work metadata over arXiv's public
// Atom API (http://export.arxiv.org/api/query). No API key, no quota.
//
// NOTE: arXiv has NO citation data — the "Cites" / "Cited by" surf lanes for
// arXiv works come from OpenAlex (see lib/discovery/openalex.ts). This module only
// provides metadata + the keyword/author/category search that powers the
// "More by author" / "More in category" lanes and the Papers search box.
//
// Everything here is deterministic keyword match — NO LLM, NO ranking.

const ARXIV_API = 'https://export.arxiv.org/api/query'

// Descriptive UA with contact (same policy the Wikipedia proxy follows).
const UA = 'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

// Cache hits by query/id — 30-min TTL, 500 entries (matches the article proxy).
const CACHE_TTL_MS = 1000 * 60 * 30
const CACHE_MAX_ENTRIES = 500

export interface ArxivWork {
  /** Dedup key: `arxiv:<id>` with any version suffix stripped. */
  externalId: string
  /** Bare arXiv id (version-stripped), e.g. "2401.01234". */
  arxivId: string
  title: string
  authors: string[]
  /** Sanitized abstract (safe inline HTML only). */
  abstract: string
  categories: string[]
  publishedAt: string | null
  doi?: string
  /** Abstract landing page (the reading unit target). */
  absUrl: string
  pdfUrl: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // arXiv sometimes returns a single <entry> (object) or many (array) — normalize
  // by always treating entry/author/category/link as arrays downstream.
  isArray: (name) => ['entry', 'author', 'category', 'link'].includes(name),
})

const searchCache = new LruCache<ArxivWork[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const workCache = new LruCache<ArxivWork | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Hard per-request cap: Node's fetch has NO default timeout, so a slow/stalled
// arXiv connection would hang the search box forever. Abort after 12s → fail fast.
const FETCH_TIMEOUT_MS = 12000

/** Fetch with a descriptive UA + timeout + retry/backoff on transient 429 / 5xx (≤2 retries). */
async function arxivFetch(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const backoff =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt
    await sleep(backoff)
    return arxivFetch(url, attempt + 1)
  }
  return res
}

/**
 * Strip the version suffix from an arXiv id so v1/v2 of the same work dedup to one
 * key. `2401.01234v2` → `2401.01234`; old-style `hep-th/0101001v1` → `hep-th/0101001`.
 */
export function normalizeArxivId(raw: string): string {
  return raw
    .trim()
    .replace(/^arxiv:/i, '')
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    .replace(/v\d+$/i, '')
}

function textOf(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'] ?? '')
  }
  return String(node)
}

/** Map one parsed Atom <entry> → ArxivWork (version-stripped id, sanitized abstract). */
function entryToWork(entry: Record<string, unknown>): ArxivWork | null {
  // entry.id is like "http://arxiv.org/abs/2401.01234v1"
  const rawId = textOf(entry.id)
  const arxivId = normalizeArxivId(rawId)
  if (!arxivId) return null

  const authors = (entry.author as Array<Record<string, unknown>> | undefined)
    ?.map((a) => textOf(a.name).trim())
    .filter(Boolean) ?? []

  const categories = (entry.category as Array<Record<string, unknown>> | undefined)
    ?.map((c) => String(c['@_term'] ?? '').trim())
    .filter(Boolean) ?? []

  const links = (entry.link as Array<Record<string, unknown>> | undefined) ?? []
  const pdfLink = links.find((l) => l['@_title'] === 'pdf')
  const doiRaw = textOf(entry['arxiv:doi']).trim()

  return {
    externalId: `arxiv:${arxivId}`,
    arxivId,
    title: textOf(entry.title).replace(/\s+/g, ' ').trim(),
    authors,
    abstract: sanitizeAbstract(textOf(entry.summary).trim()),
    categories,
    publishedAt: textOf(entry.published).trim() || null,
    doi: doiRaw || undefined,
    absUrl: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: (pdfLink?.['@_href'] as string) ?? `https://arxiv.org/pdf/${arxivId}`,
  }
}

function parseFeed(xml: string): ArxivWork[] {
  const parsed = parser.parse(xml) as { feed?: { entry?: Array<Record<string, unknown>> } }
  const entries = parsed.feed?.entry ?? []
  return entries.map(entryToWork).filter((w): w is ArxivWork => w !== null)
}

// ── Query builder ─────────────────────────────────────────────────────────────
// arXiv `au:` wants "Lastname_F"; phrases go in quotes; fields AND together.
function escapePhrase(s: string): string {
  return s.replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Format an author name for arXiv `au:` (e.g. "Ashish Vaswani" → "Vaswani_A"). */
export function arxivAuthorTerm(fullName: string): string {
  const parts = escapePhrase(fullName).split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  const last = parts[parts.length - 1]
  const firstInitial = parts[0]?.[0] ?? ''
  return firstInitial ? `${last}_${firstInitial}` : last
}

export interface ArxivSearchParams {
  query?: string
  author?: string
  category?: string
  maxResults?: number
}

// ── TEST-ONLY mock seam (E2E) ──────────────────────────────────────────────────
// arXiv/NCBI/OpenAlex are called server-side, so Playwright's browser-level route
// interception can't stub them, and hitting the live APIs on every CI run is
// flaky/slow/rate-limit-risky (NCBI: 3 req/s shared IP). When E2E_MOCK_SOURCES=1
// (set ONLY in apps/web/.env.local for the Playwright webServer, never in
// production/staging) these functions short-circuit to tiny deterministic
// fixtures instead of hitting the network. Kept intentionally small.
const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_SEED_WORK: ArxivWork = {
  externalId: 'arxiv:2401.00001',
  arxivId: '2401.00001',
  title: 'E2E Fixture: Attention Mechanisms for Deterministic Testing',
  authors: ['Ada Fixture', 'Grace Mocker'],
  abstract:
    '<p>This is a deterministic E2E fixture abstract standing in for a real arXiv paper. It exists only so Playwright tests never depend on the live arXiv API.</p>',
  categories: ['cs.CL'],
  publishedAt: '2024-01-01T00:00:00Z',
  absUrl: 'https://arxiv.org/abs/2401.00001',
  pdfUrl: 'https://arxiv.org/pdf/2401.00001',
}

const MOCK_SEARCH_RESULTS: ArxivWork[] = [
  MOCK_SEED_WORK,
  {
    externalId: 'arxiv:2401.00002',
    arxivId: '2401.00002',
    title: 'E2E Fixture: A Second Deterministic Paper for Search Results',
    authors: ['Ada Fixture'],
    abstract: '<p>A second fixture abstract for the search-results list.</p>',
    categories: ['cs.CL'],
    publishedAt: '2024-01-02T00:00:00Z',
    absUrl: 'https://arxiv.org/abs/2401.00002',
    pdfUrl: 'https://arxiv.org/pdf/2401.00002',
  },
]

/**
 * Search arXiv by keyword / author / category, newest first. Fields AND together.
 * Returns [] gracefully on any failure (never throws → never a dead-end surf lane).
 */
export async function searchArxiv(params: ArxivSearchParams): Promise<ArxivWork[]> {
  if (MOCK) return MOCK_SEARCH_RESULTS
  const { query, author, category, maxResults = 10 } = params
  const clauses: string[] = []
  if (query?.trim()) clauses.push(`all:${JSON.stringify(escapePhrase(query))}`)
  if (author?.trim()) clauses.push(`au:${arxivAuthorTerm(author)}`)
  if (category?.trim()) clauses.push(`cat:${escapePhrase(category).replace(/\s+/g, '.')}`)
  if (clauses.length === 0) return []

  const searchQuery = clauses.join(' AND ')
  const cacheKey = `search:${searchQuery}:${maxResults}`
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  const url = new URL(ARXIV_API)
  url.searchParams.set('search_query', searchQuery)
  url.searchParams.set('start', '0')
  url.searchParams.set('max_results', String(Math.min(maxResults, 25)))
  url.searchParams.set('sortBy', 'submittedDate')
  url.searchParams.set('sortOrder', 'descending')

  try {
    const res = await arxivFetch(url.toString())
    if (!res.ok) return []
    const works = parseFeed(await res.text())
    searchCache.set(cacheKey, works)
    return works
  } catch (err) {
    console.error('[discovery/arxiv] search failed:', err)
    return []
  }
}

/** Resolve a single arXiv work by id (version-agnostic). Null if not found. */
export async function getArxivById(rawId: string): Promise<ArxivWork | null> {
  const id = normalizeArxivId(rawId)
  if (!id) return null
  if (MOCK) {
    return [MOCK_SEED_WORK, ...MOCK_SEARCH_RESULTS].find((w) => w.arxivId === id) ?? null
  }
  const cached = workCache.get(id)
  if (cached !== undefined) return cached

  const url = new URL(ARXIV_API)
  url.searchParams.set('id_list', id)
  url.searchParams.set('max_results', '1')

  try {
    const res = await arxivFetch(url.toString())
    if (!res.ok) {
      workCache.set(id, null)
      return null
    }
    const works = parseFeed(await res.text())
    const work = works[0] ?? null
    workCache.set(id, work)
    return work
  } catch (err) {
    console.error('[discovery/arxiv] getById failed:', err)
    return null
  }
}
