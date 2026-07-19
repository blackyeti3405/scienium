import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Behavior tests for `assertCron` (lib/cron/auth.ts).
 *
 * The static sweep (cron-guard.test.ts) proves every cron route CALLS the
 * guard; nothing previously proved what the guard DOES. Each case below is a
 * regression that would otherwise ship green:
 *  - unset secret flipping from 503 (locked) to fail-open;
 *  - production accepting a short secret;
 *  - the comparison drifting from constant-time to `===`;
 *  - a wrong/absent bearer sneaking past.
 */

const mockCronSecret = vi.fn<() => string | undefined>()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({
  serverEnv: { CRON_SECRET: () => mockCronSecret() },
}))
const logEvent = vi.fn()
vi.mock('@/lib/observability/log', () => ({
  logEvent: (e: unknown) => logEvent(e),
  requestIdFrom: () => 'req_test',
}))

import { assertCron } from '@/lib/cron/auth'

const SECRET_32 = 'a'.repeat(32)

function cronReq(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/notifications', {
    headers: authorization ? { authorization } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('assertCron', () => {
  it('fails CLOSED (503) when CRON_SECRET is unset — even with a bearer supplied', () => {
    mockCronSecret.mockReturnValue(undefined)
    const res = assertCron(cronReq('Bearer anything'))
    expect(res?.status).toBe(503)
  })

  it('refuses a sub-32-char secret in production (503)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockCronSecret.mockReturnValue('a'.repeat(31))
    const res = assertCron(cronReq(`Bearer ${'a'.repeat(31)}`))
    expect(res?.status).toBe(503)
  })

  it('tolerates a short secret outside production (dev convenience)', () => {
    vi.stubEnv('NODE_ENV', 'test')
    mockCronSecret.mockReturnValue('short')
    expect(assertCron(cronReq('Bearer short'))).toBeNull()
  })

  it('401s a wrong bearer and logs cron.auth_denied', () => {
    mockCronSecret.mockReturnValue(SECRET_32)
    const res = assertCron(cronReq(`Bearer ${'b'.repeat(32)}`))
    expect(res?.status).toBe(401)
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'cron.auth_denied', outcome: 'denied' }),
    )
  })

  it('401s a missing Authorization header', () => {
    mockCronSecret.mockReturnValue(SECRET_32)
    expect(assertCron(cronReq())?.status).toBe(401)
  })

  it('401s a wrong-length guess (the length pre-check path)', () => {
    mockCronSecret.mockReturnValue(SECRET_32)
    expect(assertCron(cronReq('Bearer a'))?.status).toBe(401)
  })

  it('accepts the exact Bearer secret', () => {
    mockCronSecret.mockReturnValue(SECRET_32)
    expect(assertCron(cronReq(`Bearer ${SECRET_32}`))).toBeNull()
  })

  it('rejects the secret without the Bearer prefix', () => {
    mockCronSecret.mockReturnValue(SECRET_32)
    expect(assertCron(cronReq(SECRET_32))?.status).toBe(401)
  })

  // A timing measurement would be flaky; pinning the source is not. If someone
  // "simplifies" the comparison to ===, this fails with a message that says why.
  it('source still uses timingSafeEqual for the comparison', () => {
    const src = readFileSync(join(__dirname, '..', 'lib', 'cron', 'auth.ts'), 'utf8')
    expect(src).toMatch(/timingSafeEqual\s*\(/)
  })
})
