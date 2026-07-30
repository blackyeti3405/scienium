import * as Sentry from '@sentry/nextjs'
import { assertProductionEnvSafe } from './lib/env-guard'

// Next.js server-side instrumentation hook: dispatches the per-runtime Sentry
// init. The client runtime loads instrumentation-client.ts directly.
export async function register() {
  // Refuse to boot a production server carrying a test-only flag (E2E_SKIP_LLM
  // et al). Each of those disables rate limiting and/or the paid-tier cost cap,
  // and until this guard existed the only thing stopping their use in
  // production was a code comment. Runs FIRST so the failure is unmissable.
  assertProductionEnvSafe()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Captures EVERY unhandled server-side request error (route handlers, server
// components, server actions) — the integration point that makes route-level
// try/catch for reporting unnecessary.
export const onRequestError = Sentry.captureRequestError
