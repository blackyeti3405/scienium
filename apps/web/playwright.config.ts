import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv } from './e2e/env'
import { STORAGE } from './e2e/roles'

// Make CLERK_* and the E2E_* test-account creds available to the test runner
// (the app process gets them on its own via `next dev`).
loadTestEnv(__dirname)

// Stub every paid LLM call (paper quiz/grade/retry, Vega study, failure-log
// follow-up, Codex study-plan) during E2E. This is set HERE, not in .env.local,
// so a normal `pnpm dev` server generates REAL content — only the Playwright-
// managed dev server (which gets it via webServer.env below) runs in stub mode.
process.env.E2E_SKIP_LLM = '1'

// Serve deterministic fixtures for the Discovery external-source adapters
// (OpenAlex resolve/references/cited-by, Semantic Scholar, article feeds) instead
// of hitting the live third-party APIs. Same mechanism as E2E_SKIP_LLM above: the
// spawned dev server inherits it, so a normal `pnpm dev` still uses the real APIs.
// Without this the discovery mock-seam specs silently run against live networks
// (meaningless for the fake seed ids), so it belongs here, not in .env.local.
process.env.E2E_MOCK_SOURCES = '1'

// Serve the Pyodide runtime from the local .pyodide-cache, never R2.
//
// Set HERE for a third reason beyond the two above: `E2E_BUILD=1` runs
// `next build && next start`, which is production mode, and Next loads
// `.env.production.local` in production at HIGHER precedence than `.env.local`.
// A developer who keeps a copy of the production environment in that file (as
// this checkout does) silently hands the E2E server `PYODIDE_SOURCE=r2` — and
// the wheels are not in R2 until the one-time upload runs, so every runtime
// asset 404s, the worker never signals ready, and all 18 Lab/Code specs sit on
// `expect(lab-run).toBeEnabled()` for 150s each. That is ~40 minutes of a run
// spent on a misread env var; it is exactly the CI failure e2e.yml already
// documents ("waits 150s for a runtime that 404s forever"), reintroduced
// locally through a different door.
//
// A real process env var outranks every .env file, so setting it here makes the
// lane immune to whatever that file says. `preflight` asserts it took effect.
process.env.PYODIDE_SOURCE = 'local'

const PORT = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

// Full-suite runs go against a PRODUCTION build (`next build && next start`);
// single-spec iteration (test:e2e:file) keeps the fast dev-server loop.
//
// Why: a 310-test serial run against `next dev` is flaky by construction —
// 12-16 failures per run with a different set each time, all dev artifacts:
//   - on-demand route compiles blow tight assertions and 30s gotos;
//   - the dev server degrades/stalls over a ~30-minute run (ERR_ABORTED,
//     ECONNRESET) while specs pass in isolation;
//   - aborted in-flight requests pop the <nextjs-portal> dev error overlay,
//     which then INTERCEPTS POINTER EVENTS and fails every later click in that
//     page (see upgrades AC12's click log).
// `next start` has none of these: no compiles, no overlay, no file watchers —
// which also means editing source mid-run can't perturb the suite.
const PROD_BUILD = process.env.E2E_BUILD === '1'

export default defineConfig({
  testDir: 'e2e',
  // NOT fully parallel: every spec authenticates as the same leader on the ONE
  // shared E2E Test Lab, so they all mutate the same team state (currency, the
  // per-day Lab-Credit claim, placed buildings). Running them concurrently makes
  // those mutations race (e.g. a parallel log grants LC mid-assertion). Until each
  // worker gets its own dedicated test account + team, the suite runs SERIALLY so
  // it's deterministically green. Override locally for speed with E2E_WORKERS (you
  // may then see contention flakes). See PARALLELISM.md.
  //
  // THIS is what orders tests within a file: `fullyParallel: false` means files
  // run in parallel but the tests inside one file run in declaration order on a
  // single worker, nested describes included. 25 spec files ALSO set
  // `mode: 'serial'` for that ordering, which they never needed — and serial
  // mode's real effect is that one failure SKIPS every later test in the group.
  // 307 of 379 tests (81%) sat behind that cascade; one red run once cost 48
  // tests that never executed and hid four assertions that had been dead for
  // five versions (docs/runbooks/e2e.md). Serial mode is now gone. Specs that
  // depend on ordering say so in a comment and depend on this line instead.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: Number(process.env.E2E_WORKERS ?? 1),
  // In CI, annotate the run inline (github) AND write the HTML report the E2E
  // workflow uploads on failure — the `github` reporter alone leaves
  // playwright-report/ empty, so there was nothing to attach to a red run.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Traces only exist on the retry; a screenshot of the first failure costs
    // nothing and is usually the whole diagnosis. Both land in test-results/,
    // which CI uploads (synthetic fixture accounts only — see e2e.yml).
    screenshot: 'only-on-failure',
  },
  projects: [
    // Runs FIRST and gates everything: is this the stubbed server, on the same
    // database as the runner, with the fixture graph present? Each of those
    // failing silently has cost a full 30-minute run (and, once, real money in
    // un-stubbed Anthropic calls). See e2e/preflight.setup.ts.
    { name: 'preflight', testMatch: /preflight\.setup\.ts/ },
    // Signs in every role ONCE and writes e2e/.auth/<role>.json. Every spec
    // reuses those sessions, so auth happens once per suite, not per spec.
    { name: 'setup', testMatch: /auth\.setup\.ts/, dependencies: ['preflight'] },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE.leader },
      dependencies: ['setup'],
    },
    // A9: the accessibility smoke also runs at a representative tablet
    // viewport — classroom devices are not all desktops. Scoped to the a11y
    // spec so the (serial, shared-account) suite doesn't double in length.
    // Chromium with iPad dimensions + touch, so no extra browser install.
    {
      name: 'tablet-a11y',
      testMatch: /a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 810, height: 1080 },
        hasTouch: true,
        storageState: STORAGE.leader,
      },
      dependencies: ['setup'],
    },
    // P1-3: a BOUNDED cross-browser lane. The suite is Chromium-only by design —
    // serial, one shared account, ~15 minutes — so running all of it on three
    // engines buys flake, not coverage. This is the cheap half: one read-only
    // spec per engine, enough to catch an engine-level break (a CSS/JS feature
    // the isometric scene needs, a Clerk session cookie one engine won't
    // restore). Both reuse the chromium-produced storageState, which is portable
    // JSON cookies. `preflight` and `setup` still run in chromium, so the CI
    // compat lane installs all three browsers.
    {
      name: 'firefox-compat',
      // Anchored: a bare /smoke\.spec\.ts/ also matches settings-smoke.spec.ts.
      testMatch: /[\\/]smoke\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'], storageState: STORAGE.leader },
      dependencies: ['setup'],
    },
    {
      name: 'webkit-compat',
      // Anchored: a bare /smoke\.spec\.ts/ also matches settings-smoke.spec.ts.
      testMatch: /[\\/]smoke\.spec\.ts$/,
      use: { ...devices['Desktop Safari'], storageState: STORAGE.leader },
      dependencies: ['setup'],
    },
    // Marketing screenshots, run on demand. They write PNGs into public/, which
    // is exactly why they must not run in CI:
    //   E2E_CAPTURE=1 pnpm --filter web exec playwright test --project=capture
    //
    // The project is CONDITIONAL, not merely narrow. A project-level `testMatch`
    // REPLACES the config default rather than intersecting with it, so the
    // `.capture.ts` suffix hid nothing — `playwright test` with no arguments runs
    // every configured project, and this one was test 374 of 374 in both the
    // nightly `full` lane and the local `test:e2e` script. The suffix is still
    // useful (it keeps captures out of the chromium project), but the env flag is
    // what actually keeps them out of a suite run.
    ...(process.env.E2E_CAPTURE === '1'
      ? [
          {
            name: 'capture',
            testMatch: /\.capture\.ts$/,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1440, height: 900 },
              storageState: STORAGE.leader,
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],
  webServer: {
    // Boot on PORT (default 3000) so a worktree / concurrent ship run can isolate
    // via E2E_PORT and never reuse the main :3000 server, which runs different code.
    // E2E_BUILD=1 (the test:e2e default): build once, serve the production bundle.
    command: PROD_BUILD
      ? `pnpm --filter web exec next build && pnpm --filter web exec next start -p ${PORT}`
      : `pnpm --filter web exec next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // Prod mode pays a full `next build` before the server answers — give it room.
    timeout: PROD_BUILD ? 420_000 : 120_000,
    // The Playwright-spawned server inherits this process's env (E2E_SKIP_LLM /
    // E2E_MOCK_SOURCES set above), so it stubs LLM + external-source calls. A
    // manually-started `pnpm dev` never sees them.
    //
    // `reuseExistingServer` therefore has a sharp edge: any process already on
    // this port is adopted, stub flags or not. That USED to fail silently with
    // real paid model calls; the `preflight` project now detects it in ~1s and
    // fails with the fix. Still true and worth avoiding:
    //  - E2E_BUILD=1 runs `next build`, which corrupts a live dev server sharing
    //    the same .next (see the "concurrent build" incident note in docs). The
    //    reuse check fires first, so this only bites if the dev server is started
    //    AFTER the build begins — don't do that.
  },
})
