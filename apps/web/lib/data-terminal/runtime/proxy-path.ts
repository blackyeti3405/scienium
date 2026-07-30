import path from 'node:path'

/**
 * Path sanitisation for the Pyodide runtime proxy — the trust boundary.
 *
 * Lives here, not in the route, for two reasons: a Next `route.ts` may only
 * export the framework's own names (a helper export fails `next build`), and a
 * security check deserves a unit test. See proxy-path.test.ts.
 */

// Only the runtime's own file kinds. `.whl`/`.zip` are the wheels + stdlib,
// `.wasm` the engine, `.js`/`.mjs` the emscripten glue, `.json` the package
// lock, `.ts` the (never-loaded but harmless) type stubs.
export const ALLOWED_EXT = new Set(['.wasm', '.js', '.mjs', '.json', '.zip', '.whl', '.ts'])

export const CONTENT_TYPE: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.zip': 'application/zip',
  '.whl': 'application/octet-stream',
  '.ts': 'text/plain; charset=utf-8',
}

/**
 * Reject traversal and clamp to the allow-list. Returns the safe relative path
 * (forward-slashed) or null.
 *
 * Rejecting an empty / `.` / `..` / slash / backslash / NUL segment BEFORE
 * joining means no join can ever escape the dist dir; the caller's post-resolve
 * prefix check is belt-and-braces on top of this.
 */
export function safeRelPath(segments: string[]): string | null {
  if (segments.length === 0) return null
  for (const seg of segments) {
    if (
      !seg ||
      seg === '.' ||
      seg === '..' ||
      seg.includes('\0') ||
      seg.includes('/') ||
      seg.includes('\\')
    ) {
      return null
    }
  }
  const rel = segments.join('/')
  if (!ALLOWED_EXT.has(path.extname(rel).toLowerCase())) return null
  return rel
}

/** Content-Type for a served file, defaulting to a safe binary type. */
export function contentTypeFor(rel: string): string {
  return CONTENT_TYPE[path.extname(rel).toLowerCase()] ?? 'application/octet-stream'
}
