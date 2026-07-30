import 'server-only'
import { LruCache } from '@/lib/lru'
import { serverEnv } from '@/lib/env'
import { fetchWithRetry, readJsonCapped } from '@/lib/fetch-retry'
import { DISCOVERY_UA, type ArticleSearchResult, type ResolvedArticle } from '@/lib/discovery/sources'

// ── Discovery prior-art lane (patents) ────────────────────────────────────────
// "Has someone built this before?" — the prior-art question every engineering-
// type science-fair judge asks. Search-driven like the MedlinePlus lane; all
// results are LINK-OUT cards (patent full text stays on Google Patents — we
// never render legal documents in-app).
//
// Backend: the PatentsView PatentSearch API (search.patentsview.org) — free but
// KEYED (registration required). With PATENTSVIEW_API_KEY set, the lane shows
// live titled results; without it, the lane degrades to a single well-formed
// Google Patents search link-out so the skill is still teachable keyless.

export const PATENTS_FEED = {
  id: 'patents',
  provider: 'patents' as const,
  renderMode: 'linkout' as const,
  sourceName: 'Google Patents',
  label: 'Prior art (patents)',
}

const API = 'https://search.patentsview.org/api/v1/patent/'
const FETCH_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 1000 * 60 * 60
const MAX_RESULTS = 10
// Ten patents with abstracts: tens of KB. 2 MB is headroom, not a real ceiling.
const MAX_BODY_BYTES = 2 * 1024 * 1024

interface PatentHit {
  externalId: string
  title: string
  /** Google Patents landing page for the patent. */
  url: string
  excerpt: string | null
  publishedAt: string | null
}

const queryCache = new LruCache<PatentHit[]>(200, CACHE_TTL_MS)
const hitCache = new LruCache<PatentHit>(500, CACHE_TTL_MS)

const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_PATENTS: PatentHit[] = [
  {
    externalId: 'pat:e2e-0000001',
    title: 'E2E Fixture: Adjustable Plant Growth Chamber',
    url: 'https://patents.google.com/patent/US0000001A1',
    excerpt: 'A deterministic fixture standing in for a real patent abstract.',
    publishedAt: '2020-01-01',
  },
  {
    externalId: 'pat:e2e-0000002',
    title: 'E2E Fixture: Low-Cost Turbidity Sensor Assembly',
    url: 'https://patents.google.com/patent/US0000002A1',
    excerpt: 'A second deterministic patent fixture.',
    publishedAt: '2021-06-15',
  },
]

function googlePatentsSearchUrl(q: string): string {
  return `https://patents.google.com/?q=${encodeURIComponent(q)}`
}

/** Keyless fallback: one card that links out to the Google Patents search itself. */
function fallbackSearchCard(q: string): PatentHit {
  const hit: PatentHit = {
    externalId: `pat:search:${encodeURIComponent(q).slice(0, 60)}`,
    title: `Search Google Patents for “${q}”`,
    url: googlePatentsSearchUrl(q),
    excerpt:
      'Live patent results need a PatentsView API key — this card opens the same search on Google Patents.',
    publishedAt: null,
  }
  hitCache.set(hit.externalId, hit)
  return hit
}

/**
 * Search granted US patents by title/abstract text. Deterministic keyword
 * search — no LLM. Degrades to the Google-Patents link-out card on any failure
 * or when no API key is configured; never 500s the Articles tab.
 */
export async function searchPatents(query: string): Promise<PatentHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  if (MOCK) return MOCK_PATENTS

  const apiKey = serverEnv.PATENTSVIEW_API_KEY()
  if (!apiKey) return [fallbackSearchCard(q)]

  const cached = queryCache.get(q.toLowerCase())
  if (cached) return cached

  const url = new URL(API)
  url.searchParams.set(
    'q',
    JSON.stringify({ _or: [{ _text_any: { patent_title: q } }, { _text_any: { patent_abstract: q } }] }),
  )
  url.searchParams.set('f', JSON.stringify(['patent_id', 'patent_title', 'patent_date', 'patent_abstract']))
  url.searchParams.set('o', JSON.stringify({ size: MAX_RESULTS }))
  url.searchParams.set('s', JSON.stringify([{ patent_date: 'desc' }]))

  try {
    const res = await fetchWithRetry(url.toString(), {
      headers: { 'User-Agent': DISCOVERY_UA, Accept: 'application/json', 'X-Api-Key': apiKey },
      timeoutMs: FETCH_TIMEOUT_MS,
      contentTypes: ['application/json'],
    })
    if (!res.ok) {
      console.error('[discovery/patents] PatentsView responded', res.status)
      return [fallbackSearchCard(q)]
    }
    const data = (await readJsonCapped(res, MAX_BODY_BYTES)) as {
      patents?: Array<{ patent_id?: string; patent_title?: string; patent_date?: string; patent_abstract?: string }>
    }
    const hits: PatentHit[] = []
    for (const p of data.patents ?? []) {
      if (!p.patent_id || !p.patent_title) continue
      const hit: PatentHit = {
        externalId: `pat:${p.patent_id}`,
        title: p.patent_title.replace(/\s+/g, ' ').trim(),
        url: `https://patents.google.com/patent/US${p.patent_id}`,
        excerpt: p.patent_abstract ? p.patent_abstract.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
        publishedAt: p.patent_date ?? null,
      }
      hits.push(hit)
      hitCache.set(hit.externalId, hit)
      if (hits.length >= MAX_RESULTS) break
    }
    queryCache.set(q.toLowerCase(), hits)
    return hits
  } catch (err) {
    console.error('[discovery/patents] search failed:', err)
    return [fallbackSearchCard(q)]
  }
}

export function patentToSearchResult(p: PatentHit): ArticleSearchResult {
  return {
    feed: PATENTS_FEED.id,
    externalId: p.externalId,
    provider: PATENTS_FEED.provider,
    renderMode: PATENTS_FEED.renderMode,
    sourceName: PATENTS_FEED.sourceName,
    title: p.title,
    author: null,
    url: p.url,
    excerpt: p.excerpt,
    publishedAt: p.publishedAt,
  }
}

/** Resolve a previously-searched patent by externalId (cache-backed, like MedlinePlus). */
export async function resolvePatent(externalId: string): Promise<ResolvedArticle | null> {
  const hit = MOCK ? MOCK_PATENTS.find((p) => p.externalId === externalId) : hitCache.get(externalId)
  if (!hit) return null
  return {
    feed: PATENTS_FEED.id,
    externalId: hit.externalId,
    provider: PATENTS_FEED.provider,
    renderMode: PATENTS_FEED.renderMode,
    sourceName: PATENTS_FEED.sourceName,
    title: hit.title,
    author: null,
    url: hit.url,
    excerpt: hit.excerpt,
    html: null, // link-out only — patent text is never rendered in-app
    publishedAt: hit.publishedAt,
  }
}
