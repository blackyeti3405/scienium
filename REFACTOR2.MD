# scienium — remaining refactor and pilot-readiness work

> Current as of 2026-07-29.
>
> This is a backlog, not an audit history. Completed work, changelog entries, accepted product
> choices, and optional or deliberately declined reorganizations have been removed. An item
> belongs here only while it has a verified defect, an incomplete production path, or a
> concrete pilot sign-off still outstanding.
>
> Wave 1 (v0.76.1) closed P0-R3, P1-1, P1-2, the code half of P1-3, and P2-4. Wave 2
> (v0.76.3) closed P1-5 and P1-6. See `docs/CHANGELOG.md`. Owner remainders (E2E secret,
> branch protection, Resend webhook config) live in the owner gates table.

## P1 — correctness, cost, and release integrity

### P1-4 — Finish account export, erasure, and retention operations

The operation mechanism exists, but production policy and end-to-end proof are incomplete.
(The P1-2 claim-ownership precondition for treating the workflow as durable was closed in
v0.76.1.)

Required:

- Approve model-by-model retention windows and legal-hold rules with qualified FERPA/COPPA
  input.
- Record approval with a real actor identity.
- Replace the user tombstone compromise with the approved row-level identity deletion policy.
- Build or explicitly decline a team/class teardown command; current foreign-key restrictions
  mean there is no complete teardown path to test.
- Rehearse export and erasure on production-like data, including Clerk identity, PostgreSQL
  rows, R2 objects, notifications, AI history, and failure recovery.
- Produce a durable completion record that identifies any external cleanup still pending.

Done when an operator can request, resume, inspect, and prove an export or erasure without
manual database surgery.

## P2 — hardening and product-quality work

### P2-1 — Finish the outbound HTTP boundary

Most provider traffic uses the shared policy, but raw or incomplete adapters remain:

- `apps/web/app/api/discovery/search/route.ts`
- `apps/web/app/api/discovery/youtube/resolve/route.ts`
- `apps/web/lib/fairs/zip.ts`

The discovery routes read provider JSON without the shared byte/content-type/schema boundary.
The ZIP adapter remains outside redirect revalidation. The shared gateway's
resolve-then-connect sequence also retains a documented DNS-rebinding window.

Required:

- Route the discovery adapters through the shared gateway and capped readers.
- Runtime-validate provider output before domain mapping.
- Bring the ZIP adapter under redirect policy without making unit tests depend on live DNS.
- Either pin the vetted IP through connection or document and accept the DNS-rebinding risk for
  the pilot.
- Add adapter-level tests for oversized bodies, wrong content types, redirect-to-private-host,
  malformed JSON, deadline exhaustion, and retry-body cleanup.

### P2-2 — Finish client save and upload barriers

Remaining verified async-state gaps:

- Attachment upload completion can re-add a URL the user removed while the upload was in
  flight.
- A form can unmount while an upload is in progress without a cancel/commit barrier.
- Research streaming can accept a truncated EOF as a completed result and can displace the last
  known-good result.

Required:

- Give uploads mutation identities and cancel or ignore completions that no longer own the
  attachment slot.
- Block or explicitly cancel unmount/save while a consequential upload is unsettled.
- Require an explicit successful terminal stream event before replacing the last good research
  result.
- Test removal-during-upload, unmount-during-upload, disconnect, truncated EOF, retry, and
  stale completion.

### P2-3 — Close remaining showcase render-boundary gaps

`apps/web/app/(public)/showcase/[slug]/page.tsx` repeats showcase/viewer loading between
metadata and page rendering, and `ResourceLink` does not revalidate stored URLs at the render
boundary.

Required:

- Cache the request-scoped showcase and viewer loads so metadata and the page share them.
- Permit only canonical `http`/`https` links at render time, even though current write paths
  validate them.
- Keep embeds pinned to the named provider hosts and add regression tests for unsafe legacy
  rows.

### P2-5 — Complete phone and browser accessibility coverage

Required:

- Design and test the Discovery workspace at phone widths; the resizable desktop panels are
  keyboard/touch operable but the full narrow layout remains unresolved.
- Run the authenticated critical path in Firefox and WebKit. (A bounded smoke-spec
  `firefox-compat`/`webkit-compat` lane landed in v0.76.1; the full critical path is still
  open.)
- Add authenticated teacher accessibility coverage for navigation wrapping, reports, chart
  alternatives, dialogs, and tables.
- Validate zoom/reflow, reduced motion, keyboard-only use, and representative classroom
  Chromebook performance.

### P2-6 — Run deployment and historical-data preflights

Required before the pilot deployment:

- Run every uniqueness/dedupe preflight against a production-sized copy and count/quarantine
  actual historical conflicts.
- Check for teams already above the 200-experiment cap and surface overflow instead of silently
  hiding it.
- Verify migration drift, the application database role, connection pooling,
  statement/lock timeouts, backups, point-in-time recovery, and a real restore.
  (Note: `prisma migrate diff` currently reports pre-existing drift on
  `notifications_team_id_fkey` — reconcile it here.)
- Load-test synchronized classroom login, uploads, provider calls, crons, and worker drains
  against the intended database connection envelope.
- Exercise provider, Upstash, PostgreSQL, R2, and email outages and record recovery time.

### P2-7 — Finish rate-limit deployment policy

Paid tiers fail closed when the shared store fails, but the deployment still lacks a single
documented client-IP source and a circuit breaker for a failing limiter store.

Required:

- Select and enforce the one client-IP header guaranteed by the production edge.
- Reject or safely degrade ambiguous/untrusted forwarding chains.
- Add a bounded circuit breaker and recovery probe around the shared store.
- Pin the behavior for paid, upload, read, and ordinary mutation tiers with tests and operator
  metrics.

## Owner and external pilot gates

These items cannot be closed by code alone.

| Gate | Required outcome |
| --- | --- |
| CI E2E gate | Secret added and workflow proven green 2026-07-30 (run 30502626845: full 354 passed, compat 4/4 incl. WebKit). Remaining: require the `smoke` and `compat` checks in branch protection for `main` (Settings → Branches). |
| ISEF/forms guidance | A qualified teacher/SRC reviewer signs the active edition digest and expiry; approve season-specific AI-use disclosure text and any authored per-fair requirements. |
| Fair data | Assign annual refresh ownership, retain source timestamps/digests, alert on stale dates, and fill or explicitly omit missing deadline categories. |
| Curriculum | Restrict the pilot catalog to independently reviewed fields or complete domain-expert factual, safety, citation, licensing, and age-appropriateness review for every exposed field. |
| Google Docs privacy | Ship encrypted/revocable Google OAuth and Docs API access, or explicitly accept public-link documents and update product promises accordingly. |
| Identity | Verify Clerk production session, shared-device, redirect, verified-email, domain/organization, and webhook behavior. |
| Storage/CDN | Verify R2 privacy, CORS, lifecycle, object versioning, signed/public caching, deletion reconciliation, egress alarms, and the accepted malware/PDF-scanning posture. Includes the one-time Pyodide → R2 upload (`scripts/upload-pyodide-to-r2.mjs`, SETUP §8.2 step 5) — confirmed absent 2026-07-29 by the E2E dispatch; until it runs, production Data Terminal Lab/Code lanes cannot load their runtime. |
| Providers and cost | Verify live quotas, timeout/error behavior, degraded modes, key revocation, billing alerts, daily ceilings, and global/team kill switches. Includes `RESEND_WEBHOOK_SECRET` provisioning + Resend webhook configuration for bounce/complaint suppression (v0.76.1). |
| Supply chain | Run secret and dependency/advisory scans, pin workflow actions, produce an SBOM, define package/license policy, and prove deployment rollback. |
| Privacy and abuse | Obtain FERPA/COPPA and school-policy approval; finalize consent, incident response, breach notification, moderation escalation, support identity verification, retention, and deletion drills. |
| Time and locale | Decide school/fair time-zone ownership, DST and date-only semantics, reminder cutoffs, international address behavior, and supported locales. |

## Closure requirements

An item may be removed from this file only when:

1. The failure has been reproduced or its invariant demonstrated against current code.
2. The fix owns the rule in one cohesive service or boundary.
3. Team/user scope and persisted state are enforced server-side.
4. Paid or externally visible work is claimed and idempotent where required.
5. A regression test fails when the protection is removed.
6. The repository gates pass in order:

   1. `pnpm --filter @scienium/shared-types build`
   2. `pnpm --filter web check:integrity`
   3. `pnpm --filter web typecheck`
   4. `pnpm --filter web lint`
   5. `pnpm --filter web build`
   6. `pnpm --filter web test:e2e`

7. Any production-only or owner-only sign-off is recorded with its real evidence.

Completed work should be documented in `docs/CHANGELOG.md`, not retained here.
