import * as Sentry from '@sentry/nextjs'

// Node-runtime Sentry init (loaded via instrumentation.ts). Same deliberate
// deviations as instrumentation-client.ts: no `dataCollection` object (keeps
// the conservative no-PII default), DSN-gated, and NO `includeLocalVariables`
// — stack-frame locals could capture student submissions/paper text, which
// this repo's observability rules forbid (see lib/observability/log.ts).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
})
