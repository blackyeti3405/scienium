import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { db } from '@/lib/db'
import { getObjectStream } from '@/lib/storage'

// Streams the stored PDF inline so the in-panel <iframe> can render it. The file
// lives in R2 (private) and is streamed through this authenticated, team-scoped
// route — never via a public or signed URL. Rows uploaded before the R2 migration
// fall back to the legacy in-DB blob.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const paper = await db.paper.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { pdfKey: true, pdfData: true, title: true },
  })
  if (!paper) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const safeName = paper.title.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'paper'
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${safeName}.pdf"`,
    'Cache-Control': 'private, max-age=3600',
    // SEC-7: never let a browser re-interpret the stored bytes as HTML/JS.
    // (No CSP `sandbox` here — Chrome refuses to render sandboxed PDFs, which
    // would break the in-panel viewer; upload-time inspection rejects active
    // content instead.)
    'X-Content-Type-Options': 'nosniff',
  }

  // Preferred path: stream the object straight from R2.
  if (paper.pdfKey) {
    try {
      const { body, contentLength } = await getObjectStream(paper.pdfKey)
      if (contentLength != null) headers['Content-Length'] = String(contentLength)
      return new NextResponse(body, { status: 200, headers })
    } catch (err) {
      console.error('[r2] PDF stream failed:', err)
      return NextResponse.json({ error: 'PDF not available' }, { status: 502 })
    }
  }

  // Legacy fallback: bytes still stored in Postgres (pre-migration rows).
  if (paper.pdfData) {
    const bytes = paper.pdfData as Buffer
    headers['Content-Length'] = String(bytes.length)
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers })
  }

  return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
}
