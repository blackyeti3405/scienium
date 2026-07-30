# scienium — remaining refactor and pilot-readiness work

> Current as of 2026-07-29.
>
> This is a backlog, not an audit history. Completed work, changelog entries, accepted product
> choices, and optional or deliberately declined reorganizations have been removed. An item
> belongs here only while it has a verified defect, an incomplete production path, or a
> concrete pilot sign-off still outstanding.
>
> Wave 1 (v0.76.1) closed P0-R3, P1-1, P1-2, the code half of P1-3, and P2-4. Wave 2
> (v0.76.3) closed P1-5 and P1-6. v0.76.4 made the GitHub E2E gate green. Wave 3 (v0.76.5)
> closed P2-1, P2-2, and P2-3. See `docs/CHANGELOG.md`. Owner remainders (branch
> protection, Resend webhook config, Pyodide→R2 upload) live in the owner gates table.

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
