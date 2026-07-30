import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Paid tiers must fail CLOSED in production without a shared limiter store
 * (PILOT-2): on serverless hosting a per-instance MemoryStore silently
 * multiplies the per-student LLM budget by the instance count, so the `ai` and
 * `upload` tiers refuse (503) rather than run unbounded. Free tiers keep
 * working, and `RATE_LIMIT_ALLOW_MEMORY=1` opts a single-instance host out.
 *
 * The store is chosen at module load, so each case stubs the env and imports a
 * fresh copy of the module.
 */

function req(): NextRequest {
  return new NextRequest('http://app.example.com/api/x', {
    headers: { 'x-real-ip': '10.0.0.1' },
  })
}

async function freshEnforce(env: Record<string, string>) {
  vi.resetModules()
  // Force the MemoryStore and clear bypasses regardless of the host machine.
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  vi.stubEnv('E2E_SKIP_LLM', '')
  vi.stubEnv('RATE_LIMIT_ALLOW_MEMORY', '')
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const mod = await import('@/lib/rate-limit')
  return mod.enforceRateLimit
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('paid-tier fail-closed misconfiguration guard', () => {
  it("blocks the 'ai' tier with 503 in production without a shared store", async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'production' })
    const res = await enforce(req(), 'ai', 'user_1')
    expect(res?.status).toBe(503)
  })

  it("blocks the 'upload' tier with 503 in production without a shared store", async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'production' })
    const res = await enforce(req(), 'upload', 'user_1')
    expect(res?.status).toBe(503)
  })

  it('free tiers still work in production on the MemoryStore', async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'production' })
    expect(await enforce(req(), 'read', 'user_1')).toBeNull()
    expect(await enforce(req(), 'mutate', 'user_1')).toBeNull()
  })

  it('RATE_LIMIT_ALLOW_MEMORY=1 opts a single-instance host out', async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'production', RATE_LIMIT_ALLOW_MEMORY: '1' })
    expect(await enforce(req(), 'ai', 'user_1')).toBeNull()
  })

  it('paid tiers are not blocked outside production', async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'test' })
    expect(await enforce(req(), 'ai', 'user_1')).toBeNull()
  })

  it('still returns a real 429 once a paid tier is over its limit', async () => {
    const enforce = await freshEnforce({ NODE_ENV: 'test' })
    // The 'ai' tier allows 12/min per user; the 13th call must be denied.
    let last: Response | null = null
    for (let i = 0; i < 13; i++) last = await enforce(req(), 'ai', 'user_burst')
    expect(last?.status).toBe(429)
    expect(last?.headers.get('Retry-After')).toBeTruthy()
  })
})
