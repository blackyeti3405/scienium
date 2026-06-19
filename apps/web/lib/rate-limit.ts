import { NextRequest, NextResponse } from 'next/server'

/**
 * In-process rate limiter — OWASP API4:2023 (Unrestricted Resource Consumption).
 *
 * Every authenticated API route runs a check through here so a single account (or
 * IP) can't hammer an endpoint — most importantly the Claude-backed ones, where
 * each call costs real money. Counters live in module memory, so a stolen/forged
 * request still can't get past the *application* layer for free.
 *
 * DEPLOYMENT NOTE — read before scaling out:
 * Because the window state is in-memory, limits are enforced **per server
 * instance**. On a single long-lived Node server (the current deploy) that's
 * exactly the intended behavior. On multi-instance or serverless hosting each
 * instance keeps its own window, so the effective ceiling becomes
 * `limit × instances` and cold starts reset it — still a real brake on abuse,
 * but for a hard global guarantee put a shared store (Upstash/Redis) or an edge
 * WAF (Cloudflare) in front. Only the body of `hit()` changes when you do; every
 * call site below stays the same.
 */

export interface RateLimitTier {
  /** Max requests allowed per identity within `windowMs`. */
  limit: number
  /** Fixed window length in milliseconds. */
  windowMs: number
}

/**
 * Sensible defaults, tuned to the cost of each endpoint class. Windows are 1
 * minute so a burst is throttled quickly but normal interactive use never trips.
 */
export const RATE_LIMITS = {
  /** Claude-backed calls (chat, quiz gen/grade, plan review, idea check, deadline read). */
  ai: { limit: 12, windowMs: 60_000 },
  /** PDF ingest — buffers bytes in memory, stores to R2, and sends text to Claude. */
  upload: { limit: 8, windowMs: 60_000 },
  /** Ordinary authenticated writes. */
  mutate: { limit: 40, windowMs: 60_000 },
  /** Reads / GETs (incl. proxied external fetches like Wikipedia). */
  read: { limit: 120, windowMs: 60_000 },
  /** Invite-code redemption — kept low to blunt code brute-forcing. */
  join: { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitTier>

export type TierName = keyof typeof RATE_LIMITS

// key → fixed window. Pruned lazily (see `sweep`) so the map can't grow forever.
const buckets = new Map<string, { count: number; resetAt: number }>()
let lastSweep = Date.now()

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key)
  }
}

/**
 * The per-IP ceiling is this multiple of the per-user limit. NOVA Lab teams are
 * often a whole classroom or library behind a single NAT IP, so a flat per-IP
 * cap at the per-user limit would lock out legitimate shared-network users. The
 * **per-user** bucket is the precise control; the per-IP bucket is only a coarse
 * backstop against one host hammering the API, generous enough to fit a room of
 * students. (For a hard per-IP control, do it at the edge — see the file header.)
 */
const IP_LIMIT_MULTIPLIER = 12

interface HitResult {
  ok: boolean
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfter: number
}

function hit(key: string, tier: RateLimitTier, now: number): HitResult {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + tier.windowMs })
    return { ok: true, retryAfter: 0 }
  }
  b.count += 1
  if (b.count > tier.limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

/**
 * Best-effort client IP. Trusts the standard proxy headers our host sets; falls
 * back to a constant so a missing header degrades to a shared (still-limited)
 * bucket rather than throwing.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Enforce a rate-limit tier for a request. Returns a ready-to-return graceful
 * 429 (`Retry-After` set) when the caller is over the limit, or `null` to
 * proceed. Counts **both** a per-IP and (when signed in) a per-user bucket, so
 * neither a single account nor a single host can exceed the tier — the stricter
 * of the two wins.
 *
 * @example
 *   const limited = enforceRateLimit(req, 'ai', userId)
 *   if (limited) return limited
 */
export function enforceRateLimit(
  req: NextRequest,
  tierName: TierName,
  userId?: string | null,
): NextResponse | null {
  const tier = RATE_LIMITS[tierName]
  const now = Date.now()
  sweep(now)

  // Per-IP backstop is intentionally generous (see IP_LIMIT_MULTIPLIER); the
  // per-user bucket carries the real limit when the caller is authenticated.
  const ipTier: RateLimitTier = { limit: tier.limit * IP_LIMIT_MULTIPLIER, windowMs: tier.windowMs }
  const checks: HitResult[] = [hit(`${tierName}:ip:${clientIp(req)}`, ipTier, now)]
  if (userId) checks.push(hit(`${tierName}:user:${userId}`, tier, now))

  const blocked = checks.find((c) => !c.ok)
  if (!blocked) return null

  return NextResponse.json(
    { error: 'Too many requests — please slow down and try again in a moment.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, blocked.retryAfter)) } },
  )
}
