# Runbook: the E2E suite — how it works, why it flaked, what changed

_Audit + rebuild, 2026-07-26 (v0.51.0). Measured, one worker, production build:_

| | baseline | after |
| --- | --- | --- |
| passed | 263 | **292** |
| failed | 10 | **2** |
| never ran (serial cascade) | 48 | **13** |
| wall clock | 13.6 min | 15.5 min |

_The suite got **slower**, and that is the point: 35 tests that used to be skipped
by a `mode: 'serial'` cascade now actually execute. A fast run that silently
skipped 15% of itself was not a faster suite._

## Run it

```bash
pnpm --filter web reset:e2e   # clear the fixture lab's accumulated content
pnpm --filter web seed:e2e    # rebuild the fixture graph (idempotent)
pnpm --filter web test:e2e    # full suite, production build
```

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
| **Known-failing, diagnosed** | 2 | `F4` AC3 and `F4-print` AC10 — see below. |

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

### 5. The seeder can build from an empty database

`seed-e2e.mjs` now materializes a missing `User` row by reading the **real**
Clerk id from the Clerk API, rather than aborting. The original refusal was
right about the risk (a fabricated `clerkUserId` forks a duplicate identity) and
wrong about the remedy — reading the id from Clerk has neither problem, and it
is what makes the CI lane possible at all.

## Still open

- **Parallelism.** The suite still runs with one worker. `User.activeTeamId` is
  singular, so one signed-in account owns one lab at a time; going parallel
  needs **one Clerk test account per worker**. That is an owner decision (it
  provisions accounts in your Clerk instance), and it is the only remaining
  change that would move the 13.6-minute runtime materially. Everything above
  is the half that does not need new accounts — and it is the half that removes
  the flakes.
- **Migrating the 32 existing specs to `withLab`.** The primitive exists and is
  documented; the specs still use the shared lab.
- **`F4` AC3 and `F4-print` AC10.** Both assert that a viewer who should not see a
  showcase gets the not-found page, and both fail. **The product gate is correct** —
  verified directly, outside Playwright, against a `next dev` server and a `next
  start` production build: an anonymous request for a `published + public +
  pending_review` showcase renders "This page could not be found", and so does a
  `private` one. `canViewShowcase` returns false for a null viewer in every
  non-live case, and `/showcase/[slug]` builds as `ƒ` (dynamic), so no cached
  render is being served.

  What is NOT yet understood is why the spec's own anonymous context sees the page
  when a hand-rolled one does not, and why the `PUT /api/showcase` responses these
  tests assert on disagree with the row afterwards. `Showcase.teamId` is `@unique`,
  so both files drive ONE row — the leading hypothesis remains contention, and
  migrating both to `createLab()` is the change that would settle it. Recorded as
  failing rather than skipped: a red test with a written diagnosis is worth more
  than a green one that proves nothing.

  `F4-print` AC10 additionally had a genuinely wrong premise, now fixed: it used
  the seeded **teacher** as the "non-owner who can never qualify", but P0-R3
  (v0.35.0) gave the team's own teacher moderator preview of every revision. It
  uses a signed-out visitor now, matching the correction `F4` AC3 already carried.
- **The auth recovery ladder** in `e2e/api.ts` (~150 lines of escalating Clerk
  session recovery) **never fired once** in the production-build baseline. It
  exists for the `next dev` lane, where an idle page's frozen `storageState`
  token lapses. Worth deleting if a few dev-lane runs confirm the same.
- **The CI lane is still gated on `E2E_ENV_FILE`** and therefore still reports
  "skipped: secrets not configured". Adding that secret is what turns any of
  this into an enforceable gate.
