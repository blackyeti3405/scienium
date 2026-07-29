import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
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

    return [
      { source: '/(.*)', headers: securityHeaders },
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
