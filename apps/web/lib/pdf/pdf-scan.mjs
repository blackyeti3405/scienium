// Pure, dependency-free PDF byte-scanning primitives (SEC-7). Deliberately NOT
// `server-only` — this is the one piece of `lib/pdf/sanitize.ts` a plain `node`
// process (e.g. scripts/seed-real-lit-discover.mjs) also needs to run, so a
// seeded paper is one that would actually survive the real upload route.
// `lib/pdf/sanitize.ts` re-exports these; edit the marker list HERE, not in a
// second hand-copy.

// PDF names may hex-escape any character (`/J#61vaScript`), so match both the
// literal and a tolerant form with hex escapes for the letters attackers most
// commonly escape.
export const FORBIDDEN_MARKERS = [
  { pattern: /\/JavaScript\b|\/J#61vaScript|\/JavaScr#69pt/i, reason: 'embedded JavaScript' },
  // /JS as a name key (followed by delimiter/space/( or <<) — plain "JS" in text
  // streams doesn't match because of the leading slash.
  { pattern: /\/JS\s*[([</]/, reason: 'embedded JavaScript' },
  { pattern: /\/OpenAction\b/, reason: 'an auto-run open action' },
  { pattern: /\/Launch\b/, reason: 'a launch action' },
  { pattern: /\/XFA\b/, reason: 'XFA form scripting' },
  { pattern: /\/RichMedia\b/, reason: 'embedded rich media' },
]

/**
 * Blank out every `stream ... endstream` payload, preserving byte offsets so a
 * marker's position still maps back to the original file. Unterminated streams
 * (truncated/malformed file) blank to EOF — refusing to scan bytes we can't
 * frame is the conservative read.
 */
export function stripStreamData(raw) {
  const out = []
  let cursor = 0
  const opener = /\bstream\r\n|\bstream\n|\bstream\r/g
  let m
  while ((m = opener.exec(raw)) !== null) {
    const bodyStart = m.index + m[0].length
    const bodyEnd = raw.indexOf('endstream', bodyStart)
    const stop = bodyEnd === -1 ? raw.length : bodyEnd
    out.push(raw.slice(cursor, bodyStart), ' '.repeat(stop - bodyStart))
    cursor = stop
    if (bodyEnd === -1) break
    opener.lastIndex = stop
  }
  out.push(raw.slice(cursor))
  return out.join('')
}
