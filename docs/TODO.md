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
