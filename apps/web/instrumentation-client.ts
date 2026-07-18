import * as Sentry from '@sentry/nextjs'

// Browser-runtime Sentry init (see docs/runbooks/incident-response.md and the
// sentry-instrument skill's Next.js reference). Deviations from the SDK
// template are deliberate, per this repo's minors-privacy rules:
//  - NO Session Replay (screen-records students) — integration omitted.
//  - NO `dataCollection` object: omitting it keeps the SDK's conservative
//    default (sendDefaultPii=false — no user info, cookies, or bodies);
//    passing even `{}` would flip unset categories to permissive.
//  - `enabled` only when a DSN is configured, so dev-without-DSN and E2E runs
//    are true no-ops.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,

  // Errors + tracing is the SDK's recommended baseline: 100% in dev, 10% prod.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  integrations: [
    // User Feedback ("Report a bug"): opened from our own pixel-chrome button
    // (components/ui/BugReportButton.tsx), never Sentry's floating widget —
    // `autoInject: false`. Privacy posture for a classroom of minors: no
    // name/email fields (reports stay anonymous) and no screenshot capture
    // (message text only). Flip `showScreenshot: true` later if reports prove
    // too thin — attachment is student-initiated and previewed, so it's a
    // softer line than Session Replay (which stays off, always).
    Sentry.feedbackIntegration({
      autoInject: false,
      // The app is dark-only; pinning the scheme keeps the widget from
      // flipping to a light card on a light-preference machine.
      colorScheme: 'dark',
      showName: false,
      showEmail: false,
      enableScreenshot: false,
      // Game palette (see app/globals.css): dark navy surface, gold accent.
      // Fonts are set alongside this in globals.css + BugReportButton, because
      // the theme object only carries colors.
      themeDark: {
        background: '#0d1b2e',
        foreground: '#ffffff',
        accentBackground: '#F5C518',
        accentForeground: '#0d1b2e',
        successColor: '#4ADE80',
        errorColor: '#F87171',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
        outline: '1px auto #F5C518',
      },
      formTitle: 'Report a bug',
      messageLabel: 'What went wrong?',
      messagePlaceholder: 'What did you do, and what happened instead?',
      submitButtonLabel: 'Send report',
      successMessageText: 'Thanks — your report went to the scienium team!',
    }),
  ],
})

// App Router navigation transitions become spans on the client.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
