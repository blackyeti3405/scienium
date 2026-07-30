import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { clientIp, enforceRateLimit, MemoryStore, RateLimitStoreError, UpstashStore, RATE_LIMITS } from '@/lib/rate-limit'

function reqWith(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/x', { headers })
}

// Unique identities per test keep the module-singleton store buckets isolated.
let n = 0
const freshIp = () => `10.0.0.${n++}`
const freshUser = () => `user-${n++}`

describe('clientIp — trusted-header precedence', () => {
  it('prefers a configured header over everything', () => {
    const prev = process.env.RATE_LIMIT_IP_HEADER
    process.env.RATE_LIMIT_IP_HEADER = 'true-client-ip'
    try {
      const ip = clientIp(
        reqWith({ 'true-client-ip': '9.9.9.9', 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }),
      )
      expect(ip).toBe('9.9.9.9')
    } finally {
      if (prev === undefined) delete process.env.RATE_LIMIT_IP_HEADER
      else process.env.RATE_LIMIT_IP_HEADER = prev
    }
  })

  it('prefers cf-connecting-ip over x-real-ip and spoofable XFF', () => {
    const ip = clientIp(
      reqWith({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '2.2.2.2, 4.4.4.4' }),
    )
    expect(ip).toBe('1.1.1.1')
  })

  it('falls back to x-real-ip, then first XFF hop, then unknown', () => {
    expect(clientIp(reqWith({ 'x-real-ip': '3.3.3.3', 'x-forwarded-for': '2.2.2.2' }))).toBe('3.3.3.3')
    expect(clientIp(reqWith({ 'x-forwarded-for': '2.2.2.2, 4.4.4.4' }))).toBe('2.2.2.2')
    expect(clientIp(reqWith({}))).toBe('unknown')
  })
})

describe('enforceRateLimit — per-user fixed window', () => {
  it('allows up to the tier limit, then 429s with Retry-After', async () => {
    const ip = freshIp()
    const user = freshUser()
    const limit = RATE_LIMITS.ai.limit
    for (let i = 0; i < limit; i++) {
      const r = await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'ai', user)
      expect(r).toBeNull()
    }
    const blocked = await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'ai', user)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    const retry = Number(blocked!.headers.get('Retry-After'))
    expect(retry).toBeGreaterThanOrEqual(1)
    expect(retry).toBeLessThanOrEqual(60)
  })

  it('separate users on the same IP have independent buckets', async () => {
    const ip = freshIp()
    const a = freshUser()
    const b = freshUser()
    for (let i = 0; i < RATE_LIMITS.join.limit; i++) {
      expect(await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'join', a)).toBeNull()
    }
    // a is now exhausted; b is untouched and still allowed.
    expect(await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'join', a)).not.toBeNull()
    expect(await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'join', b)).toBeNull()
  })

  it('anonymous requests are still capped by the per-IP backstop', async () => {
    const ip = freshIp()
    const ipLimit = RATE_LIMITS.join.limit * 12
    for (let i = 0; i < ipLimit; i++) {
      expect(await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'join', null)).toBeNull()
    }
    expect(await enforceRateLimit(reqWith({ 'x-real-ip': ip }), 'join', null)).not.toBeNull()
  })
})

describe('MemoryStore — fixed-window semantics', () => {
  it('increments within a window and resets after it elapses', async () => {
    const s = new MemoryStore()
    const t0 = 1_000_000
    expect(await s.incr('k', 60_000, t0)).toMatchObject({ count: 1, resetAt: t0 + 60_000 })
    expect(await s.incr('k', 60_000, t0 + 100)).toMatchObject({ count: 2 })
    // After resetAt passes, the next hit opens a fresh window.
    const after = await s.incr('k', 60_000, t0 + 60_001)
    expect(after.count).toBe(1)
    expect(after.resetAt).toBe(t0 + 60_001 + 60_000)
  })
})

describe('UpstashStore — REST pipeline + degraded-store policy (P1-R4)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const store = () => new UpstashStore('https://example.upstash.io', 'tok')

  it('parses INCR count and computes resetAt from PTTL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([{ result: 3 }, { result: 0 }, { result: 42_000 }]), { status: 200 }),
      ),
    )
    const now = 5_000
    expect(await store().incr('k', 60_000, now)).toEqual({ count: 3, resetAt: now + 42_000 })
  })

  // The old store swallowed every one of these into `count: 1` — "first hit of
  // a fresh window", i.e. always allowed. It must surface instead so the caller
  // can decide per tier.
  it('throws when Upstash is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    await expect(store().incr('k', 60_000, 0)).rejects.toBeInstanceOf(RateLimitStoreError)
  })

  it('throws on a non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    await expect(store().incr('k', 30_000, 0)).rejects.toBeInstanceOf(RateLimitStoreError)
  })

  it('throws on an HTTP-200 pipeline element error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([{ error: 'ERR wrong type' }, { result: 1 }, { result: 1 }]), { status: 200 }),
    ))
    await expect(store().incr('k', 30_000, 0)).rejects.toBeInstanceOf(RateLimitStoreError)
  })

  it('throws on a non-numeric INCR result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([{ result: 'OK' }, { result: 1 }, { result: 1 }]), { status: 200 }),
    ))
    await expect(store().incr('k', 30_000, 0)).rejects.toBeInstanceOf(RateLimitStoreError)
  })
})

describe('enforceRateLimit — degraded store fails closed only for paid tiers', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

  async function withBrokenUpstash(tier: 'ai' | 'read') {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'tok')
    vi.stubEnv('E2E_SKIP_LLM', '')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    vi.resetModules()
    const mod = await import('@/lib/rate-limit')
    return mod.enforceRateLimit(reqWith({ 'x-real-ip': freshIp() }), tier, freshUser())
  }

  it('503s a paid tier rather than handing out a free Anthropic call', async () => {
    const res = await withBrokenUpstash('ai')
    expect(res?.status).toBe(503)
  })

  it('lets a read through — no money at stake', async () => {
    expect(await withBrokenUpstash('read')).toBeNull()
  })
})
