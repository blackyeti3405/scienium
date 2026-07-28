import { NextRequest, NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'

/**
 * Infrastructure byte ceiling for JSON request bodies (REFACTOR2 P2-S8).
 *
 * This is NOT a semantic cap and does not replace one. Zod's `.max()` runs on an
 * object `req.json()` has already fully materialized, so the strictest schema in
 * the app still buffers and parses whatever was sent before rejecting it — a
 * `{ name: max(10) }` route would allocate 50 MB to answer 400. The ceiling
 * below is the allocation guard that has to run FIRST; the zod caps stay exactly
 * as they are and keep doing the semantic work afterwards.
 *
 * 256 KiB is chosen against the app's own bodies, not a round number: the
 * largest ordinary payload (an expertise-exam PATCH, 30 answers × 5 000 chars)
 * is ~150 KB, and everything else is single-digit KB. The two genuinely large
 * routes raise it explicitly — see `maxBytes` below and its two call sites
 * (`/api/research-plan`, `/api/discovery/tree`). Keeping the default tight is
 * the point: an override is a deliberate, reviewable line in a route.
 */
export const MAX_BODY_BYTES = 256 * 1024

export interface ParseJsonOptions {
  /**
   * Raise the ceiling for a route that legitimately accepts a large body.
   * Overrides are for RAISING — a value below the route's own zod caps turns a
   * useful 400 into an opaque 413.
   */
  maxBytes?: number
}

/**
 * Read the body with a hard byte budget, refusing before allocation.
 *
 * Two gates, because either alone is bypassable:
 *   1. a declared `Content-Length` over budget is rejected without touching the
 *      stream at all — the cheap, common case;
 *   2. the stream is then read chunk-by-chunk against a running total, because
 *      `Content-Length` is client-supplied and chunked uploads omit it. The
 *      reader is cancelled the moment the budget is exceeded, so the peak
 *      allocation is one chunk past the ceiling, not the whole upload.
 *
 * Returns `null` when the body is over budget.
 */
async function readBoundedBody(req: NextRequest, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null

  const stream = req.body
  // No stream (an already-buffered body, as several tests and some runtimes
  // produce): `text()` is the only way in, but Content-Length above has already
  // been checked and `req.text()` is bounded by the platform's own limits.
  if (!stream) {
    const text = await req.text()
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text
  }

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let out = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return null
      }
      out += decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
  return out + decoder.decode()
}

/**
 * Request-body validation — OWASP API8:2023 (Mass Assignment) + general input
 * hygiene. Every route that accepts a JSON body parses it through here against a
 * **strict** zod schema, which:
 *   - refuses an over-ceiling body with 413 BEFORE parsing (see MAX_BODY_BYTES),
 *   - rejects malformed JSON with a clean 400 (not an unhandled 500),
 *   - enforces types, length caps, and value ranges, and
 *   - rejects unexpected/extra fields (use `z.object({...}).strict()`), so a
 *     client can never smuggle in attributes the handler didn't intend to accept.
 *
 * Returns either the typed `data` or a ready-to-return error response —
 * exactly one is non-null.
 *
 *   const { data, error } = await parseJson(req, MySchema)
 *   if (error) return error
 */
export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
  opts?: ParseJsonOptions,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const body = await readBoundedBody(req, opts?.maxBytes ?? MAX_BODY_BYTES)
  if (body === null) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
    }
  }

  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return { data: null, error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    // Surface the first issue with its field path so the message is actionable
    // (e.g. "code: Required") without dumping the whole zod error tree.
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.')
    const message = issue ? `${path ? `${path}: ` : ''}${issue.message}` : 'Invalid request body'
    return { data: null, error: NextResponse.json({ error: message }, { status: 400 }) }
  }

  return { data: parsed.data, error: null }
}

// ─── Shared field schemas (kept here so length caps stay consistent) ───────────

/** A US ZIP (5-digit or ZIP+4). Shape only — state mapping is validated in-route. */
export const zipString = z
  .string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US ZIP code')

/** Required free text, trimmed, 1..max chars. Use for every user-typed string. */
export const boundedText = (max: number) => z.string().trim().min(1).max(max)

/** Optional free text, trimmed, 0..max chars. */
export const optionalBoundedText = (max: number) => z.string().trim().max(max).optional()

/** A Prisma cuid id — the only shape our row ids take. Rejects raw SQL/UUID noise. */
export const cuid = z.string().cuid()

// NOTE: a shared `httpUrl` schema used to live here but had ZERO consumers —
// URL-accepting routes validate downstream against their own stricter shapes
// (`parseVideoUrl` for showcase links, `fetchGoogleDocText` for plan docs,
// `isSafeHttpUrl` in lib/showcase.ts for generic links). It was deleted rather
// than kept: a dead "safe URL" helper invites someone to assume it is the one
// being enforced. If a route ever needs a generic http(s) gate, reuse
// `isSafeHttpUrl` — it is tested.
