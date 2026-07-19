/**
 * Production environment assertion.
 *
 * Three flags exist so the E2E suite can run the whole app as one user in a few
 * minutes. Each one disables a real production control:
 *
 *   E2E_SKIP_LLM         — `enforceRateLimit` returns null immediately, so ALL
 *                          rate limiting is off (including the paid-tier
 *                          fail-closed cost cap), and paid Claude calls are
 *                          replaced by fixtures.
 *   RATE_LIMIT_ALLOW_MEMORY — opts out of the "refuse paid tiers in production
 *                          without a shared store" guard, letting the per-user
 *                          cost cap silently multiply by instance count.
 *   E2E_MOCK_SOURCES     — external source adapters return fixtures instead of
 *                          real provider data.
 *
 * Until now the only thing preventing their use in production was a code
 * comment saying "never set this in production". That is a convention, not a
 * control: one stray Vercel environment variable removes the cost ceiling with
 * no signal. This turns each of them into a hard startup failure.
 *
 * Deliberately fail-fast and LOUD rather than warn-and-continue: a silent
 * warning in a serverless log is exactly how this would go unnoticed, and the
 * failure mode it guards against is an unbounded bill.
 */

/** Flags that must never be set in a production runtime. */
const FORBIDDEN_IN_PRODUCTION = [
  'E2E_SKIP_LLM',
  'RATE_LIMIT_ALLOW_MEMORY',
  'E2E_MOCK_SOURCES',
] as const

/**
 * Returns the names of test-only flags that are set, or `[]` when clean.
 * Pure and env-injectable so it can be tested without stubbing the process.
 */
export function forbiddenProductionFlags(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return FORBIDDEN_IN_PRODUCTION.filter((name) => {
    const value = env[name]
    return value !== undefined && value !== '' && value !== '0' && value !== 'false'
  })
}

/**
 * Should this runtime be held to the production rule?
 *
 * The subtlety: since v0.29.0 the E2E suite runs against a **production build**
 * (`next build && next start`), so `NODE_ENV === 'production'` is true during
 * tests too — and the tests legitimately need these flags. Keying the guard on
 * `NODE_ENV` alone therefore blocks the test suite from booting at all.
 *
 * The resolution keeps the guarantee where it actually matters:
 *
 *  - **On a real deployment there is NO bypass.** Vercel always sets
 *    `VERCEL_ENV` (`production` | `preview` | `development`) and the E2E harness
 *    never does, so its presence means "a real hosted deploy" and the check is
 *    unconditional. This is precisely the "one stray Vercel env var" scenario
 *    the guard exists for.
 *  - **Off-platform production builds** still enforce, unless `E2E_BUILD=1` —
 *    the flag `package.json`'s `test:e2e` script already sets for its own
 *    prod-build runs. That flag is meaningful only locally; on Vercel the branch
 *    above fires first and ignores it.
 */
function isGuardedRuntime(env: Record<string, string | undefined>): boolean {
  // A real hosted deployment: always guarded, no escape hatch.
  if (env.VERCEL_ENV) return true
  if (env.NODE_ENV !== 'production') return false
  // A local production build driven by the E2E harness is not a deployment.
  return env.E2E_BUILD !== '1'
}

/**
 * Throw when a production runtime carries a test-only flag. Called once from
 * `instrumentation.ts#register`, which Next runs at server start.
 */
export function assertProductionEnvSafe(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isGuardedRuntime(env)) return

  const offenders = forbiddenProductionFlags(env)
  if (offenders.length === 0) return

  throw new Error(
    `Refusing to start: test-only environment ${
      offenders.length === 1 ? 'flag is' : 'flags are'
    } set in production — ${offenders.join(', ')}. ` +
      'These disable rate limiting, the paid-tier cost cap, and/or real provider calls. ' +
      'Remove them from the production environment (they belong only in playwright.config.ts).',
  )
}
