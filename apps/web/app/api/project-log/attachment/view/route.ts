import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { getObjectStream } from '@/lib/storage'
import { db } from '@/lib/db'

// Streams a project-log image attachment from private R2 through this
// authenticated, team-scoped route — never a public or signed URL.
//
// Canonical reference is `?id=<assetId>` (SEC-6): the id resolves through the
// team-scoped UploadedAsset ledger row, so the ROW authorizes the read — no
// client-supplied object key is trusted. `?key=` remains for legacy log rows
// saved before id-URLs; it is validated against the team's own upload prefix.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  let key: string | null = null
  const assetId = req.nextUrl.searchParams.get('id')
  if (assetId) {
    const asset = await db.uploadedAsset.findFirst({
      where: { id: assetId, teamId: ctx.teamId, status: { not: 'deleted' } },
      select: { objectKey: true },
    })
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    key = asset.objectKey
  } else {
    key = req.nextUrl.searchParams.get('key')
  }

  if (!key || key.includes('..') || !key.startsWith(`log-attachments/${ctx.teamId}/`)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { body, contentLength, contentType } = await getObjectStream(key)
    const headers: Record<string, string> = {
      // Only ever serve image bytes; nosniff stops the browser from
      // MIME-sniffing the response into anything executable.
      'Content-Type': contentType ?? 'image/jpeg',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, max-age=86400',
    }
    if (contentLength != null) headers['Content-Length'] = String(contentLength)
    return new NextResponse(body, { status: 200, headers })
  } catch (err) {
    console.error('[r2] attachment stream failed:', err)
    return NextResponse.json({ error: 'Not available' }, { status: 502 })
  }
}
