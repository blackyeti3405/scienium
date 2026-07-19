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
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: Number(process.env.E2E_WORKERS ?? 1),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    // Signs in every role ONCE and writes e2e/.auth/<role>.json. Every spec
    // reuses those sessions, so auth happens once per suite, not per spec.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE.leader },
      dependencies: ['setup'],
    },
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
    // manually-started `pnpm dev` never sees them. Caveats:
    //  - reuseExistingServer: an already-running :3000 dev server gets reused
    //    WITHOUT the stub flags — don't run `pnpm dev` and E2E on the same port.
    //  - E2E_BUILD=1 runs `next build`, which corrupts a live dev server sharing
    //    the same .next (see the "concurrent build" incident note in docs). The
    //    reuse check fires first, so this only bites if the dev server is started
    //    AFTER the build begins — don't do that.
  },
})
