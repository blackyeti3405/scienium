import 'server-only'
import { FORBIDDEN_MARKERS, stripStreamData } from '@/lib/pdf/pdf-scan.mjs'

/**
 * PDF safety inspection (SEC-7) — shaped like `lib/discovery/sanitize.ts`: one
 * pure, shared, server-only module every PDF-accepting route runs before
 * storing or parsing bytes.
 *
 * A PDF is a container format: beyond the MIME + size + `%PDF-` checks the
 * upload route already does, a hostile file can carry JavaScript, launch/open
 * actions that fire in desktop viewers, embedded files, XFA scripting forms,
 * or an encryption dictionary that makes later processing misbehave. We serve
 * papers back to the whole team, so a stored PDF is a stored payload.
 *
 * This inspects the raw bytes for those active-content markers and rejects the
 * file — inspect-and-refuse, not rewrite. (Full structural normalization needs
 * a native tool like qpdf/mutool in a locked worker; on this serverless target
 * the pilot posture is: refuse anything with *active* content.) Names inside
 * compressed object streams can evade a raw scan, which is why viewing
 * responses must also set `X-Content-Type-Options: nosniff` and a CSP-hardened
 * disposition — see the paper file route.
 *
 * Scoping matters as much as the marker list. Two rules keep this from eating
 * real papers, both learned from false rejections:
 *
 *  1. Only *active* content is refused. `/EmbeddedFiles` is not: publisher
 *     toolchains routinely attach a `folder.joboptions` (Distiller settings)
 *     or an XMP/PDF-A sidecar, so a large share of genuine papers carry one.
 *     An attachment is inert bytes unless a reader explicitly extracts and
 *     opens it — it cannot self-execute the way /JavaScript or /OpenAction can
 *     — and we already serve papers with nosniff + attachment disposition.
 *     Rejecting it cost us real uploads and bought nothing.
 *
 *  2. Only bytes *outside* stream data are scanned. Names live in object
 *     dictionaries; stream payloads are compressed image/font/content blobs
 *     whose random bytes will eventually spell any short marker by chance (a
 *     4 MB paper has a ~0.5% chance of containing `/JS(` in noise alone). We
 *     lose nothing by skipping them: an /ObjStm's dictionaries are compressed,
 *     so a raw scan could never read them anyway — that is the documented
 *     limitation above, not a new one.
 */

export interface PdfInspection {
  ok: boolean
  /** Human-safe reason, suitable for a 422 body. */
  reason?: string
}

/** Hard page cap — bounds decompression/render cost downstream. */
export const MAX_PDF_PAGES = 150

/**
 * Clean text extracted from a PDF for storage in a Postgres `text` column.
 *
 * PDF text layers routinely carry NUL (0x00) and other C0 control bytes;
 * Postgres rejects a stored string containing `` with
 * `invalid byte sequence for encoding "UTF8": 0x00`, which otherwise surfaces
 * as a failed upload / 500 with no obvious cause. Strips every C0 control char
 * except tab, newline, and carriage return (all legitimate in body text), then
 * trims. Idempotent and safe to run on already-clean text.
 */
export function sanitizePdfText(text: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  return (text ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
}

/** True if `buf` starts with the PDF magic bytes (`%PDF-`). */
export function isPdfMagic(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

/**
 * Inspect raw PDF bytes. Callers should already have enforced a byte-size cap
 * and the `%PDF-` magic; this adds the active-content and encryption checks,
 * and the caller passes the parsed page count for the bomb guard.
 */
export function inspectPdf(buffer: Buffer, pageCount?: number): PdfInspection {
  const structure = stripStreamData(buffer.toString('latin1'))

  // Encrypted PDFs: the /Encrypt key lives in the (uncompressed) trailer.
  // We can't inspect what we can't read — refuse rather than store blind.
  if (/\/Encrypt\b/.test(structure.slice(-4096))) {
    return { ok: false, reason: 'This PDF is encrypted — upload an unprotected copy.' }
  }

  for (const { pattern, reason } of FORBIDDEN_MARKERS) {
    if (pattern.test(structure)) {
      return {
        ok: false,
        reason: `This PDF contains ${reason}, which isn't allowed. Export a clean copy (e.g. print to PDF) and re-upload.`,
      }
    }
  }

  if (pageCount != null && pageCount > MAX_PDF_PAGES) {
    return {
      ok: false,
      reason: `This PDF has ${pageCount} pages (max ${MAX_PDF_PAGES}). Upload just the paper.`,
    }
  }

  return { ok: true }
}
