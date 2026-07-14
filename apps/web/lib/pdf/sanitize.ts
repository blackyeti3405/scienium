import 'server-only'

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
 * the pilot posture is: refuse anything with active content. Real research
 * papers never legitimately contain it.) Names inside compressed object
 * streams can evade a raw scan, which is why viewing responses must also set
 * `X-Content-Type-Options: nosniff` and a CSP-hardened disposition — see the
 * paper file route.
 */

export interface PdfInspection {
  ok: boolean
  /** Human-safe reason, suitable for a 422 body. */
  reason?: string
}

/** Hard page cap — bounds decompression/render cost downstream. */
export const MAX_PDF_PAGES = 150

// Byte patterns for active-content markers. PDF names may hex-escape any
// character (`/J#61vaScript`), so match both the literal and a tolerant form
// with hex escapes for the letters attackers most commonly escape.
const FORBIDDEN_MARKERS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\/JavaScript\b|\/J#61vaScript|\/JavaScr#69pt/i, reason: 'embedded JavaScript' },
  // /JS as a name key (followed by delimiter/space/( or <<) — plain "JS" in text
  // streams doesn't match because of the leading slash.
  { pattern: /\/JS\s*[([</]/, reason: 'embedded JavaScript' },
  { pattern: /\/OpenAction\b/, reason: 'an auto-run open action' },
  { pattern: /\/Launch\b/, reason: 'a launch action' },
  { pattern: /\/EmbeddedFiles?\b/, reason: 'embedded files' },
  { pattern: /\/XFA\b/, reason: 'XFA form scripting' },
  { pattern: /\/RichMedia\b/, reason: 'embedded rich media' },
]

/**
 * Inspect raw PDF bytes. Callers should already have enforced a byte-size cap
 * and the `%PDF-` magic; this adds the active-content and encryption checks,
 * and the caller passes the parsed page count for the bomb guard.
 */
export function inspectPdf(buffer: Buffer, pageCount?: number): PdfInspection {
  // Encrypted PDFs: the /Encrypt key lives in the (uncompressed) trailer.
  // We can't inspect what we can't read — refuse rather than store blind.
  const tail = buffer.subarray(Math.max(0, buffer.length - 4096)).toString('latin1')
  if (/\/Encrypt\b/.test(tail)) {
    return { ok: false, reason: 'This PDF is encrypted — upload an unprotected copy.' }
  }

  const raw = buffer.toString('latin1')
  for (const { pattern, reason } of FORBIDDEN_MARKERS) {
    if (pattern.test(raw)) {
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
