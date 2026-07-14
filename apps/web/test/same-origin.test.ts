import { NextRequest } from 'next/server'
import { describe, it, expect } from 'vitest'
import { assertSameOrigin } from '@/lib/api/route-context'

/**
 * CSRF discipline (SEC-11): mutating requests with a cross-site Origin must be
 * rejected; same-origin browser requests and origin-less non-browser clients
 * pass; GETs are never blocked (and must not mutate).
 */
function req(method: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://app.example.com/api/x', {
    method,
    headers: { host: 'app.example.com', ...headers },
  })
}

describe('assertSameOrigin', () => {
  it('allows same-origin mutations', () => {
    expect(assertSameOrigin(req('POST', { origin: 'http://app.example.com' }))).toBeNull()
  })

  it('rejects cross-origin mutations', () => {
    const res = assertSameOrigin(req('POST', { origin: 'https://evil.example.net' }))
    expect(res?.status).toBe(403)
  })

  it('rejects malformed Origin values', () => {
    const res = assertSameOrigin(req('DELETE', { origin: 'not a url' }))
    expect(res?.status).toBe(403)
  })

  it('allows origin-less (non-browser) mutations', () => {
    expect(assertSameOrigin(req('POST'))).toBeNull()
  })

  it('never blocks reads', () => {
    expect(assertSameOrigin(req('GET', { origin: 'https://evil.example.net' }))).toBeNull()
  })

  it('honors x-forwarded-host over host', () => {
    const r = req('POST', {
      origin: 'https://public.example.org',
      'x-forwarded-host': 'public.example.org',
    })
    expect(assertSameOrigin(r)).toBeNull()
  })
})
