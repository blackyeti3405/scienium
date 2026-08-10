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
      // A row whose key points at an object that is NOT THERE is a permanent,
      // per-paper fact — the file will not appear on a retry, and the student
      // needs to be told to re-upload it. R2 being unreachable is a transient,
      // whole-service fact and a retry is exactly right. Both used to answer
      // 502, so the viewer could not tell "this file is gone" from "try again"
      // and showed a blank frame for both.
      const missing = isMissingObject(err)
      return NextResponse.json(
        {
          error: missing ? 'This source\u2019s file is no longer in storage.' : 'PDF could not be loaded.',
          code: missing ? 'pdf_missing' : 'pdf_unavailable',
        },
        { status: missing ? 404 : 502 },
      )
    }
  }

  // Legacy fallback: bytes still stored in Postgres (pre-migration rows).
  if (paper.pdfData) {
    const bytes = paper.pdfData as Buffer
    headers['Content-Length'] = String(bytes.length)
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers })
  }

  return NextResponse.json(
    { error: 'No file was stored for this source.', code: 'pdf_missing' },
    { status: 404 },
  )
}

/**
 * Whether an S3/R2 error means the object does not exist, as opposed to the
 * service being unreachable. The SDK reports this as `NoSuchKey` on GetObject
 * and `NotFound` on HeadObject, and some gateways only set the HTTP status.
 */
function isMissingObject(err: unknown): boolean {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
  return (
    e?.name === 'NoSuchKey' ||
    e?.name === 'NotFound' ||
    e?.Code === 'NoSuchKey' ||
    e?.$metadata?.httpStatusCode === 404
  )
}
