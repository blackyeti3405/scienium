# scienium — TODO / deferred work

Tracked items intentionally deferred during development. Remove an entry once done.

## AI cost review — YOUR call, from real pilot data (REFACTOR2 P1-R3, budget half)

Accounting, the kill switch, and the model registry shipped in v0.45.0. What is
**deliberately not built** is everything that needs a number only a real
classroom can give. Do these in order.

### 1. Read the data (nobody has looked yet)
Nothing in the app has ever recorded what a call cost, so every figure below is
an estimate from `max_tokens` ceilings, not an observation. After a week of real
use:

```sql
-- Per team per day, most expensive first
SELECT team_id, day, SUM(cost_micros)/1000000.0 AS dollars, COUNT(*) AS calls
FROM ai_usage GROUP BY team_id, day ORDER BY dollars DESC LIMIT 50;

-- Which feature actually costs the money
SELECT operation, model, COUNT(*), SUM(cost_micros)/1000000.0 AS dollars
FROM ai_usage GROUP BY operation, model ORDER BY dollars DESC;

-- Per class (attribution joins through teams)
SELECT c.name, SUM(u.cost_micros)/1000000.0 AS dollars
FROM ai_usage u JOIN teams t ON t.id = u.team_id JOIN classes c ON c.id = t.class_id
WHERE u.day >= CURRENT_DATE - 7 GROUP BY c.name ORDER BY dollars DESC;
```

### 2. Move cheap work to a cheap model
`lib/ai/models.ts` is one table; changing a line changes one call's model, and
the `ai_usage` rows show what it saved. **The registry currently encodes exactly
the models that were hardcoded before it — no call was moved.** The split to
evaluate, generation vs. anything that mints a reward:

- **Candidates to move down:** `vocab_curate` (8,000 output tokens, the largest
  single call), `quiz_generate` (highest volume — 25 papers x every student),
  `quiz_retry_generate`, `expertise_generate`, `failure_followup`.
- **Leave alone until measured:** `quiz_grade`, `explain_grade`,
  `expertise_grade` — these mint proficiency and KP, and P1-S3 was *literally*
  about bad grading output minting false proficiency. Do not cheapen the payout
  path first. Also `research_plan_review` (teacher-facing), `idea_check`
  (tool-use quality).
- Change ONE at a time and compare `ai_usage` before/after alongside a spot check
  of output quality. There is no eval harness for this yet.

### 3. Set the caps, then turn enforcement on
Nothing is refused today. Starting points, sized from `max_tokens` ceilings on
the **current** Sonnet-heavy mix — expect them to drop a lot after step 2:
- Per team per day: **~$3**. Generous on purpose. A cap that fires mid-lesson
  stops a student's work, which is worse than the bill it saved.
- Global per day: **~$50**. This is a *what am I willing to lose in a bad day*
  number, not a usage forecast.
- Enforcement should reserve at the maximum possible cost (counted input +
  `max_tokens` x output rate) and settle to actuals, or the ceiling can be
  overshot by whatever the estimate missed.

### 4. Teacher-facing cost view
Attribution is already there (`ai_usage.team_id` joins to class and school), so
this is a query plus a page. Worth doing *before* enforcement: a teacher who can
see their class's spend can self-police, which is the pressure valve that keeps
per-team caps from ever firing.

### 5. Sonnet 5 introductory pricing ends 2026-08-31
$2.00/$10.00 per MTok becomes $3.00/$15.00 — a **50% rise**, not a doubling.
When it changes, edit `AI_RATES` **and** bump `AI_RATE_VERSION` in
`lib/ai/models.ts` in the same commit. Rows already written keep their old
version string, so historical totals stay true. This is deliberately NOT
date-automatic: a server-clock-driven price switch is a landmine.

### Also owed from this batch
- `AiDisabledError` maps to a clean **503** only on the two streaming services
  (review, idea-check), which had to preflight anyway. The other thirteen call
  sites surface it through their existing generic error path — the *money* is
  guarded everywhere, the status code is not.
- A dropped `ai_usage` write is logged (`ai_usage.record_failed`) and lost. There
  is no outbox; accounting must never fail a request that already paid.
- `runAiOperation` (the replay ledger) still does not wrap
  `phase_advance_classify`, so that call has a claim but no replay.

## Retention windows — every number here needs qualified input (REFACTOR2 P1-R9)

v0.49.0 built the **mechanism**: `retention_policies` (a per-model table), the registry in
`lib/retention/policies.ts` that declares what can be pruned and how, and a nightly pass
(`GET /api/cron/data-requests`). The table **ships empty on purpose**. Filling in a window is
now an `INSERT`, not a project — which is exactly why the numbers were left out rather than
guessed at.

**None of the numbers below are ours or the owner's to decide.** FERPA/COPPA and the school
contract govern them; `docs/SECURITY.md` already flags that as needing a lawyer. Bring this
table to that review.

| `key` | What a row is | Days | Notes for the reviewer |
| --- | --- | --- | --- |
| `showcase_view` | Pseudonymous visitor fingerprint (salted hash of IP + UA + day) | **90 — SHIPPED as the registry default** | The one endorsed number, and **still unconfirmed**. Unbounded growth, no product use past the daily-count aggregate it already fed. Confirm or change it. |
| `activity_feed` | Per-student progression events | — | Feeds the dashboard feed and teacher reports. Probably wants to survive a school year. |
| `notification` | In-app notifications | — | Working state, not history. A short window is likely safe. |
| `notification_email` | Delivered outbox rows: recipient address + subject | — | These hold an email address. Resend also keeps its own copy on its own schedule. |
| `paper_chat_message` | Vega paper-chat transcripts | — | **Student-written text.** The densest content in this list. |
| `vega_study_message` | Study-with-Vega transcripts | — | Same. |
| `ai_operation` | Replay ledger — provider results cached verbatim | — | May contain generated content about a student's work. Pruning costs replay, not correctness. |
| `ai_usage` | Token counts and cost | — | No content. Pruning it destroys the cost history the "AI cost review" section depends on — coordinate the two. |
| `teacher_feedback` | Teacher feedback on student work | — | Arguably an educational record with its own statutory retention. Ask specifically about this one. |

A `NULL` `retain_days` row is meaningful and is the right way to record "reviewed, decided not
to prune" — including turning `showcase_view` back off.

### Also owed from that batch

- **Approval has no UI, by design, and therefore no audit trail beyond `decided_note`.** The
  operator is whoever holds `CRON_SECRET`; the request row records *that* a decision was made,
  not *who* made it. A teacher- or admin-facing approval queue with a real actor id is the
  natural next step, and needs the class-membership half of P1-R8 to scope it.
- **Nothing verifies who is asking.** A student can file a deletion request for themselves; a
  parent or school cannot file one through the app at all. Identity checks happen out of band
  before approval.
- **The erasure is a tombstone, not a row drop.** Team-shared authored work holds required FKs
  to `users`. A true row-level delete needs those columns to become nullable or to point at a
  shared tombstone user — a migration across eight tables, deliberately not done here.
- **Not rehearsed against production-like data.** The audit asked for a drill. The workflow is
  unit-tested and the UI is E2E-tested, but no erasure has been run against a realistic corpus.
- **`attached` uploads stay with the team**, so a student's photo inside a teammate's project
  log survives their erasure. That is the runbook's team-artifact policy applied consistently;
  confirm it is the policy the school expects.

## Large-file dispositions (REFACTOR2 §0.7) — the tranche that had never been started

§0.7 lists 44 authored files over 300 lines with a manual verdict each. Until v0.53.0 **none of
the structural verdicts had been acted on** — the correctness findings inside those files were
closed by the P1 batches, but every file was still at or above its audited size.

Its own rule applies: *line count is a diagnostic, not a refactoring goal.* Work these by the
defect they carry, not by length, and be willing to record "the split is not worth it" where the
stated reason has already been fixed another way.

**Done:** `components/discovery/DiscoveryTree.tsx` (v0.53.0),
`components/ops/ExpertisePanel.tsx` (v0.54.0 — defect closed, view split deliberately left),
`lib/discovery/openalex.ts` (v0.55.0 — hardened; split declined with a reason),
`stores/discoveryStore.ts` (v0.56.0 — defects closed; split declined with a reason),
`components/teacher/TeacherRubricScoring.tsx` (v0.57.0 — E2E F10 re-run 16/16),
`components/ops/CodexTab.tsx` (v0.58.0),
`components/literature/LiteratureFeature.tsx` (v0.59.0),
`components/discovery/SourceReader.tsx` (v0.60.0 — save path only; URL-scheme validation still open),
`lib/teacher/student-overview.ts` (v0.60.1 — pairing verified closed by v0.48.0; query split declined).

**Highest value remaining**, by the defect each verdict names — every one is a live behaviour
problem, not a size complaint:

| File | The defect the verdict names |
| --- | --- |
| `lib/hooks/usePlotBuildings.ts` | No abort/resync; refresh errors swallowed; duplicated optimistic economy prediction. |
| `components/lab/LabScene.tsx` | Six booleans permit overlapping off-path panels. |
| `lib/discovery/articles.ts` | Feed URLs and provider bodies need canonical host/content-type/byte validation. `readCapped` now exists (v0.55.0) — this is where it lands next. |

**Deliberately deprioritised** (verdict is structural only, no named defect): `app/globals.css`
(3,051 lines) and `prisma/schema.prisma` (now 2,282). Both are real cleanups with real risk and
no behaviour attached; they are the least valuable thing on this list until something breaks.

**Already answered another way** — the split was proposed as a vehicle for a fix that has since
landed, so the remaining work is cosmetic: `lib/discovery/tree-service.ts` (P1-R10),
`lib/uploads/assets.ts` (P1-R12), `lib/fairs/match.ts` (P1-R16), `lib/fairs/forms.ts` +
`components/fair/FormsChecklist.tsx` (P0-R4), `lib/literature/synthesis.ts` and
`components/literature/SynthesisMatrixEditor.tsx` (P1-R13),
`lib/ops/codex/complete-service.ts`, `app/(public)/showcase/[slug]/page.tsx` (P0-R3/P1-R7).

## E2E — what the 2026-07-26 rebuild left open

The audit and the changes are in [`runbooks/e2e.md`](runbooks/e2e.md). Remaining:

- **Parallelism (the only remaining runtime lever).** The suite runs one worker because
  `User.activeTeamId` is singular — one signed-in account owns one lab at a time. Going parallel
  needs **one Clerk test account per worker**, which provisions accounts in your Clerk instance
  and is therefore your call, not something to do silently. Everything else in the rebuild is the
  half that needs no new accounts, and it is the half that removes the flakes.
- **Migrating the other 31 specs to `createLab`.** The primitive exists (`e2e/lab.ts`) and
  `synthesis-matrix.spec.ts` is the worked example. Each migration deletes a `beforeAll` full of
  `deleteMany` calls and removes one more reason for `mode: 'serial'`.
- **`F4` AC3.** `Showcase.teamId` is `@unique`, so `F4` and `F4-print` drive one row from two
  files. Per-spec labs are the fix; it needs both files migrated together.
- **The auth recovery ladder** in `e2e/api.ts` (~150 lines of escalating Clerk session recovery)
  **fired zero times** in the production-build baseline. It exists for the `next dev` lane. Worth
  deleting if a few dev-lane runs agree.
- **`E2E_ENV_FILE` is still not configured**, so both CI jobs report "skipped: secrets not
  configured" and pass. Until it is set, none of this is an enforceable gate — that one secret is
  what turns the whole lane on.
- **The synthesis 409** tells the student their grid changed but not **what** changed. A diff
  would be kinder.
- **CodexTab's two effect-ordering guards are unpinned** (v0.58.0): cleanup-on-navigate and
  per-slug settle. Two tests restating them were written and deleted — they could not fail on a
  regression. `F13-codex` covers the happy path only.
- **No E2E asserts the discovery write-failure toast** (v0.56.0). Pinned in vitest only; a
  spec would need `page.route` to fail `POST /api/discovery/tree`.
- **The clearance panel has no E2E at all** — it is the only ops tab without one. v0.54.0's
  refusal-to-exit-on-unsaved-progress path is pinned in vitest
  (`components/ops/expertiseProgress.test.ts`) but never driven in a browser. A spec would need
  `page.route` to fail the `PATCH /api/expertise`, plus a stubbed exam so the setup does not
  make a paid generation call.

## Activity durability — 11 events still outside a transaction (REFACTOR2 P1-R5)

v0.46.0 split activity logging into `recordActivity(tx, …)` (durable, throws, writes
inside the caller's transaction) and `logActivityBestEffort(…)` (explicitly optional).
Five progression events were migrated. These eleven are **durable-class but still
best-effort**, because in each the payload is only known after the domain write, so
migrating means restructuring the handler rather than renaming a call:

- `app/api/papers/[id]/quiz/grade/route.ts` — `quiz_passed`
- `app/api/papers/[id]/explain/route.ts` — `explanation_passed`
- `app/api/expertise/grade/route.ts` — `clearance_raised`
- `app/api/team/advance-phase/route.ts` — `phase_advanced` (two sites: self-advance
  and the paid classify path)
- `app/api/team/join/route.ts` — `member_joined`
- `app/api/showcase/route.ts` — `showcase_published`
- `app/api/discovery/topic/route.ts` — `topic_locked`
- `app/api/discovery/tree/route.ts` — `discovery_kp_awarded`
- `app/api/discovery/sources/[id]/reflection/route.ts` — `discovery_kp_awarded`
- `app/api/discovery/source/[id]/promote/route.ts` — `source_promoted`
- `app/api/literature/vocab/review/route.ts` — `vocab_term_mastered`

`test/activity-durability.test.ts` asserts this list EXACTLY. Removing an entry from the
code without updating the test fails, and adding a new best-effort durable-class event
fails too — the list can only shrink on purpose.

Two of these (`showcase/route.ts`, `discovery/tree/route.ts`) have no transaction at all
today, so they need one introduced before the activity write can join it.

## E2E asset reclaim needs a separate R2 test bucket (REFACTOR2 P1-S15)

v0.47.0 routed `e2e/paper-upload.spec.ts` cleanup through the real deletion lifecycle
and made it assert the `UploadedAsset` row ends up `orphaned` — provably queued for the
reclaim sweep. What it does NOT do is verify the object is physically gone, because
**R2 `nova-lab-assets` is shared with production**: a test that deletes objects there
is one bad predicate away from deleting real student uploads.

To close it properly: create a separate bucket (e.g. `nova-lab-assets-e2e`), point the
E2E environment's `R2_BUCKET_NAME` at it, and then the spec can run the reclaim and
assert the object is actually gone. Until then, physical reclaim stays covered only at
the unit level (`test/paper-delete-asset.test.ts`, `reconcileOrphanedAssets`).

The rewritten spec has also **not been executed** — it needs the dev server, database,
Clerk credentials, and makes a paid ingestion call. Run
`pnpm --filter web test:e2e:file e2e/paper-upload.spec.ts` before trusting it.

## Class membership — what v0.52.0 left open

The class half of P1-R8 shipped: withdraw, leave, and teacher removal, each clearing the derived
authorization in the same transaction, plus `ClassMembershipEvent` as the append-only log. What is
still owed:

- **Teacher-initiated lead reassignment.** Unchanged from the team half, and deliberately so:
  "the lead may hand over" and "a teacher may reassign" are different capabilities, and conflating
  them is how one becomes the other. It needs its own authorization.
- **No notification when a teacher removes a student.** They discover it by looking. The
  notification machinery exists (`lib/notifications/`); this is a `dedupeKey` and a template.
- **The event log has no reader.** Nothing surfaces class history to a teacher, so the record
  exists but nobody can see it. A class-history panel on the roster is the natural home.

## PatentsView API key (Discovery prior-art lane)
- **Now:** the "Prior art (patents)" lane in Discovery's Articles tab runs keyless —
  it degrades to a single Google Patents search link-out card instead of live
  titled results.
- **To do:** request a free key at https://patentsview.org/apis/keyrequest and set
  `PATENTSVIEW_API_KEY` in `apps/web/.env.local` (dev) and the Vercel env (prod).
  No code change needed — the lane detects the key and switches to live
  PatentsView results automatically (`lib/discovery/patents.ts`).

## Error tracker — Sentry (wired + verified 2026-07-18; deploy steps remain)
- **Done:** `@sentry/nextjs` across all three runtimes (`instrumentation.ts`
  `onRequestError` auto-captures every unhandled server error;
  `instrumentation-client.ts`; `app/global-error.tsx`), `withSentryConfig` with
  the `/monitoring` tunnel (ad-blocker-proof, CSP stays `'self'`), privacy
  posture per the observability rules (no Session Replay, conservative
  `dataCollection` default, no local variables, DSN-gated no-op without env).
  Verified end to end from localhost: issue 7619054534 in the `scienium` org.
- **At production deploy:** set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in the
  Vercel env (same value as `.env.local`); add the three source-map build vars so
  production stack traces resolve to real files instead of minified bundles:
  - `SENTRY_ORG=scienium` (org slug — the `scienium.sentry.io` subdomain)
  - `SENTRY_PROJECT=javascript-nextjs` (project slug — the last path segment of
    the Sentry project settings URL, *not* the numeric id inside the DSN)
  - `SENTRY_AUTH_TOKEN=` — **generate at deploy time**, Sentry → Settings →
    Auth Tokens (org-level token; pre-scoped for source-map upload). Shown once.
    Vercel-only by design: kept out of `.env.local` so local `next build` doesn't
    upload maps or cut releases.

  Org and project are mirrored in `.env.local` (harmless without the token —
  `next.config.mjs` passes no explicit `org`/`project`, so the Sentry plugin
  reads all three from the env by name). Then create one Sentry alert rule
  (error-rate spike → email).

## Google Drive OAuth (Research Plan building — Feature 2A)
- **Now:** the Research Plan feature uses a **paste-a-link fallback** — the student
  pastes an "Anyone with the link" Google Doc URL and we fetch the published text on
  demand. No Google account connection.
- **Needed for launch:** real **Google OAuth 2.0** (Drive + Docs read-only scopes) so a
  student connects their Drive once and we always sync the latest version of their
  research-plan doc without re-pasting.
  - Create a Google Cloud project + OAuth consent screen + credentials (client ID/secret).
  - Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / redirect URI to env.
  - Build `GET /api/google/connect` + callback; store refresh token on a `GoogleAccount`
    model; swap the paste-a-link fetch for Docs API export.
  - Verify scope/consent-screen review requirements for production use.

## Storage cleanup (Feature 0.4.0 follow-up)
- The legacy team-global `papers.proficiency_demonstrated` + `papers.kp_awarded`
  columns are **done** (dropped in migration `20260621020000`).
- Still pending: retire `papers.pdf_data`. It's the last transitional fallback — the
  file route (`app/api/papers/[id]/file/route.ts`) prefers `pdf_key` (R2) and only
  serves `pdf_data` for pre-R2 rows. The **local** DB has 0 rows relying on it, so
  retirement is safe there; deferred until there's a production DB to confirm against.
- **When ready (2 steps):**
  1. Confirm prod has none: `SELECT count(*) FROM papers WHERE pdf_data IS NOT NULL
     AND pdf_key IS NULL;` must be 0 (else back those PDFs up to R2 first).
  2. Remove the `pdf_data` fallback branch in the file route, then drop the column.

## Production deployment — Vercel + Supabase (not set up yet)
- **Dev** now runs on **Supabase Postgres** (pooled `DATABASE_URL` + `DIRECT_URL`),
  Upstash Redis, and Cloudflare R2. No Vercel project is linked yet (no `.vercel/`),
  and prod should use its **own** Supabase project — not the dev DB. The production
  domain **`scienium.app`** is registered (Cloudflare DNS).
- **To go live (see SETUP.md §8 + [`SECURITY.md`](SECURITY.md) §1.1 launch blockers and
  §6.2 "Email, domain, DNS"):**
  - **Supabase** — create a **separate production project**; set `DATABASE_URL`
    (pooled) + `DIRECT_URL` (direct, for `prisma migrate deploy`).
  - **Vercel** — import the GitHub repo (`blackyeti3405/scienium`), set root to
    `apps/web`, add all env vars (Clerk, `ANTHROPIC_API_KEY`, R2_*, `DATABASE_URL`,
    `DIRECT_URL`, `VIEW_FINGERPRINT_SALT`, Upstash, **`CRON_SECRET`**, optional
    `RESEND_API_KEY`). Add `scienium.app` as the domain and set
    `NEXT_PUBLIC_APP_URL=https://scienium.app`. Vercel auto-runs the `vercel.json` crons.
  - Run `prisma migrate deploy` against the prod DB (build step or one-off).
  - After deploy, run the `pdf_data` prod check above to unblock the storage cleanup.

## Branding — nova-lab → scienium (leftover from the original project name)
- The repo/source is already "scienium" (no `nova-lab` anywhere in code). The leftover
  "nova-lab" lives **only in external accounts**, tracked as a checklist in
  [`SECURITY.md`](SECURITY.md) §6.2:
  - **Clerk** application is named "Nova-lab" → shows "as Nova-lab" in auth emails. Rename
    it in the Clerk dashboard (Configure → Settings; also check Customization → Branding).
  - **R2 bucket** is named `nova-lab-assets` — internal/invisible to users, so renaming is
    optional cosmetic (R2 can't rename in place: new `scienium-assets` bucket + migrate +
    update `R2_BUCKET_NAME`).

## Science Fair dataset (Feature 3 follow-up)
- `content/fairs/dataset.ts` is a **provisional starter** modeled on the Society for
  Science affiliated-fair directory — coordinates are approximations and **all dates
  are estimated**. Replace/extend it with the full affiliated-fair list (regional +
  state). `ensureFairsSeeded()` upserts by `key`, so growing the array and re-running
  is safe.
- Deadline accuracy: the AI "Sync from site" step (`/api/fairs/[id]/sync-deadlines`)
  is best-effort per fair and marks events `estimated`. Confirm each fair's dates and
  promote verified ones to `confirmed`.
- Optional precision upgrade: ZIP→state matching uses a state centroid for distance.
  Layer in true ZIP-centroid coordinates for finer "nearest regional fair" ordering.

## Showcase teacher moderation — SHIPPED (kept here as a map, not a TODO)
- Teacher moderation is implemented end-to-end: publishing at `public`
  privacy sets `moderationStatus = 'pending_review'` (`app/api/showcase/route.ts`);
  `link_only` still auto-approves so sharing is safe out of the box. Teachers review
  the queue at `app/(teacher)/teacher/showcase-moderation` (`ShowcaseModerationQueue`
  + `DecisionControls`) backed by `app/api/teacher/showcase-moderation` (GET pending /
  POST approve|reject, class-scoped), which flips the status and notifies the team.
  `canViewShowcase` and the gallery query both require `approved`, so a pending or
  rejected showcase never appears publicly.
- Remaining polish (optional): a resubmit-after-rejection nudge and teacher-side
  bulk actions. The core gate is done.

## Dependency hygiene
- `recharts` is now **in use** (Data Terminal charts).
- `video.js` remains reserved for uploaded Showcase video playback.
