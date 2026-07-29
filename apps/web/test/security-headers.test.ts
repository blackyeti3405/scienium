import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Security headers (SEC2-005): the catch-all header block must ship the
 * clickjacking/injection lockdowns on every route, in both dev and prod, and
 * the dev-only relaxations (`unsafe-eval`) must never leak into production.
 * Asserted against the actual next.config so a config refactor that drops a
 * header fails CI, not a pen test.
 */

type HeaderEntry = { key: string; value: string }
type HeaderRoute = { source: string; headers: HeaderEntry[] }

async function headersFor(nodeEnv: string): Promise<Map<string, string>> {
  vi.stubEnv('NODE_ENV', nodeEnv)
  vi.resetModules()
  const config = (await import('../next.config.mjs')).default as {
    headers(): Promise<HeaderRoute[]>
  }
  const routes = await config.headers()
  const catchAll = routes.find((r) => r.source === '/(.*)')
  expect(catchAll, 'catch-all security header block missing').toBeDefined()
  return new Map(catchAll!.headers.map((h) => [h.key, h.value]))
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('security headers', () => {
  it('ships the full lockdown set in production', async () => {
    const h = await headersFor('production')
    expect(h.get('X-Content-Type-Options')).toBe('nosniff')
    expect(h.get('X-Frame-Options')).toBe('DENY')
    expect(h.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(h.get('Permissions-Policy')).toContain('camera=()')
    expect(h.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
    expect(h.get('Strict-Transport-Security')).toContain('max-age=')

    const csp = h.get('Content-Security-Policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("default-src 'self'")
    // Clerk needs its script + API origins in both modes.
    expect(csp).toContain('clerk.accounts.dev')
    // 'wasm-unsafe-eval' is the intentional NARROW grant (Pyodide WASM); it ships.
    expect(csp).toContain("'wasm-unsafe-eval'")
    // The dangerous STANDALONE 'unsafe-eval' (JS eval, dev-only) must never ship.
    // Matched as a space/semicolon/start-delimited token so 'wasm-unsafe-eval'
    // does NOT false-positive (SEC review FIX 4).
    expect(csp).not.toMatch(/(^|[\s;])'unsafe-eval'/)
    // FIX 1: worker-src is 'self' only — no blob: — so a nested blob-worker
    // fresh realm (the sandbox escape) is CSP-killed at the source.
    expect(csp).toContain("worker-src 'self'")
    expect(csp).not.toMatch(/worker-src[^;]*blob:/)
  })

  it('keeps the lockdowns in development (only unsafe-eval is added, HSTS dropped)', async () => {
    const h = await headersFor('development')
    const csp = h.get('Content-Security-Policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    // The standalone token IS present in dev (React Refresh); assert it as a
    // delimited token, not a substring of 'wasm-unsafe-eval' (SEC review FIX 4).
    expect(csp).toMatch(/(^|[\s;])'unsafe-eval'/) // React Refresh
    expect(h.get('X-Frame-Options')).toBe('DENY')
    expect(h.has('Strict-Transport-Security')).toBe(false)
  })
})
