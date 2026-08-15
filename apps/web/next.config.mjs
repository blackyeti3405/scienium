import { withSentryConfig } from '@sentry/nextjs'

/**
 * The clerk-js build the browser loads, PINNED.
 *
 * The npm packages are locked by the lockfile, but clerk-js itself is fetched
 * from Clerk's CDN at runtime — so it is the one dependency that can change
 * under a frozen commit. The app a user loads today need not be the app CI
 * verified yesterday, and a browser-only regression lands with nothing in the
 * diff to explain it. That is not hypothetical here: the E2E gate went red
 * overnight on 2026-08-11 against an unchanged `main` and an unchanged secret.
 *
 * Pinned in config rather than in the environment on purpose: an env var has to
 * be set in `.env.local`, the `E2E_ENV_FILE` CI secret AND Vercel, and wherever
 * it is missing the pin silently does not apply. This applies everywhere, and a
 * bump shows up in review. A real env var still wins, for a one-off test.
 *
 * To bump: raise the version, run the E2E gate (Chromium + the compat lane),
 * then commit the new number.
 */
const CLERK_JS_VERSION = '6.29.0'

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_JS_VERSION: process.env.NEXT_PUBLIC_CLERK_JS_VERSION ?? CLERK_JS_VERSION,
  },
  // Dev-only routes are compiled out of PRODUCTION builds entirely.
  //
  // `app/dev/*` holds visual harnesses (the skeleton audit). Runtime guards
  // alone were not enough: the page still shipped in the production bundle and
  // showed up in the build manifest, relying on a `notFound()` to hide it. With
  // this, a production build does not resolve `page.dev.tsx` at all, so those
  // routes do not exist to be reached, probed, or served.
  pageExtensions: process.env.NODE_ENV === 'production'
    ? ['tsx', 'ts', 'jsx', 'js']
    : ['dev.tsx', 'tsx', 'ts', 'jsx', 'js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  // firecrawl uses undici (Node built-in HTTP) which webpack can't bundle.
  // sharp likewise needs native bindings. Mark both as server-side externals.
  // (Stable name since Next 15 — was experimental.serverComponentsExternalPackages.)
  serverExternalPackages: ['sharp', 'firecrawl'],
  // Data Terminal Code lane (plan §4): the Pyodide worker imports `pyodide`,
  // whose loader (`pyodide.mjs`) has runtime-branched dynamic `import('node:*')`
  // calls for its Node path. In the browser/worker bundle those branches never
  // execute, but webpack still resolves them and errors on the `node:` scheme
  // ("UnhandledSchemeError"). So, on the CLIENT build only: strip the `node:`
  // scheme and stub each module to empty — the browser path uses fetch, and the
  // wasm/wheels load at runtime from the same-origin proxy, never through
  // webpack (no `asyncWebAssembly` experiment needed). The server build is
  // untouched, where these builtins must resolve for real.
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '')
        }),
      )
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: false,
        crypto: false,
        url: false,
        vm: false,
        child_process: false,
      }
    }
    return config
  },
  // The dev-mode DevTools route indicator (a `next dev`-only badge, bottom-left,
  // ~36px) sits at the exact corner `.activity-fab` occupies (globals.css) and
  // steals its clicks — reproduced as e2e/upgrades.spec.ts AC12 timing out in the
  // `next dev` single-spec loop (`test:e2e:file`). Not a client-side exception
  // (zero `pageerror`s either way) and not a production issue: `next start` never
  // renders this indicator at all — the production-build run is 14/14 green. Only
  // the Playwright-managed dev server sees `E2E_SKIP_LLM`, so this disables the
  // indicator there only; a normal `pnpm dev` keeps it.
  devIndicators: process.env.E2E_SKIP_LLM ? false : undefined,
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    // ── Security headers (SEC2-005) ──────────────────────────────────────────
    // CSP posture: frame-ancestors/object-src/base-uri are locked hard (the
    // clickjacking + injection primitives); script/connect allow only self +
    // Clerk (its js, API, and bot-challenge frames). `frame-src`/`img-src`
    // stay permissive over https because the app deliberately EMBEDS external
    // content (YouTube lessons, promoted papers' publisher PDFs, wiki images)
    // — what we embed is far less dangerous than who may embed us.
    // `unsafe-inline` scripts are required by Next's bootstrap without a
    // nonce pipeline; `unsafe-eval` is dev-only (React Refresh needs it).
    // `'wasm-unsafe-eval'` lets the Data Terminal Code lane instantiate the
    // Pyodide WASM engine (plan §4). It is the NARROW wasm-only grant — it does
    // NOT permit JS eval — so it is safe in production, where `'unsafe-eval'` is
    // absent. Single-threaded Pyodide needs no SharedArrayBuffer, so COOP/COEP
    // are untouched and the runtime stays same-origin (no connect-src change).
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isProd ? '' : " 'unsafe-eval'"} https://*.clerk.accounts.dev https://clerk.scienium.app https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://clerk.scienium.app https://clerk-telemetry.com",
      "frame-src 'self' https:",
      // FIX 1 (defense-in-depth): 'self' only — NO blob:. The Pyodide worker is
      // a webpack-bundled same-origin chunk (new Worker(new URL('./pyodide.worker.ts',
      // import.meta.url))), so 'self' covers it. Dropping blob: CSP-kills the
      // nested blob-worker fresh-realm escape regardless of any JS stub. Grep
      // confirmed nothing else spawns a blob/SharedWorker (Session Replay is off).
      "worker-src 'self'",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      // HSTS is meaningful only over TLS; browsers ignore it on http, but we
      // still gate it to production so local tooling never caches a pin.
      ...(isProd
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
        : []),
    ]

    // The stored-PDF routes are the ONE place the app embeds its own response in
    // its own <iframe> (the Q&A viewer). The global lock below sends
    // `frame-ancestors 'none'` + `X-Frame-Options: DENY` on every response,
    // which the browser applies to the PDF document itself — so it fetches the
    // bytes (200 in the server log) and then refuses to render them, leaving a
    // blank viewer with no error anywhere.
    //
    // These two routes relax to SAME-ORIGIN only. Every other route keeps the
    // hard lock, so the clickjacking posture is unchanged for anything an
    // attacker could actually want to frame: a PDF the caller must already be
    // authenticated and team-scoped to read is not a clickjacking target.
    const sameOriginFrameable = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
    ]

    return [
      { source: '/(.*)', headers: securityHeaders },
      // AFTER the global rule: for duplicate keys the later match wins.
      { source: '/api/papers/:id/file', headers: sameOriginFrameable },
      { source: '/api/teacher/student/:id/literature/:paperId/file', headers: sameOriginFrameable },
      {
        // Sprite URLs are content-addressed (the manifest appends a ?v=<hash> token, see
        // lib/sprites/manifest.ts + scripts/gen-sprite-versions.mjs), so a redraw changes
        // the URL. That lets us cache immutably in production — instant on reload and on
        // the next classroom session, and never stale, because fresh art arrives on a new
        // URL. In development we send no-cache so local sprite edits show up immediately.
        source: '/sprites/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isProd ? 'public, max-age=31536000, immutable' : 'no-cache',
          },
        ],
      },
    ]
  },
}

// Sentry build wrapper: injects the SDK across the three runtimes and uploads
// source maps on production builds WHEN the build-time secrets are present
// (SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN — read from env by the
// plugin; without them the build proceeds and just skips the upload).
export default withSentryConfig(nextConfig, {
  // Route browser events through our own origin — survives ad/tracker blockers
  // on school networks and keeps the CSP's connect-src at 'self' (the tunnel is
  // on the middleware public-routes list; server-side events go direct from
  // Node, where CSP doesn't apply).
  tunnelRoute: '/monitoring',

  // Upload a wider set of client source files for better stack traces.
  widenClientFileUpload: true,

  // Suppress non-CI output.
  silent: !process.env.CI,
})
