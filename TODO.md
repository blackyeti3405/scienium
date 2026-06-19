# NOVA Lab — TODO / deferred work

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
- Drop the legacy `papers.pdf_data` column once R2 serving is confirmed in production.
  All rows are backfilled into R2 and the file route prefers `pdf_key`; `pdf_data` is
  only a transitional fallback.

## Per-student proficiency cleanup (Feature 1 follow-up)
- Drop the now-unused team-global `papers.proficiency_demonstrated` and
  `papers.kp_awarded` columns once `paper_proficiency` is confirmed. They were a
  backfill source and are no longer read or written (source of truth is
  `PaperProficiency`).

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

## Dependency hygiene
- `recharts`, `video.js`, `react-hook-form`, `@tanstack/react-query` are currently
  unused but earmarked for planned stub features (charts, showcase video, forms,
  data fetching). Remove if those plans change.
