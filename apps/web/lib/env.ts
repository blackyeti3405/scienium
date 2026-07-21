import 'server-only'
import { z } from 'zod'

/**
 * Centralized, LAZY server environment access.
 *
 * Each accessor validates ONLY the single variable it returns, memoized on first
 * read — the whole environment is never validated at import time. This mirrors
 * `lib/showcase-server.ts`'s original `viewSalt` pattern so that `next build`
 * (which imports every route module) and any route that doesn't need a given
 * secret never fail just because an unrelated variable is unset. A variable is
 * only required at the moment code actually needs it, and then the error names
 * exactly which var is missing.
 *
 * SERVER-ONLY: never import this from a client component. It reads `process.env`,
 * which is not populated in the browser, and touches server-only secrets.
 */

/**
 * Build a memoized getter that validates one env var against `schema` on first
 * use and throws a precise error if it's missing/invalid.
 */
function lazyEnv(name: string, schema: z.ZodType<string> = z.string().min(1)): () => string {
  let cached: string | undefined
  return () => {
    if (cached !== undefined) return cached
    const parsed = schema.safeParse(process.env[name])
    if (!parsed.success) {
      throw new Error(
        `Invalid or missing server env var ${name}: ${parsed.error.issues[0]?.message ?? 'not set'}`,
      )
    }
    return (cached = parsed.data)
  }
}

function lazyOptionalEnv(
  name: string,
  schema: z.ZodType<string> = z.string().min(1),
): () => string | undefined {
  let initialized = false
  let cached: string | undefined
  return () => {
    if (initialized) return cached
    initialized = true
    const value = process.env[name]
    if (value === undefined || value === '') return undefined
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      throw new Error(`Invalid server env var ${name}: ${parsed.error.issues[0]?.message}`)
    }
    cached = parsed.data
    return cached
  }
}

/**
 * Required server secrets, each resolved lazily + memoized. Call the getter at
 * the point of use (e.g. inside a route handler or a memoized client factory) —
 * never at module top level, or you reintroduce the eager-validation problem.
 */
export const serverEnv = {
  R2_ACCOUNT_ID: lazyEnv('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: lazyEnv('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: lazyEnv('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: lazyEnv('R2_BUCKET_NAME'),
  ANTHROPIC_API_KEY: lazyEnv('ANTHROPIC_API_KEY'),
  FIRECRAWL_API_KEY: lazyEnv('FIRECRAWL_API_KEY'),
  UPSTASH_REDIS_REST_URL: lazyOptionalEnv('UPSTASH_REDIS_REST_URL', z.string().url()),
  UPSTASH_REDIS_REST_TOKEN: lazyOptionalEnv('UPSTASH_REDIS_REST_TOKEN'),
  RATE_LIMIT_IP_HEADER: lazyOptionalEnv('RATE_LIMIT_IP_HEADER'),
  CRON_SECRET: lazyOptionalEnv('CRON_SECRET'),
  RESEND_API_KEY: lazyOptionalEnv('RESEND_API_KEY'),
  NOTIFICATION_EMAIL_FROM: lazyOptionalEnv('NOTIFICATION_EMAIL_FROM'),
  OPENALEX_MAILTO: lazyOptionalEnv('OPENALEX_MAILTO', z.string().email()),
  OPENALEX_API_KEY: lazyOptionalEnv('OPENALEX_API_KEY'),
  S2_API_KEY: lazyOptionalEnv('S2_API_KEY'),
  // Optional free PatentsView Search API key — enables live prior-art results
  // in the Discovery patents lane (keyless mode degrades to a Google Patents
  // search link-out).
  PATENTSVIEW_API_KEY: lazyOptionalEnv('PATENTSVIEW_API_KEY'),
}

/**
 * View-fingerprint salt — special semantics kept from the original `viewSalt`:
 * must be ≥16 chars and is REQUIRED in production (fails closed rather than
 * hashing with a guessable default), but falls back to a clearly-labelled
 * constant in dev so local runs work without it. Memoized on first use.
 */
let cachedSalt: string | undefined
export function viewFingerprintSalt(): string {
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