# Handoff — scienium

## STATE

Branch `Rig-features`, HEAD at **v0.75.11**, **all six gates green**.
Vitest **161 files / 2,490 tests** (was 135 / 1,883 at v0.75.0). **69 migrations**, all applied
to the local dev DB. devlab (`cmre80gn50004mb3log7ad2vg`) verified intact after every migration:
25 papers, 11 discovery nodes. `reset:e2e` leaves **zero stray labs**.

**E2E: 319 passed, 8 skipped, 0 failed (20.0 min)** on the production build (`E2E_BUILD=1`) from
a clean fixture, against **three genuinely distinct Clerk accounts** — leader `devuser2`, student
`devuser4`, teacher `DevTeacher`. The skips are the pre-existing documented static-check ones.

**v0.75.1–v0.75.11 closed the 26 REFACTOR2 rows that were code-only and unblocked** — the whole
P2-S phase-two block except the owner-blocked ones, SVC-1, P2-1, P2-3, P2-4, P2-6, P1-1, P1-5,
P1-6, P1-R14, §0.9's client-state/a11y families, and two §0.8 product gaps. See `docs/CHANGELOG.md`
and `REFACTOR2.MD` §0.11 for the per-version tables, and §0.11's v0.75.10 entry for what the two
test-truth audits found.

What is left in REFACTOR2 is either **owner-blocked** (the `E2E_ENV_FILE` secret, branch
protection, FERPA/COPPA retention numbers, a separate R2 test bucket, a week of real `ai_usage`,
the ISEF reviewer sign-off) or **not code** (the restore drill, the measured capacity test,
production identity/data-plane verification, domain-expert content review, the tiny-text size
product call, and the 18 remaining Codex fields).

---

## THE METHOD THAT MADE THIS WORK — keep it

Unchanged from the last handoff, and it earned its keep again this session. Three failures in the
first full run looked like one thing and were three different things, and only reproducing each
in isolation told them apart:

1. **Reproduce the named defect against the CURRENT code before writing a word about it.**
2. **Say so when a reading is wrong, and prove it.** New precedent this session: a Playwright
   failure reading `<div class="feature-panel__backdrop"> intercepts pointer events` looked
   exactly like the known building-hitbox class and was nothing of the sort — see the traps below.
3. **Negative-control every guard.** The class-removal notification was verified by disabling the
   `notifyRemoved` call and watching exactly the two positive tests fail (the three that assert
   ABSENCE correctly stayed green — which is itself the reason to run the control).
4. **Attribute every E2E failure by stash-and-compare before believing it.** `F4` AC11 was
   attributed this way and was not caused by the change under suspicion.
5. **Declining a row with a stated reason is a valid outcome.** Five specs were deliberately NOT
   migrated to `createLab`, each annotated in-file with why.

---

## TRAPS THAT COST REAL TIME HERE

Everything from the previous handoff still applies (never `pkill` the dev server; never
`next build` while an E2E server is live; `pgrep -f "playwright test"` matches itself; machine
load skews the suite; `test:e2e:file` uses `next dev`). New this session:

- **`.env.local` first-wins vs `source` last-wins.** `e2e/env.ts` takes the FIRST value of a
  duplicated key (a CI secret must beat the file); shell `source` takes the LAST. So appending a
  corrected credential below a stale one reads as fixed to you and is ignored by the runner. It
  cost a full suite run and, worse, was destructive: the "student" role silently signed in as the
  LEADER, so `team-membership`'s *a non-lead cannot remove anyone* ran AS the lead, got its 200,
  and removed a real member from the shared fixture. `loadTestEnv` now throws naming both lines.
- **`*_IDENTIFIER` is the Clerk USERNAME, not the email.** Sign-in with an email is rejected by
  this instance even when the password is right and the address is on the account. The only
  symptom is `auth.setup.ts`'s generic "failed to authenticate — check the E2E creds", which
  points at the password. Verify the password independently
  (`POST /v1/users/<id>/verify_password`) before touching it.
- **A `createLab` label becomes the team NAME, and `getByRole(name:)` matches SUBSTRINGS.**
  The team name is the accessible name of the status strip's team button. `createLab('rubric-
  self-check')` made `getByRole('button', { name: 'Self-check' })` resolve to the *team button*
  instead of the Fair Hub tab — and because the status strip sits BEHIND any open feature panel,
  the symptom was `feature-panel__backdrop intercepts pointer events`, retried to timeout. That
  reads exactly like a building-hitbox problem and is not one. Keep labels free of words that
  appear in clickable UI text. The rule is in `createLab`'s doc comment.
- **A disposable lab is not a smaller shared lab — it is an EMPTY one.** Two specs failed because
  the shared fixture had been supplying a precondition by accident: the momentum card renders
  nothing when every stat is zero (`MomentumCard`'s `quiet` guard), so F10 now seeds one project
  log explicitly. If a migrated spec fails on "element not found", ask what the old lab was
  quietly providing.
- **`next dev` route compilation blows the 30s hook budget.** Two "failures" while iterating were
  `beforeAll` timeouts on the FIRST request to a cold route. Judge E2E on `E2E_BUILD=1`; the
  single-spec dev lane is for iteration only.
- **A route module may not export a constant.** `export const MAX_EXPERIMENTS_PER_TEAM` in an
  `app/api/**/route.ts` typechecks, lints, and then fails `next build` with "not a valid Route
  export field" — twelve minutes into the E2E lane, which is where it actually surfaced. Put the
  constant in `lib/` and import it from both sides. `test/route-guard-sweep.test.ts` now fails on
  any non-Next export, so this costs seconds instead of a suite run.
- **`pnpm --filter web test` contends with a live E2E run.** See OPERATIONS — the pg lane is not
  DB-free. Two "regressions" in a full run were chased before it turned out a unit-test run had
  been hitting the same database. Reproduce a suite failure in isolation before attributing it,
  and check what else was running.
- **A stale Clerk session presents as an element timeout, not an auth error.** `F10-teacher-rubric`
  AC9 failed fourteen minutes into a run looking for a criterion card, and passed 16/16 alone. A
  bare `page.goto` carries the frozen `storageState` token, 307s to sign-in, and the spec then
  waits 20s for an element on the wrong page. Every authenticated navigation goes through
  `gotoFresh` now; keep it that way when writing a new spec.
- **Adding an ARIA role changes what `getByRole` matches.** Giving `TopicSearch`'s results
  `role="option"` (correct for a listbox) overrode their implicit button role and broke two ACs
  that looked like a discovery regression. When an a11y change lands, grep the specs for the old
  role before assuming the product broke.

---

## WHAT'S ACTUALLY LEFT

### Blocked on the owner — not startable by an agent

| Item | Needs |
| --- | --- |
| **`E2E_ENV_FILE` unset** | A repo secret. Until set, **both CI jobs report "skipped" and pass** — the E2E lane cannot fail CI. Still the highest-leverage item on this list, and now more so: there are 319 green assertions behind that switch. |
| **P1-R6 / S13** | Branch protection + secrets (repo admin). The workflow files can be written; applying them cannot. **P1-R14 is CLOSED** (v0.75.1): `ci.yml`'s Test step now has a `services: postgres` block and the pg suite THROWS rather than skips when `CI` is set. |
| **P1-R9 retention numbers** | Qualified FERPA/COPPA input. Nine windows; `retention_policies` ships EMPTY on purpose. Also a production-like erasure drill and an approval surface recording WHO approved. |
| **P1-R3 enforcement** | A week of real `ai_usage` rows. `docs/TODO.md` → "AI cost review". |
| **E2E asset reclaim (P1-S15)** | A separate R2 bucket. `nova-lab-assets` is **shared with production** — never delete objects there. |

### Ready to pick up

1. **A second LEADER account, for parallelism.** The student slot is now a real second account
   (`devuser4`), which closed the co-member gap — but the suite is still one worker, because
   `User.activeTeamId` is singular and parallelism needs one **leader** per worker, not one more
   account of any kind. That change is per-worker account resolution in `roles.ts` and `lab.ts`,
   and is worth doing on its own rather than folded into a credentials swap.
2. **Dropping `mode: 'serial'`, file by file.** Every migrated spec still sets it. A disposable
   lab isolates a spec from its NEIGHBOURS, not its own tests from each other, and most of these
   files genuinely test a sequential state machine (a later AC reads what an earlier one saved).
   This is a per-file judgement and was deliberately kept out of a mechanical migration — but it
   is where the remaining wall-clock is.
3. **The building hitbox, for real.** `createLab` now seeds the same gateway spread the seeder
   does, so the E2E no longer trips on it — but that is the E2E being honest about the problem,
   not the problem being fixed. In the DEFAULT layout the Operations Hub's silhouette covers
   Discovery's centre; a student on a fresh lab has to find an unoccluded corner. The seed is in
   two places now (`prisma/seed-e2e.mjs` and `e2e/lab.ts`) and kept in step by hand.
4. **`e2e/api.ts`'s auth recovery ladder** (~150 lines of escalating Clerk session recovery).
   It fired zero times in earlier production-build baselines — but do NOT delete it on that
   evidence now: v0.75.1's sweep routed all 152 bare `page.goto` calls through `gotoFresh`, whose
   own re-sign-in branch is part of that ladder, and a stale-session navigation was exactly what
   made `F10-teacher-rubric` AC9 fail fourteen minutes into a run. Re-measure before deciding.

### Deliberately not done — do not "fix" without a reason

- **Five E2E specs stay on the shared fixture**, each annotated in-file: `smoke` /
  `settings-smoke` / `F8-reports` are read-only (and F8's invariant compares reports against the
  WHOLE roster, which an extra team would change); `data-requests` because `DataRequest` is keyed
  by subject user, not team; and **`team-membership`**, which is a hard no — `createLab` works by
  deleting and recreating the very `TeamMember` rows that file exists to test.
- **`app/globals.css`** (3,051) and **`prisma/schema.prisma`** (2,300). No behaviour attached,
  real regression surface. The schema's valuable half (tenant invariants, dropping vestigial
  fields like `Team.classId`) is a data-migration project needing the owner's call.
- **`VocabPanel.tsx`** — its own verdict found no defect.
- **73 dev-only art generators** — out of scope by §0.7's own classification.
- **PvP** — owned by a separate developer; excluded from pilot accounting.

---

## CONVENTIONS — follow them, don't invent new ones

- **Claim BEFORE the paid call**, conditional-stamp column with a TTL, released on failure.
- **Terminal writes are compare-and-set**, never an unconditional `update`. Monotonic: never lower
  a pass or a best score.
- **Domain write + activity record commit in ONE transaction** (`recordActivity(tx, …)`).
  `test/activity-durability.test.ts` asserts an EMPTY list — a new best-effort write of a
  durable-class action fails it immediately. **The same reasoning now covers user-facing
  notices**: v0.75.0's class-removal notification is written inside the removal's transaction,
  because a best-effort write afterwards is precisely the shape that produces a student who was
  removed and never told.
- **A globally-unique `dedupeKey` inside a transaction is a rollback risk.** Key it to something
  unique by construction (v0.75.0 uses the `ClassMembershipEvent` id, v0.75.5 the
  `TeamMembershipEvent` and `ShowcaseModerationEvent` ids) — a (subject, scope) key collides on
  the second occurrence and takes the domain write down with it. A wall clock in the key is the
  opposite failure and just as bad: nothing ever collides, so a retried transaction writes a
  second notice silently. `test/notification-durability.test.ts` asserts both lists EXACTLY.
- **A notification row is an EVENT, not a per-person copy.** `dedupeKey` is globally unique and
  `NotificationEmail.dedupeKey` joins on it, so read state is a receipt (`NotificationRead`) and
  never a fan-out, and `Notification.teamId` is nullable because a notice about a membership that
  ENDED outlives the team it names. The bell shows *anything addressed to me* plus *team-wide rows
  for the team I am acting as* — widening the first clause must never widen the second.
- **Never hold a DB transaction across a network call.** Compute first, open the transaction after.
- **Provider AND own-API output gets a `safeParse`, never a cast.**
- **A failed write must be visible to the user.** Established shapes: `writeError` + nonce →
  Toast, a retry in the failed thing's place, refuse-to-exit. v0.75.0 added the load/write
  retry-banner pair to `FormsChecklist`, matching `LiteratureFeature`/`CodexTab`/`ExperimentDetail`.
- **Two commands that authorize on different facts stay two commands.** Not one function with a
  flag — `transferLead` proves the actor IS the lead, `reassignLeadAsTeacher` proves they OWN the
  team, and they share only a private helper that authorizes nothing.
- **Scope a teacher read in the WHERE clause, never after the fetch.** `loadClassHistory` puts
  `classIds` in the query because a student's history can include another teacher's class.
- **One `SaveQueue` per entity** (`lib/save-queue.ts`) — it coalesces.
- **Any migration adding a unique index MUST dedupe or quarantine first** — enforced by
  `test/migration-unique-index-policy.test.ts`.
- **Tests pin the ATTACK, not the shape.** A test that restates the fix rather than exercising the
  code cannot fail on a regression — say "unpinned" instead.
- **If a change has a user-facing surface, build the UI in the same batch.**

## OPERATIONS

- Use **ponytail** for all fixes.
- Gates from repo root, in order: `shared-types build`, `check:integrity`, `typecheck`, `lint`,
  `build`. Run Vitest every iteration.
- **`pnpm --filter web test` IS NOT DB-FREE.** `test/pg/invariants.pg.test.ts` loads `.env.local`
  itself and runs against the live dev Postgres — that is the point (P1-R14: it is the only
  true-concurrency lane and it now fails rather than skips in CI). Its fixtures are namespaced
  `pgtest_<uuid8>` and self-cleaning, so it does not corrupt data, but do **not** run the suite
  while a browser E2E run is live: the two contend for the same database and the E2E failures
  that result look like product regressions. Scope it out with
  `pnpm --filter web test -- --exclude 'test/pg/**'` when something else holds the DB.
- E2E: **judge on `pnpm --filter web test:e2e` (`E2E_BUILD=1`)**, from a clean fixture
  (`reset:e2e` then `seed:e2e`), with nothing on port 3000. `test:e2e:file` is `next dev` and is
  for iteration only — cold-route compilation alone can blow a 30s `beforeAll`.
- Migrations: `set -a && source .env.local && set +a && npx prisma migrate deploy` from
  `apps/web`. Never `migrate dev`; never `migrate diff` with `shadow=DIRECT_URL`. Applying to the
  local dev DB is pre-authorised. **After any migration, verify devlab survived AND re-run an E2E
  spec that uses `createLab()`.**
- A full DB backup + per-table row manifest is in `backups/` (gitignored).
- Commit + push to `Rig-features` after each finding. **Never open a PR or merge to main without
  asking.** No AI co-author trailer.
- Update `docs/CHANGELOG.md`, `REFACTOR2.MD` §0.11, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`,
  `docs/SPEC.md`, `docs/TODO.md` as part of each batch, not afterwards.
- **Record what each fix STILL OWES.** That honesty is the point — and correct the register when
  you prove it wrong.
