# Handoff — scienium

## STATE

Branch `Rig-features`, HEAD at **v0.75.5** (working tree; v0.75.0 was the last handoff), gates
1–5 green — E2E not re-run for v0.75.5, see below.
Vitest **135 files / 1,883 tests**. **64 migrations**, all applied to the local dev DB.
devlab (`cmre80gn50004mb3log7ad2vg`) verified intact after the migration: 25 papers, 11 discovery
nodes. `reset:e2e` leaves **zero stray labs**.

**E2E: 309 passed, 8 skipped (15.3 min)** on the production build (`E2E_BUILD=1`), against
**three genuinely distinct Clerk accounts** — leader `devuser2`, student `devuser4`, teacher
`DevTeacher`. One navigation-abort flake (`net::ERR_ABORTED` on a `page.goto`) in
`lit-explain-it-back`; re-ran the file in isolation, 17/17. The skips are the pre-existing
documented static-check ones.

HANDOFF's previous "Ready to pick up" list — all five items — is **done**. See
`docs/CHANGELOG.md`'s v0.75.0 entry and `REFACTOR2.MD` §0.11's v0.75.0 table.

**v0.75.5 (uncommitted)** closed the notification subsystem: P2-S3, P1-6's notification half,
§0.8's destination verification, and this list's items 4 and 5 (both now removed from it).
Migration `20260728120000_notification_receipts_and_reach` is applied to the local dev DB;
devlab re-verified (25 papers, 11 discovery nodes). **E2E has NOT been re-run since** — the
migration drops `notifications.read_at` and `notification_prefs.email`, and `e2e/F5-bell.spec.ts`
exercises the bell's read state, so run gate 6 before trusting it.

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

---

## WHAT'S ACTUALLY LEFT

### Blocked on the owner — not startable by an agent

| Item | Needs |
| --- | --- |
| **`E2E_ENV_FILE` unset** | A repo secret. Until set, **both CI jobs report "skipped" and pass** — the E2E lane cannot fail CI. Still the highest-leverage item on this list, and now more so: there are 309 green assertions behind that switch. |
| **P1-R6 / S13 / R14** | Branch protection + secrets (repo admin). The workflow files can be written; applying them cannot. |
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
4. **`e2e/api.ts`'s auth recovery ladder** (~150 lines of escalating Clerk session recovery)
   **fired zero times** in the production-build baseline again. It exists for the `next dev` lane.
   Worth deleting if a few dev-lane runs agree.

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
