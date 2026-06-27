import { createHash, randomUUID } from 'crypto'
import { slugify } from '@/lib/showcase'

/**
 * Server-only showcase helpers that depend on Node's `crypto`. Kept apart from
 * lib/showcase.ts (which client components import for config/types) so `crypto`
 * never lands in the browser bundle.
 */

/** A slug guaranteed unique by appending a short random suffix. */
export function makeSlug(title: string): string {
  return `${slugify(title)}-${randomUUID().slice(0, 6)}`
}

/**
 * Dedicated salt for view fingerprinting — resolved + memoized on first use.
 *
 * Previously this reused `R2_SECRET_ACCESS_KEY` (a storage credential) with a
 * hardcoded `'scienium'` fallback. That widened a storage secret's blast radius
 * into an unrelated code path and silently changed all fingerprints whenever R2
 * keys rotated. Now it has its own `VIEW_FINGERPRINT_SALT` and fails closed in
 * production: a missing/weak salt makes the view-tracking path throw rather than
 * hash with a guessable default. Resolved lazily (not at import) so it only gates
 * the fingerprint call — `makeSlug` and `next build` are unaffected. Local/dev
 * falls back to a clearly-labelled constant so the app still runs.
 */
let cachedSalt: string | undefined
function viewSalt(): string {
  if (cachedSalt !== undefined) return cachedSalt
  const fromEnv = process.env.VIEW_FINGERPRINT_SALT
  if (fromEnv && fromEnv.length >= 16) return (cachedSalt = fromEnv)
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'VIEW_FINGERPRINT_SALT is required in production (>=16 chars) — set it in the environment.',
    )
  }
  return (cachedSalt = 'dev-only-view-fingerprint-salt')
}

/**
 * A per-day, per-visitor fingerprint that never stores a raw IP. Salted hash of
 * (ip + user-agent + UTC date) so repeated views in a day collapse to one row but
 * the underlying identity isn't recoverable.
 */
export function viewFingerprint(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${viewSalt()}|${ip}|${userAgent}|${day}`).digest('hex').slice(0, 32)
}
