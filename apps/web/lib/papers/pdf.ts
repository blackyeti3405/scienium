import 'server-only'
import { NextResponse } from 'next/server'
import { getObjectStream } from '@/lib/storage'

/**
 * Streams a stored PDF inline so an in-panel <iframe> can render it. Prefers R2
 * (via `pdfKey`); falls back to the legacy in-DB blob (`pdfData`) for
 * pre-migration rows. Shared by the student and teacher paper-file routes —
 * callers must do their own auth/IDOR lookup before calling this.
 */
export async function streamStoredPdf(
  paper: { pdfKey: string | null; pdfData: unknown; title: string },
  logLabel = '[r2] PDF stream failed:',
): Promise<NextResponse> {
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
      console.error(logLabel, err)
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
