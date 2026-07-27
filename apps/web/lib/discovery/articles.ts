import 'server-only'
import { fetchWithRetry, readCapped } from '@/lib/fetch-retry'
import { createHash } from 'crypto'
import sanitizeHtml from 'sanitize-html'
import { XMLParser } from 'fast-xml-parser'
import { LruCache } from '@/lib/lru'
import { ARTICLE_SANITIZE_OPTS } from '@/lib/discovery/sanitize'
import {
  DISCOVERY_UA,
  type ArticleProvider,
  type ArticleRenderMode,
  type ArticleSearchResult,
  type ResolvedArticle,
} from '@/lib/discovery/sources'

// ── Discovery articles (The Conversation + science-journalism RSS) ────────────
// One unified adapter for both providers — both are RSS/Atom, so the fetch/
// parse/cache/sanitize path is identical; only the render mode differs.
//
// The Conversation (Atom, `content` carries the FULL article body) is CC BY-ND
// (https://theconversation.com/republishing-guidelines) — verbatim republication
// with attribution is permitted, so these feeds render `renderMode: 'full'`.
// Science-journalism feeds (RSS, body NOT carried — `description` is a teaser
// only) do NOT grant republication rights, so these render `renderMode:
// 'linkout'`: an excerpt + an outbound link, never the full body.

// Hard per-request cap: Node's fetch has no default timeout, so a slow/stalled
// feed would hang the Articles tab forever. Abort after 8s → fail fast.
const FETCH_TIMEOUT_MS = 8000

// `res.text()` buffers whatever a feed sends with no ceiling — REFACTOR2 §0.7
// named this, and v0.55.0 left it as "still owed" alongside medlineplus.ts.
// Every FEEDS url is a literal in this file (never user/team data), so unlike
// openalex's `cited_by_api_url` there is no per-request host to validate —
// these six hosts are fixed at deploy time by us, not chosen by a request.
// The genuine exposure is the byte ceiling: any of the six is a third party we
// don't control, and an unbounded `res.text()` would buffer whatever they
// sent. `readCapped` is the shared ceiling (`lib/fetch-retry.ts`); a real feed
// page is a few hundred KB at most, so 8 MB is headroom, not a live limit.
const FEED_MAX_BODY_BYTES = 8 * 1024 * 1024

// Cache the parsed feed (all entries) — 60-min TTL, keyed by feed id. A feed
// updates at most a few times a day, so this is generous, not stale.
const CACHE_TTL_MS = 1000 * 60 * 60
const CACHE_MAX_ENTRIES = 200

interface FeedConfig {
  id: string
  provider: ArticleProvider
  renderMode: ArticleRenderMode
  /** Attribution label rendered in the reader (licensing requirement for CC BY-ND). */
  sourceName: string
  /** Short label for the feed-picker chip. */
  label: string
  url: string
}

/** One parsed entry — cached per-feed. `html` is populated only for `full` feeds. */
interface ParsedEntry {
  externalId: string
  title: string
  author: string | null
  url: string
  excerpt: string | null
  html: string | null
  publishedAt: string | null
}

export const FEEDS: Record<string, FeedConfig> = {
  'conversation-environment': {
    id: 'conversation-environment',
    provider: 'the_conversation',
    renderMode: 'full',
    sourceName: 'The Conversation',
    label: 'Environment',
    url: 'https://theconversation.com/us/environment/articles.atom',
  },
  'conversation-health': {
    id: 'conversation-health',
    provider: 'the_conversation',
    renderMode: 'full',
    sourceName: 'The Conversation',
    label: 'Health',
    url: 'https://theconversation.com/us/health/articles.atom',
  },
  'conversation-technology': {
    id: 'conversation-technology',
    provider: 'the_conversation',
    renderMode: 'full',
    sourceName: 'The Conversation',
    label: 'Technology',
    url: 'https://theconversation.com/us/technology/articles.atom',
  },
  quanta: {
    id: 'quanta',
    provider: 'journalism',
    renderMode: 'linkout',
    sourceName: 'Quanta Magazine',
    label: 'Quanta Magazine',
    url: 'https://api.quantamagazine.org/feed/',
  },
  'science-news': {
    id: 'science-news',
    provider: 'journalism',
    renderMode: 'linkout',
    sourceName: 'Science News',
    label: 'Science News',
    url: 'https://www.sciencenews.org/feed',
  },
  'scientific-american': {
    id: 'scientific-american',
    provider: 'journalism',
    renderMode: 'linkout',
    sourceName: 'Scientific American',
    label: 'Scientific American',
    url: 'https://www.scientificamerican.com/platform/syndication/rss/',
  },
  knowable: {
    id: 'knowable',
    provider: 'journalism',
    renderMode: 'linkout',
    sourceName: 'Knowable Magazine',
    label: 'Knowable Magazine',
    // Annual Reviews' journalism arm — articles written FROM expert-reviewed
    // review papers, so the credibility floor is unusually high for journalism.
    // The RSS carries teasers only (no content:encoded), so despite the site's
    // CC BY-ND license this renders as a link-out card, not a full article.
    url: 'https://knowablemagazine.org/rss',
  },
}

/** Feed metadata for the client's feed picker (no article payload). */
export function listFeeds(): Array<Pick<FeedConfig, 'id' | 'provider' | 'renderMode' | 'sourceName' | 'label'>> {
  return Object.values(FEEDS).map(({ id, provider, renderMode, sourceName, label }) => ({
    id,
    provider,
    renderMode,
    sourceName,
    label,
  }))
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  htmlEntities: true,
  isArray: (name) => ['entry', 'item', 'author', 'link'].includes(name),
})

const feedCache = new LruCache<ParsedEntry[]>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

const articlesFetch = (url: string) =>
  fetchWithRetry(url, { headers: { 'User-Agent': DISCOVERY_UA }, timeoutMs: FETCH_TIMEOUT_MS, retryOnError: true })

function textOf(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return String(node)
  if (typeof node === 'number') return String(node)
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text'] ?? '')
  }
  return String(node)
}

/** Strip every tag, leaving plain text (for linkout excerpts / browse cards). */
function stripToPlainText(html: string, maxLen = 500): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text
}

/** `rss:<sha1(url)>` — stable dedup key for journalism entries (no natural id). */
function rssExternalId(url: string): string {
  return `rss:${createHash('sha1').update(url).digest('hex')}`
}

function isoOrNull(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ── Atom (The Conversation) ────────────────────────────────────────────────────

function parseConversationEntry(entry: Record<string, unknown>): ParsedEntry | null {
  const rawId = textOf(entry.id)
  const tail = rawId.split('/').pop()?.trim()
  if (!tail) return null

  const links = (entry.link as Array<Record<string, unknown>> | undefined) ?? []
  const altLink = links.find((l) => l['@_rel'] === 'alternate') ?? links[0]
  const url = String(altLink?.['@_href'] ?? '')
  if (!url) return null

  const authors = (entry.author as Array<Record<string, unknown>> | undefined) ?? []
  const rawAuthor = textOf(authors[0]?.name).trim()
  // Byline commonly reads "Name, Title, Affiliation" — the name is the part
  // before the first comma.
  const author = rawAuthor ? rawAuthor.split(',')[0].trim() : null

  const rawHtml = textOf(entry.content)
  const html = rawHtml ? sanitizeHtml(rawHtml, ARTICLE_SANITIZE_OPTS) : null
  const summary = textOf(entry.summary).trim()

  return {
    externalId: `conversation:${tail}`,
    title: textOf(entry.title).replace(/\s+/g, ' ').trim(),
    author,
    url,
    excerpt: summary ? stripToPlainText(summary) : null,
    html,
    publishedAt: isoOrNull(textOf(entry.published).trim()),
  }
}

function parseAtomFeed(xml: string): ParsedEntry[] {
  const parsed = parser.parse(xml) as { feed?: { entry?: Array<Record<string, unknown>> } }
  const entries = parsed.feed?.entry ?? []
  return entries.map(parseConversationEntry).filter((e): e is ParsedEntry => e !== null)
}

// ── RSS (science journalism) ───────────────────────────────────────────────────

function parseJournalismItem(item: Record<string, unknown>): ParsedEntry | null {
  const url = textOf(item.link).trim()
  if (!url) return null

  const author = textOf(item['dc:creator']).trim() || null
  const description = textOf(item.description).trim()

  return {
    externalId: rssExternalId(url),
    title: textOf(item.title).replace(/\s+/g, ' ').trim(),
    author,
    url,
    excerpt: description ? stripToPlainText(description) : null,
    // linkout mode never carries the full body (no republication rights).
    html: null,
    publishedAt: isoOrNull(textOf(item.pubDate).trim()),
  }
}

function parseRssFeed(xml: string): ParsedEntry[] {
  const parsed = parser.parse(xml) as { rss?: { channel?: { item?: Array<Record<string, unknown>> } } }
  const items = parsed.rss?.channel?.item ?? []
  return items.map(parseJournalismItem).filter((e): e is ParsedEntry => e !== null)
}

// ── TEST-ONLY mock seam (E2E) ──────────────────────────────────────────────────
// See lib/discovery/arxiv.ts for the full rationale. E2E_MOCK_SOURCES=1 is set
// ONLY in apps/web/.env.local for the Playwright webServer — never in
// production/staging. One deterministic The Conversation `full` fixture and one
// journalism `linkout` fixture, so Playwright never depends on live feeds.
const MOCK = process.env.E2E_MOCK_SOURCES === '1'

const MOCK_CONVERSATION_ID = 'conversation:e2e-fixture-1'
const MOCK_JOURNALISM_ID = 'rss:e2e-fixture-1'

function mockConversationArticle(feed: string): ResolvedArticle {
  return {
    feed,
    externalId: MOCK_CONVERSATION_ID,
    provider: 'the_conversation',
    renderMode: 'full',
    sourceName: 'The Conversation',
    title: 'E2E Fixture: Why Coral Reefs Are Bleaching Faster Than Models Predicted',
    author: 'Ada Fixture',
    url: 'https://theconversation.com/e2e-fixture-article',
    excerpt: 'A deterministic fixture standing in for a real Conversation article.',
    html: '<p>This is a deterministic E2E fixture article body. It exists only so Playwright tests never depend on the live Conversation feed.</p>',
    publishedAt: '2024-01-01T00:00:00Z',
  }
}

function mockJournalismArticle(feed: string): ResolvedArticle {
  return {
    feed,
    externalId: MOCK_JOURNALISM_ID,
    provider: 'journalism',
    renderMode: 'linkout',
    sourceName: 'Quanta Magazine',
    title: 'E2E Fixture: A Deterministic Journalism Article for Testing',
    author: 'Grace Mocker',
    url: 'https://www.quantamagazine.org/e2e-fixture-article',
    excerpt: 'A deterministic fixture excerpt standing in for a real Quanta Magazine article.',
    html: null,
    publishedAt: '2024-01-02T00:00:00Z',
  }
}

function toSearchResult(a: ResolvedArticle): ArticleSearchResult {
  return {
    feed: a.feed,
    externalId: a.externalId,
    provider: a.provider,
    renderMode: a.renderMode,
    sourceName: a.sourceName,
    title: a.title,
    author: a.author,
    url: a.url,
    excerpt: a.excerpt,
    publishedAt: a.publishedAt,
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Content-type is not checked before parsing. Measured rather than assumed: a
 * non-XML body (an HTML error/WAF page, say) parses to an object with no
 * `feed.entry`/`rss.channel.item`, so `parseAtomFeed`/`parseRssFeed` return []
 * exactly as if the feed were merely empty — no crash, nothing to render. A
 * DOCTYPE-based XXE attempt throws inside `fast-xml-parser` itself ("External
 * entities are not supported") and is caught below like any other parse
 * failure. There is no gap a content-type check would close here.
 */
async function fetchFeed(feedId: string): Promise<ParsedEntry[]> {
  const config = FEEDS[feedId]
  if (!config) return []
  const cached = feedCache.get(feedId)
  if (cached) return cached

  try {
    const res = await articlesFetch(config.url)
    if (!res.ok) return []
    const xml = await readCapped(res, FEED_MAX_BODY_BYTES)
    const entries = config.provider === 'the_conversation' ? parseAtomFeed(xml) : parseRssFeed(xml)
    feedCache.set(feedId, entries)
    return entries
  } catch (err) {
    console.error(`[discovery/articles] fetch feed "${feedId}" failed:`, err)
    return []
  }
}

/**
 * Browse a feed's entries as lightweight cards (no full `html` — keeps the
 * browse payload small). Optional `q` filters case-insensitive over
 * title/excerpt — deterministic substring match, no LLM/ranking. Never throws
 * — degrades to [] so the Articles tab never dead-ends on a feed hiccup.
 */
export async function browseFeed(feedId: string, q?: string): Promise<ArticleSearchResult[]> {
  const config = FEEDS[feedId]
  if (!config) return []

  if (MOCK) {
    const mock = config.provider === 'the_conversation' ? mockConversationArticle(feedId) : mockJournalismArticle(feedId)
    return [toSearchResult(mock)]
  }

  const entries = await fetchFeed(feedId)
  const needle = q?.trim().toLowerCase()
  const filtered = needle
    ? entries.filter(
        (e) => e.title.toLowerCase().includes(needle) || (e.excerpt ?? '').toLowerCase().includes(needle),
      )
    : entries

  return filtered.slice(0, 20).map((e) =>
    toSearchResult({
      feed: feedId,
      externalId: e.externalId,
      provider: config.provider,
      renderMode: config.renderMode,
      sourceName: config.sourceName,
      title: e.title,
      author: e.author,
      url: e.url,
      excerpt: e.excerpt,
      html: e.html,
      publishedAt: e.publishedAt,
    }),
  )
}

/**
 * Resolve one article by (feed, externalId) — re-reads the (cached) feed and
 * finds the matching entry. Returns the full sanitized `html` for `full` mode
 * (already run through `ARTICLE_SANITIZE_OPTS` — the one trust boundary);
 * `html` stays null for `linkout` mode. Null when not found.
 */
export async function resolveArticle(feedId: string, externalId: string): Promise<ResolvedArticle | null> {
  const config = FEEDS[feedId]
  if (!config) return null

  if (MOCK) {
    if (externalId === MOCK_CONVERSATION_ID) return mockConversationArticle(feedId)
    if (externalId === MOCK_JOURNALISM_ID) return mockJournalismArticle(feedId)
    return null
  }

  const entries = await fetchFeed(feedId)
  const entry = entries.find((e) => e.externalId === externalId)
  if (!entry) return null

  return {
    feed: feedId,
    externalId: entry.externalId,
    provider: config.provider,
    renderMode: config.renderMode,
    sourceName: config.sourceName,
    title: entry.title,
    author: entry.author,
    url: entry.url,
    excerpt: entry.excerpt,
    html: entry.html,
    publishedAt: entry.publishedAt,
  }
}
