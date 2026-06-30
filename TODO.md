# scienium — TODO / deferred work

Tracked items intentionally deferred during development. Remove an entry once done.

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
- **To go live (see SETUP.md §8 + the SECURITY.md §5 "Domain, email & branding" block):**
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
  "nova-lab" lives **only in external accounts**, tracked as a checklist in SECURITY.md §5:
  - **Clerk** application is named "Nova-lab" → shows "as Nova-lab" in auth emails. Rename
    it in the Clerk dashboard (Configure → Settings; also check Customization → Branding).
  - **R2 bucket** is named `nova-lab-assets` — internal/invisible to users, so renaming is
    optional cosmetic (R2 can't rename in place: new `scienium-assets` bucket + migrate +
    update `R2_BUCKET_NAME`).

## Science Fair dataset (Feature 3 follow-up)
- `lib/fairs/dataset.ts` is a **provisional starter** modeled on the Society for
  Science affiliated-fair directory — coordinates are approximations and **all dates
  are estimated**. Replace/extend it with the full affiliated-fair list (regional +
  state). `ensureFairsSeeded()` upserts by `key`, so growing the array and re-running
  is safe.
- Deadline accuracy: the AI "Sync from site" step (`/api/fairs/[id]/sync-deadlines`)
  is best-effort per fair and marks events `estimated`. Confirm each fair's dates and
  promote verified ones to `confirmed`.
- Optional precision upgrade: ZIP→state matching uses a state centroid for distance.
  Layer in true ZIP-centroid coordinates for finer "nearest regional fair" ordering.

## Showcase teacher moderation (Showcase Wing follow-up)
- Showcases currently **auto-approve on publish** (`moderationStatus = 'approved'`),
  with `link_only` the default privacy so sharing is safe out of the box. The
  `ModerationStatus` enum (`draft|pending_review|approved|rejected`) and the
  `showcases.moderation_status` column are retained for a future teacher gate.
- **Needed for a stricter rollout:** when privacy is `public`/`school_only`, publish
  should set `pending_review` and a teacher approves in the teacher area
  (`app/(teacher)/validations`) before the showcase appears in the gallery / is
  publicly viewable. `canViewShowcase` already requires `approved`, and the gallery
  query already filters on it — only the publish transition + a teacher UI are missing.

## Dependency hygiene
- `recharts` is now **in use** (Data Terminal charts).
- `video.js`, `react-hook-form`, `@tanstack/react-query` are still unused but
  earmarked for planned stub features (showcase video, forms, data fetching).
  Remove if those plans change.
