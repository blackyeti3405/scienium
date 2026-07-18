import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'
import { logEvent, requestIdFrom } from '@/lib/observability/log'

/**
 * Rate limiter — OWASP API4:2023 (Unrestricted Resource Consumption).
 *
 * Every authenticated API route runs a check through here so a single account (or
 * IP) can't hammer an endpoint — most importantly the Claude-backed ones, where
 * each call costs real money.
 *
 * BACKENDS (chosen once at module load):
 *   - **MemoryStore** (default): fixed-window counters in module memory. On a
 *     single long-lived Node server this is exactly right and needs no infra. On
 *     multi-instance / serverless hosting each instance keeps its own window, so
 *     the effective ceiling is `limit × instances` and cold starts reset it.
 *   - **UpstashStore**: a shared fixed-window counter in Upstash Redis (REST), so
 *     the limit is enforced **globally** across instances. Activated automatically
 *     when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set — no code
 *     change at any call site.
 *
 * The store interface is the only thing that varies; `enforceRateLimit` and every
 * caller are backend-agnostic. `enforceRateLimit` is async (a network store needs
 * it); the memory path resolves synchronously in practice.
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

// ─── Window record + pluggable store ──────────────────────────────────────────

/** The state of one fixed window after an increment. */
export interface WindowState {
  count: number
  /** Epoch ms when this window resets. */
  resetAt: number
}

/**
 * A counter store. `incr` registers one hit against `key` within a `windowMs`
 * fixed window and returns the resulting count + reset time. Implementations must
 * preserve fixed-window semantics: the first hit opens a window of `windowMs`;
 * subsequent hits in that window increment; once `resetAt` passes, the next hit
 * opens a fresh window.
 */
export interface RateLimitStore {
  incr(key: string, windowMs: number, now: number): Promise<WindowState>
}

/** In-memory fixed-window store. Counters live in module memory, pruned lazily. */
export class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, WindowState>()
  private lastSweep = Date.now()

  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return
    this.lastSweep = now
    for (const [key, b] of this.buckets) {
      if (b.resetAt <= now) this.buckets.delete(key)
    }
  }

  async incr(key: string, windowMs: number, now: number): Promise<WindowState> {
    this.sweep(now)
    const b = this.buckets.get(key)
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs }
      this.buckets.set(key, fresh)
      return fresh
    }
    b.count += 1
    return b
  }
}

/**
 * Shared fixed-window store backed by Upstash Redis over its REST API (no SDK
 * dependency — just `fetch`). One pipelined round trip per check:
 *   INCR key                  → the running count for this window
 *   PEXPIRE key windowMs NX    → set the window TTL only on the first hit
 *   PTTL key                   → remaining ms, to compute `resetAt`
 *
 * Fails OPEN: if Upstash is unreachable we allow the request (a limiter outage
 * shouldn't take the whole API down) but log it. For a hard guarantee under
 * limiter failure, pair with an edge WAF.
 */
export class UpstashStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string,
  ) {}

  async incr(key: string, windowMs: number, now: number): Promise<WindowState> {
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['INCR', key],
          ['PEXPIRE', key, String(windowMs), 'NX'],
          ['PTTL', key],
        ]),
        // Never let the limiter add latency unboundedly.
        signal: AbortSignal.timeout(2_000),
      })
      if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`)
      const out = (await res.json()) as Array<{ result?: number; error?: string }>
      const count = Number(out[0]?.result ?? 1)
      const ttl = Number(out[2]?.result ?? windowMs)
      const resetAt = now + (Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs)
      return { count, resetAt }
    } catch (err) {
      console.error('[rate-limit] Upstash unreachable — failing open:', err)
      // Fail open: treat as the first hit of a fresh window (always allowed).
      return { count: 1, resetAt: now + windowMs }
    }
  }
}

function createStore(): RateLimitStore {
  const url = serverEnv.UPSTASH_REDIS_REST_URL()
  const token = serverEnv.UPSTASH_REDIS_REST_TOKEN()
  if (url && token) return new UpstashStore(url, token)
  return new MemoryStore()
}

// Single store instance for the process lifetime.
const store: RateLimitStore = createStore()

/**
 * Tiers that trigger paid work (Claude calls). On multi-instance/serverless
 * hosting the MemoryStore is per-instance — the "12 AI calls/min/user" ceiling
 * silently becomes `12 × instances` and resets on every cold start, i.e. the
 * cost cap isn't enforced at all. Rather than ship an unbounded ceiling to
 * production, these tiers fail CLOSED (503) when no shared store is configured.
 * Set `RATE_LIMIT_ALLOW_MEMORY=1` to opt out on a single long-lived Node server,
 * where per-instance memory IS the correct global store.
 */
const PAID_TIERS: ReadonlySet<TierName> = new Set(['ai', 'upload'])

function paidTierMisconfigured(tierName: TierName): boolean {
  return (
    PAID_TIERS.has(tierName) &&
    process.env.NODE_ENV === 'production' &&
    !(store instanceof UpstashStore) &&
    process.env.RATE_LIMIT_ALLOW_MEMORY !== '1'
  )
}

/**
 * The per-IP ceiling is this multiple of the per-user limit. scienium teams are
 * often a whole classroom or library behind a single NAT IP, so a flat per-IP
 * cap at the per-user limit would lock out legitimate shared-network users. The
 * **per-user** bucket is the precise control; the per-IP bucket is only a coarse
 * backstop against one host hammering the API, generous enough to fit a room of
 * students.
 */
const IP_LIMIT_MULTIPLIER = 12

interface HitResult {
  ok: boolean
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfter: number
}

async function hit(key: string, tier: RateLimitTier, now: number): Promise<HitResult> {
  const { count, resetAt } = await store.incr(key, tier.windowMs, now)
  if (count > tier.limit) {
    return { ok: false, retryAfter: Math.ceil((resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

/**
 * Best-effort client IP, resolved from the most trustworthy header first.
 *
 * `x-forwarded-for` is client-settable and therefore spoofable end-to-end, which
 * lets a single host mint unlimited per-IP buckets on anonymous routes. We prefer
 * headers the *edge* sets and a client cannot override:
 *   1. a configured trusted header (`RATE_LIMIT_IP_HEADER`), if set;
 *   2. Cloudflare's `cf-connecting-ip` (overwritten by CF on every request);
 *   3. `x-real-ip` (set by most reverse proxies);
 *   4. the first `x-forwarded-for` hop (least trusted — used only as a fallback).
 * Falls back to a constant so a missing header degrades to a shared (still
 * limited) bucket rather than throwing.
 */
export function clientIp(req: NextRequest): string {
  const configured = serverEnv.RATE_LIMIT_IP_HEADER()
  if (configured) {
    const v = req.headers.get(configured)
    if (v) return v.split(',')[0]!.trim()
  }
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return 'unknown'
}

/**
 * Enforce a rate-limit tier for a request. Returns a ready-to-return graceful
 * 429 (`Retry-After` set) when the caller is over the limit, or `null` to
 * proceed. Counts **both** a per-IP and (when signed in) a per-user bucket, so
 * neither a single account nor a single host can exceed the tier — the stricter
 * of the two wins.
 *
 * @example
 *   const limited = await enforceRateLimit(req, 'ai', userId)
 *   if (limited) return limited
 */
export async function enforceRateLimit(
  req: NextRequest,
  tierName: TierName,
  userId?: string | null,
): Promise<NextResponse | null> {
  // E2E bypass: the Playwright suite runs the whole app as ONE user in a few
  // minutes, so real per-user tiers would 429 mid-run. `E2E_SKIP_LLM` is set ONLY
  // by playwright.config.ts (never in a dev server or production — same flag that
  // stubs paid Claude calls), so this can't relax limits anywhere real. No spec
  // asserts a live rate-limit 429; F11-quiz-retry only tolerates one.
  if (process.env.E2E_SKIP_LLM === '1') return null

  // Cost-cap guard: refuse paid tiers in production without a shared store
  // (see PAID_TIERS). Surfaces the misconfiguration loudly instead of quietly
  // multiplying the per-student LLM budget by the instance count.
  if (paidTierMisconfigured(tierName)) {
    logEvent({
      event: 'rate_limit.misconfigured',
      route: req.nextUrl.pathname,
      requestId: requestIdFrom(req),
      tier: tierName,
      outcome: 'error',
      detail:
        'paid tier blocked: no shared rate-limit store in production. ' +
        'Set UPSTASH_REDIS_REST_URL/TOKEN (or RATE_LIMIT_ALLOW_MEMORY=1 on single-instance hosts).',
    })
    return NextResponse.json(
      { error: 'This feature is temporarily unavailable. Please tell your teacher.' },
      { status: 503 },
    )
  }

  const tier = RATE_LIMITS[tierName]
  const now = Date.now()

  // Per-IP backstop is intentionally generous (see IP_LIMIT_MULTIPLIER); the
  // per-user bucket carries the real limit when the caller is authenticated.
  const ipTier: RateLimitTier = { limit: tier.limit * IP_LIMIT_MULTIPLIER, windowMs: tier.windowMs }
  const checks = await Promise.all([
    hit(`${tierName}:ip:${clientIp(req)}`, ipTier, now),
    ...(userId ? [hit(`${tierName}:user:${userId}`, tier, now)] : []),
  ])

  const blocked = checks.find((c) => !c.ok)
  if (!blocked) return null

  logEvent({
    event: 'rate_limit.denied',
    route: req.nextUrl.pathname,
    requestId: requestIdFrom(req),
    tier: tierName,
    userId: userId ?? null,
    outcome: 'denied',
  })

  return NextResponse.json(
    { error: 'Too many requests — please slow down and try again in a moment.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, blocked.retryAfter)) } },
  )
}