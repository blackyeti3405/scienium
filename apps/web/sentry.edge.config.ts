import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry init (middleware and any edge routes) — loaded via
// instrumentation.ts. Same privacy posture as the node config.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
})
