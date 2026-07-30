import 'server-only'
import { createHash } from 'crypto'
import sanitizeHtml from 'sanitize-html'
import { LruCache } from '@/lib/lru'
import { ARTICLE_SANITIZE_OPTS } from '@/lib/discovery/sanitize'
import { DISCOVERY_UA, type ArticleSearchResult, type ResolvedArticle } from '@/lib/discovery/sources'
import { fetchWithRetry, readCapped } from '@/lib/fetch-retry'

// ── Discovery explainers (MedlinePlus health topics) ──────────────────────────
// The plain-language lane: NIH's consumer-health encyclopedia, written at a
// student reading level by the National Library of Medicine. Search-driven
// (unlike the RSS article feeds): the lane's query box IS the API's search
// term. NLM-authored health-topic summaries are US-government public-domain
// works, so `renderMode: 'full'` renders the summary in-app with attribution —
// no licensing notice needed (and the CC BY-ND notice must NOT appear; see
// ArticleReader).
//
// API: https://wsearch.nlm.nih.gov/ws/query — keyless XML web service. NLM asks
// callers to stay under 85 requests/min/IP; the per-query LRU keeps a
// classroom's shared queries far below that.

export const MEDLINEPLUS_FEED = {
  id: 'medlineplus',
  provider: 'explainer' as const,
  renderMode: 'full' as const,
  sourceName: 'MedlinePlus (NIH)',
  label: 'Health topics',
}

const API = 'https://wsearch.nlm.nih.gov/ws/query'
const FETCH_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 1000 * 60 * 60
const MAX_RESULTS = 12
// A 12-topic health-topic result set is tens of KB. 4 MB is headroom.
const MAX_BODY_BYTES = 4 * 1024 * 1024

interface HealthTopic {
  externalId: string
  title: string
  url: string
  /** Plain-text teaser (tags stripped). */
  snippet: string | null
  /** Entity-decoded, UNSANITIZED summary HTML — sanitized only at resolve. */
  summaryHtml: string | null
}

const queryCache = new LruCache<HealthTopic[]>(200, CACHE_TTL_MS)
// Resolve looks the picked topic up by id — populated by every search pass.
const topicCache = new LruCache<HealthTopic>(500, CACHE_TTL_MS)

const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_TOPICS: HealthTopic[] = [
  {
    externalId: 'mlp:e2e-fixture-1',
    title: 'E2E Fixture: Diabetes Basics',
    url: 'https://medlineplus.gov/e2e-diabetes.html',
    snippet: 'A deterministic fixture standing in for a MedlinePlus health topic.',
    summaryHtml:
      '<p>E2E fixture summary: what diabetes is, in plain language a student can read.</p>',
  },
  {
    externalId: 'mlp:e2e-fixture-2',
    title: 'E2E Fixture: Exercise and Physical Fitness',
    url: 'https://medlineplus.gov/e2e-exercise.html',
    snippet: 'A second deterministic fixture topic.',
    summaryHtml: '<p>E2E fixture summary: why exercise matters, explained simply.</p>',
  },
]

/** Decode the XML-escaped payloads (`&lt;p&gt;…`) the web service returns. */
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Strip ALL markup (incl. the API's `<span class="qt0">` match highlights). */
function stripTags(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}

function contentField(docXml: string, name: string): string | null {
  const m = docXml.match(new RegExp(`<content name="${name}">([\\s\\S]*?)</content>`))
  return m ? m[1]! : null
}

/**
 * Search MedlinePlus health topics. Deterministic keyword search — no LLM.
 * Degrades to [] on any failure (the lane must never 500 the Articles tab).
 */
export async function searchHealthTopics(query: string): Promise<HealthTopic[]> {
  const q = query.trim()
  if (q.length < 2) return []
  if (MOCK) return MOCK_TOPICS

  const cached = queryCache.get(q.toLowerCase())
  if (cached) return cached

  const url = new URL(API)
  url.searchParams.set('db', 'healthTopics')
  url.searchParams.set('term', q)
  url.searchParams.set('retmax', String(MAX_RESULTS))

  try {
    // Through the shared primitive (REFACTOR2 P2-2): raw `fetch` here inherited
    // none of the outbound policy — no redirect revalidation, no total deadline,
    // and `res.text()` buffered whatever the provider sent.
    const res = await fetchWithRetry(url.toString(), {
      headers: { 'User-Agent': DISCOVERY_UA, Accept: 'application/xml' },
      timeoutMs: FETCH_TIMEOUT_MS,
    })
    if (!res.ok) return []
    const xml = await readCapped(res, MAX_BODY_BYTES)

    const topics: HealthTopic[] = []
    // One <document rank url> block per topic; fields are XML-escaped HTML.
    const docRe = /<document\b[^>]*\burl="([^"]+)"[^>]*>([\s\S]*?)<\/document>/g
    for (const m of xml.matchAll(docRe)) {
      const topicUrl = decodeXmlEntities(m[1]!)
      const body = m[2]!
      const rawTitle = contentField(body, 'title')
      if (!rawTitle || !topicUrl.startsWith('https://medlineplus.gov/')) continue
      const rawSummary = contentField(body, 'FullSummary')
      const rawSnippet = contentField(body, 'snippet')
      const topic: HealthTopic = {
        externalId: `mlp:${createHash('sha1').update(topicUrl).digest('hex').slice(0, 16)}`,
        title: stripTags(decodeXmlEntities(rawTitle)),
        url: topicUrl,
        snippet: rawSnippet ? stripTags(decodeXmlEntities(rawSnippet)) || null : null,
        summaryHtml: rawSummary ? decodeXmlEntities(rawSummary) : null,
      }
      topics.push(topic)
      topicCache.set(topic.externalId, topic)
      if (topics.length >= MAX_RESULTS) break
    }
    queryCache.set(q.toLowerCase(), topics)
    return topics
  } catch (err) {
    console.error('[discovery/medlineplus] search failed:', err)
    return []
  }
}

export function healthTopicToSearchResult(t: HealthTopic): ArticleSearchResult {
  return {
    feed: MEDLINEPLUS_FEED.id,
    externalId: t.externalId,
    provider: MEDLINEPLUS_FEED.provider,
    renderMode: MEDLINEPLUS_FEED.renderMode,
    sourceName: MEDLINEPLUS_FEED.sourceName,
    title: t.title,
    author: null,
    url: t.url,
    excerpt: t.snippet,
    publishedAt: null,
  }
}

/**
 * Resolve a previously-searched topic by externalId. Topics only enter the
 * cache through a search, so a cold id (server recycled between search and
 * click — rare) resolves null and the client surfaces the standard error.
 */
export async function resolveHealthTopic(externalId: string): Promise<ResolvedArticle | null> {
  const topic = MOCK ? MOCK_TOPICS.find((t) => t.externalId === externalId) : topicCache.get(externalId)
  if (!topic) return null
  return {
    feed: MEDLINEPLUS_FEED.id,
    externalId: topic.externalId,
    provider: MEDLINEPLUS_FEED.provider,
    renderMode: MEDLINEPLUS_FEED.renderMode,
    sourceName: MEDLINEPLUS_FEED.sourceName,
    title: topic.title,
    author: null,
    url: topic.url,
    excerpt: topic.snippet,
    // The ONE trust boundary: NLM HTML is sanitized here, exactly like the
    // Conversation bodies (shared allow-list).
    html: topic.summaryHtml ? sanitizeHtml(topic.summaryHtml, ARTICLE_SANITIZE_OPTS) : null,
    publishedAt: null,
  }
}
