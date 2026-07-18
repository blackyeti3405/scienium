import * as Sentry from '@sentry/nextjs'

// Next.js server-side instrumentation hook: dispatches the per-runtime Sentry
// init. The client runtime loads instrumentation-client.ts directly.
export async function register() {
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
