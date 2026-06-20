import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import sanitizeHtml from 'sanitize-html'
import { enforceRateLimit } from '@/lib/rate-limit'
import { LruCache } from '@/lib/lru'

const WIKI_API = 'https://en.wikipedia.org/w/api.php'

// ── HTML sanitization (XSS defense) ───────────────────────────────────────────
// Wikipedia article HTML is PUBLICLY EDITABLE and we render it client-side via
// dangerouslySetInnerHTML (WikiReader). The regex passes in processWikiHtml are
// cosmetic, NOT a security boundary, so every response is run through a real
// allowlist sanitizer: it parses the HTML and re-serializes only known-safe tags
// /attributes, dropping <script>, inline event handlers, style/iframe/object,
// and javascript: URLs. The allowlist keeps the tags Wikipedia articles use plus
// our rewritten links (class="wiki-link" + data-wiki-title) so navigation works.
const ARTICLE_SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'span', 'div',
    'b', 'strong', 'i', 'em', 'u', 's', 'small', 'sub', 'sup', 'abbr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    'a',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class', 'data-wiki-title'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    '*': ['class'],
  },
  // No data: or javascript: — only real navigable schemes. Our rewritten
  // internal links use href="#" (a fragment), which is allowed as relative.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
}

// The page title (displaytitle) can carry markup (e.g. italic species names) and
// is also rendered via dangerouslySetInnerHTML — allow only inline formatting.
const TITLE_SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: ['i', 'b', 'em', 'strong', 'sub', 'sup', 'span'],
  allowedAttributes: {},
}
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1'

// Wikimedia's User-Agent policy requires a descriptive UA with contact info for
// server-side requests. A missing / generic UA gets throttled or IP-blocked,
// which then makes *every* subsequent request fail until the block lapses.
// https://meta.wikimedia.org/wiki/User-Agent_policy
const UA =
  'NOVALab/1.0 (https://nova-lab.app; contact: hello@nova-lab.app) node-fetch'

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
  // Auth-gated by middleware; resolve the user so this Wikipedia proxy is limited
  // per-user (shared-NAT classrooms aren't punished) and isn't a free hop.
  const { userId } = await auth()
  const limited = await enforceRateLimit(req, 'read', userId)
  if (limited) return limited

  const title = req.nextUrl.searchParams.get('title')
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  // ── Serve from cache when fresh ──────────────────────────────────────────────
  const cached = cache.get(title)
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

    const parseRes = await wikiFetch(`${WIKI_API}?${parseParams}`)

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
        `${WIKI_REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
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

    // Cache under both the requested title and the canonical title
    cache.set(title, payload)
    if (payload.normalizedTitle !== title) {
      cache.set(payload.normalizedTitle, payload)
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
