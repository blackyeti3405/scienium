import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getObjectStream } from '@/lib/storage'
import { db } from '@/lib/db'
import { canViewShowcase, toShowcaseForView } from '@/lib/showcase'
import { resolveShowcaseViewer } from '@/lib/showcase-server'

/**
 * Streams a showcase image (board/visual) from PRIVATE R2 to anyone the
 * showcase's privacy level admits — public/link_only to all, school_only to
 * same-school signed-in users, private/draft to team members only. Authorization
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
          team: { select: { members: { select: { user: { select: { schoolId: true } } } } } },
        },
      },
    },
  })

  // Only uploaded files (board / quad chart) are streamed; link assets have no bytes.
  if (
    !asset?.fileUrl ||
    (asset.assetType !== 'board' && asset.assetType !== 'quad_chart') ||
    !asset.fileUrl.startsWith('showcase/') ||
    asset.fileUrl.includes('..')
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Resolve the viewer (may be anonymous) to evaluate privacy.
  const viewer = await resolveShowcaseViewer()

  const forView = toShowcaseForView(asset.showcase)
  if (!canViewShowcase(forView, viewer)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { body, contentLength, contentType } = await getObjectStream(asset.fileUrl)
    const isPdf = contentType === 'application/pdf' || asset.fileUrl.endsWith('.pdf')
    const headers: Record<string, string> = {
      'Content-Type': contentType ?? (isPdf ? 'application/pdf' : 'image/jpeg'),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
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
