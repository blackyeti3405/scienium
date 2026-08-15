# Runbook: the E2E suite — how it works, why it flaked, what changed

_Audit + rebuild, 2026-07-26 (v0.51.0). Measured, one worker, production build:_

| | baseline | after the harness rebuild | after migrating F4 + F4-print |
| --- | --- | --- | --- |
| passed | 263 | 292 | **309** |
| failed | 10 | 2 | **0** |
| never ran (serial cascade) | 48 | 13 | **0** |
| wall clock | 13.6 min | 15.5 min | 14.8 min |

_**46 more tests now actually execute** than at the baseline, and the suite is
green. Note it briefly got SLOWER: a run that silently skipped 15% of itself was
not a faster suite._

## Run it

```bash
pnpm --filter web reset:e2e   # clear the fixture lab's accumulated content
pnpm --filter web seed:e2e    # rebuild the fixture graph (idempotent)
pnpm --filter web verify:e2e  # migrations at head + fixture present (2s, no server)
pnpm --filter web test:e2e    # full suite, production build
```

**Node 24 or newer.** The repo's floor is 22 (`package.json` `engines`), but the
browser suite needs 24: on Node 22, Playwright's synchronous module hooks are not
consulted for a `require()` issued from a module those hooks themselves loaded, so
tsconfig `paths` stop applying one level in and any app module a spec imports dies
on its own `@/…` import (`Cannot find module '@/lib/guides/filter'`). It cost the
2026-07-29 full lane one failure and was invisible locally, where dev runs a newer
Node. Both CI workflows pin 24.

The full suite ends with the two bounded cross-browser projects (`firefox-compat`
/ `webkit-compat`, one read-only spec each), so a first run needs all three
engines installed: `pnpm --filter web exec playwright install`. Chromium-only
iteration is unaffected — `test:e2e:file` and `--project=chromium` never touch
them.

WebKit needs two things no other engine does, both in `e2e/api.ts`, because its
Linux cookie jar drops any cookie carrying `Domain=localhost` (a single-label
host) — and `__client_uat` is the one Clerk cookie that is domain-scoped:

1. It does **not** reuse the saved session; it signs in inside the page on first
   load (logs `webkit cannot restore a saved Clerk session`). Clerk's handshake,
   how every other engine refreshes the snapshot's expired `__session`, *deletes*
   the restored `__client_uat` (host-only, accepted) and cannot re-set it
   (domain-scoped, rejected), so a restored WebKit session handshake-loops to
   /sign-in forever.
2. `mirrorClientUat` writes `__client_uat` into the jar with Playwright's cookie
   API — past the Set-Cookie domain rules — using the session token's `iat`
   (logs `browser would not store __client_uat`). Without it even a fresh in-page
   sign-in cannot authenticate, because clerk-js sets that cookie domain-scoped
   too. A no-op on every engine that accepted the cookie.

Both are Linux-only symptoms; macOS WebKit accepts `Domain=localhost`, so this
only ever reproduces in CI.

One spec while iterating:

```bash
pnpm --filter web test:e2e:file e2e/synthesis-matrix.spec.ts
```

**Nothing else may be serving port 3000.** Playwright reuses an existing server,
and a server started any other way has no stub flags — the suite would make
real, paid Anthropic calls. The `preflight` project now detects this in about a
second and fails with the fix; it used to surface as a 502 that read like a
regression in the route under test.

## The audit — what actually made it flaky

Ten failures, classified. **Six of the ten were the harness, not the product**,
and they took 48 more tests down with them.

| Class | Count | What it was |
| --- | --- | --- |
| **Rotted static assertions** | 3 | `readFileSync` source checks living inside browser tests. v0.45.0 moved every provider call behind `aiCreate`; three specs still pinned `anthropic().messages.create(` and had been matching **zero** call sites ever since. A suite nobody runs on every commit cannot report its own rot. |
| **Shared-fixture pollution** | 3 | `resetTree()` timing out because a previous spec's discovery nodes would not clear. The fixture lab is never emptied, so it had accumulated 1,732 activity-feed rows, 152 notifications, 49 project logs and 123 uploaded assets. |
| **Cross-spec ordering** | 2 | `topic-removal-confirm` failing on a proposal token bound to a node set another spec had changed. |
| **Stale expectation** | 1 | `F4-print` AC2 asserting a slug URL for a `link_only` showcase, which v0.35.1 (P1-R7) made reachable only through its 128-bit share token. The app was right; the spec was five versions out of date. |
| **A false premise in the test** | 2 | `F4` AC3 and `F4-print` AC10 asserted that a "signed-out" viewer is denied — using a viewer that was not signed out. See "the anonymous-viewer trap". |

### The five structural flaws behind them

1. **One shared, never-reset fixture lab.** Every spec authenticates as the same
   leader on the same team and mutates it. `seed-e2e.mjs` is additive by design,
   so nothing ever cleared what the suite wrote. Specs coped by growing private
   `deleteMany` calls in `beforeAll` — which turned one spec's cleanup into the
   next spec's missing precondition.

2. **Serial mode turns one failure into a dozen.** 23 of 32 spec files use
   `mode: 'serial'` because of flaw 1. The baseline's 10 failures cost **48
   additional tests that never ran** — 15% of the suite, invisible in the
   summary line, and the reason "it's flaky" and "it's slow" are the same
   problem.

3. **Source assertions in a browser suite.** 21 tests across 6 files read route
   source with `readFileSync`. They need no browser, they gate nothing (the
   suite is nightly), and three of them had silently stopped asserting anything.

4. **`reuseExistingServer` adopts any process on the port.** Including one
   without `E2E_SKIP_LLM`, which means real paid model calls and live
   third-party APIs, presenting as a schema-mismatch 502.

5. **The CI lane could not have worked.** Both jobs provision an empty
   `postgres:16` service, then run `seed:e2e` — which used to *abort* when the
   Clerk-backed `User` rows were absent, which they always are in an empty
   database. The lane has never actually executed, because the whole job is
   gated on an `E2E_ENV_FILE` secret that is not configured, so it reports
   "skipped" and passes.

## What changed

### 1. A preflight that fails in seconds, not thirty minutes

`e2e/preflight.setup.ts` runs before everything (a Playwright project that
`setup` depends on) and refuses to continue unless:

- the server answers `/api/dev/e2e-health` — a route that **exists only when
  `E2E_SKIP_LLM=1`**, so its presence is the proof, not a self-report;
- `E2E_MOCK_SOURCES` is on, so discovery specs cannot hit live APIs;
- the runner and the server hash to the **same database** (seeding one and
  asserting against another used to fail every spec with no visible cause);
- the fixture team exists, at the right phase and lab type, with members.

Each failure message names its own remedy.

### 2. Source assertions moved to vitest

`test/ai-route-cost-shape.test.ts` owns them in one table: per-module call-site
counts, registry operation names, cache-block counts, forbidden/required cache
prefixes, and rate tiers — plus `test/prompt-injection-pins.test.ts` for the
fencing pins. They now run in gate 3 on every commit, in milliseconds.

Two guards make the table itself rot-proof:

- **a completeness check** — any module that starts calling `aiCreate`/`aiStream`
  without an entry fails the suite;
- **a vacuity check** — if the scan discovers nothing, that is a failure too.
  A guard that silently matches zero is exactly what went wrong before.

### 3. `reset:e2e`

`pnpm --filter web reset:e2e` purges the fixture lab back to empty through one
ordered inventory (`prisma/reset-e2e.mjs`), scoped strictly by team id so it can
never touch `devlab`, which shares the dev database. It also sweeps the stray
`[E2E …]` teams that specs create for their IDOR cases and abandon on failure.
`--dry` prints the plan without writing.

**Uploaded assets are retired, never deleted.** The row is the only proof an R2
object exists (P1-R12) and that bucket is shared with production, so they are
flipped to `orphaned` for the normal reclaim sweep.

**Two things it deliberately leaves alone**, learned by clearing them and
watching unrelated specs fail: `team_gateway_placements` and
`team_shop_buildings` are the lab's *layout*, not accumulated content. With the
placements gone the isometric scene falls back to its default cells, where one
128px sprite covers a neighbour's hit area and Playwright cannot click "Open
Discovery" at all ("subtree intercepts pointer events"). The suite's clickability
had been depending on whatever positions `placement.spec.ts` last happened to
leave behind — so `seed:e2e` now seeds an explicit spread and the layout is
reproducible for the first time.

### 4. Disposable per-spec labs

`e2e/lab.ts`'s `withLab(label, fn)` creates a fresh team owned by the E2E
leader, points `activeTeamId` at it for the duration, and purges it afterwards
through the **same** inventory `reset:e2e` uses — one owner for "what belongs to
a team", so the two cannot drift into a foreign-key error during teardown.

A spec using it starts from a known-empty lab and leaves nothing behind. New
specs should use it; existing ones can migrate one file at a time, and each
migration removes a `beforeAll` full of `deleteMany` calls.

One wrinkle worth knowing: `uploaded_assets.team_id` is `ON DELETE RESTRICT`
(P1-R12), so a lab that uploaded anything cannot simply be deleted — and
deleting the ledger rows instead would strand the objects permanently in a
bucket shared with production. Disposal therefore **reassigns** any remaining
assets to the shared fixture team, still `orphaned`: the object stays tracked
for the reclaim sweep and the disposable lab becomes deletable.

### 5. The anonymous-viewer trap

Three tests asserted "a signed-out visitor is denied". None of them had a
signed-out visitor, and settling that took three wrong turns worth recording:

- **`browser.newContext()` is not signed out** against a Clerk **development**
  instance. Loading any app page runs the dev-browser handshake and restores a
  session from `__clerk_db_jwt`; dumping the cookies showed the "anonymous"
  context holding `__session`/`__client_uat` **as the leader**, who owns the
  showcase under test. `canViewShowcase` correctly returned true and the page
  correctly rendered. The product was never leaking.
- **`clerk.signOut()` on that context is worse than useless.** It revokes the
  session it just restored — the shared leader session — and every later test in
  the file times out.
- **`playwrightRequest.newContext({ baseURL })` still carries a storage state.**
  `storageState: undefined` has to be passed explicitly. (One case in
  `F4.spec.ts` already did this; the idiom was there to copy and nobody had.)

The working shape is a request context with `storageState: undefined`, asserting
the **not-found copy is present** rather than the title absent — the page streams
behind its `loading.tsx`, so the raw body legitimately carries suspended-boundary
payload. Verified out of band against a production build: a truly anonymous fetch
of a pending showcase returns the not-found copy and none of the showcase's
title, abstract or assets.

### 6. What migrating F4 and F4-print actually found

Both files drive one `Showcase` row (`teamId` is `@unique`), so they were moved
to their own disposable labs. Isolation alone did **not** turn them green — but
running them past their first failure surfaced four more dead assertions, every
one of them hidden by the serial cascade:

- `AC4` (link_only opens only at its share token) had the same anonymous-viewer
  bug and **had never once run** — AC3 failed before it in every session.
- `AC7`, `AC10` and `AC12` POST moderation decisions without the `digest` that
  P0-R3 (v0.35.0) made mandatory. Dead for five versions, never reported.

That is the clearest possible evidence for the audit's central claim: a failure
in a serial file does not cost you one test, it costs you everything after it,
and what it hides is more dead assertions.

### 7. The seeder can build from an empty database

`seed-e2e.mjs` now materializes a missing `User` row by reading the **real**
Clerk id from the Clerk API, rather than aborting. The original refusal was
right about the risk (a fabricated `clerkUserId` forks a duplicate identity) and
wrong about the remedy — reading the id from Clerk has neither problem, and it
is what makes the CI lane possible at all.

It also seeds the **ISEF forms catalog**, which nothing else in a CI run does:
`GET /api/fairs/forms` is a pure read and the catalog sweep lives on the
maintenance cron (five-minutely in production, never in CI). A dev database has
been seeded by that cron for months, so the gap only appeared the first time the
full suite met an empty database — the forms tab served `0 / 0` and
`forms-edition-gate.spec.ts` timed out on a title that could not exist. The codes
come from `lib/fairs/forms.ts` itself, so they cannot drift from the ones the
route serves, and `verify:e2e` now fails in two seconds if any are missing rather
than after a seven-minute build.

## Serial mode is gone (and what replaced it)

25 spec files set `test.describe.configure({ mode: 'serial' })`, holding **307 of
379 tests (81%)**. They set it to get ordering — which they already had:
`fullyParallel: false` runs the tests in a file in declaration order on a single
worker, nested describes included. What serial mode actually added was its other
half: **one failure skips every later test in the group.** That is the mechanism
behind the "48 tests never ran" row in the table above and behind the four
assertions that had been dead for five versions without anyone hearing about it.

Serial mode is now removed everywhere. Ordering is unchanged (verified with
`playwright test --list`); a failing test now costs one test instead of a file.

Two consequences to expect:

- **A red run reports more failures than it used to.** Those are not new bugs —
  they are the ones the cascade was swallowing. Read a first red run as a
  backlog, not a regression.
- **A retry no longer re-runs the group.** Serial mode retried a whole group
  together, rebuilding the state chain from `beforeAll`. Without it, CI's single
  retry re-runs only the failed test, against state its predecessors already
  consumed — so a mid-chain test tends to fail its retry too. That errs toward
  reporting failure, which is the right direction.

A file that depends on declaration order says so in a comment above its
describe, and points at `fullyParallel` in `playwright.config.ts`. If that config
value is ever flipped to `true`, those files need real fixtures — not
`mode: 'serial'` back.

## The runtime-error sentinel

`e2e/test.ts` wraps Playwright's `test` with an auto fixture that fails a test
when the page raised an error no assertion covers: an uncaught exception, a
`console.error` (React hydration warnings included), or a same-origin 5xx. Every
spec imports `test`/`expect` from `./test` rather than `@playwright/test`.

A spec that deliberately provokes an error declares it:

```ts
import { test, expect, allowErrors } from './test'
allowErrors(page, /\/api\/fairs\/forms/)
```

Tune the shared allowlist with `E2E_SENTINEL_DEBUG=1`, which prints everything
each test saw, allowed or not, instead of guessing which pattern swallowed what.

Known and permanently allowed: Clerk's bundle tries to spawn a `blob:` worker on
most page loads and our `worker-src 'self'` blocks it (four `console.error`s per
load). Clerk degrades silently and every auth assertion passes, so the CSP is
left alone rather than growing a `blob:` allowance for a third party.

**The allowlist matches on message AND source location, and engines disagree
about both.** Chromium blames `clerk.browser.js` for that worker block; Firefox
and WebKit blame the page. A rule written against the Chromium wording passes
locally and turns both compat lanes red — which is exactly what the first
calibration run did. Match on the stable token (`worker-src`), not the sentence.

### Measured, 2026-08-11 (v0.81.0, production build, one worker)

| | v0.51.0 (last green) | first run | after the fixes |
| --- | --- | --- | --- |
| passed | 309 | 324 | **366** |
| failed | 0 | 42 | **0** |
| skipped | — | 7 | 6 |
| never ran (serial cascade) | 0 | 0 | **0** (mechanism removed) |
| wall clock | 14.8 min | 1.2 h | **27.6 min** |

v0.51.0 was the last green run. Since then the PR gate has run `F1.spec.ts` and
nothing else, so 16 versions shipped with ~97% of the browser suite ungated —
which is the whole argument for making the full Chromium lane required on PRs.
Two of the 42 turned out to be **product bugs users would hit**, not test rot.

The 42 were five causes, not 42 problems:

**1. A production env file was steering the E2E server (18 failures, ~40 min).**
`E2E_BUILD=1` runs `next build && next start` — production mode — and Next loads
`apps/web/.env.production.local` at HIGHER precedence than `.env.local`. On a
maintainer's machine that file is a copy of the real production environment, and
it carries `PYODIDE_SOURCE=r2`. The runtime proxy then served from a bucket the
wheels were never uploaded to, every asset 404'd, the worker never signalled
ready, and all 18 Lab/Code specs waited 150s each on a Run button that never
enabled. Nothing appeared in any log: the fetches happen inside a **Web Worker**,
and `page.on('console')` does not see worker output.

`playwright.config.ts` now sets `PYODIDE_SOURCE=local` (a real process env var
outranks every `.env` file) and `preflight` asserts it took effect. Note the
general hazard: **any** key in `.env.production.local` that is absent from
`.env.local` reaches the E2E production-build server.

**2. Five tests asserted an auth contract retired in v0.78.0.** `febe752e` made
`/api/*` answer an unauthenticated caller with JSON 401 instead of a 307 to
`/sign-in`, because `fetch` follows the redirect and hands back 200 + sign-in
HTML, so `res.json()` dies on `<!DOCTYPE`. The app was right; the tests were
three versions stale. Specs that already accepted `[307, 401]` kept passing —
which is why only five broke.

**3. The Ops Hub hid the Data Terminal before the working phase (product bug).**
v0.80.0 filtered locked tabs out of the hub entirely. That took the Stats and
Charts reference guides with it — reading a student needs precisely while
PLANNING — and made `DatasetsView`'s "unlocks at the Working phase" screen
unreachable dead code, against its own copy ("The guides above are open now").
The tab now always renders; `data_terminal` is still enforced server-side by the
datasets route's 403, which is what that screen was always driven by.

**4. The literature gate is tiered now (product drift).** v0.80.0 made it 10 at
`literature_review` and 20 at `plan_refinement`, leaving 25 as a bonus ceiling.
`issue-6` still asserted a flat `/ 25`; the card reads "0 / 10 sources ready".

**5. Bare `page.goto()` rides a lapsed Clerk token.** Deep into a run the stored
`storageState` token has expired, so a plain navigation renders the page with
every data fetch 401ing. Server-rendered assertions still pass, so this was
invisible until the sentinel saw the 401 burst. The Data Terminal specs now use
`gotoFresh`, which is the convention the rest of the suite already follows.

### The skips (6)

None are load-bearing; most are misfiled rather than genuinely unrunnable.

- **4 static grep checks** (`F11` AC17, `papers-tab` AC10 / PM8, and PM6's
  duplicate-of-AC7) that need no browser. They belong in Vitest, or deleted.
- **1 fixture-conditional** (`team-membership`, "a solo lead sees no
  self-directed member actions") — the E2E lab has two members, so the solo case
  can never run. Manufacturable with a second, single-member disposable lab.
- `F1` AC11 was a **seventh** skip and is now live. It had been skipped since it
  was written, on the belief that Clerk's testing interceptors make a signed-out
  request impossible. That is true of an authenticated context but not of
  `playwrightRequest.newContext({ storageState: undefined })`, which five other
  specs use to get a real 401. The security assertion it names now runs.

## Still open

- **Parallelism.** The suite still runs with one worker. `User.activeTeamId` is
  singular, so one signed-in account owns one lab at a time; going parallel
  needs **one Clerk test account per worker**. That is an owner decision (it
  provisions accounts in your Clerk instance), and it is the only remaining
  change that would move the 13.6-minute runtime materially. Everything above
  is the half that does not need new accounts — and it is the half that removes
  the flakes.
- **Migrating the remaining specs to `createLab`.** All but `a11y` and `pvp` are
  done. Each migration deletes a `beforeAll` full of `deleteMany` calls and
  removes one more reason for CROSS-FILE pollution. It does NOT make a file's
  tests independent of each other: most test a genuinely sequential state
  machine (a later AC reads what an earlier one saved), so they still rely on
  declaration order — see the note below.
- **v0.71.0 silently broke `createLab()` for every consumer, fixed in v0.73.0.**
  `TeamMember.userId` became `@@unique` (one-team-at-a-time) in v0.71.0, but
  `e2e/lab.ts` was never updated for it — every `createLab()` call gave the
  leader a second membership row, which the new constraint rejects. None of
  `synthesis-matrix`/`F4`/`F4-print` had been re-run since, so this went
  undetected for two versions (E2E isn't in the per-commit gate list).
  `createLab` now vacates the leader's existing membership (raw delete, not
  `leaveOtherTeams`) before creating the new one and restores it in
  `dispose()`; a foreign (non-claimed) lab gets no membership row at all.
- **The auth recovery ladder** in `e2e/api.ts` (~150 lines of escalating Clerk
  session recovery) **never fired once** in the production-build baseline. It
  exists for the `next dev` lane, where an idle page's frozen `storageState`
  token lapses. Worth deleting if a few dev-lane runs confirm the same.
- **The CI lane still needs `E2E_ENV_FILE`** — but as of P1-3 it no longer
  skips-and-passes without it. `.github/workflows/e2e.yml` now FAILS on
  same-repository PRs, pushes to `main`/`release/**`, nightly runs and manual
  dispatch when the secret is absent, and skips silently only for fork PRs
  (where GitHub never exposes secrets). Two owner actions remain: **add the
  secret**, and **require the E2E check in branch protection** (Settings →
  Branches) — until then a red lane is visible but not blocking.
  The lane itself is now one job over three matrix lanes (`smoke`, `full`,
  `compat`), composing `.env.local` in a single pass — the old step appended
  `DATABASE_URL`/`DIRECT_URL` onto a secret that already contained them, which
  `e2e/env.ts` rejects as a duplicate key — exporting those two values through
  `$GITHUB_ENV` so the Prisma CLI (which reads `.env`, never `.env.local`), the
  seeder, the server and the runner cannot disagree, and running
  migrate → seed → `verify:e2e` → browser suite in that order.
