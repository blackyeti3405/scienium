import 'server-only'
import { createHash, randomUUID } from 'crypto'
import { slugify } from '@/lib/showcase'
import { viewFingerprintSalt } from '@/lib/env'

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
 * A per-day, per-visitor fingerprint that never stores a raw IP. Salted hash of
 * (ip + user-agent + UTC date) so repeated views in a day collapse to one row but
 * the underlying identity isn't recoverable. The salt (`VIEW_FINGERPRINT_SALT`,
 * required ≥16 chars in production, dev-fallback otherwise) is resolved lazily by
 * `viewFingerprintSalt()` in `lib/env.ts` — so it only gates this call, not
 * `makeSlug` or `next build`.
 */
export function viewFingerprint(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${viewFingerprintSalt()}|${ip}|${userAgent}|${day}`).digest('hex').slice(0, 32)
}