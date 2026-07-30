import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import path from 'node:path'
import { requireTeamContext } from '@/lib/api/route-context'
import { getObjectStream } from '@/lib/storage'
import { PYODIDE_VERSION } from '@/lib/data-terminal/runtime/version.mjs'
import { safeRelPath, contentTypeFor } from '@/lib/data-terminal/runtime/proxy-path'

/**
 * Same-origin proxy for the Pyodide runtime files (wasm, stdlib, wheels).
 *
 * This is what keeps the CSP at `'self'`: the Code lane fetches every runtime
 * asset from here instead of a CDN, so no `connect-src`/`script-src` host is
 * added and the school-firewall failure mode of jsDelivr is avoided.
 *
 * It is a trust boundary, so it is strict:
 *  - GET only, and it requires an authenticated team member (`read` tier). It
 *    does NOT gate on the `data_terminal` feature — the runtime may need to load
 *    during setup, before the phase gate opens.
 *  - The `[...path]` is sanitised against traversal and clamped to a small
 *    extension allow-list; anything else is a 404, never a file read.
 *
 * Source: the extracted dist in dev (`.pyodide-cache/pyodide/`), or R2 in prod
 * (`pyodide/<version>/…`), chosen by `PYODIDE_SOURCE` and defaulting to whichever
 * is actually present. Assets are content-pinned by version → cached immutably.
 *
 * See docs/SPEC.md §7.6 (Data Terminal).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIST_DIR = path.join(process.cwd(), '.pyodide-cache', 'pyodide')
const SOURCE: 'local' | 'r2' =
  process.env.PYODIDE_SOURCE === 'local' || process.env.PYODIDE_SOURCE === 'r2'
    ? process.env.PYODIDE_SOURCE
    : existsSync(DIST_DIR)
      ? 'local'
      : 'r2'

const IMMUTABLE = 'public, max-age=31536000, immutable'

function headers(rel: string, contentLength?: number): Headers {
  const h = new Headers({
    'Content-Type': contentTypeFor(rel),
    'Cache-Control': IMMUTABLE,
    'X-Content-Type-Options': 'nosniff',
  })
  if (contentLength !== undefined) h.set('Content-Length', String(contentLength))
  return h
}

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const { error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const { path: segments } = await props.params
  const rel = safeRelPath(segments)
  if (!rel) return new NextResponse('Not found', { status: 404 })

  if (SOURCE === 'r2') {
    try {
      const { body, contentLength } = await getObjectStream(`pyodide/${PYODIDE_VERSION}/${rel}`)
      return new NextResponse(body, { status: 200, headers: headers(rel, contentLength) })
    } catch {
      return new NextResponse('Not found', { status: 404 })
    }
  }

  // Local: resolve, then verify the result is still inside the dist dir.
  const full = path.resolve(DIST_DIR, rel)
  if (full !== DIST_DIR && !full.startsWith(DIST_DIR + path.sep)) {
    return new NextResponse('Not found', { status: 404 })
  }
  let size: number
  try {
    const s = await stat(full)
    if (!s.isFile()) return new NextResponse('Not found', { status: 404 })
    size = s.size
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
  const webStream = Readable.toWeb(createReadStream(full)) as unknown as ReadableStream
  return new NextResponse(webStream, { status: 200, headers: headers(rel, size) })
}
