import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getObjectStream } from '@/lib/storage'
import { db } from '@/lib/db'
import { canViewShowcase, type ShowcaseAccess } from '@/lib/showcase'
import { resolveShowcaseViewer, toVerifiedShowcaseForView } from '@/lib/showcase-server'

/**
 * Streams a showcase image (board/visual) from PRIVATE R2 to anyone the
 * showcase's privacy level admits — `public` to all, `link_only` only to a
 * caller presenting the showcase's share token (`?t=`), private/draft to team
 * members and the team's teacher. Authorization
 * is the showcase's own privacy, not team membership, so public visitors can load
 * images without the bucket ever being public. (This route is in the middleware
 * public allowlist; auth() simply resolves null for anonymous visitors.)
 */
export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'read')
  if (limited) return limited

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const asset = await db.showcaseAsset.findUnique({
    where: { id },
    select: {
      fileUrl: true,
      assetType: true,
      showcase: {
        select: {
          teamId: true,
          privacyLevel: true,
          publishedAt: true,
          moderationStatus: true,
          shareToken: true,
          // Takedown (P1-6). The bytes are gated by the SAME `canViewShowcase`
          // call as the page, so a takedown that removes the page cannot leave
          // the board and quad chart still streaming from a bookmarked URL.
          takedownAt: true,
          // The digest inputs, so the approval can be re-verified against the
          // content actually being served (see `toVerifiedShowcaseForView`).
          shortTitle: true,
          title: true,
          abstract: true,
          approvedDigest: true,
          assets: { select: { assetType: true, fileUrl: true, metadataJson: true } },
          team: { select: { members: { select: { user: { select: { schoolId: true } } } } } },
        },
      },
    },
  })

  // Only uploaded files (board / quad chart / figure) are streamed; link assets
  // have no bytes.
  if (
    !asset?.fileUrl ||
    (asset.assetType !== 'board' && asset.assetType !== 'quad_chart' && asset.assetType !== 'figure') ||
    !asset.fileUrl.startsWith('showcase/') ||
    asset.fileUrl.includes('..')
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Resolve the viewer (may be anonymous) to evaluate privacy.
  const viewer = await resolveShowcaseViewer()

  // The bytes are gated exactly like the page (REFACTOR2 P1-R7): an asset id
  // alone must not open a `link_only` showcase's board or quad chart, or the
  // share token would be a lock on the front door with the window left open.
  const presented = req.nextUrl.searchParams.get('t')
  const via: ShowcaseAccess =
    presented && asset.showcase.shareToken === presented ? 'share_token' : 'slug'

  const forView = toVerifiedShowcaseForView(asset.showcase)
  if (!canViewShowcase(forView, viewer, via)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { body, contentLength, contentType } = await getObjectStream(asset.fileUrl)
    const isPdf = contentType === 'application/pdf' || asset.fileUrl.endsWith('.pdf')
    const headers: Record<string, string> = {
      'Content-Type': contentType ?? (isPdf ? 'application/pdf' : 'image/jpeg'),
      'X-Content-Type-Options': 'nosniff',
      // The cache lifetime IS the takedown latency (REFACTOR2 P1-6). `private`
      // is the load-bearing half: no CDN or shared proxy ever holds a copy, so
      // a takedown is immediate for every viewer who has not already loaded the
      // bytes, and there is no shared cache to purge. What remains is a client's
      // OWN cache — the one copy no server can recall — so it is bounded to a
      // minute instead of an hour. Tradeoff: a board PDF is re-fetched from R2
      // once a minute per reader rather than once an hour. That is the price of
      // "immediately", and it is small next to a takedown that isn't.
      'Cache-Control': 'private, max-age=60, must-revalidate',
    }
    if (isPdf) {
      // Render inline in the viewer's PDF reader (mirrors the papers file route).
      headers['Content-Disposition'] = 'inline'
    } else {
      // Images get the strict sandbox CSP (an <img> needs nothing executable).
      headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
    }
    if (contentLength != null) headers['Content-Length'] = String(contentLength)
    return new NextResponse(body, { status: 200, headers })
  } catch (err) {
    console.error('[r2] showcase asset stream failed:', err)
    return NextResponse.json({ error: 'Not available' }, { status: 502 })
  }
}
