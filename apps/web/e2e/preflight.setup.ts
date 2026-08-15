import { test as setup, expect } from '@playwright/test'
import { e2eDb } from './db'

/**
 * Preflight — refuse to run against the wrong server, the wrong database, or a
 * missing fixture.
 *
 * Every project depends on this, so it is the first thing that runs and nothing
 * else starts if it fails. The point is to convert three silent, expensive
 * failure modes into one immediate error that names its own fix:
 *
 *  1. **A reused, non-stubbed server.** `reuseExistingServer` picks up any
 *     process already on the port, and a hand-started `pnpm dev` never saw
 *     `E2E_SKIP_LLM`. The suite then makes REAL paid model calls; the visible
 *     symptom is a 502 from a schema-mismatched model reply, which reads like a
 *     regression in the route under test.
 *  2. **A split database.** The runner queries PostgreSQL directly while the
 *     server uses its own `DATABASE_URL`. When they differ, seeds land in one
 *     and assertions read the other, and every spec fails on a missing fixture.
 *  3. **A missing fixture graph.** Without the School → Class → Team → members
 *     graph, teacher-scope specs die in `beforeAll` — a failure that has been
 *     misread as a product bug more than once.
 *
 * Each check is cheap. Together they are the difference between a 5-second
 * "here is what is wrong" and a 30-minute run that fails 200 tests for one
 * reason nobody can see from the output.
 */

const FIXTURE_TEAM = 'E2E Test Lab'

setup('preflight: server, database and fixture are the ones the suite expects', async ({
  request,
  baseURL,
}) => {
  // ── 1. The server is the stubbed one ────────────────────────────────────
  const res = await request.get('/api/dev/e2e-health')
  // A 200 of HTML means the auth middleware redirected the probe — the same
  // shape a stale-session API call takes (307 → sign-in → a 200 page), and the
  // reason `staleSessionResponse` in api.ts exists at all.
  const contentType = res.headers()['content-type'] ?? ''
  expect(
    contentType.includes('application/json') ? res.status() : 0,
    [
      '',
      `The server at ${baseURL} is NOT running in E2E stub mode.`,
      '',
      'Playwright reuses whatever is already listening on the port, and a server',
      'started any other way never saw E2E_SKIP_LLM / E2E_MOCK_SOURCES. Running',
      'against it makes REAL, PAID Anthropic calls and hits live third-party APIs.',
      '',
      'Fix: stop whatever is serving that port (a `pnpm dev`, an editor preview',
      'server, a leftover `next start`) and let Playwright spawn its own:',
      `  lsof -ti:${new URL(baseURL ?? 'http://localhost:3000').port || 3000} | xargs kill`,
      '',
      'If .next was written by both servers, clear it too: rm -rf apps/web/.next',
    ].join('\n'),
  ).toBe(200)

  const health = (await res.json()) as {
    skipLlm: boolean
    mockSources: boolean
    dbFingerprint: string | null
    nodeEnv: string
    pyodideSource: string
  }
  expect(health.skipLlm, 'the server reports it is not stubbing LLM calls').toBe(true)
  expect(
    health.mockSources,
    'E2E_MOCK_SOURCES is not set on the server — the discovery specs would hit live APIs',
  ).toBe(true)
  // `next start` is production mode, so `.env.production.local` outranks
  // `.env.local`. If that file carries `PYODIDE_SOURCE=r2` (a maintainer's copy
  // of the production environment does), the runtime proxy serves from a bucket
  // the wheels may never have been uploaded to. There is no error to find later:
  // the fetches are inside a Web Worker, so all 18 Lab/Code specs simply wait
  // 150s each on a Run button that never enables. Two seconds here instead.
  expect(
    health.pyodideSource,
    'the server will serve the Pyodide runtime from R2, not the local cache. ' +
      'playwright.config.ts sets PYODIDE_SOURCE=local for this reason, so something ' +
      'is overriding it — check apps/web/.env.production.local.',
  ).toBe('local')

  // ── 2. Runner and server share one database ─────────────────────────────
  const [{ fp }] = await e2eDb.$queryRaw<{ fp: string }[]>`
    SELECT md5(
      current_database() || ':' ||
      coalesce(host(inet_server_addr()), 'local') || ':' ||
      coalesce(inet_server_port()::text, '?')
    ) AS fp`
  expect(
    health.dbFingerprint,
    [
      '',
      'The test runner and the server under test are on DIFFERENT databases.',
      'Seeds would land in one and assertions read the other.',
      '',
      'Fix: make apps/web/.env.local DATABASE_URL the same for both, and remember',
      'that a server started before an env change is still running the old value.',
    ].join('\n'),
  ).toBe(fp)

  // ── 3. The fixture graph exists ─────────────────────────────────────────
  const team = await e2eDb.team.findFirst({
    where: { name: FIXTURE_TEAM },
    select: { id: true, phase: true, labType: true, _count: { select: { members: true } } },
  })
  expect(
    team,
    [
      '',
      `The '${FIXTURE_TEAM}' fixture is missing.`,
      '',
      'Fix: pnpm --filter web seed:e2e',
      '(and if the Clerk-backed user rows do not exist yet:',
      ' pnpm --filter web exec playwright test --project=setup, then seed again)',
    ].join('\n'),
  ).not.toBeNull()

  // The suite exercises every phase's features, which only the terminal phase
  // unlocks cumulatively; the building specs need the matching lab type.
  expect(team!.phase, 'fixture team is not at the terminal phase — re-run seed:e2e').toBe('project_development')
  expect(team!.labType, 'fixture team has the wrong lab type — re-run seed:e2e').toBe('volt_lab')
  expect(team!._count.members, 'fixture team has no members — re-run seed:e2e').toBeGreaterThan(0)
})
