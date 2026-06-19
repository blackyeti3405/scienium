import { NextRequest, NextResponse } from 'next/server'
import { z, type ZodType } from 'zod'

/**
 * Request-body validation — OWASP API8:2023 (Mass Assignment) + general input
 * hygiene. Every route that accepts a JSON body parses it through here against a
 * **strict** zod schema, which:
 *   - rejects malformed JSON with a clean 400 (not an unhandled 500),
 *   - enforces types, length caps, and value ranges, and
 *   - rejects unexpected/extra fields (use `z.object({...}).strict()`), so a
 *     client can never smuggle in attributes the handler didn't intend to accept.
 *
 * Returns either the typed `data` or a ready-to-return 400 `error` response —
 * exactly one is non-null.
 *
 *   const { data, error } = await parseJson(req, MySchema)
 *   if (error) return error
 */
export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
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
