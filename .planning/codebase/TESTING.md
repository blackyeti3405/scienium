# TESTING.md — Scienium Testing Practices

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## Testing Overview

Two test layers:

| Layer | Framework | Scope | Pattern |
|-------|-----------|-------|---------|
| **Unit / logic** | Vitest ^4.1.9 | Pure functions; no DB, no Next server, no network | `lib/**/*.test.ts`, `test/**/*.test.ts` |
| **End-to-end** | Playwright ^1.61.0 | Full app via real browser, real Clerk auth, real Supabase DB | `e2e/**/*.spec.ts` (~22 specs) |

There is **no integration/middleware test layer** between the two — route handlers are exercised through E2E, and pure logic through Vitest.

**CI** is configured via `.github/` (GitHub Actions / Vercel). E2E on CI: `retries: 1`, `reporter: 'github'`. Locally: `retries: 0`, `reporter: 'list'`.

---

## Unit Tests (Vitest)

### Config — `vitest.config.ts`
```ts
defineConfig({
  resolve: { tsconfigPaths: true },     // @/* alias matches the app
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'test/**/*.test.ts'],
    globals: false,                      // must `import { describe, it, expect }`
  },
})
```

- **Node environment**, not jsdom — tests are pure-logic units.
- **No globals** — every test imports `describe/it/expect/vi` from `vitest` explicitly.
- **Includes only `lib/` and `test/`** `.test.ts` files (NOT `e2e/`).
- Some feature directories use a local `__tests__/` subdir (e.g. `lib/ops/codex/__tests__/`).

### Coverage (24 unit test files mapped)
```
lib/buildings/service.test.ts
lib/data-terminal/{charts-guide,csv,data-quality-guide,methods-guide,plot-guide,stats-guide}.test.ts
lib/discovery/economy.test.ts
lib/economy.test.ts
lib/fairs/{abstract-guide,forms,rubric-anchors}.test.ts
lib/literature/{citation,research-guide}.test.ts
lib/lru.test.ts
lib/notifications/compute.test.ts
lib/ops/codex/__tests__/{content-shape,engine,generated-content}.test.ts
lib/rate-limit.test.ts
lib/shop.test.ts
lib/sprites/manifest.test.ts
lib/teacher/role.test.ts
lib/team/active-team.test.ts

test/{credibility,phase,showcase}.test.ts
```

### What's covered
- **Phase gating** (`test/phase.test.ts`) — `PHASE_ORDER`, `getUnlockedFeatures`, `assertFeatureUnlocked`, lab size.
- **Rate limiting** (`lib/rate-limit.test.ts`) — `clientIp` header precedence, `MemoryStore`/`UpstashStore` fixed-window semantics, `enforceRateLimit` 429 + `Retry-After`, per-user vs per-IP buckets.
- **Team resolution** (`lib/team/active-team.test.ts`) — `pickActiveTeam` membership-vs-stored-id logic (the IDOR guard).
- **Economy / shop / buildings** — KP/LC math, cost scaling, refunds, build limits.
- **Citations** (`lib/literature/citation.test.ts`) — deterministic APA/MLA/IEEE output (no LLM).
- **Codex engine** (`lib/ops/codex/__tests__/engine.test.ts`) — curriculum content shape + generated content.
- **Misc:** LRU cache, sprite manifest, teacher role, notification compute, data-terminal guides.

### Test style
- **No mocking of DB/network** — unit tests pick modules that are pure (e.g. `phase.ts`, `rate-limit.ts`, `active-team.ts`, `citation.ts`) so they don't need that mocking.
- **Identity isolation:** `rate-limit.test.ts` uses unique IPs/users per test (`freshIp()`, `freshUser()`) because the store is a module-level singleton.
- **Env touch-and-restore:** tests that need an env var set restore it in a `try/finally` (see `RATE_LIMIT_IP_HEADER` test).
- **No coverage threshold is configured.**

### Commands
```bash
pnpm --filter web test      # vitest run (CI mode)
pnpm --filter web test:watch
```

---

## End-to-End Tests (Playwright)

### Config — `playwright.config.ts`
- **Tests dir:** `e2e/`
- **NOT fully parallel:** `fullyParallel: false`, `workers: 1` by default. Every spec authenticates as the same leader on the ONE shared "E2E Test Lab", so concurrent runs would race on shared team state. Override locally with `E2E_WORKERS=N` (may flake).
- **Projects:** a `setup` project runs `auth.setup.ts` once per suite (signs in each role, writes `e2e/.auth/<role>.json`); the `chromium` project depends on `setup` and reuses the saved sessions.
- **Traces:** `trace: 'on-first-retry'`.
- **`forbidOnly: !!process.env.CI`** — `.only` blocks CI.
- **Port isolation:** `E2E_PORT` (default 3000) lets a worktree / concurrent `ship` run isolate from the main :3000 server.

### Paid-LLM stubbing — KEY CONVENTION
The Playwright config sets `process.env.E2E_SKIP_LLM = '1'`. This flag:
1. ✅ **Stubs every paid Claude call** (paper quiz/grade/retry, Vega study, Codex study plan, failure-log follow-up) during E2E.
2. ✅ **Bypasses rate limits** (`enforceRateLimit` returns null when `E2E_SKIP_LLM === '1'`) — the suite runs as ONE user in minutes and would otherwise 429 mid-run.

This is set ONLY by `playwright.config.ts` (inherited by the `webServer.env`). A manually-started `pnpm dev` never sees it → generates real content. **Caveat:** if `reuseExistingServer` picks up an already-running dev server, that one won't have the flag — don't run `pnpm dev` and E2E on the same port.

### Roles & accounts — `e2e/roles.ts`
Three dev Clerk accounts, credentials read lazily from env (after config loads `.env.local`):
```
leader   → devuser1, sessions saved to e2e/.auth/leader.json, lands /lab
student  → devuser2, e2e/.auth/student.json, /lab
teacher  → DevTeacher, e2e/.auth/teacher.json, /teacher
```
Required env vars (in `apps/web/.env.local`):
- `E2E_LEADER_IDENTIFIER` / `E2E_LEADER_PASSWORD`
- `E2E_STUDENT_IDENTIFIER` / `E2E_STUDENT_PASSWORD`
- `E2E_TEACHER_IDENTIFIER` / `E2E_TEACHER_PASSWORD`
- Plus `CLERK_*` keys.

### Clerk session freshness — `e2e/api.ts`
Saved `storageState` is a frozen snapshot of a short-lived Clerk JWT. `page.request.*` made long after a navigation carries a stale token → silently 307-redirects to /sign-in instead of 401. Helpers (`refreshClerkSession`, `refreshed`) re-tokenize from inside the live page (`window.Clerk.session.getToken({ skipCache: true })`) before each API call, so requests always carry a fresh token without losing DOM state.

### Direct DB access — `e2e/db.ts`
E2E talks to the real Supabase DB via a second `PrismaClient` (`e2eDb`). Helpers reset state deterministically against the single "E2E Test Lab" team (resolved once, memoized):
- `e2eTeamId()`, `deleteE2eBuilding(key)`, `setE2eBuildingLevel(key, level)`, `setE2eLabCredits(lc)`, `deleteE2eDiscoveryNodes(...)`, `deleteE2eDiscoveryNodesByTitle(...)`.

Seed: `pnpm --filter web seed:e2e` (`prisma/seed-e2e.mjs`, run via `--env-file=.env.local`).

### Spec files (22 specs)
Organized by feature number + freeform names:
```
F1.spec.ts                  — Discovery
F2.spec.ts                  — Research plan
F3.spec.ts, F3-plan-paste.spec.ts
F4.spec.ts, F4-print.spec.ts
F5-bell.spec.ts             — Notifications
F6-log-links.spec.ts
F8-reports.spec.ts
F9.spec.ts
F10.spec.ts, F10-teacher-rubric.spec.ts
F11.spec.ts, F11-quiz-retry.spec.ts
F13-codex.spec.ts
F18-vega-companion.spec.ts
issue-6.spec.ts
papers-tab.spec.ts
placement.spec.ts
roles.spec.ts
rubric-self-assessment.spec.ts
smoke.spec.ts
upgrades.spec.ts
```

### Spec convention — AC-mapped tests
Specs map each spec to acceptance criteria in a leading comment block (see `e2e/F11.spec.ts`):
```ts
/**
 * F11 — <feature>. One test per acceptance criterion (N total, from .claude/pipeline/plan-<feature>.md).
 * Criterion → test mapping:
 *   AC1  — ...
 *   AC2  — ...
 * ...
 * Mock seam: ...
 * Timeouts: ...
 */
```
Tests then target specific `data-testid` attributes and wait on real response/DOM state — never a blind fixed sleep. Generous timeouts because this dev environment reaches Supabase over the public internet (4–7s round-trips observed).

### Commands
```bash
pnpm --filter web test:e2e           # playwright run
pnpm --filter web test:e2e:ui        # interactive Playwright UI
pnpm --filter web test:e2e:file      # node scripts/test-e2e-file.mjs (single file)
pnpm --filter web seed:e2e           # seed the E2E team
```

---

## What Is NOT Tested

- **No route-handler unit tests:** API routes are only exercised through E2E (which hits real Supabase). There is no `supertest`/`next-test-api-route-handler` layer isolating handlers from the DB.
- **No snapshot/visual regression tests.**
- **No contract tests** between `shared-types` and consumers.
- **No load/perf tests.**
- **No security-focused test suite** (IDOR/phase-gate correctness relies on E2E ACs like F11 AC11/AC12).
- **The PvP system** (current branch `matthew/pvp-system`) appears untested at the E2E level (no `pvp.spec.ts`) — see CONCERNS.md.

---

## Where the Pipeline Specs Live

The `.claude/pipeline/plan-<feature>.md` files referenced by E2E spec headers contain the acceptance criteria that the specs implement. These live outside `apps/web/` (in the repo's `.claude/` planning/pipeline dir) and are the source of truth for "what does done look like" per feature.

---

*Mapped: 2026-07-19*