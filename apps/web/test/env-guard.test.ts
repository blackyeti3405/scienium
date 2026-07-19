import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertProductionEnvSafe, forbiddenProductionFlags } from '@/lib/env-guard'

/**
 * The production environment guard. Three E2E flags each disable a real control
 * (`E2E_SKIP_LLM` turns off ALL rate limiting including the paid cost cap), and
 * before v0.29.3 the only thing preventing their use in production was a code
 * comment. These tests pin that the guard is hard, not advisory.
 */

const PROD = { NODE_ENV: 'production' }

describe('forbiddenProductionFlags', () => {
  it('reports nothing for a clean environment', () => {
    expect(forbiddenProductionFlags({})).toEqual([])
  })

  it.each(['E2E_SKIP_LLM', 'RATE_LIMIT_ALLOW_MEMORY', 'E2E_MOCK_SOURCES'])(
    'reports %s when set to 1',
    (flag) => {
      expect(forbiddenProductionFlags({ [flag]: '1' })).toEqual([flag])
    },
  )

  it('treats empty, "0", and "false" as unset (so a blank Vercel var is not fatal)', () => {
    expect(forbiddenProductionFlags({ E2E_SKIP_LLM: '' })).toEqual([])
    expect(forbiddenProductionFlags({ E2E_SKIP_LLM: '0' })).toEqual([])
    expect(forbiddenProductionFlags({ E2E_SKIP_LLM: 'false' })).toEqual([])
  })

  it('reports every offender, not just the first', () => {
    expect(
      forbiddenProductionFlags({ E2E_SKIP_LLM: '1', E2E_MOCK_SOURCES: '1' }),
    ).toEqual(['E2E_SKIP_LLM', 'E2E_MOCK_SOURCES'])
  })
})

describe('assertProductionEnvSafe', () => {
  it('THROWS in production when a test-only flag is set', () => {
    expect(() => assertProductionEnvSafe({ ...PROD, E2E_SKIP_LLM: '1' })).toThrow(
      /Refusing to start/,
    )
  })

  it('names the offending flag so the fix is obvious from the log line', () => {
    expect(() => assertProductionEnvSafe({ ...PROD, RATE_LIMIT_ALLOW_MEMORY: '1' })).toThrow(
      /RATE_LIMIT_ALLOW_MEMORY/,
    )
  })

  it('passes in production when the environment is clean', () => {
    expect(() => assertProductionEnvSafe(PROD)).not.toThrow()
  })

  it('never blocks a non-production runtime — E2E depends on these flags', () => {
    expect(() => assertProductionEnvSafe({ NODE_ENV: 'test', E2E_SKIP_LLM: '1' })).not.toThrow()
    expect(() =>
      assertProductionEnvSafe({ NODE_ENV: 'development', E2E_SKIP_LLM: '1' }),
    ).not.toThrow()
  })
})

describe('the local prod-build E2E carve-out does NOT weaken a real deployment', () => {
  // Since v0.29.0 the E2E suite runs a PRODUCTION BUILD, so NODE_ENV is
  // 'production' during tests while the flags are legitimately set. The carve-out
  // exists for exactly that case — and must not extend to a hosted deploy.
  it('allows a local prod-build E2E run (E2E_BUILD=1, no VERCEL_ENV)', () => {
    expect(() =>
      assertProductionEnvSafe({ ...PROD, E2E_BUILD: '1', E2E_SKIP_LLM: '1' }),
    ).not.toThrow()
  })

  it('still blocks an off-platform production server without E2E_BUILD', () => {
    expect(() => assertProductionEnvSafe({ ...PROD, E2E_SKIP_LLM: '1' })).toThrow()
  })

  it('THERE IS NO BYPASS ON A REAL DEPLOY: E2E_BUILD cannot rescue VERCEL_ENV', () => {
    // The exact attack the guard exists for — someone sets the flags (and even
    // the carve-out) in the Vercel environment.
    expect(() =>
      assertProductionEnvSafe({ VERCEL_ENV: 'production', E2E_BUILD: '1', E2E_SKIP_LLM: '1' }),
    ).toThrow(/Refusing to start/)
  })

  it('guards Vercel preview deployments too — they are real and internet-reachable', () => {
    expect(() =>
      assertProductionEnvSafe({ VERCEL_ENV: 'preview', E2E_SKIP_LLM: '1' }),
    ).toThrow()
  })

  it('a clean Vercel production environment boots normally', () => {
    expect(() => assertProductionEnvSafe({ VERCEL_ENV: 'production', ...PROD })).not.toThrow()
  })
})

describe('the guard is actually wired into server startup', () => {
  // A perfect guard nobody calls is worth nothing. `instrumentation.ts#register`
  // is the one hook Next runs at server start.
  it('instrumentation.ts calls assertProductionEnvSafe', () => {
    const src = readFileSync(join(__dirname, '..', 'instrumentation.ts'), 'utf8')
    expect(src).toMatch(/assertProductionEnvSafe\s*\(/)
  })

  it('every flag the guard covers is one the code actually honours at runtime', () => {
    // If a flag were renamed in the app but not here, the guard would silently
    // protect nothing.
    const rateLimit = readFileSync(join(__dirname, '..', 'lib', 'rate-limit.ts'), 'utf8')
    expect(rateLimit).toMatch(/E2E_SKIP_LLM/)
    expect(rateLimit).toMatch(/RATE_LIMIT_ALLOW_MEMORY/)
  })
})
