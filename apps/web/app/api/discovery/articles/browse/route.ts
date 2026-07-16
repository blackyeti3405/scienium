import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'
import { browseFeed, listFeeds, FEEDS } from '@/lib/discovery/articles'
import type { ArticleSearchResult } from '@/lib/discovery/sources'

// ── GET /api/discovery/articles/browse ────────────────────────────────────────
// Articles tab: browse one RSS/Atom feed's entries as lightweight cards, plus
// the feed picker's metadata (`FEEDS` lives in the server-only adapter, so the
// client can't import it directly). Read-tier proxy over public metadata (no
// team DB touched) — same guard as the Papers search box.
export async function GET(req: NextRequest) {
  const { error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const params = req.nextUrl.searchParams
  const feed = params.get('feed')
  const q = params.get('q')?.trim() || undefined

  if (feed && !(feed in FEEDS)) {
    return NextResponse.json({ error: 'Unknown feed' }, { status: 400 })
  }

  let results: ArticleSearchResult[] = []
  if (feed) {
    try {
      results = await browseFeed(feed, q)
    } catch (err) {
      console.error('[discovery/articles/browse] failed:', err)
      // Never blow up the browse box — degrade to empty.
      results = []
    }
  }

  return NextResponse.json({ feeds: listFeeds(), results })
}
