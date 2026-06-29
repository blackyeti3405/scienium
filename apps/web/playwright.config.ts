import { defineConfig, devices } from '@playwright/test'
import { loadTestEnv } from './e2e/env'
import { STORAGE } from './e2e/roles'

// Make CLERK_* and the E2E_* test-account creds available to the test runner
// (the app process gets them on its own via `next dev`).
loadTestEnv(__dirname)

const PORT = Number(process.env.E2E_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`

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
    command: `pnpm --filter web exec next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
