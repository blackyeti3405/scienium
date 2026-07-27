# Handoff — scienium

## STATE

Branch `Rig-features`, HEAD at **v0.74.0**, working tree clean, pushed.
Gates 1–5 green. Vitest **134 files / 1,852 tests**. **64 migrations**, all applied to the local
dev DB. devlab (`cmre80gn50004mb3log7ad2vg`) verified intact: 25 papers, 11 discovery nodes.

**REFACTOR2 §0.7's 44-file disposition is COMPLETE** (v0.53.0 → v0.74.0). So is **P1-R5**
(activity durability). Read `REFACTOR2.MD` §0.11's **v0.70.0** close-out for the per-row table and
the nine audit readings that turned out wrong.

E2E is **green and honest again**: `upgrades` runs all 14 (it was RED, and silently skipping four
more criteria), `F3-plan-paste` is stable across 3 runs, and the specs covering every changed paid
path pass — `F11-quiz-retry` 13/13, `F13-codex` 16/16, `lit-explain-it-back` 17/17,
`synthesis-matrix` 17/17, `F4` 16/16, `F9` 13/13, `issue-6` 10/10, `F10-teacher-rubric` 16/16.

---

## THE METHOD THAT MADE THIS WORK — keep it

The audit is from 2026-07-23 and **nine of its readings were wrong or materially overstated**.
Every one was caught the same way, and it is the only reason the work was worth anything:

1. **Reproduce the named defect against the CURRENT code before writing a word about it.** Not
   "read it and agree" — write a script, run it, record the real number.
2. **Say so when a reading is wrong, and prove it.** Recorded precedents: `DiscoveryTree`'s
   "cycle-unsafe recursion" (wrong; the real defects were silent node LOSS and a `RangeError`);
   `discoveryStore`'s O(n²) (real at 48ms, hiding an *infinite loop*); `LiteratureFeature`'s
   overlapping panels (unreachable) vs `LabScene`'s (reachable — only `ActivityPanel` has no
   backdrop); `articles.ts`'s host/content-type findings (not live exposures).
3. **Negative-control every guard.** Disable it, watch the specific test fail, restore. This
   caught decoration twice: a `content-length` shortcut and a first version of the openalex
   refusal tests that asserted `toEqual([])` — which is *also* the healthy answer, so three of
   five passed with the guard deleted.
4. **Attribute every E2E failure by stash-and-compare before believing it.** This session had
   four "regressions" that were not: two pre-existing, and **two self-inflicted by killing the
   shared dev server mid-run**. See the traps below.
5. **Declining a row with a stated reason is a valid outcome.** Several rows were closed that way.

---

## TRAPS THAT COST REAL TIME HERE

- **Never `pkill` the dev server.** The Playwright harness owns it. Killing it mid-run produced
  `net::ERR_EMPTY_RESPONSE` and a failed `preflight` that both looked exactly like code
  regressions — twice (v0.66.0, v0.72.0). If a run seems stuck, wait or let it time out.
- **Never run `next build` while an E2E dev server is live.** It corrupts `.next` and reports a
  bogus "Failed to compile". Fix: `rm -rf .next`.
- **A wait loop using `pgrep -f "playwright test"` matches its own command string** and deadlocks.
- **Machine load skews the suite.** At load ~68 (a busy Chrome is enough), four unrelated tests
  fail on hook/duration timeouts and pass in isolation. Check `uptime` before believing a timing
  failure.
- **`test:e2e:file` uses `next dev`.** Dev-only chrome can eat clicks — that was `upgrades` AC12
  for months. Production (`E2E_BUILD=1`) does not render it.

---

## WHAT'S ACTUALLY LEFT

### Blocked on the owner — not startable by an agent

| Item | Needs |
| --- | --- |
| **`E2E_ENV_FILE` unset** | A repo secret. Until set, **both CI jobs report "skipped" and pass** — the E2E lane cannot fail CI. Highest leverage item on this list. |
| **P1-R6 / S13 / R14** | Branch protection + secrets (repo admin). The workflow files can be written; applying them cannot. |
| **P1-R9 retention numbers** | Qualified FERPA/COPPA input. Nine windows; `retention_policies` ships EMPTY on purpose. Also a production-like erasure drill and an approval surface recording WHO approved. |
| **P1-R3 enforcement** | A week of real `ai_usage` rows. Nothing to decide until data exists. `docs/TODO.md` → "AI cost review". |
| **E2E asset reclaim (P1-S15)** | A separate R2 bucket. `nova-lab-assets` is **shared with production** — never delete objects there. |

### Ready to pick up

1. **`app/(public)/showcase/[slug]/page.tsx`** — `generateMetadata` and the page each call
   `loadShowcase()`/`resolveShowcaseViewer()` independently, so **every public showcase view runs
   the same Prisma queries twice**; neither is `React.cache()`-wrapped. Separately `ResourceLink`
   renders `metadataJson.url` into `href` with no render-time scheme check — safe today only
   because the write path validates, so it is the defense-in-depth gap `SourceReader`/
   `IdeaCheckView` closed in v0.64.0. Both confirmed live in v0.67.0.
2. **`components/fair/FormsChecklist.tsx`** — the initial GET never checks `r.ok`; `cycleStatus`'s
   PATCH failure is a bare `catch {}`, so a rejected status update gives the student no signal.
   Use the retry-banner shape `LiteratureFeature`/`CodexTab`/`ExperimentDetail` already share.
3. **Migrate the remaining specs to `createLab()`** — ~6 of 32 done. Each deletes a `beforeAll` of
   `deleteMany` calls and removes one reason for `mode: 'serial'`. **Read `e2e/lab.ts` first:** it
   now vacates and restores the leader's membership, because `TeamMember.userId` is `@@unique`.
4. **P1-R8 leftovers** — teacher-initiated lead reassignment; a removal notification; a reader for
   `ClassMembershipEvent` (the log exists and nothing surfaces it).
5. **Synthesis 409 copy** — tells the student their grid changed but not *what* changed.

### Deliberately not done — do not "fix" without a reason

- **`app/globals.css`** (3,051) and **`prisma/schema.prisma`** (2,282). No behaviour attached,
  real regression surface. The schema's valuable half (tenant invariants, dropping vestigial
  fields like `Team.classId`) is a data-migration project needing the owner's call.
- **`VocabPanel.tsx`** — its own verdict found no defect.
- **73 dev-only art generators** — out of scope by §0.7's own classification.
- **PvP** — owned by a separate developer; excluded from pilot accounting.

---

## CONVENTIONS — follow them, don't invent new ones

- **Claim BEFORE the paid call**, conditional-stamp column with a TTL, released on failure.
- **Terminal writes are compare-and-set**, never an unconditional `update`. Monotonic: never lower
  a pass or a best score. (v0.68.0 found a live lost update violating exactly this — a codex
  re-pass erased the first-completion time and concurrent failures left `bestScore` at 20
  instead of 60.)
- **Domain write + activity record commit in ONE transaction** (`recordActivity(tx, …)`).
  `test/activity-durability.test.ts` asserts an EMPTY list — a new best-effort write of a
  durable-class action fails it immediately.
- **Never hold a DB transaction across a network call.** Compute first, open the transaction after.
- **Provider AND own-API output gets a `safeParse`, never a cast.** A cast let a 429 body become
  the Codex payload and crash the tab (v0.58.0).
- **A failed write must be visible to the user.** Established shapes: `writeError` + nonce →
  Toast (v0.56.0), a retry in the failed thing's place (v0.59.0), refuse-to-exit (v0.54.0).
- **One `SaveQueue` per entity** (`lib/save-queue.ts`) — it coalesces, so sharing one across two
  entities silently drops the first's write.
- **Any migration adding a unique index MUST dedupe or quarantine first** — enforced by
  `test/migration-unique-index-policy.test.ts`, which wants a `ROW_NUMBER()`/`GROUP BY`/`MIN()`
  keeper form. v0.71.0 is the worked example, including a step that was written and then removed
  for over-reaching.
- **Tests pin the ATTACK, not the shape.** And a test that restates the fix rather than exercising
  the code cannot fail on a regression — say "unpinned" instead.
- **If a change has a user-facing surface, build the UI in the same batch.**

## OPERATIONS

- Use **ponytail** for all fixes.
- Gates from repo root, in order: `shared-types build`, `check:integrity`, `typecheck`, `lint`,
  `build`. Run Vitest every iteration.
- Migrations: `set -a && source .env.local && set +a && npx prisma migrate deploy` from
  `apps/web`. Never `migrate dev`; never `migrate diff` with `shadow=DIRECT_URL`. Applying to the
  local dev DB is pre-authorised. **After any migration, verify devlab survived AND re-run an E2E
  spec that uses `createLab()`** — v0.71.0 passed vitest and still broke the E2E fixture.
- A full DB backup + per-table row manifest is in `backups/` (gitignored).
- Commit + push to `Rig-features` after each finding. **Never open a PR or merge to main without
  asking.** No AI co-author trailer.
- Update `docs/CHANGELOG.md`, `REFACTOR2.MD` §0.11, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`,
  `docs/SPEC.md`, `docs/TODO.md` as part of each batch, not afterwards.
- **Record what each fix STILL OWES.** That honesty is the point — and correct the register when
  you prove it wrong.
