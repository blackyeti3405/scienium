import 'server-only'
import { XMLParser } from 'fast-xml-parser'
import { LruCache } from '@/lib/lru'
import { sanitizeAbstract } from '@/lib/discovery/sanitize'
import { serverEnv } from '@/lib/env'

// ── NCBI E-utilities (PubMed metadata + abstract + citation graph) ────────────
//
//  ┌──────────────────────── BANNED ELINK LINKNAMES ───────────────────────────┐
//  │ NEVER use `pubmed_pubmed`, `pubmed_pubmed_alsoviewed`, `pubmed_pubmed_reviews`,│
//  │ `pubmed_pubmed_combined`, or `pubmed_pubmed_five`. Those are ALGORITHMIC     │
//  │ SIMILARITY / "related articles" links (ML-derived) and are BANNED under      │
//  │ Discovery v2's no-AI rule. ONLY these FACTUAL citation linknames are used:   │
//  │   • pubmed_pubmed_refs      (works this article CITES)                       │
//  │   • pubmed_pubmed_citedin   (works that CITE this article — PMC-dependent)   │
//  └────────────────────────────────────────────────────────────────────────────┘
//
// Rate reality: unkeyed callers get ~3 req/s, and a 30-student class shares ONE
// server IP → cache HARD. An optional NCBI_API_KEY raises the ceiling to ~10 req/s.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const UA = 'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'
const TOOL = 'scienium'
const EMAIL = serverEnv.NCBI_EMAIL() || 'hello@scienium.app'
const API_KEY = serverEnv.NCBI_API_KEY()

// Cache hard — the shared-IP 3 req/s ceiling is the real risk (longer TTL).
const CACHE_TTL_MS = 1000 * 60 * 60 // 60 minutes
const CACHE_MAX_ENTRIES = 1000

export interface PubmedWork {
  /** Dedup key: `pmid:<PMID>`. */
  externalId: string
  pmid: string
  title: string
  authors: string[]
  journal: string | null
  publishedAt: string | null
  /** PMCID if the full text is in PMC (drives the open_access tier / lane). */
  pmcId: string | null
  /** Sanitized abstract; may be empty until efetch is called. */
  abstract: string
  /** Landing page for the reading unit. */
  sourceUrl: string
  /** Host used for the credibility tier (PMID → pubmed.ncbi.nlm.nih.gov). */
  sourceHost: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['PubmedArticle', 'AbstractText', 'Author', 'Id', 'Link', 'LinkSetDb'].includes(name),
})

const summaryCache = new LruCache<PubmedWork | null>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const abstractCache = new LruCache<string>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const searchCache = new LruCache<string[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)
const linkCache = new LruCache<string[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

// ── TEST-ONLY mock seam (E2E) ──────────────────────────────────────────────────
// See lib/discovery/arxiv.ts for the full rationale. E2E_MOCK_SOURCES=1 is set
// ONLY in apps/web/.env.local for the Playwright webServer — never in
// production/staging. One deterministic PubMed fixture paper (pmid 99900001) with
// a ref, a cited-by, and an author-lane neighbour so all four surf lanes have
// something to render without hitting NCBI's shared-IP 3 req/s ceiling in CI.
const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_SEED_PMID = '99900001'
const MOCK_REF_PMID = '99900002'
const MOCK_CITEDBY_PMID = '99900003'
const MOCK_AUTHOR_PMID = '99900004'

const MOCK_WORKS: Record<string, PubmedWork> = {
  [MOCK_SEED_PMID]: {
    externalId: `pmid:${MOCK_SEED_PMID}`,
    pmid: MOCK_SEED_PMID,
    title: 'E2E Fixture: A Deterministic PubMed Paper for Testing',
    authors: ['Beatrix Fixture', 'Carl Mocker'],
    journal: 'Journal of E2E Fixtures',
    publishedAt: '2024 Jan',
    pmcId: null,
    abstract:
      '<p>This is a deterministic E2E fixture abstract standing in for a real PubMed paper. It exists only so Playwright tests never depend on the live NCBI API.</p>',
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${MOCK_SEED_PMID}/`,
    sourceHost: 'pubmed.ncbi.nlm.nih.gov',
  },
  [MOCK_REF_PMID]: {
    externalId: `pmid:${MOCK_REF_PMID}`,
    pmid: MOCK_REF_PMID,
    title: 'E2E Fixture: A Reference This Paper Cites',
    authors: ['Ref One Author'],
    journal: 'Journal of E2E Fixtures',
    publishedAt: '2020 Mar',
    pmcId: null,
    abstract: '',
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${MOCK_REF_PMID}/`,
    sourceHost: 'pubmed.ncbi.nlm.nih.gov',
  },
  [MOCK_CITEDBY_PMID]: {
    externalId: `pmid:${MOCK_CITEDBY_PMID}`,
    pmid: MOCK_CITEDBY_PMID,
    title: 'E2E Fixture: A Paper That Cites This One',
    authors: ['CitedBy One Author'],
    journal: 'Journal of E2E Fixtures',
    publishedAt: '2024 Feb',
    pmcId: 'PMC9990003',
    abstract: '',
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${MOCK_CITEDBY_PMID}/`,
    sourceHost: 'pubmed.ncbi.nlm.nih.gov',
  },
  [MOCK_AUTHOR_PMID]: {
    externalId: `pmid:${MOCK_AUTHOR_PMID}`,
    pmid: MOCK_AUTHOR_PMID,
    title: 'E2E Fixture: Another Paper by the Same Author',
    authors: ['Beatrix Fixture'],
    journal: 'Journal of E2E Fixtures',
    publishedAt: '2023 Nov',
    pmcId: null,
    abstract: '',
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${MOCK_AUTHOR_PMID}/`,
    sourceHost: 'pubmed.ncbi.nlm.nih.gov',
  },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Every E-utils request MUST carry tool + email (+ api_key when present). */
function euUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${EUTILS}/${path}`)
  url.searchParams.set('tool', TOOL)
  url.searchParams.set('email', EMAIL)
  if (API_KEY) url.searchParams.set('api_key', API_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

// Hard per-request cap so a stalled NCBI connection fails fast (no default timeout).
const FETCH_TIMEOUT_MS = 12000

async function euFetch(url: string, attempt = 0): Promise<Response> {
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
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt
    await sleep(backoff)
    return euFetch(url, attempt + 1)
  }
  return res
}

export interface PubmedSearchParams {
  term?: string
  author?: string
  mesh?: string
  retmax?: number
}

/** esearch → PMIDs, newest first. Fields AND together via PubMed's field tags. */
export async function esearchPubmed(params: PubmedSearchParams): Promise<string[]> {
  if (MOCK) {
    // Author-lane search returns the dedicated author fixture; anything else
    // (keyword/mesh/topic search) returns the seed paper so the search box and
    // the "More in topic" fallback always have a deterministic hit.
    if (params.author) return [MOCK_AUTHOR_PMID]
    return [MOCK_SEED_PMID]
  }
  const { term, author, mesh, retmax = 10 } = params
  const clauses: string[] = []
  if (term?.trim()) clauses.push(term.trim())
  if (author?.trim()) clauses.push(`${author.trim()}[Author]`)
  if (mesh?.trim()) clauses.push(`${mesh.trim()}[MeSH Terms]`)
  if (clauses.length === 0) return []

  const query = clauses.join(' AND ')
  const cacheKey = `search:${query}:${retmax}`
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

  try {
    const res = await euFetch(
      euUrl('esearch.fcgi', {
        db: 'pubmed',
        term: query,
        retmax: String(Math.min(retmax, 25)),
        retmode: 'json',
        sort: 'pub_date',
      }),
    )
    if (!res.ok) return []
    const data = (await res.json()) as { esearchresult?: { idlist?: string[] } }
    const ids = data.esearchresult?.idlist ?? []
    searchCache.set(cacheKey, ids)
    return ids
  } catch (err) {
    console.error('[discovery/ncbi] esearch failed:', err)
    return []
  }
}

function pmcIdFrom(articleids: Array<{ idtype?: string; value?: string }> | undefined): string | null {
  const pmc = articleids?.find((a) => a.idtype === 'pmc')?.value
  if (!pmc) return null
  return pmc.startsWith('PMC') ? pmc : `PMC${pmc}`
}

/** esummary (JSON) → PubmedWork per id (abstract left empty; call efetchAbstract). */
export async function esummaryPubmed(ids: string[]): Promise<PubmedWork[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return []
  if (MOCK) return unique.map((id) => MOCK_WORKS[id]).filter((w): w is PubmedWork => !!w)

  const uncached: string[] = []
  const out: PubmedWork[] = []
  for (const id of unique) {
    const c = summaryCache.get(id)
    if (c) out.push(c)
    else if (c === undefined) uncached.push(id)
    // c === null → known-missing, skip
  }
  if (uncached.length === 0) return out

  try {
    const res = await euFetch(
      euUrl('esummary.fcgi', { db: 'pubmed', id: uncached.join(','), retmode: 'json' }),
    )
    if (res.ok) {
      const data = (await res.json()) as {
        result?: Record<string, Record<string, unknown>> & { uids?: string[] }
      }
      const result = data.result ?? {}
      for (const uid of result.uids ?? []) {
        const r = result[uid]
        if (!r) continue
        const authors = ((r.authors as Array<{ name?: string }> | undefined) ?? [])
          .map((a) => a.name ?? '')
          .filter(Boolean)
        const pmcId = pmcIdFrom(r.articleids as Array<{ idtype?: string; value?: string }> | undefined)
        const work: PubmedWork = {
          externalId: `pmid:${uid}`,
          pmid: uid,
          title: typeof r.title === 'string' ? r.title.replace(/\s+/g, ' ').trim() : '',
          authors,
          journal: typeof r.fulljournalname === 'string' ? r.fulljournalname : null,
          publishedAt: typeof r.pubdate === 'string' ? r.pubdate : null,
          pmcId,
          abstract: '',
          sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
          sourceHost: 'pubmed.ncbi.nlm.nih.gov',
        }
        summaryCache.set(uid, work)
        out.push(work)
      }
    }
    // Preserve the requested order.
    const byId = new Map(out.map((w) => [w.pmid, w]))
    return unique.map((id) => byId.get(id)).filter((w): w is PubmedWork => !!w)
  } catch (err) {
    console.error('[discovery/ncbi] esummary failed:', err)
    return out
  }
}

/** efetch (XML) → sanitized abstract text for one PMID. '' when unavailable. */
export async function efetchAbstract(pmid: string): Promise<string> {
  if (!pmid) return ''
  if (MOCK) return MOCK_WORKS[pmid]?.abstract ?? ''
  const cached = abstractCache.get(pmid)
  if (cached !== undefined) return cached

  try {
    const res = await euFetch(
      euUrl('efetch.fcgi', { db: 'pubmed', id: pmid, rettype: 'abstract', retmode: 'xml' }),
    )
    if (!res.ok) {
      abstractCache.set(pmid, '')
      return ''
    }
    const xml = await res.text()
    const parsed = parser.parse(xml) as {
      PubmedArticleSet?: {
        PubmedArticle?: Array<{
          MedlineCitation?: { Article?: { Abstract?: { AbstractText?: unknown[] } } }
        }>
      }
    }
    const article = parsed.PubmedArticleSet?.PubmedArticle?.[0]
    const parts = article?.MedlineCitation?.Article?.Abstract?.AbstractText ?? []
    const text = parts
      .map((p) => {
        if (p == null) return ''
        if (typeof p === 'string') return p
        const obj = p as Record<string, unknown>
        const label = typeof obj['@_Label'] === 'string' ? `${obj['@_Label']}: ` : ''
        const body = '#text' in obj ? String(obj['#text'] ?? '') : ''
        return `${label}${body}`
      })
      .filter(Boolean)
      .join('\n\n')
    const sanitized = text ? sanitizeAbstract(`<p>${text.replace(/\n\n/g, '</p><p>')}</p>`) : ''
    abstractCache.set(pmid, sanitized)
    return sanitized
  } catch (err) {
    console.error('[discovery/ncbi] efetch failed:', err)
    return ''
  }
}

// ── elink (citation graph) — ONLY the two allowlisted linknames ───────────────

async function elink(pmid: string, linkname: string): Promise<string[]> {
  const cacheKey = `${linkname}:${pmid}`
  const cached = linkCache.get(cacheKey)
  if (cached) return cached

  try {
    const res = await euFetch(
      euUrl('elink.fcgi', {
        dbfrom: 'pubmed',
        db: 'pubmed',
        id: pmid,
        linkname,
        retmode: 'json',
      }),
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      linksets?: Array<{ linksetdbs?: Array<{ linkname?: string; links?: string[] }> }>
    }
    const linkset = data.linksets?.[0]
    const match = linkset?.linksetdbs?.find((d) => d.linkname === linkname)
    const ids = match?.links ?? []
    linkCache.set(cacheKey, ids)
    return ids
  } catch (err) {
    console.error(`[discovery/ncbi] elink ${linkname} failed:`, err)
    return []
  }
}

/** Works this article CITES (pubmed_pubmed_refs). */
export function elinkRefs(pmid: string): Promise<string[]> {
  if (MOCK) return Promise.resolve(pmid === MOCK_SEED_PMID ? [MOCK_REF_PMID] : [])
  return elink(pmid, 'pubmed_pubmed_refs')
}

/** Works that CITE this article (pubmed_pubmed_citedin) — PMC-dependent, often thin. */
export function elinkCitedIn(pmid: string): Promise<string[]> {
  if (MOCK) return Promise.resolve(pmid === MOCK_SEED_PMID ? [MOCK_CITEDBY_PMID] : [])
  return elink(pmid, 'pubmed_pubmed_citedin')
}