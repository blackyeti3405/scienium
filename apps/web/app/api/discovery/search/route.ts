import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { fetchWithRetry, readJsonCapped } from '@/lib/fetch-retry'
import { LruCache } from '@/lib/lru'

// Must match Wikimedia's User-Agent policy (descriptive UA + contact) to avoid
// throttling / IP blocks that would also break article loading.
const UA =
  'scienium/1.0 (https://scienium.app; contact: hello@scienium.app) node-fetch'

/**
 * OpenSearch answers `[query, titles[], descriptions[], urls[]]`. Only the
 * titles are read here, so only the titles are pinned — `.rest(z.unknown())`
 * keeps the trailing lanes unconstrained rather than re-declaring a provider
 * shape we never touch. Before this, `data[1]` was read off a bare
 * `as [string, string[]]` cast: a provider (or a captive-portal HTML page that
 * happened to parse) handing back a non-array put whatever it liked into the
 * suggestion list the student sees.
 */
const OpenSearch = z.tuple([z.string(), z.array(z.string())]).rest(z.unknown())

/** Eight titles. A few KB in practice; 256 KB is headroom, not a real ceiling. */
const MAX_BODY_BYTES = 256 * 1024

// Replaces the `next: { revalidate: 300 }` this route used before it moved onto
// the shared gateway (which follows redirects by hand, so Next's fetch cache is
// not in the path). Same 5-minute window, same purpose: a keystroke-driven
// suggestion box must not be one Wikipedia request per keystroke. Bounded like
// the sibling article route's cache so a long-lived instance can't grow without
// limit.
const cache = new LruCache<string[]>(500, 1000 * 60 * 5)

export async function GET(req: NextRequest) {
  // Rate-limited per-user so this Wikipedia proxy can't be a free amplification hop.
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json([])

  const cached = cache.get(q)
  if (cached) return NextResponse.json(cached)

  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'opensearch')
  url.searchParams.set('search', q)
  url.searchParams.set('limit', '8')
  url.searchParams.set('format', 'json')

  try {
    const res = await fetchWithRetry(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      // Bounded wait — suggestions are cosmetic; every failure below falls back
      // to []. One attempt: a retry costs the student a slower box, not a better
      // one, and the next keystroke supersedes this request anyway.
      timeoutMs: 5_000,
      attempts: 1,
      contentTypes: ['application/json'],
    })
    if (!res.ok) return NextResponse.json([])
    const parsed = OpenSearch.safeParse(await readJsonCapped(res, MAX_BODY_BYTES))
    if (!parsed.success) return NextResponse.json([])
    const titles = parsed.data[1]
    cache.set(q, titles)
    return NextResponse.json(titles)
  } catch {
    return NextResponse.json([])
  }
}
