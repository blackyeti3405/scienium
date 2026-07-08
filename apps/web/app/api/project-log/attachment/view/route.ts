import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { getObjectStream } from '@/lib/storage'

// Streams a project-log image attachment from private R2 through this
// authenticated, team-scoped route. The object key embeds the team id
// (`log-attachments/<teamId>/<uuid>.<ext>`), so we verify the caller belongs
// to that team before streaming — never a public or signed URL.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const key = req.nextUrl.searchParams.get('key')
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
