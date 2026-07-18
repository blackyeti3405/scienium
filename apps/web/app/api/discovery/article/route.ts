import { NextRequest, NextResponse } from 'next/server'
import sanitizeHtml from 'sanitize-html'
import { requireUserContext } from '@/lib/api/route-context'
import { LruCache } from '@/lib/lru'
// Shared XSS allowlist (also used by the Discovery v2 source path for abstracts).
// See lib/discovery/sanitize.ts — do NOT fork a looser allowlist.
import { ARTICLE_SANITIZE_OPTS, TITLE_SANITIZE_OPTS } from '@/lib/discovery/sanitize'

// Reading-level toggle: English or Simple English (same MediaWiki API, a
// different subdomain). The `lang` query param is a validated enum — never
// interpolated from raw input.
const WIKI_HOSTS = { en: 'en.wikipedia.org', simple: 'simple.wikipedia.org' } as const
type WikiLang = keyof typeof WIKI_HOSTS
const wikiApi = (lang: WikiLang) => `https://${WIKI_HOSTS[lang]}/w/api.php`
const wikiRest = (lang: WikiLang) => `https://${WIKI_HOSTS[lang]}/api/rest_v1`

// Wikimedia's User-Agent policy requires a descriptive UA with contact info for
// server-side requests. A missing / generic UA gets throttled or IP-blocked,
// which then makes *every* subsequent request fail until the block lapses.
// https://meta.wikimedia.org/wiki/User-Agent_policy
const UA =
  'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

interface ArticlePayload {
  title: string
  normalizedTitle: string
  description?: string
  html: string
}

// ── In-memory cache ───────────────────────────────────────────────────────────
// Cuts request volume dramatically: React StrictMode double-fires effects in dev,
// hot-reload re-runs them, and navigating back/forth re-requests the same article.
// Without caching this floods the Wikipedia API and trips its rate limiter.
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes
// Bounded so a long-running instance fielding many distinct titles can't grow
// memory without limit; LRU eviction keeps the hottest articles resident.
const CACHE_MAX_ENTRIES = 500
const cache = new LruCache<ArticlePayload>(CACHE_MAX_ENTRIES, CACHE_TTL_MS)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fetch with a descriptive UA + retry/backoff for transient 429 / 5xx errors. */
async function wikiFetch(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
    },
    // Bounded wait — a stalled Wikipedia response must not hold the request
    // open for the platform default.
    signal: AbortSignal.timeout(8_000),
  })

  // Retry on rate-limit / transient server errors (up to 2 retries)
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 400 * 2 ** attempt // 400ms, 800ms
    await sleep(backoff)
    return wikiFetch(url, attempt + 1)
  }

  return res
}

export async function GET(req: NextRequest) {
  // Rate-limited per-user (shared-NAT classrooms aren't punished) so this
  // Wikipedia proxy isn't a free hop.
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const title = req.nextUrl.searchParams.get('title')
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const lang: WikiLang = req.nextUrl.searchParams.get('lang') === 'simple' ? 'simple' : 'en'

  // ── Serve from cache when fresh (keyed per language edition) ────────────────
  const cacheKey = `${lang}:${title}`
  const cached = cache.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    // ── 1. Fetch article HTML via action=parse (stable, well-supported) ──────
    // NOTE: no `origin=*` — that's a browser-CORS flag that forces anonymous
    // handling. Server-side it only adds rate-limit pressure.
    const parseParams = new URLSearchParams({
      action: 'parse',
      page:   title,
      prop:   'text|displaytitle',
      format: 'json',
      redirects: '1',
    })

    const parseRes = await wikiFetch(`${wikiApi(lang)}?${parseParams}`)

    if (!parseRes.ok) {
      // Surface the real status so rate-limits (429) are diagnosable
      const detail =
        parseRes.status === 429
          ? 'Wikipedia is rate-limiting requests — please wait a moment and retry.'
          : `Wikipedia API error (HTTP ${parseRes.status})`
      console.error(`[discovery/article] "${title}" → HTTP ${parseRes.status}`)
      return NextResponse.json({ error: detail }, { status: 502 })
    }

    const parseData = (await parseRes.json()) as {
      parse?: { title: string; displaytitle: string; text: { '*': string } }
      error?: { code: string; info: string }
    }

    if (parseData.error || !parseData.parse) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // ── 2. Fetch short description from REST summary (best-effort) ───────────
    let description: string | undefined
    try {
      const summaryRes = await wikiFetch(
        `${wikiRest(lang)}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      )
      if (summaryRes.ok) {
        const s = (await summaryRes.json()) as { description?: string }
        description = s.description
      }
    } catch {
      // non-fatal — we still have the article HTML
    }

    const payload: ArticlePayload = {
      title:           sanitizeHtml(parseData.parse.displaytitle ?? title, TITLE_SANITIZE_OPTS),
      normalizedTitle: parseData.parse.title ?? title,
      description,
      html:            processWikiHtml(parseData.parse.text['*']),
    }

    // Cache under both the requested title and the canonical title (per edition)
    cache.set(cacheKey, payload)
    if (payload.normalizedTitle !== title) {
      cache.set(`${lang}:${payload.normalizedTitle}`, payload)
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[discovery/article] fetch failed:', err)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 502 })
  }
}

// ── HTML processor ───────────────────────────────────────────────────────────
// The parse API wraps everything in <div class="mw-parser-output">...</div>
// We transform it into clean, interceptable markup.
function processWikiHtml(raw: string): string {
  const rewritten = raw
      // ── Strip scaffolding ──────────────────────────────────────────────────
      // Remove edit-section widgets
      .replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
      // Remove inline reference superscripts [1], [2] …
      .replace(/<sup[^>]*class="[^"]*\breference\b[^"]*"[^>]*>[\s\S]*?<\/sup>/g, '')
      // Remove figure / thumbnail blocks
      .replace(/<figure[\s\S]*?<\/figure>/g, '')
      // Remove <img> tags
      .replace(/<img[^>]*\/?>/g, '')
      // Remove infobox / navbox / sidebar tables
      .replace(
        /<table[^>]*class="[^"]*(?:infobox|navbox|sidebar|vertical-navbox)[^"]*"[^>]*>[\s\S]*?<\/table>/g,
        '',
      )
      // Remove the "short description" hidden span
      .replace(/<span[^>]*class="[^"]*shortdescription[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')

      // ── Red links → plain text ──────────────────────────────────────────────
      .replace(/<a[^>]*class="[^"]*\bnew\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '$1')

      // ── Internal wiki links → interceptable ────────────────────────────────
      // Handles: href="/wiki/Article_Title" and href="/wiki/Article_Title#section"
      .replace(/href="\/wiki\/([^"#>]+)(?:#[^"]*)?"/g, (_, encoded) => {
        const decoded = decodeURIComponent(encoded).replace(/_/g, ' ')
        return `data-wiki-title="${decoded}" href="#" class="wiki-link"`
      })

      // ── External links → new tab ────────────────────────────────────────────
      .replace(
        /href="((?:https?:)?\/\/[^"]+)"/g,
        'href="$1" target="_blank" rel="noopener noreferrer"',
      )

  // Final, authoritative safety gate (see ARTICLE_SANITIZE_OPTS above).
  return sanitizeHtml(rewritten, ARTICLE_SANITIZE_OPTS)
}
