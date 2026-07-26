# scienium — Changelog

All notable changes to this project are documented here.  
Format: `## [version] — YYYY-MM-DD` with sections: **Added**, **Changed**, **Fixed**, **Removed**.

---

## [0.50.0] — 2026-07-26

### Fixed — "Check my synthesis" could grade cells the student could not see (P1-R13)
Synthesis cells save asynchronously on blur, and the click that starts a check blurs the textarea
in the same gesture. `runCheck` fired immediately with no flush barrier and no way to say *which*
grid it meant, so the paid server check could read the **previous** database value — return a
verdict for it, cache that verdict as the matrix's standing check, and mint KP for content that
was not on screen. That is a KP-minting correctness bug, not a cosmetic race.

Four things now bind one check to one snapshot:

- **Saves are serialized.** Cell PATCHes go through one promise chain, so two overlapping saves
  can no longer resolve out of order and leave an *unsaved* cell looking saved.
- **The check flushes first.** `runCheck` awaits that chain, then PATCHes everything still dirty
  in **one** request, and refuses to spend at all if anything remains unsaved — a failed save
  stops the paid call instead of being graded around. Dirty cells are **derived** from
  `matrix.cells` (refreshed by every successful PATCH response) rather than tracked in a
  hand-maintained registry: a saved cell leaves the set on its own, and a failed save stays in it.
- **The client says which grid it means.** `toMatrixView` now returns a server-issued `inputHash`
  on every create/get/patch; the check echoes back the last one it received, and the server
  **409s before any spend** if its own grid no longer hashes to it. Server-issued rather than
  client-computed — the same echoed-digest CAS the showcase moderation decision uses, and it keeps
  sha256 out of the browser. The client reloads the matrix on a 409 so the next click carries a
  hash the server agrees with.
- **The commit re-checks.** The paid call takes seconds and a teammate can edit during it, so the
  transaction re-reads the whole matrix — cells *and* columns *and* papers — and re-hashes. If the
  grid moved, the verdict is still returned (it is true of what was submitted) but **nothing is
  cached and no KP is minted**, and the panel says so.

`runAiOperation` now wraps the call as well: the existing `lastCheckJson` replay cache only ever
helped *sequential* re-checks — two concurrent clicks both read it before either wrote, and both
paid. The loser now replays or is told to ask again.

### Fixed — a static E2E assertion that had been failing silently since v0.45.0
`synthesis-matrix.spec.ts` AC14 asserted "exactly one `anthropic().messages.create(` call site".
v0.45.0 moved the call behind the `aiCreate` registry door and never updated it, so the regex had
been matching **zero** ever since — the spec had simply not been run. It now pins
`aiCreate('synthesis_check'` and additionally asserts no direct `anthropic().messages.` call, which
is the stronger invariant: the money still goes through the one door that carries the kill switch
and spend accounting.

### Changed
- Ownership is now checked **before** body validation on the check route, so a foreign matrix id
  404s whatever the body says and a caller cannot tell "malformed" from "not yours".

### Verification
Gates 1–5 pass. Vitest: **119 files / 1,640 tests** (+1 file, +7). New
`test/synthesis-stale-check.test.ts` pins the attack, not the shape — the stale grid is refused
before `runAiOperation` or `aiCreate` is reached, a mid-call edit stores nothing and mints nothing
(cell text *and* column changes), an omitted hash is a 400, and a concurrent identical check does
not pay twice. **Negative control run:** with both guards disabled, three of those tests fail; with
them restored, all pass. `e2e/synthesis-matrix.spec.ts` **run against the live dev server: 18
passed**, including the new AC16, which fills a cell, clicks check *without* blurring, and then
proves the graded snapshot was the on-screen one by asserting an immediate re-check replays from
cache — which can only happen if the first check's stored digest describes the current grid.

**Not visually exercised:** the stale-verdict banner. Rendering it needs a teammate edit landing
mid-call; an attempt to force it with a rewritten response failed for reasons of its own and was
reverted rather than left in the suite. Its markup is one `<span>` beside the already-covered
"cached" notice.

## [0.49.0] — 2026-07-26

### Added — export and erasure become system behaviour (P1-R9)
The deletion/export runbook described a manual post-pilot process: an operator, psql, a list of
tables, and the hope of getting the order right every time. Nothing reconciled Clerk identity
against database rows, a half-finished erasure left no record of how far it got, and
`ShowcaseView` fingerprints accumulated forever with no schedule of any kind.

**The workflow.** A student files a request in Settings → *Your data*; an operator approves it;
a nightly worker executes it. The shape reuses what this codebase already trusts for work that
must not run twice and must not stop halfway:
- **Filing is idempotent** per subject/kind/UTC day, on a JSON-framed digest — a double click is
  one erasure (`AiOperation`'s shape).
- **Approval is a compare-and-set** by whoever holds `CRON_SECRET`. There is deliberately **no
  in-app approve button**: the authority to erase a minor's record belongs to the school, and
  putting that button in the product is how it gets clicked by accident.
- **The claim is fenced** with a token and a 10-minute lease, so two overlapping crons cannot
  both erase (`PaperProcessingJob`'s shape).
- **Each external system is a step row**, `(request_id, target)` unique — so a run that dies
  after deleting the Clerk identity resumes at the *next* step rather than re-deleting it or
  silently skipping storage retirement (`NotificationEmail`'s outbox shape).

**Erasure, in order:** Clerk identity (auth dies first), then unbound uploads flipped to
`orphaned` for the existing reclaim sweep — never a direct object delete — then, in one
transaction, every live membership departed through the real `departTeam` command (so a leaving
lead still hands over and a last member still archives the lab), every per-student row deleted,
and the `users` row **tombstoned**.

**Why tombstoned rather than dropped.** Team-shared work the student authored — project logs,
discovery nodes, the synthesis matrix, experiments, purchased buildings — carries a *required*
FK to `users`. The runbook's standing policy is that team artifacts stay with the team, so the
row has to survive; what makes it an erasure is that `name`, `email` and `clerk_user_id` are
overwritten with values that identify nobody and route nowhere, and `deleted_at` is stamped. A
true row-level delete would need eight tables' attribution columns to become nullable first, and
that is recorded as owed rather than done.

**One inventory, both directions.** `lib/data-requests/inventory.ts` is the single list that
export reads and erasure deletes, so the two can never disagree about what "this student's data"
means — the drift that eventually breaks every pair of hand-written procedures.
`test/data-inventory-drift.test.ts` parses `schema.prisma` and fails if the list names a model or
column that no longer exists, and pins the **keep** decisions by name so moving one into the
erasure set is a deliberate edit with a test to update.

**Exports go to storage, not to the browser.** `data-exports/<requestId>.json` in R2, fetched and
delivered through the school's channel. An export bundle is the densest personal artifact this
system can produce; it must never leave through an unverified channel, which is what the runbook
already said and what the UI now says too.

### Added — a retention mechanism that ships with no numbers in it
`retention_policies` is a per-model table that is **empty on purpose**. `lib/retention/policies.ts`
declares which models can be pruned and how; a row in the table is the number of days that turns
one on. **No row and no registry default means never pruned** — the fail-safe direction is keep,
and the tests pin that a 400-day-old row in an unreviewed model survives.

Exactly one default ships, because exactly one was endorsed: `showcase_view` at **90 days**. Those
rows are pseudonymous visitor fingerprints with unbounded growth and no product use past the
daily-count aggregate they already fed. The 90 is flagged in `docs/TODO.md` → "Retention windows"
as still needing confirmation, alongside the eight models whose windows are blank because
FERPA/COPPA input the project does not have is what decides them.

### Added — routes, UI, schedule
- `GET`/`POST /api/data-requests` — the subject's own requests. Deliberately **not** behind
  `requireTeamContext`: a student who has just left their lab is exactly the person most likely
  to want a copy or an erasure, and gating on having a team would lock out the case it exists
  for.
- `GET`/`POST /api/cron/data-requests` — the scheduled pass and the operator decision, both
  behind the existing `assertCron` shared-secret guard.
- Settings → **Your data**: two asks, a two-step deletion that states its consequence before the
  second click, and a status list. The copy is explicit that a copy is delivered through the
  school rather than downloaded, and that the lab's shared work stays with the team either way.
- `vercel.json` gains a nightly `03:30` cron.

### Fixed — three errors in the deletion runbook's inventory
Corrected while building the real list against the schema: `discovery_source_visits` is **not**
per-student (it is the team's once-ever KP claim for a source — deleting it lets the source be
farmed for KP again, per P1-S14), and `DiscoveryKpDay`, `PvpTrophies` and `PvpRaidQuota` carry no
user id at all — they are team-scoped and were listed under per-student rows in error.

### Verification
Gates 1–5 pass. Vitest: **118 files / 1,633 tests** (+3 files, +23). Migration
`20260726200000_data_requests_and_retention` applied to the local dev database; devlab verified
intact afterwards (25 papers, 11 discovery nodes, 25 quiz sessions, 25 proficiencies, 12 vocab
cards) and all three new tables confirmed empty. New `e2e/data-requests.spec.ts` **run against
the live dev server: 4 passed**, and the section was screenshotted rather than inferred from a
passing typecheck. The spec is non-destructive: it files an export request, asserts the account
is untouched and that a re-click replays the same row, and deletes the request afterwards.

## [0.48.1] — 2026-07-26

### Added — the membership commands are reachable (P1-R8 follow-up)
v0.48.0 shipped `DELETE /api/team/membership`, `POST /api/team/lead`, and
`DELETE /api/team/members/[userId]` with **no UI**. For a finding whose text was "there is no
leave command", three endpoints a student cannot click fixed nothing they could observe. That was
a half-delivery and is corrected here.

`TeamPanel` now carries the lifecycle:
- **Per-member actions for the lead** — hand over the lead role, or remove a researcher. Never
  shown against your own row: removing yourself is *leaving*, which has different consequences and
  must be chosen deliberately rather than reached through the wrong verb.
- **Leave, for anyone, stating its consequence first.** The copy changes with the situation — the
  last researcher out is told the lab will be archived and that its sources, logs and showcase are
  kept and stay visible to their teacher; a departing lead is told by name who takes over. Those
  are exactly the outcomes a student would not predict from the word "leave". A confirm step
  follows, and leaving navigates to onboarding since there is no longer an active lab.
- `GET /api/team` now returns each member's internal `userId`, which the lead's actions target.

**Switching labs needed no new UI** and has none: entering another lab's join code on the existing
join screen departs the current lab in the same transaction. One lab at a time.

### Verification
Gates 1–5 pass. Vitest: 115 files / 1,610 tests (unchanged — this is UI over tested services).
New `e2e/team-membership.spec.ts`, **run against the live dev server: 6 passed, 2 skipped**, and
the panel was screenshotted in both states to confirm it renders rather than merely compiles. The
spec is deliberately non-destructive — it never leaves a lab or moves the lead role, because the
fixture graph is shared with every other spec. Two cases skip cleanly on the solo fixture lab
rather than seeding a second member and rearranging that graph.

## [0.48.0] — 2026-07-26

### Added — team membership finally has a lifecycle (P1-R8)
Two owner decisions, made on 2026-07-26 and encoded in the code rather than left to convention:
**one team at a time**, and **archive rather than delete** when the last member leaves.

Before this there was no lifecycle at all. `TeamMember` permitted the same user in several teams;
joining a new team added a membership and repointed `activeTeamId` while leaving the old one live
forever; and there was no leave, remove, lead-transfer, or disband command anywhere in the app.
That mattered because **teacher visibility is derived from membership** — a membership nobody ever
ended was a teacher who could still open a team they no longer taught.

`lib/team/membership.ts` owns every transition, and every one commits in a single transaction
with its consequences:
- **One team at a time.** Joining departs every other live membership in the same transaction.
- **The final lead is protected by handover, not refusal.** A departing lead hands the role to
  the longest-standing remaining member — a team whose lead left the school must not be stuck.
- **The last member archives the team.** The work (papers, showcase, logs, uploaded PDFs) is the
  class's product; a student walking away must not destroy it. Unused invites are retired so an
  old code cannot resurrect an archived lab.
- **`activeTeamId` is cleared with the departure**, so a user is never pointed at a team they are
  no longer on.

New commands: `DELETE /api/team/membership` (leave), `POST /api/team/lead` (hand over),
`DELETE /api/team/members/[userId]` (lead removes a member). Removing *yourself* through the
remove route is refused — leaving has different consequences and should be chosen deliberately,
not reached through the wrong verb.

**`TeamMember` stays live-only.** Departures append to a new `TeamMembershipEvent` log carrying
actor, reason, and timestamp. A `leftAt` tombstone was the obvious alternative and was rejected:
it needs a filter at ~25 read sites, several of them nested (`team.members.some(...)`) where no
Prisma client extension can reach — and one forgotten filter is not untidy data, it is a live
authorization leak. Live-only makes every one of those queries correct without touching them.

`teacherOwnsTeam` gained an archived-team arm that reads the event log. Without it, archiving a
team would have dropped it out of the teacher's view entirely and taken the class's work product
with it — the opposite of what archiving is for. It is deliberately archived-only: a **live** team
a student left must still fall out of scope, which is the stale-authorization hole this finding
was about.

### Changed — the destructive-capability matrix is now a recorded decision, not a gap (P1-R1)
P1-R1's remainder asked who may destroy shared team work. Reviewed: lead-only, lead-plus-teacher
override, and making a topic change mark papers out-of-scope instead of deleting them. **The owner
chose to keep today's behaviour — any team member may.** In a three-peer lab a permission gate adds
friction without matching safety gain, and the destructive paths already sit behind a
server-issued, single-use, target-bound proposal (v0.38.0) rather than a client assertion.

Recorded as an accepted risk alongside open teacher registration: one student can still delete 25
papers their team collected, deliberately, through two confirmed steps. That is now a documented
choice rather than an oversight.

### Still owed
The **class half of P1-R8 is untouched** — a newly approved class still overwrites `User.classId`,
older approved join-request history remains, and there is no class transfer/withdraw/revoke
workflow. Also not built: teacher-initiated lead reassignment (deliberately separate from "the lead
may hand over"), and any UI for the three new commands.

### Verification
Gates 1–5 pass. Vitest: **115 files / 1,610 tests passed** (was 114 / 1,591). 16 new tests covering
the switch, lead handover, archive-if-last, invite retirement, `activeTeamId` clearing, and the
transfer authorization ladder. Two migrations applied; devlab verified intact, and the backfill
gave every existing membership a `joined` event.

## [0.47.0] — 2026-07-25

### Fixed — content authoring cannot report green after producing nothing (P1-R15)
`author-field.workflow.mjs` computed `allClean` from `dirty`, `lost`, and `contradictions` —
every one of which is empty when **nothing was attempted**. A run whose briefs all died or came
back empty filtered them out with a warning and returned `allClean: true` having authored zero
lessons. Three related holes closed:

- **An empty brief is a failed segment, not a skipped one.** `failedSegments` is tracked and
  returned, and `allClean` now also requires that every requested segment produced units, that
  lanes exist, and that the plan contains at least one lesson. Producing nothing is the loudest
  failure available rather than the quietest success.
- **A dead fixer no longer ships a unit as clean.** The fix agent's return was ignored, so a
  fixer that died on a MED/LOW-only round fell straight through to "no surviving HIGH → clean"
  with none of its findings applied. The lane is now dirty, and a source test pins the guard
  *ahead* of the ship path.
- **Reconciliation is verified, not assumed.** The reconciler's return was discarded and there
  was no re-detect, so `contradictions` reported what was *found* with no idea whether anything
  was fixed. The consistency probe is now a function used by both the detector and a
  post-reconciliation re-check, and `contradictions` means what still disagrees. A dead
  reconciler or dead re-check leaves the originals standing.

### Fixed — `codex:merge` installs atomically (P1-R15)
The merge wrote content, three registries, then shelled out to the wrapper/checksum build — five
independent writes. An interruption or a failing build left the repository half-updated, and
nothing noticed until a later unrelated `codex:build --check` failed. Every artifact is now
snapshotted, written, and **verified with the same `--check` CI runs**; if any step throws, every
file is restored to its pre-merge state. A merge either fully lands and verifies, or the tree is
untouched.

The script also ran `main()` on import, so it could not be imported at all — which is why its
hand-written mirror of the lesson schema had never been tested. It is now guarded by the standard
entrypoint check, the key lists are one exported `SHAPE_KEYS` map, and
`test/codex-schema-drift.test.ts` parses `types.ts` and fails when the two disagree. Importing it
from a test also brought 640 lines of content-generating script under `tsc` for the first time;
the JSDoc gaps that surfaced are fixed.

### Fixed — the upload E2E spec cleans up through the real lifecycle (P1-S15)
`e2e/paper-upload.spec.ts` proved an upload was correctly ledgered and then tidied up with
`e2eDb.paper.deleteMany` — a direct row delete that skipped the route entirely, leaving the
`UploadedAsset` row `attached` to a paper that no longer existed. A test that strands the exact
ledger row it just verified is a second bug, not a cleanup. It also set `team.topic = null` in
`beforeAll` and never restored it, leaking fixture state into every spec that ran after it.

Cleanup now goes through `DELETE /api/papers/:id`, which retires the paper and orphans the asset
in one transaction, and the spec **asserts the ledger row ends up `orphaned`** — provably queued
for the reclaim sweep rather than stranded. The topic is saved and restored in nested `finally`
blocks so a failed cleanup cannot skip it.

### Still owed
- The workflow test is a **source-level check**, and says so in its header. Workflow scripts run
  sandboxed with no module access and this one ends in a top-level `return`, so it cannot be
  imported and its logic cannot be executed under test. The test fails when a named guard is
  deleted — the regression that actually happened — but cannot prove the guards are correct.
- The audit asks for reclaim to be verified "in a test bucket". There is no test bucket: R2
  `nova-lab-assets` is shared with production, so the spec asserts the ledger is queued rather
  than deleting objects. Physical reclaim stays covered at the unit level. A separate test bucket
  is the prerequisite for closing that properly.
- The E2E spec was rewritten but **not executed** — it needs the dev server, database, Clerk
  credentials, and makes a paid ingestion call.

### Verification
Gates 1–5 pass. Vitest: **114 files / 1,591 tests passed** (was 112 / 1,581). 10 new tests across
the workflow invariants and the schema-drift guard. `codex:merge --dry-run` re-run against a real
plan: still validates before writing, still wrote nothing.

## [0.46.0] — 2026-07-25

### Fixed — background work is durable, bounded, and honestly named (P1-R5)
Three separate gaps, one theme: work that ran outside a request had claims in some places,
guarantees in none.

**Notifications: claim before work, not after.** The run ledger recorded a team *after*
processing it, so two overlapping runs read the same unchecked roster, both processed the same
teams, and both emailed. `notifications.dedupe_key` kept the notification **row** singular;
nothing kept the **send** singular, because the send was driven by that run's in-memory "fresh"
list. A team is now claimed first, fenced by a `claimToken` — a run processes only the teams
whose row carries its token — with a 5-minute lease so a crashed run's teams are retried rather
than stranded for the day. Failed and budget-skipped teams are **released** rather than left to
wait the lease out. Claim, complete, and release are all batched per page: per-team writes would
have turned 3,500 teams into 3,500 round trips inside a 60-second function, which is the exact
fan-out this cron was rebuilt to avoid.

**Email outbox.** Sends no longer happen inline. Notification rows and their outbox entries
commit in one transaction, and `(dedupeKey, recipient)` unique makes "one email per event per
person" a property of PostgreSQL rather than of timing. Delivery is a separate claimed pass with
its own lease, bounded batch, attempt cap, and a `failed` parking state so one bad address
cannot consume every run. At-most-once, not exactly-once — a crash between the provider
accepting and the `sent` write retries, and one duplicate is a better failure than a reminder
that never arrives.

**Paper cron burst.** `Promise.all` over a batch of 30 meant 30 simultaneous Anthropic calls
inside a 60-second function, against provider rate limits and a database URL configured with
`connection_limit=1`. Per-job claims made that *correct*, not sane. Now four at a time through a
shared `lib/concurrency.ts` — which also replaces the private copy the notification cron was
carrying.

**Activity logging has a contract for the first time.** One function named `logActivity` served
both "a teacher may need this as evidence a student did the work" and "nice-to-have feed noise",
and swallowed every failure. Split in two:
- `recordActivity(tx, …)` writes inside the caller's transaction and **throws**, so the KP move
  and the record that it happened cannot land separately. Migrated: building purchase / sale /
  upgrade, quiz-retry pass, Codex lesson completion.
- `logActivityBestEffort(…)` is the old swallow-everything behaviour, now *named* as such at all
  30 call sites.
- `DURABLE_ACTIVITY_ACTIONS` classifies which events are progression or teacher history.

### Still owed
Eleven durable-class events are still written outside a transaction — mostly route handlers where
the payload is only known after the domain write, so migrating each is a per-site restructure
rather than a rename. `test/activity-durability.test.ts` asserts that list **exactly**, so it can
only shrink deliberately: a new one cannot be added quietly, and removing one without updating
the list fails too. Tracked in `docs/TODO.md`.

### Verification
Gates 1–5 pass. Vitest: **112 files / 1,581 tests passed** (was 110 / 1,564). New coverage
includes two overlapping notification runs never processing a team twice, an in-flight claim
being respected while an expired one is taken over, two concurrent outbox drains never sending
the same row, a failed send returning to the queue, and a permanently-failing address being
parked. Migration applied to the local dev database; devlab verified intact.

## [0.45.0] — 2026-07-25

### Added — model registry, AI accounting, and a kill switch (P1-R3 budget half, part 1)
The replay half of P1-R3 closed in v0.42.0. The budget half asked for token/cost fields, a
per-team ledger, and a global/team kill switch. None of it existed: nineteen paid entry points
sat behind one 12/min rate-limit tier, four unrelated per-feature daily caps counted their own
features and nothing else, and **no aggregate existed at all** — the highest-volume paid paths
(quiz generation, explain-back, paper chat) had no daily ceiling. Spend was unmeasurable and
unstoppable short of a deploy.

**`lib/ai/models.ts` — one table for which model runs which call.** The model was a hardcoded
string literal in sixteen separate files, so the single biggest lever on cost was the one that
took sixteen edits to pull. This is a **pure refactor**: every operation keeps exactly the model
it had. A test fails if a `model: 'claude-…'` literal reappears at a call site. Published rates
live here too, in micro-dollars per 1,000 tokens, with an `AI_RATE_VERSION` stamped on every row
so a price change cannot silently rewrite historical totals.

**`lib/ai/spend.ts` — the one door every paid call goes through.** `aiCreate` / `aiStream` take
the operation as their first argument and supply the model themselves, so no call site can
carry one or forget the accounting. All sixteen sites converted, including the shared
`gradeAnswers`, which now names which of its three callers is spending.

**Kill switch.** `AI_KILL_SWITCH` (global, no deploy) plus `Team.aiDisabledAt` (per lab),
checked **before** the call — checking after is worthless. **Fails closed**: if the team flag
cannot be read we do not know whether spending is allowed, and on a paid call the safe reading
of "don't know" is no. The two streaming services preflight it explicitly, because once a
response body is streaming there is no status code left to return.

**`AiUsage` — a durable row per call.** Team, user, operation, model, the three *disjoint* input
buckets, output tokens, cost, rate version, outcome, UTC day. `lib/anthropic.ts` has always
logged token counts; logs evaporate. These rows join to class and school through `Team`, so
per-class cost attribution is a `GROUP BY`, not a feature. Cached tokens are priced separately
(reads at 0.1×, writes at 1.25×) — ten of the paid sites lead with a cached block, and billing
those at the full input rate would overstate exactly the calls that were optimised.

**Attribution without churn.** `requireTeamContext` enters an `AsyncLocalStorage` scope, so every
paid call in a request is attributed automatically. The alternative was threading a team id
through six library functions that have no other reason to know one — and remembering to at
every new call site.

### Deliberately not built
**No enforcement.** Nothing is refused for being over budget, and a test pins that shut. Caps set
before a week of real classroom data would be a guess, and one that fires mid-lesson stops a
student's work — worse than the bill it saved. Also not built: moving any call to a cheaper
model (the registry makes it a one-line change; doing it is a separate measured decision), and
the teacher-facing cost view. `docs/TODO.md` → "AI cost review" carries all of it with the
queries to run first.

### Corrections to earlier claims
- Sonnet 5's introductory pricing ending 2026-08-31 is a **50% rise** ($2/$10 → $3/$15), not a
  doubling as previously stated.
- An earlier audit note claimed eight paid sites lacked prompt caching. Wrong: `paperTextBlock`
  adds `cache_control` for four of them, so **ten of sixteen** cache. The six that don't are
  short prompts below the cacheable minimum or single-use calls with no second read — caching
  them would buy write cost and no reads. No work was needed.
- `record()` guarded only the promise chain, so a *synchronous* throw building the write (a
  client without the model) escaped into the caller — turning accounting into a new way for an
  already-paid, already-successful call to fail. Now guarded both ways, with a test.

### Verification
Gates 1–5 pass. Vitest: **110 files / 1,564 tests passed** (was 109 / 1,546). 18 new tests
covering exhaustive registry coverage, cached-token pricing, the fail-closed kill switch,
attribution from request scope, and that accounting cannot break a paid request. Migration
applied to the local dev database; devlab verified intact.

## [0.44.0] — 2026-07-25

### Fixed — the fair catalog reconciles against the edition, not the row count (P1-R16, fairs half)
`seedFairsBatched` opened with `count >= FAIRS.length → return`. Everything below it — the
drift repair the comments promised, key coverage, event top-up — was unreachable whenever the
row count already matched. A renamed fair, moved coordinates, a corrected website, a key
swapped for another, or an entire same-size annual regen was a silent no-op. (The forms half of
this finding closed in v0.34.0.)

- **The gate is the edition digest.** `FAIRS` is a compile-time constant, so once a process has
  reconciled the database to `EDITION_DIGEST` there is genuinely nothing left to check and
  later calls cost **zero** queries — cheaper than the `count` they replace. A new deploy is a
  new process with a new digest. The digest is logged with the reconcile counts, so which
  edition is live is provable rather than inferred.
- **Retirement.** A seeded key the edition dropped is marked `Fair.retiredAt` and excluded from
  every matching path (`matchFairs`, `loadFairIndex`). Retire, not delete: `FairEvent`,
  team fair interests, and notifications hold FKs, and a retired fair is still the true history
  of a team that entered it. A key that reappears in a later edition is un-retired.
- **Events separate sourced defaults from local corrections.** Previously events were created
  but *never* updated, so an authored date fix could not land at all. An existing `(fairId,
  year)` row is now refreshed only while it is still a pure authored default — `estimated`
  **and** its fair never crawled (`Fair.lastSyncedAt === null`, the provenance v0.40.0 added).
  Once `sync-deadlines` has corrected a fair, the static dataset never touches its dates again.
  The refresh is itself an `updateMany` predicated on `status: 'estimated'`, so a crawl landing
  between the read and the write wins rather than loses.

### Changed
`/api/team/momentum`'s comment claimed the seeder "is currently only 70/266 seeded and hangs"
and that switching to `matchFairs()` was therefore blocked. That stopped being true when
seeding was batched, and is further wrong now. The comment states the real remaining reason to
replace the local replica (it reads the static dataset, so a crawled correction is invisible
there while the Fair Hub shows it) and records that the switch is now available, not blocked.

### Verification
Gates 1–5 pass. Vitest: **109 files / 1,546 tests passed** (was 108 / 1,535). 11 new tests, each
describing a database that passes the old count check and is nonetheless wrong — renamed fair,
swapped key, returned key — plus the opposite obligation: a crawled fair's and a `confirmed`
row's dates are asserted untouched. Migration applied to the local dev database; devlab verified
intact (25 papers, 11 discovery nodes, 25 quiz sessions, 25 proficiencies, 12 vocab cards).

### Still owed
Reconciling on a request is still a GET that mutates (P2-S6). The right home is a deploy-time
command; the digest memo makes it cheap, not correct-by-design. Operator-corrected event dates
are distinguished at *fair* granularity (`lastSyncedAt`), not per event row — a fair crawled for
one year freezes the dataset out of its other years too. Retirement is also not surfaced anywhere
a teacher can see: a team already tracking a retired fair is not told.

## [0.43.1] — 2026-07-25

### Fixed — unique-index migrations dedupe before they index (P1-S14)
A13's migration backfilled `showcase_views.day` and immediately created a unique daily index,
justified by a comment claiming historical rows were lifetime-deduped. That was an assumption
about the *old code*, not a property of the data: the initial schema had no uniqueness and the
historical `findFirst`→`create` was race-prone. One surviving duplicate pair aborts
`CREATE UNIQUE INDEX` and takes the whole deploy with it.

The audit's "audit other uniqueness-only migrations by the same rule" found the defect had
landed **four** times, not once. All four now preflight, in the migration that creates the index
— a follow-up migration cannot help, because the deploy has already aborted by then. (Prisma
does not enforce checksums on applied migrations here, so amending in place is safe; the local
dev database already has all four applied and is unaffected.)

| Migration | Index | Treatment |
| --- | --- | --- |
| `20260719120000_track_a_hardening` | `showcase_views (showcase_id, visitor_fingerprint, day)` | **Dedupe.** Keep the earliest view of each visitor-day — that row *is* the first visit the contract counts. Nothing holds an FK into the table. |
| `20260709140000_paper_list_metadata` | `papers (team_id, content_hash)` | **Quarantine.** A Paper parents quizzes, proficiencies, explanations, chat, citations, vocabulary, and discovery nodes; deleting one destroys student work. Clear `content_hash` on the later copies instead — NULLs are distinct, every row and child survives. |
| `20260713100000_plot_cell_unique` | `team_shop_buildings (team_id, pos_x, pos_y)` | **Quarantine.** NULL the later occupant's position. "Owned but not yet placed" is already a supported state, so the team loses a position, not a building it paid KP for. |
| `20260701040000_discovery_v2_citation_manager` | `discovery_nodes (paper_id)` | **Quarantine.** Detach the later node from the paper. Deleting it would break the tree *and* destroy the `discovery_source_visits` row that is the once-ever KP claim, letting the team re-earn KP. |

Two more were reviewed and are genuinely safe (a strictly wider unique replacing a narrower one,
or an index on a column the same migration adds); they are recorded as exemptions **with their
reasons** rather than passed over silently.

### Added — a recurrence guard and a real-Postgres verification
- `test/migration-unique-index-policy.test.ts` fails on any migration that adds a unique index
  to a table it did not just create without a preceding dedupe, unless it is exempted with a
  stated reason. The first version of this guard accepted *any* preceding write to the table —
  which `track_a_hardening`'s unrelated `day` backfill satisfied, so it would have passed the
  exact migration it exists to catch. It now requires a construct that actually picks a winner
  per duplicate group, and a negative-control test pins that false pass shut.
- `pnpm --filter web verify:migration-preflights` runs each preflight against the **real** local
  PostgreSQL: drop the index, inject the duplicates the pre-index schema allowed, run the
  migration's dedupe verbatim, rebuild the index — inside a transaction that always rolls back.
  All four pass. This caught a genuine bug in the checker itself (it was extracting the backfill
  statement, not the dedupe) that reading the SQL would not have.

### Verification
Gates 1–5 pass. Vitest: **108 files / 1,535 tests passed** (was 107 / 1,528). No new migration —
four existing ones amended. devlab verified intact after the verification run (25 papers, 11
discovery nodes, 25 quiz sessions, 25 proficiencies, 12 vocab cards).

### Still owed
The audit's "test replay from dirty historical fixtures" is satisfied against the dev database's
shape, not against a production-sized dirty corpus. Nobody has yet counted the real duplicates in
the production database — the preflights are proven correct, but the *blast radius* of the
quarantines (how many papers lose duplicate-detection, how many buildings come unplaced) is
unknown until they run there.

## [0.43.0] — 2026-07-25

### Fixed — the paper-processing lease is fenced (P1-S5)
`processPaperJob` already let a second worker take over a claim after five minutes. What it
did **not** do was stop the first worker from coming back. Every terminal write — job status,
paper status, citation row — was keyed on `paper_id` alone, so a revived old worker could
overwrite the new worker's success or failure, and both paid Haiku for the same paper. The
existing test covered two *simultaneous* claims, which is the case that already worked.

- **`paper_processing_jobs.claim_token`.** A fresh UUID is written on every claim, including a
  stale takeover. The old owner's token no longer matches.
- **Terminal writes are compare-and-set.** Both the success and the failure path open an
  interactive transaction, run the job transition **first** as an `updateMany` predicated on
  `(paperId, status: 'running', claimToken)`, and roll the whole transaction back when it
  matches nothing. A worker that lost its lease writes nothing at all: not `ready`, not the
  citation, not a competing `failed`. It logs `paper_job.claim_lost` and returns.
- **A lost success does not fall through into the failure path.** The rollback is a distinct
  `LostClaimError`, caught before the retry bookkeeping, so a taken-over worker cannot record a
  failure over the new owner's completion.
- **The cron's stuck-job sweep re-asserts its predicate on the write.** It selected
  `running` + stale + attempts-exhausted rows, then terminalized them with a bare
  `paperId IN (…)`. Between the two a worker can legitimately re-claim; the write now repeats
  the full predicate, the paper update is scoped to the jobs this transaction actually
  terminalized, and the reported count is the real one rather than the snapshot size.

### Fixed — paid plan writebacks are versioned (P1-S9)
Codex study-plan generation, research-plan review, and idea-check each read a source, called
out for tens of seconds, then wrote back unconditionally. Two failures follow: slow old work
overwrites newer truth, and concurrent same-input callers both pay.

- **Study plan.** Reserving the daily slot now also stamps `team_study_plans.pending_source_hash`
  with the source the generation is working from, and the commit is a compare-and-set on it. A
  generation started against an older topic can no longer land on top of a newer one that
  already finished; the caller is handed the newer plan, honestly labelled as not theirs. The
  paid classifier also runs through `runAiOperation` (`study_plan_tracks`), so two clicks that
  both miss the row-level `sourceHash` cache share one result instead of buying two.
- **Research-plan review.** `research_plans.review_claimed_at` is claimed **before** the Sonnet
  call (5-minute TTL, released on every failure path, and cleared by the successful commit
  itself). The commit is an `updateMany` predicated on the exact `lastSyncedText`, `projectType`,
  and `projectSubtype` that were reviewed — a real compare-and-set on the source columns, not a
  re-read. A review of text the team has since rewritten is discarded with an explicit
  "your plan changed" event instead of being displayed as the current plan's critique.
- **Idea check.** `research_plans.idea_check_claimed_at` is claimed before counting *and* before
  paying. That ordering is what makes the 3/day cap **exact** rather than advisory: the count is
  read while holding the claim, so three simultaneous requests can no longer all read "2 used".
  The writeback compare-and-sets on the searched text, and commits in one transaction with the
  `IdeaCheck` ledger row. The ledger row is written either way — the web search was bought, so
  the slot is spent whether or not the verdict still applies.
- `lib/research-plan/claim.ts` owns the claim/release shape for both plan workflows. Two more
  inlines of a pattern already written five times is where a twenty-line helper starts paying.

### Verification
Gates 1–5 pass. Vitest: **107 files / 1,528 tests passed** (was 106 / 1,510). 18 new tests: 5
pinning the paper-lease takeover (success and failure both discarded, no fall-through, per-attempt
token) and 13 across the three paid writebacks. Both migrations applied to the local dev
database; devlab verified intact afterwards (25 papers, 11 discovery nodes, 25 quiz sessions,
25 proficiencies, 12 vocab cards).

### Still owed
- P1-S5: a real two-worker PostgreSQL takeover test (the P1-R14 database lane) and a heartbeat,
  so a genuinely slow-but-alive worker is not taken over at all.
- P1-S9: the study-plan CAS detects a competing *generation*, not a bare source edit with no
  regeneration — that case still self-heals on the next request via the `sourceHash` cache miss.
  A crash between the paid idea-check search and the ledger write refunds a slot.

## [0.42.0] — 2026-07-25

### Added — result replay for paid provider calls (P1-R3 replay half; closes the P1-R11 and P1-S6 remainders)
The claim columns added in v0.37.0 and v0.41.0 solved the **concurrent** case: two callers can
no longer pay at the same moment. They cannot solve the **sequential** one. A client that timed
out and retried, or a student submitting the same answers twice, had exactly two outcomes — pay
again, or be refused. Neither is right when the first call already produced an answer somebody
paid for.

`AiOperation` stores the outcome against a SHA-256 of the **inputs**, with a unique
`(operation, idempotencyKey)`. Whoever wins the insert does the work; everyone else reads what
the winner stored. `runAiOperation()` in `lib/ai/operation.ts` is the whole interface:

- **Replay** — an identical request returns the stored result and never reaches the provider.
- **In flight** — an identical request still running gets 409 rather than a duplicate call.
- **Takeover** — a `running` row older than 3 minutes, or a `failed` one, is retryable; the
  takeover is guarded on the status just read, so two takers cannot both proceed.
- **Failures are not replayed as results** — a failed call is recorded as `failed`, so an
  identical retry re-runs rather than inheriting an error as an answer.
- `run` is deliberately given no transaction client: holding a transaction across a
  multi-second provider call is what the audit forbids, and the signature makes it impossible.

Keys are JSON-framed rather than concatenated. Replaying one student's grade onto another's
answers is the failure mode that matters, so `['ab','c']` and `['a','bc']` must not collide —
pinned by test.

**Wired into both call sites named in the audit:**
- **Quiz retry grading** (P1-R11) — keyed on the session plus the exact answers, sorted so
  answer *order* cannot change the key.
- **Explain-back** (P1-S6) — keyed on paper, student, and the submitted text, so a genuine
  revision is graded fresh while a resubmission of the same text replays.

### Verification
Gates 1–5 pass. Vitest: **106 files / 1,510 tests passed** (was 105 / 1,494). 16 new tests: 10
on the ledger itself, 3 pinning retry replay/keying/in-flight, 3 the same for explain-back.
Migration applied to the local dev database.

## [0.41.0] — 2026-07-25

### Fixed — paid phase advancement is claimed and compare-and-set (P1-R2)
`literature_review → research_planning` read the current phase, ran a **paid** Haiku
classification, then finished with an unconditional `team.update({ id })`. Two consequences:
two concurrent clicks both paid and both wrote, and a request whose model call returned *after*
another transition stamped `research_planning` over whatever the team had moved on to — a late
result rolling the lab **backwards** through the arc.

The self-advance transitions in the same route already used a conditional `updateMany`. This
brings the paid path in line:

- **Claim before spending.** A conditional stamp on `Team.advanceClaimedAt`, predicated on the
  phase as well, so it doubles as the "still in literature_review" check. The loser gets 409
  without reaching Anthropic. A 2-minute TTL means a crashed request cannot wedge the team, and
  a classification failure releases the slot.
- **Compare-and-set the transition.** The write is predicated on `phase: 'literature_review'`.
  If the team moved on while we were classifying, the route reports where it *actually* is
  (`alreadyAdvanced: true`) rather than dragging it back, and does not log a phase-advance it
  did not perform.

`advance-phase-paid-gate.test.ts` asserted the old unconditional `team.update`; it now asserts
the CAS, and that `team.update` is not used on this path at all.

### Verification
Gates 1–5 pass. Vitest: **105 files / 1,494 tests passed** (was 104 / 1,484). 10 new tests
covering claim ordering, the unpaid loser, TTL takeover, claim release on failure, the CAS
predicate, the backwards-roll case, and the untouched free self-advance path. Migration applied
to the local dev database.

## [0.40.0] — 2026-07-25

### Fixed — the global fair catalog is no longer any student's to rewrite (P1-S10)
`Fair` and `FairEvent` are **global rows shared by every team**, but any student matched to a
fair could trigger a paid Firecrawl crawl. N students in one state each paid for the same fair,
concurrently, and the read-then-write on the shared event row was last-writer-wins. Provider
output was cast rather than validated, and the returned year was trusted unbounded.

- **One crawler, with a cooldown.** A conditional stamp on `Fair.syncClaimedAt` elects a single
  crawler and enforces a 12-hour cooldown in the same statement: the row must have no live claim
  **and** not have been synced recently. Losers get 429 instead of each starting a paid job. A
  2-minute TTL keeps a dead claim from wedging the fair, and any failure releases it.
- **Validated, not cast.** The Firecrawl response now goes through `DatesSchema.safeParse`.
  Firecrawl steers its LLM with the schema, but the response is still provider output landing in
  a row every team in the state reads.
- **Plausible years only.** A year outside `[thisYear-1, thisYear+3]` is rejected — a model
  returning 1999 or 2190 has misread the page.
- **Compare-and-set publish.** The update is predicated on `status: 'estimated'`, so the
  database refuses to downgrade curated data whoever wins the race. The old `findFirst` →
  `update` checked `confirmed` against a stale pre-read.
- **Provenance.** `lastSyncedAt` / `lastSyncedByUserId` record who refreshed a shared row.

**Still open:** the audit's preferred model — students *request* a refresh and an
admin/background job stages it for review before publishing. That is a product change; this
makes the existing student-triggered path safe rather than replacing it.

### Verification
Gates 1–5 pass. Vitest: **104 files / 1,484 tests passed**. Migration applied to the local dev
database.

## [0.39.1] — 2026-07-25

Closes the two items v0.39.0 left open.

### Fixed — the asset ledger survives team deletion (P1-R12 remainder)
`uploaded_assets.team_id` cascaded, so removing a team destroyed the only record of its R2
objects **before** anything could delete them — a permanent, untracked orphan with no way to
even discover it. Nothing deletes a `Team` today, so this was latent; `ON DELETE RESTRICT`
converts it into a loud failure the moment a team-deletion command is written, forcing the
correct order (retire the assets, then remove the team).

### Added — reconciliation for `attached` rows with a dead owner (P1-S8 remainder)
Deletion now retires the ledger row in the same transaction, so new orphans of this shape
cannot form — but the ones that formed *before* that fix are invisible to the reclaim sweep
(which only looks at `orphaned`/`temporary`) and stay charged against the team's quota forever.
`reconcileOrphanedAssets()` flips them to `orphaned`, and the papers cron runs it before the
sweep so both happen in one pass. An **unrecognised** attach type is left alone rather than
guessed at, so adding a new type can never silently start orphaning live assets. The write is
guarded on `status: 'attached'` so a concurrent re-attach is not undone.

### Local dev database — backup and cleanup
A full backup was taken before touching anything: `backups/scienium_dev-<stamp>.dump` (custom
format, 75 tables), a plain-SQL twin, and `backups/manifest-<stamp>.json` recording exact row
counts per table. `backups/` is gitignored — these are ~143 MB combined.

Running the new reconciler against real data repaired **18 of 19 `attached` rows**, every one
of which had a dead owner: concrete evidence P1-S8 was not theoretical. The ledger now reads 1
`attached` / 122 `orphaned`.

### Verification
Gates 1–5 pass. Vitest: **103 files / 1,473 tests passed**. Migration applied to the local dev
database; devlab verified untouched (25 papers, 11 nodes, 25 quiz sessions).

## [0.39.0] — 2026-07-25

Closes the storage-lifecycle pair: the sweep could lose an object permanently, and domain
deletion could orphan a ledger row that nothing would ever reclaim.

### Fixed — the reclaim sweep is crash-durable (P1-R12)
`reclaimAbandonedAssets` wrote the **terminal** `deleted` status and only then called R2. A
caught rejection was handled, but a process death, function timeout, or lost machine between
the two left a **live object behind a terminal ledger row** — invisible to every future sweep,
still charged against the team's 2 GB quota, permanently.

- New intermediate `deleting` status plus `deleteLeaseAt` / `deleteAttempts`. The sweep claims
  into `deleting`, deletes the object, and writes `deleted` **only after** the object is
  confirmed gone.
- A `deleting` row whose lease has aged out (5 min) is re-selected, so a crashed worker's claim
  is recovered rather than leaked.
- A failed delete now simply leaves the row `deleting` for the lease to retry. The old code
  restored the previous status, which worked for that one failure mode; the lease covers both
  it and the crash, and one recovery path is easier to trust than two.
- `deleteAttempts` makes a poison object visible instead of retried silently forever.

### Fixed — domain deletion and storage retirement commit together (P1-S8)
Paper deletion, showcase-asset deletion, and the topic-change removal each deleted the domain
row in one commit and orphaned the ledger row in another. A crash in between left an `attached`
`UploadedAsset` with **no live owner** — the sweep cannot see it, and retrying cannot fix it
(the retry 404s on the now-missing paper). All three now do both in one transaction, passing the
transaction client into `orphanObjectKey`.

The topic-change path was the worst of the three: it deleted paper rows and then called
`deleteObject` directly, outside any transaction and bypassing the ledger entirely. It now
retires through the ledger like every other caller, so a failed R2 delete is retried by the
sweep instead of silently leaking.

### Fixed — a malformed attachment URL is no longer a 500 (P1-R12)
`decodeURIComponent` throws `URIError` on a bad escape (`%zz`, a lone `%`). Both legacy
attachment-URL parsers called it unguarded, so hostile or corrupted input became a route-level
500. A URL we cannot decode is simply not a reference we recognise, and now reads as `null`.

### Verification
Gates 1–5 pass. Vitest: **103 files / 1,469 tests passed** (was 1,462). Migration applied to the
local dev database; devlab verified untouched (25 papers, 11 nodes, 25 quiz sessions).

## [0.38.0] — 2026-07-25

### Fixed — destructive confirmations are server-owned capabilities, not client assertions (P1-R1)
`POST /api/discovery/topic` treated `confirmWipe` and `confirmRemoveIds` as its two-phase
protocol, but both are just fields the caller sends. A direct request could skip every proposed
phase and delete any ready paper ids it knew — the confirmation lived entirely in the UI dialog.
`DELETE /api/discovery/tree` was worse: it wiped a team's whole discovery tree on a single bare
request, with no confirmation at all.

- New `DestructiveProposal`: a single-use, 10-minute permission slip binding **actor, team,
  command, the exact payload (as a SHA-256 digest), and expiry**. `lib/api/destructive-proposal.ts`
  owns issuing and consuming it.
- The digest sorts target ids (order is not meaning) and JSON-frames its parts, so no id can
  impersonate a delimiter and let two different payloads hash alike.
- **Topic removal**: phase 1 now records what the server proposed and returns a
  `proposalToken`; phase 2 deletes only after `consumeDestructive` matches the token *and* the
  byte-identical id set. An expanded delete list riding a genuine token no longer matches.
- **Tree reset**: now two-phase. A bare `DELETE` destroys nothing and returns the node count
  plus a token; only a request carrying that token wipes. The token binds the node set that
  existed when it was issued, so one minted for a 3-node tree cannot later wipe 300.
- Consumption is a compare-and-set on `consumedAt: null`, so a replayed token is inert and two
  concurrent phase-2 requests cannot both proceed.
- Every failure — guessed, expired, replayed, foreign, or payload-mismatched — returns the same
  answer, so the endpoint is not an oracle for which proposals exist.

`test/topic-removal.test.ts` previously asserted phase 2 with `confirmRemoveIds` alone, which
**pinned the bypass rather than preventing it**. It now pins the opposite: a removal with no
token, or with a token that does not match the proposal, deletes nothing and does not change the
topic.

### Still open in P1-R1 — a capability matrix
The audit also asks for a member/lead/teacher/admin capability matrix enforced in a shared policy
module. That is a product decision — today *any* member may reset a tree or change a topic, and
whether that should require lead is not something this remediation should decide silently. The
proposal makes each destructive act deliberate, bound, single-use, and auditable; it does not
stop a determined direct caller from making both calls in sequence. Marked as such in
`REFACTOR2.MD` rather than quietly counted as closed.

### Verification
Gates 1–5 pass. Vitest: **103 files / 1,462 tests passed** (was 102 / 1,443). 19 new tests
across the digest binding, proposal issue/consume, the tree's two phases, and the topic bypass.
Migration applied to the local dev database; team data verified untouched.

## [0.37.0] — 2026-07-25

Closes the "pre-call claim" family: three paid paths that read their deciding state **before**
a multi-second model call and then wrote from that stale snapshot.

### Fixed — retry grading claims before it spends, and never lowers a pass (P1-R11)
Retry-question *generation* has elected a single payer since A8; retry *grading* had no claim
at all, so two concurrent submits both loaded the same failed session and both called
Anthropic. The advisory lock protected only the KP high-water arithmetic — which runs after the
money is gone. Worse, the session write was **unconditional** and lacked the initial grade
route's `gradedAt` guard: a later low-scoring retry set `passed = false` on a session another
retry had already passed, while `PaperProficiency.demonstrated` stayed `true`, leaving the two
records contradicting each other.

- `PaperQuizSession.retryGradeClaimedAt` mirrors A8's conditional stamp, with a 2-minute TTL so
  a crashed grader cannot wedge the session. The loser gets 409 having spent nothing; a failed
  generation or grading releases the slot.
- The session write is **monotonic**: `score` takes the max and `passed` ORs with what already
  stands, both read inside the lock. A retry may raise the visible verdict; never lower it.

### Fixed — explain-back derives its outcome under the lock (P1-S6)
`attemptNo`, `bestScore`, `passed`, and KP eligibility all came from a read taken before the
paid call. Two concurrent submissions minted the **same attempt number**, and a slower failing
result recomputed the high-water fields from that stale read, overwriting a pass that had landed
meanwhile. Every one of those values is now re-read inside the per-(paper, user) transaction:
`attemptNo` from the fresh count, `bestScore` as a max, `passed` OR'd, KP eligibility from the
fresh `kpAwarded`. `(paperId, userId, attemptNo)` is now **unique**, making the sequence
structural rather than a habit; the migration renumbers historical collisions by creation order
rather than deleting a student's work. The pre-call read survives only to shape the E2E fixture,
and says so.

### Fixed — failure-log follow-ups claim before they spend (P1-S7)
"One follow-up per entry" and the per-team daily cap were both pre-reads with nothing behind
them, so two concurrent requests both paid and both inserted. `ProjectLogFollowup.projectLogId`
is now **unique** and the row itself is the claim: it is created (with an empty question) before
the model call, so losing the race costs nothing, and the daily count runs under a per-team lock
so concurrent claims for *different* entries serialize. A failed generation releases the claim,
and a claim left empty by a crashed request is reclaimable after 2 minutes instead of burning
the entry forever. The answer write moved from a `response === null` pre-read to an
`updateMany` predicate, so a second answer is refused rather than silently overwriting the
first.

### Deliberately not done
The audit's full remedy for these findings includes a durable operation ledger with result
replay. That is **P1-R3's kernel** and remains open — these fixes close the correctness and
duplicate-spend paths using the claim-column convention the repository already uses (A6/A8),
without inventing half a ledger. Explain-back's *first* attempt still has no pre-call claim
(there is no parent row to stamp yet); concurrent first attempts are bounded by the `ai` rate
tier and now collide on the unique attempt sequence rather than corrupting it.

### Verification
Gates 1–5 pass. Vitest: **102 files / 1,443 tests passed** (was 100 / 1,419). 24 new tests: 6
on the retry grading claim and monotonic write, 7 on explain-back's in-lock derivation, 11 on
the follow-up claim and answer predicate. All three migrations applied to the local dev
database; team data verified untouched.

## [0.36.0] — 2026-07-25

### Fixed — class-join decisions have one terminal state (P1-S2)
The route pre-read `status: 'pending'` and then acted on that stale snapshot. Approval re-read
inside its own transaction and **returned silently** when the row had moved on — while the
route still answered `{ ok: true }` — and denial wrote with **no status predicate at all**.
Approve-then-deny therefore left a student enrolled (`User.classId` set) against a request
marked `denied`; deny-then-approve reported success for a write that never happened. Competing
approvals were also last-writer-wins on that single `classId`, leaving two `approved` rows.

One `decideClassJoin(requestId, teacherId, decision)` service now owns the transition:

- the change is an `updateMany` predicated on `status: 'pending'`, so only the first decision
  commits and the loser is told **which state actually stands** (409, not a false success);
- approval takes a per-student advisory lock before touching `User.classId`, so two teachers
  approving into different classes serialize instead of racing;
- any other approved request for that student becomes **`superseded`** — a new status, distinct
  from `denied` because no teacher refused it — so the database never holds two `approved` rows
  describing one `classId`;
- the route's own query is now purely the **authorization** check (does this teacher own the
  class); it no longer draws conclusions about whether the request is still open.

Denial deliberately does **not** un-enrol an already-approved student. That is a class-removal
command and belongs to the membership lifecycle still open as P1-R8; refusing the stale
decision is the honest answer here.

### Fixed — malformed model output can no longer mint proficiency or KP (P1-S3)
Two independent holes, both reachable without touching the UI:

- **Generation accepted any non-empty array.** A model returning one element produced a
  one-question "5-question" exam worth the same proficiency and KP.
  `parseGeneratedQuestions` now requires **exactly** `QUIZ_QUESTION_COUNT` elements, each with
  a non-blank prompt and grading key (a blank key leaves the grader nothing to grade against).
- **Grading divided by `graded.length`** — the rows the model happened to return. A single
  `{ questionId: "q1", score: 100 }` passed a five-question session outright and minted
  proficiency and KP; a foreign or duplicated id could inflate the same sum.
  `aggregateOverQuestions` uses the **canonical** denominator: an ungraded question counts as
  zero rather than as absent, a grade for a question we never asked is ignored, and a
  duplicated id counts once.

The expertise/clearance route already used a canonical denominator and was **not** vulnerable;
it now routes through the same helper so the rule has one owner and the two cannot drift apart.

### Changed — the route-policy harness may take advisory locks
`lockAggregate` issues `$executeRaw`, which the in-memory harness rejected outright, so any
route guarded by a lock became untestable for authorization. The harness now no-ops
**`pg_advisory_xact_lock` specifically** — it is single-threaded against maps, so there is no
concurrency for a lock to serialize — and still throws on any other raw SQL, so this cannot
quietly become a general escape hatch. Real lock behaviour remains proven against PostgreSQL in
`test/pg/invariants.pg.test.ts`.

### Verification
Gates 1–5 pass. Vitest: **100 files / 1,419 tests passed**. 31 new tests: 13 pinning the
class-decision compare-and-set, lock ordering, and supersede rule (including both
approve-after-deny and deny-after-approve interleavings), and 18 driving hostile provider
output through the quiz cardinality and aggregate contracts. Migration applied to the local dev
database; team data verified untouched.

## [0.35.2] — 2026-07-25

### Added — unit tests for the v0.34.0–v0.35.1 remediation wiring
The audit remediation added logic in places the existing suite did not reach. The pure
functions were tested as they were written; the **wiring** around them — seeding, route
policy, and which write paths call what — largely was not, and that is where a silent
regression would live. 54 tests across 6 files:

- **`forms-seeding`** (9) — `ensureFormsSeeded` seeds the 2027 codes into a database holding
  the 12 legacy ones (the exact case the old `count >=` fast path suppressed), is a no-op when
  coverage is complete, and uses `skipDuplicates`. The GET route never serves a retired code
  even while its row survives, serves the **authored** name rather than the stored one, emits
  no applicability copy while unreviewed, and stays team-scoped.
- **`showcase-write-policy`** (15) — `school_only` is refused with 400 and writes nothing; a
  share token is minted on create, back-filled for a legacy row, left alone on an ordinary
  save, and changed on rotate; `shareUrl` is the token URL for `link_only` and the slug for
  `public`; every write syncs the revision; `submitted`/`unpublished` events are recorded
  against the digest; and the response comes from the post-sync re-read, so a client is never
  told "approved" about a revision that just reset to review.
- **`showcase-viewer-resolution`** (8) — `moderatorTeamIds` comes from classes the caller
  actually teaches, is empty for students (and the extra query does not run for them), covers
  admins, and degrades safely for a Clerk identity with no row. Plus `makeShareToken` shape
  and non-repetition.
- **`showcase-asset-revision`** (5) — the link route and asset deletion both re-derive the
  revision, and neither does so on a rejected URL, a missing showcase, or another team's asset.
- **`showcase-moderation-decision`** (+6) — the queue GET returns the reviewed digest, every
  asset with an openable link, and a preview URL; it is class-scoped and returns nothing for a
  teacher with no classes.
- **`discovery-tree-graph`** (+6) — `createTreeNodes` writes nothing when validation rejects a
  batch, and `hydrateTree`'s depth walk terminates on a two-node cycle and a self-edge while
  still reporting real depth for a healthy chain.
- **`research-plan-doc-url`** (4) — the canonical URL is what reaches the database, query
  junk and all, and nothing is stored when the fetcher rejects the URL.
- **`papers/service`** (+2) — an upload with a DOI persists the DOI and a **null**
  credibility tier.

**Not covered, and why:** `usePaperQuiz` (P1-S4) and `FormsChecklist` are React units, and this
suite is node-only with no jsdom or testing-library. Adding that infrastructure is a larger
decision than this batch; the P1-S4 fix is currently pinned only by the reading of the diff.

### Verification
Gates 1–5 pass. Vitest: **98 files / 1,388 tests passed** (was 93 / 1,334).

## [0.35.1] — 2026-07-25

### Fixed — `link_only` sharing now uses a real 128-bit secret (P1-R7)
`makeSlug(title)` produces a title-derived prefix plus six hexadecimal characters from a UUID.
That is **24 bits** of bearer entropy standing between an anonymous visitor and a minor's
project work — request limiting slows enumeration but does not turn a small, predictable
namespace into a capability.

- `Showcase.shareToken` is a 128-bit `randomBytes(16).toString('base64url')` value, unique.
  `slug` is now documented as what it always was: a **public identifier**, not a secret.
- `canViewShowcase` takes a `via: 'slug' | 'share_token'` argument. `public` opens by slug
  (listed, reviewed, indexable); `link_only` opens **only** for `share_token`. The parameter
  defaults to `'slug'`, so a caller that forgets to pass it fails closed.
- `/showcase/<param>` resolves by slug **or** share token and reports which matched, so
  existing public URLs are unchanged and the share link is a single path segment (no token in
  a query string, where it would leak through `Referer` more readily).
- **The asset stream is gated identically.** `/api/showcase/public/asset` accepts `?t=` and
  compares it to the showcase's token. Without this the token would be a lock on the front
  door with the window left open — board and quad-chart bytes were reachable by asset id
  alone.
- **Rotation is the revocation mechanism.** `PUT /api/showcase { rotateShareToken: true }`
  mints a new token and invalidates every link handed out so far; the editor exposes it as
  "New link" for `link_only` showcases. There is no way to un-share a URL somebody already
  copied, so this is deliberately an explicit action rather than a side effect of saving.
- The API returns `shareUrl` — the URL a team should actually hand out — and the editor uses
  it instead of building one from `slug`.

**Deliberately not done, with reasons:** the token is stored in plaintext rather than as a
digest, because the team must be able to read their own link back out of the editor to share
it; time-based expiry is omitted because rotation covers revocation and a link that dies
mid-science-fair is a real usability cost; and unknown-token throttling is left to the existing
`read` tier, since 128 bits makes enumeration infeasible rather than merely slow.

**Breaking:** existing `link_only` URLs stop working. A 24-bit link cannot be upgraded in
place, only replaced — teams re-copy the new link from the editor. Migration
`20260725160000_showcase_share_token` backfills every existing row with two concatenated
`gen_random_uuid()` values (~244 bits, no extension required).

### Changed — `e2e/F4.spec.ts` acceptance criteria follow the new contract
AC3 asserted that the seeded teacher gets 404 on a pending showcase. That teacher owns the
leader's class, and since v0.35.0 the team's own teacher is *supposed* to see pending revisions
— the old assertion would now pin the very defect P0-R3 fixed. AC3 now uses a signed-out
visitor (a genuine stranger), new **AC3b** asserts the moderator preview positively, and AC4
asserts `link_only` opens at its share URL and **not** at its slug.

### Verification
Gates 1–5 pass. Vitest: **93 files / 1,334 tests passed**. Migration applied to the local dev
database; the backfill produced tokens on every row and left team data untouched. **E2E was not
run for this change** — `F4` needs the dev server, database, and Clerk credentials; the three
edited criteria above are the ones to watch on the next full run.

## [0.35.0] — 2026-07-25

**The last P0 launch blocker from the 2026-07-23 audit.** Showcase approval was a mutable
status flag, not the approval of a piece of content — this makes it name a revision.

### Fixed — showcase approval is now bound to the revision that was reviewed (P0-R3)
An already-approved public showcase could change its title and abstract, or replace its board
PDF, quad chart, video, repository, and supplement assets, and stay `approved`. The teacher
queue could not compensate: its moderation query selected only text and team summary fields,
and its "View submission" link pointed at the public page, whose pending-content policy
admitted team members but **not the reviewing teacher**. A reviewer could therefore be asked to
approve a submission whose required assets they had no way to open, and the team could swap
those assets afterwards. This is minor-created content reachable by anyone on the internet.

- `Showcase.contentDigest` covers every field and asset an approval applies to — short title,
  title, abstract, privacy level, and each asset's type, object key, and metadata. Assets are
  sorted and the digest is built from JSON rather than delimiter concatenation, so two
  different revisions cannot collide and asset row order is not significant.
- `Showcase.approvedDigest` records the revision a teacher approved. `approved` means
  "approved as served" only while the two match.
- `syncShowcaseRevision()` re-derives the digest after every covered write and, when an
  approved showcase moves away from its approved revision, atomically resets it to
  `pending_review`, clears `approvedDigest`, and appends a `revision_invalidated` event. It is
  called from **all four** write paths: the showcase PUT, the file-upload route (inside the
  same transaction as the slot swap, so the digest can never lag the asset), the link route,
  and asset deletion.
- **Teacher preview.** `ShowcaseViewer` gained `moderatorTeamIds`, resolved only for teachers,
  and `canViewShowcase` grants the teacher of that team every revision in every state. Because
  the public page and the asset-stream route already route through that one predicate, the
  reviewer can now open the exact pending board, quad chart, and video. It is scoped to teams
  they teach — a teacher of another class still sees nothing.
- **Decisions are compare-and-set.** The queue returns `contentDigest` and the full asset list;
  the decision echoes the digest back, and the update predicate includes it. A submission
  edited between the reviewer opening it and clicking Approve no longer matches, so the request
  is refused with 409 ("this team changed their showcase while you were reviewing it") instead
  of approving content nobody read.
- **Append-only history.** `ShowcaseModerationEvent` records `submitted`, `approved`,
  `rejected`, `revision_invalidated`, and `unpublished` against the digest each applied to,
  with the acting teacher and note. Rows are never updated or deleted.
- The review queue card now links every required asset directly and marks any that is missing.
- `requiresReview()` is the single owner of which privacy levels are gated. `public` is
  reviewed; `link_only` and `private` are an **explicit acceptance** documented at that
  function — its real weakness is the guessable bearer slug tracked as P1-R7, and fixing the
  token is what makes "unlisted" true, not adding a review step.

Migration `20260725140000_showcase_revision_moderation` **fails closed on backfill**: existing
approved public showcases were approved under the old mutable flag, so there is no evidence of
which revision a teacher saw. They return to `pending_review` rather than staying live on an
unverifiable approval. `link_only`/`private` are untouched.

### Verification
Gates 1–5 pass. Vitest: **93 files / 1,329 tests passed** — including
`test/pg/invariants.pg.test.ts` against the local dev database (both this migration and
`20260725120000_forms_catalog_unique_code` applied cleanly there, dedupe path included).

## [0.34.1] — 2026-07-25

Second remediation batch against `REFACTOR2.MD` §0 — the small, high-severity P1 tenancy and
concurrency findings. Same principle as v0.34.0: the fix is a database-owned predicate or an
explicit rejection, not a longer chain of application pre-checks.

### Fixed — the discovery tree accepted foreign-team parents and cycles (P1-R10)
`POST /api/discovery/tree` takes client-generated node ids and arbitrary `parentId`s, and
`DiscoveryNode`'s self-relation references only `id` — not `(teamId, id)` — so PostgreSQL
permitted a team-A node pointing at a team-B parent. A single batch could also introduce a
self-edge or a cycle, and `hydrateTree.depthOf` walked parent pointers with no visited set, so
one such write made the team's own Discovery GET loop until the request timed out: a persisted,
team-level denial of service any member could write.

- New `assertValidTreeGraph(teamId, nodes)` runs **before any write**: batch size ≤ 200, unique
  ids, no self-edge, every parent null / an existing **same-team** node / another node in the
  same batch, no cycle among the batch's new edges, and a batch-depth cap. A foreign-team
  parent gets the same "unknown parent node" answer an invented id gets, so the endpoint is not
  an oracle for other teams' node ids.
- `TreeGraphError` maps to 400 in the route.
- The source/article create branches no longer swallow **every** exception as dedup: only a
  genuine `P2002` is dedup, anything else propagates. The old broad catch logged the failure
  and still returned `{ ok: true }`.
- `depthOf` carries a visited set as corruption containment for rows written before the guard.
- `test/discovery-tree-graph.test.ts` uses a real database-resident id owned by another team,
  not a fabricated one.

### Fixed — single-use team invites were not single-use under concurrency (P1-S1)
`POST /api/team/join` read `usedByUserId` **before** taking the team lock, then wrote the
invite unconditionally. Two joiners could both observe "unused", serialize only on capacity,
both join, and the second silently overwrote the audit owner. The invite is now consumed by a
conditional `updateMany` (`usedByUserId: null` + unexpired) **before** the membership row is
created; `count !== 1` throws 409 and rolls the whole transaction back. `test/team-join.test.ts`
now interleaves the stale snapshot it claimed to prove — the pre-read still says "unused" while
the consume returns `count: 0`.

### Fixed — a failed quiz-history read no longer starts paid work (P1-S4)
`usePaperQuiz` could not distinguish "no graded session" from a failed or non-OK GET: both fell
through to `generateQuiz()`, so a transient read outage invoked Anthropic, created another
session, and could strand the existing one. A quiz is now generated only on an explicit
successful `session: null`; a read failure surfaces a recoverable error, and the banner's retry
button makes generating an explicit student action.

### Verification
Gates 1–5 pass. Vitest: **91 files / 1,310 tests passed**.

## [0.34.0] — 2026-07-25

First remediation batch against the 2026-07-23 adversarial re-audit (`REFACTOR2.MD` §0). Two of
the three P0 launch blockers and three P1 findings are closed. Everything here fails **closed**:
where the app was making a claim it could not back (this school is yours, this DOI was peer
reviewed, this is Form 1C, this link is a Google Doc), the claim is withdrawn rather than
patched with a better guess.

### Fixed — ISEF forms guidance no longer misidentifies required safety forms (P0-R4)
`lib/fairs/forms.ts` shipped the wrong form catalog: it named Form 1 the Student Checklist,
Form 1A the adult-sponsor approval, Form 1B an off-campus-only form, and Form 1C the
pre-approval research plan. The official ISEF listing assigns those numbers to
*Checklist for Adult Sponsor/Safety Assessment*, *Student Checklist/Research Plan*, and
*Approval Form* (required for every project); the 2027 edition retires 1C and Form 2 in favour
of 2A *Student Support Disclosure*, 2B *Qualified Scientist*, and 2C *Regulated Research
Institution*. A student following the old guide could skip a required approval or be
disqualified.

- The catalog is now a versioned `ISEF_EDITION` (season 2027, official forms + rules URLs,
  `sourcedAt` provenance) carrying **only the officially published form codes and titles**.
- Applicability and timing are **fail-closed**: `appliesTo` is `null` and `isEditionReviewed()`
  returns `false` until a qualified teacher/SRC reviewer sets `reviewedBy`/`reviewedAt`. While
  unreviewed, the checklist renders a notice pointing at the official forms and rules instead
  of restating them.
- The ~170-line `ISEF_FORM_GUIDES` prose (what the form is / what goes in it / why it triggers,
  plus per-form hazard-class tags) is **deleted**, not rewritten. Re-authoring unreviewed
  safety copy would reproduce the defect. The generic hazard-class primer (`lib/fairs/safety.ts`)
  is unaffected and still rendered.
- `forms.test.ts` no longer asserts the wrong mapping (it previously pinned "Form 1C is the
  Student Research Plan" as expected truth). It now pins the official titles for the codes the
  old catalog got wrong, the retirement of 1C/Form 2, and the fail-closed review gate.

### Fixed — a same-size catalog correction can no longer be suppressed (P1-R16, forms half)
`ensureFormsSeeded()` returned early when `count >= ISEF_FORMS.length`, so this very correction
would never have reached an already-seeded database. Seeding is now keyed on **code coverage**.
`GET /api/fairs/forms` serves names from the authored edition rather than the stored row and
filters out codes outside the active edition, so a database seeded under 2026 stops serving
retired forms without deleting rows that `TeamFormStatus` still references.

### Fixed — `school_only` showcase visibility withdrawn (P0-R2)
`User.schoolId` is derived from a free-text school name (`resolveSchool()` upserts whatever is
typed, and settings let a student change it at any time), yet `canViewShowcase` treated a
matching `schoolId` as proof of affiliation. Typing a victim school's exact name granted read
access to its school-only showcases and streamed assets. `school_only` now fails closed to
team-only, is removed from `PRIVACY_OPTIONS` and from the accepted `PATCH /api/showcase`
values, and existing rows degrade to private. The `PrivacyLevel` union keeps the value so
legacy rows typecheck. Restoring the level requires a **verified** school membership, not a
profile string. `showcase-public-asset.test.ts` now asserts the attack: a same-school viewer
gets 404 and no bytes are streamed.

### Fixed — Google Docs link validation accepted attacker URLs (P1-S12)
`extractGoogleDocId` searched for `docs.google.com/document/d/<id>` **anywhere** in the pasted
string, so `https://evil.example/?next=docs.google.com/document/d/<real-id>` passed: the server
fetched the genuine document by id but persisted the pasted URL, which the teacher view renders
as "Open research plan". The extractor now parses the URL and requires `https:` and an exact
`docs.google.com` host with a `/document/d/<id>` path; `fetchGoogleDocText` returns a
`canonicalUrl` built from the id alone, and that is what `POST /api/research-plan` stores.

### Fixed — a DOI is no longer presented as proof of peer review (P1-S11)
`tierFromDoi()` returned `peer_reviewed` for any DOI, and the badge told students the work was
"reviewed by other scientists". Crossref registers DOIs for preprints and posted content,
DataCite for datasets, software, and physical objects, and the DOI Foundation states nothing
definitive can be inferred from the name itself — so an uploaded preprint earned a green
peer-review badge and the product taught a false research-credibility rule. The function is
deleted (there is no honest offline mapping); an upload carries `credibilityTier: null` and
displays its DOI on its own. The DOI itself is still extracted and stored.

### Fixed — rate-limit store failures no longer remove the paid ceiling (P1-R4)
`UpstashStore.incr` caught every failure and returned `count = 1` — "first hit of a fresh
window", i.e. always allowed — so paid tiers ran uncapped during exactly the outage that should
have stopped cost growth. HTTP-200 responses carrying per-command pipeline errors or a
non-numeric `INCR` result defaulted the same way, because elements were never validated. The
store now validates the pipeline shape and every element and throws `RateLimitStoreError`;
`enforceRateLimit` owns the policy: **paid tiers (`ai`, `upload`) fail closed with 503 +
`Retry-After`**, read/mutation tiers fail open and log `rate_limit.store_error`.

### Added — `forms_catalog.form_code` unique index
`ensureFormsSeeded` has always depended on `form_code` uniqueness for its `skipDuplicates`
stampede guard, but no index existed (P2-S5). Migration `20260725120000_forms_catalog_unique_code`
adds it — and, applying P1-S14's lesson, **dedupes first**: it keeps the lowest id per code,
drops or repoints `team_form_status` rows that would violate the existing
`(team_id, form_id)` unique, and only then creates the index.

### Verification
Gates 1–5 pass (shared-types build, text integrity, typecheck, lint, production build).
Vitest: **90 files / 1,299 tests passed**. The migration is created and unapplied, per the
project's deploy convention.

---

## [0.33.1] — 2026-07-24

Field Codex content — two whole fields authored via `/codex-pipeline` (one invocation each:
brief → author → adversarial fact-check → deterministic merge). Content-only; no code changes.

### Added — Environmental / Earth Science (275 lessons)
Core + 5 branches: water-quality-hydrology, air-quality-atmosphere, soil-land-degradation,
climate-change-carbon, pollution-remediation-waste (43 units). Every unit cleared the HIGH-only
fact-check gate; one cross-lesson contradiction (the Exxon Valdez / Bragg et al. 1994
bioremediation magnitude) was reconciled to a consistent "two to five times, nitrogen-dependent."

### Added — Epidemiology / Medicine (275 lessons)
Core + 5 branches: outbreak-investigation, infectious-disease-modeling,
chronic-disease-epidemiology, biostatistics-clinical-trials, public-health-surveillance (43
units). One HIGH fixed before merge (a Ross "a priori pathometry" date mis-binding — the named
work is Ross & Hudson 1916-17, not the 1908-11 early work); two Whitehall I contradictions
reconciled (founder Reid & Rose, not Marmot; cohort ~17,000).

Library now **12 / 29 fields · 72 / 174 segments**; `CODEX_TRACKS` at 12. Both fields pass the
content-shape and generated-content (zod + checksum) gates. Per-run fact-check logs in
`.claude/codex-pipeline/reviews/`.

---

## [0.33.0] — 2026-07-22

Closes both remaining Track A findings from the REFACTOR2 audit and finishes P1-2. No new
features — this is correctness (real pointer clicks), accessibility (contrast), and one more
turn of the route-adapter crank.

### Fixed — isometric building clicks now land on the right building (A3-R)
Each building on the lab plot was an absolutely-positioned `<button>` whose full 128×128
transparent rectangle overlapped its neighbours in the iso layout; a real pointer click on one
building's visible art often resolved (`elementFromPoint`) to a stacked neighbour's transparent
corner. The E2E specs papered over this with JS `element.click()` bypasses, which dispatch
straight to the node and skip the browser hit-testing a student actually uses.

The fix (`components/lab/LabPlot.tsx`, `app/globals.css`): the button box is now
`pointer-events: none` and an inner `.plot-building__hit` layer carries the interaction plus a
`clip-path` polygon hugging the iso-building silhouette — clip-path clips hit-testing too, so
the transparent corners no longer intercept. Keyboard activation is unchanged (it never routed
through pointer-events) and the floating `.plot-level` badge stays outside the clip. One generic
polygon serves every sprite.

### Removed — the JS-click E2E bypasses (A3-R)
Deleted the `clickBuilding` helper (6 call sites) and the three inline `evaluate(el.click())`
bypasses in `placement.spec.ts` / `upgrades.spec.ts`; every site is now a genuine
`getByRole('button').click()`. Validated in a prod-build browser: `rubric-self-assessment` AC10
(Science Fair, an occlusion-prone side gateway) and `F3` AC6–AC9 (Operations Hub, frontmost,
and Discovery, the most-occluded centre gateway) all pass with real clicks. The
`dispatchEvent('pointerdown')` arrange-mode drag pickups are real pointer events, not occlusion
bypasses, and were left as-is.

### Changed — chrome text contrast floor at 40% white (A9-R, contrast portion)
The readability audit flagged ~600 tiny declarations, "often at 25–40% white." Per the product
decision to fix contrast first and keep the deliberate pixel-art sizes, all faint chrome text is
now floored at 40% white: 288 Tailwind `text-white/{5..35}` utilities across 80 components and
12 `color: rgba(255,255,255, <0.40)` declarations in `globals.css` were raised. The pass is
monotonic — opacity only, never font size, never layout — so nothing reflows; `border-color` and
`background` whites were left untouched. The 6–9 px **size** question and WebKit/Firefox E2E
coverage remain deliberately open.

### Changed — four highest-risk mutations onto `withTeamRoute` (P1-2, closed)
With the §3.2 E workflow-extraction queue already done (v0.31.0), the remaining P1-2 work was to
move the highest-risk *mutations* onto the guard wrapper, where a forgotten guard-return would
widen tenancy. Migrated behaviour-preserved: `team/location`, `team/invite`,
`showcase/asset/[id]` (dynamic-param DELETE), and `showcase/asset/link` (body parsed inside the
handler so its "save your showcase first" 409 still precedes any body-shape 400).
`team/advance-phase` was deliberately left on `requireTeamContext` directly — its prelude is
non-standard (conditional body parse plus a mid-handler `ai`-tier rate-limit on only the paid
transition). The remaining ~90 simple direct-Prisma handlers stay migrate-on-touch by design.

Gates 1–5 green; full Vitest 1292 passed; `test/route-guard-sweep.test.ts` confirms every
migrated route still carries its tenancy guard.

---

## [0.32.1] — 2026-07-21

Cleanup release, no behavior change. Finishes removing NCBI from the repo and collapses the
duplicated setup guide.

### Removed — the last NCBI/E-utilities references
`lib/discovery/ncbi.ts` itself was deleted in v0.31.0 when OpenAlex became Discovery's sole
live scholarly-search/citation adapter, but its configuration outlived it. `NCBI_API_KEY` and
`NCBI_EMAIL` are gone from `lib/env.ts` and `.env.example`; nothing in the codebase read
either (verified by grep before removal), so this is dead config, not a capability change.
Remaining `ncbi` strings in source are historical comments and `pubmed.ncbi.nlm.nih.gov`
permalinks, both of which are correct as-is.

### Changed — SETUP.md is one guide instead of two
The setup doc carried a full macOS guide and a full Windows guide as parallel top-level
sections, duplicating steps 0–8 (clone, env vars, install, database, run, pixel-art pipeline,
Claude Code, production deploy) with only a handful of per-OS command differences between
them. Merged into a single OS-agnostic walkthrough with the differences noted inline:
**596 → 91 lines net (−505).** Two copies of an install guide is two copies to drift.

### Added — how S2 enrichment reaches the student (ARCHITECTURE.md)
Documented what the Semantic Scholar adapter actually surfaces in the UI: a TL;DR card above
the abstract and the Cited-by lane's influential-first ordering, both in
`components/discovery/SourceReader.tsx` inside `ExplorerReaderPane`. Both degrade to
absent/unsorted rather than erroring when S2 is unavailable, so the reader never depends on it.

---

## [0.32.0] — 2026-07-21

Field Codex content release plus the first honest measurement of the authoring pipeline's
accuracy. Two whole fields shipped (**550 lessons**), 105 defects were found and repaired in
already-shipped content, and the harness gained an audit/repair loop — but the calibration
run at the end shows the authoring improvements **did not move the defect rate**, which is
the most important thing in this entry.

### Added — ecology and electronics-electrical-engineering (550 lessons)
Both authored whole-field in one `/codex-pipeline` invocation each, to depth target.

| Field | Units | Lessons | Run |
| --- | --- | --- | --- |
| `ecology` | 43 | 275 | 278 agents / 16.5M tokens |
| `electronics-electrical-engineering` | 43 | 275 | 208 agents / 13.6M tokens |

STATUS: **10 / 29 fields · 60 / 174 segments.**

### Added — post-ship audit loop for shipped content
Shipped content had never been checked after the fact. It is now, by two new workflows plus
a validated merge-back:

- `.claude/codex-pipeline/audit-field.workflow.mjs` — batched fact-check of shipped lessons,
  tiered search budget, hunting entity-binding defects.
- `.claude/codex-pipeline/repair-findings.workflow.mjs` — applies findings to extracted
  working copies, propagating each correction across the whole lesson; rejects findings it
  judges wrong (2 of 62 were rejected with reasons, both correctly).
- `.claude/codex-pipeline/reviews/AUDIT.md` — cross-field audit log.

### Added — whole-field Consistency phase in the authoring workflow
The only phase that can see ACROSS lessons; every other agent sees one unit, so two lessons
could teach the same landmark two different ways and nothing noticed. Shipped astronomy
dated Hubble's proof that galaxies lie outside the Milky Way to 1929 in one lesson and 1923
in another. On its first live run it caught 2 real contradictions in electronics (Moore's
law start year; Little Box Challenge inverter spec) and reconciled both before merge.

Costs ~0.6% of a field run: the agent reads only sentences carrying a date (~560 per field),
never the lessons. It cannot be done deterministically — a script flagging "surname with
multiple years" was built and measured at 48 candidates in astronomy, essentially all false
(prolific researchers legitimately publish repeatedly).

### Fixed — 105 defects in shipped content
Found by auditing 858 lessons across four fields and repaired in place; gates green after
each pass.

| Field | Audited | Defects | HIGH |
| --- | --- | --- | --- |
| ecology | 186 | 22 | 11 |
| astronomy-astrophysics | 167 | 27 | 11 |
| data-science-ml-metrics | 210 | 20 | 12 |
| computer-science-algorithms | 145 | 14 | 11 |
| electronics-electrical-engineering | 150 | 19 (unrepaired) | 13 |

The dominant family was **entity binding** — a true fact attached to the wrong thing, not an
invented fact. Nine confabulated given names on real citations (surname and year correct
every time): "A.J." Zippin (Calvin), "Michael" Connor (Edward F.), "Ardie" Peet (Margriet),
"David" Goldsmith (Donald W.), "Robert" Kron (Richard G.). Plus wrong-work-by-right-author,
wrong-side-of-a-debate, and two different quantities framed as one.

### Changed — authoring harness, from defects observed
- Author: cite surname + year, **never invent a given name**; a checkpoint may only test what
  its own lesson taught.
- Checker: explicit entity-binding section, and **recompute every number by hand** (added
  after the calibration run — arithmetic was 58% of surviving defects).
- Fixer: propagates each correction across the whole lesson; effort `low` → `medium`. Measured
  worth: a repair pass applied 60 findings but changed **98 text sites**.
- Search budget tiered on a new `claimHeavy` brief flag (8 for claim-heavy units, 3 otherwise).
- `codex:merge` gained two non-blocking advisories: orphan numeric premise and orphan citation
  in an answer key.

### Changed — calibration says the pipeline still produces ~12% defective lessons
Electronics was authored on the improved harness and then audited on a 150-lesson stratified
sample. **12.0% of lessons carried at least one defect, against 11.8% for ecology on the old
harness.** The improvements did not measurably reduce the rate.

Two further results worth recording, both against prior assumptions:
- **Low-signal lessons are not clean.** The never-before-audited tail cohort (no citation or
  claim-density signal) came back at 11.8%, and the citation-rich cohort was the *cleanest*
  at 5.9%. Targeting audits by structural signal was backwards.
- **Two structural defect predictors failed and should not be rebuilt** — claim density
  (within a field) and citation exposure (across fields; astronomy had the lowest exposure
  and the highest defect rate). Measured against known defects, the deterministic scanner
  scored 8% precision and 5% recall. It is a merge-time regression guard, not triage.

---

## [0.31.0] — 2026-07-20

Architecture + code-quality release. Two things landed: the Track-B route/service seam was
finished for every workflow route, and the whole authored codebase (601 files) went through
an over-engineering audit whose every finding was adversarially verified before it was
applied. Net effect on authored code: **−2,762 lines** with no behavior change, plus one
real bug fixed on the way.

### Fixed — teacher-feedback panel dropped its own optimistic update (F1 AC5)
The "Mark addressed" button reverted seconds after a **successful** `PATCH 200
{"updated":1}`, and `e2e/F1.spec.ts` AC5 had been red on a clean tree (reproduced via
`git stash -u`), blocking AC6–AC12 from ever running.

Root cause was a client stale-response race, not the route: when the panel opens before
`LabScene`'s warm-up `GET /api/team/feedback` resolves, the panel self-loads — and React
StrictMode's double-mount leaves a duplicate GET in flight. The user clicks, the optimistic
`resolved: true` renders, then the *older* in-flight GET lands and unconditionally
overwrites it. StrictMode makes it deterministic in dev; the same race exists in production
on a slow network.

- `FeedbackPanel` now carries a monotonic freshness token: every local mutation bumps it,
  and a load captures it at request start and **drops its own response** if a mutation won
  meanwhile. `initialData` became a mount-time seed only (it no longer re-syncs the list on
  every parent prop change).
- `LabScene`'s warm-up fetch is guarded by `feedbackSeededRef` — once the panel has reported
  newer data, a late warm-up response can no longer clobber the snapshot or badge count.
- F1 now passes 13/13 twice consecutively, including AC6–AC12 which had never executed.

### Changed — Track B P1-2 complete: every workflow route is a thin adapter
All six `§3.2 E` inline-workflow routes now follow the `lib/papers/service.ts` seam — the
route selects the policy, parses with Zod, calls ONE application operation, and maps a typed
result to HTTP. Workflow logic (authorization, transactions, atomic claims, provider calls,
prompt construction) moved into services where it is testable without a `NextRequest`:

| Route | Route lines | Service |
| --- | --- | --- |
| `ops/codex/complete` | 293 → 49 | `lib/ops/codex/complete-service.ts` |
| `ops/codex/study-plan` | 202 → 46 | `lib/ops/codex/study-plan-service.ts` |
| `research-plan/review` | 261 → 30 | `lib/research-plan/review-service.ts` |
| `research-plan/idea-check` | 274 → 26 | `lib/research-plan/idea-check-service.ts` |
| `teacher/student/[id]/overview` | 347 → 27 | `lib/teacher/student-overview.ts` |
| `project-log` | 247 → 57 | `lib/logs/project-log-service.ts` |

Streaming services return typed `replay`/`stream` variants so the adapter only wraps them in
a `Response`; the NDJSON contracts, prompt-cache prefixes, and atomic cap/claim SQL are
byte-identical to before. This is a code-motion release for these files — total lines rose
slightly (services gained explicit result types); the win is one owner per rule and unit-
testable money/authorization logic. **The remaining ~90 simple handlers are deliberately
NOT wrapped** — migrate-on-touch only; a scoped `findFirst` behind a guard gains nothing
from a service.

### Changed — full-repo over-engineering audit (601 files → 121 verified cuts)
Ran as an orchestrated fleet: 80 batched auditors read every authored source file
(`apps/web` + `packages`, excluding generated Codex tracks and sprite manifests), then
**every** finding got its own adversarial verifier that re-ran the greps, checked
behavior-parity and tested contracts, and defaulted to *not confirmed*.

- **477 of 601 files audited lean.** The large files the architecture doc flags (vocab
  tables, ZIP centroids, rubric anchors, the route-policy harness, `discoveryStore`,
  `quiz-retry`'s claim machinery) are big but justified — pure data or tested invariants.
- **136 findings → 121 confirmed, ~15 rejected, 2 unverified** (verifier agents lost to an
  API/session limit; unverified findings were **not** applied).
- Rejections are as informative as the cuts: the bulk `requestJson` sweep (strict Zod
  parsing would change failure behavior at ~25 call sites), the `fmtDate` swap
  (locale-dependent vs fixed `date-fns` format), and several "identical" label maps that
  differ on one value.

**New shared primitives** (each replacing 2–6 copy-pasted implementations):
`lib/fetch-retry.ts` (`fetchWithRetry` + `sleep` — five 429/5xx retry-after loops and six
`sleep` definitions), `lib/chat/thread.ts` (server chat-turn: bounded history, leading-
assistant trim, two-turn `cache_control` breakpoints, pending→complete transaction — shared
by paper chat and Vega), `components/ui/ChatThread.tsx` (message list + composer),
`components/ui/ModalBackdrop.tsx` (the `useModalA11y` + backdrop wrapper behind all five
panel shells), `components/discovery/TopicConfirmModals.tsx` (settings + discovery topic
modals, ~190 duplicated lines), `lib/date.ts` (`todayUtc` ×4), `lib/ndjson.ts`
(`createNdjsonStream`), `lib/papers/pdf.ts` (`streamStoredPdf`),
`lib/research-plan/require-plan-text.ts`, `lib/pdf/sanitize.ts::isPdfMagic`,
`lib/literature/quiz.ts::mapGradedQuizSession`, `lib/discovery/interest.ts`,
`lib/onboarding/profile.ts::resolvePrimaryEmail`, `lib/format.ts::truncate`,
`components/auth/ClerkAuthShell.tsx`, `components/teacher/TeacherPanelState.tsx`,
`lib/hooks/useElementSize.ts`, shared `useResizablePanel`/`useCopyToClipboard`,
`lib/literature/citation-core.mjs`, `lib/ops/codex/scripts/stable-stringify.mjs`, and
`e2e/fixtures.ts` + `e2e/discovery-helpers.ts` (spec-level dedup).

### Removed — dead code the audit proved unreachable
- `lib/discovery/ncbi.ts` — the standalone PubMed E-utils adapter, superseded by the merged
  OpenAlex search; `lib/discovery/arxiv.ts` reduced to `normalizeArxivId`.
- `packages/shared-types/src/pvp.ts` (+ `SpellType`) — zero consumers, and PvP is not built
  (see §8.10 / A1).
- Unused signed-URL helpers (`getUploadSignedUrl`/`getDownloadSignedUrl`), dead `lib/env.ts`
  accessors, `DEV_DEFAULT_HIGH_SCHOOL`, `CodexTrack.home`/`labType`, `TeacherContext.role`,
  the `Toast` tones/positions nobody rendered, and unused exports/props/types across ~30
  files. Several `export` keywords dropped to module-private where only the file used them.

### Fixed — one behavior bug surfaced by the audit
`DiscoveryHome`'s hand-rolled topic editor closed on save regardless of outcome, silently
swallowing a rejected/confirmation-needed save. It now shares `useFinalTopic`'s lifted edit
state (the same state `FinalTopicBar` uses), so a failed save keeps the editor open with the
draft intact. Native `autoFocus` replaced a `setTimeout(…, 0)` focus hack.

### Added — coverage for surfaces the refactor touched
- `e2e/settings-smoke.spec.ts` — the Lab Profile settings panel's **first** browser
  coverage, added when its topic flow moved onto the shared hook.
- `data-testid="topic-removal-modal"` on the shared removal modal, so its spec scopes
  "Cancel" to the modal now that the editor stays open behind it.
- `.eslintrc.json` bans `alert()`-style E2E anti-patterns flagged during the sweep.

### Verification
Gates 1–5 green (shared-types build, text integrity, typecheck, lint, production build) plus
**1,286 unit tests**. Nine E2E suites re-run against the touched surfaces: `a11y` (focus
trap through the new `ModalBackdrop`), `settings-smoke`, `topic-removal-confirm`,
`placement`, `F1` (13/13), `F13-codex` (15/15), `F18-vega-companion` (11/11, incl.
persistence + the prompt-cache static pins), `papers-tab` (15/15), `F11-quiz-retry` (14/14).
Two coder-introduced breaks were caught and fixed mid-sweep: a unit-test mock missing a
newly-imported export, and an E2E locator that went ambiguous after a modal was shared.

---

## [0.30.0] — 2026-07-19

Track A close-out for the v0.29.4 adversarial audit (`REFACTOR2.MD` A1–A14), plus the first
two Track B route extractions and an N+1 sweep. Suite: 89 files / 1,285 unit tests, a
4-invariant real-Postgres suite, and a live-verified accessibility smoke.

### Fixed — tenancy & classroom correctness (A2)
- Quiz-session GET (`/api/papers/[id]/quiz`) now proves `paper.teamId === ctx.teamId` before
  reading a session — a user retaining an old membership can no longer read a non-active
  team's graded session by paper id. The policy test that blessed the 200/null contract now
  expects 404, plus a real cross-team-session case.
- ADR-004 compliance: onboarding no longer writes `Team.classId`; the teacher roster no
  longer reads it — cross-class and null-class teams appear on the correct teachers'
  rosters (new roster policy matrix pins both directions).

### Fixed — durability & money (A5, A6, A8, A12, A13)
- Uploads are reservation-first (`reserveUploadAsset`): atomic quota check + `temporary`
  ledger row commit BEFORE any byte reaches R2, for all three paths (paper PDF, log
  attachment, showcase asset); domain link + `attached` flip commit in one transaction; a
  failure after any step converges via the sweep (no untracked objects, no zombie papers).
  `orphanObjectKey` swallows only a verified P2002 adoption race.
- Storage quota can no longer be overshot by concurrent uploads (per-team advisory lock);
  showcase single slots replace atomically and multi-slot caps are enforced under a
  per-(showcase, slot) lock — including the works-cited export.
- Daily LC award: only Prisma `P2002` reads as "already credited"; other failures retry
  once, emit a redacted structured event, and surface `lcAward: 'failed'` instead of
  silently dropping the credit. Consolidated in `lib/economy/lab-credit.ts` (both log routes).
- Quiz-retry generation is concurrently idempotent: a conditional-update claim
  (`retryGenClaimedAt`) elects ONE generator before the paid call; followers adopt the
  committed question; failed generations release the claim. Proven by a concurrent
  `Promise.all` test and a real-Postgres claim race.
- Showcase views are deduped per visitor per UTC DAY by a
  `(showcaseId, fingerprint, day)` unique — concurrent first loads count once
  (`recordShowcaseView`).

### Changed — notifications at 10k-user scale (A4)
- `NotificationRunTeam` run ledger: every team checked for the day gets a durable row
  (zero-draft teams included; failed teams retry). Cron now fires every 15 minutes over a
  morning window (`vercel.json`), so one day covers 20,000 teams, not 1,000.
- Fair matching is bulk-loaded once per run (`loadFairIndex` + in-memory matching) and
  last-log timestamps grouped per page — the per-team fair/event/log fan-out is gone.
  A deterministic capacity test proves 3,500 teams complete in ≤5 runs within a
  page-scaled query budget.

### Fixed — privacy (A7)
- All ten sites logging student queries or model-output slices to `console.*` now emit
  redacted `logEvent`s (identifiers, stop reasons, lengths only), including the quiz-retry
  error that embedded model text. `test/log-redaction-sweep.test.ts` statically forbids the
  class.

### Added — release gates & accessibility (A3, A9, A10, A11)
- `.github/workflows/e2e.yml`: a bounded production-build smoke lane on PRs + the full
  Playwright suite nightly/on-demand, gated on the `E2E_ENV_FILE` secret. (The isometric
  JS-click bypass removal remains open — it needs the hitbox fix first; tracked in A3.)
- Accessibility floor: shared `useModalA11y` (focus trap + restore + Escape + scroll lock)
  wired into ConfirmDialog and all five panel shells; accessible names on eight icon-only
  controls; a global `:focus-visible` outline; a blanket `prefers-reduced-motion` fallback;
  the two worst 6px/40%-white styles raised. `e2e/a11y.spec.ts` (axe critical + real
  keyboard trap/restore flow) runs on desktop AND a tablet viewport — verified green live.
- `/daily/log` and `/daily/failure` first-load JS: **582 KB → 211 KB** (every Operations
  Hub tab is now a dynamic boundary).
- `test/pg/invariants.pg.test.ts`: narrow real-Postgres suite (quota lock, LC unique,
  retry-claim election, view dedupe) against the local dev DB; self-skips without one.

### Changed — architecture (Track B P1-2, N+1)
- Extracted ALL SIX §3.2 E inline-workflow routes into application services:
  `lib/teacher/student-overview.ts` (teacher drill-down, 347→27 route lines),
  `lib/logs/project-log-service.ts` (project log read/write),
  `lib/ops/codex/complete-service.ts` (progression gate + grading + atomic KP/cap claims,
  293→49), `lib/ops/codex/study-plan-service.ts` (hash cache + atomic re-run cap, 202→46),
  `lib/research-plan/review-service.ts` (streaming rubric critique + replay cache, 261→30),
  and `lib/research-plan/idea-check-service.ts` (web-search novelty stream, 274→26).
  Streaming services return typed replay/stream variants; adapters own only guard →
  parse → call → HTTP. Remaining P1-2 work is migrate-on-touch for simple handlers.
- N+1 fixes: forms-catalog seeding and the citations backfill are single bulk writes;
  measurements POST returns only the created rows (`createManyAndReturn`) instead of the
  full history; the teacher-auth class lookup is bounded.

### Changed — docs & claims (A1, A14)
- PvP is documented as NOT shipped everywhere (ARCHITECTURE.md said it had); AGENTS/CLAUDE
  say Next.js 15 and describe the real CI lanes; SECURITY.md's harness/remediation sections
  updated to the shipped state with the A2/A11 caveats.

---

## [0.29.4] — 2026-07-19

Route-policy harness: the authorization matrix for every dynamic API route now runs in the
unit suite, closing the two holes the existing tests could not see — a dropped guard-error
return (route tests stubbed the guard away, so an unauthenticated route still passed) and an
unscoped lookup (`findUnique({ id })` vs `findFirst({ id, teamId })` — E2E IDOR probes used
nonexistent ids, which 404 either way; only another team's *real* row tells them apart).

### Added
- `test/harness/route-policy.ts` — calls route handlers directly as Student A/B, Teacher A/B,
  or anonymous. Mocks ONLY Clerk `auth()` + `@/lib/db` (in-memory rows genuinely filtered by
  where-clause, incl. compound uniques and relation filters) plus no-op storage/activity
  stubs; `requireTeamContext`/`requireUserContext`/`requireTeacher`/`withTeamRoute`, the real
  rate limiter (`overLimit()` exhausts actual buckets), CSRF (`crossOrigin()`), phase gate,
  and zod all run for real. Fixture ships two teams, so cross-team 404s are provable.
- `test/harness/route-policy-selftest.test.ts` — proves the harness discriminates: a
  deliberately unscoped handler leaks team B's row (while still 404ing a fake id — why the
  old probes were blind) and a guard-dropping handler serves anonymous traffic. Goes red if
  the harness machinery ever stops telling these apart.
- Eight matrix specs (`test/*-policy.test.ts`, ~200 tests) covering all 29 dynamic routes:
  papers, data-terminal, discovery, failure-log, literature, project-log, fairs+showcase,
  teacher. Tailored pins where scoping is not in the first where-clause: quiz-grade's
  post-fetch `session.paper.teamId` check, sync-deadlines' own-state gate (BLK-5) on the
  global fair catalog, the forms upsert writing only the caller's team row, vocab cards'
  per-student scope. Teacher matrix adds the extra axis: signed-in students 403, a teacher
  from another class 404s (never learns the row exists). AI-backed POSTs assert the failure
  half only — every access decision lands before the model call, so no test reaches
  Anthropic or the network. Suite: 82 files / 1,246 tests, ~7s.

---

## [0.29.3] — 2026-07-19

The five findings v0.29.2 recorded but did not fix. Each ships with a pinning test, and two
of those tests caught bugs in the fix itself before it landed.

### Fixed — CSV formula injection (confirmed live)
`lib/data-terminal/csv.ts` wrote user-controlled cell text unescaped, so a series/note value
beginning `=`, `+`, `-`, or `@` executed on open in Excel/Sheets — a student could hand a
**teacher** a weaponized export (`=cmd|'/c calc'!A1`, `=HYPERLINK(…)`). `csvField` now
prefixes those with `'`.
- **The first version of this fix was wrong**, and the test caught it: it also prefixed
  negative *numbers*, turning `-5` into text and corrupting the teacher's copy of the data.
  Well-formed numbers are now exempt (`isPlainNumber`), while `-5 degrees` and `-1+1+cmd`
  are still neutralized. Both directions are pinned.

### Fixed — production environment assertion
`E2E_SKIP_LLM=1` returns `null` from `enforceRateLimit` **before** the paid-tier guard, so it
disables **all** rate limiting including the cost cap; `RATE_LIMIT_ALLOW_MEMORY` and
`E2E_MOCK_SOURCES` are the same class. The only thing preventing production use was a code
comment. New `lib/env-guard.ts`, called first in `instrumentation.ts#register`, refuses to
boot a production server carrying any of them — a loud startup failure instead of a silently
uncapped bill. `test/env-guard.test.ts` pins the behavior **and** that the guard is actually
wired into startup (a guard nobody calls is worth nothing).
- **The first version refused to boot the E2E suite** — because v0.29.0 made E2E run against a
  production build, so `NODE_ENV==='production'` is true during tests while the flags are
  legitimately set. Caught by running the suite. Resolved without weakening the control:
  `VERCEL_ENV` (which the platform always sets and the harness never does) makes the check
  **unconditional on any real deploy — no bypass, including preview**, while a local
  prod-build run may carve out via the `E2E_BUILD=1` the test script already sets. Pinned by
  a test asserting `E2E_BUILD` cannot rescue a `VERCEL_ENV=production` environment.

### Fixed — markdown render policy for untrusted text
Four components rendered LLM output and student writing through `react-markdown` with no link
policy — the last unguarded render sink. All now use `components/ui/SafeMarkdown.tsx`:
`http`/`https`/`mailto` allowlist (`javascript:`, `data:`, `vbscript:`, `file:` drop to inert
text), `noopener noreferrer nofollow` on every link, and remote images replaced by alt text
(a model reply has no legitimate reason to load a tracking pixel). The scheme policy lives in
`lib/markdown/safe-href.ts` so it is testable without JSX. `test/safe-markdown.test.ts` pins
the policy and **sweeps the component tree** so a new sink cannot bypass it.

### Fixed — showcase PDF page-bomb cap
`showcase/asset/route.ts` called `inspectPdf(buffer)` without `pageCount`, silently skipping
the bomb guard on the **only** PDF path that reaches anonymous fair visitors. It now parses
the count and passes it; an unreadable PDF is rejected rather than served.

### Fixed — Firecrawl timeout
`extract()` was the only unbounded external call in the codebase. Now raced against a 60s
ceiling. The SDK exposes no abort signal, so the underlying job is not cancellable — the race
bounds how long *we* wait, which is what the request and the platform care about.

### Changed — `docs/SECURITY.md` §3.1 rewritten after an authorization audit
A full end-to-end trace of the auth layer confirmed the student-facing posture is genuinely
solid (no team-parameterized URL exists; every dynamic id is scoped inside the WHERE clause;
tampering yields 404). But it also found that **three separate things read as IDOR coverage
and none of them prove tenancy**:
1. the guard sweep is a regex over source text — it cannot see a missing
   `if (error) return error`, or an unscoped query;
2. the ~29 `findFirst({ id, teamId })` clauses are convention, with no Prisma middleware or
   RLS enforcing tenancy at the data layer;
3. **the E2E specs labelled "IDOR guard" use fabricated ids** (`'clxxxxxxxxxxxxxxxxxxxxxxx'`,
   `'not-a-real-session-id'`) — a non-existent id 404s whether or not the scope clause is
   present, so those tests would pass with `teamId` deleted. They exercise the not-found path,
   never "exists but isn't yours".

§3.1 now says all of this explicitly, and the route-policy harness (needing a real second team
in the fixture) is the top remediation item.

Documentation consolidation, verified against the code rather than against the documents'
own status markers — which had gone stale in both directions. Three independent audits
(one per document) drove the pruning; one fixed a real bug they surfaced.

### Removed
- **`docs/REFACTOR.md`** — every item verified shipped. Its one genuinely open item, **SVC-1**
  (reward-minting duplicated across three grade paths), moved to `REFACTOR2.MD` §4 with all
  three current duplication sites listed and its now-expired PvP deferral noted. The six
  CHANGELOG links to it were converted to plain text so no dead links remain, and
  `docs/ARCHITECTURE.md`'s two references were rewritten.
- **`SECURITY2.MD`** — merged into `docs/SECURITY.md` (below).

### Changed — `REFACTOR2.MD` pruned 731 → 578 lines
- Deleted everything shipped: P0-1 (tenancy), P0-2 (NUL bytes), P1-3 (paid-work), P2-5
  (generated curriculum), §3.2 A and C, all of §5.1 (PILOT-1…7), §7 (an executed plan), §8
  (a claim register whose tree no longer exists), and §9.1.
- **Corrected guidance that had become actively dangerous.** The executive verdict recommended
  "a team belongs to exactly one class" and §6.4 instructed authorizing teachers via
  `Team.classId` — both the *opposite* of accepted policy since ADR-004, and a security
  regression if followed. Replaced with an explicit "tenancy is settled, do not re-open it"
  block linking the ADR.
- Corrected stale facts: the "no route-level tests" premise (four route tests now exist),
  god-file line counts, schema size, and the §3.2 E extraction list (paper upload and quiz
  retry are now thin adapters).
- Track A is marked complete; the document is now explicitly Track B/C only.

### Changed — `docs/SECURITY.md` is now one document (1372 + 535 → 583 lines)
Restructured around what a reader actually needs: launch blockers (non-code first, since
they outnumber and outlast the code items), a severity-tagged register of **open** threats
only, implementation recipes kept as normative guidance for new code, a test-tripwire map,
and the non-code legal/ops track. Preserved from each source: cron protection, email/DNS,
Google OAuth, the route-audit checklist, credential inventory and sign-off table (from the
old SECURITY.md); the severity vocabulary, identity/enrollment/SSRF/cost/environment threats
and the chained-attack narrative (from SECURITY2.MD).
- Two stale cross-references fixed: `SETUP.md` and `TODO.md` both pointed at "SECURITY.md §4"
  and "§5", section numbers the old document never had.
- The register now states plainly what is **not** pinned by any test — runtime cross-team
  IDOR (the guard sweep is a regex over source text), markdown render policy, CSV
  neutralization, SSRF, cache behavior — so a green suite is not mistaken for coverage.

### Fixed — paper deletion leaked its object and its storage quota
`DELETE /api/papers/[id]` removed the paper row and its dependents but never touched R2 or
the asset ledger. The `attached` `UploadedAsset` row outlived its paper, so those bytes stayed
charged against the team's 2 GB quota **permanently** and the object was never reclaimed — a
regression introduced alongside the v0.28.0 quota itself, reachable by an ordinary student
just tidying their library. Now records intent via `orphanObjectKey` so the reclaim sweep
retires the object; `test/paper-delete-asset.test.ts` (4 tests) pins it, mutation-verified.

### Notes — new findings recorded, not yet fixed
The security audit surfaced issues neither document knew about. The highest-value ones are
now §3 entries with a remediation order in §9: **CSV formula injection** in the data-terminal
export (confirmed live), **no production assertion** against `E2E_SKIP_LLM` (which disables
*all* rate limiting and is prevented only by a comment), an unfenced **markdown render policy**
for AI output, a missing **page-bomb cap** on the only anonymous-facing PDF path, and the
**Firecrawl call with no timeout**.


The deferred test slices from 0.29.0, plus an adversarial verification pass over every
test written in the 0.28.x-0.29.x sweep — mutation testing, semantic review, and E2E-spec
review by independent (Sonnet/Opus) agents, findings applied. 989 unit tests across 74
files (from 899/61).

### Added — the deferred test slices
- **`stores/discoveryStore.test.ts`** (19) — the REAL store against a mocked treeApi:
  `deleteSubtree` cascade + reselection, failed-persist re-hydrate rollback (phantom
  nodes come back), `newTreePending` consumed by opens but NOT by branches, dedupe
  mirrors of the DB uniques (externalId team-wide; videoId per-parent), KP nonce bumps
  only when the server paid, hydrate's loadError-vs-empty distinction (BLK-7).
- **`lib/literature/quiz-retry.test.ts`** (13) — 404-not-403 session scoping, the
  at-most-ONE-paid-generation idempotency proven on the real path (no model call, no
  write when the extra question exists), replayed passed-ids never regraded, carried
  scores in the aggregate, the retry cap BINDING (uncapped 97 → 95), KP high-water.
- **`lib/buildings/service-tx.test.ts`** (17) — the transactional plot economy with
  REAL economy math and plot geometry (only I/O mocked): conditional KP debit, in-lock
  occupancy re-check beating a stale snapshot, free positioning of owned-unplaced
  buildings, P2002 double-buy → 409, atomic sell refund, level-guarded upgrades, and
  both insufficient-currency messages (KP and LC branches).
- **`lib/literature/explain.test.ts`** (10) — the both-bars pass rule (fluent-but-wrong
  never passes), once-ever KP eligibility, normalizeVerdict clamps/caps/rounding, and
  the E2E fixture verdicts staying in sync with the real pass rule.
- **`lib/discovery/awardVisit.test.ts`** (6) — P2002 → zero further writes (the sole
  idempotency gate), non-unique errors rethrown, cap-exhausted and partial-clamp paths.
- **`lib/api/client.test.ts`** (5) — requestJson: non-2xx always throws ApiError,
  schema drift throws, HTML error bodies produce clean errors.
- **Extract-and-test** (Track B "split mixed-responsibility" micro-slices, behavior
  preserved): `components/literature/quizDerive.ts` (retry answer-set derivation — the
  server twin reads the rubric off fs, hence the client copy), `components/literature/
  synthesisSlug.ts` (column-id collision walk; a collision silently merges cells),
  `components/ops/project-log/logListOps.ts` (delete renumbering, page-boundary dedupe,
  create/edit merge) — 16 tests over the three; the hooks now call the shared modules.
- `vitest.config.ts` now includes `stores/**` and `components/**` test files.

### Changed — refactor judgments (recorded, not assumed)
- `lib/buildings/service.ts` (REFACTOR2 §3.1 "preserve, don't replace"),
  `lib/literature/quiz-retry.ts` (already "the Track-B template"; its route is a
  58-line adapter), and `stores/discoveryStore.ts` (I/O already isolated in treeApi)
  needed NO structural refactor — tests were written against the real modules.

### Fixed — findings from the verification pass
- **`batchCheckRelevance` hardened**: ids the caller never sent can no longer enter the
  result map (a hostile abstract forging the scaffolding could make the model emit
  foreign ids). Previously harmless only because the sole caller iterated its own list.
- The one misleading test (asserted that foreign-id leak as "documented behavior" under
  a name claiming the opposite) now asserts the hardened behavior; six
  assertion-precision fixes from the semantic review (exact 3500-char excerpt slice pin,
  a cap-actually-BINDS retry case, clampScore rounding, max-rollup discrimination in
  teacher analytics, the LC-branch upgrade message, exact ZIP/rubric value pins).
- `e2e/topic-removal-confirm.spec.ts`'s third test was vacuous relative to its name (it
  re-checked API JSON, never the UI) — it now drives the REAL FinalTopicBar → confirm
  modal → removal modal and asserts the paper titles render (and cancel deletes nothing).
- `e2e/F3.spec.ts` seeding now fails loudly when a crashed run left the shared team at
  the 25-paper lock (was: opaque delete-button timeouts).

### Verification
- **Mutation testing**: 36 realistic regressions introduced across the swept modules
  (worktree agent on committed code: 28/28 meaningful mutants caught; the remainder
  re-run on the working tree against the new tests: all caught). One mutant proved
  semantically equivalent (the quiz-retry answerMap filter — protection actually lives
  in toGrade construction, which IS pinned) and was replaced with a meaningful one.
- **Semantic review** (all 25 session test files): no tautologies, no redundancy;
  7 precision findings, all applied.
- **E2E-spec review**: fixture stub-alignment for the topic-removal spec verified
  against the real token-overlap rule; F18's requestId-paired cleanup verified against
  the route's transaction; both hand-built PDF fixtures executed through the real
  parser.

---

## [0.29.0] — 2026-07-19

Two workstreams: the flaky-E2E root-cause pass (the suite now runs against a production
build), and a test-coverage sweep driven by three parallel audits (backend, frontend,
security) — 899 unit tests, up from 637. Chasing the flakiness also surfaced and fixed
two real product bugs students would have hit.

### Changed — full E2E runs against a production build
- **`test:e2e` now builds and serves the production bundle** (`E2E_BUILD=1` →
  `next build && next start` in `playwright.config.ts`); single-spec iteration
  (`test:e2e:file`) keeps the fast dev-server loop. A 310-test serial run against
  `next dev` was flaky by construction: on-demand compiles blew tight assertions and
  30s gotos, the dev server degraded over a ~30-minute run (ERR_ABORTED/ECONNRESET),
  and aborted requests popped the `<nextjs-portal>` dev overlay which then
  **intercepted pointer events** and failed every later click (upgrades AC12's click
  log showed it verbatim).
- **Measured effect:** dev-mode runs: 12-16 failures, different set each time, ~30 min.
  Production-build runs: 1-4 failures, ~16 min. The remaining failures were NOT
  flakiness noise — each was chased individually (below).
- `e2e/F3.spec.ts` seeds papers **directly via `e2eDb`** with run-tagged titles. Its old
  seeding POSTed the dev-only `/api/dev/fill-papers` route — which correctly 403s under
  a production server — and 25 sequential HTTP creates also blew the 30s hook budget on
  a loaded dev server (F3's chronic 0ms AC1 failure). Passes 11/11 now; it had never
  fully run in any suite invocation this session.

### Fixed — Vega study chat clobbered a fast student's first message (F18 AC3's real cause)
- **`VegaStudyTab`'s mount-time history GET replaced local state unconditionally** when
  it resolved. Send a message before it lands (fast typing — or an E2E spec) and the
  stale pre-send snapshot wiped both the optimistic user turn and the reply from view.
  The history load now applies only while the thread is pristine.
- The F18 spec's cleanup deleted by RUN_ID content match — which only USER rows carry —
  so every run **leaked its assistant replies** (35 orphans accumulated in the E2E
  thread, slowing the history GET until it reliably lost the race above). Cleanup now
  resolves marker → `requestId` and deletes both roles; the orphans were purged.

### Fixed — topic-save errors rendered as "topic cleared" (frontend audit find)
- `useFinalTopic.saveTopic` had no `!res.ok` guard: a 429/400/stale-session response
  fell through to the success path, cleared the displayed topic, and closed the editor —
  in the flow that authorizes deleting papers. Its Lab-Profile twin had the guard; the
  two "mirror" copies had diverged. Both now route through ONE tested interpreter
  (`lib/discovery/topic-save.ts`); Discovery surfaces the error inline and keeps the
  draft.
- `lib/fairs/zip.ts`: the leading-zero ZIP recovery branch was provably dead (checked a
  3-char slice for `length < 3`), so a ZIP that lost its leading zero upstream ("6001"
  for CT 06001) resolved to an **Illinois** centroid — a silently wrong-region fair
  match. Now restored before prefixing, with a characterization test.
- Deleted the dead `httpUrl` schema from `lib/validation.ts` (zero consumers — a dead
  "safe URL" helper invites someone to assume it's the enforced one; `isSafeHttpUrl`
  in `lib/showcase.ts` is the real, tested gate).

### Added — test sweep (899 unit tests across 61 files, from 637/45)
Driven by three parallel coverage audits; every control that regressed silently before
now has a tripwire:
- **`test/route-guard-sweep.test.ts`** — every one of 98 API routes must carry an auth
  guard (2-entry allowlist pinned to its compensating controls); all teacher routes
  must use `requireTeacher` specifically.
- **`test/cron-auth.test.ts`** — `assertCron` behavior: unset-secret 503 (fail closed),
  production short-secret refusal, wrong/missing-bearer 401 + denial logging, and a
  source pin on `timingSafeEqual`.
- **`test/guard-wiring.test.ts`** — the three shared guards actually INVOKE
  `assertSameOrigin` (CSRF), in the right order, before any DB resolution.
- **`lib/discovery/sanitize.test.ts`** — hostile-HTML fixtures against the shared
  allowlist + option pins (sanitize-html option typos fail OPEN).
- **`test/topic-removal.test.ts`** — the two-phase wipe protocol: phase 1 proposes and
  deletes nothing; phase 2 deletes only caller-approved, team-scoped ids with NO model
  call; paid tier cleared before the model.
- **`test/prompt-injection-pins.test.ts`** — static pins on the advisory-gradingKey
  language, the `<paper_text>`/`<project_context>` fences, and `paperTextContext`'s
  byte-identity (it is the prompt-cache key — one char of drift multiplies spend).
- **`lib/papers/service.test.ts`** — the upload service's cheap-rejection ladder (each
  rejection asserts later collaborators never ran — the duplicate check firing before
  the paid relevance call is a billing guarantee), P2002→409, R2-failure rollback.
- **`lib/literature/relevance.test.ts`** — the default-keep contract (malformed model
  replies can never flip a paper toward removal) and the `E2E_SKIP_LLM` stub the
  topic-removal E2E's determinism rests on.
- **Extended `test/upload-assets.test.ts`** — quota boundary math and `status not
  deleted` scoping, `recordAttachedAsset` vs `recordTemporaryAsset` sweep-safety
  semantics, `orphanObjectKey` flip/adopt/race paths.
- **`lib/teacher/analytics.test.ts`** — the per-paper proficiency rollup (the
  documented team-size inflation fix: 3 members mastering one paper = 1, not 3).
- Plus: `lib/discovery/topic-save.test.ts`, `lib/validation.test.ts`, `lib/ndjson.test.ts`
  (chunk-split and trailing-line flush), `lib/fairs/zip.test.ts`,
  `lib/fairs/rubric-scoring.test.ts` (cross-track key forgery → null),
  `lib/discovery/credibility.test.ts` (suffix-precedence, lookalike hosts),
  `lib/discovery/interest-match.test.ts`, and notification compute edge cases
  (bracket boundaries, deadlineDays hygiene, nearest-fair urgency, ISO-week cadence).

### Notes — deliberately not done, with reasons
- **No jsdom/RTL infrastructure.** The frontend audit's verdict, accepted: Playwright
  already exercises those flows in a real browser; the high-stakes client logic is
  reachable from node-Vitest via the existing architecture. Revisit post-pilot.
- **Remaining known coverage gaps** (audit-ranked, next slices): `stores/discoveryStore`
  state machine, `lib/literature/quiz-retry` service, `computeExplainOutcome`,
  `awardVisit` idempotency, buildings-service transactional logic.
- **Residual E2E order-dependence:** F10 (teacher rubric saves), F2 AC10 (daily cap),
  and F3-plan-paste each failed once across the production-build runs and pass 100%
  solo — cross-spec state, not dev-server noise. Tracked; not chased to zero here.

---

## [0.28.2] — 2026-07-18

Fixes the long-standing `F4.spec.ts` AC10 failure. The cause was not in the moderation
feature at all — the product code was correct throughout — but in the E2E harness, where
a session-recovery ladder was silently costing ~26s of every test's 30s budget.

### Fixed — E2E harness burned most of each test's budget on session recovery
- **`e2e/api.ts` now boots the app before refreshing a Clerk token.** A `page` fixture
  starts on `about:blank`, where clerk-js has never run — so `refreshClerkSession` could
  only exhaust its 5s `waitForFunction` and give up, and the call then rode the frozen
  `storageState` token. Past that token's ~60s TTL (i.e. by test #10 of a serial file) the
  request 307s and the escalating ladder fires: ~10-15s in `forceSessionRecovery`, then
  ~5-8s re-signing in. `ensureAppLoaded` navigates to the role's landing surface first —
  exactly what `withSeedPage` already did, which is why only specs calling `api.*` /
  `gotoFresh` on a bare `page` were slow.
- **Effect on the failing test:** AC10 went from a 30s timeout to **9.6s**, AC9 from ~26s
  to 2.3s, and F4 now passes **14/14** (AC11 and AC12 previously never ran). Diagnosis
  confirmed via a Playwright artifact showing the timeout inside `page.goto` — the
  `.sc-pill` assertion was never reached, so the moderation UI was never at fault.
- Deliberately NOT fixed by raising the Playwright timeout: that would have hidden a real
  ~26s-per-call harness cost that would resurface in every long serial spec.

### Fixed — relevance had no deterministic E2E stub
- **`lib/literature/relevance.ts` now honours `E2E_SKIP_LLM=1`** (plain token overlap),
  matching the convention every other LLM-backed feature already follows. Without it the
  topic-wipe path fell through to its parse-failure default of "keep everything", so the
  app's one destructive flow could never be observed proposing a removal under the E2E
  flag. `e2e/topic-removal-confirm.spec.ts` passed in 0.28.0 only because it happened to
  hit a reused dev server that lacked the flag — it is now deterministic and free.

### Fixed — showcase editor swallowed load errors
- **`useShowcaseEditor` surfaces non-2xx from `GET /api/showcase`.** It previously checked
  only for a `showcase` key, so a 403 phase gate or a 429 parsed cleanly and rendered a
  bare "Draft" editor: a student whose showcase was blocked saw an empty one with no
  reason. 404 still means "no showcase yet" and opens a blank editor.

### Notes
- The **full** E2E suite remains flaky for unrelated, pre-existing reasons: 12-16 failures
  per run with a DIFFERENT failure set each time, across specs untouched here (placement,
  upgrades, F8-reports, F5-bell, F18). Spot-checked in isolation, those pass cleanly
  (`F8-reports` 13/13, `placement` 4/4), so the cause is cross-spec state/order dependence
  in shared fixtures, not a regression. Worth its own pass before the pilot; not attempted
  here.

---

## [0.28.1] — 2026-07-18

REFACTOR2 Track B, first vertical slice. Track B is explicitly *not* a pilot gate and is
meant to be done "one feature at a time" — this does one feature properly rather than
starting a repo-wide sweep.

### Changed — Paper upload extracted to an application service (REFACTOR2 §3.2 E)
- **`lib/papers/service.ts`** now owns the upload workflow (validate → quota → fingerprint
  → parse/inspect → relevance gate → persist → store → ledger → ingest), returning a typed
  `{ ok: true, paper } | { ok: false, error, status, code? }`. `app/api/papers/route.ts`
  POST drops from ~180 lines to a ~20-line adapter that selects the policy, pulls the file
  off the multipart body, calls one use case, and maps the result to HTTP — the §2.1 route
  contract. This is the second instance of the seam `lib/buildings/service.ts` established
  and §3.1 asks to generalize.

### Fixed — the paid-work sweep could be blinded by its own refactor
- **`test/paid-work-guard.test.ts` now computes a transitive closure.** It detected
  Anthropic-reaching modules one hop deep, so extracting a route's workflow into a service
  put a new module between route and paid lib — and the route silently dropped out of the
  sweep (21 → 20 assertions) while still being paid work. Caught during this refactor:
  `app/api/papers/route.ts` lost its guard assertion despite keeping its `upload` tier. The
  closure walks to a fixed point, so future service extractions stay covered.

### Added
- **`e2e/paper-upload.spec.ts`** — 3 specs over `POST /api/papers`, which previously had
  **no** E2E coverage: magic-byte rejection of a MIME-lying non-PDF, the no-extractable-text
  path, and the success path (ingest → `attached` ledger row with the right size and purpose
  → content-hash duplicate 409 → appears in the team list).

### Notes
- REFACTOR2 §3.2 C ("team context resolution is duplicated") is **already resolved** —
  `lib/api/route-context.ts:94` delegates to `resolveActiveTeam`. The audit predates that fix.
- Track B remains largely open by design: 6 of 98 routes use `withTeamRoute`, 86 import
  `db` directly, and there are now 2 application services. Remaining extractions should
  land one feature per commit, not as a sweep.
- Pre-existing, unrelated to this work: `e2e/F4.spec.ts` AC10 (teacher rejection note) fails
  on v0.27.0 too — confirmed by running it at 605cede. Not introduced by 0.28.0 or 0.28.1.

---

## [0.28.0] — 2026-07-18

Pre-pilot security sweep: three adversarial audits (IDOR, upload abuse, prompt injection)
across every dynamic route, upload path, and Anthropic call site. The IDOR sweep came back
clean; the other two did not. Highest-severity finding was an injection path that could
mint a **clearance pass** — fixed, with the root-cause laundering channel closed behind it.

### Fixed — Prompt injection
- **Clearance-exam generation ran unfenced (critical).** `app/api/expertise/route.ts` put
  student-authored project text (`planText`, free-form paste) into a **system block** with
  no delimiter and no data-not-instructions label, while the sibling grading route fenced
  the identical content. Because generation emits the `key` that grading later scores
  against, an injected directive never had to beat the (well-defended) grading call — it
  poisoned the key upstream and grading was then legitimately fooled. Clearance awards up
  to 2,950 KP cumulatively and gates building purchases. Now fenced in `<project_context>`
  with an explicit ignore-instructions clause.
- **`gradingKey` is now advisory, not authoritative** (`lib/literature/grading.ts`,
  `app/api/expertise/grade/route.ts`) — the root cause behind the above. The key is itself
  model-generated from prompts containing untrusted text, so both grading paths now tell
  the model to ignore any key that is empty, nonsensical, or instructs a score, and to
  grade on the answer's own merits instead.
- **Quiz-retry generation** (`lib/literature/quiz.ts`) — restored the data-not-instructions
  line its first-pass twin already had.

### Fixed — Destructive-action safety
- **Topic-change paper wipe is now a two-phase confirmation.** The batch relevance check
  interpolates paper text the team does not control, and its numbered scaffolding is
  forgeable by that text, so one hostile abstract could vote a *sibling* paper off the
  island — into a hard `deleteMany` plus permanent R2 deletion. Phase 1 (`confirmWipe`)
  now **proposes** and deletes nothing; phase 2 (`confirmRemoveIds`) deletes exactly the
  ids the student approved, **with no model call at all**. The model proposes, the student
  disposes — and it costs one fewer LLM call than before. Both clients (Discovery + Lab
  Profile settings) render the proposed titles so a student can veto what they can read.

### Fixed — Upload abuse
- **Showcase board PDFs were never inspected for active content** — `inspectPdf` had a
  single caller. Showcase boards are served **inline by a public-allowlisted route**, so an
  unscanned `/OpenAction` + `/JavaScript` payload reached anonymous fair visitors and
  judges. Now inspected on the same path as paper uploads.
- **Per-team storage quota (2 GB)** — rate limits bounded the *rate* of upload but not the
  total; no quota existed anywhere. Enforced across all three upload routes via the
  `UploadedAsset` ledger, which papers and showcase now write to as well.
- **Showcase objects bypassed the ledger entirely**, so the reclaim sweep could never see
  them and every board replacement leaked a 20 MB object permanently. Both showcase delete
  paths now record intent instead of fire-and-forget `deleteObject(...).catch(() => {})`,
  restoring the module's single-physical-delete-site invariant. Legacy objects with no
  ledger row are adopted as `orphaned` rather than leaking.
- **Log-photo uploads ran on the `mutate` tier** (40/min) rather than `upload` (8/min) —
  ~400 MB/min per student against a sweep draining 10 objects/min. Corrected.
- **Showcase buffered the whole request body before checking size**, so a multi-GB
  multipart body could OOM the function before the 413. Now checks `file.size` first,
  matching its sibling routes.

### Fixed — IDOR
- Three teacher routes resolved `student.activeTeam` directly instead of through
  `pickActiveTeam`. Not exploitable (`teacherOwnsTeam` still gated the response), but a
  stale-membership display bug: a student leaves a team and the teacher keeps seeing the
  old team's papers and PDFs.

### Added
- `e2e/topic-removal-confirm.spec.ts` — 4 specs over the two-phase removal flow against a
  live relevance call. This destructive path previously had **no** E2E coverage.
- `recordAttachedAsset` / `orphanObjectKey` / `checkTeamStorageQuota` in
  `lib/uploads/assets.ts`, generalizing the ledger per REFACTOR2 §3.1.

### Changed — docs
- SPEC.md no longer lists the notification engine as planned — the cron producer, urgency
  detection, and Resend delivery have been implemented since. Showcase **video needs no
  size cap** (it is a YouTube/Vimeo URL, never stored bytes); the real gap recorded in its
  place is the storage quota, now closed.
- TODO.md records the Sentry source-map build vars (`SENTRY_ORG=scienium`,
  `SENTRY_PROJECT=javascript-nextjs`) so deploy day is copy-paste.

---

## [0.27.0] — 2026-07-18

Security week: the SECURITY2 audit's dependency and header gaps closed, classroom join
codes given a lifetime, and **Sentry** wired end to end — error tracking plus an in-game
"Report a bug" button. Two small Discovery additions ride along.

### Added — Error tracking + bug reporting (Sentry)
- **Error monitoring across all three runtimes** — `instrumentation.ts` (`onRequestError`
  auto-captures every unhandled route / server-component / server-action error),
  `instrumentation-client.ts` for the browser, `sentry.edge.config.ts` for middleware, and
  `app/global-error.tsx` for root-layout render errors. Verified end to end from localhost
  against the live project. Errors + tracing at the SDK's recommended sampling (100% dev /
  10% prod).
- **Privacy posture, deliberate and documented in-file**: NO Session Replay (it
  screen-records minors), no `dataCollection` object (omitting it keeps the SDK's
  conservative no-PII default — passing even `{}` flips categories permissive), no
  `includeLocalVariables` (stack-frame locals could carry student text), and `enabled` only
  when a DSN is configured, so DSN-less dev and the E2E suite are true no-ops.
- **"Report a bug" button** (`components/ui/BugReportButton.tsx`) in both the lab
  StatusStrip and the teacher header — Sentry User Feedback with `autoInject: false`, so
  our button is the only entry point (no floating vendor widget). Reports are anonymous
  (no name/email fields) and text-only (no screenshot capture). The dialog wears the game
  chrome: `font-pixel` title/labels/buttons on the navy+gold palette, with the message
  textarea left in the body font.
- `/monitoring` tunnel route (`withSentryConfig`) so browser events survive ad-blockers on
  school networks and the CSP's `connect-src` stays `'self'`; it's on the middleware
  public-route list because errors happen pre-login too.

### Added — Discovery
- **Knowable Magazine** joins the journalism feeds (Annual Reviews' journalism arm —
  articles written from expert-reviewed review papers). Its RSS carries teasers only, so it
  renders as a link-out card despite the site's CC BY-ND license.
- **Simple English Wikipedia toggle** in the wiki reader — same MediaWiki API, plainer
  language and shorter articles for younger or ELL readers. The `lang` param is a validated
  enum, caches are keyed per edition, and the toggle stays visible on the not-found state
  (Simple has far fewer articles).

### Changed — Security (SECURITY2 audit)
- **SEC2-002 — dependencies: 17 advisories (7 high) → 0.** The patch floor was Next
  15.5.16, so this is the full migration: **Next 15.5.20, React 19, Clerk 7**, plus
  `@clerk/testing` 2.2 and a postcss override. Async request APIs migrated (params are now
  promises), `withTeamRoute` updated for Next 15's exact `RouteContext`, `useRef` initial
  values for React 19, and `afterSignOutUrl` moved from `UserButton` to `ClerkProvider`.
- **SEC2-005 — security headers.** A catch-all header block: CSP (hard-locked
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`; Clerk
  origins allowed; `unsafe-eval` dev-only), `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy, Permissions-Policy, COOP, and prod-only HSTS. A unit test fails CI if a
  lockdown is dropped or the dev relaxation leaks into production.
- **SEC2-003 — classroom join codes expire.** New `Class.joinCodeExpiresAt` (migration
  `20260717150000`, 30-day default): every mint sets it, regeneration is both revoke *and*
  renew, and `resolveClass` fails closed — an expired code is indistinguishable from an
  invalid one, so the endpoint is no probing oracle.
- **E2E session handling consolidated** — the remaining hand-rolled
  `newContext({ storageState })` blocks now use `withSeedPage`; `gotoFresh` adopted in the
  long serial specs; `registerPageRole` lets teacher-paged specs recover as the right
  account.

### Fixed
- F9 AC12's long-standing flake root-caused: sibling specs' activity decays the shared
  team's "stale" flag mid-batch, removing the nudge controls the test clicks. It now skips
  explicitly with that reason instead of hanging 30s.
- Removed vestigial `AI_SERVICE_URL` / `AI_SERVICE_API_KEY` env vars — nothing has read
  them since the Anthropic SDK went in-process.

---

## [0.26.1] — 2026-07-17

Migrate-on-touch cleanup for the Discovery files the v0.26.0 work landed on (REFACTOR2
P2-3/P2-4). No behavior change — papers-tab + article-sources E2E suites verified green.

### Changed
- `lib/discovery/openalex.ts` slimmed 784 → 601 lines: the ~200 lines of E2E mock fixtures
  moved to `openalex.fixtures.ts` (type-only imports back — runtime dependency stays one-way).
- New Discovery feature client `components/discovery/api.ts` (`searchSources`,
  `browseArticles`): typed, runtime-decoded via the shared `requestJson`, with zod schemas
  compile-checked against the source contracts. `PapersSearch` and `ArticlesBrowse` no longer
  contain raw `fetch` — UI renders state and emits intent.

---

## [0.26.0] — 2026-07-17

Three waves in one release: the **pilot-hardening pass** from the REFACTOR2 audit (every paid
Anthropic call behind a fail-closed guard, bounded reads, structured observability, runbooks,
targeted policy tests), a **Discovery source expansion** (one merged papers search across all
open literature, plain-language explainers, prior-art patents), and the **LLM-curated
Vocabulary Builder** (mechanical extraction + one bounded curation call per paper).

### Added — Discovery: one search, more literature
- **Merged Papers search** — the arXiv/PubMed platform toggle is gone: one box searches arXiv,
  PubMed, and the broader open-access literature concurrently via OpenAlex, interleaved with
  peer-reviewed rows leading. **Review articles** are badged and floated to the top; a
  **Preprints ✓/✗** toggle filters preprints client-side.
- **`openalex` platform** (migration `20260717120000`) — works with neither an arXiv id nor a
  PMID (OA journal articles, bioRxiv/medRxiv/PsyArXiv-style preprints) are now searchable,
  openable, tree-persistable, and **branchable in citation lanes** (no neighbour is dropped);
  tier derived from venue metadata (repository → preprint, DOAJ journal → peer-reviewed, else
  open access). Semantic Scholar enrichment (TL;DR, influence re-ranking) reaches these nodes
  via their **DOI**.
- **"Look it up" lanes in the Articles tab** — **Health topics (MedlinePlus)**: NIH's
  plain-language encyclopedia, searched live (keyless), full summaries rendered in-app as
  public-domain content with the new **`reference` credibility tier** (migration
  `20260717130000`, KP ×1). **Prior art (patents)**: PatentsView-backed when
  `PATENTSVIEW_API_KEY` is set, Google Patents link-out fallback keyless; link-out cards only.
- **Vocabulary curation** (migrations `20260716000000`, `20260717000000`) — extraction stays
  mechanical; ONE Sonnet call per paper selects ≤12 terms worth learning and writes
  paper-grounded definitions for candidates without authored ones (authored dictionary entries
  stay byte-identical). Runs on the paid `ai` tier, ≤8 curations per build, and a once-ever
  `VocabPaperCuration` marker guarantees a paper is never re-billed.

### Added — Pilot hardening (REFACTOR2 Track A)
- **Paid-work guard sweep** — every route that can reach Anthropic now clears the fail-closed
  paid `ai`/`upload` tier or `assertCron`; closed five bypasses (paper GET-side processing,
  phase classification, discovery promote/topic-wipe relevance, unbounded vocab build) and a
  static CI test (`test/paid-work-guard.test.ts`) keeps the class of regression out.
- **Structured observability** — `lib/observability/log.ts` (JSON events, redaction by design,
  `x-vercel-id` request ids) wired into the shared Anthropic client (every call/stream logs
  model + token usage), rate-limit denials/misconfiguration, paper-job lifecycle, and cron.
- **Bounded reads + provider timeouts** — measurements capped at 2,000/experiment, experiments
  list capped, every server-side external fetch has an explicit abort timeout.
- **Targeted policy/concurrency tests** — 60 new unit tests: paid-tier fail-closed behavior,
  paper-job claim idempotency, teacher scope, team-join races, upload-asset ownership +
  reclaim races, public-showcase asset privacy.
- **Runbooks** (`docs/runbooks/`) — incident response, DB restore/forward-fix, student data
  export/delete inventory, LLM cost + AI data-sharing summary (with the verified Anthropic
  call-site inventory).
- **Text-integrity gate** — `check:integrity` (gate 2 of the pipeline, also in CI) rejects
  control bytes in authored source; removed two NUL bytes it was built to catch.
- **ADR-004** — per-student class membership recorded as the authoritative tenancy model,
  superseding ADR-001; `Team.classId` documented as vestigial.

### Changed
- **Quiz retry extracted to a service** (`lib/literature/quiz-retry.ts`) — the Track-B template
  for thinning paid routes; the route is a thin adapter, behavior E2E-verified unchanged.
- **One active-team resolver** — `resolveActiveTeam()` in `lib/team/context.ts` now backs both
  the API guard and server components (duplicate membership query removed).
- **E2E session resilience** — `e2e/api.ts` detects stale-Clerk-session responses and recovers
  (reload → re-sign-in via `@clerk/testing`), plus `gotoFresh()` for navigations; the
  long-standing mid-suite `Unexpected token '<'` flake is fixed (F4 verified 3× green).

### Fixed
- Paper detail GET no longer performs paid processing on read (cron owns retries).
- Vocabulary builds are idempotent and deterministic under E2E (curation stub + marker); three
  stale spec assertions corrected (quiz-retry AC13, vocab attribution prefixes, vocab zero-LLM).
- Public-showcase specs now assert the rendered privacy outcome (the slug page's `loading.tsx`
  makes the HTTP status a streaming race; the content boundary itself holds).

The Field Codex authoring pipeline rebuilt around **one invocation = one whole field**, plus two
complete fields authored with it — **Computer Science / Algorithms** and **Data Science / ML
Metrics** (550 lessons). The library is now **8 / 29 fields · 48 / 174 segments · 2,190 lessons**.

### Added — Field Codex content
- **`computer-science-algorithms` is a complete field (6/6 segments, 275 lessons)** — Core (8 units /
  50 lessons) plus sorting-searching-selection, graph-algorithms, data-structures-design,
  complexity-computability, and randomized-heuristic-algorithms (7 units / 45 lessons each). Authored
  in a single run; every unit cleared the adversarial fact-check gate with **zero open HIGH findings**
  (16 Opus escalations). Joins CMP as a built field for the **axiom** lab type.
- **`data-science-ml-metrics` is a complete field (6/6 segments, 275 lessons)** — Core (8 / 50) plus
  classification-eval, regression-forecasting-eval, unsupervised-clustering-eval,
  model-interpretability, and fairness-robustness (7 / 45 each). Zero open HIGH findings (5 Opus
  escalations). Contested material is taught as a controversy rather than a verdict — COMPAS is split
  into ProPublica's case and Northpointe's rebuttal, with the Kleinberg-Mullainathan-Raghavan and
  Chouldechova impossibility results that explain why both sides can be right.

### Added — authoring tooling
- **`pnpm --filter web codex:merge`** (`lib/ops/codex/scripts/merge-codex-segments.mjs`) — assembles
  JSON lesson drafts into `content/<field>.json` and validates every draft against the real
  `CodexTrack` shape *and* the content-shape invariants (mis-keyed MC answers, incomplete explanation
  maps, non-permutation `correctOrder`, uncovered `correctPairs`, checkpoint count, slug-safety, id
  collisions against every shipped field). Writes nothing if any draft fails, naming the exact file and
  lesson. Replaces an LLM subagent that hand-merged the multi-MB content JSON.

### Changed — Field Codex registries are generated, not hand-maintained
- `CODEX_TRACKS` + `LOADERS` (`index.ts`) and the `ALL_TRACK_MODULES` / `WRAPPERS` module maps in both
  codex test files are now **regenerated from `content/*.json` by `codex:merge`**. Adding a field is
  `/codex-pipeline <slug>` and nothing else — the "a new track means three registries" footgun (which
  failed gates with `expected N to be N−1`) is gone by construction. `LABTYPE_FIELDS` stays
  hand-maintained: it is an editorial routing choice, not derivable from content.

### Changed — `/codex-pipeline` rebuilt
- **One invocation authors a whole FIELD** (Core + 5 subfields) instead of one segment. Segment briefs
  moved into the workflow, so the orchestrator's context no longer grows per segment — the reason
  multi-segment runs previously cost more while producing less.
- The fact-check loop **exits on HIGH only** (MED/LOW corrections still applied once, but no longer
  earn another round); re-checks are **scoped to the files the fixer touched**; WebSearch is
  **budgeted** (4 on the first pass, 2 on a re-check).
- Authors write **one JSON file per lesson** (~10KB) rather than one ~65KB file per unit.
- Measured across the two runs: **19.6M → 14.8M tokens** per field; the check phase fell from **53% →
  24%** of a field's tokens (checker turns 30.4 → 18.4, searches 8.1 → 2.8).

### Fixed
- **Whole-unit writes dropped connections** — emitting a ~65KB `Write` in a single response killed ~19%
  of author agents (`API Error: Connection closed mid-response`), losing the unit. Per-lesson writes
  with deterministic paths plus a single retry: **zero author deaths across 43 units** on the next run,
  and a lesson lost to a drop is now a named merge error rather than a silently short unit.
- **`slugify` trimmed separators before truncating** — a 60-character cut landing on a hyphen left a
  trailing `-` that failed slug-safety (3 of 275 lesson ids). Truncate first, then trim.

### Removed
- `.claude/codex-pipeline/author-segment.workflow.mjs` — superseded by `author-field.workflow.mjs`.

---

## [0.24.0] — 2026-07-15

Two feature waves — a **Discovery source expansion** (follow real citations, read expert
articles in-app) and a **Literature-Review learning suite** (active-recall tools that build
durable, judge-ready knowledge) — plus a crash fix on the main lab page and a large batch of
authored Field Codex content.

### Added — Discovery: more to browse
- **Semantic Scholar enrichment** — an open source node now shows a TL;DR (Semantic Scholar's
  own extractive summary, attributed) and its **Cited-by** lane is re-ranked so influential
  citations lead. Keyless; optional `S2_API_KEY` raises the rate limit. No AI on our side.
- **Article sources** — a new `article` Discovery source type: **The Conversation** renders the
  full article in-app under CC BY-ND (with attribution), and a **science-journalism** RSS lane
  (Quanta, Science News, …) renders link-out cards. New `articles/browse` + `articles/resolve`
  routes and a sanitized `ArticleReader`; new `ArticleSource` table (migration
  `20260714150000_add_article_source`).

### Added — Literature Review: interactive learning
- **Explain it back (Feynman mode)** — the student writes what a paper found in plain language;
  Vega grades it *against the paper*, names what's wrong/missing, and the student revises. Flat
  25 KP once per paper (idempotent). New `PaperExplanation`/`PaperExplanationAttempt` models
  (migration `20260714170000_paper_explanation`).
- **Synthesis matrix** — compare 2–4 papers in a **field-adaptive** grid (columns seeded per
  lab type, fully editable); Vega checks the student's cells against the paper abstracts and
  flags agreements/contradictions/gaps they missed, plus suggested columns. Flat 25 KP, capped
  2 matrices/team (team-atomic). New `SynthesisMatrix`/`SynthesisCell` models (migration
  `20260714225544_synthesis_matrix`).
- **Vocabulary builder** — a **zero-LLM** spaced-repetition deck of key terms extracted from the
  team's own papers (Schwartz-Hearst acronym pairing, authored-dictionary matches, repeated
  n-grams); every card's definition is a verbatim quote or an authored-glossary entry (enforced
  by a unit test — no invented definitions). Leitner review; 3 KP/card once-ever, capped
  12/student/day, schedule persists even when KP is capped. New `VocabCard`/`VocabKpDay` models
  (migration `20260714230500_vocab_builder`).

### Added — Field Codex content
- **`clinical-medicine-pharmacology` is now a complete field (6/6 segments, 275 lessons):**
  authored the five subfield branches — cardiovascular-pharmacology, clinical-pharmacokinetics-
  dosing, endocrine-metabolic-pharmacology, neuropsychopharmacology, and toxicology-adverse-
  effects (~223 new lessons). Each ran the adversarial fact-check gate with zero open HIGH
  findings. Library progress: 6/29 fields, 36/174 segments.

### Changed
- **PubMed citation-following fixed** — a PubMed source's Cites/Cited-by lanes now resolve
  through OpenAlex (keyless, not IP-throttled) instead of the sparse, throttled NCBI `elink`
  path, so following a paper's references/citations actually works. Adds `resolvePubmedWork` +
  `pmid`-carrying neighbours to the OpenAlex adapter.
- **Hermetic discovery E2E** — `E2E_MOCK_SOURCES` is wired into the Playwright web-server (was
  silently hitting live APIs); the OpenAlex search/resolve paths gained seed-scoped fixtures so
  the whole Papers-tab suite runs deterministically.

### Fixed
- **Lab page crash** — `DecorationLayer` used signed bit-shifts on an unsigned 32-bit hash, so
  ~37% of scatter slots produced a negative array index → `TypeError` that crashed the entire
  `/lab` React tree. Switched to unsigned shifts; extracted the placement math to
  `lib/lab/decoration.ts` with a regression unit test that pins every index in range.

---

## [0.23.8] — 2026-07-14

Class membership is now **per-student**, so a lab can span multiple classes/schools with
each member in their own teacher's class — replacing the previous "one lab = one class =
one school" assumption that silently rewrote a joiner's school to the lead's.

### Changed
- **A lab can span classes/schools.** Entering a class code (and its teacher approval) now
  enrolls **only that student** — it no longer pulls their whole lab into one class or
  overwrites teammates' class/school. Each student is in their own class; a lab is simply
  the set of its members.
- **Teacher visibility is membership-based.** `teacherOwnsTeam` now grants access to a
  team's shared artifacts (papers, research plan, rubric, feedback, nudges, showcase) to
  **every** teacher who owns at least one member — so both teachers of a cross-school lab
  can see the collaborative work. The teacher roster and report aggregates resolve a
  student's team via membership rather than the (now-vestigial) `Team.classId`.
- **Individual-student privacy preserved.** A student's *personal* pages
  (`/teacher/student/[id]…`) stay gated on that student's own class, so a teammate's
  teacher can see the shared lab but not another teacher's student's individual profile.
- Dropped the "your lab lead must move the whole lab" / "that lab belongs to a different
  class" blocks (join + class-join) and the lab-class auto-adopt on team-join — all
  artifacts of the single-class model. Removed the now-unused `enrollTeamInClass` /
  `teamLeadClass` helpers.

### Known limitation
- Team-level scoring (rubric, feedback) is shared across every owning teacher — for a
  cross-school lab, two teachers grade the same shared project (last write wins). Per-teacher
  scoring is out of scope for the pilot.

---

## [0.23.7] — 2026-07-14

Teacher-approval gate for class enrollment, closing the "non-expiring, non-revocable class
code" gap surfaced after the Phase 2 security pass. A class join code no longer enrolls a
student on entry — it files a request the teacher must approve — and teachers can now
regenerate a code to revoke a leaked one.

### Added
- **Class-join requires teacher approval.** Entering a class code anywhere — the explicit
  join, student onboarding, or team-join — now files a `pending` `ClassJoinRequest` instead
  of enrolling directly. A leaked code can no longer silently populate a roster. Approving
  enrolls the student (and, for a lab lead, the whole lab, since a lab can't straddle
  classes) and auto-resolves any teammates' pending requests for that class; denying leaves
  them unenrolled and free to re-request.
- **Regenerate class code** (`POST /api/teacher/class/[id]/code`) — a teacher can mint a
  fresh code, instantly invalidating a shared/leaked one. Enrolled students are unaffected;
  only new join attempts with the old code fail.
- Teacher endpoints: pending requests are included in `GET /api/teacher/class`, and
  `POST /api/teacher/class/requests/[id]` approves/denies them (strictly scoped to classes
  the teacher owns).
- **UI:** the teacher's class manager lists pending requests with Approve/Deny buttons and a
  regenerate-code button; the student's lab panel shows "waiting for your teacher to approve"
  after requesting.
- New `ClassJoinRequest` model + `ClassJoinRequestStatus` enum (migration
  `20260714120000_class_join_requests`, applied locally). Verified end-to-end against the dev
  DB: request → pending → approve enrolls the whole lab and clears the queue.

---

## [0.23.6] — 2026-07-14

Refactor Phase 4 (of `docs/REFACTOR.md`, since removed — fully shipped): the performance and cleanup long
tail. This completes the plan — all five phases (0.23.2–0.23.6) are now landed.

### Changed
- **Query fan-outs collapsed** (PERF-1/3): team momentum went from 8 serialized
  round-trips to ONE raw query with scalar subselects (under `connection_limit=1`,
  `Promise.all` fan-outs run serially, so round-trips are the real cost); `/api/team`
  dropped its redundant user fetch and parallelized the rest (4 serial → 3, no waterfall).
- **Data Terminal loads lazily** (PERF-2): the experiments list returns measurement
  counts only; a selected experiment's points fetch on demand via a new
  `GET /api/data-terminal/[id]/measurements`.
- **Project log is paginated** (PERF-4): newest 30 entries with a "Load older entries"
  cursor; entry numbers and the header total come from one windowed ranking query that
  also covers reference-chip targets on unloaded pages.
- **Notifications cron is resumable** (PERF-5): bounded concurrency (5-way) for teams and
  email sends, batched notification inserts, a data-derived resume cursor
  (already-notified-today teams are skipped on re-run), and a 50s soft budget so the run
  ends cleanly instead of dying mid-team at the 60s cap.
- **Metadata extraction moved to Haiku** (PERF-6): paper title/author/abstract extraction
  doesn't need Sonnet (~$13 saved per 30-student class of uploads).
- **Plan review caches on content** (PERF-7): re-reviewing byte-identical plan text under
  the same rubric replays the persisted review as identical NDJSON — zero Claude spend;
  any edit or type change re-runs for real.
- **Paper text is the first, route-independent cached block** (PERF-8): chat, quiz
  generation, grading, and retry all compose the identical `<paper_text>` block first, so
  the ~30k-token block's prompt cache hits across chat → quiz → grade → retry.
- **Misc bounds** (PERF-9/10): notification-feed indexes on `(teamId, createdAt)` /
  `(userId, createdAt)` (migration `20260714010000`, applied locally); citations are
  created when a paper turns ready instead of write-on-read; the discovery-tree GET is
  capped at 500 nodes (parents-first, never an orphaned subtree); teacher-roster activity
  aggregates window to 14 days; TeacherReports' recharts chunk is now `next/dynamic`.
  (The `Measurement.teamId` denormalization was skipped — momentum's single raw query
  removed the hot path it served.)
- **UX long tail** (UX-1/2/3): TopicSearch and add-paper-from-search surface network
  failures (inline hint / error toast) instead of failing silently; the paper "processing"
  poll caps at ~20 attempts then flips to an actionable error (and can't leak past
  unmount); a failed chat send restores the typed draft; the send button gained an
  aria-label; a failed topic fetch no longer shows a false "set topic" warning; the Q&A
  split stacks below 768px.
- `lib/labCurrency.tsx` moved to `components/lab/labCurrency.tsx` (CLN-3) — a
  `'use client'` context provider doesn't belong in `lib/` root.

---

## [0.23.5] — 2026-07-14

Refactor Phase 3 (of `docs/REFACTOR.md`, since removed — fully shipped): the structural pass — god-files
split into feature folders + hooks, orchestration moved into service modules, and bulk
authored data moved out of TypeScript. All pure refactors: rendered markup, testids, and
network semantics preserved. (SVC-1, the quiz-currency extraction, is deliberately
deferred until after the concurrent PvP window, per the plan's own sequencing.)

### Changed
- **Service layer** — `lib/literature/grading.ts` (SVC-2) unifies the grading call +
  JSON extraction + 502 branch that quiz grade/retry and the expertise exam copied 3×
  (prompt framing, cache breakpoints, and award logic untouched); `lib/teacher/analytics.ts`
  (SVC-3) holds the pure bucketing/roll-up/pacing math the teacher reports & student
  overview routes inlined; `lib/discovery/tree-service.ts` (SVC-4) owns tree hydration +
  node creation, leaving the route as guard + parse + response.
- **God-files split** (each a container + feature folder + `use<Feature>` hook, modeled
  on `components/literature/`):
  - `OperationsHubFeature` 1218 → 64 lines (`ProjectLogTab`/`FailureLogTab` + hooks) (CMP-2)
  - `DataTerminalTab` 809 → 97 lines (`data-terminal/` views + `lib/data-terminal/export.ts`) (CMP-7)
  - `DiscoveryFeature` 1080 → 453 lines (4 hooks incl. generic `useResizablePanel`, deduped
    `BranchSelectionPanel`, header/side-panel/reader/modals subcomponents) (CMP-3)
  - `discoveryStore` 608 → 516 lines — network I/O moved to `lib/discovery/treeApi.ts`,
    optimistic-rollback unified in `commitOptimistic()` (CMP-5)
  - `StudentDetail` 1581 → 235 lines (`student-detail/` types/header/7 section files +
    `useStudentOverview`) (CMP-1)
  - `ResearchPlanFeature` 797 → 295 lines (`useResearchPlan`, shared `lib/ndjson.ts`) —
    and the teacher's drift-duplicated review/idea-check renderings now consume the SAME
    `PlanReviewView`/`IdeaCheckView` components via a `variant` prop (CMP-8)
  - `LabScene` 742 → 370 lines (`usePlotBuildings` optimistic state machine +
    `BuildingMenu`/`UpgradeBurst`/`DevFillButton`) (CMP-4)
  - `ShowcaseEditor` 837 → 314 lines (`useShowcaseEditor` + 10 `editor/` subcomponents) (CMP-6)
  - ~16 extracted plain-JSON call sites now route through `lib/api/client.ts requestJson`
    (CMP-9); calls with special contracts (FormData, NDJSON, keepalive, tolerant errors)
    deliberately stay raw.
- **Authored data → JSON** (DAT-1/2): the four Data-Terminal guides + the research
  glossary (~8,500 lines / 1.3 MB of literals, `plot-guide.ts` alone 748 KB of SVGs) and
  the 3,753-line ISEF fairs dataset are now co-located `.json` files behind thin typed
  wrappers — out of tsc's parse path; the existing shape tests still gate the content.
  `scripts/scrape-isef-fairs.mjs` emits `dataset.json` directly.

### Removed
- Dead `packages/shared-types/src/paper.ts` (6 interfaces, zero consumers) and its
  re-export (DAT-3/CLN-2).

---

## [0.23.4] — 2026-07-13

Refactor Phase 2 (of `docs/REFACTOR.md`, since removed — fully shipped): code-level security hardening.
An adversarial sweep confirmed no live IDOR, no authority accepted from request bodies,
every XSS sink sanitized, and every KP/score-affecting AI output server-clamped — the
items below close the remaining gaps and standardize the patterns.

### Added
- **CSRF discipline** (SEC-11): `assertSameOrigin` — mutating requests with a
  cross-site `Origin` are rejected 403 — now runs inside all three shared guards
  (`requireTeamContext`, `requireUserContext`, `requireTeacher`), with unit tests.
- **PDF safety inspection** (SEC-7): new `lib/pdf/sanitize.ts` rejects uploads carrying
  JavaScript, launch/open actions, embedded files, XFA, encryption, or page bombs
  before anything is stored; the paper file route now serves with `nosniff`.
- **Cron guard tests** (SEC-10): a static sweep asserts every `app/api/cron/**` route
  calls `assertCron`.
- **DB invariant** (SEC-DB): unique plot cell per team
  (`team_shop_buildings (team_id, pos_x, pos_y)`) — the durable backstop behind the
  buildings service's advisory lock (migration `20260713100000_plot_cell_unique`,
  applied to the local dev DB).

### Changed
- **Attachment references are now asset ids** (SEC-6): project-log photo URLs embed the
  `UploadedAsset` id and the view route authorizes through the team-scoped ledger row —
  string-parsed object keys are no longer the authority (legacy `?key=` URLs still
  resolve, validated against the team prefix as before).
- **Constant-time cron auth** (SEC-10): `assertCron` compares via
  `crypto.timingSafeEqual` and refuses sub-32-char secrets in production.
- **Prompt-injection framing** (SEC-9): paper metadata extraction, the idea check, and
  the plan review now wrap untrusted student/PDF text in explicit
  "data, not instructions" delimiters (the quiz/grade routes already had them).
- **IDOR pattern standardized** (SEC-1): the two data-terminal routes using
  fetch-by-id-then-check now use the scoped `findFirst({ id, teamId })` single-query form.
- **External fetch bounds** (SEC-8): NCBI `elink` results are capped (a highly-cited
  PMID could return tens of thousands of ids); OpenAlex/NCBI timeouts were already in
  place.

### Removed
- Dead `lib/wikipedia.ts` (zero importers — the live Wikipedia path is the discovery
  article route), resolving SECURITY.md's "harden wikipedia.ts" item by deletion (CLN-1).

---

## [0.23.3] — 2026-07-13

Refactor Phase 1 (of `docs/REFACTOR.md`, since removed — fully shipped): the pilot blockers — core-loop
stalls, currency races, the LLM cost ceiling, and unrecoverable UI dead-ends.

### Fixed
- **Paper ingestion no longer fire-and-forget on serverless** (BLK-1): the upload route
  now awaits `processPaperJob` before responding (with `maxDuration: 60`) and returns the
  processed title/status directly, so a paper can't sit `pending` until a cron sweep. The
  cron batch also rose 3 → 30 so a stalled classroom drains in one cycle, not ~50 minutes.
- **"Promote source" double-mint race** (BLK-2): the promote transaction now takes a
  per-node advisory lock and re-reads `paperId` inside the transaction — a double-click
  returns the winner's paper instead of minting a second quiz-able Paper.
- **Codex lesson completion KP race** (BLK-4): the once-ever KP claim moved inside the
  transaction as a WHERE-gated `kp_awarded = 0` transition; two concurrent first-time
  completions can no longer both credit KP or both consume a daily-cap slot.
- **`sync-deadlines` authority** (BLK-5): the paid Firecrawl scrape is now restricted to
  fairs the team is actually matched with (ISEF or the team's own state), and scrape
  output can never overwrite a `confirmed` FairEvent.
- **Chat spend was O(N²)** (BLK-6): paper chat and Vega study now put prompt-cache
  breakpoints on the newest conversation turns, so prior history re-reads at ~10% cost
  instead of re-billing in full every turn.
- **Fetch failures masqueraded as empty/new-user states** (BLK-7): the Literature list
  and the Discovery tree now track a distinct load-error state and render a retry banner —
  a returning team on flaky wifi no longer sees "0 / 25" empty slots or the first-run home.
- **No React error boundaries** (BLK-8): every route group gained an `error.tsx` with a
  pixel-styled reset UI (shared `components/ui/RouteError.tsx`), and the raw-JSON
  `.map` in `TopicSearch` is guarded, so one bad payload can't dead-end a student on
  Next's blank "Application error" screen.

### Changed
- **LLM cost cap fails closed** (BLK-3): in production without a shared rate-limit store
  (Upstash), the paid `ai`/`upload` tiers now return 503 instead of silently multiplying
  the per-student ceiling by the instance count (`RATE_LIMIT_ALLOW_MEMORY=1` opts out on
  single-instance hosts). `.env.example` documents the requirement.

---

## [0.23.2] — 2026-07-13

Refactor Phase 0 (of `docs/REFACTOR.md`, since removed — fully shipped): the foundational seams the
concurrent PvP/landing branches build on. All additive — no existing signatures changed.

### Added
- **Compiler-enforced server/client boundary** (FND-1): the `server-only` package is now
  installed and imported by every server module (`lib/db.ts`, `lib/env.ts`, `lib/storage.ts`,
  `lib/anthropic.ts`, the `*-server.ts` modules, and all ~26 modules that reach the Prisma
  client or secrets). A client-component import of any of them now fails `next build`
  instead of silently bundling secrets. Vitest aliases the package to an inert stub
  (`test/stubs/server-only.ts`) so unit tests can still exercise pure branches.
- `withTeamRoute()` handler wrapper (FND-3, `lib/api/with-route.ts`): composes
  `requireTeamContext` + `parseJson` + `ApiError`-to-response mapping so mutating routes
  stop copying the 4-line guard prelude. The four `buildings/*` routes are converted as
  the exemplar; remaining routes adopt it incrementally.
- `requireUserContext()` (FND-4, `lib/api/route-context.ts`): sibling guard for routes
  that legitimately run before a team exists (onboarding, join) or only need a
  rate-limited identity (discovery proxies). Nine hand-rolled `auth()` + rate-limit
  preludes converted.
- Shared zod field schemas (FND-5, `lib/validation.ts`): `boundedText`,
  `optionalBoundedText`, `cuid`, `httpUrl` — the single source for length/ID/URL caps.
- Shared UI primitives (FND-6): `components/ui/Toast.tsx` (pixel notice pill, four tones),
  `components/ui/EmptyState.tsx` (the dashed-border placeholder), and
  `lib/hooks/useAutoDismiss.ts` (leak-free timed dismissal) — replacing the hand-rolled
  copies as features are split.
- `docs/REFACTOR.md` — the consolidated refactor & hardening plan this phase executes.
  (Removed 2026-07-19 once every item had shipped; its one open item, SVC-1, moved to `REFACTOR2.MD`.)

### Changed
- `lib/fairs/forms.ts` split (FND-2): the ISEF catalog/guides stay client-safe; the DB
  seeder moved to `lib/fairs/forms-server.ts` behind `server-only`, closing the concrete
  Prisma-into-browser-bundle leak via `FormsChecklist`.

---

## [0.23.1] — 2026-07-13

A Volt Lab visual pass: the lab now reads as electric-yellow machinery rather than grey
steel. The root problem wasn't colour — the economy buildings were 80–96% flat wall with
almost no windows, so recolouring the glass did nothing. This adds the missing surface
detail and retunes the palette to match.

### Changed
- Volt Lab reskin retuned to **bold electric yellow** — the glass/energy ramp flips from
  cyan to a glowing yellow across both the seven gateways (`recolor.py`) and all fifty
  economy building sprites (10 buildings × 5 tiers), so windows and holograms read as
  electricity against the steel bodies.
- Economy buildings gained real **fenestration**: glowing window bands stamped onto the
  visible wall faces (following the iso slant, bright glass on the lit face and dimmer on
  the shadow face) plus an accent eave line at the roofline. Open-frame builds that have
  no solid face to window (e.g. mechanical-testing-rig) were hand-tuned instead — kept as
  clean powered frames rather than sprinkled with stray windows.

### Added
- `art/detail_buildings.py` — a reproducible, idempotent pass that adds the window bands +
  eave trim to economy-building char grids, excluding roof planes and the ground plinth.
  Reusable for the other five lab sets.

---

## [0.23.0] — 2026-07-13

A full pixel-art overhaul of the lab world: every gateway building redrawn in a bold
style, a new nature background, and the art pipeline/toolkit extended to support it.

### Added
- Seven redesigned gateway buildings in a "clearance-5" style — each a **distinct
  building form** (dome observatory, paneled studio, columned gallery, hexagonal
  bunker, peaked pavilion, tiered coliseum, domed rotunda) crowned by its own glowing
  floating hologram — reskinned across all six lab types via `recolor.py`.
- A nature **decoration layer** (`components/lab/DecorationLayer.tsx`) that scatters
  varied shrubs and rocks densely across the grass beneath the buildings. Placement is
  deterministic (seeded per team), and the building plot renders over it, so a placed
  building simply covers the vegetation in its footprint.
- New decoration + ground-tile sprites and manifest entries, plus iso toolkit
  primitives `poly_prism` (a single continuous solid from any footprint — L-shapes,
  hexagons — not abutted cubes) and `dome`.
- Pixel-art pipeline **modes** — *image-match* (reproduce a reference drawing;
  painters and reviewers must open the reference and grade the silhouette first) and
  *creative* (bold reinterpretation on the canonical, recolor-safe palette) — and the
  designer's reference mockups under `art_ref/mockups/`.

### Changed
- The ground background is a refreshed 6-tile grass set with graded clutter.
- Gateway sources are re-authored as bespoke forms instead of a shared cube; all lab
  reskins regenerate from them.

---

## [0.22.2] — 2026-07-11

A launch-latency pass: opening the lab now feels instant, with no change to behaviour.

### Added
- Optimistic pre-loading on the home page — a signed-in player's browser prefetches
  the lab route and warms its sprites during idle time, so the scene paints
  immediately on launch.
- Content-addressed sprite URLs (a `?v=<hash>` token regenerated at build time) with
  long-lived immutable caching: sprites load instantly on repeat visits, and a
  redrawn sprite is fetched fresh instead of served stale.

### Changed
- "Launch" links resolve their destination on the home page and go straight to the
  lab (or teacher dashboard), removing the intermediate `/game` redirect hop.
- The lab page loads plot and advance-gate data in a single parallel batch instead of
  a sequential chain, cutting server round-trips.

---

## [0.22.1] — 2026-07-11

The Classical Mechanics / Physics field authored to full depth (Field Codex
content only — no runtime or schema changes).

### Added
- **Classical Mechanics / Physics Field Codex — 275 lessons** across Core (52) and
  five specializations (Projectile Motion & Ballistics 44, Oscillations & Simple
  Harmonic Motion 44, Collisions, Impulse & Momentum 43, Rotational Dynamics &
  Rigid Bodies 48, Gravitation & Orbital Mechanics 44), each lesson with real
  concept prose, a worked example, judge framing, and a 3–5-question checkpoint.
  It is the fifth fully-authored field and the first built for the Axiom and Volt
  Lab lab types.

---

## [0.22.0] — 2026-07-10

A Field Codex learning-experience redesign, a far cheaper content-authoring
pipeline, and the Chemistry field authored to full depth.

### Added
- **Chemistry Field Codex — 258 lessons** across Core (48) and five
  specializations (Analytical Chemistry, Organic Synthesis, Electrochemistry,
  Green & Environmental Chemistry, Physical Chemistry), each lesson with real
  concept prose, a worked example, judge framing, and a 3–5-question checkpoint.
  Chemistry is the fourth fully-authored field.
- A vendored Codex authoring workflow (`.claude/codex-pipeline/author-segment.workflow.mjs`)
  that fans a segment out one lane per unit and adversarially fact-checks every
  claim and answer key (with a confirming re-check) before it ships.

### Changed
- **The Field Codex lesson experience is redesigned around a Khan-style flow.**
  Opening a lesson now lands on a distraction-free Reader (reformatted prose plus
  worked-example and "why judges ask this" callouts); the checkpoint is a
  separate, one-question-at-a-time practice with immediate per-question feedback,
  first-try tracking, a progress pip row, and a subtle pass celebration. Reading
  is fully decoupled from the quiz. Grading, gating, and KP remain
  server-authoritative.
- Codex answer inputs, results, and motion refined — rounded surfaces, softer
  state colors, materialize/reveal transitions, and reduced-motion fallbacks.
- The Codex content-authoring pipeline runs its draft + fact-check fan-out as one
  Workflow with per-agent model/effort tiers (Sonnet 5 by default, Opus only on
  escalation) and distilled prompts — roughly 3–4× fewer tokens per segment, with
  the depth targets and the adversarial fact-check gate unchanged.

### Fixed
- Field Codex E2E coverage updated for the new read → checkpoint → results flow
  (one-question-at-a-time interaction; prose targeted by a stable test id).

---

## [0.21.11] — 2026-07-10

E2E determinism — the suite stops crashing on stale auth.

### Fixed
- The dominant E2E flake is gone: spec `beforeAll`/`afterAll` seeds used a raw
  `request.newContext({ storageState })`, whose frozen Clerk token 307-redirects to
  `/sign-in` once its ~60s TTL lapses, so the seed parsed an HTML sign-in page as JSON
  and took the whole file down (this is what "crashes halfway through" was). All 15
  affected specs now seed through `withSeedPage` / `api.*`, which mint a fresh token
  from a live page before each call. Full-suite green went from 91 to ~180+.
- "Anonymous" test contexts created as `newContext({ baseURL })` silently inherited the
  leader session (only masked because the inherited token was usually stale); they now
  pass `storageState: undefined` so unauthenticated assertions are actually unauthenticated.
- Log-seeding specs uploaded a real tiny image via `uploadLogAttachment` instead of a
  fabricated attachment URL, satisfying the Phase 8 attachment validation.

### Added
- `e2e/api.ts` helpers: `withSeedPage(browser, role, fn)` (fresh authed page for
  hook-time seeding) and `uploadLogAttachment(page)` (real attachment upload).

### Changed
- `enforceRateLimit` is bypassed when `E2E_SKIP_LLM=1` (set only by the Playwright
  config, never in dev/prod), so the fast full-suite run no longer trips per-user
  rate limits mid-suite. The E2E fixture team is seeded at `phase=showcase` /
  `labType=volt_lab` so phase-gated and lab-specific building surfaces are exercisable.

---

## [0.21.10] — 2026-07-09

Refactor Phase 11 — documentation matches the shipped architecture.

### Changed
- `docs/ARCHITECTURE.md` now describes the invariants the refactor actually landed:
  the membership-verified active-team resolver and DB-authoritative teacher role,
  self-paced phase progression (no teacher gate), the uniform per-team plot lock and
  the `lib/buildings/service` domain module, the uploaded-asset lifecycle, retryable
  paper processing with metadata-only list reads, server-owned chat, and the bounded
  notification cron — plus the Phase 3–8 migrations and the new `UploadedAsset` model.
- The ADRs (`adr-001` ownership, `adr-002` paper processing, `adr-003` feature
  boundaries) capture the final invariants rather than the transitional plan.

### Fixed
- Stale documentation drift: `.claude/PARALLELISM.md` claimed the E2E suite runs
  `fullyParallel` with 4 workers when it is serial by default (`workers=1`);
  `docs/TODO.md` referenced the moved `lib/fairs/dataset.ts` (now
  `content/fairs/dataset.ts`) and described showcase teacher moderation as unbuilt
  when it ships end-to-end (publish→`pending_review`, teacher queue + approve/reject
  API, gallery gated on `approved`).

### Changed
- The place / move / sell / upgrade buildings routes are now thin wrappers: parse,
  resolve context, call a `lib/buildings/service` function, map its result to a
  response. All the business logic — the shared `team-plot:<teamId>` advisory lock,
  the in-lock occupancy re-checks, the race-safe currency debits, and the
  activity-log calls — moved into one module instead of being duplicated across four
  handlers, so cross-team scoping and the economy rules can be audited (and tested)
  in one place. The refactor is behavior-preserving: every status code, response
  shape, and error message is unchanged (verified by a route-vs-service diff).

### Added
- Unit tests for the extracted plot-economy service, exercising the pre-database
  validation branches without a Next request — the rules are now callable and
  assertable without spinning up a route or React.

---

## [0.21.8] — 2026-07-09

Refactor Phase 9 — the notification cron scales with the roster.

### Changed
- The daily deadline/urgency reminder cron no longer loads every team into memory
  in one query. It streams teams in id-ordered keyset pages (100 at a time), so
  memory and per-query cost stay flat as classes are added. A per-run cap
  (1,000 teams) bounds a single invocation; the `dedupeKey` idempotency is
  unchanged, and the response reports `teams`, `created`, `failedTeams`, and
  `stoppedEarly` so a truncated run is visible in logs rather than silently
  skipping teams.

---

## [0.21.7] — 2026-07-09

Refactor Phase 8 — uploaded files have a lifecycle instead of leaking.

### Added
- `UploadedAsset` ledger: every object written to R2 (starting with project-log
  photo attachments) gets a durable row through a four-state lifecycle —
  `temporary` on upload, `attached` once the owning log saves, `orphaned` when the
  log drops it or is deleted, `deleted` once the object is actually gone. Team- and
  user-scoped, with a unique `objectKey` and indexes on `(teamId, status, createdAt)`
  and the attachment target.
- A single bounded reclaim sweep (`reclaimAbandonedAssets`, run from the papers
  cron) is the one and only place that physically deletes stored objects — for
  `orphaned` assets and for `temporary` uploads abandoned past 24 h. It uses
  claim-then-delete (guarded status flip first, object delete second) so a concurrent
  save can never have its live object removed, and a failed delete releases the claim
  for a later retry instead of leaking the blob.

### Changed
- Domain routes now record intent, not physical deletes: saving a log flips its
  uploads to `attached` in the same transaction as the write, editing attaches new
  photos and marks removed ones `orphaned`, and deleting a log marks its attachments
  `orphaned` — all atomically, with no inline object deletion. The ledger can no
  longer disagree with storage after a mid-request crash.

### Fixed
- Saving or editing a log now rejects (409) if a referenced upload was already swept
  away, instead of persisting a permanently broken photo reference.
- Attachment keys are validated at write time to live under the caller team's upload
  prefix (400 otherwise), closing a cross-team object-reference vector.

---

## [0.21.6] — 2026-07-09

Refactor Phase 7 — growth-path indexes.

### Added
- Composite indexes matching the common classroom-scale list and dashboard access
  paths, so those queries stay index-backed as teams accumulate data: project logs
  (`teamId, entryType, createdAt` and `createdByUserId, createdAt`), quiz sessions
  and attempts (`paperId, userId, createdAt`; attempts also by `sessionId`),
  notifications (`teamId, readAt, createdAt` and `userId, readAt, createdAt`),
  showcase assets (`showcaseId, assetType`) and views (`showcaseId, viewedAt`),
  discovery nodes (`teamId, visitedAt` and `teamId, parentId`), teacher feedback
  (`teamId, resolved, createdAt`), experiments (`teamId, createdAt`), and
  measurements (`experimentId, recordedAt`). Single-column indexes that the new
  composites subsume were replaced.

---

## [0.21.5] — 2026-07-09

Refactor Phase 6 — chat turns are server-owned.

### Changed
- Paper chat and Study-with-Vega now own the conversation on the server. A request
  sends only the new user message (`{ message }`); the server loads the bounded
  history from the database. A client can no longer inject fabricated assistant
  turns into the context Claude sees or into the persisted thread.

### Added
- `PaperChatMessage` and `VegaStudyMessage` gain `status` (`pending`/`complete`/
  `error`), `requestId`, `error`, and `tokenUsageJson`. The user turn is written
  `pending` before the paid Claude call and completed — with the assistant reply,
  atomically — after; a failed call marks the turn `error`. The paid call and the
  visible history no longer silently diverge, and only `complete` turns feed
  future context.

### Fixed
- Chat history endpoints are bounded to the most recent 60 turns instead of an
  unbounded read.
- The bounded history window can begin mid-exchange under concurrent posts
  (especially the team-shared Vega thread); leading assistant turns are trimmed so
  the conversation handed to Claude always starts with a user turn.

---

## [0.21.4] — 2026-07-09

Refactor Phase 5 — paper processing is truly retryable.

### Added
- `PaperProcessingJob.nextRunAt` (backed-off retry scheduling — each failure
  spaces the next attempt further out) and `terminalAt` (records when retries were
  exhausted). The processor claim and the cron both respect `nextRunAt`.

### Fixed
- A transient processing failure no longer surfaces as a terminal paper error.
  The paper stays in `processing` while attempts remain and only becomes `error`
  once all retries are exhausted — so a momentary Anthropic hiccup no longer looks
  like a permanently broken paper.

### Changed
- Every claim path (pending / retryable-failed / stale-running) is capped at three
  attempts, so a crash-loop can't run the extractor a fourth time. A final attempt
  that crashes mid-run is terminalized by the cron sweep instead of hanging in
  `processing` forever, and the cron reports how many it terminalized.

---

## [0.21.3] — 2026-07-09

Refactor Phase 4 — paper lists are metadata-only, and duplicate uploads are
prevented by the database.

### Added
- `Paper.doi`, `Paper.credibilityTier`, and `Paper.sourceHost`, computed once at
  upload. The paper list now reads these stored columns instead of loading every
  paper's extracted full text to derive a DOI/credibility badge, so listing a
  library stays metadata-only and fast as it grows.
- A `(teamId, contentHash)` unique index. Two uploads of the same PDF for one
  team can no longer both persist even under a race — the second is rejected and
  returns the same 409 as the application-level pre-check. (Null content hashes
  stay distinct, so non-PDF papers are unaffected.)
- `Paper(teamId, createdAt)` and `Paper(teamId, status)` indexes for the common
  list queries.

_Deferred:_ moving `Paper.fullText` into a separate `PaperContent` table (the
plan's larger "heavy content" split) — the list no longer reads full text, so
the high-value outcome is already achieved; leaning the row is a follow-up.

---

## [0.21.2] — 2026-07-09

Refactor Phase 3 — expertise grading is now claim-based, idempotent, and honest.

### Added
- `ExpertiseExam.status` (`active`/`grading`/`graded`/`failed`) plus
  `gradingClaimedAt`/`gradingRequestId`, so a grade is claimed before the paid
  Claude call. A second concurrent grade of the same exam is refused instead of
  calling the model twice, and a claim older than five minutes is treated as
  stale and may be retaken (a crashed grade never strands the exam).

### Fixed
- The grade response now derives `raised`, `newClearance`, and `kpEarned` from
  the committed transaction — the conditional clearance raise's row count — rather
  than a pre-transaction guess. A pass that didn't actually advance the team (a
  teammate already raised clearance) can no longer report a raise or bonus that
  never happened.
- A failed or unparseable grading call releases the claim back to `active`, so
  the exam stays retryable instead of stuck.

---

## [0.21.1] — 2026-07-09

Refactor Phase 2 — plot placement occupancy races.

### Fixed
- Building **move** is now race-safe. It runs inside the per-team plot advisory
  lock (the same `team-plot:<teamId>` lock `place` uses) and re-checks cell
  occupancy against committed rows before writing, so two simultaneous moves can
  never land two items on the same cell. Previously `move` wrote with no
  transaction and no lock at all.
- **Sell** reads the building row and deletes it inside the plot lock, so a
  concurrent double-sell now returns 404 instead of a delete-not-found 500.

### Changed
- **Upgrade** takes the per-team plot lock as well, so every plot mutation
  (place / move / sell / upgrade) serializes on one key. Its conditional currency
  debit and level-bump guards are unchanged.

_Deferred:_ a unified `TeamPlotPlacement` table with a DB-level `(teamId, posX,
posY)` uniqueness constraint (the plan's larger "durable refactor") — the
advisory lock already delivers the race-safety outcome; the table is a
defense-in-depth follow-up.

---

## [0.21.0] — 2026-07-09

An architecture-integrity pass focused on authoritative ownership, durable
background work, race-safe rewards, smaller feature boundaries, immediate
lab-building interactions, and fully self-paced phase progression.

### Added
- Explicit `User.activeTeamId` and `Team.classId` ownership, with an additive
  backfill migration and a membership-verified active-team resolver — a stale or
  forged `activeTeamId` can never surface a team the user does not belong to.
- Ownership access-path indexes (`users.class_id`, `classes.teacher_id`,
  `team_members.team_id`, `team_invites(team_id, expires_at)`).
- Durable `PaperProcessingJob` records, an atomic paper processor, and a
  five-minute recovery cron for pending, failed, or stale PDF work.
- PostgreSQL advisory-lock helpers for team membership, plot occupancy, quiz
  rewards, and other multi-row aggregates.
- Runtime-validated Literature API contracts and a shared browser JSON client.
- Architecture decision records for team/class ownership, paper processing, and
  feature boundaries.
- Closed Prisma enums and migrations for bounded roles, statuses, source types,
  notification kinds, showcase policy, and fair workflow values.

### Changed
- Building pickup now begins on pointer-down. Placement, movement, and upgrades
  render optimistically and reconcile with the server afterward, eliminating
  network latency from the visible interaction while preserving rollback.
- Codex progress and daily rewards are scoped by user and team; first-completion
  and daily-cap writes are serialized.
- Teacher authorization is fully `Team.classId`-scoped — the transitional
  lead-class fallback was removed after a backfill — and the DB `User.role` is
  authoritative, so a stale Clerk claim can no longer keep a downgraded teacher in.
- Phase advancement is fully self-paced: `research_planning → working` and
  `working → showcase` are free student-clicked advances (the literature-review
  gate — 25 sources + per-member proficiency, then Haiku lab-type classification —
  is unchanged).
- Large authored Data Terminal guides and the fair dataset moved from `lib/` to
  `content/`; teacher paper Q&A moved into a feature-owned subfolder.
- Former placeholder deep links now open the real Operations Hub, Literature,
  Research Plan, and Science Fair surfaces on the requested tab.
- Discovery optimistic mutations now rehydrate after failed persistence instead
  of leaving unsaved client state.
- `ARCHITECTURE.md` was rewritten and fact-checked against the routes, modules,
  workflows, schema, migrations, integrations, tests, assets, and deployment
  configuration. `SETUP.md` and `.env.example` no longer describe the removed
  Python AI service.

### Fixed
- Class joins can no longer split a lab across classes, and concurrent team joins
  cannot overfill a team.
- Concurrent building placement cannot occupy one cell twice.
- Concurrent quiz grading/retry submissions and Codex completions cannot award
  duplicate KP.
- Paper processing survives request timeout or process loss and can be retried
  safely.
- Teacher roster, reports, student detail, and paper inspection no longer infer
  authorization from any coincidental class membership.
- Owned-but-unplaced buildings preserve their real paid cost and level when
  positioned.
- Lab feedback reuses its prefetched snapshot instead of issuing a duplicate
  request when the panel opens.
- Building E2E setup now mutates the configured application database instead of
  a hard-coded Docker database, and resolves the fixture team by name rather
  than assuming a stale ID. Its KP baseline now covers the member-scaled purchase
  and upgrade sequence.
- `E2E_SKIP_LLM` no longer leaks into a normal `pnpm dev` server — it moved from
  `.env.local` to the Playwright config — so local quiz, grading, Vega, and Codex
  study-plan features generate real content instead of deterministic test stubs.

### Removed
- The teacher **phase-validation pipeline**: the `PhaseAdvanceRequest` model and
  `validation_status` enum, the `/teacher/validations` queue (page, API, and
  `ValidationQueue` component), and the student "request validation" affordance.
  Phase advancement is self-paced instead.
- Unused TanStack Query and React Hook Form dependencies.
- Stale environment variables and documentation for the deleted Python AI
  service.

---

## [0.20.0] — 2026-07-08

A **maintainability and hardening pass** — no gameplay changes; all runtime behavior is
preserved. It standardizes API auth, decomposes the largest feature component, moves the
Field Codex's enormous authored tracks to generated data, and centralizes environment-variable
access behind lazy validation.

### Added
- **`apps/web/lib/env.ts`** — centralized, **lazy, per-variable** zod validation for server env
  (R2, Anthropic, Firecrawl, Database, Clerk, view-fingerprint salt). Each variable is validated
  and memoized on first use, never at import — so `next build` and routes that don't need a given
  secret never fail because an unrelated var is unset.
- **`apps/web/lib/anthropic.ts`** — one shared, lazily-constructed Anthropic client.
- **Field Codex generated-content pipeline** — JSON source (`lib/ops/codex/content/<slug>.json`) +
  `pnpm --filter web codex:build` (`scripts/build-codex-tracks.mjs`) that emits the typed
  `tracks/*.ts` wrappers and a checksum lock, plus a new `generated-content.test.ts` (zod
  `TrackSchema` + wrapper-deep-equals-JSON + checksum) alongside the existing content-shape gate.
- **`AGENTS.md`** and the `.agents/` / `.codex/` agent-tooling configs.

### Changed
- All remaining team-scoped **API routes migrated to `requireTeamContext`** — one standardized
  auth → team-scope → rate-limit → feature-gate path.
- **`ProjectPhase` / `LabType` / phase order / labels are now canonical in
  `packages/shared-types`**; `lib/phase.ts` re-exports them (fixes drift with Prisma — adds
  `lab_selection` and `research_planning`).
- **Field Codex tracks moved from ~29,000-line authored TS modules to JSON data** generated into
  ~10-line wrappers — runtime lesson data is unchanged (deep-equal, checksum-locked).
- **`LiteratureFeature.tsx` (1,383 lines) decomposed** into a shell plus workflow components
  (`PaperSlot`, `UploadSourceButton`, `QAPanel`, `QuizPanel`, `PaperChat`, `CredibilityBadge`,
  `VettingChecklist`) and feature-local hooks (`usePapers`, `usePaperQuiz`, `usePaperChat`).
- **Storage (R2), Firecrawl, and Anthropic clients now construct lazily** via `env.ts` instead of
  eager `process.env.X!` reads.

### Fixed
- Stale doc pointers: `AGENTS.md` → `.claude/PARALLELISM.md`; `ARCHITECTURE.md` component tree and
  flows brought back in line with the tree.

### Removed
- Eager `process.env.X!` non-null env reads (replaced by lazy validated getters in `env.ts`).
- Stray `.DS_Store` files.

---

## [0.19.0] — 2026-07-07

**Field Codex replaces Field Dispatch** as the daily engagement pillar, plus the rest of the
batch: the **Study with Vega** companion, the teacher **Class Reports** tab, the quiz
**targeted-retry** loop, Literature **credibility badges**, the Showcase **Abstract guide**,
and the **PvP raid redesign** (spec-level; replaces the turn-based battle design). One drop
migration. Starts the 0.19.x line — subsequent Codex lesson batches ship as 0.19.1, 0.19.2, …

### Added

- **Field Codex (F13)** — the new daily learning pillar: authored, typed lesson tracks
  (Track → Core/Branch Segment → sequentially-gated Units → Lessons, each ending in a
  3–5-question checkpoint graded locally at an 80% bar — zero LLM at read/grade time). Ships
  with 3 field tracks / **609 lessons** (gait-biomechanics 274, acoustics-sound 287,
  astronomy-astrophysics Core 48; 13 of 174 planned segments across the 29-field taxonomy).
  KP per first-ever lesson pass with an atomic per-student daily cap (`codex_lesson_progress`
  + `codex_kp_days`); an LLM **Study Plan** (the feature's only Anthropic call, 2/team/day)
  routes teams to relevant tracks (`team_study_plans`). Authored via the vendored
  `.claude/codex-pipeline/` harness (`/codex-pipeline`), gated by a content-shape unit test.
  E2E spec F13.
- **Study with Vega (F18)** — persistent, team-shared study chat grounded in the team's own
  project (research idea + study plan + Codex tracks in context, `lib/ops/vega-study-context.ts`);
  messages persist per team (`vega_study_messages`). E2E spec F18.
- **Teacher Class Reports (F8)** — `/teacher/reports`: read-only class-wide analytics
  (phase distribution, engagement/progress summaries). Zero LLM, no new tables. E2E spec F8.
- **Quiz targeted retry (F11)** — a failed paper quiz now shows per-miss rationale plus a
  "what a strong answer covers" note, and "Fix my misses" re-asks only the failed questions
  (+1 fresh) via `POST /api/papers/[id]/quiz/retry`, with a capped retry aggregate
  (`lib/economy.ts`). E2E spec F11-quiz-retry.
- **Literature credibility badges (F12)** — the papers list resolves a per-paper
  `credibilityTier` at read time (promoted Discovery source tier → DOI extraction from the
  PDF text → "self-uploaded — verify yourself" fallback; `lib/discovery/credibility.ts`).
- **Showcase Abstract guide** — static authored reference for the 250-word ISEF abstract
  (structure, conventions, worked examples — `lib/fairs/abstract-guide.ts`,
  `AbstractGuidePanel`), test-pinned.
- **`/update-github` command** — one-shot release flow: docs pass → gates → branch → commit →
  PR → CI → merge, encoding the 0.19.x lesson-batch versioning convention.

### Changed

- **Field Codex leads the Operations Hub** — first and default tab; the Ops Hub gateway
  building routes to the new `/daily/codex` deep link. The Momentum card's 7-day KP window
  and the teacher student drill-down now report **Codex** KP/progress (lessons completed,
  KP from lessons, recent lessons with track/lesson labels) in place of dispatch streaks.
- **PvP redesigned as a raid system (spec §11)** — an attacker raids a snapshot of another
  team's base with building-granted spells; fully replaces the earlier 6v6 turn-based
  battle design. Design-only this release: the API is stubbed (501), the old combat engine /
  moves seed / battle-action route are deleted, and `infra/seed/buildings.ts` now assigns
  each building a raid `spellType`.
- **SETUP.md absorbed setupwindows.md** — one setup doc with macOS and Windows sections.

### Removed

- **Field Dispatch — the entire feature.** The Ops Hub tab, `/daily/dispatch` deep link,
  `GET/POST /api/field-dispatch`, the daily pre-generation cron (route + `vercel.json`
  entry), `lib/field-dispatch/`, the teacher drill-down section, both dispatch E2E specs,
  and the three DB tables (`field_dispatch_content`, `field_dispatch_responses`,
  `field_dispatch_streak_claims`) via migration `drop_field_dispatch`. The unshipped
  dispatch streak/fluency/archive work (F15) was retired with it — Codex's daily-cap
  economy replaces the dispatch streak mechanic.
- The turn-based PvP battle implementation remnants (`lib/pvp/combat-engine.ts`,
  `infra/seed/moves.ts`, `POST /api/pvp/[battleId]/action`).

---

## [0.17.0] — 2026-07-06

**Teacher rubric scoring**, three more reference guides (**Methods**, **Data Quality**, and a
Literature **Research Guide**), full **ISEF form guides + hazard classes** in the Forms
checklist, **30 new economy buildings** completing all six lab-type catalogs, an app-wide
**loading-state overhaul** on shared pixel primitives, and a deep multi-agent **code-review
pass** (23 verified findings — 9 bug fixes + 14 refactors). One additive migration.

### Added

- **Teacher rubric scoring** — a "Rubric" tab in the teacher's per-student drill-down scores the
  team against the same ISEF criteria the students self-check, side-by-side with the team's own
  scores, guided by curated low/mid/high **anchor descriptions and talking points** per criterion
  (`lib/fairs/rubric-anchors.ts`, all 10 criteria across both tracks). New teacher-scoped
  `GET/PUT /api/teacher/rubric` (rate-limited, `teacherOwnsTeam` IDOR guard). `TeamRubricScore`
  gains a `scorerRole` discriminator (`'student' | 'teacher'`) so a teacher save can never
  overwrite the team's self-check (migration `team_rubric_scorer_role`); the seed script and a new
  F10 E2E spec cover the flow end-to-end.
- **Data Terminal — Methods Guide** — **45 experimental-design concepts** (variables, controls,
  randomization, blinding, sample size, validity threats, …) — everything a team must get right
  before any data exists (`lib/data-terminal/methods-guide.ts`).
- **Data Terminal — Data Quality Guide** — **36 concepts** on everything after data is collected:
  measurement uncertainty, significant figures & units, data cleaning, methodology pitfalls
  (`lib/data-terminal/data-quality-guide.ts`).
- **Literature — Research Guide** — a header-toggled reference inside Literature Review: a
  **70-term research glossary** plus an 8-section **anatomy-of-a-paper** walkthrough with a
  recommended reading order (`lib/literature/research-guide.ts`).
- **ISEF form guides + hazard classes** — each of the 12 tracked ISEF forms in the Forms
  checklist now expands into a full in-app guide (what it is, who needs it, section-by-section
  walkthrough — `ISEF_FORM_GUIDES`), plus a 4-class **hazard primer** (`lib/fairs/safety.ts`) so
  teams can tell which conditional forms apply. Unit tests pin guide↔form completeness.
- **Economy catalogs for TerraBase, MindFrame, Axiom** — **30 new purchasable buildings**
  (10 per lab type, matching the spec §9.3 rosters) on the shared 10-step cost/clearance ladder,
  with sprites. New `lib/shop.test.ts` pins per-lab completeness, sprite↔manifest membership,
  key uniqueness, and economy-curve parity.
- **Loading-state overhaul** — shared pixel primitives (`PixelSpinner`, `PixelSkeleton`,
  `BusyButton`, `LabeledLoader`, `PixelProgressBar`, plus panel/route skeletons under
  `components/ui/skeletons/`) replace the ad-hoc spinners and busy ternaries across the app;
  new route-level `loading.tsx` for the dashboard, teacher, game, gallery, and showcase routes;
  `lib/uploadWithProgress.ts` (XHR) drives real byte-level upload progress bars.
- **Showcase gallery browser** — the gallery's filter tabs + grid moved into a client component
  with `useTransition`: the clicked tab highlights instantly while the grid dims for the server
  round trip.

### Changed

- **Robotics Bay requires clearance 3** (was 2), aligning volt_lab with the shared tier ladder.
  Stale dev DBs need `pnpm --filter web seed:e2e` (which now also restores the E2E team's
  KP/clearance baseline) before the upgrades E2E passes; teams sitting at clearance 2 see it
  locked until they earn clearance 3.
- **Shop catalog is now derived, not hand-repeated** — an exported `TIER_LADDER` plus a per-lab
  builder derive `cost`/`minClearance` from ladder position and the sprite slug from the key
  (~565 lines of literals → ~160); a price rebalance is now a one-line edit, and `shop.test.ts`
  imports the same ladder instead of a copy.
- **Guide panels share one chrome** — `SectionLabel`, `CsvTable`, the search/category/count/empty
  scaffold, and the collapsible box extracted to `components/ops/guide-chrome.tsx`, with one
  generic `filterGuideEntries()` (`lib/guides/filter.ts`) behind each guide's typed filter export,
  and a shared `useToggleSet` hook replacing nine hand-rolled Set toggles. All six guide panels
  (Stats / Charts / Plot / Methods / Data Quality / Research) consume it — no visual change.
- **Guide panels are code-split** — every guide panel now loads via `next/dynamic` on first open
  instead of shipping its static text with the Operations Hub / Literature chunks.
- **Teacher review queues share one decide flow** — `useDecisionQueue` + `DecisionControls`
  (`components/teacher/DecisionControls.tsx`) replace the twin copy-pasted approve/reject
  implementations in ValidationQueue and ShowcaseModerationQueue.
- **Rubric wire format slimmed** — the static anchors/talking points now render from the client
  bundle; `GET /api/teacher/rubric` returns only score rows + totals, and both rubric PUTs total
  scores in Postgres (`aggregate _sum`) instead of re-reading all rows. The
  `'student' | 'teacher'` contract is centralized as `SCORER_ROLES` in
  `lib/fairs/rubric-scoring.ts`.

### Fixed

- **Teacher rubric: focus+blur no longer persists an unintended 0** — blur saves only when the
  draft actually changed (an unscored criterion previously gained a real 0-score row, a changed
  total, and a "Last scored by" line from a mere click-through), saves serialize behind an
  in-flight guard, and a save resolving after a track switch can no longer stamp the other
  track's total onto the header.
- **Showcase gallery thumbnails could stay permanently invisible** when a cached image finished
  loading before React hydration (the reveal relied solely on React's `onLoad`); a callback ref
  now checks `img.complete` on mount. Cmd/ctrl-clicking a filter tab opens a new tab again
  (the transition handler no longer calls `preventDefault` on modified clicks).
- **Upload responses that aren't JSON fail loudly again** — `uploadWithProgress`'s `json()`
  matches fetch semantics (rejects on an unparsable body) instead of returning `{}` that call
  sites dereferenced into undefined asset/url/id values.
- **Teacher student drill-down: stale-response guard** — a slow overview response for a
  previously viewed student can no longer overwrite the currently displayed student's page.
- **Teacher queues: only the clicked decision shows busy** — approving no longer relabels the
  adjacent Request-changes button to "Requesting…" (and vice versa).
- **Onboarding can no longer strand a disabled form** — if the post-signup navigation bounces
  back to /onboarding, an 8s recovery re-enables the form with a retry message.
- **E2E hardening** — the F3 research-plan spec's load gate tracked the new skeletons (its old
  `.animate-spin` gate went vacuous with the spinner overhaul); its ACs no longer assume a
  virgin DB row (the "synced" assertion could pass on a *previous* save, ending the test while
  the new save was still in flight — the root cause of a deterministic stale-reload failure);
  F10's re-save ACs use the explicit Save button now that no-op blurs are deliberately skipped;
  the heaviest F11 test is marked slow (measured at ~29s of its 30s budget on a clean tree).

---

## [0.16.0] — 2026-07-05

The largest feature release so far: **eight gameplay features** from a pipeline batch, a
**Discovery overhaul** (per-topic interest color-coding, a full-window tree view, and
multi-tree creation), and three new **Data Terminal reference guides** built to expose students
to real analysis knowledge — a **65-measure Stats Guide**, a **250-chart field-specific Charts
Guide** whose example charts are real matplotlib renders of realistic data (lazy-loaded per
field across 29 scientific fields), and a **45-type Plot Guide**. Also fixes the
`/api/fairs/match` hang that froze the Science Fair Hub, and adds a reproducible E2E fixture
seed script. Four additive migrations.

### Added

- **Rubric self-assessment** — a "Self-check" tab in the Science Fair Hub (and the revived
  `/fair-hub/rubric` route) lets a team score itself against each ISEF criterion with a live
  judge-readiness total out of 100. New team-scoped `GET/PUT /api/rubric/self-assessment`,
  backed by a new `TeamRubricScore` table; scores drive off the existing `ISEF_RUBRIC` literal.
- **Data Terminal — Stats Guide** — a searchable, category-filtered guide of **65 statistics
  measures** (`lib/data-terminal/stats-guide.ts`). Each teaches one concept with a plain-language
  definition, the Unicode formula, a symbol-by-symbol breakdown, a sample CSV dataset, and
  step-by-step Python whose printed output is **empirically verified by execution**.
- **Data Terminal — Charts Guide** — **250 field-specific charts across 29 scientific fields**
  (gait biomechanics, chemistry, astronomy, clinical medicine, oceanography, …), each with a
  description, plot type, bulleted `data needed` (name + unit), interpretation, and a **real
  matplotlib-rendered example** of realistic noisy data. Content is split into per-field lazy
  modules (`lib/data-terminal/charts/<field>.ts`) behind a light eager index so only the
  selected field's charts load.
- **Data Terminal — Plot Guide** — **45 general plot types** (bar, line, box, violin, scatter,
  heatmap, sankey, …) across six categories, each with when-to-use, bulleted data needs, and a
  matplotlib example (`lib/data-terminal/plot-guide.ts`).
- **Discovery interest color-coding + Discovery Tree view + New tree** — mark each topic
  green / orange / red inline on the tree; a new full-window "Discovery Tree" tab shows the tree
  beside all topics grouped color-major then tree-minor (`DiscoveryTopicList.tsx`); a "New tree"
  button makes the next opened source a fresh root. New nullable `DiscoveryNode.interestLevel`.
- **Research Plan paste-text fallback** — teams can paste/type their plan instead of being
  forced to connect a Google Doc; `POST /api/research-plan` now accepts `googleDocUrl` **or**
  `planText` (exactly one). New `ResearchPlan.lastSyncedSource` column. No new Anthropic call.
- **Showcase one-pager print export** — a `?print=1` print view on the showcase page (gated by
  the same `canViewShowcase`) plus a "Print one-pager" button; browser-native, no PDF library.
- **Project-Log ⇄ entry linking** — activates the dormant `ProjectLogReference` self-relation;
  `POST/DELETE /api/project-log/[id]/references` (both-endpoint team scoping, 10-ref cap,
  idempotent) with a picker + reference/back-reference chips in the Operations Hub.
- **Field Dispatch archive** — past dispatches now show per-entry KP earned and date.
- **Teacher "Nudge"** — a one-click check-in on stale/unlogged roster rows fires a friendly
  team notification, deduped one-per-team-per-day, with a `TeacherFeedback` audit row
  (`POST /api/teacher/nudge`).
- **Momentum recap card** — a dismissible lab card summarizing the team's last 7 days (KP,
  sources, logs, experiments, days to next fair) from a read-only `GET /api/team/momentum`
  aggregate; no new persisted state, no LLM.
- **E2E fixture seed script** — `pnpm --filter web seed:e2e` (`prisma/seed-e2e.mjs`) idempotently
  restores the School / Class / team / membership fixtures the Playwright suite depends on;
  documented in a new SETUP.md "E2E tests" section (with a local-Postgres E2E recipe).
- **Migrations** — `team_rubric_score`, `research_plan_paste_text`, `discovery_node_interest_level`,
  `fair_event_unique_dedupe` (all additive).

### Changed

- **Notification bell** — all five notification kinds (`fair_deadline`, `urgency`,
  `teacher_feedback`, `phase_reviewed`, `showcase_reviewed`) now render with a distinct
  icon / accent / label instead of only two.
- **Feature pipeline tooling** — `.claude/commands/pipeline.md` rewritten with process-weight
  tiers (implement-only default for UI/content, full test+review for schema/auth/currency/LLM
  work), a build-once rule, and the accumulated tester playbook; `.claude/PARALLELISM.md` gains
  an integration protocol; CLAUDE.md and SETUP.md updated accordingly.

### Fixed

- **`/api/fairs/match` hang** — `ensureFairsSeeded()` re-ran a ~266-row sequential upsert on
  every call (the seeded count had fallen behind the grown dataset), freezing the Science Fair
  Hub's Overview tab for minutes. Rewritten with a count fast-path, batched `createMany`,
  targeted drift updates, and a module-level single-flight guard; added
  `FairEvent @@unique([fairId, year])` and a dedupe migration. The route now returns in well
  under a second, and `matchFairs()` is safe to call from other code.

---

## [0.15.0] — 2026-06-29

The 4-stage upgrade evolution from 0.13.0 (Volt Lab) is **extended to the remaining five lab
types** — biocore, chemworks, terrabase, mindframe, axiom. Every economy building now visibly
grows from its base form into a fully built-out, high-tech version by L15, each on its own lab
palette. **200 new stage sprites** (5 labs × 10 buildings × 4 stages). No app or schema changes:
the level→stage machinery (`buildingStageSuffix` / `getBuildingSprite`) already shipped in
0.13.0, so these are pure static assets that render live at L4/7/10/15. Each building passed an
independent generator→reviewer loop; base L1–3 sprites are byte-identical to the shipped forms.

### Added

- **200 upgrade-stage sprites** (`apps/web/public/sprites/buildings/{biocore,chemworks,terrabase,mindframe,axiom}/{slug}_t2..t5.png`) — cumulative, on-theme build-ups per building (e.g. biocore greenhouse: vine planters → trellis annex → climbing-plant tower → spore-burst + gold ridge; chemworks distillation-tower: reflux condenser → reboiler drum → second tray-column → condenser-orb crown; axiom cosmology-visualization-theater: expanding cosmic-web dome → gold-ringed theater). Colours mature across stages; gold reserved as the L15 flourish only. Char-grid sources in `art/src/buildings/`.
- **Reproducible staged builders** for all 50 buildings — each `.claude/pixel-art-pipeline/builders/{slug}.py` refactored to `build(stage=1)` layering cumulative geometry, following the Volt Lab `workshop.py` pattern. Per-lab evolved-accent palettes (deepened structure tone + energized glow + premium gold) tuned to each lab's mood: biocore bio-green, chemworks reagent-teal, terrabase basalt/earth, mindframe signal-violet, axiom stellar-blue.
- **Per-lab evolution plans** (`.claude/pixel-art-pipeline/{lab}-evolution-plan.md`) and a montage / contact-sheet helper (`art/montage.py`) used by the review loop and for sign-off.

---

## [0.14.0] — 2026-06-28

Database moves from a local Postgres instance to **Supabase Postgres**, and the migration
history is repaired so a fresh database can be built from zero. The app runs through
Supabase's **transaction pooler** (port 6543, `pgbouncer=true`) at runtime and the
**session pooler** (port 5432) for migrations — the standard serverless-safe setup that
keeps Prisma from exhausting connections on Vercel. No table/column changes: the schema
shape is identical. Validated end-to-end against Supabase — Playwright E2E green (70 passed,
1 skipped).

### Changed

- **Datasource is now pooled** (`apps/web/prisma/schema.prisma`) — added `directUrl` so `url` (transaction pooler) serves app traffic while `directUrl` (session pooler) is used only by `prisma migrate` / `db push`. `.env.local` / Vercel now set `DATABASE_URL` + `DIRECT_URL`.
- **Migrations squashed to a single baseline** (`prisma/migrations/00000000000000_init/`) — the 20 incremental migrations are collapsed into one `init` generated from the current schema. This fixes `prisma migrate deploy` against a **fresh** database (Vercel/CI): the previous history had no baseline before the first migration, which assumed a pre-existing schema and failed on an empty DB (`type "project_phase" does not exist`). Verified by deploying into a throwaway empty DB — all 57 tables created from zero. Existing databases were re-baselined to `init`.

### Removed

- **20 incremental migration files** (`prisma/migrations/2026*`) — superseded by the squashed `init` baseline; recoverable from git history if ever needed.

---

## [0.13.0] — 2026-06-28

Building upgrades now **visibly evolve**. The flat gold tier-2 reskin from 0.12.0 is
replaced by a **4-stage evolution** per economy building: each stage *physically adds
structure* to the previous one at the Lab-Credit tier-ups, so a building grows from its
base form into a fully built-out, high-tech version by L15. All 10 **Volt Lab** buildings
are done (40 new stage sprites). Colours mature across stages; gold is reserved as the
L15 flourish, not a whole-building recolor. Green: typecheck, lint, `next build`, Vitest
(114). No schema/migration changes.

### Added

- **Multi-stage upgrade sprites** — `lib/sprites/manifest.ts` gains `buildingStageSuffix(level)` and a level-aware `getBuildingSprite`, mapping level → stage at the four LC tier-ups: base `{slug}.png` (L1–3) → `_t2` (L4–6) → `_t3` (L7–9) → `_t4` (L10–14) → `_t5` (L15). The plot already threads each placed building's `level` into the renderer, so an upgrade swaps the sprite live (audited end-to-end: the rendered `<img src>` changes at L4/7/10/15 and every file resolves).
- **40 Volt Lab upgrade-stage sprites** (`apps/web/public/sprites/buildings/volt_lab/{slug}_t2..t5.png`) — for all 10 buildings, each a cumulative on-theme build-up (e.g. Workshop: forge flue → work canopy → lattice gantry crane → glowing power-core + gold pennant; 3D Printing Shop: spool rack → second print bay → curing silo → gold multi-head dome). Char-grid sources in `art/src/buildings/`.
- **Reproducible staged builders** — each `.claude/pixel-art-pipeline/builders/{slug}.py` refactored to `build(stage=1)` that composes the base form then layers cumulative geometry per stage (new evolved palette shades for energized/glow/gold accents). Design brief + per-building plan in `.claude/pixel-art-pipeline/UPGRADE_EVOLUTION.md` and `evolution-plan.md`.

### Changed

- **Upgrade visuals are now incremental, not a recolor** — supersedes 0.12.0's single gold `_t2`. Base sprites are byte-identical (each stage builds on the unchanged footprint/silhouette); the `_t2` PNGs are regenerated as the proper "small functional add" stage.

---

## [0.12.0] — 2026-06-28

The lab plot becomes interactive: economy buildings are **placed, moved, sold, and
upgraded** on an isometric grid (Clash-of-Clans style), and a full **upgrade economy**
goes live (KP every level + Lab Credits at the tier-ups, with a tier-2 reskin at L≥4).
Lab Credits become earnable from daily logs. All green: typecheck, lint, `next build`,
Vitest (115), Playwright E2E (70). Two additive migrations.

### Added — Features

- **Building placement system** (`lib/plot.ts`, `lib/plot-server.ts`, `components/lab/LabPlot.tsx`, `app/api/buildings/{place,move,sell}/`) — pick a building from the shop and drop it on a free isometric tile (the drop is the purchase; KP debits on drop), rearrange any building (including the 7 gateways) for free in **Arrange mode**, or sell economy buildings. 1×1 footprints, per-sprite footprint anchoring (`scripts/gen-sprite-anchors.py` → `lib/sprites/anchors.generated.ts`) so each building sits centred on its tile. Positions persist (`team_shop_buildings.pos_x/pos_y`, `team_gateway_placements`). Server-validated placement (on-grid, unoccupied) and cost.
- **Building upgrades** (`app/api/buildings/upgrade/`, `lib/economy.ts`) — economy buildings level **1 → 15**. **Every** upgrade costs KP = `round(baseCost × 0.25 × (level−1))`; the four tier-ups (3→4, 6→7, 9→10, 14→15) also cost LC (2/4/6/10). No clearance cap on level. Atomic, race-safe KP+LC debit. Clicking a placed economy building opens a **Sell / Upgrade menu**; Arrange mode offers **Delete**.
- **Lab Credits earning** (`app/api/{project-log,failure-log}/`, new `lab_credit_claims` table) — +1 LC per team member per real calendar day they create a Project/Failure log entry, capped 1/member/day, never backfilled.
- **Tier-2 building skins** — buildings show a reskinned sprite at level ≥ 4 (`{slug}_t2.png`); `getBuildingSprite` is now level-aware. The 10 **Volt Lab** tier-2 reskins are generated (`art/tier2_reskin.py`).
- **Sell refund = 90% of total KP invested** (purchase + every upgrade, tracked in `cost_paid`).
- **UI polish** — hovered building name shown top-of-screen + an **L{n} level box** over the building on hover; a pixel-art **green particle effect** on upgrade (scattered sparkles rising in a smooth sine).

### Changed

- **Upgrade economy redesigned** (was: clearance-capped levels, LC-per-level). Now KP-per-level + LC-only-at-tier-ups, no clearance cap; clearance gates *purchase* only. `SPEC.md` §8/§9.2/§14 updated to match.
- **Schema** — `team_shop_buildings` gains `pos_x`, `pos_y`, `level`, `cost_paid`; new `team_gateway_placements` and `lab_credit_claims` tables. Migrations `20260627000000_building_placement`, `20260627000001_building_upgrades` (applied via `migrate deploy`, not shadow `migrate dev`).
- **E2E test isolation** — the suite now runs as a dedicated test account (`devuser2`) on a throwaway **E2E Test Lab**, so `pnpm test:e2e` never mutates a real lab. New `e2e/placement.spec.ts` + `e2e/upgrades.spec.ts`; `BuildingSprite.tsx` (orphaned by `LabPlot`) removed.

---

## [0.11.0] — 2026-06-24

The economy building art is **complete**: the final four lab-type sets — **⚗️ ChemWorks** (10), **🌍 TerraBase** (10), **🧠 MindFrame** (10), and **🔭 Axiom** (10) — bringing all **60 economy building sprites** (6 lab types × 10) to drawn, on top of the Volt Lab + BioCore sets from 0.10.0. Every sprite is code-generated (char-grid → PNG), 64×64, on its set's 16-colour palette, a one-of-one *signature feature* on a *bespoke built form*, with opening sides deliberately alternated left/right across each set. Catalog of record `art/building.md` is now fully realized (**67/67** made). All sprites resolve through the manifest; no schema/migration changes.

### Added — Features

- **40 economy building sprites** (`apps/web/public/sprites/buildings/{chemworks,terrabase,mindframe,axiom}/`, char-grid sources in `art/src/buildings/`) — the complete ChemWorks, TerraBase, MindFrame, and Axiom sets. Each is a distinct iso silhouette with a unique signature feature on its set's palette (e.g. the ChemWorks distillation column with stacked separating fractions, the TerraBase derrick over a glowing planetary-core cutaway, the MindFrame open-oculus focus-group pit, the Axiom suspended quantum-processor chandelier).
- **Manifest entries for all four lab types** (`lib/sprites/manifest.ts` `BUILDING_SPRITES`) — every team's lab-type set now resolves to real sprites via `getBuildingSprite`; the "coming soon" placeholder fallback no longer triggers for any lab type.

### Changed

- **`art/building.md` fully realized** — all 67 catalog rows (60 economy + 7 gateways) are `[x]` with their locked signature features; nothing remains for the generation pipeline to pick up.
- **Pixel-art generation tooling** — added the iso building toolkit (`art/isobuild.py`: parametric `Box`/`cylinder` primitives plus glass/louver glazing helpers) used to compose each bespoke economy form; generation tooling and its working artifacts are consolidated under `.claude/`.

---

## [0.10.0] — 2026-06-24

The first wave of **economy building art**: two complete lab-type sets of isometric building sprites — **⚡ Volt Lab** (10) and **🧬 BioCore** (10) — each building a one-of-one *signature feature* on its own *bespoke built form*, plus a **lab-type-gated Buildings shop** that serves each team its own set. Every sprite is code-generated (reproducible char-grid → PNG), 64×64, on its set's 16-color palette; openings deliberately alternate left/right across each set. Catalog of record: `art/building.md`. All green: typecheck, lint, unit tests (5 new economy-gate tests), `next build`. No schema/migration changes.

### Added — Features

- **20 economy building sprites** (`apps/web/public/sprites/buildings/{volt_lab,biocore}/`, char-grid sources in `art/src/buildings/`) — the complete Volt Lab set (Workshop, CNC Mill Shop, 3D Printing Shop, PCB Fab, Robotics Bay, Electronics Bench, Mechanical Testing Rig, Welding & Fabrication, Embedded Systems Lab, AI Incubator) and BioCore set (Greenhouse, Specimen Vault, Microscopy Suite, Incubation Chamber, Wet Lab, Field Station, Aquatic Habitat, Genetics Sequencing Lab, Behavioral Observation Room, Bioinformatics Suite). Each is a distinct iso silhouette with a unique signature feature on its set's palette. `art/building.md` records every building's **form, opening side, signature, and description**.
- **Lab-type Buildings shop** (`lib/shop.ts`, `lib/sprites/manifest.ts`, `components/lab/ShopPanel.tsx`) — the Buildings shop now offers **lab-type-specific** economy buildings rendered with their real sprites: a team sees its own lab's set (Volt Lab or BioCore), each with a KP cost, clearance tier, and description. The grid is a fixed **10 slots**; lab types whose art isn't made yet fall back to non-purchasable **"coming soon"** placeholders. Sprites resolve through the manifest (`getBuildingSprite`) — never a hardcoded path.

### Changed

- **Purchase gating adds a lab-type check** (`lib/economy.ts` `evaluatePurchase`, `app/api/buildings/route.ts`) — a lab-type-restricted building is only buyable by a matching team, enforced **server-side** (403) ahead of the owned/clearance/affordability checks, with the shop UI filtering to match (defence-in-depth, IDOR-guarded).

### Removed

- The 12 generic placeholder shop buildings (Reagent Store, Microscope Bay, … Telescope Dome) — replaced by the real lab-type building sets.

---

## [0.9.0] — 2026-06-22

A focused pass on the **teacher dashboard**: a cleaner, information-dense **UI redesign** (sidebar-navigated student drill-down, an identity header with a phase stepper, stat-tile grids), a **read-only literature view** so teachers can see each student's sources + quiz results + chat, richer **roster attention states**, **lab → class enrollment** so every lab member appears on the roster, the **research-plan review** surfaced with a link to the plan, and a rubric fix so engineering plans aren't judged on presentation readiness. All green: typecheck, lint, **98 unit tests**, `next build`. No schema/migration changes.

### Added — Features

- **Read-only teacher literature view** (`GET /api/teacher/student/[id]/literature/[paperId]` + its `/file` PDF stream, `components/teacher/StudentDetail.tsx`) — the drill-down's Literature section lists every source with the student's proficiency, and a **Q&A** button opens that source's actual quiz (questions, the student's answers, per-question scores + Vega's rationale), the chat transcript, and the PDF. Read-only and class-scoped (IDOR-guarded via `requireTeacher` + `teacherOwnsTeam`); no new LLM calls.
- **Research-plan review on the drill-down** (`overview` route now returns `googleDocUrl`; `StudentDetail` research-plan section) — an **"Open research plan"** link plus two read-only sections: an **Originality check** (the novelty/idea-check verdict + prior work) and a **Plan review** (readiness score, per-section scores, strengths / gaps / next-steps).

### Changed

- **Teacher dashboard redesign** (`components/teacher/StudentDetail.tsx`, `TeacherRoster.tsx`, `components/ui/Card.tsx`, `SectionTabs.tsx`) — the student drill-down's overflowing 13-tab strip is replaced by a **grouped left sidebar** (Profile / Work / Lab / Showcase / Activity); a real **identity header** (avatar, role pill, meta, KP/clearance chips) with a **phase stepper**; **stat-tile grids** with tabular numbers; and a single enforced type scale (pixel font reserved for section eyebrows). The roster gains a carded table, semantic flag pills, and an icon-driven overview.
- **Richer roster attention states** (`app/api/teacher/roster/route.ts`, `TeacherRoster.tsx`) — the single `staleLog` boolean becomes `on_track` / `unlogged` / `stale`: **unlogged** = recent activity/KP but no progress journal (vs. **stale** = genuinely quiet). The "needs attention" filter and count cover unlogged + stale + pending validation.
- **Labs enroll into the teacher's class** (`lib/onboarding/profile.ts`, `app/api/team/join/route.ts`, `app/api/class/join/route.ts`) — a member who joins a lab inherits the lab's (lead's) class, and a lead who joins a class brings their labmates, so **every member of a lab appears on the teacher's roster** — not just the one who entered the class code. Only fills an empty class slot; never overrides a deliberate choice.
- **Engineering research-plan review drops "presentation readiness"** (`lib/research-plan/rubrics/_engineering.md`, `app/api/research-plan/review/route.ts`) — an early-stage **plan** is no longer judged on the end-of-process poster/interview criterion (engineering now scores four sections; science is unchanged at five; the review prompt flexes the section count so the model emits exactly the rubric's sections).

---

## [0.8.0] — 2026-06-21

Player-facing **account & settings** work: a self-serve **teacher account** path, a **student settings screen** (reachable from a status-strip gear *and* the Clerk account modal) for editing all profile/lab/research info, the **lab↔teacher class link** surfaced in the lab panel, and a batch of **Operations Hub** improvements. Display names now stay in sync with Clerk. All green: typecheck, lint, **98 unit tests**, `next build`. No schema/migration changes — every field already existed.

### Added — Features

- **Student settings screen** (`components/settings/LabProfileSettings.tsx`, `SettingsPanel.tsx`, `GET/PATCH /api/settings`) — one form to edit **Name** + **School** (any member) and **Lab name** + **ZIP** (lead-only, enforced server-side with a 403, not just disabled in the UI). Reachable two ways from the lab: a **⚙ gear button** in the status strip (a pixel popup) and a custom **"Lab & Profile"** page injected into the Clerk account modal — both render the same component. Also edits the **research topic** (reusing `/api/discovery/topic` including its AI relevance-check + paper-wipe confirmation), the **research-plan** Google Doc, and the **one-sentence research idea**, all inline against the existing endpoints (no new AI routes).
- **Self-serve teacher accounts** (`POST /api/onboarding/teacher`) — onboarding gains an "I'm a student / I'm a teacher" choice. Choosing teacher sets Clerk `publicMetadata.role` **and** DB `User.role`, then lands on `/teacher` to create a class. Open self-select (an accepted pilot trade-off); a student who already onboarded **cannot** self-upgrade (409).
- **Lab ↔ teacher class link in the lab panel** (`components/lab/TeamPanel.tsx`) — a "Your teacher's class" section lets each member paste the class code any time after onboarding (reuses `POST /api/class/join`); the teacher's roster then sees the lab. `GET /api/team` now returns the caller's class.
- **Data Terminal: bulk paste + notes + export** (`lib/data-terminal/csv.ts`) — paste spreadsheet rows (tab/comma) in bulk, attach a per-point note, and export the table as CSV and the chart as PNG. Blank/invalid rows are dropped and counted.
- **Field Dispatch: history + streak** (`lib/field-dispatch/dispatch.ts` `computeStreak`) — a scrollable history of past dispatches with the student's saved answers, plus a calendar-consecutive answer-streak badge. Pure display of already-persisted data (no new LLM calls).

### Changed

- **Display name syncs to Clerk** (`lib/onboarding/profile.ts` `syncClerkDisplayName`) — editing the name in settings, and every onboarding path (create-a-lab, join-a-lab, teacher), now mirrors the name into the Clerk profile so the avatar/account never drift from the DB `User.name`.
- **Teacher gate falls back to the DB role** (`lib/teacher/auth.ts`, `(teacher)/layout.tsx`) — `requireTeacher` and the teacher layout resolve the role from the Clerk session claim **or** the DB `User.role`, so a freshly-promoted teacher isn't bounced before the session token re-mints.
- **Role-aware routing** (`app/page.tsx`, `(dashboard)/layout.tsx`) — the post-sign-in landing and the dashboard bounce now send a team-less **teacher** to `/teacher` instead of `/onboarding`.
- **ZIP moved out of the Science Fair hub** (`components/fair/ScienceFairFeature.tsx`) — the `LocationBar` ZIP input is removed; ZIP is now edited only at onboarding and in settings. Fair matching still reads the stored `Team.locationZip`.
- **Failure Log shows dates** (`components/ops/OperationsHubFeature.tsx`) — failure entries now display the formatted date, matching the progress log.

### Fixed

- **Literature Review re-prompted for the research idea** (`components/literature/LiteratureFeature.tsx`) — the idea box tracked submission only in local state and never loaded the persisted `Team.researchIdea`/`labType`, so reopening it after advancing showed the empty input again. It now hydrates from `GET /api/team` and shows the submitted idea + assigned lab type. The completed row's spacing and iconography were also cleaned up (single flask, a filled green "complete" bar instead of a stray hairline).
- **Data Terminal paste edge cases** — a blank x/y cell no longer parses as `0`; the CSV download anchor is appended to the DOM before click (Safari).

### Notes

- Editing the research idea in settings updates the text only; it does **not** re-run lab-type classification, so the assigned lab stays stable.

---

## [0.7.0] — 2026-06-20

Removes the **figurine** and **parental-consent** systems entirely and replaces the figurine-gated milestones with **teacher-validated phase advancement**. Adds four new (non-graphics) features — **Field Dispatch**, a **fair-deadline notification engine**, the **Data Terminal**, and the pilot **Teacher Dashboard** — plus **classroom join codes** and **high-school ingest** at onboarding. Gated by the full CI suite: typecheck, lint, **66 unit tests**, and `next build` all green.

### Added — Features

- **Field Dispatch** (`lib/field-dispatch/`, `GET/POST /api/field-dispatch`) — the daily ~2-minute discipline tip + reflection question (spec §7.1), surfaced as the first Operations Hub tab. Content is generated once per lab type per day by Claude Haiku and shared by every student of that type (≤6 calls/day; idempotent on a `(labType, publishedDate)` unique constraint; self-heals if the cron misses). Answering awards a flat **+10 KP once per student per day**, enforced by a `(userId, contentId)` unique constraint inside the award transaction so a double-submit can't double-pay.
- **Notification / reminder engine** (`lib/notifications/`, `GET/POST /api/notifications`, `/prefs`) — fair-deadline reminders at 30/14/7/1-day brackets plus a smart-urgency nudge when a fair is near and the Project Log has gone stale (spec §13.7). Pure compute logic is unit-tested; a deterministic `dedupeKey` + unique column makes the daily cron idempotent (re-runs and caught-up missed runs never double-notify). In-app `NotificationBell` in the status strip (60s poll); optional Resend email that is a no-op without `RESEND_API_KEY`.
- **Data Terminal** (`Experiment` + `Measurement` models, `/api/data-terminal/*`) — experiment tracking + graphing (spec §14.1) as an Operations Hub tab, gated at the `working` phase. recharts line charts with multi-series support; finite-number validation on every measurement so a bad client can't poison a chart.
- **Teacher Dashboard** at `/teacher/*` (`lib/teacher/auth.ts`, `app/api/teacher/*`) — the pilot-minimum dashboard (spec §15.11): a single-pass **roster** aggregate (no N+1) with attention flags, a phase-adaptive **student detail** view, a **validations queue**, and **feedback**. Strictly class-scoped via `requireTeacher` (Clerk `metadata.role`) + a `teacherOwnsTeam` IDOR guard, so a teacher can never read another class's data.
- **Classroom join + high-school onboarding** — onboarding now ingests the student's **high school** (find-or-create `School` by unique name) and an optional **class code**; teachers mint reusable class join codes (`Class.joinCode`); `POST /api/class/join` lets students join later. Shared resolution lives in `lib/onboarding/profile.ts` (used by onboarding, team-join, and class-join).

### Changed

- **Figurine milestones → teacher-validated phase transitions** — the two real-world checkpoints that used to hand out figurines (start data collection → `working`, advance to competition → `showcase`) are now `PhaseAdvanceRequest`s: a student requests via `POST /api/team/advance-phase` (`RequestAdvance` affordance in the lab scene), and a teacher approves in the dashboard with a race-safe conditional phase bump. `literature_review → research_planning` stays automatic/self-serve.
- **Showcase gateway is phase-only** (no Presenter figurine); **Data Terminal** is gated at `working` (was Analyst-figurine).
- **Cron routes** (`/api/cron/*`) added to the middleware public allowlist and authenticated by `CRON_SECRET` (`lib/cron/auth.ts`, fails closed); scheduled in `apps/web/vercel.json` (Field Dispatch 06:00 UTC, notifications 07:00 UTC).

### Removed

- **Figurine system** — dropped `FigurineUnlock` / `FigurineTier` and every code reference (`requiresFigurine`, `hasPresenter`, the figurine query in the lab page, the figurine validation stub).
- **Parental consent** — dropped the unused `ParentalConsent` model.
- **Legacy team-global paper columns** — dropped `papers.proficiency_demonstrated` and `papers.kp_awarded`, verified unread/unwritten (per-student `PaperProficiency` is the source of truth). `papers.pdf_data` is intentionally **kept** — it's still the active fallback for pre-R2 rows in the file route (see TODO.md for its staged retirement).

### Security / Robustness

- Every new route uses the established guards: strict zod (`parseJson`), rate-limiting (`requireTeamContext` / `requireTeacher`), and phase/role gating. KP awards and notifications are idempotent via unique constraints; teacher reads carry an explicit ownership check.
- Added DB indexes on the new hot paths (`activity_feed`, `field_dispatch_content`, `notifications`, `experiments`, `phase_advance_requests`, `teacher_feedback`). Distributed rate limiting was already wired (Upstash) and is verified, not rebuilt.

### Migrations

- `20260621030000_remove_figurines_add_teacher_notif_dataterminal` — drop figurine + parental-consent tables; add `PhaseAdvanceRequest` (+`ValidationStatus`), `TeacherFeedback`, `Notification`, `NotificationPref`, `Experiment`, `Measurement`; `School.adminId` nullable + `School.name` unique; `Class.joinCode` + teacher relation; new indexes.
- `20260621040000_drop_legacy_paper_proficiency_columns` — drop `papers.proficiency_demonstrated` + `papers.kp_awarded`.
- Both authored via `migrate diff` + `db execute` + `migrate resolve` (the shadow DB can't replay a pre-existing enum migration, so `migrate dev` is unusable in this repo). Apply with `prisma migrate deploy`.

### Notes / follow-ups

- Email reminders require `RESEND_API_KEY` (optional); without it the in-app bell is the only channel. Crons require `CRON_SECRET`. See `.env.example`.
- No production deployment exists yet (local Docker Postgres + R2 only). Vercel/Supabase setup and the final `pdf_data` retirement are tracked in `TODO.md`.

---

## [0.6.0] — 2026-06-20

A two-part release: the **Showcase Wing** and **Proof of Expertise / Clearance + KP Shop** feature work lands, and a dedicated **production-hardening pass** (testing, scalability, and security) layered on top of it. The hardening pass is functionality-preserving — every change is either additive or a verified-equivalent extraction, gated by `tsc --noEmit` (strict) and a new unit-test suite (60 tests).

### Added — Features

- **Showcase Wing** — teams publish a completed project as a portfolio: short/long title, ≤250-word abstract, board (PDF), quad chart (PNG), a ~2-minute video link, and optional repo / demo-video / supplement links. Privacy is server-enforced (`public` / `school_only` / `link_only` / `private`) via `canViewShowcase` in `lib/showcase.ts`. Image/PDF bytes stream from **private R2** through the privacy-checked `GET /api/showcase/public/asset` route — never a public bucket or signed URL. Public gallery (`/showcase/gallery`) + per-slug pages (`/showcase/[slug]`) with per-day, per-visitor view counting that never stores a raw IP. Video links are host-allowlisted (YouTube/Vimeo) and the embed src is rebuilt server-side; all other links are validated `http(s)` and rendered with `rel="noopener noreferrer"`.
- **Proof of Expertise / Clearance ladder** — a team raises `TeamCurrency.clearanceLevel` (0→5) by passing escalating clearance exams generated from the team's *own* project context (topic, idea, plan, sources, logs) and graded by Claude. A passing aggregate (≥75) raises clearance as a high-water mark and grants a one-time KP bonus. In-progress answers persist (`answersJson` / `progressIndex`) so an exam can be resumed. Surfaced in the Operations Hub (`components/ops/ExpertisePanel.tsx`).
- **Knowledge-Point shop** — 12 purchasable lab buildings (`lib/shop.ts`) gated by **KP** (`cost × max(1, memberCount)`) and a **clearance ceiling** (`minClearance`), so the best structures require demonstrated expertise, not just grinding. Purchases debit atomically (conditional `updateMany` + unique constraint) to prevent double-spend / double-buy.

### Added — Engineering

- **Unit-test harness (Vitest)** — `vitest.config.ts`, `pnpm --filter web test`. 60 tests, no DB / no Next server / no network. Covers the highest-stakes pure logic: economy invariants, the `canViewShowcase` privacy truth table, phase-gating, the rate limiter (memory + Upstash + fail-open), and the LRU cache.
- **`lib/economy.ts`** — the KP / clearance / purchase arithmetic, extracted from the route handlers into pure, unit-tested functions: `computeQuizAward`, `computeClearanceRaise`, `evaluatePurchase`, `clampScore`, and an opt-in anti-inflation `clampScoreGain`. Faithful extractions — the routes compute identical values; the tests pin the invariants (KP high-water never decreases; ≤100 KP per paper; clearance only rises; failing/weaker retakes grant nothing).
- **`lib/api/route-context.ts`** — `requireTeamContext(req, { tier, feature? })`, a single guard that resolves auth + rate-limit + team context + phase-gate and returns the internal `User.id` and team in **one** DB query.
- **`lib/lru.ts`** — a small bounded TTL + LRU cache (`get`/`set` with size-capped eviction).

### Changed

- **`requireTeamContext` adopted across 19 routes** — the auth → rate-limit → `getTeamContext` → *second* `user.findUnique` → phase-gate boilerplate that was copy-pasted into every handler is replaced by one call. This **eliminates a duplicate `user` query per request** (the route looked up the same row twice) on every production team-scoped route. Behaviour and status codes are preserved; the dev-only `dev/fill-papers` route is intentionally left as-is.
- **Rate limiter is now pluggable + async** (`lib/rate-limit.ts`) — a `RateLimitStore` interface with `MemoryStore` (default; identical fixed-window semantics) and `UpstashStore` (shared counters over the Upstash REST API, **no new dependency**; activates automatically when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set). On multi-instance/serverless hosting the limit now holds **globally** instead of per-instance. `enforceRateLimit` became `async`; all 59 call sites await it. Upstash **fails open** on outage (logs, allows) so a limiter blip can't take down the API.
- **Trusted client IP for rate limiting** — `clientIp` now prefers edge-set headers (`RATE_LIMIT_IP_HEADER` → `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`), so the per-IP backstop can't be trivially defeated by a spoofed `X-Forwarded-For` on anonymous routes.
- **Article cache bounded** — the Wikipedia proxy (`app/api/discovery/article`) swapped its unbounded `Map` for `LruCache` (cap 500, same 30-min TTL), so a long-running instance can't grow memory without limit.

### Security

- **AI grading prompt-injection hardening (V1)** — quiz and clearance grading feed attacker-influenceable text (uploaded PDF / student-authored project context) to Claude as ground truth. That text is now wrapped in explicit `<paper_text>` / `<project_context>` delimiters and the system prompt marks both the document **and** the student's answers as *data, not instructions* — so an injected "award full marks" can't steer the grade and inflate the KP/clearance economy. A tested, opt-in `clampScoreGain` is available to cap implausible single-attempt score jumps (no-op by default).
- **Secret hygiene for view fingerprinting (V3)** — `viewFingerprint` no longer reuses `R2_SECRET_ACCESS_KEY` (a storage credential) with a hardcoded fallback. It uses a dedicated `VIEW_FINGERPRINT_SALT` and **fails closed in production** (resolved lazily on first use so `makeSlug` and `next build` are unaffected); dev falls back to a labelled constant.
- **Standardised AI-call error handling (M5)** — the quiz- and expertise-grading Anthropic calls are now wrapped like the chat route (log internally, return a generic 502) instead of letting an SDK throw surface as an unhandled 500.

### Fixed

- **Duplicate per-request `user` lookup** — team-scoped routes previously queried the `user` row twice (once in `getTeamContext`, once for the internal id). Now one query (see `requireTeamContext`).

### Migrations

- `20260621000000_clearance_and_shop_purchases` — clearance level + KP ledger and team shop-building purchases
- `20260621010000_expertise_exam_progress` — saved in-progress exam answers + progress index
- `20260621020000_showcase_competition_format` — showcase competition asset format (board / quad chart / video / links)

### Notes / follow-ups

- The in-memory rate-limit and article-cache stores remain per-instance unless Upstash is configured; this resolves the long-standing "move counters to a shared store" open question (see ARCHITECTURE.md §12).
- `next lint` / `next build` were not run in the authoring environment (lint needs interactive ESLint setup; build needs Clerk/DB/R2 env). `tsc --noEmit` (strict) is clean, `--noUnusedLocals` shows no dead imports, and 60 unit tests pass. Run lint + build in CI before release.

---

## [0.5.2] — 2026-06-19

### Added
- **Fair dataset expanded** — `lib/fairs/dataset.ts` rebuilt from the Society for Science affiliated-fair directory: **268 entries** (1 ISEF + 40 state + 227 regional fairs), up from the provisional 56. Every entry includes `websiteUrl` (scraped from the directory listing), `latitude`/`longitude` (geocoded via Nominatim or manually fixed), and a stable `seed_key` for idempotent upserts
- **City-level fair geocoding** — 184 fairs re-geocoded from Nominatim by extracting the city hint from each fair's name (e.g. "Synopsys Silicon Valley" → San Jose); 60 further manual coordinate fixes applied. Tooling: `scripts/geocode-fairs.mjs`. Result: all 268 fairs at city level rather than state centroid
- **Team location stored as lat/lng** — `teams.location_lat` / `teams.location_lng` (DOUBLE PRECISION) stored at onboarding and on every `POST /api/team/location` call via `geocodeZip()` (Nominatim, 1 req/s). Eliminates the ZIP3-centroid approximation that caused dense metros (Bay Area ZIPs → SF centroid) to match the wrong fair
- **ISEF category browser** — `components/fair/CategoryBrowser.tsx` + `lib/fairs/categories.ts`: the 22 ISEF categories with descriptions and recommended lab types
- **Forms checklist + per-form status API** — `components/fair/FormsChecklist.tsx` + `app/api/fairs/forms/route.ts` + `app/api/fairs/forms/[formId]/route.ts` + `lib/fairs/forms.ts`. Progress denominator now starts at **3** (required forms: 1, 1A, 1C) and grows by 1 each time a team engages with an optional form (marks it `in_progress` or `complete`)

### Changed
- **`matchFairs` uses stored team coordinates** — `lib/fairs/match.ts` now accepts `coords?: readonly [number, number] | null` and uses them (falling back to `STATE_CENTROIDS[state]`) instead of the old ZIP3 lookup. 95051 → Synopsys Silicon Valley at 3.9 mi ✓; 94086 → same fair at ~5 mi ✓
- **Firecrawl externalized** — added `firecrawl` to `serverComponentsExternalPackages` in `next.config.mjs` so webpack doesn't try to bundle `undici`. Fixes the build error on `sync-deadlines`

### Fixed
- **Nearest-regional fair matching for dense ZIPs** — all CA regionals previously returned Orange County (first in DB order; all fairs shared identical state-centroid coordinates). Root cause: 35 states had Nominatim rate-limit failures during the initial scrape. Fixed by re-geocoding fairs + storing team lat/lng at onboarding
- **Forms progress bar denominator** — was `completed / 12` (all 12 forms). Now `completed / (3 + touchedOptional)`, starting at `X / 3`

### Migrations
- `20260619010000_reseed_isef_fairs` — clears all seeded fairs and their events before the 268-entry re-seed
- `20260619020000_add_team_location_coords` — adds `location_lat` / `location_lng` DOUBLE PRECISION to `teams`

---

## [0.5.1] — 2026-06-18

### Added

#### API security hardening (OWASP API Top 10)
- **Rate limiting on every API route** — new `lib/rate-limit.ts`. `enforceRateLimit(req, tier, userId)` returns a graceful **429 + `Retry-After`** when exceeded. Tiers (per minute): `ai` 12, `upload` 8, `mutate` 40, `read` 120, `join` 10. Checks **both a per-user and a per-IP bucket**; the per-user bucket is the real limit while the per-IP bucket is a generous `×12` backstop so a classroom behind one school NAT IP isn't locked out. Specifically caps the Claude-backed endpoints (chat, quiz gen/grade, paper-upload metadata, research-plan review/idea-check, fair deadline sync) so a single account can't run up unbounded Anthropic spend. `join` is kept tight against invite-code brute-forcing. Counters are in-memory (per instance) by design — see ARCHITECTURE.md §6/§7.1 for the shared-store / Cloudflare-edge upgrade path
- **Strict input validation** — new `lib/validation.ts`. Every body-accepting route now parses via `parseJson(req, schema)` against **strict** zod schemas: type checks, length caps (names ≤80, chat ≤60 msgs × 8k chars, quiz answers ≤50 × 5k, node batches ≤200, …), and `.strict()` so unexpected fields are rejected (mass-assignment defense). Malformed JSON returns a clean 400 instead of an unhandled 500
- **Upload limits** — paper PDF upload capped at **20 MB** and verified by **`%PDF-` magic bytes** (the client-declared MIME type is no longer trusted)

### Changed
- **Secret/error handling** — confirmed Anthropic + R2 keys are server-only (no `NEXT_PUBLIC_*`); removed `detail: String(err)` from client error responses across papers upload, chat, and fair deadline sync (internal errors are now logged server-side only)

### Fixed
- **Stored-XSS hardening in the Wikipedia reader** — `app/api/discovery/article` now runs article HTML **and** the page title through **`sanitize-html`** (strict tag/attribute allowlist) before they're rendered via `dangerouslySetInnerHTML` in `WikiReader`. The prior regex tag-stripping was cosmetic, not a security boundary, and Wikipedia content is publicly editable

### Removed
- Dead `'/api/showcase/(.*)/view'` entry from the `middleware.ts` public-route matcher (no such route exists)

---

## [0.5.0] — 2026-06-18

### Added

#### Multi-student teams with independent proficiency (Feature 1)
- **Per-(student, paper) proficiency** — new `PaperProficiency` model (`@@id([paperId, userId])`, `demonstrated`, `bestScore`, `kpAwarded`) replaces the team-global `papers.proficiency_demonstrated` / `papers.kp_awarded` as the source of truth. Each member now demonstrates proficiency and earns KP **independently** (max 100 per student per source), so team currency accumulates ~2–3× for 2–3-student labs. `GET /api/papers` and `/api/papers/[id]` return the **current user's** proficiency; `quiz/grade` upserts the student's row + high-water mark
- **Team invite / join** — `Team.maxMembers` (default 3) + `TeamInvite` (single-use codes). `POST /api/team/invite` (lead-only) mints a code; `POST /api/team/join` redeems it, enforcing capacity atomically. Onboarding gains a **Create-a-lab / Join-a-lab** toggle; a new **Team panel** (opened from the status-strip team name) shows the roster and lets the lead generate codes (`GET /api/team`)
- **Building-cost scaling** — shop costs are `baseCost × live member count`; `ShopPanel` shows a `×N · N-student lab` badge
- **Phase gate** — `lib/team/advance.ts` computes literature_review → research_planning readiness (25 sources uploaded AND every member proficient on all 25). A lab-scene `PhaseAdvance` banner shows live progress ("18/25 sources · 2/3 members ready") and, once satisfied, advances via `POST /api/team/advance-phase` (gate re-checked server-side)

#### Engineering/Science Research Plan building (Feature 2)
- `research_plan` gateway is now a real feature (`components/research-plan/ResearchPlanFeature.tsx`)
- **Google Doc paste-a-link** — `ResearchPlan` model + `lib/research-plan/google-doc.ts` fetch the published `export?format=txt` text on demand (OAuth deferred; abstraction localizes the future swap). `POST /api/research-plan` saves config + syncs; "Refresh" re-fetches
- **Type-specific AI review** — engineering vs science + a subtype (robotics, software, biology, …); rubrics in `lib/research-plan/rubrics/` compose a track base with subtype emphasis (ISEF-derived). `POST /api/research-plan/review` returns a structured, scored critique (cached on the doc text) and persists it on the plan
- **"Has this idea been done before?"** — `POST /api/research-plan/idea-check` runs Claude with the **Anthropic native web-search tool** (`web_search_20260209`) over the plan, returning a novel/refine/reject verdict, prior work, differentiation, and citations. **Rate-limited 3/day per team** (`IdeaCheck` rows)
- Both the review and the idea-check **stream live** (NDJSON): the review's rubric rows grade in one at a time with filling bars and the three columns populate as bullets arrive; the idea-check shows each web search + sources as they happen. Both results are **persisted on the plan** (`lastReviewJson` / `lastIdeaCheckJson`) so they survive reloads, and each re-run **replaces** the prior result in the DB and on screen

#### Location-based Science Fair gateway (Feature 3)
- `science_fair` gateway is now a real feature (`components/fair/ScienceFairFeature.tsx`): countdown to the team's fair day, cards for the matched **regional** / **state** / **ISEF** fairs, and the full **ISEF rubric** (science + engineering criteria + board guidance) from `docs/reference/ISEF-2026.md`
- **US location** — `Team.locationZip` / `locationState`, captured at onboarding (optional ZIP) or inline (`POST /api/team/location`); `lib/fairs/zip.ts` derives the state from ZIP prefixes
- **Fair matching** — provisional affiliated-fair dataset in `lib/fairs/dataset.ts` (lazily upserted into `Fair`/`FairEvent` with coordinates + `seedKey`); `matchFairs` finds the state fair + nearest regional by distance (`GET /api/fairs/match`)
- **AI deadline sync** — `POST /api/fairs/[id]/sync-deadlines` reads a fair's site and extracts dates into a `FairEvent` marked **estimated**; the UI is upfront that dates need per-fair verification

### Changed
- Proficiency/KP are now per-student everywhere; `papers.proficiency_demonstrated` and `papers.kp_awarded` are retained one release as a transitional backfill source / fallback (see `TODO.md`)

### Migrations
- `20260618010000_multi_student_teams` — `teams.max_members`, `team_invites`, `paper_proficiency` (+ backfill from passing quiz sessions)
- `20260618020000_science_fair_location` — `teams.location_zip` / `location_state`, `fairs.latitude` / `longitude` / `seed_key`
- `20260618030000_research_plan` — `research_plans`, `idea_checks`
- `20260618040000_research_plan_idea_check` — `research_plans.last_idea_check_json` / `last_idea_check_at` (persist + replace the current idea-check result)

---

## [0.4.0] — 2026-06-18

### Added

#### Building shop
- **Buildings shop** (`components/lab/ShopPanel.tsx`): bottom-right shop button on the lab scene opens a rectangular overlay — a single horizontally-scrolling shelf of two rows of building cards (placeholder image, name, KP cost, description), with the team's three currencies pinned along the bottom. No tabs; buildings only
- Building catalog in `lib/shop.ts` (12 purchasable structures with KP costs); cost text turns red when unaffordable

#### Knowledge Points for quiz proficiency
- A proficient literature-review quiz now awards the team **your score in KP, capped at 100 per source**. `papers.kp_awarded` is a per-paper high-water mark (team-scoped); a passing grade tops up by `max(0, score − kp_awarded)`, failing/non-improving retakes award 0
- Awarded atomically in `POST /api/papers/[id]/quiz/grade` (increments `team_currency.kp`); grade response returns `kpEarned`, surfaced as a **+N KP** badge on the results banner
- Live currency: `lib/labCurrency.tsx` context lets features bump the balance optimistically; the `StatusStrip` stat **ticks up, turns green, and balloons** then settles on any increase
- Teams now seed a zeroed `TeamCurrency` row at onboarding (`currency: { create: {} }`); the award upserts for legacy teams

#### Cloudflare R2 storage
- PDFs are now stored in **Cloudflare R2** instead of Postgres bytes. New helpers in `lib/storage.ts` (`putObject`, `getObjectStream`, `paperPdfKey`); object key on `papers.pdf_key`
- Upload (`POST /api/papers`) writes to R2 and rolls back the row on failure; the viewer (`GET /api/papers/[id]/file`) streams from R2 through the same authenticated, team-scoped route — never a public/signed URL
- Existing PDFs backfilled from `pdf_data` into R2

### Changed
- `.env.example`: added the required `ANTHROPIC_API_KEY`; removed the dead `AI_SERVICE_*` and `UPSTASH_REDIS_*` entries
- Root `package.json`: dropped the deprecated `pnpm.onlyBuiltDependencies` block (build approval now lives in `pnpm-workspace.yaml` `allowBuilds`)

### Removed
- **Python `ai-service` microservice** (entire `apps/ai-service/`), its web client `lib/ai-service.ts`, the shared `packages/shared-types/src/ai-service.ts`, and `docs/api-contracts.md` — all AI work runs directly in Next.js API routes via the Anthropic SDK
- `redis` and `ai-service` services from `infra/docker-compose.yml` (local dev is just Postgres now)
- Unused dependencies: `bullmq`, `@upstash/redis`, `react-flow-renderer`, `d3-force`, `@types/d3-force`

### Migrations
- `20260617000000_add_paper_kp_awarded` — `papers.kp_awarded`
- `20260618000000_add_paper_pdf_key` — `papers.pdf_key`

---

## [0.3.0] — 2026-06-17

### Added

#### Onboarding
- Real onboarding form (`app/(onboarding)/onboarding/page.tsx`) collecting name + lab/team name
- `POST /api/onboarding` creates the `User`, `Team`, and `TeamMember` records (idempotent); seeds the team at `literature_review` phase
- Dashboard layout now redirects users without a team to `/onboarding`

#### Literature Review — Quiz
- Structured **graded comprehension quiz**: free-response (not MCQ), AI-generated questions grounded in the paper's full text, each with a server-only grading key
- Pedagogy/grading rules externalized to `lib/literature/quiz-rubric.md` (tunable, loaded into both generation and grading prompts); knobs `QUIZ_QUESTION_COUNT` (5) and `QUIZ_PASS_THRESHOLD` (70) in `lib/literature/quiz.ts`
- `POST /api/papers/[id]/quiz` generates a quiz; `POST …/quiz/grade` grades all answers in one call (aggregate score, pass/fail); `GET …/quiz` returns the last graded session
- Persistence: `PaperQuizSession` + `PaperQuizAttempt`; proficiency persisted on `papers.proficiency_demonstrated`
- Past results (answers + Vega's feedback) reload on reopen; header tabs switch between **Quiz results** and **Discuss with Vega** (active tab gold); pass → green "Proficiency demonstrated" banner (mirrored on the source slot)

#### Literature Review — Viewer, Chat, Delete
- **In-panel PDF viewer**: PDF bytes stored in `papers.pdf_data`, streamed inline (auth'd) via `GET /api/papers/[id]/file`
- **Chat persistence**: `PaperChatMessage` model; `GET/POST /api/papers/[id]/chat` save and reload the per-user conversation
- Vega replies rendered as **Markdown** (`react-markdown` + `remark-gfm`, styled via `.chat-md`)
- **Delete source** button (`DELETE /api/papers/[id]`, cascades quiz/chat/notes)

#### Discovery — Persistence, Topic, Restyle
- Discovery tree persisted to the DB (`discovery_nodes`, team-scoped) via `GET/POST/DELETE /api/discovery/tree` and `PATCH/DELETE …/tree/[id]`; store hydrates from DB instead of `localStorage`
- **Final research topic** stored on `Team.topic` (`GET/POST /api/discovery/topic`); shown on the Discovery home, settable from the explorer bar or any starred item
- Full **pixel-art restyle** of Discovery (home, search, Wikipedia reader, tree, branch panel) to match the game aesthetic; smooth-animated FAQ accordion; "← Back" button

#### Discovery — YouTube deep dives
- Paste-only YouTube exploration (no API key, no quota): `POST /api/discovery/youtube/resolve` resolves a URL → `{ videoId, title }` via public oEmbed
- Embedded IFrame player; **⌘V/Ctrl+V auto-capture**; `addYouTubeVideo` branches off the current node
- Unified source-tagged forest tree (`DiscoverySource += youtube`, `youtubeVideoId`/`youtubeTitle` columns); ▶ markers on video nodes; cross-source bridging (a video can branch off a Wikipedia node)
- New "What about YouTube deep dives?" FAQ on the Discovery home

### Changed
- **PDF parsing switched from `pdf-parse` to `unpdf`** — in-process, ~250 ms, serverless-ready; extracted text now stored in `papers.full_text` (was temporarily in `content_hash`)
- Paper metadata extraction + Q&A use **prompt caching** on the paper text (follow-up turns ~10% cost)
- Q&A chat reframed as post-quiz discussion (proficiency is now owned exclusively by the quiz, not the chat)
- Clerk redirect env vars migrated to `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` / `SIGN_UP_FORCE_REDIRECT_URL` (deprecation)

### Fixed
- Q&A split view: the PDF pane no longer overflows and hides the quiz/chat panel (`min-w-0` flexbox fix)
- Filled literature slots no longer collapse to a thin line (`shrink-0`)
- Quiz/chat/onboarding/topic inputs given dark backgrounds so typed text is visible
- Chat 500s eliminated: persistence is best-effort (reply never lost) and the conversation is sanitized to start at the first user turn

### Removed
- **Citation graph** feature: `/api/citation-graph`, the graph page, `PaperCitation`, `CitationEdge`, `PaperCluster`
- **Embeddings + clustering**: `embedding` column, `pgvector` extension, `PaperSummary`, and the `voyageai` / `hdbscan` / `langchain-text-splitters` deps (Python service); `embeddings.py` + `citation_extractor.py` deleted
- `pdf-parse` and `@types/pdf-parse` (replaced by `unpdf`)

### Dependencies
- Added: `unpdf`, `react-markdown`, `remark-gfm`
- Removed: `pdf-parse`, `@types/pdf-parse` (web); `voyageai`, `hdbscan`, `langchain-text-splitters` (ai-service)

---

## [0.2.0] — 2026-06-17

### Added

#### Environment & Tooling
- Installed `@anthropic-ai/sdk` and `pdf-parse` npm packages in the web app
- Added `ANTHROPIC_API_KEY` environment variable to `.env.local` (and `.env.example` template)
- Configured `pnpm-workspace.yaml` `allowBuilds` to permit native addon compilation for `@clerk/shared`, `@prisma/client`, `@prisma/engines`, `prisma`, `sharp`, `msgpackr-extract`, `unrs-resolver`
- Added `font-pixel` (`Press_Start_2P`) as a Tailwind CSS utility in `tailwind.config.ts`

#### Landing Page (`apps/web/app/page.tsx`)
- Replaced the old multi-section marketing homepage (hero, feature grid, footer) with a minimal pixel-art landing screen
- Dark navy background (`#0d1b2e`), pixel font throughout, yellow accent (`#F5C518`)
- SVG recreation of the scienium mascot (figure hunched over a table) rendered inline alongside the "scienium" heading
- Single CTA button "↑ ENTER YOUR LAB" links to `/sign-in`
- Logged-in users are still immediately redirected to `/lab`

#### Lab Scene — All Buildings Visible (`apps/web/components/lab/LabScene.tsx`)
- Phase gating temporarily removed from building visibility: all 7 gateway buildings now render regardless of `teams.phase`
- Lock gating also bypassed: all buildings are clickable regardless of phase
- Both bypasses are marked with `// TODO: restore` comments for re-enabling once progression integration begins

#### Literature Review Feature (`apps/web/components/literature/LiteratureFeature.tsx`)
- New component replacing the prior `StubFeature` placeholder, registered in `featureRegistry.tsx`
- **25-slot list view**: displays all 25 required source slots; filled slots show paper metadata, empty slots show as dashed-border rectangles
- **Upload**: first empty slot renders a centered "Upload source" button with drag-and-drop support; clicking opens a native file picker (PDF only)
- **Optimistic UI**: uploaded paper appears immediately as a placeholder with status `uploading` → `processing` → `ready` via 3-second polling
- **Proficiency banner**: every paper without demonstrated proficiency shows an orange "Proficiency not demonstrated" badge above its row
- **Action buttons** per ready paper: "PDF" (opens file in new tab) and "Q&A" (opens split review view)
- **Progress bar + counter**: yellow progress bar and `N / 25` readout in the panel header
- **Q&A split view**: clicking Q&A replaces the panel body with a two-column layout — PDF iframe on the left, chat interface on the right (mirrors Discovery's Wikipedia reader + tree layout)
- Chat is pre-seeded with Vega's opening message; user messages sent via `POST /api/papers/[id]/chat`; Enter key submits
- `PROFICIENCY_DEMONSTRATED` hidden signal stripped from display; triggers removal of the orange banner for that paper

#### API Routes
- `POST /api/papers` — accepts `multipart/form-data` PDF upload; parses text with `pdf-parse`; creates `papers` row with `status = processing`; stores extracted text in `contentHash` field; fires async Claude call (`claude-sonnet-4-6`) to extract title, authors, and abstract; marks paper `ready` on completion
- `GET /api/papers` — returns all papers for the authenticated user's team
- `GET /api/papers/[id]` — returns single paper by ID (used for status polling)
- `POST /api/papers/[id]/chat` — runs a tutoring conversation against the paper's extracted text using `claude-sonnet-4-6`; enforces team ownership; returns `{ reply }` JSON

#### Claude System Prompts
- **Extraction prompt** (in `POST /api/papers`): instructs Claude to return a JSON object `{ title, authors, abstract }` from raw PDF text; used server-side only
- **Q&A tutor prompt** (in `POST /api/papers/[id]/chat`): Vega persona; assesses comprehension across four criteria (hypothesis, methodology, findings, relevance); emits `PROFICIENCY_DEMONSTRATED` signal on a new line when all four are met; encourages genuine understanding over surface recitation

### Changed

- `apps/web/lib/featureRegistry.tsx`: `literature_review` entry changed from `StubFeature` to dynamically imported `LiteratureFeature`
- `apps/web/app/api/papers/route.ts`: replaced the prior stub implementation (which returned `501 Not Implemented`) with full upload + async processing logic

### Removed

- Old multi-section landing page content (nav bar, hero section with gradient heading, feature grid with emoji cards, footer)
- Citation Graph tab from literature review (removed per product decision; will be revisited in a later milestone)
- Upload / Library tab split (merged into single unified 25-slot view per product decision)

---

## [0.1.0] — 2026-06-11

### Added

- Initial monorepo structure (`pnpm workspaces`): `apps/web`, `apps/ai-service`, `packages/`
- Next.js 14 web app with App Router, TypeScript, Tailwind CSS
- Clerk authentication (sign-in / sign-up / session middleware)
- Prisma schema covering the full data model: users, teams, discovery, literature, buildings, currency, daily activities, PvP, showcase, science fair hub
- Database migration baseline (`20260611000000_add_phase_lab_selection_research_planning`) adding `lab_selection` and `research_planning` values to the `project_phase` enum
- Pixel-art lab scene (`LabScene.tsx`) with isometric grid layout, `TileBackground` (deterministic grass tiles), `BuildingSprite`, `FeaturePanel` overlay system, and `StatusStrip`
- All 7 gateway building configurations (`lib/gateways.ts`) with phase unlock rules and isometric cell positions
- Sprite manifest (`lib/sprites/manifest.ts`) covering 49 gateway sprites (7 buildings × 7 skins), 9 ground tiles, and padlock UI sprite
- Pixel-art pipeline under `art/`: `iso.py` (7 isometric gateway buildings), `build_sprites.py` (ground tiles + padlock), `recolor.py` (42 lab-type reskins), `compose_scene.py` (full-scene previews)
- Discovery feature: Wikipedia reader with link interception, branching tree visualization (react-flow), Zustand store, starred nodes, topic interest list
- `StubFeature` placeholder for all 6 non-Discovery gateway buildings
- Docker Compose local dev environment (`infra/docker-compose.yml`): `pgvector/pgvector:pg16` + `redis:7-alpine`
- `SETUP.md` with full macOS setup instructions
- `SPEC.md` and `ARCHITECTURE.md` design documentation
