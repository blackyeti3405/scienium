import sanitizeHtml from 'sanitize-html'

// ── HTML sanitization (XSS defense) — SHARED allowlist ────────────────────────
// Lifted verbatim out of `api/discovery/article/route.ts` so the Wikipedia
// article path AND the Discovery v2 source path (arXiv / PubMed abstracts) share
// ONE trust boundary. Both render server-produced HTML client-side via
// dangerouslySetInnerHTML, so every response is run through this real allowlist
// sanitizer: it parses the HTML and re-serializes only known-safe tags/attributes,
// dropping <script>, inline event handlers, style/iframe/object, and javascript:
// URLs. Do NOT fork a looser allowlist — one allowlist, one XSS surface.
export const ARTICLE_SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'span', 'div',
    'b', 'strong', 'i', 'em', 'u', 's', 'small', 'sub', 'sup', 'abbr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    'a',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'class', 'data-wiki-title'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    '*': ['class'],
  },
  // No data: or javascript: — only real navigable schemes. Rewritten internal
  // wiki links use href="#" (a fragment), which is allowed as relative.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
}

// The page/title (displaytitle) can carry markup (e.g. italic species names) and
// is also rendered via dangerouslySetInnerHTML — allow only inline formatting.
export const TITLE_SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: ['i', 'b', 'em', 'strong', 'sub', 'sup', 'span'],
  allowedAttributes: {},
}

/**
 * Sanitize an academic abstract (arXiv `summary` / PubMed `AbstractText`) with the
 * SAME allowlist the WikiReader trusts. Abstracts embed only inline markup
 * (`<i>/<sub>/<sup>`) which the allowlist permits; everything else is discarded.
 * Called server-side at resolve time so abstracts are stored already-sanitized.
 */
export function sanitizeAbstract(html: string): string {
  return sanitizeHtml(html, ARTICLE_SANITIZE_OPTS)
}
