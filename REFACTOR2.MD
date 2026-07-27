# scienium — Architecture & Production-Readiness Plan

_Originally an adversarial architecture audit of the 2026-07-15 working tree. Pruned
2026-07-19, re-audited after v0.29.4, and **audited again on 2026-07-23 through a complete
long-file census followed by a no-minimum-line-count production/testing census, seam
re-audit, and hostile counter-audit**. Section 0 and the current priority table are
authoritative. Older version close-outs remain as provenance, not as pilot sign-off._

> **Current status:** the repository is **not pilot-ready**. The earlier Track A work remains
> valuable, but the July 23 re-audit and fine-tooth counter-audit found three P0
> privacy/moderation/research-safety failures and many P1 tenancy, concurrency, cost,
> durability, research-integrity, content-lifecycle, and release-control failures. “Closed in v0.30.0” below
> means that historical finding closed; it does not override the current register.
> `docs/SECURITY.md` is authoritative for exploit mechanics and security sign-off.
>
> **Remediation in progress — see §0.11 for the running close-out.** As of **v0.35.0
> (2026-07-25)**: **all three P0 launch blockers are closed** (P0-R2, P0-R3, P0-R4), along with
> P1-R4, P1-R10, P1-S1, P1-S4, P1-S11, P1-S12, P2-S5, and the forms half of P1-R16. Closing the
> P0s is **not pilot sign-off**: the P1 program, the legal/minors/privacy approval, the restore
> drill, enforceable CI, and the measured capacity test in §0.10 all remain outstanding.

---

## 0. 2026-07-23 adversarial re-audit — authoritative current state

### 0.1 Audit scope and honesty boundary

This pass covered the entire tracked repository through inventory and automated source scans,
then manually traced the risk-bearing seams, **every authored code file over 300 lines**, and
every remaining production/testing file at 300 lines or fewer. The second census applied the
same correctness, redundancy, complexity, security, behavior-bypass, scale, and test-truth
questions as the first; it was not a lighter “small file” scan.

- **2,001 tracked files** were inventoried.
- **617 tracked `apps/web` TypeScript/TSX files** and all **98 API route files** were included
  in static scans for guards, paid work, writes, external calls, render sinks, logging, direct
  fetches, and suspicious identity fields.
- The normalized production/testing text census contains **739 files** under the application,
  packages, Prisma, workflows, scripts, tests, and relevant root configuration. The first
  census had already dispositioned the over-300-line and generated-long members. The extension
  manually reviewed/classified the remaining **648 files at 300 lines or fewer**, with no size
  threshold inside that set. Its unique category counts and findings are in §0.9.
- Authored runtime TypeScript/TSX/CSS/Prisma outside generated Codex wrappers contains roughly
  **93,000 lines**. The long-file census found **147 code files over 300 lines**:
  **44 authored runtime/build files**, **25 tests/harnesses**, **73 art-source generators**,
  **2 other long tools**, and **3 generated/lock/legacy artifacts**. Every one was classified.
  Every one of the 44 runtime/build files received a manual responsibility and correctness
  disposition; all 25 long tests were read for false-green behavior and redundancy. The 73
  development-only art generators were classified and inspected as one family solely because
  this audit was asked to account for every file over 300 lines. They are not production
  runtime, security, or pilot-remediation scope. The complete disposition is in §0.7.
- Prisma models and relations, migrations, CI workflows, middleware/public routes, package
  scripts, runbooks, architecture decisions, and current audit documents were reviewed.
- Generated curriculum JSON/wrappers were treated as generated artifacts and checked through
  their schema/checksum/test pipeline rather than pretending a manual prose review of every
  generated datum is a source-code audit.
- The current working tree also contains an untracked Environmental / Earth Science delivery:
  a 44,391-line generated JSON file, a 12-line generated wrapper, and a 37-line pipeline
  review. Its registry/checksum/shape/build integration was exercised by the passing gates.
  The 275 lessons were **not** independently fact-checked in this repository audit; the
  pipeline report is provenance, not qualified scientific/safety sign-off, particularly while
  P1-R15's false-clean authoring path remains open.
- Binary art, fonts, screenshots, vendored/generated output, and ignored build artifacts were
  inventoried but not semantically code-reviewed. Art generators were classified as optional
  development tooling; production-consumed manifests were reviewed separately. Visual
  correctness of committed images still needs image-based QA.

This is the defensible meaning of “probe every file”: every production/testing text file in
the census was read or manually classified, every tracked file was inventoried, and the
complete authored text surface was scanned; security-critical and architecture-critical
paths were traced across their callers, schema, tests, and failure states. It would still be
false to claim that a human-style line-by-line reading of every binary, generated curriculum
datum, and historical planning file occurred.

The audit used five passes:

1. **Inventory and static pass.** Map every route, principal, database relation, paid call,
   provider boundary, file sink, client fetch, job, and large/duplicate file family.
2. **Long-file manual pass.** Read and disposition every over-300-line runtime/build file and
   test harness; classify the development-only generator family separately.
3. **No-threshold manual pass.** Read/classify every remaining production/testing source,
   test, migration, workflow, configuration, and production data adapter.
4. **Abuse and seam re-audit.** Ignore the intended UI flow; call endpoints directly, replay and
   race commands, substitute real foreign IDs, interrupt external work between state changes,
   race client requests, cross file-size boundaries, and assume providers, students, headers,
   model output, time, and network order are hostile.
5. **Counter-audit.** Try to disprove every finding and every “DONE” claim using code, tests,
   schema constraints, migration history, CI conditions, and scale math. This pass found
   several tests and prior statements that conveyed more confidence than they earned.

### 0.2 Ten audit lenses

| # | Lens | Adversarial question | Current verdict |
| --- | --- | --- | --- |
| 1 | Identity and provisioning | Can a new or stale identity mint a stronger role? | Open teacher self-registration is an **accepted product choice**, not a launch blocker; Clerk production posture and user lifecycle remain unverified. |
| 2 | Authorization and tenancy | Can a caller cross team/class/school boundaries or invoke a capability the UI hides? | Most route reads are scoped, but **P0 school/showcase boundaries, P1 destructive-action policy, and a cross-team discovery-parent integrity path fail.** |
| 3 | Input, rendering, and injection | Can input reach SQL, HTML, Markdown, URLs, CSV, prompts, headers, or logs unsafely? | Strict Zod and Prisma are strong; a substring-only Google Docs check creates a trusted-link phishing sink, a raw discovery title is logged, model URLs/CSP remain broad, and JSON is materialized before a repo-owned byte cap. |
| 4 | Network, provider, and storage boundaries | Can redirects/providers reach internal hosts, return unbounded bodies, or leak stored bytes? | **Open:** redirect SSRF, provider-supplied URL fetch, response-size caps, unbounded `Retry-After`, unfenced leases, and deletion lifecycle gaps. |
| 5 | Concurrency and state machines | What happens under double-clicks, retries, overlap, disconnects, and stale responses? | **P1 fail:** invite redemption, class decisions, paper processing/explanations, quiz grading, AI budgets, cell-save/check ordering, asset deletion, and email overlap are not all crash/race safe; multiple client views also accept stale responses. |
| 6 | Cost and resource abuse | Can one class, many accounts, a limiter outage, malformed model output, or anonymous egress create an uncontrolled bill/reward? | Paid-tier configuration fails closed, but runtime limiter failure fails open; paid work lacks a uniform claim/budget; one malformed quiz-grade response can mint proficiency/KP. |
| 7 | Privacy, minors, safety, and lifecycle | Can student data be over-shared, retained, logged, orphaned, phished, or guided into unsafe research? | **P0 fail:** self-entered affiliation, mutable moderation, and incorrect ISEF safety-form guidance; deletion/export/storage reconciliation remain untested; a raw student-selected title still reaches logs. |
| 8 | Scale and performance | What breaks under a classroom burst, district roster, backlog, or serverless connection pressure? | Pilot-sized paths are plausible, but count-then-create caps race, some “bounded” lists silently hide persisted rows, cron/teacher/provider bursts have no measured envelope, and `connection_limit=1` is unproven. |
| 9 | Resilience, operations, and supply chain | Do recovery, alerting, migrations, CI, secrets, dependency, and deployment controls fail closed? | **Not ready:** the configured E2E workflow cannot reliably reach migration/seed, real-Postgres tests self-skip, an asserted-safe unique migration lacks dedupe, branch protection/restore/scanning remain absent, and failure traces are not uploaded. |
| 10 | Maintainability and test truthfulness | Is each rule owned once, are files cohesive, and would a test fail on the actual regression? | Good small pure modules exist, but short files hide branch-heavy workflows; async client state and security sweeps are duplicated/heuristic; several tests explicitly tolerate or falsely prove the behavior named in their titles. |

No repository can be secure against “every type of attack.” Security is a maintained risk
system, not a boolean. This repository is currently unsafe for a real minors-facing pilot
because the school-privacy and showcase-moderation P0 paths remain reachable and the shipped
ISEF paperwork guide identifies required safety forms incorrectly.

### 0.3 Launch blockers and high-priority findings

#### ACCEPTED-R1 — Teacher role is public self-service

`app/(onboarding)/onboarding/page.tsx` presents “I’m a teacher” to every new account.
`POST /api/onboarding/teacher` requires only a signed-in user, creates `User.role = teacher`,
and sets Clerk public metadata. The guard prevents a previously created student from upgrading,
but **a fresh attacker account is the expected success path**. `requireTeacher` then treats the
database role as authoritative and grants access to teacher surfaces.

**Product-owner acceptance, 2026-07-23:** open teacher registration is intentional for the
pilot and is not a required fix. A new teacher role does not itself reveal an existing class:
teacher reads are scoped to classes the caller created, and student/team data enters that
scope only after students choose that class. Social engineering, class-code sharing, and
students joining an impostor's class remain real residual risks, but they are accepted for
this launch.

Keep the database role authoritative, keep teacher queries class-scoped, and audit role/class
changes. A school-bound, single-use `TeacherProvisionGrant`, verified email-domain rule, or
administrator allowlist remains an **optional hardening control** if the pilot later becomes a
closed teacher cohort. It must not be presented elsewhere in this document as a launch gate.
However, an open teacher role is not evidence of school affiliation and cannot mint verified
`SchoolMembership` by itself; otherwise an impostor teacher could recreate P0-R2 by creating
and approving a class.

#### P0-R2 — `school_only` privacy trusts a self-asserted school name — **CLOSED (v0.34.0)**

`resolveSchool(name)` upserts any typed name. Student onboarding and `PATCH /api/settings`
let a student set `User.schoolId` from that text at any time. `resolveShowcaseViewer` and
`canViewShowcase` then treat that same `schoolId` as proof for `school_only` visibility.
An attacker can type the victim school’s exact existing name and read its school-only
showcases and streamed assets.

Required architecture:

- separate a display-only/self-reported `schoolName` from a **verified**
  `SchoolMembership`;
- derive verified membership only from independent school evidence: administrator approval,
  a controlled school/domain grant, or a class whose teacher's **school affiliation** (not
  merely teacher role) was independently verified;
- do not let a student mutate verified affiliation in settings;
- authorize `school_only` only through verified membership;
- until that migration is deployed and existing rows are backfilled safely, disable
  `school_only` or treat it as non-confidential;
- test the direct attack: an account that merely types a matching school must receive 404.

**Closed in v0.34.0 by withdrawal, not by migration.** `canViewShowcase` returns `false` for
`school_only` to every non-owner, the level is gone from `PRIVACY_OPTIONS` and from the
accepted `PATCH /api/showcase` values, and legacy rows degrade to team-only. The
verified-`SchoolMembership` model above is still the prerequisite for ever re-offering the
level; it is now optional product work rather than a launch blocker.
`test/showcase-public-asset.test.ts` pins the direct attack (same-school viewer → 404, no
bytes streamed).

#### P0-R3 — Showcase approval is bypassable and cannot inspect the submission — **CLOSED (v0.35.0)**

The publish route sends only `public` showcases to `pending_review`; `link_only`,
`school_only`, and `private` publications become `approved` automatically. More importantly,
an already approved public showcase can change its title/abstract or replace board, quad,
video, repository, and supplement assets without resetting moderation. The approval is a
mutable status flag, not an approval of a specific content revision.

The teacher queue does not compensate for this. Its moderation query selects only text/team
summary fields. Its “View submission” link uses the normal public page, whose pending-content
policy admits team members but not the reviewing teacher. A reviewer can therefore be asked
to approve a submission whose required board, quad, and video they cannot inspect, and the
student can replace those assets after approval.

Required architecture:

- add an immutable or monotonic showcase revision/content digest covering all text, URLs, and
  asset object versions;
- bind approval to the reviewed revision and atomically reset to `pending_review` whenever
  any covered field or asset changes;
- provide a teacher-authorized preview that renders/streams the exact pending revision,
  including every required asset;
- require review for every mode reachable by anyone outside the author team
  (`public`, `school_only`, and bearer-link sharing), or explicitly accept each narrower mode;
- record reviewer, revision, decision, reason, and timestamps in an append-only moderation
  event; add report/unpublish/takedown controls;
- test edit-after-approval, replace-after-approval, link-only publication, rejected resubmit,
  and foreign-teacher preview paths with real authorization behavior.

**Closed in v0.35.0.** `Showcase.contentDigest` covers every field and asset an approval
applies to; `approvedDigest` names the revision a teacher approved; `syncShowcaseRevision`
re-derives it on all four write paths and atomically resets an approved showcase to
`pending_review` with a `revision_invalidated` event when the two diverge. Teacher preview is
granted through `ShowcaseViewer.moderatorTeamIds` in the single `canViewShowcase` predicate, so
the public page **and** the asset-stream route both admit the reviewing teacher (scoped to
teams they teach). Decisions are a compare-and-set on the echoed digest — a mid-review edit
yields 409. `ShowcaseModerationEvent` is the append-only history. `requiresReview()` gates
`public` and documents the explicit acceptance of `link_only`/`private`. The migration fails
closed: previously approved public showcases return to review because no evidence exists of
which revision was seen. **Still open:** report/takedown controls, and the P1-R7 share token
that would make the `link_only` acceptance genuinely "unlisted".

#### P0-R4 — The ISEF safety-forms guide maps form numbers to the wrong documents — **CLOSED (v0.34.0)**

`lib/fairs/forms.ts` is not merely one season behind. Its base catalog and detailed guide
identify Form 1 as the Student Checklist, Form 1A as adult-sponsor approval, Form 1B as an
off-campus-only form, and Form 1C as the pre-approval research plan. The official 2026
materials instead identify:

- Form 1 as **Checklist for Adult Sponsor / Safety Assessment**;
- Form 1A as **Student Checklist / Research Plan**;
- Form 1B as the **Approval Form required for every project**;
- Form 1C as post-research **Regulated Research Institution / Industrial Setting**
  documentation, not the pre-approval research plan; and
- Form 2 as the **Qualified Scientist** form.

The published 2027 edition now adds/renumbers Forms 2A, 2B, and 2C as **Student Support
Disclosure**, **Qualified Scientist**, and **Regulated Research Institution** respectively.
The 2026 overview says Forms 1C, 5B, 7, and the abstract are completed after research. The
application says the opposite about Form 1C. `forms.test.ts` then makes this worse by asserting
exactly 12 entries and explicitly asserting that Form 1C is the Student Research Plan. Those
are internal-shape tests protecting false content.

This can send a student into research without the correct prior approvals, omit the new
student-support/AI disclosure form if the pilot uses the 2027 edition, misdescribe
human/animal forms, and cause safety review or competition disqualification. See the official
[2026 forms PDF](https://sspcdn.blob.core.windows.net/files/Documents/SEP/ISEF/2026/Forms/All.pdf),
[2026 forms overview](https://www.societyforscience.org/isef/overview-of-forms-and-dates/),
[2027 forms](https://www.societyforscience.org/isef/forms/), and
[2027 rules](https://www.societyforscience.org/isef/international-rules/rules-and-guidelines/).
The pilot must deliberately choose the applicable season, not mix 2026 labels with 2027 rules.
The current rules also state that generative AI may not write the research plan, abstract,
poster, or citations and require AI use to be acknowledged; the app has no season-bound
disclosure/help contract.

Required architecture:

- immediately remove or disable the current form-number guidance until a qualified
  teacher/SRC reviewer approves corrected content;
- model a versioned `FairRulesEdition` with effective season, source URLs/digests, reviewed
  timestamp, reviewer, and explicit active edition;
- derive form catalog, applicability, deadlines, AI-use disclosure, and display guidance from
  that edition rather than unversioned constants and count-based seeders;
- link to the official forms/rules and clearly state that the local fair may add requirements;
- replace self-consistency tests with a reviewed canonical fixture, expected form codes/names,
  edition-expiry alarm, source provenance, and a fail-closed “no active reviewed edition” path;
- have a qualified adult review every safety bullet. General software review cannot certify
  chemical, biological, animal, or human-participant advice.

**Closed in v0.34.0.** `lib/fairs/forms.ts` is now a versioned `ISEF_EDITION` (season 2027,
official forms/rules URLs, `sourcedAt` provenance, `reviewedBy`/`reviewedAt` sign-off fields)
carrying only the officially published codes and titles — 1C and Form 2 retired, 2A/2B/2C
added. Applicability and timing **fail closed**: `appliesTo` is `null` and
`isEditionReviewed()` is `false` until a qualified reviewer signs the edition off, and the
checklist renders an official-rules pointer in the meantime. The 170-line
`ISEF_FORM_GUIDES` prose was **deleted rather than rewritten** — re-authoring unreviewed
safety copy is the same defect. `forms.test.ts` no longer asserts the wrong mapping.
`ensureFormsSeeded` now keys on code coverage, and the route serves the authored edition, so
a database seeded under the wrong catalog stops serving it. **Still owed before the pilot:**
the qualified teacher/SRC review that sets `reviewedBy` and restores applicability guidance,
plus the season-bound AI-use disclosure contract.

#### P1-R1 — Destructive confirmations are client assertions, not capabilities — **CLOSED (v0.38.0); capability matrix ACCEPTED as-is (2026-07-26)**

`POST /api/discovery/topic` accepts `confirmWipe` and arbitrary same-team
`confirmRemoveIds`. A direct caller can skip both server-proposed phases and delete any ready
paper IDs they know. The test named “two-phase topic removal” pins this bypass rather than
preventing it. `DELETE /api/discovery/tree` similarly wipes shared work for any member without
a server-owned confirmation or lead capability.

Use a short-lived, one-time `DestructiveProposal` binding actor, team, command, old/new topic,
exact IDs, resource versions, and expiry. Consume it transactionally. Prefer making a topic
change mark papers out-of-scope and keeping deletion explicit. Define a member/lead/teacher/
admin capability matrix and enforce it in a shared policy module; UI visibility is never
authorization.

**Closed in v0.38.0 for the client-assertion bypass.** `DestructiveProposal` binds actor, team,
command, exact target ids (SHA-256, order-insensitive, JSON-framed), old/new topic, and a
10-minute expiry; consumption is a single-use CAS on `consumedAt`. Topic removal and the
discovery tree reset both route through it, and the tree reset is now two-phase where it
previously had no confirmation at all. `test/topic-removal.test.ts` no longer pins the bypass.
**Capability matrix — DECIDED, not open (owner, 2026-07-26): ANY MEMBER may destroy shared team
work, and the current behaviour stands.** The reviewed alternatives were lead-only, lead-plus-
teacher-override, and making a topic change mark papers out-of-scope rather than delete them.
The owner chose to keep today's behaviour: in a lab of three peers a permission gate adds
friction without a corresponding safety gain, and the destructive paths are already behind a
server-issued, single-use, target-bound proposal (v0.38.0) rather than a client assertion.

This is an ACCEPTED RISK, in the same class as `ACCEPTED-R1` (open teacher registration): one
student can still delete 25 papers their team collected, deliberately, through two confirmed
steps. What was a gap is now a documented choice. If it is ever revisited, the two levers are a
lead check on `DELETE /api/discovery/tree` and the reversibility model — marking papers
out-of-scope instead of deleting them removes far more blast radius than any permission check.

#### P1-R2 — Paid phase advancement has a race and stale-write path — **CLOSED (v0.41.0)**

Literature advancement reads the current phase, checks readiness, performs Anthropic work,
then runs an unconditional `team.update({ id })`. Two concurrent requests can pay twice and
write twice. A request whose model call returns after another transition can overwrite a newer
phase with `research_planning`. The later self-advance transitions correctly use conditional
`updateMany`, highlighting the inconsistency.

Create a durable operation claim/idempotency key, perform a compare-and-set on
`(teamId, phase = literature_review)`, and store/reuse the classification result. Never hold a
database transaction open across the provider call.

**Closed in v0.41.0.** `Team.advanceClaimedAt` elects one payer before the Haiku call (2-minute
TTL, released on failure), predicated on the phase so it doubles as the readiness check; the
transition is a CAS on `phase: 'literature_review'`, and a team that moved on is reported as-is
rather than dragged back. No transaction is held across the provider call. **Still owed:**
storing/reusing the classification result for a retry — that is the P1-R3 operation ledger; a
loser currently re-reads the committed `labType` instead of replaying its own result.

#### P1-R3 — Daily AI limits and duplicate submissions are not atomic

Idea Check reads `ideaChecksUsedToday`, performs a multi-search paid stream, and creates the
ledger row only after success. Team members can race under the 12/minute per-user tier and all
observe fewer than three daily checks. Quiz generation, plan review cache misses, phase
classification, and other paid commands also lack a uniform durable idempotency record.

Add an `AiOperation`/budget reservation with `(team, operation, day/period, slot)` uniqueness,
an input hash and caller idempotency key, `pending/running/succeeded/failed` state, leases,
attempts, prompt/model version, token/cost fields, and a result reference. Reserve before the
provider call, reconcile after disconnect, and expose a global/team kill switch.

#### P1-R4 — Limiter-store failure removes the paid ceiling — **CLOSED (v0.34.0), header policy open**

Production refuses paid tiers when no shared store is configured, which is good. Once Upstash
is configured, however, any network/timeout error returns `count = 1` for every tier.
HTTP-200 pipeline command errors or malformed response shapes also default to one because
element errors are not validated. Paid work therefore fails open during the exact outage that
should stop cost growth.

Make paid tiers fail closed on store failure; validate every pipeline element and numeric
shape; add a short circuit breaker and a distinct degraded response. Read/mutation tiers may
use a separately documented degraded policy. Configure one deployment-guaranteed client-IP
header instead of accepting a chain of headers whose trust depends on undocumented edge
behavior.

**Closed in v0.34.0 for the fail-open path.** `UpstashStore.incr` validates the pipeline
shape, every element's `error`, and the numeric `INCR` result, and throws
`RateLimitStoreError` instead of fabricating `count = 1`. `enforceRateLimit` owns the policy:
`ai`/`upload` fail closed (503 + `Retry-After`), read/mutation tiers fail open and log
`rate_limit.store_error`. **Still open:** the circuit breaker and the single
deployment-guaranteed client-IP header.

#### P1-R5 — Background work is durable only in parts — **CLOSED (v0.46.0); activity-migration remainder tracked**

- Notifications materialize every checked team ID for the day, restart roster scanning from
  the beginning, and mark completion after processing. Overlapping runs can process/email the
  same team; notification row uniqueness prevents duplicate rows but not the pre-insert
  “fresh” email race.
- Paper cron launches up to 30 Anthropic workflows at once inside a 60-second function.
  Per-job claim logic prevents duplicate ownership, but the burst is hostile to provider
  limits, cost, latency, and a database URL configured with `connection_limit=1`.
- 28 of 29 `logActivity` call sites swallow failures with `.catch(console.error)`; gameplay and
  teacher-visible history have no durability contract.

Use PostgreSQL claims with leases/status/attempts and bounded concurrency. Notifications need
claim-before-work plus an email outbox with a unique event key. Activity events that affect
teacher history or progression belong in a transactional outbox; genuinely optional telemetry
must use an explicitly named best-effort helper.

#### P1-R6 — Release controls can report green without running

The E2E workflow detects `E2E_ENV_FILE`; when absent, every meaningful step is skipped and the
job succeeds. That is useful for fork PRs but fail-open for same-repository PRs, nightly runs,
and manual release runs. Only Chromium is installed and the PR smoke lane runs one F1 file.
Branch protection is documented as inactive.

Make missing credentials fail same-repository and release workflows, explicitly skip only
untrusted forks, require the check in active branch protection, and add Firefox/WebKit to a
bounded compatibility lane. Keep E2E credentials in a least-privilege test tenant and review
failure artifacts for student data.

#### P1-R7 — `link_only` uses a 24-bit bearer suffix — **CLOSED (v0.35.1)**

`makeSlug(title)` exposes a title-derived prefix plus only six hexadecimal characters from a
UUID. That is 24 bits of bearer entropy for anonymous `link_only` access, not a defensible
secret for student work. Request limiting slows enumeration but does not turn a small,
predictable namespace into a long-lived capability.

Use a separate public slug and at least a 128-bit random share token. Store only a digest where
practical, support rotate/revoke and expiry, throttle unknown-token misses at the edge, and
alert on enumeration. Moderation approval must still bind the shared revision.

**Closed in v0.35.1.** `Showcase.shareToken` is a unique 128-bit base64url value; `slug` is
documented as the public identifier it always was. `canViewShowcase` takes
`via: 'slug' | 'share_token'` (defaulting to the safe `'slug'`), and `link_only` opens only for
the token — at the page **and** at the asset-stream route, which now takes `?t=`. Rotation via
`PUT /api/showcase { rotateShareToken: true }` is the revocation mechanism and is surfaced in
the editor. Moderation revision binding from P0-R3 is unaffected. Existing `link_only` URLs
break by design. **Explicitly not done:** digest-only storage (the team must read their own
link back), time-based expiry (rotation covers revocation; a link dying mid-fair is a real
usability cost), and edge throttling of unknown tokens (128 bits makes enumeration infeasible,
not merely slow). **Still open:** enumeration alerting.

#### P1-R8 — Team and class authority has no revocation lifecycle — **CLOSED (teams v0.48.0, classes v0.52.0)**

`TeamMember` permits the same user in multiple teams. Direct team join adds another membership
and switches `activeTeamId`; there is no complete switch, leave, remove, lead-transfer, or
disband command. A student's newly approved class overwrites `User.classId`, while older
approved join-request history remains and there is no complete transfer/withdraw/revoke/archive
workflow. Because teacher team visibility is membership-derived, stale membership is stale
authorization, not merely untidy data.

Choose and enforce one-team or multi-team semantics. Model class/team membership as explicit
state with actor, reason, timestamps, and revocation. Protect the final lead, update active
selection transactionally, retire invitations, recompute teacher scope, and pin cross-class/
cross-team lifecycle matrices.

**Class half closed in v0.52.0.** Three commands that END a membership
(`withdrawClassRequest`, `leaveClass`, `removeFromClass`), each clearing the derived
authorization in the same transaction as the state change; `ClassMembershipEvent` as the
append-only log; `withdrawn`/`revoked` so the status stops misstating what happened. **Still
owed:** teacher-initiated lead reassignment (unchanged from the team half — a deliberately
separate capability), and a notification to the student when a teacher removes them.

#### P1-R9 — Account deletion, export, and retention are procedures, not system behavior — **CLOSED for the mechanism (v0.49.0); the numbers and the drill are open**

The deletion/export runbook explicitly describes a manual post-pilot process. No durable
runtime workflow reconciles Clerk identity, database rows, R2 objects, notification addresses,
and provider state. `ShowcaseView` fingerprints have no age-based cleanup, and activity,
notification, AI/chat, and teacher-history records lack one reviewed retention contract.

Add an authenticated request and idempotent operator workflow backed by a deletion/export
operation and outbox. Publish model-by-model retention/legal-hold rules, make cleanup survive
parent deletion, and rehearse both export and deletion against production-like data.

**Closed in v0.49.0 for everything that is an engineering decision.** `DataRequest` +
`DataRequestStep` are the operation and outbox; one inventory drives both export and erasure;
`retention_policies` is the per-model table, shipping empty with one endorsed default. **Still
open:** the retention numbers themselves (qualified FERPA/COPPA input — `docs/TODO.md` →
"Retention windows"), the production-like drill the audit asked for, an approval surface with a
real actor id, and the row-level `users` delete the tombstone stands in for.

#### P1-R10 — The discovery tree accepts foreign parents and cyclic graphs — **CLOSED (v0.34.1)**

`POST /api/discovery/tree` accepts client-generated node IDs and arbitrary `parentId` values.
Neither the route nor `createTreeNodes` proves that a parent belongs to the caller's team, or
that the submitted/existing graph remains acyclic. The database self-relation references only
`DiscoveryNode.id`, not `(teamId, id)`, so PostgreSQL permits a team-A node to point to a
team-B parent. A single batch can also create a self-cycle or two-node cycle.

This is a direct behavior-path bypass: the UI normally emits a tree, but the endpoint accepts a
general graph. `hydrateTree.depthOf` walks parent pointers without a visited set, so a cycle can
loop until request timeout. The SVG layout recursively recomputes subtree width and is likewise
not cycle-safe. One malicious or corrupted write can therefore make a team's Discovery GET/UI
unavailable. The server and client subtree deletions also perform repeated full-array scans,
making skewed trees O(n²).

Validate the complete proposed graph before writing: every parent must be null, an existing
same-team node, or a node in the same batch; IDs must be unique; no self-edge or cycle is
allowed; depth and total size must be capped. Prefer a composite tenant FK where Prisma/Postgres
can express it, and retain visited/depth guards in hydration/layout as corruption containment.
Return an error on any failed node instead of logging broad exceptions and reporting `{ok:true}`.

**Closed in v0.34.1.** `assertValidTreeGraph` enforces all of the above before any write and
`TreeGraphError` maps to 400; the source/article branches now rethrow anything that is not a
`P2002`; `depthOf` carries a visited set. **Still open:** the composite `(teamId, id)` tenant
FK, the O(n²) subtree scans, and the cycle-unsafe SVG layout in `DiscoveryTree.tsx`.

#### P1-R11 — Quiz retries can pay twice and a late failure can overwrite a pass — **CLOSED (v0.37.0)**

Retry-question generation has a useful pre-call claim, but retry **grading** does not. Two
concurrent `submitRetry` calls both load the same failed session and both call Anthropic before
the advisory lock. The lock protects KP high-water math only after the money is spent. The
retry transaction then unconditionally updates the session and lacks the initial grade route's
`freshSession?.gradedAt` guard. A later low-scoring retry can set the session back to
`passed=false` after another retry passed, while `PaperProficiency.demonstrated` remains true.

The initial grade and retry route contain a large, near-exact persistence/reward clone; the
missing guard is evidence that the clone has already drifted. Introduce a retry-submission
operation/claim before grading, bind it to session version and normalized answer hash, reuse a
completed result, and perform a conditional state transition. Move all attempt/session/
proficiency/KP persistence behind one shared quiz repository/service with monotonic
`passed`/best-score semantics and real-Postgres race tests.

**Closed in v0.37.0.** `retryGradeClaimedAt` elects one grader before the paid call (A8's
pattern, 2-minute TTL, released on failure); the session write is monotonic on `score`/`passed`
from an in-lock re-read. **Answer-hash binding and result replay closed in v0.42.0** via `AiOperation` /
`runAiOperation`, keyed on the session plus the exact (order-insensitive) answers. **Still
owed:** consolidating the grade/retry persistence clone (SVC-1) and the real-Postgres race test
(P1-R14's lane).

#### P1-R12 — Asset deletion is retryable on exceptions, but not crash durable — **CLOSED (v0.39.0)**

`reclaimAbandonedAssets` changes a candidate from `orphaned`/`temporary` to terminal
`deleted`, then calls R2. A caught delete error restores the prior status, which handles an
ordinary rejection. A process death, function timeout, or machine loss after the database
update and before/inside the object delete leaves a live object with a terminal ledger row.
Future sweeps will never select it. Team cascade deletion also removes the ledger before any
object cleanup can be completed.

Use `deleting` plus lease/attempt timestamps, delete the object, then mark `deleted`; reclaim
stale leases and make object-not-found success. Deletion work must live in a tombstone/outbox
that survives domain/team deletion. Reconcile bucket inventory against the ledger and alert on
stale/terminal mismatches. Also catch malformed percent encoding in legacy attachment URLs:
`decodeURIComponent` currently turns a bad `%` sequence into a route-level 500.

**Closed in v0.39.0 for the crash-durability defect.** `deleting` + `deleteLeaseAt` +
`deleteAttempts`: claim, delete the object, then terminalize; a stale lease is re-selected.
The `decodeURIComponent` 500 is guarded. **Team-deletion survival closed in v0.39.1**:
`uploaded_assets.team_id` is now `ON DELETE RESTRICT`, so a future team-deletion command must
retire assets first instead of silently destroying the ledger. **Still open:** bucket-vs-ledger
reconciliation (comparing R2 inventory against the ledger) and stale/terminal alerting — the
DB-side half (`attached` rows with a dead owner) is done, the bucket-side half is not.

#### P1-R13 — “Check my synthesis” can grade stale cells — **CLOSED (v0.50.0)**

Cells save asynchronously on blur. Clicking the check button blurs the textarea and immediately
starts `checkMatrix`; there is no pending-write registry or flush barrier. The paid server check
can therefore read the previous database value, return/cache a verdict for stale work, and award
KP for content different from what the student sees.

Track dirty cells and in-flight writes, batch/await a flush before checking, and pass an
expected matrix version or input digest to the server. The server should atomically snapshot
the exact cells it grades and bind cache/result/KP to that snapshot. Disable the check while a
save failed; never treat local non-empty drafts as proof the server has checkable content.

**Closed in v0.50.0.** Saves are serialized, the check flushes and refuses to spend while anything
is unsaved, a server-issued `inputHash` is echoed back and 409s before any spend, and the commit
transaction re-hashes so a mid-call edit caches nothing and mints nothing. `runAiOperation` closes
the concurrent double-pay the replay cache never covered. **The `addColumn`/`renameColumn` draft-loss
item noted here as "still open" was itself closed in v0.51.0** ("finish P1-R13": `patchColumns` now
awaits the save chain and sends any still-dirty cells in the SAME PATCH as the column edit, so
`resetDraftsFrom` rebuilds drafts from a response that already reflects the unsaved text rather than
discarding it) — that fix landed one commit later and was never back-filled into this entry; verified
against the current code in v0.67.0 and corrected here rather than left stale.

#### P1-R14 — The “real PostgreSQL” invariant suite silently skips in normal CI

`test/pg/invariants.pg.test.ts` explicitly calls `describe.skipIf(!dbUp)`. The CI `Test` step
has no PostgreSQL service and no `DATABASE_URL`; the placeholder URL is introduced only for the
later build step. Consequently the only tests that claim to prove advisory locks, unique
claims, rollback, and true concurrency skip themselves while CI remains green. The 751-line
in-memory route-policy harness is valuable for authorization behavior but cannot replace these
database guarantees.

Create a required PostgreSQL job/service, apply migrations/schema, and make inability to reach
that database fail the job. Keep policy emulation and DB invariants visibly separate. Record
executed/skipped counts so a required suite cannot disappear inside an aggregate green test
command.

#### P1-R15 — Content authoring can return `allClean: true` after producing nothing — **CLOSED (v0.47.0)**

`.claude/codex-pipeline/author-field.workflow.mjs` filters failed/empty briefs out of `planned`.
If every requested brief fails or returns no units, `lanes`, `results`, `dirty`, `lost`, and
`contradictions` are all empty and the workflow returns `allClean: true`. A failed fixer agent
for MED/LOW-only findings is not checked, and the consistency reconciler's return is ignored
without a deterministic recheck. The merge script separately duplicates the canonical lesson
schema by hand and writes several outputs sequentially, so schema drift or interruption can
leave a half-updated repository.

Make requested-segment completeness a hard invariant; an empty brief is a failed segment, not
a warning. Check every agent result, validate all expected lesson files, rerun deterministic
schema/content checks after fixes, stage every merge output, and install atomically only after
all validation passes. Generate one schema representation from the canonical Zod/type source
instead of maintaining mirrors.

#### P1-R16 — Count-based catalog seeders suppress same-size corrections — **CLOSED (v0.34.0 forms, v0.44.0 fairs)**

Both `seedFairsBatched` and `ensureFormsSeeded` return early when the database row count is at
least the authored-array length. A renamed/replaced form, changed fair field, removed stale key,
or same-size annual dataset can therefore bypass all key/drift checks. The comments promise
fall-drift repair that the fast path prevents.

Version catalog datasets and store a digest. Compare exact key coverage and edition hash, run
targeted upserts for changed rows, and explicitly retire keys no longer in the active edition.
Do not overwrite operator-corrected event dates without provenance; separate sourced defaults
from local corrections.

### 0.4 P2 findings that still change the architecture

| Finding | Evidence and consequence | Correct direction |
| --- | --- | --- |
| Outbound request policy is incomplete | Google Docs follows redirects without revalidating host; OpenAlex supplies a URL that is fetched without a host allowlist; shared retry has no byte cap. | One outbound gateway: scheme/host allowlist, DNS/private-range policy, redirect revalidation, redirect/byte/content-type caps, timeout, retry, metrics. |
| Public asset egress is request-count-only | Anonymous stream uses the `read` tier and can deliver large PDFs/images; no byte or bandwidth budget. | Edge/CDN policy for approved public assets, egress accounting/caps, Range policy, and reliable unpublish invalidation. |
| Stored image originals retain metadata | `sharp().metadata()` identifies format but no decoded-pixel cap, re-encode, orientation normalization, or EXIF/GPS removal. | Decode with pixel limits, normalize/re-encode, strip metadata, then ledger/store only the derivative. |
| Storage cleanup loses its source of truth | `UploadedAsset.teamId` cascades on team deletion; topic change bypasses the ledger. | Make deletion work survive domain deletion, enqueue object retirement transactionally, reconcile R2 against the ledger, and alert/dead-letter repeated failures. |
| PDF inspection has acknowledged blind spots | Raw marker scan cannot inspect compressed object streams and there is no malware scanner or sanitized derivative. | Keep explicit accepted risk for pilot or move normalization/scanning to a locked worker before claiming stronger safety. |
| Model URLs bypass the shared render policy | `IdeaCheckView` renders model-produced `priorWork.url` and citations directly as `href`. | Validate/canonicalize `http/https` URLs server-side and again at the component boundary; add `nofollow`. Sweep every URL sink, not only `react-markdown`. |
| CSP contains broad escape hatches | Production allows inline script and broad HTTPS frame/image/media sources. | Move toward nonces/hashes and named provider/asset hosts; keep a regression test for the exact policy. |
| CSRF policy permits missing Origin | Cookie-authenticated mutations accept missing `Origin`; the host comparison prefers `x-forwarded-host`. A paid GET also mutates. | Use canonical configured origin plus `Sec-Fetch-Site`; reject missing Origin for browser-cookie writes; move retry preparation to POST with idempotency. |
| Completion high-waters are not uniformly monotonic | `complete-service.ts` computes a failed-attempt best score before its upsert; concurrent failures can let a later lower score overwrite a higher one. Re-passing also resets `completedAt`. | Use database `GREATEST`, preserve the first completion timestamp, and centralize monotonic progress writes. — **CLOSED (v0.68.0):** the failed-attempt write is now a `GREATEST`-gated `INSERT ... ON CONFLICT`, and the re-pass branch no longer touches `completed`/`completedAt` at all — see §0.7's `complete-service.ts` row and §0.11's v0.68.0 entry for the reproduction and fix. |
| Experiment chart can disagree with its table | Chart series map points by `(x, series)` and visually overwrite duplicate keys while the table preserves every measurement. | Define duplicate semantics: reject, aggregate with an explicit statistic, or render a true scatter/multiset view. Never silently discard observations. |
| Teacher overview can pair facts from different memberships | `student-overview.ts` chooses one active team but derives role/join date from the latest membership. It also launches roughly 18 queries for a detail load. | Resolve one selected membership object and derive all membership facts from it; lazy-load or consolidate independent sections and cap history. |
| Teacher/read paths are not district-bounded | Roster/reports load all students/proficiencies for up to 200 classes; overview loads growing team history. The 200-class guard silently truncates scope. | Paginate class/student/history queries, make overflow explicit, and measure query/response budgets. Never silently truncate an authorization scope. |
| Tenant ownership is under-modeled in the schema | Several child references use global IDs while authorization depends on team ownership. Synthesis paper IDs/cells have no Paper FK; fair parent/event links and some rubric/association IDs are scalar-only; `activeTeamId` can point to a non-member. | Add composite ownership constraints where feasible, normalize matrix-paper membership, add missing relations/uniques, and retain service-level scope checks. Remove legacy parallel models after migration. |
| The fair scraper is not a trustworthy release artifact | The 332-line scraper hard-codes 2026, ignores HTTP status/timeout/size, parses HTML by regex, marks output confirmed, has unused state, and requires shell redirection over the live dataset. | Parameterize edition, stage output, validate counts/keys/dates/URLs against the official source, diff for human approval, write atomically, and retain source timestamp/digest. |
| Database boundary is application-only | No RLS, statement timeout, lock timeout, or proven production load envelope. | Keep app scoping as primary; explicitly decide/implement RLS only with transaction-scoped tenant context and a non-owner role. Add timeouts, slow-query metrics, and load tests first. |
| Security telemetry is not an audit trail | Sentry exists, but no append-only events for provisioning, role/school changes, denials, destructive commands, or cron auth. | Add privacy-minimized append-only security events and alert thresholds; normalize provider errors instead of logging raw objects. |
| Supply-chain controls are absent | Actions use mutable tags; no secret scan, dependency bot, audit/SCA, SAST, SBOM, or provenance. Live advisory lookup could not run in this environment. | Pin actions to SHAs, add automated SCA/secret scanning, generate an SBOM, and make advisory status a CI artifact. |

### 0.5 Architecture change — strengthen the modular monolith

Do **not** split scienium into microservices before the pilot. That would multiply deployment,
identity, networking, tracing, and consistency risks without solving the current failures.
Build a small platform kernel inside the current Next.js/PostgreSQL application:

```text
HTTP route / server action
        │
        ▼
route envelope
  principal + capability + canonical-origin + Zod + request-id
        │
        ▼
feature command/query
  transaction + invariants + compare-and-set + idempotency
        │
        ├── PostgreSQL domain state
        ├── operation / budget ledger
        └── transactional outbox / durable job
                  │
                  ▼
        bounded workers and gateways
        LLM · email · storage · outbound HTTP
```

The new platform seams should be concrete, not a generic framework:

1. **Verified affiliation and explicit identity policy.** Verified school memberships are
   separate from display profile data. Open teacher registration is the accepted pilot policy;
   optional grants/allowlists can narrow it later without changing class-scoped authorization.
2. **Principals and capabilities.** Discriminated student/teacher/admin/system principals and
   `requireCapability(action, resource)` replace scattered “any member vs lead” assumptions.
3. **Route envelope.** Auth, trusted-origin validation, pre-parse request byte ceiling,
   strict params/query/body schemas, request ID, typed error mapping, latency/outcome/security
   events, and an explicit pure-read vs command contract.
4. **Durable command record.** Reusable claim/CAS/idempotency primitives for paid and
   destructive workflows, without holding transactions across network calls.
5. **LLM gateway.** One model/prompt registry, atomic budgets, operation ledger, token/cost
   accounting, timeouts, result reuse, kill switches, safe first-text extraction, and
   operation-specific runtime schemas with exact cardinality/ID-set checks. There are
   currently executable Anthropic call sites spread across routes/services rather than one
   authoritative output boundary.
6. **PostgreSQL outbox/jobs.** Leases, attempts, exponential backoff, dead-letter state,
   bounded concurrency, and backlog metrics. No external broker is needed at pilot scale.
7. **Storage service.** Reservation, attachment, retirement, team-deletion retention,
   derivative generation, reconciliation, and egress accounting under one state machine.
8. **Outbound HTTP gateway.** SSRF/redirect/size/content-type policy plus provider-specific
   adapters.
9. **Tenant-owned graph/data constraints.** Same-team composite references, acyclic graph
   validation, normalized matrix-paper ownership, and selected-membership invariants make
   corruption difficult even when a caller bypasses the intended behavior path.
10. **Versioned reviewed content.** Fair rules/forms/categories/rubrics and other safety
    guidance carry an edition, official-source digest, reviewer, expiry, and fail-closed active
    state. Shape tests are not factual approval.
11. **Feature-owned contracts and clients.** One runtime schema and one client per feature;
   no contract copies scattered through route, component, hook, and teacher view. Clients own
   abort/generation tokens, discriminated load states, entity-versioned mutations, and
   save/upload/stream completion barriers.
12. **Operational envelope.** Published capacity limits, SLOs, privacy-safe metrics, release
   gates, restore evidence, and incident/kill-switch procedures.
13. **Stack-aware interaction primitives.** One dialog/popover stack owns Escape, focus,
   scroll locking, labelling, and restoration; native controls and phone/keyboard/AT behavior
   are acceptance criteria rather than per-component conventions.

### 0.6 Scale forecast and required envelope

The code is likely adequate for a small, staggered classroom pilot after P0/P1 remediation.
It is not proven for synchronized class start, multiple schools, or district reporting.

| Stress | Present behavior | Failure mode | Pilot requirement |
| --- | --- | --- | --- |
| 30 students upload/process together | Cron can start 30 paper jobs concurrently; DB URL example uses one pooled connection. | Provider burst, pool queueing/timeouts, 60s function termination. | Worker concurrency 3–5, queue-depth/age metric, retry/dead-letter, measured drain time. |
| Several teammates run Idea Check | Daily count is read before spend and written after. | More than three paid checks/day; last result wins. | Atomic daily slots and operation idempotency. |
| Two phase-advance clicks | Both can classify and unconditional update. | Duplicate cost and stale phase rollback. | Claim + compare-and-set + result reuse. |
| Two quiz-retry submits | Both grade before the lock and both later write the same session. | Duplicate Anthropic cost; late failure can overwrite visible pass state. | Pre-call submission claim, session version CAS, monotonic pass/best score, result replay. |
| Two students redeem one invite | Both can read “unused” before the team lock and then join serially. | One-use code admits multiple members and its audit owner is overwritten. | Atomic invite consume predicate plus capacity in one transaction. |
| Old paper worker outlives a five-minute lease | A newer worker steals the timestamp-only claim; both terminalize by paper ID. | Duplicate spend; old failure can regress a ready paper or old success can overwrite newer work. | Fenced lease token/version, heartbeat, conditional terminal writes. |
| Several explanations/follow-ups arrive together | State/cap is read before paid work; lock/unique ownership comes too late or not at all. | Duplicate provider calls, cap overshoot, duplicate attempt numbers, lower late truth. | Input-hash operation claim and database-owned sequence/cap/monotonic state. |
| Model returns a partial quiz-grade array | Aggregate uses only returned model rows. | One high row can pass five questions and mint KP. | Exact runtime ID-set validation and canonical-question denominator. |
| Large or corrupted discovery graph | Server and SVG derive depth/subtree recursively or by repeated scans; cycles are accepted. | O(n²) work, infinite parent walk, stack overflow, team feature denial. | Same-team acyclic validation, adjacency maps/memoization, corruption guards, measured 500-node ceiling. |
| Matrix edit then immediate check | Blur save and paid check race independently. | Stale content is graded/cached/rewarded. | Flush dirty cells and bind check to a matrix version/digest. |
| Thousands of teams in notifications | Each run loads the day’s full checked set and rescans from the first roster page. | Repeated O(N) scans/memory; overlap email. | Claim query/cursor, outbox delivery, measured full-day completion. |
| Teacher owns many classes | Guard takes 200 with no ordering/overflow; roster/reports load all children. | Incomplete authorization scope and large responses. | Explicit supported maximum, pagination, overflow error/admin path. |
| Teacher opens rich student details | One request performs roughly 18 queries and returns many growing histories. | DB burst and large payload per click; wrong-membership metadata can accompany active-team data. | Correct selected membership, lazy sections, batched aggregates, query/payload budgets. |
| A team exceeds 200 experiments/2,000 measurements | Writes remain open while reads use fixed `take` values. | Persisted data silently disappears from the normal UI; concurrent batches overshoot the advertised cap. | Cursor pagination or an atomically reserved hard cap; explicit overflow state. |
| Two users sync fair deadlines | Both can start Firecrawl and write the same global event. | Duplicate paid jobs and last-writer-wins shared catalog data. | Admin/background fair-edition claim, staged review, CAS publish. |
| Anonymous popular showcase | Each request streams private R2 bytes through the app. | Serverless/R2 egress spike; spoofable IP trust may weaken cap. | CDN/signed public delivery or byte-budgeted proxy with invalidation. |
| Upstash/provider outage | Limiter permits requests; some provider jobs retry or continue. | Bill grows while protective dependency is down. | Paid fail-closed, circuit breaker, kill switch, clear degraded UX. |
| Team/account deletion | Ledger row can cascade before object cleanup. | Permanent R2 orphan and unverifiable deletion. | Deletion outbox that survives parent removal plus reconciler. |
| Synchronized client retries/slow responses | Many hooks lack abort/version ownership and restore captured whole arrays. | Old searches replace new results; retries lose newer edits or manufacture empty state. | Generation-tagged reads, per-entity mutation ledger, last-good/error state, save barriers. |

Before launch, write a capacity envelope with at least: concurrent students, students/class,
classes/teacher, teams/school, papers/team, maximum upload/decoded dimensions, request and
response sizes, LLM calls/team/day, queue drain time, Postgres connection limit, p95 route
latency, and R2/Anthropic daily spend alerts. A fake 3,500-team loop is useful but is not a
load test unless it includes database latency, provider latency, overlap, and failure.

### 0.7 Repository size, duplication, and file disposition

Line count is a diagnostic, not a refactoring goal. Split files when they combine owners or
state machines; keep cohesive algorithms and acceptance suites intact.

The following is the complete manual disposition of the **44 authored runtime/build files over
300 lines**. “Keep” means the file was read and is cohesive enough that line count alone is
not a reason to split it; it does not erase separately listed correctness findings.

| File | Lines | Manual disposition |
| --- | ---: | --- |
| `app/globals.css` | 3,051 | **NO ACTION, deliberately (v0.70.0).** Re-confirmed at the close of this tranche: this row carries **no behaviour** — it is a structural cleanup with real regression risk across every feature, and §0.7's own rule is that line count is a diagnostic, not a goal. Two batches touched it minimally and additively (v0.64.0 added one `.plot-cursor` rule for the keyboard placement target); nothing else. It stays the least valuable item on the list until a defect attaches to it. **Split.** A 3,000-line global cascade with 663 rules and 18 `!important`s spans every feature. Move tokens/base to cascade layers and feature ownership to CSS modules/layer imports; merge split duplicate selectors where ordering is not intentional. |
| `prisma/schema.prisma` | 1,829 | **NO ACTION, deliberately (v0.70.0).** The audit's own advice is *"add missing tenant/relational invariants and migrate away vestigial fields; do not split merely for length"* — i.e. the valuable half is a data-migration project, not a refactor, and it needs the owner's call on a live database. Untouched by this tranche. Note one invariant this tranche DID lean on: `TeamMember` is still only `@@id([userId, teamId])`, so "one team at a time" is enforced in application code alone (v0.60.1). **Restructure carefully.** Use supported multi-file Prisma schema when the pinned toolchain permits, or at minimum a generated domain map. More important: add missing tenant/relational invariants and migrate away vestigial/legacy fields; do not split merely for length. |
| `lib/literature/vocab.ts` | 789 | **Keep.** Cohesive, deterministic, pure algorithm with strong commentary/tests. Optional detector modules only if ownership changes. |
| `stores/discoveryStore.ts` | 605 | **Split/refactor.** Types, factories, optimistic mutation, persistence, selection, and history are mixed. `addSourceNode`/`addArticleNode` duplicate a large insert path; deletion is O(n²); fire-and-forget writes and `newTreePending` can lose state. Use node factories + reducer/selectors + feature client. — **DEFECTS DONE (v0.56.0); split declined.** All four reproduced. The "state loss" reading is right and understates it: a failed write erased the node with **no error surface at all**, and it also spent `newTreePending`, so the next source opened attached to the old tree. The O(n²) reading is right but the least of it — 48ms on a 2,000-node chain, while a **missing visited-check meant a self-parent or a two-node cycle never terminated at all** (tab hang). One `attachOne` replaces the three duplicated insert paths. The file is now 675 lines: the split into factories/reducer/selectors was declined because the optimistic-apply → persist → rollback → *report* sequencing is one authority, and §0.7's own rule prefers one owner to several short files that duplicate it. |
| `lib/discovery/openalex.ts` | 577 | **Split/harden.** Separate HTTP transport/runtime schemas, normalization, search, and citation traversal. Provider JSON is asserted, `cited_by_api_url` is fetched without host enforcement, and bodies are uncapped. — **HARDENED (v0.55.0); split DECLINED with reason.** All three readings correct, all three reproduced. The host finding is **worse than stated**: the politeness params (`mailto`, `api_key`) were appended *after* the URL was chosen, so the provider-named host also received `OPENALEX_API_KEY`. `oaUrl()` is now the only door — `https:` + exactly `api.openalex.org`, checked before the credential is attached. Bodies go through the shared `readCapped` in `lib/fetch-retry.ts` (8 MB, streaming counter, throws rather than truncates). The split was declined **because** the defect was a request built where the host rule did not reach: separating transport from its callers is the shape that caused this, not the shape that fixes it. |
| `components/ops/ExpertisePanel.tsx` | 574 | **Split into state machine + views.** Four-hundred-line main component and many coupled fields. Progress saving is fire-and-forget; “save and exit” does not await it; timer/fetch cancellation is incomplete. — **DONE for the defect (v0.54.0); the view split deliberately left.** All three readings were **correct** and were reproduced against the original. Persistence extracted to `components/ops/expertiseProgress.ts`: serialized writes, the unconfirmed snapshot as the record of failure, and a `flush()` that retries once and reports — exit is refused when the server does not hold the latest. A fourth defect the verdict does not name was found and fixed: `loadStatus` set `mode: 'idle'` unconditionally on resolve, so a background status load could evict a student from an exam the lab had just **paid** to generate. |
| `components/settings/LabProfileSettings.tsx` | 565 | **Split by domain.** Profile/school, lab/location/topic, and research-plan settings have separate authority and failure rules. Four fetches and silent research-plan load failure make one component a fragile controller. — **DEFECT DONE (v0.65.0); split declined.** The silent research-plan load failure was exact — a non-2xx response never even reached the `.catch`, so `d.plan` came back `undefined` and a team with an already-connected doc saw the section render as if they'd never connected one, with zero signal. Now a re-runnable `loadPlan` + `researchPlanSummarySchema` (new `components/settings/api.ts`, `requestJson`) + a "Try again" retry, matching CodexTab/LiteratureFeature's shape. Profile and lab/location are not actually two authorities (one shared fetch/form/save gated by `isLead`); only topic (already extracted via the shared `useFinalTopic` hook) and research-plan are separate, and both already fail independently in one file — the same "each load owns its failure state" reasoning CodexTab's v0.58.0 close-out used to decline its own split. |
| `lib/ops/codex/scripts/merge-codex-segments.mjs` | 551 | **Refactor build integrity.** Hand-maintained schema mirrors and regex registry editing can drift; sequential output writes can leave a half-merged tree. Derive one schema and stage/validate/atomically install all outputs. — **VERIFIED CLOSED (already fixed by v0.47.0/P1-R15); no new code change.** All three readings were checked against the CURRENT 651-line script, not assumed. **"Sequential writes can leave a half-merged tree"**: closed. Every write this script can make — `content/<slug>.json`, the three registries (`index.ts`, `content-shape.test.ts`, `generated-content.test.ts`), every `tracks/*.ts` wrapper, and `.checksums.json` — is wrapped in one `atomically(touched, run)` that snapshots each path first and, on ANY throw (including the `--check` verification step at the end of `run`), restores every file to its pre-merge byte-for-byte content. Reproduced with a throwaway Node script (`scratchpad`, deleted after use) that copied the exact function verbatim against temp files: a forced throw mid-install left the tree fully restored (content/index both reverted, a file that didn't exist before was removed again); the identical scenario with the restore loop deleted (simulating the pre-v0.47.0 shape) reproducibly left a NEW `content.json` plus an orphaned wrapper file — the half-merged tree the disposition warned about. `build-codex-tracks.mjs`'s own writes (`tracksDir` wrappers + `.checksums.json`) are covered because `touched` is built from the union of `existingSlugs` and `plan.slug`, the same set that script iterates. **"Hand-maintained schema mirrors can drift"**: the mirror (`SHAPE_KEYS`) still exists — a `.mjs` run by bare `node` cannot import a TypeScript interface, so codegen was not adopted — but drift is now a RED TEST, not silent: `test/codex-schema-drift.test.ts` parses `lib/ops/codex/types.ts` and asserts `SHAPE_KEYS` matches every interface exactly. Negative-controlled directly: adding a throwaway `__ponytailDriftProbe: string` field to the `Lesson` interface (reverted immediately after) failed `codex-schema-drift.test.ts`'s "matches types.ts exactly" case with the exact drifted-key diff; reverting the probe restored green. **"Regex registry editing can drift"**: also closed — `syncIndex`/`syncTestRegistry` regenerate all three registries wholesale from `content/*.json` on every merge (comment: "retires the 'a NEW track means THREE registries' footgun — drift is now impossible by construction"), so there is no longer any hand-edited registry to drift. Nothing was changed in this file; this row is recorded as verified rather than re-fixed. |
| `components/fair/ScienceFairFeature.tsx` | 548 | **Split presentation sections.** Extract fair card, countdown/deadline sync, and rubric views. Delete stale “800 sequential query” patch-history comments; content correctness lives in versioned fair modules, not this component. — **Stale comment CLOSED (v0.66.0); split DECLINED.** The "800 sequential query" reading is genuinely stale, confirmed by reading `lib/fairs/match.ts` directly: `ensureFairsSeeded()` already carries the `EDITION_DIGEST` short-circuit (P1-R16, shipped ~v0.40.0, before this 2026-07-23 audit) — a reconciled process now costs zero queries on repeat calls, not ~800. This component's own inline comment still described that hang as a live, present-tense problem ("PRODUCTION-OBSERVED to actually hang for minutes... instead of short-circuiting"); trimmed to name the fix and its version rather than restate a defect that no longer exists, while keeping the (still valid) explanation of why Self-check/Forms are mounted ahead of the Overview tab's own loading state. **The split was declined**: `FairCard`, `DateRow`, `IsefRubric`, and the countdown/deadline helpers are already separated into their own named functions within this file, none of them duplicate logic, and none carry a defect — moving already-cohesive, non-duplicated JSX into new files would be exactly the "line count is a diagnostic, not a refactoring goal" reshuffle §0.7 forbids. |
| `lib/literature/quiz-retry.ts` | 543 | **Keep workflow, centralize persistence.** Meaningful paid-work service, but grading lacks a pre-call claim and its cloned reward transaction drifted from initial grading. Share monotonic quiz persistence and idempotency before cosmetic splitting. — **VERIFIED: the named claim/persistence defects CLOSED (P1-R11, v0.37.0/v0.42.0); the "centralize persistence" ask (SVC-1) confirmed STILL OPEN, verification only.** Against the current 619-line file: `retryGradeClaimedAt` (2-minute TTL, released on failure) elects one grader before the paid call, closing "grading lacks a pre-call claim"; `aiIdempotencyKey`/`runAiOperation` bind the result to the session + exact answers, closing result replay. **SVC-1 (reward-minting consolidation) is genuinely still open** — confirmed by grep: this file still has its own `tx.teamCurrency.upsert` + `recordActivity(..., 'quiz_passed', ...)` block, independent of the near-identical blocks in `app/api/papers/[id]/quiz/grade/route.ts` and `app/api/expertise/grade/route.ts`. This matches §0.11's Executive Verdict, which already lists SVC-1 as open (P2, "no longer blocked by the PvP deferral"); nothing here contradicts that, and nothing was changed. |
| `components/teacher/TeacherRoster.tsx` | 518 | **Split/paginate.** Class creation, join decisions, roster data, counts, and two large views share one file. Approval updates counts/classes but can leave roster stale; clipboard failure is unhandled; responses are unbounded. — **DEFECTS DONE (v0.63.0); split/pagination declined.** All three reproduced. "Approval can leave roster stale" is exact: `decide('approve')` enrols the student and patches `ClassManager`'s OWN `classes` state (count, pending list), but the sibling roster table is fed by an independent `/api/teacher/roster` fetch nothing ever re-ran — a newly-approved student was invisible in the roster until a manual page reload. One `onApproved` callback bridges the two now. "Clipboard failure is unhandled" is real and **worse than local**: `navigator.clipboard?.writeText(code).then(...)` had no `.catch`, so a rejected write (permission denied) became an unhandled promise rejection with zero signal — and the shared `useCopyToClipboard` hook (`components/ops/guide-chrome.tsx`) it was NOT yet using had the identical bug, its own comment admitting "swallows a blocked/denied clipboard silently". Fixed once at that shared source (root cause, not a second local handler) — it now surfaces `error`, consumed here first. "Responses are unbounded" is two claims, and only one holds: the per-teacher student list has no `take`, but is bounded in practice by real classroom enrollment (a few hundred at most for a multi-section pilot) — capping it would silently hide a teacher's own students, the same reasoning `student-overview` (v0.60.1) already used to decline a query cap, so it stays uncapped on purpose. The per-class pending-join-requests list, by contrast, is bounded only by how many distinct accounts try a semi-public join code before it's revoked — a real exposure — and now has a `take` cap (500, oldest-first). **Both the file split and pagination were declined.** `ClassManager` and the roster table already communicate only through typed props (the same shape `ShowcaseEditor` was kept for); the defect was the missing bridge between them, not the file boundary. Pagination is a first-paint product decision, explicitly out of scope, and was not attempted — recorded open the same way `student-overview`'s lazy-load sections were in v0.60.1. |
| `lib/fairs/zip.ts` | 501 | **Split data from geocoding.** Static ZIP approximation, lookup, and Nominatim transport are different owners. Hard-coded special ZIPs repeat; runtime geocoding has no deployment-wide 1 req/s queue/cache and no runtime response schema/cap. — **HARDENED (v0.62.0); split declined.** The queue/cache/schema/cap findings were all exact and reproduced (a 1ms gap between two concurrent calls; 2 network hits for one repeated ZIP; a numeric `lat`/`lon` sailing through with no shape check). "Hard-coded special ZIPs repeat" did NOT hold as written — zero duplicate keys in either static table — but the *fallback expression* `coords ?? STATE_CENTROIDS[state] ?? null` genuinely repeated three times across two other files; one exported `resolveTeamPoint` replaces it. The file/data/lookup split was declined: the tables and lookups are already independently testable with no network, and every defect lived inside `geocodeZip` alone. |
| `components/discovery/DiscoveryFeature.tsx` | 499 | **Extract controller.** Too many hooks and modes, patch-history comments, and unawaited destructive calls. Keep orchestration in one hook/reducer and views in sections. — **CLOSED-BY-PRECEDENT (v0.65.0); split declined; one doc-drift comment fixed.** "Unawaited destructive calls" does not reproduce today: `reset()`/`deleteSubtree()` are still fired without `await`, but both already route through `discoveryStore`'s `commitOptimistic` → `writeError` → re-hydrate sequencing (v0.56.0), which this file already wires to its Toast (also v0.56.0) — a mocked-failure vitest reproduction confirms a failed destroy is reported and rolled back, not treated as done. This audit finding predates that fix; recorded closed, not re-fixed, with 2 new store tests pinning it. "Patch-history comments": one real doc-drift sentence ("the other gateways currently open placeholder panels") — already named by §0.8's counter-audit — was corrected; no other comment described a landed fix without also explaining current shape. The controller split was declined: 8 view components and 3 hooks are already extracted; what remains is genuinely cross-cutting orchestration, not duplicated authority. |
| `components/ops/CodexTab.tsx` | 487 | **Split loader/navigation state.** Refresh ignores non-OK responses; track loading errors can leave an endless loader; rapid navigation can commit a stale track. Use abort/versioned requests and one discriminated load state. — **DONE (v0.58.0); split not needed once each load has a failure state.** All three reproduced; two are worse than described. The non-OK read ends in a **crash**, not a stale view — the error body was committed as the payload and `CodexHome` read `.progress.filter` on `undefined` — and `refresh()` runs after every completed lesson. The endless loader has **no Back button**, and `loadTrack` rejects on a slug a study plan still holds after a Codex rename. The "stale track" strands the loader **permanently**, since the render guard holds and nothing re-triggers the effect. A **fourth** defect not in the verdict: the home screen's bulk load was a `Promise.all` with no `.catch`, so one bad slug left EVERY card a skeleton. |
| `components/discovery/DiscoveryTree.tsx` | 484 | **Refactor algorithm/accessibility.** Recursive layout is cycle-unsafe and can be O(n²); graph buttons are pointer-only SVG groups without focus/key handlers; context menu is not viewport-clamped. Memoized adjacency layout plus real keyboard controls. — **DONE (v0.53.0).** Layout extracted to `lib/discovery/tree-layout.ts`; all five controls keyboard-operable; menu clamped. The "cycle-unsafe" reading was **wrong** and is corrected in the close-out: a node has one `parentId`, so a cycle is never root-reachable and the recursion never entered one. Measured against the original, the real defects were silent node LOSS (an orphan was not drawn; a pure 2-cycle rendered an EMPTY tree), a `RangeError` on a 5,000-node chain, and the quadratic width recomputation. |
| `components/literature/VocabPanel.tsx` | 480 | **NO ACTION (v0.70.0).** The verdict itself says *"no unique security defect found in this file"*, and the requested work is view consolidation — cosmetic by §0.7's own standard. Left. **Mostly keep; extract repeated views.** Size is driven by several clear modes. Consolidate form/result chrome and move state transitions into the vocabulary hook/reducer; no unique security defect found in this file. |
| `components/teacher/TeacherRubricScoring.tsx` | 423 | **Refactor draft lifecycle.** Track switching can discard unsaved state, blur/click autosaves can race, blank numeric input becomes zero, and success timers are not cleaned up. Use explicit dirty/version/save state. — **DONE (v0.57.0).** "Blank numeric input becomes zero" is the worst of these and is understated: it did not just display zero, the **blur autosave PUT it**, so clearing a stored 15 recorded a real 0 with "Last scored by <teacher>" vouching for it. The "race" is a silent DROP — `if (saving) return` meant two blurs produced one PUT carrying the *empty* notes. "Track switching discards unsaved state" is **not right as written**: the toggle click blurs first, so the save is already in flight and `applySave` correctly drops its stale result; what the remount discards is the FAILURE message. Fixed by a text-backed input + `parseScoreInput`/`clampScore` (clamp at send time, never while typing), the shared `lib/save-queue.ts`, and failure reporting hoisted to the panel. E2E F10 re-run: **16/16**. |
| `components/ops/data-terminal/ExperimentDetail.tsx` | 420 | **Split chart/input/table.** Load errors offer no functional retry. Duplicate `(x, series)` points overwrite visually although the table retains them, so the chart can misrepresent data. — **DONE (v0.63.0); split declined.** Both reproduced. The duplicate-points finding is exact: recharts' row-per-x, column-per-series shape holds only one y per (x, series) key, so a second point at the same key overwrites the first in the drawn line while the table — reading the same array directly — keeps every row. Measured: `{x:5,series:"Trial A",y:10}` then `{x:5,series:"Trial A",y:40}` then `{x:6,...}` — table shows 3 rows, chart draws 2 and plots y=40 (not y=10) at x=5, with no signal anything was dropped. The fix does not invent a de-duplication policy that would touch a student's recorded data (every point stays in the table); the chart-shaping logic was extracted to a pure `lib/data-terminal/chart.ts` (`buildChartData`) that also counts these collisions, and the component renders the count beside the chart. The load-retry finding is exact too: the lazy-load fetch had a `.catch` that only set an error string, no way to re-run it short of reselecting the experiment (which remounts and refetches). The load is now one re-runnable function; the error state gets a "Try again" button. **The chart/input/table split was declined**: all three are views of one owned `measurements` array with one write path (`syncMeasurements`) — splitting them would prop-drill the same state across files, the shape `discoveryStore` (v0.56.0) already flagged as a red flag, not a real authority conflict to resolve. |
| `components/literature/LiteratureFeature.tsx` | 409 | **Use one subview state.** Boolean views can overlap. Team-phase fetch ignores status and can hide advancement forever; timers are not cleaned; hard-coded slot count duplicates domain constants. — **DONE (v0.59.0).** The phase reading is right and is the batch: no `r.ok`, so a non-2xx body left `phase` undefined and the gate condition went false — a team at 25/25 in `literature_review` with no idea submitted had **no way to advance**, and `[]` deps meant nothing retried. Reproduced with a 429. Parsed now, with a retry rendered where the gate would be. **"Boolean views can overlap" is NOT reachable**: each is set only by a header button and the header is gone once any view is open. The union shipped anyway (it was the requested scope) but is recorded as a class removed, not a defect fixed. |
| `lib/literature/synthesis.ts` | 396 | **Keep algorithm; strengthen ownership.** Cohesive service. Schema must normalize matrix-paper ownership; check operation must bind an exact version/snapshot. — **VERIFIED CLOSED (P1-R13, v0.50.0, with the last "still open" item confirmed closed by v0.51.0 — see §0.3's corrected entry).** `toMatrixView` computes and returns a server-issued `inputHash` (`matrixInputHash(templateId, columns, paperIds, cellViews)`); `POST /api/literature/synthesis/[id]/check` re-derives that same hash server-side and 409s if it disagrees with the client-echoed `expectedHash`, and re-hashes again before committing the cache/KP so a mid-call edit cannot be graded or cached. Matrix-paper ownership is enforced at creation: `POST /api/literature/synthesis` requires every `paperId` to resolve under `{ teamId: ctx.teamId, status: 'ready' }` and 400s if the count disagrees — a cross-team IDOR guard, verified present. Nothing changed; verification only. |
| `lib/discovery/articles.ts` | 390 | **Split provider adapter/domain mapping.** Feed URLs and provider bodies need canonical host/content-type/byte validation. Licensing assumptions need a current human review. — **Byte cap DONE (v0.62.0); host/content-type declined.** The byte cap on `res.text()` was genuine (one of `openalex.ts`'s v0.55.0 "still owed" pair) and is fixed via the shared `readCapped`. Host validation does not apply here: every feed URL is a literal in this file, not request/provider-supplied data like OpenAlex's `cited_by_api_url`, so there is nothing dynamic to allowlist. Content-type was measured, not assumed: a non-XML body degrades to `[]` via the existing parse path, and an XXE probe is refused by `fast-xml-parser` itself and caught by the existing try/catch — both reproduced directly. Licensing review remains a human/legal call, out of scope, still owed. |
| `lib/buildings/service.ts` | 384 | **Keep.** Cohesive command service with transaction/policy ownership. Refactor only shared result helpers if another command genuinely shares them. |
| `components/literature/SynthesisMatrixEditor.tsx` | 383 | **Split grid/verdict and fix save barrier.** Check can race blur saves and grade stale cells. Column/cell controls also need explicit failure/dirty state. — **VERIFIED CLOSED (P1-R13, v0.50.0/v0.51.0); grid/verdict split declined implicitly (never attempted, and no duplicated authority was found to justify it), verification only.** The save barrier lives in the sibling hook `useSynthesisMatrix.ts`, not this file: saves are serialized through `saveChain`, `runCheck` awaits it, flushes anything dirty, and only then sends the confirmed `inputHash`. Column/cell controls have explicit failure state — `patchColumns` (backing add/rename/remove) sets a component-visible `error` on any `ApiError`/failure, and `busy` gates re-entry. The dirty-draft-loss item this row's original defect implied (an edit's own text disappearing on a column change) is closed — see the `synthesis.ts` row above and the corrected §0.3 P1-R13 entry. No split was performed: no duplicated grid/verdict authority was found to justify one. |
| `components/lab/LabScene.tsx` | 379 | **Replace overlay booleans with a union.** Six booleans permit overlapping off-path panels; the component imports and coordinates too many overlays. Keep spatial shell, move overlay controller to one state machine. — **DONE (v0.61.0).** Unlike LiteratureFeature's v0.59.0 "boolean views can overlap" (unreachable — the header unmounts), this one is **real and reachable**: `ActivityPanel` is the one overlay with no `ModalBackdrop` — a bare `position: fixed` right-side column (z-index 1100, no scrim, no click-outside-closes) — so every trigger not physically under its 340px column (team-name button, feedback FAB, a gateway building) stays clickable while it's open. Activity + Team/Feedback/Feature could genuinely both be open. One `Overlay` union (`{ kind: 'none' \| 'feature' \| 'shop' \| 'team' \| 'settings' \| 'activity' \| 'feedback' }`) replaces `openKey` + five booleans; the spatial shell (`LabPlot`, tile/decoration layers, banner/menu/burst/toast) is untouched. |
| `app/(public)/showcase/[slug]/page.tsx` | 374 | **Split rendering and cache request load.** Metadata and page repeat showcase/viewer work; generic metadata casts bypass runtime validation. Validate every outgoing URL/embed scheme at render time. — **VERIFIED: the AUTHORIZATION model P0-R3/P1-R7 built is correctly wired into this page; the file's OWN three named defects are confirmed STILL OPEN — verification only, no surgery done.** P0-R3's revision-bound moderation and P1-R7's share-token access are both present and correctly consumed here: `loadShowcase` resolves by slug OR `shareToken` and reports `via`, and `canViewShowcase(toShowcaseForView(sc), viewer, via)` gates both `generateMetadata` and the page body identically — that part of the row's premise is accurate. But P0-R3/P1-R7 never claimed to fix this file's own three listed defects, and none of them are fixed: (1) **"Metadata and page repeat showcase/viewer work" — confirmed, real, unaddressed.** `loadShowcase()` and `resolveShowcaseViewer()` are plain async functions (not wrapped in React's `cache()`), and both `generateMetadata` and `PublicShowcasePage` independently call both — every public showcase view runs the same Prisma queries (one `findFirst` with nested asset/team includes, plus `resolveShowcaseViewer`'s 1-2 queries) TWICE. (2) **"Validate every outgoing URL/embed scheme at render time" — confirmed still missing, but not currently exploitable.** `ResourceLink` renders `meta?.url` straight into `<a href>` with no `isSafeHttpUrl` (or any scheme) check at render time. Traced the one write path that can populate it (`POST /api/showcase/asset/link`): it already gates non-video urls through `isSafeHttpUrl` before persisting, so no live injection path exists today through the app's own UI — but this file has no render-time defense-in-depth, unlike `SourceReader.tsx`/`IdeaCheckView.tsx` (v0.64.0), which added exactly this second gate at the render boundary. `videoEmbed` is safe regardless: it's server-derived to one of two hardcoded host prefixes (`youtube-nocookie.com`/`player.vimeo.com`), never the raw stored url. (3) **"Generic metadata casts bypass runtime validation"**: the only literal cast found is `sc.team.labType as LabType | null` — a plain enum narrowing of an already-Prisma-typed nullable string, not a security-relevant validation bypass; no other unchecked cast of external/untrusted data was found in this file. Reported to the orchestrator as (1) and (2) above are genuine, if low-severity, open items — neither was fixed here per this batch's verification-only scope for Part 2. |
| `lib/fairs/rubric-anchors.ts` | 356 | **Keep as reviewed content, not code truth.** Cohesive authored dataset. It needs edition/source/reviewer provenance and subject-matter review; shape tests cannot certify it. |
| `lib/discovery/tree-service.ts` | 348 | **Fix graph invariant before splitting.** (Invariant fixed in v0.34.1; the split itself is still open.) Accepts foreign/cyclic parents, can hang in `depthOf`, catches broad create errors as success, and performs repeated scans. Validate same-team DAG and use adjacency maps. — **VERIFIED: invariant CLOSED (P1-R10, v0.34.1); split confirmed still open, verification only, no surgery done.** Read against the current 448-line file (up from 348 — comments and the guard function, not a rewrite). `assertValidTreeGraph` is present and does everything P1-R10 asked: same-team parent ownership (an unowned/foreign id is rejected as "Unknown parent node"), a self-edge check, and a visited-set walk that rejects any cycle the batch itself would introduce, all BEFORE any write. `hydrateTree`'s own `depthOf` independently carries a visited set (containment for rows written before the guard existed). The broad-catch defect is also fixed: `createTreeNodes`'s two write loops both gate their catch on `isUniqueViolation(err)` (a real `P2002`) and rethrow anything else, so a genuine write failure can no longer be reported as `{ok: true}`. **The split ("use adjacency maps") is confirmed NOT done** — `hydrateTree` still calls `depthOf(r.id)` once per row rather than a shared adjacency map/single graph walk, and the source/article branches still issue one `findFirst` dedup query per node in a loop rather than one batched lookup; both are bounded (`MAX_TREE_NODES = 500`, `MAX_BATCH_NODES = 200`) so this is a cleanliness/perf recommendation, not a live defect, and is left open exactly as the row already said. No code was touched — `test/discovery-tree-graph.test.ts` and `test/discovery-tree-layout.test.ts` already cover the invariant. |
| `lib/teacher/student-overview.ts` | 347 | **Split/lazy-load query sections.** About 18 queries per detail request; selected team can be paired with the latest *other* membership's role/join time. Use one selected membership and bounded sections/view models. — **PAIRING CLOSED (v0.60.1); the query split NOT done, deliberately.** The pairing finding was **true when written and is no longer reachable**: v0.48.0 (three days after this audit) made membership one-team-at-a-time and `leaveOtherTeams` runs inside the join transaction. Verified against the dev database — no user holds more than one `team_members` row. Derived from a single membership anyway, because two lines make the agreement structural rather than inherited. The query count is **20–21, not ~18** (1 student + 1–2 ownership + 18 fan-out), all parallel; lazy-loading sections is a product decision about first paint, not a refactor, and is left open rather than half-done. |
| `lib/hooks/usePlotBuildings.ts` | 346 | **Reducer/state machine.** More than ten coupled state values, no abort/resync, refresh errors swallowed, and duplicated optimistic economy prediction. Keep server authoritative and reconcile visibly. — **Defects DONE (v0.61.0); reducer split declined.** All three named readings reproduced, and the reducer suggestion itself did not hold up. (1) **"Refresh errors swallowed" is exact, but narrower than it reads**: every mutation already surfaced its own failure via a visible `toast` (this file was never silent about a place/move/sell/upgrade failing) — the one truly swallowed error was `refreshPlotState`'s OWN resync GET, whose `catch` said nothing beyond a comment claiming the rollback already covered it. It doesn't: a failed *resync* means the mirror is unconfirmed, not necessarily correct (a concurrent teammate edit could have moved the true state further). (2) **"No abort/resync causes stale writes" reproduced by simulation**: an upgrade fails and starts a resync GET; while it's in flight, a different building is placed and its own POST succeeds; if the slow GET's unconditional `setEconomy(data.economy)` lands between the optimistic add and the POST's own success handler, the newly-placed (and now server-committed, KP-charged) building is wiped from the client and never restored — the success handler's `.map` finds no matching key in the now-replaced array. Fixed with a monotonic `opSeq` bumped by every place/move/sell/upgrade at its start; `refreshPlotState` captures it and re-checks after the `await`, skipping a resync that a newer action has superseded (that action does its own resync if it, in turn, fails). (3) **"Duplicated optimistic economy prediction" is real, but small**: `Math.max(1, memberCount)` was independently written three times — `lib/shop-server.ts`'s authoritative multiplier, `ShopPanel`'s displayed price, and this hook's optimistic prediction — not centralized as hoped. Extracted to `teamCostMultiplier()` in `lib/economy.ts`; all three call it now, so the predicted number is unchanged (same formula) but can no longer drift. **The reducer/state-machine split was declined**: the twelve states are independent, narrowly-scoped UI flags each owned by one clear function (unlike `discoveryStore`'s v0.56.0 case, where the split was declined because several near-identical functions shared one optimistic-apply→persist→rollback→report authority) — there was no duplicated authority for a reducer to consolidate, only a missing generation guard and one swallowed error path, both fixed in place. |
| `components/discovery/SourceReader.tsx` | 344 | **Split readers/reflection control.** Sanitized HTML is a central invariant worth retaining. Blur/button saves can duplicate or complete after selection changes; bind requests to node/version and validate every source URL scheme. — **DONE for the save path (v0.60.0); split not attempted.** Both readings reproduced. The duplicate is real but **benign**: the visit ledger's `@@unique` keeps the KP award idempotent per node, so it was a wasted write, not an exploit — worth stating rather than overstating. "Complete after selection changes" is right and the fix is two-part: the snapshot carries its own node id (so a queued save cannot be written to whichever source is open when it runs) and the badge/spinner are bound to the node that was saved. A **third** defect not in the verdict: the draft-reset effect depended on `node?.reflection`, which the parent updates on a successful save, so typing that continued during a save was replaced by the older saved text. |
| `components/lab/LabPlot.tsx` | 337 | **Add keyboard placement.** Pointer-centric pick-up/placement is not accessible; forced browser clicks likely mask it. Extract interaction controller and clean timers. — **DONE (v0.64.0); controller split declined.** Confirmed exactly as written: pick-up ran only on `pointerdown` and the building button's own `onClick` explicitly no-opped in arrange mode, so a keyboard Enter/Space on a focused (already correctly-named) building did nothing; `upgrades.spec.ts`/`placement.spec.ts` both drive pick-up with `dispatchEvent('pointerdown', ...)`, which is exactly the "forced click" that masked it — real hit-testing and the keyboard were both bypassed. Fixed with a `detail === 0` branch on the existing button (distinguishes a keyboard-fired click from the pointer path, which already ran on `pointerdown`) plus one real, focusable roving cursor `<button>` — not 49 tabbable cells — that arrow keys move across the same `(gx, gy)` grid and Enter/Space commits through the identical `onDrop`/`isPlaceable` a pointer drop uses. The one real timer (`window.setTimeout` guarding the pointer/click race) is now cleared on unmount. **The "extract interaction controller" split was declined**: the pure grid math (`screenToCell`/`isPlaceable`/`cellToScreen`) already lives in `lib/plot.ts`, testable without a DOM; what remains in this file is DOM-event glue bound to a ref's bounding rect, which needs a live browser regardless of which file it lives in — moving it elsewhere would not gain testability, only prop-drill the same ref/state across two files. |
| `components/fair/FormsChecklist.tsx` | 336 | **Content-blocked, then split rows/hazard guide.** GET status is unchecked and update failures are swallowed. More importantly, it presents the incorrect unversioned form catalog in P0-R4. — **VERIFIED: content-blocking defect CLOSED (this row's own file now serves the corrected P0-R4 catalog through `GET /api/fairs/forms`); the two named UI defects confirmed STILL LIVE, unreachable from this batch's scope.** Reproduced by reading, not assumed: the initial load is `fetch('/api/fairs/forms').then(r => r.json())` with no `r.ok` check — every route this app's own guards produce (`requireTeamContext`'s 401/404/403 paths) does return a parseable `{error}` body, so this happens not to crash today, but the check is genuinely absent, exactly as named. `cycleStatus`'s PATCH failure path is `catch { /* leave state unchanged on error */ }` — confirmed a true silent swallow: no message, no toast, nothing tells the student their form-status click did not save. Per this batch's Part 2 constraint (verification only, no cosmetic surgery, do not touch `forms.ts`'s reviewed content), neither was fixed; both are reported to the orchestrator as genuinely open UI-durability defects for a future batch, not part of P0-R4's own scope, and were never claimed closed by it. The "split rows/hazard guide" recommendation was likewise not attempted. |
| `app/(onboarding)/onboarding/page.tsx` | 329 | **Split role forms/recovery.** Duplicate school/name fields and large recovery commentary. Open teacher self-registration remains explicitly accepted/optional; do not accidentally convert that choice into a blocker. — **Field duplication CLOSED (v0.66.0); form/recovery split DECLINED.** "Duplicate school/name fields" is confirmed and is literal, not structural: the "Your name" and "High school" `<input>` blocks in the student form and the teacher form were byte-for-byte identical JSX (same labels, placeholders, `maxLength`, and Tailwind classes) — any future styling/placeholder/validation change to one had to be remembered in the other, with nothing to enforce it. One colocated `NameAndSchoolFields` component (same file, matching this codebase's existing pattern of colocated subcomponents — e.g. `ScienceFairFeature`'s `FairCard`) replaces both copies; both forms now render the identical two fields through one definition. Behavior, state, and validation (`canSubmit`/`canTeacherSubmit`) are unchanged. **"Large recovery commentary" was declined as a split target**: the `entering` recovery-latch effect is not duplicated anywhere in this file, is used by both forms as shared bookkeeping, and its size is commentary explaining a subtle bounce-back edge case, not extractable logic — moving it to its own file would relocate the same single piece of state with no duplication resolved, matching `LabPlot.tsx`'s (v0.64.0) and `usePlotBuildings.ts`'s (v0.61.0) precedent for declining a split that only prop-drills the same state elsewhere. **ACCEPTED-R1 (§0.3) is untouched**: no gate, approval step, or warning was added to teacher self-registration; `handleTeacherSubmit`'s only change is that its two fields now render through the shared component, with the exact same request/redirect behavior. |
| `components/discovery/DiscoveryHome.tsx` | 321 | **Keep static surface; correct copy.** Help text describes an older Wiki/YouTube-only product and right-click deletion despite visible controls. Unsupported personal attribution should be sourced or removed. |
| `components/research-plan/IdeaCheckView.tsx` | 317 | **Extract result primitives.** Variant consolidation produced ternary-heavy duplicated markup. Model/provider URLs go straight to `href`; enforce `http/https` server-side and at rendering. — **DONE (v0.64.0).** Both readings confirmed. Five separate spots (`priorWork` ×2 variants, `citations` ×2 variants, live-search sources) rendered a `url` sourced from either a live web-search tool result or the LLM's own JSON verdict straight into `<a href>` — neither is a trusted caller, and `javascript:` there is a real XSS. Fixed at both ends with `isSafeHttpUrl` (`lib/showcase.ts`, already the named generic http(s) gate per `lib/validation.ts`) rather than a new checker: server-side in `idea-check-service.ts` (a new `sanitizePriorWork` for the model's own JSON, and a filter in `emitSources` for the tool's own results — the model's url is dropped, not the whole entry), client-side via a new `SafeExternalLink` primitive that all five call sites render through. `SafeExternalLink` plus a `ResultHeading` primitive (the four repeated teacher/student heading ternaries) are the "result primitives" the disposition asked for. |
| `lib/ops/codex/engine.ts` | 314 | **Keep.** Cohesive pure grading/progression engine with useful tests. Do not fragment it for a numeric threshold. |
| `components/showcase/ShowcaseEditor.tsx` | 314 | **Keep composition.** Already delegates sections and hook ownership reasonably. Correctness work belongs in revision-bound server moderation, not more component slicing. |
| `components/literature/SynthesisPanel.tsx` | 312 | **Keep orchestration.** Reasonable panel composition. Main defect is editor/server snapshot semantics, not this line count. |
| `components/literature/QuizPanel.tsx` | 311 | **Extract question form/result rows.** Initial and retry forms duplicate substantial markup; score/pass display rules duplicate domain constants. — **Constant duplication CLOSED (v0.66.0); question-form/result-row split DECLINED.** "Score/pass display rules duplicate domain constants" is confirmed but **no live disagreement exists today**: `QUIZ_PASS_THRESHOLD` (`lib/literature/quiz.ts`) is `70`, and this file's three hardcoded fallbacks (`results?.threshold ?? 70` ×2, and a `>= 70` score-color tier) were also `70` — checked directly, they agreed. The risk is drift, not a present bug: `lib/literature/quiz.ts` reads its grading rubric off the filesystem at module scope (`readFile`/`path`, `import 'server-only'`-adjacent), so it cannot be imported into this `'use client'` component — the exact reason `components/literature/quizDerive.ts` already carries its own client-safe mirror, `DEFAULT_PASS_THRESHOLD = 70`, with a comment explaining why. QuizPanel now imports that existing mirror instead of repeating a fourth bare `70`; the score-color tier now reads the session's own `results.threshold` directly (available and narrowed non-null in that branch) rather than a hardcoded number, so it can never disagree with what the server actually graded against. The unrelated `>= 40` mid-tier color break was left as a plain UI style choice — no domain constant names a "40" tier, so inventing one would be manufacturing scope. **The question-form/result-row split was declined**: the quiz view's textarea, the results view's per-question row, and the retry view's per-question row are structurally similar but not duplicated — only the retry view carries the student's previous answer, the "New question" badge, and a fixed extra question, and the shared rationale/strong-answer block is already extracted as `QAExplain`. Splitting the three would relocate distinct-but-similar JSX into more files with nothing shared beyond what `QAExplain` already shares. |
| `lib/fairs/match.ts` | 309 | **Fix versioned seeding.** Count fast path suppresses same-size drift; old patch-history comment is misleading. Keep matching service but separate edition sync from queries. — **VERIFIED: seeding fix CLOSED (P1-R16, v0.44.0); patch-history comment confirmed clean; the sync/query split confirmed still open, verification only, no surgery done.** The count fast path is gone: `ensureFairsSeeded` now gates on `EDITION_DIGEST` (a sha256 of the whole `FAIRS` dataset), not row count, so a same-size correction is no longer invisible. The "old patch-history comment" reading does NOT hold today: the surviving comment at `seedFairsBatched`'s doc block explicitly frames the ~800-query behavior in the past tense ("instead of the old per-fair upsert loop... it hung /api/fairs/match for 2+ minutes") — the same style `ScienceFairFeature.tsx`'s v0.66.0 fix used, not a present-tense claim; nothing needed trimming here. **The split ("separate edition sync from queries") is confirmed NOT done**: `seedFairsBatched`/`ensureFairsSeeded` (edition sync) and `loadFairIndex`/`matchFairs` (queries) still live in the same 403-line file (up from 309) with no internal boundary — left open exactly as recorded, not attempted in this batch. |
| `lib/uploads/assets.ts` | 308 | **Strengthen deletion state machine.** Reservation/attach design is good. Add crash-recoverable `deleting` leases, team-deletion tombstones, reconciliation, and safe URL decoding. — **VERIFIED CLOSED for the named defect (P1-R12, v0.39.0/v0.39.1); one owed item confirmed still open, verification only.** All four bullets checked against the current 415-line file. **Crash-recoverable leases**: present — `status: 'deleting'` + `deleteLeaseAt` + `deleteAttempts`, claimed with a guarded `updateMany` (`WHERE status IN (...)`), object deleted, THEN terminalized to `deleted`; a stale lease past `DELETE_LEASE_MS` is re-selected by the sweep rather than stuck. **Team-deletion tombstones**: `uploaded_assets.team_id` carries `ON DELETE RESTRICT` (per the P1-R12 close-out; not re-verified against the migration file in this pass since the constraint is a schema fact, not app logic). **Reconciliation**: the DB-side half is present and is a distinct, later fix (`reconcileOrphanedAssets`, P1-S8) — it repairs `attached` rows whose owning domain row is already gone, run by the papers cron before the sweep. **Safe URL decoding**: `decodeURIComponent` is wrapped in a try/catch (line ~116) rather than left to throw a raw `URIError` into a 500. **Confirmed still owed, exactly as already documented**: bucket-vs-ledger reconciliation (comparing real R2 inventory against the ledger) and stale/terminal alerting do not exist in this file — grepped for any S3/R2 list-objects call or Sentry/alert hook; none found. Nothing was changed. |
| `lib/sprites/manifest.ts` | 308 | **Keep manifest; remove drift.** Comments say gateway source dimensions are 48/49 while current bespoke source is 64; validate manifest/source/output coverage automatically. |
| `lib/fairs/forms.ts` | 306 | **Disable/rewrite under review.** The form-number mapping and timing are materially wrong. Replace with a versioned, officially sourced, human-approved edition. — **VERIFIED CLOSED (P0-R4, v0.34.0), content untouched per this batch's constraint.** `ISEF_EDITION` (season 2027) carries only the officially published codes (1, 1A, 1B, 2A, 2B, 2C, 3, 4, 5, 6A, 6B, 7 — 1C and the old Form 2 retired), and `appliesTo`/`isEditionReviewed()` both fail closed (`null`/`false`) until `reviewedBy`/`reviewedAt` are set by a qualified reviewer — currently still `null`, so the "still owed" qualified review is honestly unclosed. No content, mapping, or reviewer field was touched — this is a read-only confirmation. |
| `lib/ops/codex/complete-service.ts` | 304 | **Keep service; fix monotonic writes.** Failed-attempt upsert can lower best score under concurrency; re-pass changes first completion time. Use `GREATEST`/first-completion semantics. — **VERIFICATION FINDING: NOT closed — the handoff's classification was WRONG. Reported to the orchestrator rather than fixed in this batch (Part 2 is verification-only).** Both named defects reproduce against the current 448-line file exactly as written, with zero test coverage (`grep`-confirmed: no test file for this service exists at all). (1) **Re-pass changes first completion time — confirmed, unconditional, no concurrency needed.** In the `alreadyClaimed` branch (a passing re-attempt of an already-completed lesson), the `codexLessonProgress.update` call sets `data: { bestScore: newBestScore, completed: true, completedAt: new Date() }` — `completedAt` is overwritten to "now" on every single re-pass, with no guard preserving the original completion timestamp. Any student who replays a passed Codex lesson (e.g., to push their best score up) silently rewrites their own completion history. (2) **Failed-attempt upsert can lower best score under concurrency — confirmed as a real read-then-write race.** The failed-grade path reads `existing.bestScore` via a plain `findUnique`, computes `newBestScore = Math.max(priorBest, scorePct)` in application code, then writes it via a separate `upsert` with an ABSOLUTE value (`bestScore: newBestScore`) — no `GREATEST` at the database level and no transaction spanning the read+write. Two concurrent failed attempts with different scores can race: if the lower-scoring request's write lands after the higher-scoring one's, the final stored `bestScore` is the LOWER value — a genuine lost update. Both defects are the exact opposite of what the FIRST-TIME-completion path already does correctly a few lines below (`GREATEST("codex_lesson_progress".best_score, ...)` inside a raw `INSERT ... ON CONFLICT` — v0.37.0/P1-R11's own pattern, just not reused here). §0.9's own phase-two register (line ~586, "Completion high-waters are not uniformly monotonic") already names this and was never marked CLOSED — that entry is correct and this row's disposition should not have been listed as answered. No fix was made in this batch per its explicit "report rather than fix" instruction for anything found genuinely still broken during verification; recommend a small future batch: move the failed-attempt best-score write to a `GREATEST`-gated raw update (mirroring the existing pass-path pattern), and set `completedAt` only `WHERE completed = false` (or omit it entirely on re-pass) so a replay cannot rewrite first-completion history. — **CLOSED (v0.68.0).** Both defects fixed: the `alreadyClaimed` (re-pass) branch no longer writes `completed`/`completedAt` at all (both are already correct from the first pass) and raises `bestScore` via a conditional `updateMany` guarded by `WHERE bestScore < newScore` — the DB-atomic conditional-predicate style, not a read-then-write. The failed-attempt path is now a `GREATEST`-gated `INSERT ... ON CONFLICT DO UPDATE`, matching the first-time-completion pattern exactly; `completed`/`kp_awarded` are only set on a genuine INSERT so a failed retry can never un-complete a lesson. New `test/codex-complete-monotonic.test.ts` (6 tests) pins both attacks with a real elapsed-time re-pass and a real `Promise.all` interleaving; negative-controlled by reverting the fix and confirming the two attack tests fail on the exact reproduced corruption (`completedAt` moved; `bestScore` stomped to 20), while the other four invariant tests still pass. |

#### The other 103 files over 300 lines

**25 long tests/harnesses were read:** `e2e/papers-tab.spec.ts`,
`test/harness/route-policy.ts`, `e2e/F13-codex.spec.ts`, `e2e/F11.spec.ts`,
`e2e/vocab-builder.spec.ts`, `e2e/F11-quiz-retry.spec.ts`,
`e2e/lit-explain-it-back.spec.ts`, `e2e/synthesis-matrix.spec.ts`, `e2e/F4.spec.ts`,
`e2e/F3.spec.ts`, `e2e/F3-plan-paste.spec.ts`, `e2e/F6-log-links.spec.ts`,
`e2e/F9.spec.ts`, `e2e/upgrades.spec.ts`, `e2e/F4-print.spec.ts`,
`e2e/F10-teacher-rubric.spec.ts`, `lib/ops/codex/__tests__/engine.test.ts`,
`lib/literature/vocab.test.ts`, `e2e/F5-bell.spec.ts`,
`e2e/disco-article-sources.spec.ts`, `e2e/F10.spec.ts`, `e2e/api.ts`,
`e2e/F1.spec.ts`, `e2e/F2.spec.ts`, and `e2e/F18-vega-companion.spec.ts`.

The unit tests for the pure engines are long but cohesive. The E2E files are over-commented
and repeatedly encode static source criteria as unconditional `test.skip(true)`. F9 roster
criteria skip when mutable shared fixtures do not meet preconditions; F3 skips when setup
fails; papers-tab can depend on live OpenAlex despite mock mode; F4/F4-print duplicate large
setup. One arbitrary sleep and forced click hide synchronization/accessibility defects. Split
fixtures by domain, make required preconditions fail loudly, move static policy to
source/unit/lint checks, and report required executed criteria—not just a green process.
The 751-line route-policy harness should split emulator, fixture, and assertion helpers, and
must remain explicitly labeled as policy emulation rather than database proof.

**OPTIONAL / DEVELOPMENT-ONLY — 73 long art-source generators were classified:** 61 economy
builders under `.claude/pixel-art-pipeline/builders/`, 10 gateway builders under
`art/gateways/`, plus `art/build_sprites.py` and `art/iso.py`. These scripts are manually used
during development. They do not execute in the deployed application, production build, or
request path, so their size and duplication are not production architecture, security, scale,
or pilot-readiness findings. They were included only to make the requested whole-repository
and over-300-line census honest.

For optional future maintenance, the family contains roughly 46,500 lines and 1,300 functions.
Eleven exact duplicate helper families were observed: `_stamp` occurs in about 19 builders;
identical horizontal/vertical line helpers occur in ten each; rectangle, sparkle, stripe, and
emitter helpers repeat across smaller groups. This is acceptable for private, manually
operated tooling if the duplication is useful for keeping each generator self-contained.
Consolidation is warranted only if maintaining the scripts becomes burdensome.

Development-workflow observations, not required fixes:

- `art/build_sprites.py` and `art/iso.py` define competing canvas/build paths;
- dozens of `json.dump(..., open(...))` calls do not close files explicitly;
- preview scaling sometimes omits `Image.NEAREST`, risking blurred pixel art;
- dead `if False` drawing expressions remain in `art/iso.py` and three builders;
- `docs/SETUP.md` / `art/README.md` call `python art/iso.py` canonical, while the pixel-art
  blueprints warn that `iso.py` must not overwrite bespoke gateways;
- no one build-all command covers the 61 current economy builders and bespoke gateways; docs
  claim nine ground tiles while the generator emits six.

The documented regeneration command can overwrite current art with older generic output if it
is run. Because this is a developer-controlled workflow rather than a production path, the
appropriate response is simply to use the intended generator and review its output. A
manifest-driven build command, shared helpers, staged output comparison, or documentation
cleanup are optional conveniences—not pilot work.

**Two other authored long tools were reviewed:** the 704-line Codex author workflow has the
false-clean path in P1-R15; the 332-line fair scraper has the version/status/transport problems
in §0.4. `pnpm-lock.yaml`, the generated 379-line sprite-version map, and the 791-line
`sports-biomechanics-legacy.ts` salvage artifact were classified as lock/generated/explicit
legacy rather than runtime modules. Their generators/provenance, not each emitted mapping or
salvaged lesson, own correctness.

Current duplication and ownership findings:

- **35 component files call `fetch` directly**, up from the prior document’s 29. This is a
  boundary problem, not proof that every call needs TanStack Query.
- **29 `logActivity` call sites** exist; 28 explicitly swallow failures. Define durability
  before compacting them.
- A normalized eight-line clone scan across **526 authored runtime JS/TS/CSS files** found
  **314 repeated windows**. Overlapping windows inflate the count, so it is not a quality KPI.
  Manually confirmed actionable families are:
  - the large initial-quiz/retry attempt/session/proficiency/KP transaction—already drifted;
  - teacher student authorization/context blocks repeated across `[id]` route families;
  - student/teacher rubric row and total shaping;
  - data-terminal ownership/query blocks;
  - Vega/paper-chat model configuration and chat lifecycle adapters;
  - project-log create/update parsing and mutation flow;
  - `FeedbackPanel`/`TeamPanel`/`SettingsPanel` dialog chrome;
  - guide-panel shells beyond the already extracted `guide-chrome`;
  - F4/F4-print E2E setup.
  Development-only art helper repetition is intentionally excluded from production
  refactoring priorities.
  Tiny coincidental JSX/data repetitions should remain local.
- A diagnostic TypeScript run with `noUnusedLocals`/`noUnusedParameters` found **five runtime
  dead imports/parameters** (`fill-papers` request, advance-phase `Phase`, `PhaseAdvance`
  `LAB_TYPE_LABELS`, and `ShopPanel`/`SettingsPanel` `useEffect`), one unused fair-match import,
  four unused E2E fixtures/constants, and two compile-time test aliases. Clean these and enable
  unused-local checking for production files; use a separate test config if fixture callbacks
  make the rule noisy. — **DONE (v0.69.0), flags enabled in one shared config, no split.**
  Re-ran the diagnostic against current code first: all five named runtime dead
  imports/parameters were still dead, plus the one fair-match import
  (`zipToApproxCoords`) and all four E2E fixtures/constants — none had been picked
  up by any spec (grepped before deleting). All deleted. The two compile-time test
  aliases were **not dead code** — `track-schema.ts`'s `_SchemaIsATrack`/
  `_TrackMatchesSchema` are deliberately-unused type guards that fail `tsc` if the
  zod schema and `CodexTrack` diverge; TypeScript's `noUnusedLocals` does not flag
  *exported* declarations (verified with a throwaway repro), so both were exported
  instead of deleted — same guard, compiler-silent now. Turning the flags on for
  real (not just probing) surfaced two more genuinely dead items the 2026-07-23
  audit missed (~20 batches have landed since): `FormsChecklist`'s `HAZARD_LABELS`
  map (superseded by rendering `hazard.label` directly) and
  `cron/notifications/route.ts`'s unused `NotificationDraft` import and
  `EMAIL_CONCURRENCY` constant (the real concurrency control already lives in
  `lib/notifications/outbox.ts`'s `SEND_CONCURRENCY` — not a wiring bug, a leftover
  duplicate). One more surfaced this way: `usePlotBuildings.ts`'s `sellBuilding`
  captured `++opSeq.current` into an unread `mySeq` — the increment's side effect
  was the whole point (a v0.61.0 guard), the captured value was pure noise;
  changed to a bare `opSeq.current++`, no behavior change. **The suggested
  separate test config was not built**: measured noise from turning both flags on
  across the WHOLE `apps/web/tsconfig.json` program (production + `e2e/` +
  `test/` + `lib/ops/codex/__tests__`) was 18 diagnostics total, all listed above,
  all now fixed or exported — not enough to justify a second config. Split
  declined for the same reason several others have been in this section: no
  ongoing noise to isolate, add a relaxed test config later only if real fixture
  noise materializes.
- `ApiError` names two different client/server concepts in `lib/api/client.ts` and
  `lib/api/with-route.ts`; rename them by role or create a carefully shared status error.
  — **STILL OPEN (v0.69.0 attempted and REVERTED).** The rename was implemented (the server-side
  `with-route` one → `RouteError`, 6 call sites vs. the client one's 24) and it **broke**
  `e2e/synthesis-matrix.spec.ts`: 14 passed / 1 failed twice with it, 17 passed with it stashed,
  17 passed again with only the rename reverted and the rest of the batch kept. Typecheck, lint,
  vitest and `next build` were all green — only the browser caught it. `SynthesisMatrixEditor`
  failed to mount (`synthesis-grid` never rendered), which points at `useSynthesisMatrix`'s load
  path rather than the routes. A rename with no user-facing benefit is not worth a broken
  feature; whoever retries this should start from that evidence. —
  **DONE (v0.69.0): renamed by role, not merged.** Counted call sites first: 24 files
  import/use the browser-side `ApiError` from `lib/api/client.ts` (thrown by `requestJson`
  on a non-OK fetch response — load-bearing across v0.58.0/v0.59.0/v0.64.0 and others), while
  only 6 files actually throw/catch the server-side one from `lib/api/with-route.ts` (11
  import `withTeamRoute` from that module, but 5 of those never touch `ApiError` itself).
  Renamed the smaller one — `lib/api/with-route.ts`'s `ApiError` → `RouteError` — a
  mechanical rename (same fields, same `instanceof` check inside `withTeamRoute`'s own
  catch, same six call sites: `literature/synthesis/route.ts`,
  `literature/synthesis/[id]/route.ts`, `team/join/route.ts`, `team/location/route.ts`,
  `team/invite/route.ts`, `showcase/asset/[id]/route.ts`). The client-side `ApiError` is
  untouched.
- Feature contracts still live in component-local `api.ts`/`types.ts` files across literature,
  data terminal, failure/project log, discovery, and teacher detail. `lib/discovery/treeApi.ts`
  is browser networking under a server-looking directory.
- PvP Prisma models remain without implemented runtime behavior while `/api/pvp` returns 501
  and UI pages contain placeholders. Keep or remove them through one explicit post-pilot
  decision; do not advertise PvP as shipped.
- `Team.classId` is intentionally vestigial. Removing it needs a migration/data audit, not
  another authorization interpretation.
- `packages/shared-types` is not web-only: seed/tooling code also consumes it. The previous
  “delete unless another runtime consumes it” wording was too narrow.
- No whole production file was proven dead strongly enough to recommend deletion solely from
  import scans. `StubFeature` is live only for intentionally excluded PvP. Regex import graphs
  have false positives around Next entries, dynamic imports, barrels, generated modules, and
  test-only consumers; add a configured dead-export/dependency tool rather than deleting from a
  filename search.

Compact code by centralizing rules, not by maximizing cleverness. A 500-line state machine
with one owner is preferable to several short files that duplicate authority, cost, or
transaction behavior.

### 0.8 Counter-audit: what was not yet accounted for

The earlier existence-focused passes concentrated on code that exists. The “negative-space”
pass asked
what a pilot operator, teacher, student, or attacker will need that has **no complete runtime
path at all**. PvP is intentionally excluded from this section and from pilot-readiness
accounting because it is owned by a separate developer.

The placeholder/501 sweep found **no non-PvP API route that intentionally returns 501**. Every
non-PvP gateway in `featureRegistry.tsx` maps to a real component; `StubFeature` is used only
for PvP. This means the missing work below is primarily lifecycle, safety, integration,
operations, and content completeness—not six secretly empty core screens. Comments in
`StubFeature.tsx` and `DiscoveryFeature.tsx` claimed the opposite as documentation drift;
`DiscoveryFeature.tsx`'s was corrected in v0.65.0. `StubFeature.tsx` is outside this batch and
still owed.

#### Missing or incomplete product code

| Gap | Evidence in the current tree | Required decision / implementation |
| --- | --- | --- |
| Showcase revision moderation | ~~Approval is a mutable flag~~ — **CLOSED v0.35.0**: approval names a `contentDigest`, every covered write resets it, and the reviewing teacher can open the exact pending revision. | Remaining: report/unpublish/takedown controls for published content. |
| Verified school affiliation | `User.schoolId` is both self-reported profile data and the `school_only` authorization fact. | Add evidence-bearing membership or remove confidentiality claims from `school_only`. |
| Team membership lifecycle | `TeamMember` permits one user in many teams; direct team join adds another membership and changes `activeTeamId`. There is no complete switch/leave/remove/lead-transfer/disband flow. | Decide one-team vs multi-team semantics. If one team, enforce it transactionally. If many, build explicit switching, leave/removal, final-lead transfer, disband, and stale-membership repair. |
| Class lifecycle | Approving another class request overwrites `User.classId`; historical approved requests remain. There is no complete withdraw/transfer/revoke/remove/archive path. | Add an explicit class-membership state/history, teacher removal, student transfer/withdrawal, class archive, and audit events. |
| Account export/deletion | `docs/runbooks/data-export-delete.md` is a manual post-pilot procedure and explicitly says there is no self-service endpoint. No Clerk deletion webhook reconciles identity deletion with the database and R2. | Build an authenticated request plus operator workflow/outbox, idempotent provider/object cleanup, proof of completion, and a rehearsed export/delete test. |
| Retention enforcement | `ShowcaseView` fingerprints have no age-based cleanup. Activity, notification, chat/AI, operation, and teacher-history data do not share a declared retention schedule. | Publish per-model retention, legal holds, and deletion rules; add bounded workers, indexes, metrics, and tests. |
| Google Drive OAuth | Research plans fetch an “Anyone with the link” document. `docs/TODO.md` calls Drive/Docs OAuth launch-needed, but there is no connect/callback route or `GoogleAccount` token model. | Either ship encrypted, revocable OAuth + Docs API sync or explicitly accept public-link documents and remove the “needed for launch” contradiction. |
| Notification destination verification | Any team member can store any syntactically valid email and enable deadline mail; it is not tied to a verified Clerk address and has no verification challenge. | Use a verified primary account email or verify a changed destination before sending student/team information. Add bounce/complaint suppression. |
| Durable consequential work | Paid-operation claims, global/team budgets, email/activity outboxes, and a common lease/retry/dead-letter worker do not yet exist consistently. | Add the narrow PostgreSQL operation/outbox kernel in §0.5; do not add a separate broker for the pilot. |
| Versioned fair-rule/forms workflow | The app has no active rules edition, reviewer, expiry, source digest, or local-fair override. The current form-number guide is factually wrong and omits 2A/2B/2C. | Disable the current guide; ship a qualified-review workflow and a season-bound canonical fixture before relying on it. Include AI-use disclosure/help and local-fair escalation. |
| Fair-data lifecycle | The shipped 2026 dataset has 266 fairs, 265 confirmed dates and 265 registration deadlines, but zero abstract deadlines and no later year. `docs/TODO.md` still describes it as a provisional starter. | Assign annual refresh ownership, source provenance, stale-date alerts, and deadline completeness; correct the stale status document. |
| Curriculum completion and factual sign-off | Field Codex reports 11/29 fields and 66/174 segments: 18 fields/108 segments remain. Its post-ship audit sampled 708/1,096 lessons across four fields and repaired 83 defects, including 45 HIGH (11.7% sample defect rate); most shipped fields have zero post-ship audit coverage. | Restrict the pilot catalog to fully reviewed fields or finish independent post-ship/domain-expert review for every exposed field. Structural/checksum gates are not factual sign-off. |

#### Important surfaces this repository audit still cannot sign off

These are not evidence of a defect; they are honest unknowns that require the real deployment,
accounts, people, or traffic. “No finding” must not be rewritten as “secure.”

- **Production identity:** Clerk session lifetime, shared-device behavior, sign-in enumeration,
  redirect allowlists, verified-email rules, organization/domain settings, and webhook failure.
- **Production data plane:** Supabase runtime role/superuser status, migration drift, pooling,
  statement/lock timeouts, RLS decision, backups, point-in-time recovery, and an actual restore.
- **Storage/CDN:** R2 bucket privacy, CORS, lifecycle rules, object versioning, signed/public
  cache behavior, deletion reconciliation, egress alarms, and malware workflow.
- **Providers:** live Anthropic/OpenAlex/Semantic Scholar/Firecrawl/Google/Resend quotas,
  timeout/error bodies, rate contracts, revocation, degraded behavior, and billing alerts.
- **Release/supply chain:** git-history and production-secret scans, current dependency
  advisories, package/license policy, action provenance, SBOM, artifact signing, and deploy
  rollback. The local live advisory lookup was unavailable, so advisory status is unknown.
- **Real browser/device behavior:** the authenticated Playwright suite, Firefox/WebKit, low-end
  classroom Chromebooks, slow/offline networks, assistive technology, keyboard-only use,
  zoom/reflow, screen readers, reduced motion, and color/contrast with actual students.
- **Capacity and chaos:** synchronized login/onboarding, upload and AI bursts, large rosters,
  overlapping cron invocations, provider/Upstash/Postgres outages, queue drain, connection-pool
  exhaustion, recovery time, and daily spend ceilings.
- **Privacy/legal/abuse operations:** FERPA/COPPA counsel, school agreements and consent,
  data inventory/retention approval, incident response, breach notification, public-content
  reporting/takedown, moderation escalation, support identity verification, and deletion drills.
- **Content and research safety:** domain-expert accuracy, pedagogy, age appropriateness,
  citations/licensing, human-subjects/animal/chemical/biological/medical guidance, rubrics, and
  generated art/content provenance. Automated shape tests do not establish scientific, legal,
  or safety correctness. The form catalog is no longer merely “unverified”: comparison with
  the official current rules proved it materially wrong (P0-R4).
- **Time and locale:** school/fair time zones, DST boundaries, date-only semantics, reminder
  cutoffs, international addresses, locale/language accessibility, and annual dataset rollover.

#### Documentation and test truth

The counter-audit also found status drift that can misdirect future work:

- `docs/TODO.md` describes the fair dataset as provisional/estimated and `docs/SPEC.md` claims
  268 all-estimated entries, while the actual 2026 artifact contains 266 entries, 265 marked
  confirmed; both omit the real gap of zero abstract deadlines.
- `docs/SPEC.md` still asks whether storage quotas exist even though the 2 GB team quota is
  implemented, and leaves team disbanding unresolved despite membership lifecycle depending on
  that decision.
- Several architecture/spec statements describe older UI or feature states. Historical plans
  should be dated and separated from executable requirements.
- The suite is strong at structure and many route policies, but lacks coverage thresholds,
  browser compatibility lanes, moderation-revision tests, lifecycle/deletion tests, production
  configuration tests, and measured load/failure tests. Its real-Postgres suite self-skips in
  normal CI, and its form tests assert the incorrect catalog as expected truth.

Make one current capability/status ledger authoritative. CI should verify machine-checkable
facts (route inventory, migrations, content registration, generated checksums, dataset shape,
and test-gate presence); plans and historical close-outs should link to it instead of copying
claims that silently age.

### 0.9 Complete no-threshold census — extension of the 300-line audit

This is the requested second half of the file census. It did not use 300 lines as a proxy for
importance. Every remaining production/testing file was read or classified with the same
questions used on the long files: responsibility cohesion, correctness, duplication,
unnecessary complexity, authority, failure ordering, stale state, resource bounds, scale,
test truth, and behavior when the caller or user ignores the intended UI path.

The normalized counts below de-duplicate files read at frontend/backend/test seams. The raw
parallel review sets were intentionally overlapping: for example, a browser-facing helper
under `lib/` was checked both as a client seam and as a library, and one test-support file was
read in both the test and configuration passes.

| Normalized production/testing surface | Files ≤300 lines | What was inspected |
| --- | ---: | --- |
| API routes | 98 | Every method, guard, scope, parse, paid/external call, mutation ordering, response, and direct-call behavior |
| Backend/domain/provider libraries | 164 | Invariants, transactions, claims, parsers, caches, provider/LLM boundaries, storage, logs, and failure semantics |
| Pages, components, hooks, stores, client/runtime adapters | 199 | Async ordering, error/empty truth, optimistic rollback, accessibility, responsiveness, state ownership, and contract drift |
| Tests and harnesses | 103 | Assertion strength, real foreign IDs, false skips, fixture isolation, concurrency proof, cleanup, and named-vs-actual behavior |
| Prisma migrations/schema support | 41 | Backfill assumptions, uniqueness/FKs, destructive deploys, historical compatibility, and tenant/cap invariants |
| Configuration and other runtime support | 26 | Next/TypeScript/ESLint/Playwright/package behavior, production flags, generated integration, and unused policy surfaces |
| Operational/build/test scripts | 7 | Secrets, environment loading, fixture mutation, release ordering, and safe reruns |
| Shared packages | 8 | Actual consumers, exported policy, build output, and type ownership |
| CI workflows | 2 | Trigger/secret behavior, environment propagation, database/identity order, artifacts, and enforceability |
| **Total** | **648** | **Complete no-minimum-line-count extension** |

The independent coverage logs were larger because of deliberate seam overlap: the backend
pass read **301** route/library/browser-support candidates (**32,763 lines**); the frontend
pass read **278 unique** small runtime/client/config artifacts and traced their large parents;
the test/ops pass read **104 small test/support files (12,639 lines)**, **38 post-initial
migrations (941 lines)** plus the initial-schema seams, 29 workflow/config/package surfaces,
seven operational scripts, and every current Codex wrapper/content inventory. Those raw
numbers are evidence of coverage, not additive repository totals.

The development-only art generator family remains explicitly optional and outside this
production/testing census. PvP completeness remains excluded because another developer owns
it. Production-consumed sprite manifests/anchors, current Codex adapters, and structural
content gates were still checked because deployed code imports them.

#### Phase-two P1 findings

These are new or materially stronger findings from the small-file pass. `P1-S*` identifiers
keep them distinct from the earlier `P1-R*` register.

| ID | Verified failure | Evidence and adversarial path | Required direction |
| --- | --- | --- | --- |
| **P1-S1 — CLOSED (v0.34.1)** | Single-use team invites are not single-use under concurrency | `app/api/team/join/route.ts` reads `usedByUserId` before taking the team lock, never re-reads/conditionally consumes the invite, then unconditionally overwrites it. Two joiners can both read “unused,” serialize only capacity, and both join. `test/team-join.test.ts` mocks an already-burned invite rather than interleaving the stale snapshot it claims to prove. | Claim with a conditional unused/unexpired update inside the transaction, then test two real PostgreSQL callers. **Done** for the conditional consume (before the membership create, 409 on `count !== 1`) and the interleaved-snapshot unit test; the real two-caller PostgreSQL race belongs to the P1-R14 database lane. |
| **P1-S2 — CLOSED (v0.36.0)** | Class approval/denial has contradictory terminal states | The teacher route pre-reads `pending`; approval re-reads and can silently no-op, while denial writes the stale ID unconditionally. Approve-then-deny can leave the student enrolled with a denied request; deny-then-approve can return success for a no-op. Competing class approvals are last-writer-wins on `User.classId`. | One locked/CAS decision service returning the committed outcome, invalidating incompatible requests, and appending an audit event. **Done:** `decideClassJoin` is the single CAS on `status: 'pending'`, takes a per-student lock before `User.classId`, returns the committed outcome (409 with the standing state on a loss), and marks a replaced approval `superseded`. **Still owed:** the append-only audit event, which belongs to the open "no security audit events" P1 — the row keeps `decidedAt`/`decidedByUserId`, but a re-request resets it. |
| **P1-S3 — CLOSED (v0.36.0)** | Malformed LLM quiz output can mint false proficiency and KP | Quiz generation accepts any non-empty array, not exactly five valid questions. Shared grading accepts any non-empty output; quiz aggregate is divided by returned grades rather than canonical questions. One `q1=100` row—or even a foreign high-scoring ID—can pass a five-question session while omitted stored attempts are zero. Expertise grading uses the safe canonical denominator, but generation can still create a one-question 3–5-question exam. | Runtime schemas with exact generation cardinality, non-empty bounded fields, exact/no-duplicate grade ID sets, and canonical denominators; hostile provider-output tests. **Done:** `parseGeneratedQuestions` enforces exact cardinality and non-blank prompt/key; `aggregateOverQuestions` uses the canonical denominator, ignores foreign ids, and counts a duplicate once. Expertise grading (already safe) now shares the helper. 18 hostile-output tests. |
| **P1-S4 — CLOSED (v0.34.1)** | A quiz-history read failure silently starts new paid work | `components/literature/usePaperQuiz.ts` does not distinguish “no graded session” from a failed/non-OK GET and falls through to `generateQuiz()`. A transient read outage invokes Anthropic, creates another session, and can strand the existing one. | Discriminated read state; generate only on an explicit successful `session:null` response and user intent. **Done:** a failed/non-OK GET sets a recoverable error instead of falling through; generation happens on explicit `session: null` or the student's retry click. |
| **P1-S5 — CLOSED (v0.43.0)** | Paper-processing lease recovery is unfenced | `lib/literature/process-paper.ts` lets a second worker steal a claim after five minutes, but terminal paper/job writes are keyed only by paper ID. The old worker can later overwrite the new worker's success or failure and both can pay. The test covers simultaneous initial claims, not stale-owner takeover. | Claim token/version plus heartbeat; every success/failure transition conditional on ownership; lost-owner no-op and stale-takeover PostgreSQL test. **Done:** `claim_token` rewritten on every claim; both terminal paths are transactions whose FIRST statement is an ownership-predicated `updateMany`, rolled back when it matches nothing, so a taken-over worker writes nothing — and a lost success cannot fall through into the failure path. The cron sweep re-asserts its predicate on the write instead of terminalizing a snapshot by id. **Still owed:** the heartbeat (a slow-but-alive worker is still taken over and its work discarded) and the real two-worker PostgreSQL test, which belongs to the P1-R14 lane. |
| **P1-S6 — CLOSED (v0.37.0)** | Explain-back concurrency duplicates spend and can lower truth | `app/api/papers/[id]/explain/route.ts` reads attempt/best/pass before Anthropic, then locks only after the paid call without re-reading. Concurrent requests can share `attemptNo`, duplicate cost, and let a late lower/failing result overwrite best/pass. The attempt table has no unique sequence constraint. | Pre-call operation claim, fresh state under lock, unique attempt sequence, database `GREATEST`/monotonic pass, and result replay. **Done:** fresh state under the lock (attemptNo, bestScore, passed, KP eligibility), unique `(paperId, userId, attemptNo)`, monotonic pass/best. **Result replay closed in v0.42.0** (`AiOperation`, keyed on paper + student + submitted text). **Still owed:** the pre-call claim for a FIRST attempt — there is no parent row to stamp, though the replay ledger now absorbs the duplicate-spend case that mattered. |
| **P1-S7 — CLOSED (v0.37.0)** | Failure follow-up “one per entry” and daily cap are advisory | Both the existing-follow-up check and daily count happen before the paid call; `ProjectLogFollowup` lacks a unique `projectLogId`. Two requests can both pay/create, overshoot the team daily cap, and race the single answer field. | Unique follow-up-per-log, atomic team/day slots claimed before Anthropic, and conditional unanswered→answered transition. **Done, all three:** unique `projectLogId`; the row IS the claim, created empty before the call under a per-team lock, released on failure and reclaimable after 2 minutes; the answer is an `updateMany` predicated on `response: null`. |
| **P1-S8 — CLOSED (v0.39.0)** | Domain deletion and storage retirement still split across commits | Paper and showcase-asset deletion remove the domain row before calling `orphanObjectKey`; process death leaves an `attached` asset with no live owner, and retry returns 404. Topic change separately deletes rows/bytes and updates topic. Project-log deletion already demonstrates the correct same-transaction ledger transition. | Domain deletion plus ledger orphan/outbox in one database transaction; physical delete remains a retryable worker. Reconcile attached rows without live owners. **Done:** paper deletion, showcase-asset deletion, and the topic-change removal all commit the domain delete and the ledger orphan together. The topic path also stopped calling `deleteObject` directly, so the sweep is once again the single physical-delete site. **Done in v0.39.1:** `reconcileOrphanedAssets()` flips pre-existing `attached` rows with a dead owner, run by the papers cron before the sweep; an unrecognised attach type is left alone rather than guessed at. |
| **P1-S9 — CLOSED (v0.43.0)** | Paid writebacks are versionless | Codex study-plan, research-plan review, and idea-check read a source/hash, call external work, then write without proving that source/version is still current. Slow old work can overwrite new truth; same-input callers can consume multiple daily slots; manual track-array mutation loses concurrent edits. | `(principal/team, operation, sourceHash/version)` claim, reuse, CAS commit, and normalized set mutations. **Done:** study plan stamps `pending_source_hash` at slot reservation and CASes the commit on it, with the paid classifier routed through `runAiOperation` for reuse; review and idea-check take a pre-call claim on `ResearchPlan` (which also makes the idea-check daily cap exact) and commit as a CAS on the exact source columns they worked from, discarding a superseded result rather than presenting it as current. **Still owed:** the normalized `manualTrackSlugs` set mutation (a P2-S1-class read-modify-write, not a paid-writeback gap); a bare source edit with no competing generation still self-heals via the next cache miss instead of being refused at commit. |
| **P1-S10 — CLOSED (v0.40.0)** | Any matched student can rewrite a global fair event and trigger paid crawl | `POST /api/fairs/[id]/sync-deadlines` requires only a team in the same state (or any team for ISEF), calls paid Firecrawl, trusts a cast rather than local `safeParse`, and writes the global shared `FairEvent`. Concurrent callers pay/race; year/date plausibility is weak. | Students read/request refresh only. An admin/background versioned catalog job claims the fair+edition, parses locally, records provenance, stages review, and CAS-publishes. **Done:** claim-with-cooldown elects one crawler (12h cooldown, 2min TTL, released on failure), the response is `safeParse`d locally, the year is bounded, the publish is a CAS on `status: 'estimated'`, and `lastSyncedAt`/`lastSyncedByUserId` give the shared row provenance. **Still open:** moving the trigger to an admin/background job with staged review — a product change, not a safety gap in the current path. |
| **P1-S11 — CLOSED (v0.34.0)** | DOI presence is presented as proof of peer review | `lib/discovery/credibility.ts` explicitly admits DOI-only classification cannot distinguish review status, then returns `peer_reviewed`; upload persistence and UI badge say scientists reviewed it, and the test pins the false inference. DOI registries cover preprints, datasets, reports, software, and other objects; DOI syntax itself conveys no such status. | Represent DOI as identifier/version evidence only; derive review/publication type from trusted metadata and preserve unknown. Add preprint/dataset/reference-DOI fixtures. **Done:** `tierFromDoi` deleted; a raw upload carries `credibilityTier: null` and shows its DOI alone. Deriving a real publication type from trusted metadata remains future work. |
| **P1-S12 — CLOSED (v0.34.0)** | Google Docs validation creates a teacher-facing phishing link | `extractGoogleDocId` matches a Google path substring anywhere in attacker text. The server fetches the real Google export by extracted ID but stores the original raw URL; the teacher view renders that URL as “Open research plan.” `https://evil.example/?next=docs.google.com/document/d/<real-id>` therefore passes fetch validation and becomes a trusted-looking teacher link. | Parse `URL`, require exact `https:` and `docs.google.com` host/path, persist the canonical document ID/URL only, cap redirects/body, and test hostile prefixes/query strings. **Done** except redirect/body caps, which belong to the P2 outbound gateway: `test/google-doc-url.test.ts` pins the hostile prefix/query/subdomain/scheme cases. |
| **P1-S13** | The configured E2E workflow cannot reliably reach the tests | It writes only `.env.local`, but `prisma migrate deploy` receives no exported `DATABASE_URL`; Prisma CLI does not consume Next's `.env.local`. If that is repaired, duplicate database keys make Playwright's first-wins loader and `node --env-file` consumers choose different databases. A fresh service DB then cannot seed because seeding requires Clerk-created users that Playwright setup creates only afterward. | Build one duplicate-free CI environment, export DB vars, migrate, materialize identities against that same DB, seed the exact graph, assert a DB fingerprint, then execute specs. Missing trusted-run secrets must fail. |
| **P1-S14 — CLOSED (v0.43.1)** | A13's production migration assumes uniqueness it never established | The migration backfills `ShowcaseView.day` and immediately creates a unique daily index while claiming historical lifetime dedupe. The initial schema had no uniqueness, and historical `findFirst`→`create` was race-prone. One duplicate pair makes deploy fail. | Preflight/deterministically dedupe or quarantine before the unique index; test replay from dirty historical fixtures. Audit other uniqueness-only migrations by the same rule. **Done:** the by-the-same-rule audit found FOUR instances, not one — `showcase_views` dedupes, and `papers`/`team_shop_buildings`/`discovery_nodes` quarantine (each row is or parents student work). Two more are genuinely safe and recorded as exemptions with reasons. `test/migration-unique-index-policy.test.ts` blocks recurrence; `pnpm verify:migration-preflights` proves each preflight against real PostgreSQL in a rolled-back transaction. **Still owed:** the blast radius — nobody has counted the real duplicates in production, so the fixtures are synthetic rather than a production-sized corpus. |
| **P1-S15 — CLOSED (v0.47.0)** | The browser upload test itself leaks quota/objects | `e2e/paper-upload.spec.ts` directly deletes Paper rows after proving an attached asset exists; it never uses the domain/ledger retirement path. Repeated runs leak test-bucket objects/quota and it also fails to restore the team topic. | Use the authenticated deletion lifecycle and wait for/reconcile reclaim in a test bucket; isolate and restore fixture state in `finally`. **Done:** cleanup goes through `DELETE /api/papers/:id` and the spec asserts the ledger row ends up `orphaned`; the topic is saved and restored in nested `finally` blocks. **Blocked:** there is no test bucket — R2 `nova-lab-assets` is shared with production, so physical reclaim is asserted at the queue rather than by deleting objects. |

Official identifier evidence for P1-S11: Crossref documents record types including
[posted content/preprints](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/posted-content-includes-preprints/);
DataCite describes DOIs for
[software, preprints, physical objects, workflows, and other outputs](https://datacite.org/blog/datacite-dois-for-more-than-just-data/);
and the DOI Foundation says no definitive information should be inferred from
[the DOI name itself](https://www.doi.org/doi-handbook/html/).

#### Phase-two P2 correctness, scale, and contract findings

| ID | Finding | Consequence / correct direction |
| --- | --- | --- |
| **P2-S1** | Count-then-create caps recur in measurements (2,000), synthesis matrices, project-log references, interests, and vocabulary capacity. | Concurrent valid calls exceed advertised caps; use aggregate locks, reserved slots, counters, or database constraints. `skipDuplicates` is not a capacity lock. |
| **P2-S2** | Data Terminal persists unlimited experiments but lists only the newest 200; measurement GET hides overflow at 2,000. | Older valid data becomes unreachable rather than paginated/rejected. Define a real cap or cursor pagination and surface overflow explicitly. |
| **P2-S3** | Team-wide notifications have one shared `readAt`; one member marks them read for every member. Per-user `deadlineDays` are stored but cron always uses defaults, and overlap can duplicate email. | Use per-user receipts or fan-out, generate against actual preferences, and deliver claimed outbox rows. |
| **P2-S4** | Vocabulary uniqueness/cap is global per user while deck/read/review/delete are team-scoped. Curation markers can also permanently suppress terms dropped at capacity, and concurrent reviews accept the same due card. | Change unique key and every build query to `(userId, teamId, termKey)`; persist pending curation output and use a versioned due-card transition. |
| **P2-S5** | Forms lazy seeding promises a unique `formCode` and race-safe `skipDuplicates`, but the schema has no such unique index. | Concurrent GET seed can duplicate; count-based early return can suppress repair. Add a versioned unique upsert migration and seed outside GET. |
| **P2-S6** | More GETs mutate than the documents acknowledge: citations backfill, discovery source cache, forms seed, fair match seed, and paid quiz-retry preparation. | Make domain/catalog writes explicit commands/migrations/jobs; distinguish cache fill, and enforce GET purity in a route contract test. |
| **P2-S7** | Settings performs name/school/idea/lab writes before validating ZIP; research-plan client sends null where the server accepts only optional strings; saved new text can keep old AI results looking current. | Validate/derive everything before one local transaction; make client/server nullability identical; bind result display to source hash/version. |
| **P2-S8** | JSON schemas cap fields only after `req.json()` materializes the complete body. | Add/document an infrastructure byte ceiling and a shared 413 path before allocation; keep Zod semantic caps afterward. |
| **P2-S9** | Anthropic text extraction/output validation is inconsistent across call sites. Several dereference `content[0]` without checking existence/type; generic grading validates only “non-empty array.” | One typed LLM boundary for first-text extraction, stop/error mapping, exact schemas/IDs/cardinality, token/cost telemetry, and fixtures for empty/tool/non-text/malformed output. |
| **P2-S10** | `fetchWithRetry` trusts an arbitrary numeric `Retry-After`, has no total deadline, and does not cancel/consume retry response bodies. Google Doc fetch reads the entire response before truncating. | Clamp per-attempt/total time, cancel retry bodies, parse both header forms, stream byte caps, and revalidate redirects. |
| **P2-S11** | A raw request-derived Wikipedia `title` is still logged on provider failure; the “closed” redaction test only checks a finite variable-name list. | Reopen A7: payload-free structured event and an AST/dataflow-oriented policy or an explicit exhaustive request-field rule. |
| **P2-S12** | Codex content tests hard-code known wrappers rather than compare directory, registry, checksum, and wrapper sets; CI does not run the existing directory-aware `codex:build -- --check`. | Add the check to integrity/CI. Current 11 content/wrapper pairs independently align; this is a future orphan-file gap, not current malformed content. |
| **P2-S13** | CSV import uses `line.split(',')` while export correctly quotes commas, quotes, and newlines. | The application cannot round-trip its own valid CSV. Use a real bounded CSV parser and a hostile round-trip corpus. |
| **P2-S14** | “Days in current phase” is computed from team creation time, and reports can choose a raw stale `activeTeam` relation rather than the canonical membership-backed selection. | Store phase-entered/history or relabel honestly; reuse the canonical selected-membership resolver everywhere. |

#### Phase-two client-state, accessibility, and responsive findings

The repeated pattern is not “React is too verbose.” It is that async state is represented by
booleans and captured arrays instead of versions, owners, and terminal states.

| Family | Verified examples | Correct direction |
| --- | --- | --- |
| Stale reads overwrite newer intent | Article, paper, topic, and Wiki searches have no abort/generation token; paper chat mount replaces a just-sent turn; activity polling overlaps. | Shared feature client returning `idle/loading/success/empty/error`, runtime schema, abort/request generation, and pristine-state guard. |
| Failure looks like legitimate empty/new data | Final topic, interests, citations, experiments, research plan, and the server lab page swallow failures into “choose/create/no items” defaults. | Preserve last good state, show a recoverable error, and never synthesize “brand new lab” from an unknown database failure. |
| Whole-snapshot optimistic rollback loses concurrent work | Paper deletes, interests, synthesis drafts, feedback toggles, and showcase updates restore or apply stale collections. | Keyed mutation ledger with entity/version-scoped rollback and latest-response ownership. |
| Upload/save barriers are missing | Reloaded processing papers never resume polling; temp failed uploads offer a server delete for a fake ID; attachment upload can re-add a removed URL; a form can unmount while upload is still in flight. | Persist/resume server jobs, distinguish client placeholders, and make upload completion a prerequisite or cancellable transaction for save/unmount. |
| Overlapping saves write stale truth | Rubric blur plus Save emits two PUTs; showcase save/publish can overlap whole-object writes; research streams clear the last good result and accept truncated EOF; synthesis check does not flush saves. | Mutation IDs/input versions, save barriers, explicit terminal stream events, and CAS responses. |
| Modal/popover architecture is not stack-safe | Every modal listens on `document`; sibling listeners all receive Escape. Existing E2E tolerates both parent and child closing. Custom discovery/teacher dialogs and notification popover omit semantics/focus/Escape. | One stack-aware dialog provider: only topmost handles Escape, reference-count scroll locks, trap/restore focus, and one primitive for confirmations/popovers. |
| Keyboard/name defects | Upload source is a clickable `div`; Vega's icon send button is unnamed; showcase visual field captions are not labels; topic autocomplete lacks combobox/listbox semantics. | Native controls/labels and a focused accessibility assertion for each interactive state, not only an axe scan of the default tab. |
| Responsive/device gaps | Discovery uses fixed/no-wrap desktop panels and a mouse-only resize handle; teacher nav/table lack narrow-screen overflow; charts lack text alternatives. | Pointer/touch/keyboard resizing, phone-width layouts, overflow strategy, tabular chart alternative, and real device/browser tests. |
| Global paste handler captures unrelated inputs | YouTube viewer intercepts YouTube URLs pasted into other fields. | Scope paste handling to the viewer input or an explicit add action. |

#### Tests, migrations, and release truth

- `issue-6.spec.ts` accepts a no-op filter, generic text instead of named profile fields,
  either populated buildings or an empty state, counters instead of a paper list, and a
  fabricated nonexistent ID instead of a real foreign-team ID. `F8-reports.spec.ts` can pass
  if both compared endpoints leak the same foreign set.
- Placement, topic-removal, paper-upload, and rubric E2E mutate shared canonical fixtures and
  do not restore the original state. The seeder can select any class owned by the teacher and
  any globally named E2E team, then rewrite unrelated users/team links.
- Paid-work, route-guard, and cron static tests search for text anywhere in a file/import
  pattern. They cannot prove early return or per-method control; the dynamic route-policy
  harness is stronger but incomplete.
- The upload reservation “ordering” test records only the advisory lock, not quota read and
  row creation, so it cannot prove the order named by the test. The real PostgreSQL suite
  self-skips when the database is absent.
- CI uses only the GitHub Playwright reporter but uploads `playwright-report`; traces live
  under `test-results`, so the evidence needed to debug a failure is discarded.
- The current 11 Codex tracks passed an independent identifier/ordering/duplicate check. That
  positive result does not make a hard-coded inventory gate exhaustive.

#### Redundancy, file shape, and compactness

Removing lines is not the target. The target is one owner for each rule and one state machine
for each workflow.

- Small files can still be god functions. High-branch short workflows include
  `lib/research-plan/idea-check-service.ts`, `app/api/showcase/route.ts`,
  `components/research-plan/useResearchPlan.ts`, `components/literature/usePaperQuiz.ts`,
  `lib/research-plan/review-service.ts`, `components/lab/TeamPanel.tsx`,
  `components/showcase/useShowcaseEditor.ts`, `components/literature/useSynthesisMatrix.ts`,
  and `components/ops/project-log/ProjectLogForm.tsx`. Split these by state/command or extract
  shared policy; do not fragment pure helpers merely to lower line counts.
- Paper chat and Vega already implement near-identical history/send lifecycles, but only Vega
  has the pristine-history race guard. This is actionable duplication: use one lifecycle
  adapter with feature-specific endpoints/schema.
- Client requests, modal behavior, optimistic rollback, stream completion, and provider text
  extraction repeat without one contract. Those are the highest-value compaction seams.
- `packages/config/eslint.js` advertises unused-variable rules but the web application never
  extends it. Either make it authoritative or delete/rename it; the current dead central policy
  is worse than an honestly local config.
- The stricter diagnostic TypeScript pass found a small, concrete unused set in production and
  tests. Enable unused checks for production (with a separate test policy if needed) rather
  than periodically rediscovering it.
- No source import was found for direct dependencies
  `@aws-sdk/s3-request-presigner`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `video.js`, or `@types/video.js`. Verify peer/runtime expectations, then
  remove unused direct dependencies; do not remove `react-dom` or `@tiptap/pm` merely because
  they are often peer-facing.
- `packages/shared-types/dist` can retain stale ignored files because the build does not clean
  `outDir`; clean before build/package. This is build hygiene, not evidence those stale files
  ship from a fresh CI checkout.
- `scripts/test-upload.mjs` accepts a Clerk session token as a positional argument visible to
  shell history/process listings. Use an environment variable or stdin.

The scan did **not** prove a dead production module. Apparent Discovery/OpenAlex cycles are
type-only imports, not runtime cycles. The production import graph reached every runtime file
once package-script roots were included. The 29 chart modules, 11 Codex adapters, synthesis
templates, safe Markdown/URL helpers, scoring/economy pure functions, and small runtime
configuration files are cohesive; merging them would make ownership worse.

#### Phase-two counter-audit — rejected and downgraded claims

- All 98 API route files have an intentional auth/cron/public control. That proves inventory,
  not semantic authorization; no naked production API was found.
- Team-scoped IDOR patterns are generally strong. Project-log transactional orphaning,
  active-membership resolution, private R2 streaming, conditional economy claims, expertise
  grading ownership/token, and synthesis KP locking are patterns to reuse.
- Expertise grading does **not** share the quiz denominator defect: it reduces over canonical
  questions and treats missing model rows as zero. Its open defect is generation cardinality.
- Discovery daily visit-KP was downgraded: the PostgreSQL upsert may serialize the row. Do not
  call it exploitable until a real-database race proves overflow.
- No client XSS/open redirect survived the countercheck: Wiki content is sanitized, showcase
  embeds are allowlisted, and Markdown uses the safe link policy. The Google Docs issue is
  different: validation stores an attacker-controlled non-Google link behind trusted wording.
- Discovery optimistic writes rehydrate through the store; they are not permanent-loss
  defects. The remaining concerns are ordering and user-visible truth.
- The current Codex content set is structurally aligned. The defect is future inventory
  exhaustiveness, not a claim that current content is malformed or an art-generation issue.
- No line-count-only deletion/split is recommended. Pure algorithms and static adapters stay
  small or large according to their cohesive responsibility.

#### Architecture delta after both file censuses

Keep the modular monolith, but add five narrowly owned kernels before broad cosmetic refactors:

1. **Command/operation kernel:** idempotency key, source/version hash, atomic budget slot,
   owner token/lease/heartbeat, fenced terminal CAS, and result replay. Use it for paid LLM/
   Firecrawl work, paper jobs, phase changes, and destructive proposals.
2. **Strict provider boundary:** exact runtime schemas, canonical model registry, first-text
   extraction, cardinality/ID-set validation, total timeout/body/redirect policy, redacted
   errors, token/cost telemetry, and kill switch.
3. **Transactional lifecycle/outbox:** domain mutation and durable asset/email/activity/audit
   intent commit together; bounded workers retry with leases/dead letters/reconciliation.
4. **Client async-state kernel:** typed feature clients; discriminated load state; abort/
   generation IDs; entity-scoped optimistic mutations; explicit save/upload/stream barriers.
5. **Release-test kernel:** one canonical environment and fixture identity graph, mandatory
   PostgreSQL race lane, exact foreign fixtures, migration replay from dirty history, executed-
   criteria accounting, and retained browser traces.

Add a stack-aware dialog primitive and verified-affiliation/revisioned-content models beside
those kernels. Do not create microservices, a generic repository layer, or a repository-wide
folder migration to solve defects that are ownership and state-transition problems.

### 0.10 Remediation sequence and pilot gate

1. **Remove harmful guidance and stop privacy/moderation widening:** disable and correct the
   ISEF forms guide under qualified review; separate verified school membership; disable unsafe
   `school_only` semantics until migrated; bind showcase approval to an inspectable immutable
   revision. Open teacher registration is accepted and is not on this launch path.
2. **Restore trustworthy gates and state:** repair the E2E environment/identity/seed order;
   run required PostgreSQL invariants; make A13 migration safe; retain failure traces; reject
   foreign/cyclic discovery graphs; replace false-green real-ID/ordering/cleanup tests.
3. **Close direct concurrency/economy paths:** atomically claim team invites and class
   decisions; validate exact quiz/expertise model outputs; claim quiz/explanation/follow-up
   submissions; fence paper-processing leases; flush synthesis writes before checks.
4. **Make commands server-owned:** capability matrix, destructive proposal tokens, conditional
   phase transitions, global-fair admin workflow, and atomic AI budgets/idempotency.
5. **Fail paid/provider work safely:** Upstash error validation/fail-closed, strict LLM/output
   gateway, total outbound deadlines/byte caps, team/global budgets and kill switch.
6. **Make authority and side effects recoverable:** explicit team/class lifecycle, account
   export/deletion, retention workers, transactional storage orphaning, notification receipts/
   claims/email outbox, activity/audit outbox, bounded fenced paper workers, and reconciliation.
7. **Close sharing, network, file, and research-integrity boundaries:** canonical Google Docs
   links, strong revocable share tokens, outbound gateway, response caps, image re-encode, URL
   sink policy, neutral DOI classification, stricter origin/CSP policy.
8. **Repair client truth before polish:** typed load/error states, cancellation/versioned
   responses, upload/save/stream barriers, stack-safe dialogs, keyboard names/controls, and
   phone-width/assistive-technology coverage.
9. **Bind the release process:** active branch protection, non-skipping same-repo E2E,
   secret/SCA scans, action SHA pins, restore drill, production secret/bucket verification.
10. **Close or explicitly accept missing launch paths:** Google Drive OAuth vs public-link
   documents, verified notification destinations, fair deadline refresh, and the exact
   curriculum fields exposed to the pilot.
11. **Prove the pilot envelope:** real Postgres/browser/load/failure tests; Firefox/WebKit;
   privacy and deletion tests; domain-expert content review; spend/latency/backlog alerts.
12. **Refactor by vertical slice:** contracts/clients, CSS layers, large mixed UI/store files,
   reward service, teacher policy resolver. Avoid repository-wide movement.

Pilot sign-off requires every P0 closed, every P1 closed or explicitly accepted by the owner
with a date and compensating control, legal/minors/privacy approval, a successful restore
drill, enforceable CI, and a measured capacity test matching the actual classroom plan.

### 0.11 Remediation close-out — running log

Each batch closes findings in severity-then-size order and updates this table plus
`docs/CHANGELOG.md`. A finding is **CLOSED** only when the exploit path is gone and a test
fails if it returns; anything narrower is recorded as **PARTIAL** with what is still owed.

#### v0.34.0 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P0-R2** `school_only` trusts self-asserted school | **CLOSED** | Level withdrawn: `canViewShowcase` denies every non-owner, removed from `PRIVACY_OPTIONS` and the accepted `PATCH /api/showcase` values, legacy rows degrade to team-only. Attack pinned in `test/showcase-public-asset.test.ts` (404, no bytes). | Verified `SchoolMembership` if the level is ever re-offered — now optional product work, not a blocker. |
| **P0-R4** ISEF forms guide is materially wrong | **CLOSED** | Versioned `ISEF_EDITION` (2027 codes/titles, source URLs, `sourcedAt`); applicability/timing fail closed behind `reviewedBy`; the 170-line unreviewed guide prose deleted; wrong-mapping tests replaced. | Qualified teacher/SRC review to set `reviewedBy` and restore applicability; season-bound AI-use disclosure contract. |
| **P0-R3** Showcase approval not bound to a revision | **OPEN in this batch — closed in v0.35.0 below** | — | — |
| **P1-R4** Limiter failure removes the paid ceiling | **CLOSED** | Pipeline shape + per-element errors + numeric `INCR` validated; `RateLimitStoreError` thrown instead of a fabricated `count = 1`; paid tiers 503, read/mutate fail open and log. | Circuit breaker; one deployment-guaranteed client-IP header. |
| **P1-S11** DOI presented as peer review | **CLOSED** | `tierFromDoi` deleted; uploads carry `credibilityTier: null` and display the DOI as an identifier. | Real publication-type derivation from trusted metadata. |
| **P1-S12** Google Docs substring match | **CLOSED** | URL parsed; exact `https:` + `docs.google.com` host and `/document/d/<id>` path; only the canonical URL is persisted. Hostile prefix/query/subdomain/scheme cases pinned. | Redirect and body caps — belongs to the P2 outbound gateway. |
| **P1-R16** Count-based seeders suppress corrections | **PARTIAL** — fairs half closed in v0.44.0 | Forms seeding keys on code coverage, not row count; the route serves the authored edition and filters retired codes. | `seedFairsBatched`; edition digest/retirement for the fair catalog. **Done in v0.44.0.** |

| **P2-S5** `form_code` has no unique index | **CLOSED** | Migration `20260725120000_forms_catalog_unique_code` dedupes (keep lowest id, drop/repoint conflicting `team_form_status` rows) **before** creating the index — P1-S14's lesson applied prospectively. | Same preflight audit for A13's existing `ShowcaseView` migration (P1-S14 itself). |

Gates 1–5 pass; Vitest 90 files / 1,299 tests. The migration is created and unapplied, per the
project's deploy convention.

#### v0.34.1 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R10** Discovery accepts foreign parents and cycles | **CLOSED** | `assertValidTreeGraph` runs before any write: batch cap, unique ids, no self-edge, same-team-or-in-batch parents, no cycle, depth cap. `TreeGraphError` → 400. Source/article branches rethrow anything that isn't `P2002` instead of reporting `{ok:true}`. `depthOf` gained a visited set. | Composite `(teamId, id)` tenant FK; O(n²) subtree scans; cycle-unsafe SVG layout in `DiscoveryTree.tsx`; total-depth cap (needs a recursive CTE). |
| **P1-S1** Invites not single-use under concurrency | **CLOSED** | Conditional `updateMany` (unused + unexpired) consumes the code **before** the membership row exists; `count !== 1` → 409 and full rollback. Unit test now interleaves the stale snapshot it claimed to prove. | The two-caller real-PostgreSQL race, which belongs to the P1-R14 database lane. |
| **P1-S4** Failed quiz-history GET starts paid work | **CLOSED** | Read failure sets a recoverable error; generation requires an explicit successful `session: null` or the student's retry click. | — |

Gates 1–5 pass; Vitest 91 files / 1,310 tests.

#### v0.35.0 — 2026-07-25 — **all three P0 blockers now closed**

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P0-R3** Showcase approval is a mutable flag and the reviewer cannot inspect the submission | **CLOSED** | `contentDigest` covers every field and asset an approval applies to (JSON-framed, asset-order independent); `approvedDigest` names the reviewed revision; `syncShowcaseRevision` runs on all four write paths and atomically resets an approved showcase to `pending_review` with a `revision_invalidated` event. `ShowcaseViewer.moderatorTeamIds` grants the team's teacher every revision through the single `canViewShowcase` predicate, so the public page and the asset-stream route both admit the reviewer — scoped to teams they teach. Decisions are a CAS on the echoed digest (409 on a mid-review edit). `ShowcaseModerationEvent` is append-only. The migration fails closed on backfill. | Report/unpublish/takedown controls; P1-R7's share token, which is what makes the `link_only` acceptance genuinely unlisted. |

**Closing the P0s is not pilot sign-off.** §0.10 still requires the P1 program, legal/minors/
privacy approval, a restore drill, enforceable CI, and a measured capacity test.

#### v0.35.1 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R7** `link_only` protected by a 24-bit slug suffix | **CLOSED** | Unique 128-bit `shareToken`; `canViewShowcase(sc, viewer, via)` opens `link_only` only for `via === 'share_token'` (default `'slug'` fails closed); the page resolves by slug **or** token; the asset-stream route takes `?t=` so the bytes are gated identically; rotation revokes and is exposed in the editor. Existing `link_only` URLs break by design. | Enumeration alerting. Digest-only storage, expiry, and edge throttling are documented non-goals with reasons. |

E2E `F4` AC3/AC3b/AC4 were rewritten for the new contract but **not executed** — they need the
dev server, database, and Clerk credentials.

#### v0.35.2 — 2026-07-25 — test backfill

54 tests over 6 files covering the v0.34.0–v0.35.1 **wiring** (seeding, route policy, which
write paths call what) rather than the pure functions, which were tested as written. Not
covered: `usePaperQuiz` (P1-S4) and `FormsChecklist` are React units and the suite is node-only
— no jsdom or testing-library.

#### v0.36.0 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-S2** Class approve/deny contradictory terminal states | **CLOSED** | `decideClassJoin` is one CAS on `status: 'pending'` returning the committed outcome; the loser gets 409 with the standing state instead of a false success. A per-student advisory lock precedes the `User.classId` write, and a replaced approval becomes `superseded` (new status — no teacher refused it). The route's query is now purely the ownership check. | The append-only audit event (belongs to the open security-events P1): a re-request still resets `decidedAt`/`decidedByUserId`. Un-enrolling an approved student is class removal — P1-R8. |
| **P1-S3** Malformed model output mints proficiency/KP | **CLOSED** | `parseGeneratedQuestions` requires exactly `QUIZ_QUESTION_COUNT` elements with non-blank prompt and key; `aggregateOverQuestions` divides by the canonical questions, treats an ungraded question as 0, ignores foreign ids, and counts a duplicate once. Expertise grading (already safe) shares the helper so the rule has one owner. | Generation cardinality for the retry extra-question path; the operation claims in P1-R11/P1-S6/P1-S7. |

The route-policy harness now no-ops `pg_advisory_xact_lock` specifically (it is single-threaded,
so a lock has nothing to serialize) and still throws on any other raw SQL. Without that, every
lock-guarded route was untestable for authorization.

#### v0.37.0 — 2026-07-25 — the pre-call-claim family

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R11** Retry pays twice; a late failure overwrites a pass | **CLOSED** | `retryGradeClaimedAt` elects one grader before the paid call (A8's pattern, 2-min TTL, released on generation/grading failure, cleared on commit). The session write is monotonic — `score` max, `passed` OR — from an in-lock re-read, so a late low retry can no longer contradict `PaperProficiency.demonstrated`. | Answer-hash binding and completed-result replay (P1-R3 ledger); the grade/retry persistence clone (SVC-1); the real-Postgres race test (P1-R14 lane). |
| **P1-S6** Explain-back duplicates spend and can lower truth | **CLOSED** | `attemptNo`, `bestScore`, `passed`, and KP eligibility are all re-read inside the per-(paper, user) transaction. `(paperId, userId, attemptNo)` is unique; the migration renumbers historical collisions by creation order rather than deleting student work. | A pre-call claim for a FIRST attempt — there is no parent row to stamp yet; concurrent first attempts are bounded by the `ai` tier and now collide on the unique sequence instead of corrupting it. Plus result replay (P1-R3). |
| **P1-S7** Follow-up per-entry and daily caps are advisory | **CLOSED** | `projectLogId` unique; the row IS the claim, created empty before the model call under a per-team lock so the daily count and the claim commit together. Failure releases it; a claim orphaned by a crash is reclaimable after 2 minutes. The answer write is an `updateMany` predicated on `response: null`. | — |

#### v0.38.0 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R1** Destructive confirmations are client assertions | **CLOSED for the bypass** | `DestructiveProposal` binds actor, team, command, exact target ids (SHA-256, order-insensitive, JSON-framed), old/new topic, and a 10-minute expiry; consumption is a single-use CAS. Topic removal now requires the matching token; the tree reset went from no confirmation at all to two-phase, with the token bound to the node set that existed when it was issued. All failure modes answer identically, so the endpoint is not an oracle. | The member/lead/teacher/admin **capability matrix** — who may destroy shared work is a product decision, deliberately not made here. The proposal does not stop a determined caller from making both calls in sequence. Also open: the audit's preferred "mark papers out-of-scope rather than delete" model. |

The v0.28.0 `test/topic-removal.test.ts` asserted phase 2 with `confirmRemoveIds` alone — it
pinned the bypass rather than preventing it. It now asserts the opposite.

#### v0.39.0 — 2026-07-25 — storage lifecycle

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R12** Sweep terminalizes before the physical delete | **CLOSED** (team-cascade half in v0.39.1) | Intermediate `deleting` status + `deleteLeaseAt`/`deleteAttempts`. Claim → delete object → terminalize. A stale lease is re-selected, so a crashed worker's claim is recovered instead of leaking a live object behind a terminal row. A failed delete stays `deleting` for the lease rather than restoring the prior status — one recovery path, not two. The `decodeURIComponent` 500 on malformed legacy attachment URLs is guarded. | The tombstone/outbox that survives **team** deletion (`UploadedAsset.teamId` still cascades). Bucket-vs-ledger reconciliation and stale/terminal alerting. |
| **P1-S8** Domain deletion split from storage retirement | **CLOSED** | Paper deletion, showcase-asset deletion, and topic-change removal each commit the domain delete and the ledger orphan in ONE transaction. The topic path additionally stopped calling `deleteObject` directly, restoring the sweep as the single physical-delete site. | Reconciling pre-existing `attached` rows that already have no live owner. |

#### v0.39.1 / v0.40.0 — 2026-07-25

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R12** team-cascade half | **CLOSED** | `uploaded_assets.team_id` is now `ON DELETE RESTRICT`: a future team-deletion command must retire assets first instead of silently destroying the ledger and stranding R2 objects. | Bucket-vs-ledger reconciliation (R2 inventory side) and stale/terminal alerting. |
| **P1-S8** reconciliation half | **CLOSED** | `reconcileOrphanedAssets()` flips pre-existing `attached` rows whose owner is gone; the papers cron runs it before the sweep. An unrecognised attach type is left alone rather than guessed at. Run against the real dev database it repaired **18 of 19** attached rows — the defect was not theoretical. | — |
| **P1-S10** Student-triggered paid global fair sync | **CLOSED** | Claim-with-cooldown elects one crawler; response `safeParse`d rather than cast; year bounded to a plausible window; publish is a CAS on `status: 'estimated'` so curated data cannot be downgraded; `lastSyncedAt`/`lastSyncedByUserId` provenance. | Moving the trigger to an admin/background job with staged review — a product change. |
| **P1-R2** Paid phase advance races and can roll a lab backwards | **CLOSED** | `Team.advanceClaimedAt` elects one payer before the Haiku call (2-min TTL, released on failure), predicated on the phase so it also serves as the state check. The transition is a CAS on `phase: 'literature_review'`; a team that advanced meanwhile is reported as-is (`alreadyAdvanced`) rather than dragged back, and no phase-advance is logged that did not happen. | Wiring the v0.42.0 replay ledger into this third call site (`phase_advance_classify` is defined but not yet used). |

#### v0.42.0 — 2026-07-25 — result replay

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R3** (replay half) | **CLOSED**; budget half open | `AiOperation` + `runAiOperation()`: unique `(operation, idempotencyKey)` over a JSON-framed hash of the inputs. Replay, in-flight 409, TTL/failed takeover guarded on the status just read, failures never replayed as results, and no transaction client in the signature. Wired into quiz-retry grading (P1-R11) and explain-back (P1-S6). | The **budget** half of P1-R3: atomic daily AI slots, per-team/global caps, token/cost accounting, and a kill switch. `phase_advance_classify` is declared but not yet wired. |

#### v0.43.0 — 2026-07-25 — fencing and versioned writebacks

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-S5** Paper-processing lease recovery is unfenced | **CLOSED** | `paper_processing_jobs.claim_token` is rewritten on every claim, stale takeovers included. Both terminal paths open an interactive transaction, run the job transition FIRST as an `updateMany` predicated on `(paperId, status: 'running', claimToken)`, and roll back when it matches nothing — so a taken-over worker writes neither `ready`, nor the citation, nor a competing `failed`. The rollback is a distinct `LostClaimError` caught before the retry bookkeeping, so a lost SUCCESS cannot fall through and be recorded as a failure. The cron's stuck-job sweep now re-asserts its full selection predicate on the WRITE (it terminalized by `paperId IN (…)` against a snapshot) and scopes the paper update to the jobs that transaction actually terminalized. | The real two-worker PostgreSQL takeover test (P1-R14 lane). A **heartbeat**: a genuinely slow-but-alive worker is still taken over at five minutes and its work discarded — correct, but wasteful. The audit's suggested claim *version* is a token here; a token cannot order two takeovers, only distinguish them. |
| **P1-S9** Paid writebacks are versionless | **CLOSED** for all three sites | **Study plan:** the daily-slot reservation also stamps `pending_source_hash`; the commit is a CAS on it, so an older generation cannot land on a newer one — the loser is handed the newer plan labelled `cached`. The paid classifier runs through `runAiOperation` (`study_plan_tracks`), closing the concurrent double-pay the row-level cache never covered. **Review:** `reviewClaimedAt` claimed before the Sonnet call (5-min TTL, released on every failure path, cleared by the successful commit); the commit is an `updateMany` predicated on the exact `lastSyncedText`/`projectType`/`projectSubtype` reviewed — a genuine CAS on source columns, not a re-read — and a superseded review is discarded with an explicit event rather than displayed as current. **Idea check:** `ideaCheckClaimedAt` claimed before counting AND before paying, which is what makes the 3/day cap exact instead of advisory; the writeback CASes on the searched text and commits in one transaction with the `IdeaCheck` ledger row (written either way — the search was bought). `lib/research-plan/claim.ts` owns the shape for both plan workflows. | The study-plan CAS detects a competing *generation*, not a bare source edit with no regeneration — that case still self-heals on the next request's cache miss rather than being refused at commit. A crash between the paid idea-check search and the ledger write refunds a slot. The audit's "normalized set mutations" for `manualTrackSlugs` (read-modify-write on an array) is untouched — it is a P2-S1-class capacity/set problem, not a paid-writeback one. |

Gates 1–5 pass; Vitest 107 files / 1,528 tests. Both migrations applied to the local dev
database; devlab verified intact afterwards.

#### v0.43.1 — 2026-07-25 — dedupe before you index

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-S14** A13's migration assumes uniqueness it never established | **CLOSED**, and wider than reported | The audit's "audit other uniqueness-only migrations by the same rule" found the defect **four** times, not once. All four now preflight inside the migration that creates the index — a follow-up migration cannot help, because `CREATE UNIQUE INDEX` has already aborted the deploy by then (Prisma does not enforce checksums on applied migrations here, so amending in place is safe). `showcase_views` **dedupes** (keep the earliest view of each visitor-day; nothing FKs into it). The other three **quarantine** rather than delete, because each row is or parents real student work: `papers` clears `content_hash` on later copies (a Paper parents quizzes, proficiencies, explanations, chat, citations, vocabulary, discovery nodes); `team_shop_buildings` nulls the later occupant's position ("owned but unplaced" is already a supported state, so a team loses a position, not a building it paid KP for); `discovery_nodes` detaches the later node from the paper (deleting it would break the tree AND destroy the `discovery_source_visits` row that is the once-ever KP claim). Two further migrations were reviewed and are genuinely safe — a strictly wider unique replacing a narrower one, and an index on a column the same migration adds — and are recorded as **exemptions with reasons** rather than passed over. `test/migration-unique-index-policy.test.ts` fails any future recurrence; `pnpm verify:migration-preflights` proves each preflight against the real local PostgreSQL (drop index → inject the duplicates the old schema allowed → run the dedupe verbatim → rebuild, all inside a rolled-back transaction). All four pass. | The blast radius. The preflights are proven correct against the dev database's shape; nobody has counted the actual duplicates in production, so how many papers lose duplicate-detection and how many buildings come unplaced is unknown until they run there. The audit's "dirty historical fixtures" are synthetic, not a production-sized corpus. |

The first version of the recurrence guard accepted **any** preceding write to the table — which
`track_a_hardening`'s unrelated `day` backfill satisfied, so it would have passed the exact
migration it exists to catch. It now requires a construct that picks a winner per duplicate
group, with a negative control pinning that false pass shut. The real-Postgres run found the
same bug in the verification script itself; reading the SQL would not have.

Gates 1–5 pass; Vitest 108 files / 1,535 tests. No new migration — four existing ones amended.

#### v0.44.0 — 2026-07-25 — the fair catalog reconciles

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R16** Count-based catalog seeders suppress same-size corrections | **CLOSED** (forms half in v0.34.0) | `seedFairsBatched` opened with `count >= FAIRS.length → return`, so everything below it — the drift repair the comments promised — was unreachable whenever the count already matched. The gate is now the authored edition's **digest**: `FAIRS` is a compile-time constant, so a process that has reconciled to `EDITION_DIGEST` returns with ZERO queries (cheaper than the count it replaces) and a new deploy is a new digest. The digest is logged with the reconcile counts, so the live edition is provable. Keys the edition dropped are **retired** (`Fair.retiredAt`) and excluded from every matching path, not deleted — events, team interests, and notifications hold FKs, and a retired fair is still the history of a team that entered it; a key that reappears is un-retired. Events previously could never be updated at all; an existing `(fairId, year)` row is now refreshed only while it is a pure authored default (`estimated` AND its fair never crawled), and the refresh is an `updateMany` predicated on `status: 'estimated'` so a crawl landing mid-reconcile wins. That is the audit's "separate sourced defaults from local corrections", using the provenance v0.40.0 added. | Reconciling inside a GET is still a mutating read (P2-S6) — the right home is a deploy-time command; the digest memo makes it cheap, not correct-by-design. Corrections are distinguished at **fair** granularity, not per event row, so a fair crawled for one year freezes the dataset out of its other years. Retirement is invisible to teachers: a team already tracking a retired fair is not told. |

The `/api/team/momentum` comment claiming the seeder "is currently only 70/266 seeded and hangs"
— and that switching to `matchFairs()` was therefore blocked — was stale before this batch and
wrong after it. Corrected to state the real remaining reason for the local replica.

Gates 1–5 pass; Vitest 109 files / 1,546 tests. Migration applied; devlab verified intact.

#### v0.45.0 — 2026-07-25 — AI accounting, kill switch, model registry

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R3** budget half | **PARTIAL** — measurement and the stop lever done, enforcement deliberately not | The audit asked for token/cost fields, a per-team ledger, and a global/team kill switch. None existed: nineteen paid entry points behind one 12/min tier, four unrelated per-feature daily caps, **no aggregate at all**, and the highest-volume paths (quiz generation, explain-back, chat) uncapped. `lib/ai/models.ts` is now the single registry of which model runs which call — the model had been a hardcoded literal in sixteen files, making the biggest cost lever a sixteen-file edit; a test fails if a literal reappears. It is a pure refactor: **no call changed model**. `lib/ai/spend.ts` is the one door every paid call goes through, taking the operation as its first argument and supplying the model itself. `AI_KILL_SWITCH` (global, no deploy) + `Team.aiDisabledAt` (per lab) are checked BEFORE the call and **fail closed**. `AiUsage` records team, user, operation, model, the three disjoint input buckets, output tokens, cost, rate version and outcome per call — joining to class and school through `Team`, so attribution is a `GROUP BY`. Cached tokens price separately (read 0.1x, write 1.25x): ten of sixteen sites lead with a cached block, so charging reads at full input rate would overstate exactly the optimised calls. Attribution rides an `AsyncLocalStorage` scope entered by `requireTeamContext`, avoiding a team id threaded through six libraries that have no other reason to know one. | **Enforcement** — nothing is refused for being over budget, and a test pins that shut. Caps set before a week of real classroom data are a guess, and one that fires mid-lesson costs more than it saves. Also owed: moving any call to a cheaper model (now a one-line change, but a separate measured decision); the teacher-facing cost view; a clean 503 on the thirteen non-streaming sites (the money is guarded everywhere, the status code is not); an outbox for dropped `ai_usage` writes; and `phase_advance_classify` still unwrapped by `runAiOperation`. All carried in `docs/TODO.md` → "AI cost review" with the queries to run first. |

Two claims from the preceding analysis were wrong and are corrected in the changelog: Sonnet 5's
introductory pricing ending 2026-08-31 is a **50% rise**, not a doubling; and the "eight paid
sites lack prompt caching" figure was wrong — `paperTextBlock` supplies `cache_control` for four
of them, so ten of sixteen cache, and the six that do not are short prompts below the cacheable
minimum or single-use calls with no second read. No caching work was needed.

Gates 1–5 pass; Vitest 110 files / 1,564 tests. Migration applied; devlab verified intact.

#### v0.46.0 — 2026-07-25 — durable background work

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R5** Background work is durable only in parts | **CLOSED** for two of three bullets; the third is mechanism-complete with a pinned migration list | **Notifications:** the ledger row was written AFTER processing, so two overlapping runs read the same unchecked roster, both processed, and both emailed — `dedupe_key` kept the notification ROW singular but not the SEND, which was driven by a run's in-memory "fresh" list. Teams are now claimed first, fenced by a `claimToken`, with a 5-minute lease so a crashed run's teams are retried rather than stranded; failed and budget-skipped teams are RELEASED rather than made to wait it out. Claim/complete/release are batched per page, keeping the run's query count page-scaled. **Email outbox:** notification rows and outbox entries commit in one transaction, and `(dedupeKey, recipient)` unique makes at-most-once delivery a database property; delivery is a separate claimed pass with a lease, batch bound, attempt cap, and a `failed` parking state. **Paper cron:** the 30-wide `Promise.all` is now four at a time through a shared `lib/concurrency.ts`. **Activity:** `logActivity` served both progression evidence and feed noise while swallowing every failure; split into `recordActivity(tx, …)` (writes in the caller's transaction, THROWS) and `logActivityBestEffort(…)` (named for what it is, at all 30 sites), with `DURABLE_ACTIVITY_ACTIONS` classifying which is which. Migrated: building purchase/sale/upgrade, quiz-retry pass, Codex lesson completion. | Eleven durable-class activity events still write outside a transaction — route handlers whose payload is only known after the domain write, so each is a per-site restructure rather than a rename. `test/activity-durability.test.ts` asserts that list EXACTLY, so it can only shrink deliberately. Outbox delivery is at-most-once, not exactly-once: a crash between provider acceptance and the `sent` write retries. |

Gates 1–5 pass; Vitest 112 files / 1,581 tests. Migration applied; devlab verified intact.

#### v0.47.0 — 2026-07-25 — authoring truth and test hygiene

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R15** Content authoring can return `allClean: true` after producing nothing | **CLOSED** | `allClean` was computed from `dirty`, `lost`, and `contradictions`, all of which are empty when NOTHING WAS ATTEMPTED — so a run whose briefs all died returned green having authored zero lessons. An empty brief is now a **failed segment** (`failedSegments`, returned to the orchestrator), and `allClean` additionally requires lanes to exist and the plan to contain lessons. The fixer's return was ignored, so a fixer that died on a MED/LOW-only round shipped the unit clean with none of its findings applied — the lane is now dirty, and the guard sits ahead of the ship path. The reconciler's return was discarded with no re-detect, so `contradictions` reported what was found rather than what survived — the consistency probe is now a function shared by the detector and a post-reconciliation re-check, with a dead reconciler or dead re-check leaving the originals standing. `codex:merge` installs **atomically**: every artifact is snapshotted, written, and verified with the same `--check` CI runs, and any failure restores the tree. It also ran `main()` on import (so it could never be imported or tested); guarded now, key lists extracted to one exported `SHAPE_KEYS`, and `test/codex-schema-drift.test.ts` parses `types.ts` and fails on drift. Importing it brought 640 lines of content-generating script under `tsc` for the first time; the JSDoc gaps that surfaced are fixed. | The workflow test is a **source-level check** and says so: workflow scripts run sandboxed with no module access and this one ends in a top-level `return`, so its logic cannot be executed under test. It fails when a named guard is deleted — the regression that happened — but cannot prove the guards correct. The audit's "generate one schema representation from the canonical source" is answered with a drift test rather than codegen. |
| **P1-S15** The browser upload test itself leaks quota/objects | **CLOSED** for the lifecycle; the test-bucket half is blocked | The spec proved an upload was correctly ledgered and then tidied up with `e2eDb.paper.deleteMany` — a direct row delete that skipped the route, leaving the `UploadedAsset` row `attached` to a paper that no longer existed. Cleanup now goes through `DELETE /api/papers/:id` (domain delete + ledger orphan in one transaction), and the spec **asserts the row ends up `orphaned`** — provably queued for the sweep. The team topic, set to null in `beforeAll` and never restored, is now saved and put back in nested `finally` blocks so a failed cleanup cannot skip it. | The audit asks for reclaim to be verified "in a test bucket". **There is no test bucket** — R2 `nova-lab-assets` is shared with production, so deleting objects from a test is not safe and the spec asserts the queue state instead. A separate test bucket is the prerequisite. The spec was rewritten but **not executed** (needs dev server, database, Clerk credentials, and a paid ingestion call). |

Gates 1–5 pass; Vitest 114 files / 1,591 tests. No migration in this batch.

#### v0.48.0 — 2026-07-26 — membership lifecycle, and a decision recorded

Two owner decisions landed on 2026-07-26, one as code and one as an accepted risk.

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R8** Team and class authority has no revocation lifecycle | **CLOSED for teams**; the class half is open | Decisions: **one team at a time**, and **archive rather than delete** when the last member leaves. Joining used to add a second membership and merely repoint `activeTeamId`, leaving the old membership live forever — and because teacher visibility is DERIVED from membership, that stale row was stale authorization, not untidy data. There was no leave, remove, lead-transfer, or disband command in the app at all. `lib/team/membership.ts` now owns every transition in one transaction: departing handles lead handover (to the longest-standing remaining member, so a team whose lead left is never stuck), archive-if-last, invite retirement, and clearing `activeTeamId`. `TeamMember` stays **live-only** and departures append to `TeamMembershipEvent` (actor, reason, timestamp) — a `leftAt` tombstone would have needed a filter at ~25 read sites, several of them nested reads no Prisma extension can reach, and one forgotten filter is a live authorization leak. `teacherOwnsTeam` gained an archived-team arm reading the event log, because archiving otherwise made the class's own work product invisible to its teacher — the opposite of the point. New routes: `DELETE /api/team/membership`, `POST /api/team/lead`, `DELETE /api/team/members/[userId]`. | **The class half is untouched**: a newly approved class still overwrites `User.classId`, older approved join-request history remains, and there is no transfer/withdraw/revoke/archive workflow for class membership. Also not built: a teacher-initiated lead reassignment (deliberately separate from "the lead may hand over" — conflating them is how one becomes the other), and UI, **shipped in v0.48.1** — `TeamPanel` now carries the lead's per-member actions and a consequence-stating leave flow, verified against the live dev server (6 passed / 2 skipped) and screenshotted. |
| **P1-R1** capability matrix | **ACCEPTED as-is** — decided, not closed by code | The owner reviewed lead-only, lead-plus-teacher-override, and the non-destructive "mark papers out-of-scope" model, and chose to keep today's behaviour: any team member may destroy shared work. In a three-peer lab a permission gate adds friction without matching safety gain, and the paths are already behind a server-issued, single-use, target-bound proposal rather than a client assertion. | Recorded as an accepted risk alongside `ACCEPTED-R1`: one student can still delete 25 papers their team collected, deliberately, through two confirmed steps. The reversibility model (out-of-scope instead of delete) remains the higher-value change if it is ever revisited. |

Gates 1–5 pass; Vitest 115 files / 1,610 tests. Two migrations applied; devlab verified intact.

#### v0.49.0 — 2026-07-26 — erasure, export, and a retention table with no numbers in it

Per the owner's decision of 2026-07-26: **build the mechanism, leave the numbers blank, and
record what needs filling in.**

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R9** Account deletion, export, and retention are procedures, not system behavior | **CLOSED for the mechanism**; the numbers and the drill are open | The runbook was the implementation: an operator, psql, a table list, and the hope of getting the order right. `DataRequest` is the operation — filing is idempotent per subject/kind/UTC day on a JSON-framed digest, so a double click is one erasure; approval is a CAS held by whoever has `CRON_SECRET`, with **no in-app approve button** because the authority to erase a minor's record is the school's; the worker claim is fenced with a token and a 10-minute lease so two overlapping crons cannot both erase. `DataRequestStep` is the outbox: `(requestId, target)` unique per external system, so a run that dies after deleting the Clerk identity resumes at the NEXT step instead of re-deleting it or silently skipping storage retirement — the thing a psql procedure structurally cannot do. Erasure order is Clerk (auth dies first), then unbound uploads flipped to `orphaned` for the existing sweep — never a direct object delete, preserving the single-physical-delete-site rule from P1-S8/P1-R12 — then one transaction that departs every live membership through the REAL `departTeam` command (a raw `teamMember.deleteMany` would leave `teams.team_lead_id` pointing at a tombstone and skip last-member archiving), deletes the per-student inventory, and tombstones `users`. **The tombstone is the design, not a shortcut:** team-shared authored work — project logs, discovery nodes, the synthesis matrix, experiments, buildings — carries a *required* FK to `users`, and the standing policy is that team artifacts stay with the team, so the row must survive; what makes it an erasure is that `name`/`email`/`clerkUserId` are overwritten with values that identify nobody and route nowhere. **One inventory drives both directions**, so export and deletion cannot drift apart — the failure every pair of hand-written procedures eventually reaches — and `test/data-inventory-drift.test.ts` parses `schema.prisma`, fails on a model or column that no longer exists, and pins the KEEP list by name so moving one into the erasure set is a deliberate edit. **Retention:** `retention_policies` is a per-model table that ships EMPTY; `lib/retention/policies.ts` declares what can be pruned and how; no row and no registry default means never pruned, and a test pins that a 400-day-old row in an unreviewed model survives. One default ships because one was endorsed — `showcase_view` at 90 days. Building the real inventory against the schema also found **three errors in the runbook's own list**: `discovery_source_visits` is the team's once-ever KP claim (P1-S14), not per-student, and `DiscoveryKpDay`/`PvpTrophies`/`PvpRaidQuota` carry no user id at all. | **The numbers.** Eight models' windows are blank and the endorsed 90 is unconfirmed — all of it needs qualified FERPA/COPPA input (`docs/TODO.md` → "Retention windows"). **The drill:** the audit asked for a rehearsal against production-like data; this is unit-tested and E2E-tested, but no erasure has run against a realistic corpus. **Identity of the asker:** nothing proves a request came from a parent or the school rather than the student; that check is out of band, before approval. **The approver has no recorded identity** — the request row records that a decision was made, not who made it; a real approval queue needs the class half of P1-R8 to scope it. **The row-level delete** the tombstone stands in for: eight tables' attribution columns would have to become nullable or point at a shared tombstone user first. **`attached` uploads stay with the team**, so a student's photo inside a teammate's log survives their erasure — consistent with the team-artifact policy, and worth confirming with the school. |

Gates 1–5 pass; Vitest 118 files / 1,633 tests. Migration applied; devlab verified intact and all
three new tables confirmed empty. `e2e/data-requests.spec.ts` run against the live dev server
(4 passed) and the settings section screenshotted.

#### v0.50.0 — 2026-07-26 — one check, one snapshot

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R13** "Check my synthesis" can grade stale cells | **CLOSED** | Cells save on blur and the click that starts a check blurs the textarea in the same gesture, so the paid call raced the save it had just triggered — grading the PREVIOUS database value, caching a verdict for it, and minting KP for content that was not on screen. Four bindings now tie one check to one snapshot. **Serialized saves:** cell PATCHes go through one promise chain, so two overlapping saves cannot resolve out of order and leave an unsaved cell looking saved. **A flush barrier:** `runCheck` awaits that chain, PATCHes everything still dirty in ONE request, and refuses to spend while anything remains unsaved — which is also the audit's "disable the check while a save failed", enforced rather than displayed. Dirty cells are DERIVED from `matrix.cells` (refreshed by every successful PATCH response) instead of a hand-maintained registry: a saved cell leaves the set on its own and a failed save stays in it, so the failure mode of forgetting to clear a flag — paying to grade text the server never received — cannot occur. **An echoed digest:** `toMatrixView` returns a server-issued `inputHash` on every create/get/patch; the check echoes the last one it received and the server 409s BEFORE any spend if its grid no longer hashes to it. Server-issued rather than client-computed, the same CAS shape as the showcase moderation decision, and it keeps sha256 out of the browser. **A commit-time re-hash:** the paid call takes seconds, so the transaction re-reads the whole row — cells, columns AND papers — and re-hashes; a grid that moved gets its verdict returned (it is true of what was submitted) with nothing cached and no KP minted. Separately, `runAiOperation` now wraps the call: the `lastCheckJson` replay cache only ever helped SEQUENTIAL re-checks, because two concurrent clicks both read it before either wrote and both paid. Ownership also moved ahead of body validation, so a foreign matrix id 404s whatever the body says. | `addColumn`/`renameColumn` still call `resetDraftsFrom`, discarding an unsaved cell draft — pre-existing, and now the only path by which a draft vanishes without being saved or graded. It is data loss, not mis-grading, so it is recorded rather than folded in. The 409 tells the student to look again but does not show them WHAT changed; a diff would be kinder. |

Running the spec also surfaced that **AC14 had been failing since v0.45.0** and nobody had noticed:
it asserted one `anthropic().messages.create(` call site, which the `aiCreate` registry refactor
removed, so the regex matched zero. It now pins `aiCreate('synthesis_check'` and forbids a direct
`anthropic().messages.` call — a stricter invariant than the one it replaced. A spec that is never
run is not coverage.

Gates 1–5 pass; Vitest 119 files / 1,640 tests. No migration in this batch. New
`test/synthesis-stale-check.test.ts` was **negative-controlled**: with both guards disabled three
of its tests fail. `e2e/synthesis-matrix.spec.ts` run against the live dev server, 18 passed.

#### v0.51.0 — 2026-07-26 — the E2E pipeline, audited and rebuilt

Not a finding from the register: the owner asked why the browser suite had been consistently
flaky and slow. A full baseline measured it — **326 tests, 263 passed, 10 failed, 5 skipped, 48
"did not run", 13.6 minutes** — and classifying the ten failures answered the question. **Six were
the harness, not the product.**

| Flaw | Evidence | What changed |
| --- | --- | --- |
| **Assertions that had silently stopped asserting** | Three specs pinned `anthropic().messages.create(`, which v0.45.0's `aiCreate` registry removed. They had matched ZERO call sites for five versions. A fourth — `resetTree` in `discovery-helpers.ts` — ignored its own response status, so when v0.38.0 made `DELETE /api/discovery/tree` two-phase it deleted NOTHING and burned a 15s poll instead, failing three specs. A fifth — `topic-removal-confirm` phase 2 — still sent `confirmRemoveIds` without the `proposalToken` P1-R1 made mandatory, so it had been asserting the bypass it exists to prevent. | All 21 source-reading assertions moved to vitest (`test/ai-route-cost-shape.test.ts`, `test/prompt-injection-pins.test.ts`), where they run in gate 3 on every commit. The table carries a **completeness** guard (a new paid module with no entry fails) and a **vacuity** guard (a scan that finds nothing fails) — the second is the direct lesson of this batch. `resetTree` now performs the two-phase delete and asserts every status. `topic-removal-confirm`'s second case was rewritten to the current contract, which is strictly stronger: a substituted id list fails the digest and deletes nothing. |
| **One shared fixture lab, never reset** | 1,732 activity-feed rows, 152 notifications, 49 project logs, 123 uploaded assets accumulated on the fixture team — none seeded. `seed-e2e.mjs` is additive by design and nothing ever cleared it. | `pnpm --filter web reset:e2e` purges through one ordered inventory, scoped by team id so it cannot touch `devlab` in the same database, sweeping stray `[E2E …]` teams too. Removed 2,119 rows on first use. Uploaded assets are **retired, not deleted** (P1-R12: the row is the only proof an object exists, and the bucket is shared with production). |
| **Serial mode multiplies every failure** | 23 of 32 files are `mode: 'serial'` *because of* the shared lab. Ten failures cost **48 further tests that never ran** — 15% of the suite, invisible in the summary. | `e2e/lab.ts`: `createLab()` builds a team that exists only for one spec file and disposes it through the **same** inventory `reset:e2e` uses, so the two cannot drift into a teardown FK error. `synthesis-matrix.spec.ts` converted as the worked example — its hand-rolled fixture graph, its wipe of the shared team, and its whole `afterAll` disappear. |
| **`reuseExistingServer` adopts any process on the port** | Including one without `E2E_SKIP_LLM` — the suite then makes real paid Anthropic calls, presenting as a schema-mismatch 502 that reads like a route regression. Cost a debugging session and real money on 2026-07-26. | A `preflight` project every other project depends on. It proves stub mode via `/api/dev/e2e-health` — **a route that only exists when `E2E_SKIP_LLM=1`**, so presence is evidence rather than self-report — plus `E2E_MOCK_SOURCES`, a same-database fingerprint check (runner and server hash their own DB identity), and the fixture graph. Verified both ways: green against Playwright's server, failing in 3.4s with the remedy against a hand-started `pnpm dev`. |
| **The CI lane could never have worked** | Both jobs provision an empty `postgres:16`, then run `seed:e2e`, which ABORTED when the Clerk-backed `User` rows were absent — always, in an empty database. Nobody noticed: the job is gated on an `E2E_ENV_FILE` secret that is not set, so it reports "skipped" and passes. | The seeder materializes those rows by reading the **real** ids from the Clerk API. The original refusal was right about the risk (a fabricated `clerkUserId` forks an identity) and wrong about the remedy. |

**Measured result: 263 → 292 passed, 10 → 2 failed, 48 → 13 "did not run" (13.6 → 15.5 min — the suite got SLOWER because 35 more tests now actually execute). v0.52.0 finished it: 307 passed, 0 failed, 0 never ran.** The two that remain
(`F4` AC3, `F4-print` AC10) are left RED with a written diagnosis rather than skipped. The product
gate under them was verified correct OUTSIDE Playwright, against both a dev server and a
production build: an anonymous request for a `published + public + pending_review` showcase renders
the not-found page, as does a `private` one, and the route builds dynamic so no cached render is
involved. What is not understood is why the specs' own anonymous contexts see the page.

**Still owed.** Parallelism: `User.activeTeamId` is singular, so one account owns one lab at a time
and the suite still runs one worker — going parallel needs one Clerk account per worker, which
provisions accounts in the owner's instance and is therefore their call. The other 31 specs still
use the shared lab; the primitive and the migration path are documented. `F4` AC3 remains open
(two spec files drive one `@unique` per-team showcase row). And the CI lane is still gated on a
secret that is not configured, so none of this is enforceable until it is added.

Full audit: `docs/runbooks/e2e.md`.

#### v0.52.0 — 2026-07-26 — class membership can end

| Finding | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| **P1-R8** class half | **CLOSED** | Teacher authorization is DERIVED from `User.classId` (`teacherOwnsTeam` matches teams with a member in a class the teacher owns), so an enrolment that should have ended but did not is a teacher who can still open a student's work. There was no way to end one: no withdraw, no leave, no removal — a student could only be moved by being approved somewhere else. `lib/onboarding/class-membership.ts` owns three commands, each of which clears the derived authorization in the SAME transaction as the state change, because a `revoked` request with `classId` still set reads as ended and behaves as live. `withdrawClassRequest` is scoped by putting `userId` in the WRITE predicate rather than a pre-read, so a guessed id matches nothing, and CASes on `pending` so a withdrawal cannot undo a teacher's decision. `removeFromClass` re-checks the class id INSIDE its transaction under the same `class-membership:<userId>` lock `decideClassJoin` takes — the route proves the student is in the teacher's class, and if an approval elsewhere lands in between, the removal is refused rather than executed on an authorization that no longer applies. A still-pending request is retired alongside the approved one, so a removal cannot be silently undone by a request that predates it. `ClassMembershipEvent` is the append-only log: `ClassJoinRequest` is live state that mutates in place — a re-request even resets `decidedAt`/`decidedByUserId` — so the row could say where a student stands but never what happened, which is the same reasoning `TeamMembershipEvent` answers for teams. Two new statuses stop `denied` meaning three things: `withdrawn` (nobody refused) and `revoked` (it happened, then ended). UI in the same batch per the house rule: the student gets a consequence-stating "Leave this class" in `TeamPanel`, and the teacher gets "Remove from class" on the student detail page — deliberately not on the roster row, which is a `<Link>`, and not a thing to do in passing from a list. | Teacher-initiated lead reassignment, unchanged from the team half — a deliberately separate capability. No notification to the student when a teacher removes them; they discover it by looking. The event log has no reader: nothing surfaces class history to a teacher yet. |

Gates 1–5 pass; Vitest 122 files / 1,757 tests. Migration applied; devlab verified intact. The
three attack tests were **negative-controlled**: with the ownership predicate, the pending CAS and
the in-transaction class re-check disabled, exactly those three fail.

#### v0.53.0 — 2026-07-26 — the file-disposition tranche opens

**§0.7's 44-file disposition had never been started.** Every file listed there was still at or
above its audited size. The correctness findings *inside* those files were closed by the P1
batches — that is what most of this log is — but the structural verdicts were untouched, and
nothing in §0.11 had ever claimed otherwise. This batch opens that tranche, highest-defect-first
rather than longest-first, per §0.7's own instruction that line count is a diagnostic and not a
goal.

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/discovery/DiscoveryTree.tsx` | **DONE** | The layout moved to `lib/discovery/tree-layout.ts` — a split with a real justification, not a line count: a graph algorithm with no DOM had been living where only a browser test could reach it, which is why its defects survived. **The audit's "cycle-unsafe" reading was wrong, and running the original proved it:** a node has exactly one `parentId`, so a node in a cycle points *into* the cycle and is a child of nothing outside it — a cycle is never reachable from a root and the recursion never entered one. The three real defects, each measured against the original before the rewrite: it **silently dropped nodes** (an orphan whose parent was absent was never drawn; a pure two-node cycle rendered an EMPTY tree — the rows existed and the UI said otherwise); it **overflowed the stack** on a 5,000-node chain, the exact shape a student builds by clicking through sources (`RangeError`); and it was **quadratic**, `subtreeW` walking each subtree once per node and again per child. The rewrite is iterative with memoized widths and treats orphans and cycle members as extra roots, so a corrupted graph renders displaced rather than invisible. `nodeTreeIndices` shares the same graph build, so the colour grouping and the drawing can no longer disagree. **Accessibility:** all five controls (navigate, star, delete, interest, promote) carried `role="button"` with no `tabIndex` and no key handler — worse than no role, since a screen reader announces a button that cannot be focused or operated. One `svgButton` helper gives them focus, Enter/Space, and a name. The context menu is clamped to the viewport. | The component is still 480 lines and still mixes node chrome with the SVG shell; that part of the disposition is cosmetic and was left. |

`test/discovery-tree-layout.test.ts` (12 tests) pins each measured defect, and the ORIGINAL
implementation was run against every one of those shapes to confirm they are real. The
accessibility half is pinned by a new `a11y.spec.ts` case that seeds its own disposable lab —
the first version skipped on the empty shared fixture, and a skipped accessibility test proves
nothing, which is the false-skip pattern the E2E audit had just finished calling out.
Negative-controlled: removing `tabIndex` fails it in both viewport projects.

Gates 1–5 pass; Vitest 123 files / 1,769 tests.

#### v0.54.0 — 2026-07-26 — a graded surface that lost work quietly

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/ops/ExpertisePanel.tsx` | **Defect DONE; view split LEFT** | Unlike `DiscoveryTree`, **every reading in this verdict was right** — and each was reproduced against the pre-fix code rather than taken on the audit's word. (1) Progress was written with `fetch(...).catch(() => {})`: the response status was never read, so a `mutate`-tier rate limit or a dropped connection produced a student who answered a question, saw it in the chat, pressed a button labelled *"Save & exit — resume anytime"*, and resumed to find it gone — no message at any point, on a **graded** surface. (2) That button fired the status `GET` in the same tick as the still-in-flight `PATCH`, so the `GET` could read the pre-save row: the idle card reported one answer fewer than was given and *Resume* handed back the shorter exam, even in the runs where the write did land. (3) The 650 ms typing timer was never cleared. A **fourth** defect the verdict does not name turned up while measuring (3): `loadStatus` set `mode: 'idle'` unconditionally when it resolved, and `finishResult` fires one in the background by design — so a student who pressed *Begin exam* before it returned was thrown out of the exam the lab had just **paid Claude to generate**. The fix follows v0.53.0's rule for what earns a split: persistence moved to `components/ops/expertiseProgress.ts` not for length but because a save-ordering rule on a graded surface was living where only a browser could reach it, which is why it had never been checked. It serializes writes so two saves cannot commit oldest-last; it holds the unconfirmed snapshot as the **record of failure**, cleared only when the server confirms *that* snapshot; and `flush()` queues one no-op behind the in-flight write, which both waits for it and retries whatever it failed to deliver. Exit is **refused** when flush reports false — the same barrier `useSynthesisMatrix.flushBeforeCheck` takes before it spends (v0.50.0). The status `GET` is now latest-wins, and the final answer is flushed **before** grading, since grading stamps `gradedAt` and the progress route only matches ungraded exams. | The 574-line component is now ~600 and still holds the exam chat, the idle ladder and the result view in one file — the "state machine + views" half of the verdict is cosmetic once the persistence has an owner, and it was left, as `DiscoveryTree`'s node chrome was. No E2E covers the clearance panel at all (it is the only ops tab with none); the refusal path is pinned in vitest only. The grade `POST` still has no abort. |

`components/ops/expertiseProgress.test.ts` (8 tests) pins each reproduced defect.
**Negative-controlled three ways**: clearing the dirty flag before the write lands fails 3 tests,
dropping the flush barrier fails 2, removing serialization fails 1. One line did NOT survive its
negative control — a redundant `await chain` ahead of the retry in `flush()` failed nothing when
removed, because the queued retry already waits on the same chain, so it was deleted rather than
kept as decoration.

Gates 1–5 pass; Vitest 124 files / 1,777 tests.

#### v0.55.0 — 2026-07-26 — the provider does not get to choose the host

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/discovery/openalex.ts` | **HARDENED; split declined** | Three readings, three reproductions. (1) The **host** finding is understated in the register. `getCitedBy` follows `cited_by_api_url` out of the provider's own JSON, and `withMailto` appended `mailto` **and `api_key`** *after* the URL was chosen — so the destination was provider-controlled *and it received `OPENALEX_API_KEY`*. Reproduced: a work whose `cited_by_api_url` named a local listening server got exactly one request, query string carrying `api_key=…`. This is credential exfiltration wearing an SSRF costume, and "one host assertion closes it" (SECURITY.md §3.8) was true only of the SSRF half. `oaUrl()` now builds **every** request in the module, requires `https:` and hostname exactly `api.openalex.org`, and throws **before** the credential is attached. (2) The **uncapped body** finding: reproduced with a chunked 40 MB response buffered whole — and `content-length` was absent, so header inspection would not have caught it. `readCapped`/`readJsonCapped` in `lib/fetch-retry.ts` are the shared ceiling: a streaming counter that cancels the stream at the limit and **throws rather than truncating**. (3) The **asserted JSON** finding: the field mappers (`toWork`, `toNeighbour`, `toNormalized`) already `typeof`-guard everything they touch, so most of the casts were harmless and a full 40-field Work schema would have been a second source of truth for no defect. Two casts actually lied, and both are now filtered: `referenced_works` was asserted `string[]` after only `Array.isArray` (a non-string element reaches `id.replace(...)` and takes the citation lane down), and inverted-index positions were asserted numbers — one out-of-range position wrote into a plain array and sized it, so a **two-word** abstract with a position of 50,000,000 took **1,813 ms** to rebuild, ×50 rows per search page. It is a `Map` keyed by position now, so magnitude is free. The envelope shape (`results` is an array of objects) is `z`-parsed. **The split was declined, with a reason:** §0.7 asked for transport/schema/normalization/search/traversal in separate files, but the entire defect was a request built where the host rule did not reach — moving transport away from its callers is the shape that caused this. | Only this adapter uses the byte cap. Five uncapped provider reads remain: `articles.ts` and `medlineplus.ts` (`res.text()` on feed XML), `patents.ts` and `semanticscholar.ts` (`res.json()`). `lib/research-plan/google-doc.ts` still follows redirects with no post-redirect origin re-check (SECURITY.md §3.8, still `OPEN`). `fetchWithRetry` still trusts any positive `Retry-After` with no total deadline. |

`lib/discovery/openalex.test.ts` (10) and `lib/fetch-retry.test.ts` (5) pin the reproductions
against a real listening server. **Negative-controlled four ways**: deleting the host check fails
all 5 refusal tests; restoring the sparse-array rebuild fails the timing test; removing the byte
counter fails both cap tests. Two lines did not survive: a `content-length` shortcut in
`readCapped` failed nothing when removed (the streaming counter already covers it) and was
deleted; and the first version of the refusal tests asserted `toEqual([])`, which is **also** the
healthy "no citers" answer — three of the five passed with the guard deleted. They now assert the
refusal itself.

Gates 1–5 pass; Vitest 126 files / 1,792 tests.

#### v0.56.0 — 2026-07-26 — a node that vanished, and a delete that never finished

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `stores/discoveryStore.ts` | **Defects DONE; split declined** | Four readings, four reproductions, and the register got two of them out of proportion. (1) **"Fire-and-forget writes can lose state" is right and understates it.** Every mutation is optimistic and a failed POST re-hydrates — the rollback is correct, the server is authoritative — but there was **no write-failure surface anywhere**: `loadError` covers a failed read only. Reproduced: a failed `startExploration` left `nodes: []` and `loadError: false`, so a student watched their node appear and then disappear with no explanation. A `writeError` (message + monotonic nonce) now drives the error Toast that already existed for the add-paper path. (2) **`newTreePending` can lose state** — worse than a lost flag: it was cleared *inside the optimistic apply*, so a create that never happened still spent the student's "start a new tree" intent, and the next source they opened attached to the old tree. `commitOptimistic` hands it back on failure. (3) **The delete could hang the tab.** The audit named O(n²); measured, the quadratic scan costs 48ms on a 2,000-node chain — real, cheap, and not the finding. The BFS never checked whether a child was already queued, so a self-parented row or a two-node cycle **never terminated**. `tree-service.ts` stopped writing those in v0.34.1 and its own `depthOf` still defends against rows written before that guard existed; this path did not, which is the same client/server asymmetry `DiscoveryTree` had in v0.53.0. One children index plus a visited-check fixes both, and an index walk replaces `Array.shift()` (a second hidden O(n)). (4) **The duplicated insert path** — `addSourceNode` and `addArticleNode` were near-identical sixty-line copies, with `addYouTubeVideo` a third. One `attachOne` owns where a node attaches, the parent's depth, marking it explored, and clearing the selection state. `startExploration` stays out: it always creates a root, so it does not share the rule. **The split was declined**: optimistic-apply → persist → rollback → report is one authority, and splitting it into factories/reducer/selectors/feature-client is exactly the "several short files that duplicate authority" §0.7 warns against. | The file is **675 lines, up from 605** — the dedupe saved ~70 and the guards and their reasoning cost more. `branchSources` still reads its dedupe list from a snapshot taken before its `await`s, so a concurrent create can be missed (the DB unique catches it; the local mirror does not). `promoteSource` and `setNodeReflection` still bypass `commitOptimistic` entirely and return/ignore their own errors. No E2E asserts the write-failure toast. |

Eight new cases in `stores/discoveryStore.test.ts`. **Negative-controlled four ways**: removing
the visited-check hangs both cycle tests (4.2s each before the runner gave up); restoring the
per-node rescan fails the linearity test; dropping `writeError` fails 3; dropping the
`newTreePending` restore fails 1. One bug was caught by its own test while being written —
reading the toast nonce back off `writeError` restarts it at 1 every time, because the same
function clears the field first, so a second failure would never have re-fired the toast. It is
a closure counter now.

Gates 1–5 pass; Vitest 126 files / 1,800 tests.

#### v0.57.0 — 2026-07-26 — a cleared score box is not a zero

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/teacher/TeacherRubricScoring.tsx` | **DONE** | Four readings; two reproduced as stated, one understated, one wrong as written. (1) **"Blank numeric input becomes zero" is the serious one and the register undersells it.** The box did `Number(e.target.value)` per keystroke; `Number('') === 0`, so deleting a stored 15 made the local score a real 0 — and because 0 ≠ 15 the blur autosave **PUT it**, then rendered "Last scored by <teacher>" over the top. That is a wrong mark on a student's record written by a UI accident. The box holds TEXT now; `parseScoreInput` returns `null` for blank, which is not a score, is not saved, and restores the stored value on blur rather than leaving a blank the server disagrees with. (2) **"Blur/click autosaves can race" is really a silent DROP.** `save()` opened `if (saving) return`. Reproduced: type a score, tab to notes (blur → save starts), type notes, click away (blur → refused) — **two blurs, one PUT, and the PUT carried the EMPTY notes**. (3) **"Track switching can discard unsaved state" is not right as written.** The toggle click blurs the field first, so the autosave is already in flight and `applySave`'s existing track guard correctly drops the stale result — the data is not lost. What the remount discards is the **failure**: every card remounts under a new `row.key`, so a card whose save then rejects sets `saveError` on a component that no longer exists, and the teacher's typed feedback is gone with nothing said. Failures are reported UP to the panel, which survives the switch. (4) The "Saved" timer is cleaned on re-save and unmount. **Clamping moved to send time** — clamping while typing makes a typed 99 equal a stored 10, and the correcting save then never fires, which is precisely what F10 AC7 asserts must happen. `createSaveQueue` moved from `components/ops/expertiseProgress.ts` to `lib/save-queue.ts`: it was deliberately kept local at one consumer (v0.54.0), and the rubric is the second, needing the same two rules — serialize rather than refuse, and hold the unconfirmed snapshot as the record of failure. | The card still recreates its queue per mount, so a save in flight when a track switch remounts it lands but its result is dropped by the track guard (correct, but the teacher sees no confirmation). No test covers the hoisted failure surface end-to-end — `rubric-save-error` has a testid and no assertion yet. The panel is 423 → ~470 lines; no view split was attempted, and none is owed by a defect. |

`lib/fairs/rubric-scoring.test.ts` gains 9 cases for `parseScoreInput`/`clampScore`;
`lib/save-queue.test.ts` gains the mid-flight-queue case that pins the dropped save.
**Negative-controlled three ways**: treating a blank box as 0 fails the parse test, clamping
inside the parser fails 2, refusing instead of queueing fails 3.

**E2E `F10-teacher-rubric` was re-run against the rewired card: 16/16 pass** — AC3/AC5/AC6
(save, reload, notes persistence) and AC7 (99 clamps to 10) all exercise the changed input path.

Gates 1–5 pass; Vitest 126 files / 1,808 tests.

#### v0.58.0 — 2026-07-26 — a refusal committed as data, and three loaders with no way out

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/ops/CodexTab.tsx` | **DONE** | Three readings, all correct, two understated — plus a fourth defect the verdict does not name. (1) **"Refresh ignores non-OK responses" ends in a crash.** `fetch(...).then(r => r.json()).then((d: ProgressPayload) => setPayload(d))` — no `r.ok`, and `d` cast. On any non-2xx the route's `{ error: "…" }` body became the payload; `if (loadError || !payload)` passed, because an error object is truthy, and `CodexHome` then read `payload.progress.filter(...)` on `undefined`. Reproduced verbatim with a 429: *"Cannot read properties of undefined (reading 'filter')"*. `refresh()` runs after **every completed lesson**, so a rate limit mid-session blanked the tab. Now `requestJson` + a runtime schema in `components/ops/codex/codexApi.ts` — the house rule applied to our own API, not just providers. (2) **The endless loader has no way back.** `loadTrack(view.slug).then(setActiveTrack)` had no `.catch`, and `loadTrack` REJECTS on an unknown slug — and study plans persist slugs, so a track renamed by a Codex merge is exactly that. The student got a spinner and no control at all. (3) **The "stale track" strands the loader permanently.** Two loads in flight resolving oldest-last leave `activeTrack` on the track already left; the render guard `activeTrack.slug !== view.slug` then holds the loader up forever, because nothing re-triggers the effect. Effect cleanup retires the loser. (4) **Not in the verdict:** the home screen's bulk load was a `Promise.all` with no `.catch` — one unknown slug rejected the batch and EVERY card stayed a skeleton. Reproduced: three slugs, one bad, zero loaded. Each settles on its own now. No file split: the disposition asked for "one discriminated load state", and what was missing was a **failure** state per load, which is now there. | The two effect-ordering guards (cleanup-on-navigate, per-slug settle) are the standard React idiom and are **NOT pinned by a test** — two were written and deleted because they restated the rules rather than exercising the component, and a test that cannot fail on a regression is the vacuity the audit itself calls out. E2E `F13-codex` covers the happy path only. `generateStudyPlan` still reads `await res.json()` before checking `res.ok`, which is safe only because it reads `.error`. |

`components/ops/codex/codexApi.test.ts` (4) pins the payload contract against a real local
server. **Negative-controlled**: swapping `requestJson` back for the pre-fix
`fetch().then(r => r.json())` cast fails 3 of the 4.

**E2E `F13-codex` re-run: 16/16.** AC11 drives the study-plan route to a real **429** — the exact
status whose body the tab used to commit as its payload.

**Unrelated flake, fixed in the same batch.** `test/discovery-tree-layout.test.ts`'s linearity
check (added in v0.53.0) compared a 2,000-node run to a 4,000-node run and asserted the ratio was
under 3x. Both are single-digit milliseconds, where scheduler jitter exceeds the signal; it
failed 2 of 8 consecutive runs. It now lays out **100,000** nodes against an absolute 2s budget —
~130ms linear as measured, and out of reach for a quadratic implementation. Five consecutive full
runs green.

Gates 1–5 pass; Vitest 127 files / 1,812 tests.

#### v0.59.0 — 2026-07-26 — the gate that could disappear

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/literature/LiteratureFeature.tsx` | **DONE** | (1) **"Can hide advancement forever" is the batch, and it is exact.** `fetch('/api/team').then(r => r.json())` with no `r.ok`, and a `.catch` whose comment — *"degrade gracefully — leave both null and fall through to first-time path"* — describes a path that does not exist. On any non-2xx the `{ error: "…" }` body was read, `d.phase` came back `undefined`, and `locked && (phase === 'literature_review' || !!researchIdea || !!ideaResult)` went **false**: a team with 25/25 sources in `literature_review` and no idea submitted saw **nothing at all** where the advance box belongs. `[]` deps, so no retry; only a full reload recovered. Reproduced against the original with a 429 body. `getTeamPhase` in the feature's own `api.ts` parses it now, and a failure renders a retry **in the gate's place** — leaving the student who has finished the work with an empty screen is the failure mode, so the fix has to occupy that space. (2) The `setTimeout(router.refresh, 2200)` after a successful advance is cleared on unmount. (3) Three hard-coded `25`s sat beside an imported `TOTAL_SLOTS`. (4) **"Boolean views can overlap" is NOT reachable and the register should say so.** Each of the four is set only by a header button, and the header does not render once any view is open, so a second can never be turned on; had two been true, the fixed check order would render the first and strand the second, whose close button lives in the view that never renders. The single `subview` union shipped because §0.7 asked for it and it is the requested scope — but it removes a class, it does not fix a live defect. | No E2E drives the failed-phase retry (`lit-phase-load-failed` has a testid and no assertion). The topic fetch above it still uses a hand-rolled `r.ok` check rather than the same parsed helper — correct, but two idioms in one file. `advancePhase` still reads `await res.json()` before checking `res.ok`. |

`components/literature/api.test.ts` (4) pins the gate condition **verbatim** against a real local
server, including the pre-fix outcome as a stated contrast. **Negative-controlled**: swapping
`requestJson` back for the cast fails 2 of the 4.

**E2E `synthesis-matrix` re-run: 17/17** — it opens the Literature header's Synthesis button, so
it exercises the replaced subview state end to end.

Gates 1–5 pass; Vitest 128 files / 1,816 tests.

#### v0.60.0 — 2026-07-26 — a reflection overwritten by its own save

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/discovery/SourceReader.tsx` | **Save path DONE; split not attempted** | (1) **A defect the verdict does not name, and the worst of the three.** The draft-reset effect depended on `[nodeId, node?.reflection]`, and the parent calls `setNodeReflection` on a successful save — so a student who clicked back into the box and kept typing while the save was in flight had their newer text **replaced by the older saved text** as it landed. Keyed on `nodeId` alone now: a draft belongs to the student, and only changing source replaces it. (2) **"Blur/button saves can duplicate" is real and benign.** Clicking Save blurs the textarea first (mousedown → blur → mouseup → click) and both handlers called the same function with no in-flight guard — one click, two PATCHes. Reproduced. But no KP is double-paid: `awardDiscoveryVisit` is idempotent per node through the visit ledger's `@@unique`, so this was a wasted write and not the exploit the phrasing suggests. `createSaveQueue` coalesces them. (3) **"or complete after the selection changed" is right**, and it needed two fixes, not one: the snapshot carries its OWN node id (reading the current selection inside the writer would write one source's reflection onto another), and the "✓ saved" badge is bound to the node that was saved — it used to appear over whichever source happened to be open when the save returned. Reproduced. (4) A failed reflection did **nothing at all** — no badge, no message, the hint still reading "Saves when you click away". It says so now, matching the write-failure rule applied in v0.56.0 and v0.57.0. The queue is rebuilt **per node**: coalescing is correct for repeated edits to one reflection and wrong across two, since a shared queue would let a save for the source just left be replaced by one for the source just opened. | The disposition's "split readers/reflection control" was not attempted; the file is ~390 lines and the reflection control now has one owner inside it. **"Validate every source URL scheme" was NOT done** — `node.sourceUrl` still reaches an `href` unvalidated here, the same class as `IdeaCheckView`'s open row in §0.7. — **CLOSED (v0.64.0)**, reusing the same `isSafeHttpUrl` gate `IdeaCheckView` adopted: `node.sourceUrl` now only becomes an `href` when it passes. (Server-side, `tree-service.ts`'s own `isHttpUrl` already rejected a non-http(s) scheme at write time, from an earlier batch outside this file's row — this closes the client-render half that was left open.) The per-node queue and the reset-effect deps are **not pinned by a test**: vitest here is node-only, and a test restating them could not fail on a regression. |

`lib/save-queue.test.ts` gains the case that pins **why** the per-node queue is necessary — two
entities through one queue and the first never goes out. That is the part a node-only test can
actually hold.

**E2E `papers-tab` re-run: 16 passed / 3 pre-existing documented skips.** AC6 is "reflection
persists across reload (PATCH round-trips)" — the rewritten path, driven end to end.

Gates 1–5 pass; Vitest 128 files / 1,817 tests.

#### v0.60.1 — 2026-07-26 — a finding that closed itself, verified rather than re-fixed

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/teacher/student-overview.ts` | **Pairing closed; query split declined** | This row is mostly a **verification**, and reporting that honestly is the point. (1) **The pairing finding was true on 2026-07-23 and is not true now.** The team came from `pickActiveTeam` and the role/join date from `teamMemberships[0]` — two independent picks, so with two live memberships a teacher read one team's role and join date beside another team's papers, logs and scores. **v0.48.0 closed it three days after the audit**: `leaveOtherTeams` runs inside the join transaction, so a second live row cannot be created. Checked against the dev database rather than assumed — **zero users hold more than one `team_members` row**. It is derived from one membership anyway, by passing the whole membership as `pickActiveTeam`'s payload (reusing the tested selection rule instead of restating it): two lines, and the schema still only has `@@id([userId, teamId])`, so nothing at the database level forbids the second row that application code currently prevents. Defensive, not a live fix, and labelled that way in the code. (2) **"About 18 queries" is understated: it is 20–21** — one student lookup, one or two inside `teacherOwnsTeam`, and 18 in the fan-out. They are all parallel, so it is one round trip of latency and a load question rather than a correctness one. | **The lazy-loaded sections were NOT built.** Deciding which sections a teacher gets on first paint is a product change, not a refactor, so it is left open rather than half-done. Seven of the eighteen queries are unbounded by `take` (`teamBuildings`, `shopBuildings`, `paperProficiency`, `papers`, `experiments`, `fairAssociations`, `formStatuses`); only `experiments` is unbounded by domain, and capping it silently truncates what a teacher sees, so it needs a product answer too. `roster/route.ts` and `analytics.ts` read `s.activeTeam` directly rather than through `pickActiveTeam` — safe today only because leaving clears `activeTeamId` in the same transaction. |

`lib/team/active-team.test.ts` feeds the resolver the disagreeing two-membership shape and
asserts the role follows the team. **Negative-controlled**: restoring the independent pairing
fails it. **E2E `issue-6` re-run: 10/10** — the whole student drill-down this module feeds.

Gates 1–5 pass; Vitest 128 files / 1,819 tests.

#### v0.61.0 — 2026-07-27 — a stale resync erasing a paid purchase, and a panel with no scrim

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/hooks/usePlotBuildings.ts` | **Defects DONE; reducer split declined** | Three readings, all reproduced, one narrower than written and the reducer suggestion itself didn't hold. (1) **"Refresh errors swallowed" is exact but narrow**: every mutation already had a visible `toast` for its OWN failure — the swallowed error was specifically `refreshPlotState`'s resync GET, whose `catch` assumed the rollback already covered it. It doesn't: a failed resync means the mirror is unconfirmed, not necessarily correct. (2) **"No abort/resync causes a stale write" — reproduced by simulation**, not assumed: an upgrade fails and starts a resync GET; while it's in flight a different building is placed and its own POST succeeds server-side (KP charged); if the slow GET's unconditional `setEconomy(data.economy)` lands between the optimistic add and that POST's own success handler, the newly-placed building vanishes from the client permanently — the success handler's `.map` finds no matching key in the already-replaced array. A throwaway two-Promise simulation of the exact closures confirmed both the loss and the fix; negative-controlled by deleting the guard line (loss returns) and restoring it (building survives). Fixed with a monotonic `opSeq`, bumped by every place/move/sell/upgrade at its start; `refreshPlotState` captures it and re-checks after the `await`, skipping a resync a newer action has superseded (that action resyncs itself if it, in turn, fails). (3) **"Duplicated optimistic economy prediction" is real but small**: `Math.max(1, memberCount)` was independently written three times — `lib/shop-server.ts`'s authoritative multiplier, `ShopPanel`'s displayed price, and this hook's prediction. Extracted to `teamCostMultiplier()` in `lib/economy.ts`; all three call it now — the predicted number is unchanged (same formula), it just can't drift anymore. **The reducer/state-machine split was declined**: the ~12 states are independent, narrowly-scoped flags each owned by one clear function — unlike `discoveryStore`'s v0.56.0 case (declined for the same reason, but there several near-duplicate functions genuinely shared one optimistic-apply→persist→rollback→report authority). Here there was no duplicated authority to consolidate, only a missing generation guard and one swallowed error path, both fixed in place. | The per-action `opSeq`/resync guard is a React hook and cannot be rendered under this repo's node-only Vitest (no jsdom, no `renderHook`); it is verified by a throwaway closure simulation (run, confirmed, deleted per the method) and by reasoning through every call site, not by a committed test — recorded as unpinned rather than padded with a vacuous one. `sellBuilding`'s catch still doesn't resync (correct: it never optimistically removes before its own success, so there's nothing of its own to reconcile) but now bumps `opSeq` so a slower foreign resync can't stomp a successful sell either. |
| `components/lab/LabScene.tsx` | **DONE** | **The "six booleans can overlap" reading is CONFIRMED reachable** — the opposite of LiteratureFeature's v0.59.0 finding, which turned out not to be. Read `ModalBackdrop` (`components/ui/ModalBackdrop.tsx`) and the CSS: `ShopPanel`/`TeamPanel`/`SettingsPanel`/`FeedbackPanel`/`FeaturePanel` all wrap it — a fixed, full-viewport scrim that intercepts every click, so only one of those five can ever be reached at a time. `ActivityPanel` does not: `.activity-panel` is a bare `position: fixed; top:0; right:0; bottom:0; width:min(340px,90vw); z-index:1100` column with no scrim and no click-outside handling. Every trigger outside that 340px strip — the status strip's team-name button, the feedback FAB (`left:18px`), a gateway building anywhere left of it — stays clickable while Activity is open, so Activity + Team, Activity + Feedback, or Activity + a Feature panel can genuinely both be open, each rendering its own close button, exactly the "overlapping off-path panels" the disposition named. One `Overlay` union (`kind: 'none' \| 'feature' \| 'shop' \| 'team' \| 'settings' \| 'activity' \| 'feedback'`) replaces `openKey` plus five booleans, so only one overlay can ever be true. The spatial shell — `LabPlot`, tile/decoration layers, the ghost/banner/BuildingMenu/UpgradeBurst/toast, ARRANGE/SHOP/LOG/FEEDBACK FABs — is unchanged; only the controller for which off-path panel is open moved to one state. | The union's exclusivity is a TypeScript/structural guarantee (impossible to represent two truthy overlays at once), not a runtime branch, so there is nothing to negative-control the way a guard clause is — it's recorded as such rather than backed by a test asserting the obvious. No E2E currently opens Activity and then a second trigger to assert the old panel closed; `F9`/`upgrades`/`F5-bell` exercise this component's plot/currency/notification surfaces but not this specific interaction. |

`lib/economy.test.ts` gains 2 cases for `teamCostMultiplier`. **Negative-controlled**: reverting
it to `memberCount` (dropping the `Math.max(1, …)` floor) fails the "never drops below 1" case.
The stale-resync guard was negative-controlled by simulation (see above), not by a committed
Vitest case — extracting the guard into an isolated pure function to test it in isolation would
only restate the fix, which is exactly the vacuous-test the method warns against.

**E2E relevant to this batch (not run — reported for the orchestrator):** `e2e/upgrades.spec.ts`
(drives `upgradeBuilding`'s optimistic path directly), `e2e/F9.spec.ts` (places/sells buildings —
exercises `onDrop`/`sellBuilding` and now the `Overlay` union's SHOP panel), `e2e/F5-bell.spec.ts`
(notification bell — touches `StatusStrip`, adjacent to but not driving the `Overlay` union).

Gates 1–5 pass; Vitest 128 files / 1,821 tests.

#### v0.62.0 — 2026-07-27 — a 1 req/s policy nobody enforced, and a feed body nobody capped

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/fairs/zip.ts` | **Transport hardened; split declined** | Three named defects, all reproduced before any fix was written. (1) **"No deployment-wide 1 req/s queue" is exact.** Two concurrent `geocodeZip` calls (two teams onboarding in the same minute) hit Nominatim **~1ms apart**, measured against the original — nothing enforced the ToS at all. A module-level queue (`throttleNominatim`) now serializes every call through this process and waits out the remainder of the second before the next request leaves; it is explicitly documented as a single-process guarantee, not a deployment-wide one — a multi-instance deployment would still exceed it in aggregate, same caveat `lib/rate-limit.ts`'s `MemoryStore` already carries. (2) **"No cache" is exact.** The same ZIP called twice fired the network twice (measured: 2 hits). One `LruCache` (24h TTL, 2,000 entries) now short-circuits repeat lookups — the common case of several students in one school/ZIP — without caching *failures*, so a transient Nominatim outage doesn't keep answering null for a day once it recovers. (3) **"No runtime response schema/cap" is exact and was worse than a missing type: `results[0].lat` was read off whatever `res.json()` returned with no shape check at all.** A response with numeric `lat`/`lon` (never real Nominatim output, which always encodes as JSON strings) sailed straight through unrejected under the original code; a zod schema now refuses it. The body itself is now read through the shared `readJsonCapped` (64 KB — Nominatim's real payload is a few hundred bytes) instead of a bare `res.json()`. **"Hard-coded special ZIPs repeat" did NOT hold as written** — there is no duplicate key in either static table (`ZIP_PREFIX_RANGES`, `ZIP3_CENTROIDS`; checked programmatically, zero collisions). What DOES repeat, and is the real match for that half-sentence, is the fallback expression `coords ?? STATE_CENTROIDS[state] ?? null` — written independently three times (`lib/fairs/match.ts` twice, `app/api/team/momentum/route.ts` once, the latter's own comment pointing at the former as "exactly like"). One exported `resolveTeamPoint(coords, state)` replaces all three. **The file/data/lookup split was declined**: the static tables and pure lookups are already independently testable with no network involved (`zip.test.ts`), and every defect lived inside `geocodeZip` alone — splitting 350 lines of data into a second file fixes none of them. | Splitting `resolveTeamPoint` out surfaced no test coverage for `lib/fairs/match.ts` or the momentum route's fair-selection logic at all — neither had a unit test before this batch and neither gained one (out of scope: the defect was the duplication, not an absence of coverage for pre-existing correct behavior). |
| `lib/discovery/articles.ts` | **Byte cap DONE; host/content-type validation declined with reason** | The verdict named three exposures; measuring each separately mattered. **Byte cap on `res.text()`: genuine, and now fixed** — this was one of the two adapters `v0.55.0` left as "still owed" alongside `medlineplus.ts`. `readCapped` (the same shared ceiling `lib/discovery/openalex.ts` and `lib/fetch-retry.test.ts` already exercise against a real server) now backs every feed read; 8 MB, matching OpenAlex's cap, against feed bodies that are realistically a few hundred KB. **Host validation: NOT a live exposure, and the disposition's "canonical host validation" oversold it.** Unlike OpenAlex's `cited_by_api_url` (fetched out of the *provider's own response*, i.e. genuinely request-time data), every `FEEDS[…].url` is a literal in this file — `feed` from the request is validated against `FEEDS`'s own keys (`zod` enum / `in` check) before any URL is touched, so there is no stored or request-supplied value that could ever name a different host. Declined for the same reason the OpenAlex host check does NOT apply here: there is nothing dynamic to allowlist. **Content-type: measured, not assumed, and also not a gap.** A non-XML 200 response (an HTML WAF/error page) parses via `fast-xml-parser` to an object with no `feed.entry`/`rss.channel.item`, so the entry-mapping functions return `[]` exactly as if the feed were empty — reproduced directly. A DOCTYPE-based XXE probe throws inside the parser itself ("External entities are not supported") and is caught by the existing try/catch like any other parse failure — reproduced directly. Neither needs a content-type gate. | **The licensing-assumptions review the disposition asked for was NOT done here** — it is a human/legal judgment call, explicitly out of scope for this batch, and is recorded as still owed rather than resolved by assertion. |

`lib/fairs/geocode.test.ts` (6 cases) pins the cache/throttle/schema/cap reproductions against a
real local `node:http` server (the URL is hard-coded, so `global.fetch` is stubbed to redirect
to it — the streaming/cap logic runs for real). `lib/fairs/zip.test.ts` gains 3 cases for
`resolveTeamPoint`. `lib/discovery/articles.test.ts` (2 cases) pins the byte cap the same way.
**Negative-controlled six ways**: disabling the geocode cache fails the cache test; bypassing the
throttle queue fails the timing test (measured gap collapses from ≥950ms to single digits);
reverting the zod parse to a raw cast fails the "numeric lat/lon" case specifically (the other two
schema cases still pass — proving they weren't the ones distinguishing it); reverting
`readJsonCapped` to `res.json()` fails the geocode byte-cap case; reverting `readCapped` to
`res.text()` in articles.ts fails **only** the log-message assertion in the feed byte-cap case —
its own `toEqual([])` assertion stayed green with the cap deleted (garbage bytes parse to no
entries regardless), which is exactly the "empty result is also the healthy answer" trap the
method warns against, caught here rather than shipped; swapping the order of
`resolveTeamPoint`'s fallback fails the "prefers own coords" case.

**E2E relevant to this batch (not run — reported for the orchestrator):** `e2e/F10.spec.ts` AC8/9
drive `/api/team/momentum`, which now calls `resolveTeamPoint`; `e2e/rubric-self-assessment.spec.ts`
opens the Science Fair Hub, which calls `matchFairs` (also now `resolveTeamPoint`) — both exercise
shape/status only, not distance values, so a regression here wouldn't necessarily surface. No E2E
spec drives `/api/onboarding`, `/api/team/location`, or `/api/settings`'s zip PATCH — the only
callers of `geocodeZip` — with a real ZIP; `geocodeZip` was never exercised live in the suite before
or after this batch. `e2e/disco-article-sources.spec.ts` runs under `E2E_MOCK_SOURCES=1`, which
short-circuits `browseFeed`/`resolveArticle` to fixtures before `fetchFeed` (the changed code) is
ever reached — unaffected by this batch either way.

Gates 1–5 pass; Vitest 130 files / 1,832 tests.

#### v0.63.0 — 2026-07-27 — a chart that disagreed with its own table, and an approval the roster never heard about

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/ops/data-terminal/ExperimentDetail.tsx` | **DONE; split declined** | Two readings, both correct. **The duplicate-point finding is exact and reproduced with real numbers**: `{x:5, series:"Trial A", y:10}`, `{x:5, series:"Trial A", y:40}`, `{x:6, series:"Trial A", y:12}` — the table (reading `measurements` directly) shows all 3 rows; the chart's row-per-x/column-per-series shape (`byX.get(m.x)`, keyed on x alone, one property per series) can hold only one y per (x, series), so the second point overwrote the first and the chart drew 2 rows, plotting y=40 (not y=10) at x=5, with nothing telling the student a point was dropped from the picture. This is reachable through the plain UI (add the same x/series/y twice, or paste a spreadsheet with a repeated row) — no API-only path was needed. The honest fix does **not** invent a de-duplication rule that would change the student's own recorded data: every point stays in the table exactly as entered. The chart-shaping logic moved to a pure, DOM-free `lib/data-terminal/chart.ts` (`buildChartData`) that also counts (x, series) collisions, and the component now says so beside the chart: "N points share the same x and series with another point below... All points are kept in the table." **The load-retry finding is also exact**: the lazy-loaded measurement fetch had a `.catch` that only set an error string, with no way to re-run it short of reselecting the experiment (which remounts via `key={selected.id}` and refetches from scratch). The load is now one re-runnable `loadMeasurements` callback; the error state renders a "Try again" button next to the message, matching LiteratureFeature's (v0.59.0) and CodexTab's (v0.58.0) retry shape. **The chart/input/table split was declined**: all three are views of one owned `measurements` array behind one write path (`syncMeasurements`), and neither defect lived in how the file was organized — splitting would prop-drill the same state and mutation callbacks across files, the exact shape §0.7 already flags as a red flag for `discoveryStore` (v0.56.0). | Last-point-wins is unchanged (not invented, not removed) — the fix is disclosure, not resolution; a chart that needs to draw two y-values at one (x, series) key at all is a product decision (e.g. a scatter mode) explicitly out of scope for a defect-only batch. |
| `components/teacher/TeacherRoster.tsx` | **Defects DONE; split/pagination declined** | Three readings, all reproduced. **"Approval updates counts/classes but can leave roster stale" is exact.** `ClassManager.decide('approve')` enrols the student server-side and patches only `ClassManager`'s own `classes` state (the count and pending-request list); the actual student roster table lives in the sibling `TeacherRoster` component, fed by an independent `/api/teacher/roster` fetch that nothing re-ran. Reproduced by tracing the call graph: a newly-approved student was enrolled and simply absent from the roster table until a manual page reload. One `onApproved` callback (passed down, called only on `decision === 'approve'`) now re-fetches the roster; its own failure is a separate, dismissable/retryable banner rather than reusing the full-page `loadError` — a failed *background* refresh must not blank the panel the teacher just successfully used. **"Clipboard failure is unhandled" is real and worse than it reads.** `navigator.clipboard?.writeText(code).then(() => ...)` had no `.catch` at all — a rejected write (permission denied) became an unhandled promise rejection with zero caller-visible signal; a genuinely absent `Clipboard` object (insecure context) short-circuits the optional-chain to a silent no-op instead of a crash, confirmed by simulation. The shared `useCopyToClipboard` hook (`components/ops/guide-chrome.tsx`) this file was NOT yet using had the **identical** bug — its own comment read "swallows a blocked/denied clipboard silently" — so fixing it locally here would have been a second copy of the same defect. Fixed once at the shared hook (it now returns `error`), consumed here as the first caller to actually display it; the other two panels using it are unaffected (they still destructure only `{ copied, copy }`). **"Responses are unbounded" turned out to be two different claims, and only one holds.** The roster's per-teacher student list (`db.user.findMany` with no `take`) is bounded in practice by real classroom enrollment a school assigned to that teacher — a few hundred students at the outside for a multi-section pilot — so a cap would silently hide some of a teacher's own class, the exact reasoning `student-overview` (v0.60.1) already used to decline a query cap; left uncapped, on purpose, and said so in the route. The per-class pending-join-request list, by contrast, is bounded only by however many distinct accounts try a semi-public join code before a teacher notices and revokes it (`@@unique([classId, userId])` already stops one account from spamming duplicates, but not distinct accounts) — a real, if bounded-by-total-users, exposure, now capped at 500 (oldest-first, so a teacher facing the cap still sees the longest-waiting requests). **Both the file split and pagination were declined.** `ClassManager` and the roster table already communicate only through typed props — the same shape `ShowcaseEditor` was kept for ("already delegates sections... reasonably") — and the actual defect was the missing bridge between two already-separate owners, not the file boundary. Pagination is a first-paint/product decision, was explicitly out of scope for this batch, and was not attempted — left open the same way `student-overview`'s lazy-load sections were in v0.60.1. | The initial roster/class load itself also had no retry (not separately named in the verdict, but the same class of defect as the measurement load above) — fixed the same way: one re-runnable `load()`, and the shared `TeacherPanelState` gained an optional `onRetry` (opt-in; its other consumer, `TeacherReports`, doesn't pass one and is unaffected). |

`lib/data-terminal/chart.test.ts` (5) pins the exact duplicate-point reproduction above against
the extracted logic. **Negative-controlled**: removing the (x, series) collision guard fails the 3
cases asserting a nonzero `duplicateCount`, restoring it passes all 5. The retry wiring, roster
refresh bridge, and clipboard error surfacing are React-only (state/effects/props) and not
reachable from this repo's node-only Vitest (no jsdom/`renderHook`) — recorded as unpinned rather
than backed by a test that would only restate the fix.

**E2E relevant to this batch (not run — reported for the orchestrator):** `e2e/F9.spec.ts` drives
`GET /api/teacher/roster` and the roster table/nudge UI (AC9–AC12) this batch's roster-retry wiring
touches — but it does **not** exercise `ClassManager` at all (no class creation, join-code copy, or
approve/deny coverage found in the spec), so the approval→roster-refresh bridge and the clipboard
fix are untested by any current E2E spec. Checked directly: no `e2e/*data-terminal*` spec exists in
this repository, and `e2e/F18-vega-companion.spec.ts` has no reference to data-terminal/measurement
surfaces at all — the chart/table/retry fix in `ExperimentDetail.tsx` has **no E2E coverage today**.

Gates 1–5 pass; Vitest 131 files / 1,837 tests.

#### v0.64.0 — 2026-07-27 — a keyboard that could never place a building, and a model's own JSON in `href`

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/lab/LabPlot.tsx` | **DONE; controller split declined** | Confirmed as written. Pick-up ran only on `pointerdown`, and the building button's own `onClick` explicitly no-opped in arrange mode ("pointer-down picks up immediately"), so a keyboard Enter/Space on a focused (already correctly-named, already-focusable) building did **nothing** — the same class of "reaches nothing" DiscoveryTree's v0.53.0 controls had, but here the button itself WAS already correct and only the handler wiring was pointer-only. And the verdict's "forced clicks likely mask it" is exact, measured directly: both `e2e/upgrades.spec.ts` ("Arrange mode Delete...") and `e2e/placement.spec.ts` ("arrange mode toggles...") drive pick-up with `.dispatchEvent('pointerdown', { button: 0, pointerId: 1 })` — Playwright's actionability/hit-testing is bypassed entirely, and the keyboard is never touched by either spec. Past pick-up there was no keyboard path onto the grid at all: the drop target was a raw container `onClick` reading `clientX/clientY`, and the grid cells were non-focusable, `aria-hidden` SVG polygons. Fixed with (1) a `detail === 0` branch added to the existing building button's `onClick` — a native `<button>` fires `click` with `detail === 0` when activated by Enter/Space (no preceding `pointerdown`), which is exactly the signal that distinguishes it from the pointer path (already handled on `pointerdown`, always `detail >= 1`) — and (2) one real, focusable roving cursor `<button>` (not 49 individually-tabbable cells — a 7×7 grid would make its own accessibility problem) that arrow keys move across the SAME `(gx, gy)` coordinates and Enter/Space commits through the IDENTICAL `onDrop`/`isPlaceable`/`occupied` check a pointer drop already uses below it, so a cell can never be legal by one input method and not the other. Its accessible name states the destination in the verdict's own terms ("Place Robotics Bay at column 3, row 2"); focus moves onto it the moment a ghost attaches (otherwise it is a new focusable element with no way to discover it) and returns to the plot on any exit (commit, Escape, right-click cancel) via one effect keyed off the ghost's kind+key rather than its object identity (a new plain object is built every parent render whether or not the ghost changed, and keying focus-stealing off THAT would refocus on unrelated re-renders — a toast, a burst animation). The top-of-screen mode banner (`.plot-banner`) is now `aria-live="polite"`, the announce channel the brief pointed at — nothing else needed inventing. The one real timer in the file (a `window.setTimeout` clearing a pointer/click suppression flag) was never cancelled on unmount; it now is, via a stored id + a cleanup effect. **The "extract interaction controller" split was declined.** The pure grid math this file needs (`screenToCell`/`cellToScreen`/`isPlaceable`) already lives in `lib/plot.ts`, testable with no DOM — the actual gap DiscoveryTree's v0.53.0 split closed for THAT file. What remains here (mousemove/click/pointerdown/contextmenu/keydown handlers reading a ref's live `getBoundingClientRect()`) is DOM-event glue that needs a real browser regardless of which file it lives in; moving it to a second file would not gain testability, only prop-drill the same ref/state across two files — the same shape §0.7 already flags as a red flag (`discoveryStore`, v0.56.0; `usePlotBuildings`, v0.61.0). | The keyboard path is **not pinned by any test** — vitest here is node-only (no jsdom) and the pure math it reuses is already covered by `test/discovery-tree-layout.test.ts`'s sibling and by this file's own existing E2E; a real assertion needs a live browser. `e2e/a11y.spec.ts` has no case for it yet — recorded open rather than added speculatively, matching the "declare unpinned" convention this log already uses when a fix can't be reached from this repo's test tier. |
| `components/research-plan/IdeaCheckView.tsx` | **DONE** | Both readings confirmed. `priorWork[].url` (×2 variants), `citations[].url` (×2 variants), and `IdeaActivity`'s live-search `sources[].url` all render straight into `<a href>` — and all five ultimately trace back to either a live Anthropic web-search tool result or the model's own JSON verdict (`idea-check-service.ts`), neither a trusted caller. A `javascript:` scheme reaching any of them is a real XSS, not a hypothetical one — demonstrated directly: `sanitizePriorWork` (below) is proven to strip exactly `javascript:alert(document.cookie)` and `data:text/html,<script>...` while leaving a plain `https://` url and the rest of the entry untouched. Rather than writing a third checker, this reuses `isSafeHttpUrl` (`lib/showcase.ts`) — `lib/validation.ts` already carries a comment naming it as the generic http(s) gate for exactly this situation, after a dead duplicate schema was deleted from that file for inviting drift. Enforced at both ends per the verdict: server-side, `idea-check-service.ts` filters `emitSources`' provider results and a new `sanitizePriorWork` filters the model's own JSON before either is stored (`ideaCheck.findingsJson`/`researchPlan.lastIdeaCheckJson`) or streamed to the client; client-side, a new `SafeExternalLink` primitive is the one thing all five link call sites now render through, falling back to a plain `<span>` (not a dead link) when the url fails the gate — this also covers a legacy row written before this fix existed, which the server-side filter alone would not. `SafeExternalLink` plus a new `ResultHeading` primitive (the four repeated teacher/student heading ternaries — text size, tag, tone, margin — collapsed to one function) are the "result primitives" the disposition's other sentence asked for; the box/list wrapper ternaries were deliberately left, since those differ in more than one token (padding, radius, gap) and are two real distinct specs, not duplicated logic. | None for this file — both halves of the disposition are done. |
| `components/discovery/SourceReader.tsx` | **URL half CLOSED (deferred from v0.60.0)** | The one open item v0.60.0 left ("§0.11 records it as owed"): `node.sourceUrl` still reached an `href` with no client-side scheme check. Same fix, same reused gate: `node.sourceUrl && isSafeHttpUrl(node.sourceUrl)` now gates the "open ↗" link. Server-side this already had a guard from an earlier, separate batch — `tree-service.ts`'s own near-identical `isHttpUrl` rejects a non-http(s) `sourceUrl` at write time (noted, not touched: it predates this batch, lives in a file not on this row, and consolidating it with `isSafeHttpUrl` is a small, real, but out-of-scope duplication for a future pass, not a live defect). | The pre-existing `lib/discovery/tree-service.ts:isHttpUrl` / `lib/showcase.ts:isSafeHttpUrl` duplication (functionally identical minus a length bound) is now visible across two fixes in one week and worth collapsing to one export in a future batch — flagged, not fixed, since `tree-service.ts` is outside this row. |

`lib/research-plan/idea-check-service.test.ts` (4) pins `sanitizePriorWork` directly against the
exported function — reachable from node-only vitest without mocking the Anthropic stream, unlike
the rest of the streaming service it lives in. **Negative-controlled**: reverting the guard to a
bare `url: pw.url` (no `isSafeHttpUrl` check) fails exactly the two malicious-url cases (javascript:
and data:) while the plain-https and no-url cases still pass — restored and re-verified green.
`isSafeHttpUrl` itself was already pinned by `test/showcase.test.ts` before this batch (accepts
http/https, rejects `javascript:`/`data:`/`ftp:`/junk/over-length) — this batch's tests exercise
the NEW call sites, not the predicate. `emitSources`' one added condition reuses that same tested
predicate inline; pulling that closure out of the streaming loop (it also owns `seen`/`sources`/
`send`) to give one boolean its own test would be disproportionate, and is recorded as unpinned
rather than padded with a test that restates the fix.

**E2E relevant to this batch (not run — reported for the orchestrator):** `e2e/upgrades.spec.ts`
and `e2e/placement.spec.ts` both drive plot pick-up via `dispatchEvent('pointerdown', ...)` — real
pointer behavior is unchanged by this fix, but neither exercises the new keyboard path, so a green
re-run of either confirms no regression, not the fix itself. `e2e/a11y.spec.ts` is the natural home
for a new keyboard-placement case; none was added (see "Still owed" above). `e2e/F3.spec.ts` /
`e2e/F3-plan-paste.spec.ts` cover the research-plan idea-check flow this batch's URL fix touches,
but neither asserts anything about link safety today.

Gates 1–4 pass; Vitest 132 files / 1,841 tests (was 131/1,837 in v0.63.0). Gate 5
(`next build`) and gate 6 (E2E) are the orchestrator's per §0's own division of labor for this
batch.

---

#### v0.65.0 — 2026-07-27 — a load that vanished a connected plan, and a destructive-call finding that was already closed

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/discovery/DiscoveryFeature.tsx` | **Split declined; one reading closed as STALE/already-fixed; one doc-drift comment corrected** | **"Unawaited destructive calls" does NOT reproduce against the current tree.** Reproduced directly: `reset()` (backs the "Start over" confirm) and `deleteSubtree()` (backs the per-node delete confirm) both still fire without an `await` from this component, exactly as the verdict says — but both already route through the store's `commitOptimistic` → `writeError` → re-hydrate sequencing that v0.56.0 added to `discoveryStore.ts` (and this file already wires `writeError` into its Toast, also from v0.56.0). A vitest reproduction against the real store with `persistReset`/`persistDelete` mocked to fail shows: the optimistic clear happens synchronously, then on failure `writeError` is set (visible message) and the tree is restored via `hydrate()` — the UI never treats a failed destroy as done. This 2026-07-23 audit finding predates the 2026-07-26 store fix; it is recorded here as CLOSED-BY-PRECEDENT rather than re-fixed, with two new store tests (below) pinning it so a future edit can't silently reopen a bypass of the shared error channel. **"Patch-history comments"**: the file's own doc comment claimed "the other gateways currently open placeholder panels" — §0.8's counter-audit already named this exact sentence as documentation drift (every non-PvP gateway maps to a real component); corrected to state only what's true of this file. No other comment in the file describes a landed fix without also explaining current shape, so nothing else was removed. **"Extract controller" was declined.** The file already delegates 8 view components (`DiscoveryTree`, `DiscoveryTopicList`, `DiscoveryHomeScreen`, `DiscoveryModals`, `DiscoveryHeader`, `FinalTopicBar`, `ExplorerSidePanel`, `ExplorerReaderPane`) and 3 hooks (`useFinalTopic` — shared with Settings, `useTeamInterests`, `useSourceLanes`); what is left is genuinely cross-cutting orchestration (which view/source/node is active affects the header, body, and side panel simultaneously) — moving it into a reducer relocates the same coupling into a differently-shaped file rather than removing it, the same "one owner beats several files duplicating authority" reasoning §0.7 already used to decline the `discoveryStore` split. | None — the destructive-call reading is closed by a prior batch, not deferred. |
| `components/settings/LabProfileSettings.tsx` | **Defect DONE; domain split declined** | **"Silent research-plan load failure" is confirmed, exactly as named.** Reproduced: the load was `fetch('/api/research-plan').then(r => r.json()).then(d => { if (d.plan) {…} }).catch(() => {})`. A rejected fetch was swallowed by the `.catch` — but a non-2xx response (a 429, a session hiccup) never even reached it: `.json()` parses fine, `d.plan` comes back `undefined`, the populating branch is skipped, and `planLoaded` is set `true` regardless. A team that had already connected a Google Doc would see the Research Plan section render as if they never had — with zero error text and no retry, on a section every other domain in this file already loads/fails independently. Fixed the same shape as `CodexTab` (v0.58.0) and `LiteratureFeature`'s team-phase read (v0.59.0): a new feature-local `components/settings/api.ts` (none existed) exports `getResearchPlanSummary()` through the shared `requestJson` + a zod schema for just the fields this panel displays (extra keys — quota, review, idea-check payloads — are intentionally left undeclared, matching `teamPhaseSchema`'s own precedent for reading one slice of a larger route); the load is now a re-runnable `loadPlan` callback, a `planLoadError` flag renders a "Couldn't load your research plan" message with a "Try again" button (mirroring `LiteratureFeature`'s retry banner), matching the independent-skeleton-per-domain pattern the other three sections here already use. **The domain split was declined.** Profile and lab/location are NOT actually two authorities as the verdict's phrasing implies — they share one fetch (`GET /api/settings`), one form, one `save()`, gated only by an `isLead` flag on already-rendered fields; only topic (already extracted to the shared `useFinalTopic` hook, reused by Discovery) and research-plan are genuinely separate authorities, and both already render their own independent skeleton/error state inside this one file. This is the identical shape `CodexTab`'s v0.58.0 close-out used to decline its own "split loader/navigation state" verdict: once every load in the file owns its own failure state, a file split would only relocate that same three-way independence into three files with no `.next`-load ownership benefit gained. | None for the named defect. The pre-existing `loadError` state for the profile/lab section itself has no retry button (only inline text) — not part of the named defect, not touched. |

`stores/discoveryStore.test.ts` gained two cases (`reset()` and `deleteSubtree()` failing) pinning that both destructive actions still restore state and surface `writeError` — **negative-controlled**: reverting `commitOptimistic`'s failure branch to skip setting `writeError` (leaving only the `hydrate()` rollback) fails these 2 new cases plus 4 pre-existing ones (the repeat-failure nonce test, the clears-on-success test, and the two "a write that never landed" create cases); restored and re-verified green. `components/settings/api.test.ts` (new, 3 cases) pins `researchPlanSummarySchema` against a real local HTTP server (mirroring `components/literature/api.test.ts`'s model for `teamPhaseSchema`) — **negative-controlled**: narrowing `googleDocUrl` to `z.number()` and `hasText` to non-optional fails the "reads a connected plan" case with the exact zod type-mismatch error; restored and re-verified green. Both fixes are otherwise React-only (state/effects/JSX) and not reachable from this repo's node-only Vitest — recorded as unpinned rather than backed by a test that would only restate the fix.

**E2E relevant to this batch (not run — reported for the orchestrator):** `e2e/disco-article-sources.spec.ts`
drives `DiscoveryFeature.tsx` (the articles tab/source flows); not run per this batch's
instructions. `e2e/F2.spec.ts`, suggested as possibly relevant, was checked directly and is
actually the Failure Log's "dig deeper" flow — it does not reference Discovery at all. No E2E
spec exercises `LabProfileSettings.tsx` (the Clerk custom "Lab & Profile" settings page) today.

Gates 1–4 pass; Vitest 133 files / 1,846 tests (was 132/1,841 in v0.64.0). Gate 5 (`next build`)
and gate 6 (E2E) are the orchestrator's per §0's own division of labor for this batch.

---

#### v0.66.0 — 2026-07-27 — the least defect-bearing rows left, closed honestly rather than padded

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `components/fair/ScienceFairFeature.tsx` | **Stale comment CLOSED; split DECLINED** | The "800 sequential query" patch-history comment was checked against `lib/fairs/match.ts` directly rather than assumed stale: `ensureFairsSeeded()` already has the `EDITION_DIGEST` short-circuit from P1-R16 (shipped ~v0.40.0, before this audit's 2026-07-23 date) — a reconciled process costs zero queries on repeat calls, not the ~800 the comment described in the present tense. Trimmed to name the fix and stop claiming an open production hang; the still-valid mount-ordering explanation it was attached to (why Self-check/Forms are checked ahead of the Overview tab's own `loading` state) was kept. **The split was declined**: `FairCard`, `DateRow`, `IsefRubric`, and the countdown/deadline helpers are already separated into named functions in this file; none duplicate logic, none carry a defect. Moving already-cohesive, non-duplicated JSX into new files for length alone is exactly what §0.7 forbids. |
| `app/(onboarding)/onboarding/page.tsx` | **Field duplication CLOSED; form/recovery split DECLINED** | "Duplicate school/name fields" is real and literal: the student form's and teacher form's "Your name"/"High school" `<input>` blocks were byte-for-byte identical JSX, so any future placeholder/`maxLength`/styling change to one had to be remembered in the other with nothing enforcing it. One colocated `NameAndSchoolFields` component (matching this file's own convention of colocated subcomponents, e.g. `FairCard` in `ScienceFairFeature.tsx`) now backs both forms; state, validation, and both submit handlers are unchanged. **"Large recovery commentary" was declined as a split target** — the `entering` recovery-latch effect is not duplicated, is shared bookkeeping for both forms, and its size is explanatory comment, not extractable logic; moving it to its own file would relocate the same single effect with nothing deduplicated. **ACCEPTED-R1 is untouched**: no gate/approval/warning was added to teacher self-registration — the teacher form's two fields simply render through the shared component. |
| `components/literature/QuizPanel.tsx` | **Constant duplication CLOSED; question-form/result-row split DECLINED** | Checked directly whether the pass-threshold numbers disagree today: they do not. `QUIZ_PASS_THRESHOLD` (`lib/literature/quiz.ts`) is `70`; this file's three hardcoded `70` fallbacks also read `70`. The risk was drift, not a live bug — `lib/literature/quiz.ts` reads its rubric off the filesystem at module scope and cannot be imported into this `'use client'` file, which is exactly why `quizDerive.ts` already carries its own client-safe mirror, `DEFAULT_PASS_THRESHOLD`. QuizPanel now imports that existing mirror instead of a fourth bare `70`, and the score-color "pass" tier now reads the session's own `results.threshold` directly (non-null in that branch) instead of a hardcoded number, so it can never disagree with what the server actually graded against. The unrelated `>= 40` mid-tier color break was left alone — no domain constant names a "40" tier, so one was not invented. **The question-form/result-row split was declined**: the quiz-view, results-view, and retry-view per-question blocks are structurally similar but not duplicated (only retry carries the prior answer, a "New" badge, and an extra question), and the one truly shared piece (`QAExplain`) is already its own function. |

**Negative controls.** None of the three fixes in this batch introduce a new branch or guard to negative-control — they are a comment edit, a byte-for-byte JSX dedupe with unchanged behavior, and a literal-to-import substitution with the same numeric value both before and after. Per the method's own rule ("a test that restates your fix cannot fail on a regression"), no test was added for any of the three: `ScienceFairFeature.tsx`'s change is a comment; `onboarding/page.tsx`'s and `QuizPanel.tsx`'s changes are React JSX/props with no new logic, unreachable from this repo's node-only Vitest (no jsdom/`render`) — recorded as unpinned rather than padded with a vacuous test.

**Two rows in this batch, both correctly flagged by the orchestrator as candidates to decline outright, were partially — not wholly — declined**: each verdict bundled one real, narrow finding (a stale comment; a genuinely duplicated numeric constant with a pre-existing client-safe mirror already in the codebase; genuinely duplicated field markup) with a "split for length" recommendation that did not hold up once each file was actually read — none of the three files had duplicated *logic* that a split would consolidate, only, at most, duplicated *markup or constants* that a shared subcomponent/import already fixes without moving anything else.

Gates 1–4 pass; Vitest 133 files / 1,846 tests (unchanged from v0.65.0 — no new test was added or removed).
Gate 5 (`next build`) and gate 6 (E2E) are the orchestrator's per §0's own division of labor for
this batch. E2E likely relevant, not run: `e2e/F4.spec.ts` / `e2e/F4-print.spec.ts` (Science Fair
Hub), `e2e/F11.spec.ts` / `e2e/F11-quiz-retry.spec.ts` (quiz + retry). No E2E spec drives
`/onboarding`'s teacher branch or the student/teacher field UI directly — checked, none found.

---

#### v0.67.0 — 2026-07-27 — nine rows closed by verification, and one that wasn't as closed as it looked

Mostly a verification batch, on purpose: reproduce each named defect against the CURRENT code,
say what's actually true, and change nothing that isn't genuinely still broken.

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/ops/codex/scripts/merge-codex-segments.mjs` | **VERIFIED CLOSED (P1-R15, v0.47.0); no code change** | Confirmed against the current 651-line script rather than assumed. The atomic install is real: `atomically(touched, run)` snapshots every path this merge can touch (content json, all three registries, every track wrapper, `.checksums.json`) and restores all of them on any throw, including the final `build-codex-tracks.mjs --check` verification. Reproduced with a throwaway Node script (deleted after use) that copied the function verbatim: a forced failure mid-install left the tree fully restored; the same scenario with the restore loop removed (the pre-v0.47.0 shape) reproducibly left a half-merged tree (a rewritten `content.json` plus an orphaned wrapper file) — proving the guard is load-bearing, not decorative. The hand-maintained `SHAPE_KEYS` schema mirror still exists (a `.mjs` run by bare `node` cannot import a TS interface), but drift is now a red test: negative-controlled by adding a throwaway field to the `Lesson` interface in `types.ts` — `test/codex-schema-drift.test.ts` failed with the exact drifted-key diff; reverted and re-verified green. The three registries are regenerated wholesale on every merge (not hand-edited), so "regex registry editing can drift" no longer applies either. | The audit's literal ask — derive ONE schema representation via codegen rather than a hand-maintained mirror — was answered with a drift test instead, exactly as v0.47.0 already recorded; that substitution stands. |
| `lib/discovery/tree-service.ts` | **Invariant VERIFIED CLOSED (P1-R10, v0.34.1); split confirmed still open** | `assertValidTreeGraph` (same-team parent ownership, self-edge/cycle rejection via a visited-set walk, batch size/depth caps) runs before any write; `hydrateTree`'s `depthOf` independently visited-set-guards against legacy rows; both write loops now gate their catch on `isUniqueViolation` (real `P2002` only) and rethrow anything else. All three read directly from the current 448-line file. | The "use adjacency maps" split was never attempted: `hydrateTree` still walks `depthOf` per row and the source/article branches still issue one dedup query per node in a loop. Both are bounded (`MAX_TREE_NODES=500`, `MAX_BATCH_NODES=200`), so this is a cleanliness ask, not a live defect — left open as already recorded. |
| `lib/uploads/assets.ts` | **VERIFIED CLOSED (P1-R12, v0.39.0/v0.39.1)** | Crash-recoverable `deleting`/`deleteLeaseAt`/`deleteAttempts` leases, `ON DELETE RESTRICT` team-deletion tombstone, and a try/catch around `decodeURIComponent` are all present in the current 415-line file. `reconcileOrphanedAssets` (P1-S8) is the DB-side reconciliation half, also confirmed present. | Bucket-vs-ledger reconciliation (comparing real R2 inventory against the ledger) and stale/terminal alerting do not exist — grepped for any list-objects/alert call; none found. Exactly as already documented. |
| `lib/fairs/match.ts` | **VERIFIED CLOSED (P1-R16, v0.44.0); edition-sync/query split confirmed still open** | `EDITION_DIGEST` (a hash of the whole dataset) gates `ensureFairsSeeded`, replacing the count fast path that suppressed same-size drift. The "old patch-history comment" reads in the past tense already ("instead of the old per-fair upsert loop... it hung...") — nothing needed trimming. | `seedFairsBatched`/`ensureFairsSeeded` (edition sync) and `loadFairIndex`/`matchFairs` (queries) still share one 403-line file with no internal boundary — left open, not attempted. |
| `lib/fairs/forms.ts` + `components/fair/FormsChecklist.tsx` | **Content defect VERIFIED CLOSED (P0-R4, v0.34.0); two UI defects confirmed still open, reported rather than fixed** | `forms.ts`'s content was not touched (human-reviewed safety data, out of scope by instruction) — `ISEF_EDITION` still fails closed (`appliesTo`/`isEditionReviewed()` null/false pending a qualified reviewer). | `FormsChecklist.tsx`'s own two named defects are real and untouched: the initial GET has no `r.ok` check, and `cycleStatus`'s PATCH failure is a bare `catch { /* leave state unchanged */ }` with zero user-visible signal. Neither was part of P0-R4's scope and neither is fixed — reported as genuinely open for a future batch, along with the never-attempted rows/hazard-guide split. |
| `lib/literature/synthesis.ts` + `components/literature/SynthesisMatrixEditor.tsx` | **VERIFIED CLOSED (P1-R13, v0.50.0, plus one stale doc correction)** | Server-issued `inputHash` binds the check to an exact snapshot (409 on mismatch, re-hashed again before commit); matrix-paper ownership is enforced at creation (`paperIds` must resolve under the caller's own team, count-checked). The save barrier (`saveChain`) and column-edit failure/dirty state (`patchColumns`' `error`/`busy`) both live in the sibling hook, confirmed present. **A stale "still open" line in §0.3's P1-R13 entry was corrected**: the `addColumn`/`renameColumn` draft-loss item it named as unresolved was actually closed in v0.51.0 ("finish P1-R13" — `patchColumns` now sends dirty cells in the same PATCH as the column edit) one commit after v0.50.0, and was never back-filled into that entry. | None found for either file. |
| `lib/ops/codex/complete-service.ts` | **NOT CLOSED — the handoff's classification was wrong; reported, not fixed** | Re-read against the current 448-line file: BOTH named defects reproduce exactly as originally written, with zero existing test coverage. `completedAt: new Date()` is set unconditionally in the `alreadyClaimed` (re-pass) branch — every replay of a passed lesson silently rewrites the student's first-completion timestamp, no concurrency required. The failed-attempt path reads `bestScore` via a plain `findUnique`, computes `Math.max` in application code, then writes an absolute value via `upsert` with no transaction and no `GREATEST` — a genuine lost-update race under two concurrent failed attempts. Both are the mirror image of the FIRST-TIME-completion path a few lines below, which already does this correctly via a raw `GREATEST(...)` `ON CONFLICT` (the v0.37.0/P1-R11 pattern) — just never reused here. | The actual fix: move the failed-attempt write to a `GREATEST`-gated raw update matching the existing pass-path shape, and make `completedAt` conditional on first completion (`WHERE completed = false`, or omit on re-pass). Per this batch's "report rather than fix" instruction for anything found genuinely still broken during verification, **no code was changed** — flagged for a dedicated future batch instead of quietly growing this one's scope. |
| `app/(public)/showcase/[slug]/page.tsx` | **Authorization model VERIFIED correctly wired (P0-R3/P1-R7); the file's own three named defects confirmed still open** | `canViewShowcase(toShowcaseForView(sc), viewer, via)` — reading P0-R3's revision-bound moderation and P1-R7's share-token `via` — gates both `generateMetadata` and the page body identically; that half of the row's premise holds. | The three defects this row separately named were never addressed by P0-R3/P1-R7 and remain open: (1) `loadShowcase`/`resolveShowcaseViewer` are plain (non-`cache()`-wrapped) async functions called independently by both `generateMetadata` and the page component — every view runs the same queries twice; (2) `ResourceLink` renders `metadataJson.url` straight into `href` with no render-time scheme check (the one write path, `POST /api/showcase/asset/link`, already validates `isSafeHttpUrl` before persisting, so this is a missing defense-in-depth layer, not a live injection today — unlike the identical gap `SourceReader.tsx`/`IdeaCheckView.tsx` closed in v0.64.0); (3) the one cast found (`labType as LabType \| null`) is an ordinary enum narrowing, not a validation bypass. Reported (1) and (2) rather than fixed, per this batch's verification-only scope. |
| `lib/literature/quiz-retry.ts` | **Named claim/persistence defects VERIFIED CLOSED (P1-R11, v0.37.0/v0.42.0); SVC-1 confirmed still open** | `retryGradeClaimedAt` (2-min TTL) elects one grader before the paid call; `aiIdempotencyKey`/`runAiOperation` bind the result to the session + exact answers for replay. | SVC-1 (consolidating reward-minting) is genuinely still open — this file still has its own `tx.teamCurrency.upsert` + `recordActivity('quiz_passed', ...)` block, independent of the near-identical blocks in the initial-grade and expertise-grade routes. Matches the Executive Verdict's existing P2 listing; nothing new here. |

**Negative controls.** The one guard actually exercised in this batch — `codex-schema-drift.test.ts` —
was disabled by adding a throwaway field to `types.ts`'s `Lesson` interface and confirmed to fail
with the exact drifted-key diff; restored and re-verified green. The atomic-install guard in
`merge-codex-segments.mjs` was verified the same way but outside Vitest (a throwaway Node script,
run and deleted, per the method) since it is a build script, not an importable test target beyond
its already-tested `SHAPE_KEYS` export. No other row in this batch introduced or removed a guard —
Part 2 was reading and recording, not surgery — so no other negative control applies.

Gates 1–4 pass; Vitest 133 files / 1,846 tests (unchanged — no test was added, removed, or needed
to change; the one row with a genuine defect, `complete-service.ts`, was deliberately left
unfixed and unpinned per the "report rather than fix" instruction). Gate 5 (`next build`) and gate 6
(E2E) are the orchestrator's per §0's own division of labor for this batch. No E2E spec was newly
implicated: `e2e/F13-codex.spec.ts` exercises Codex lesson completion and would be the natural
regression net for `complete-service.ts` once that defect is actually fixed; `e2e/synthesis-matrix.spec.ts`
covers the Synthesis Matrix; `e2e/F4.spec.ts`/`F4-print` cover the Science Fair Hub (`match.ts`,
`forms.ts`); no spec drives the public showcase page's metadata/OG path or the Codex merge script
(a build-time tool, never in the request path).

#### v0.68.0 — 2026-07-27 — the row v0.67.0 found still broken, actually fixed

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `lib/ops/codex/complete-service.ts` | **CLOSED — both named defects fixed** | Reproduced both against the current code before changing anything (throwaway vitest run against the pre-fix file, deleted after use): a single non-concurrent re-pass moved a fixed `completedAt` to "now"; two genuinely interleaved (`Promise.all`) failed attempts scoring 60%/20% left `bestScore` at **20**, the lower value. Fix: the re-pass branch no longer writes `completed`/`completedAt` (both already correct from the first pass) and raises `bestScore` via a conditional `updateMany` whose `WHERE bestScore < newScore` clause IS the monotonic guard — atomic in Postgres, not app code, matching this codebase's conditional-predicate convention (v0.43.0/v0.37.0) rather than introducing a new pattern. The failed-attempt path is now a `GREATEST`-gated `INSERT ... ON CONFLICT DO UPDATE`, identical in shape to the first-time-completion path a few lines below (v0.37.0/P1-R11) — `completed`/`kp_awarded` are only set on a genuine INSERT, so a failed retry after an earlier pass can never un-complete a lesson or touch its KP. KP idempotency (the once-ever claim) lives in a separate, already-correct in-transaction `WHERE kp_awarded = 0` claim and was not touched — a regression test confirms a re-pass still pays 0 and a genuine first pass still pays 8. | Nothing — both named defects are closed and pinned. The split declined by the prior structural verdict (none was asked for beyond the monotonic-writes fix) was not revisited; this batch is defect-only per its own scope. |

**Negative controls.** `test/codex-complete-monotonic.test.ts` (6 tests) pins both attacks rather
than restating the fix: a real elapsed-time re-pass for the timestamp bug, a real `Promise.all`
interleaving for the score race. Disabled by reverting `complete-service.ts` to its pre-fix shape
(via `git stash`) and temporarily shimming the test mock with the OLD `upsert`/`update` call shape
(rather than the new `updateMany`/`$executeRaw`) so the assertions fail on the actual data
corruption, not a missing-method error: the re-pass test failed with `completedAt` moved from the
seeded `2026-01-01` timestamp to "now", and the concurrency test failed with `bestScore` stomped to
**20** — the exact corruption named in the audit. The other four tests (KP-idempotency-on-re-pass,
same-or-higher-score re-pass, single-failed-attempt-can't-lower-a-higher-score, first-time
completion) passed under the OLD code too, confirming they are sanity/regression invariants, not
accidentally attack-shaped duplicates. Reverted and re-verified all 6 green against the fix.

Gates 1–4 pass. Vitest: **134 files / 1,852 tests** (133→134 files, 1,846→1,852 tests — one new
file, `test/codex-complete-monotonic.test.ts`, 6 tests). Gate 5 (`next build`) and gate 6 (E2E) are
the orchestrator's. `e2e/F13-codex.spec.ts` covers this feature (AC2/AC3 are first-completion KP
and re-pass-pays-zero) and is the natural E2E regression net for this fix, though it does not drive
the specific concurrency/timestamp attacks pinned at the unit level here.

#### v0.69.0 — 2026-07-27 — dead code the compiler couldn't see, and a name that meant two things

§0.7's closing diagnostic paragraph, closed: the `noUnusedLocals`/`noUnusedParameters` cleanup and
the `ApiError` client/server naming collision. No behavior changes.

| File | Status | What actually changed | Still owed |
| --- | --- | --- | --- |
| `apps/web/tsconfig.json` + 5 named runtime dead imports/params + 1 fair-match import + 4 E2E fixtures/constants + 2 compile-time test aliases | **CLOSED — flags on, one shared config** | Re-ran the 2026-07-23 diagnostic against current code before deleting anything: all 5 named runtime items (`fill-papers`'s `req`, `advance-phase`'s `Phase`, `PhaseAdvance`'s `LAB_TYPE_LABELS`, `ShopPanel`/`SettingsPanel`'s `useEffect`) plus the 1 fair-match import (`zipToApproxCoords` in `lib/fairs/match.ts`) plus all 4 E2E items (`F3.spec.ts`'s `seededPaperIds`, `F4-print.spec.ts`'s `browser` fixture, `F5-bell.spec.ts`'s `STORAGE`/`BASE_URL`, `papers-tab.spec.ts`'s `SEARCH_PUBMED_QUERY`) were STILL genuinely dead — grepped every one before deleting, confirmed none used by any spec. The 2 compile-time test aliases (`track-schema.ts`'s `_SchemaIsATrack`/`_TrackMatchesSchema`) were the opposite: real, deliberate `tsc`-time drift guards between a zod schema and `CodexTrack`, not dead code — TypeScript's `noUnusedLocals` doesn't flag *exported* declarations (verified with a throwaway repro), so both were exported rather than deleted, preserving the exact same guard. Turning the flags on for the WHOLE program (not just the audit's own probe) surfaced 3 more genuinely dead items the 2026-07-23 audit missed, since ~20 batches have landed since: `FormsChecklist`'s unused `HAZARD_LABELS` map, `cron/notifications/route.ts`'s unused `NotificationDraft` import and `EMAIL_CONCURRENCY` constant (the real concurrency lives in `outbox.ts`'s `SEND_CONCURRENCY` — a leftover duplicate, not a wiring bug), and `usePlotBuildings.ts`'s `sellBuilding` capturing an unread `mySeq` from `++opSeq.current` (only the increment's side effect mattered; changed to a bare `opSeq.current++`). | The audit's own suggested escape hatch — a separate, relaxed tsconfig for tests — was not built. Measured noise from enabling both flags across the entire `apps/web/tsconfig.json` program (production + `e2e/` + `test/` + `lib/ops/codex/__tests__`) was 18 diagnostics total, all listed here, all now fixed or exported. Not enough noise to justify a second config; split declined for the usual reason in this section (no ongoing problem to isolate) — add one later only if real fixture noise shows up. |
| `lib/api/client.ts` / `lib/api/with-route.ts` `ApiError` | **CLOSED — renamed by role** | Counted call sites before choosing a side: 24 files import/use the browser-side `ApiError` (`lib/api/client.ts`, thrown by `requestJson` on a non-OK fetch response — load-bearing across v0.58.0/v0.59.0/v0.64.0 and others); only 6 files actually throw or `instanceof`-check the server-side one (`lib/api/with-route.ts`, thrown inside a `withTeamRoute` handler to short-circuit with an HTTP status) — 11 files import `withTeamRoute` from that module but 5 of those never touch its `ApiError`. Renamed the smaller one to `RouteError`: same fields, same shape, same `instanceof` branch inside `withTeamRoute`'s own catch, same 6 call sites (`literature/synthesis/route.ts`, `literature/synthesis/[id]/route.ts`, `team/join/route.ts`, `team/location/route.ts`, `team/invite/route.ts`, `showcase/asset/[id]/route.ts`) — a mechanical rename, not a merge, since the two model genuinely different things (a caught HTTP response vs. an intentionally-thrown route short-circuit). | Nothing — both names are now role-distinct and every call site was updated. |

Gates 1–4 pass. Vitest: **134 files / 1,852 tests** — unchanged (this batch deleted dead code and
renamed one class; no test added or removed). Gate 5 (`next build`) and gate 6 (E2E) are the
orchestrator's. Worth running given the rename's reach: `e2e/synthesis-matrix.spec.ts` and
`e2e/F4.spec.ts`/`F4-print.spec.ts` exercise routes whose `ApiError` became `RouteError`
end-to-end; no current spec calls `team/join`, `team/invite`, or `team/location` (grepped — none
do), so those three renamed files have no E2E net beyond gates 1–4 today. `e2e/F3.spec.ts`,
`e2e/F4-print.spec.ts`, `e2e/F5-bell.spec.ts`, and `e2e/papers-tab.spec.ts` are the specs whose
trimmed fixtures/constants live.

#### v0.70.0 — 2026-07-27 — the §0.7 tranche closes

The 44-file disposition opened in v0.53.0 is complete. Every row now carries an outcome, and the
outcome is honest about which of the three it is: **fixed**, **verified already closed**, or
**deliberately not done, with the reason**.

| Group | Rows | Outcome |
| --- | ---: | --- |
| Live defects fixed | 22 | v0.53.0–v0.68.0. Each reproduced against the current code *before* being written about. |
| Verified already closed by a later batch | 10 | v0.60.1, v0.65.0, v0.67.0. Recorded with the specific guard checked, not assumed. |
| Explicit "Keep" in the audit | 9 | Untouched, as instructed. Length alone was never a reason to open them. |
| No action, deliberately | 3 | `app/globals.css`, `prisma/schema.prisma` (no behaviour attached, real risk), `VocabPanel.tsx` (the verdict itself found no defect). |
| Dev-only art generators | 73 files | Out of scope by §0.7's own classification — they do not execute in the deployed app. |

**What the tranche found that the audit did not.** Nine readings were wrong or materially
misstated, and each was corrected in place rather than worked around:

- `DiscoveryTree`'s "cycle-unsafe recursion" was wrong; the real defects were silent node LOSS,
  a `RangeError`, and a quadratic width recomputation (v0.53.0).
- `openalex.ts`'s "one host assertion closes it" missed that the **credential travelled with the
  request** — SSRF *and* API-key exfiltration (v0.55.0).
- `discoveryStore`'s O(n²) delete is 48 ms on 2,000 nodes; the unnamed **infinite loop** on a
  self-parented row was the real defect (v0.56.0).
- `TeacherRubricScoring`'s "track switching discards unsaved state" does not happen — the toggle
  blurs first. What is discarded is the failure *message* (v0.57.0).
- `LiteratureFeature`'s "boolean views can overlap" is unreachable; `LabScene`'s **is** reachable,
  because `ActivityPanel` alone has no backdrop (v0.59.0, v0.61.0).
- `SourceReader`'s duplicate save is benign — the KP award is idempotent per node (v0.60.0).
- `articles.ts`'s host and content-type findings are not live exposures; only the byte cap was
  (v0.62.0).
- `student-overview`'s pairing defect was real on 2026-07-23 and closed by v0.48.0 three days
  later; the query count is 20–21, not ~18 (v0.60.1).
- `complete-service.ts` was classified as already-answered and **was not** — two live defects
  with zero test coverage, including a reproduced lost update that lowered a best score (v0.68.0).

**What this tranche is NOT.** Three things were attempted and stopped rather than forced:
the `ApiError` rename (reverted — it broke `synthesis-matrix`, evidence on the row);
`student-overview`'s lazy-loaded sections and `TeacherRoster`'s pagination (product decisions
about first paint, not refactors). Two E2E problems were found and are tracked in `docs/TODO.md`
rather than papered over: `upgrades` AC12 is **RED at HEAD** and takes four more criteria down
with it, and `F3-plan-paste` is **flaky**. The handoff's "309 passed / 0 failed" baseline is
stale.

Vitest 1,769 → **1,852**. Gates 1–5 green on every batch in the tranche.

---

---

## Executive verdict

scienium should remain a **modular monolith**. The product does not need microservices, an
event bus, or multiple databases. It needs vertical feature boundaries, thin transport
adapters, durable paid/background work, bounded reads, runtime-validated contracts, and
production-grade observability.

Several foundations are sound: PostgreSQL is the durable source of truth; team-scoped student
guards re-prove membership; mutation schemas are generally strict and bounded; and paid routes
refuse a production memory-only limiter. The historical v0.29.4 findings described below did
close. They are **not a current readiness verdict**: §0 found self-asserted school
authorization, bypassable showcase moderation, client-asserted destructive confirmations,
incorrect research-safety paperwork, cross-tenant/cyclic graph corruption, non-atomic paid
work, and fail-open runtime limiting. Open teacher registration was reviewed and accepted by
the product owner on 2026-07-23. The remaining current items take precedence over the Track B
cleanup program.

> **The tenancy policy is settled; its implementation is not fully compliant.** The original audit's
> headline finding was a contradiction between `Team.classId` (ADR-001) and membership-derived
> teacher access, and it recommended making a team belong to exactly one class. **The product
> rejected that recommendation.** `docs/architecture/adr-004-per-student-class-membership.md`
> supersedes ADR-001: class membership is **per student**, `Team.classId` is vestigial, and a
> teacher of any member may see shared team artifacts. That decision stands, and **runtime
> compliance landed in v0.30.0 (A2)**: onboarding no longer writes `Team.classId` and the
> teacher roster no longer reads it, with cross-class and null-class roster matrices pinning
> both directions. Any prose recommending the single-class model remains obsolete.

### Implementation posture: strengthen, do not rewrite

- **Do not perform a repository-wide rewrite.** Preserve the current Next.js application,
  routes, URLs, database, components, and user flows.
- **Do not move every file into `src/features/**`.** That tree is a direction for files
  already being changed, not a prerequisite for quality.
- **Do not change API contracts, persistence models, and UI behavior in the same step.**
  Characterize behavior first, extract it unchanged, then change behavior separately.
- **Do not create repository interfaces around trivial Prisma reads.** Extract services where
  there is authorization, a transaction, concurrency, paid work, provider orchestration, or a
  reusable business rule.
- **Do not replace working state/data libraries merely for consistency.**
- **Do not delete or merge files unless they are proven unused.** §6.1 is a cleanup list with
  explicit preconditions.

The practical refactor is a **strangler migration inside the existing modular monolith**.
Most UI, pure helpers, content, art, and stable routes should remain untouched.

### Scope calibration

| Track | Required scope | Expected impact |
| --- | --- | --- |
| **R — July 23 before pilot** | **OPEN.** Close P0-R2/R3/R4 and the P1 launch program in §0; ACCEPTED-R1 is optional. | Verified school authority, revision-bound showcase moderation, corrected reviewed safety guidance, server-owned destructive/paid commands, durable work, enforceable releases |
| **A — Historical v0.30.0 findings** | Historical implementations remain useful, but the no-threshold counter-audit **reopened the breadth of A3/A5/A7/A9/A13 assurances** (E2E enforceability, deletion atomicity, logging, modal coverage, migration safety). | Provenance plus reusable primitives; not current pilot sign-off |
| **B — Clean industrial code** | Incrementally extract complex workflows, unify feature contracts/clients, split mixed-responsibility files, standardize route adapters and durable events | Meaningful changes across authored runtime code over time, one feature at a time |
| **C — Deferred/optional** | Broad `src/features/**` relocation, generalized job platform, generated-content reorganization, deleting `shared-types`, tooling-repository cleanup | Do only when justified by active work or measured operational need |

### Priority summary — open items only

Track A's named findings remain historical close-outs. The following list is the current
2026-07-23 order; §0 and `docs/SECURITY.md` contain the evidence and acceptance criteria.

| Priority | Finding | Consequence |
| --- | --- | --- |
| ~~P0~~ **CLOSED v0.34.0** | `school_only` trusts student-editable `User.schoolId` | Level withdrawn; fails closed to team-only pending verified `SchoolMembership` |
| ~~P0~~ **CLOSED v0.35.0** | Showcase approval is not bound to the content/assets served, and reviewers cannot inspect required pending assets | Approval names a content digest; any covered change resets to review; teacher preview streams the exact pending revision |
| ~~P0~~ **CLOSED v0.34.0** | The ISEF guide assigns the wrong names, timing, and applicability to required forms | Versioned 2027 edition, titles only, applicability fail-closed until a qualified reviewer signs off |
| ACCEPTED / OPTIONAL | Fresh accounts can self-provision `teacher` | Intentional open-registration policy; optional grant/domain/allowlist hardening later |
| P1 (bypass **CLOSED v0.38.0**) | Client assertions authorize destructive shared actions | Server-issued single-use `DestructiveProposal` binds actor/team/command/payload/expiry; the capability matrix remains a product decision |
| P1 (partial) | Paid phase advancement and daily AI caps are not atomically claimed | Phase advancement **CLOSED v0.41.0** (claim + CAS); the daily AI caps / budget ledger (P1-R3) remain open |
| P1 (partial) | Team invite redemption and class decisions use stale pre-checks | Invite redemption **CLOSED v0.34.1** (conditional consume); class decisions (P1-S2) still open |
| ~~P1~~ **CLOSED v0.34.1** | Discovery accepts foreign-team parents and cycles | Same-team acyclic validation before any write; 400 on rejection |
| ~~P1~~ **CLOSED v0.36.0 + v0.37.0** | Quiz generation/grading trusts malformed model cardinality/IDs; retry/explain/follow-up paths lack complete claims | Cardinality + canonical denominator (P1-S3); retry grading claim + monotonic session, explain in-lock derivation + unique attempt sequence, follow-up claim row (P1-R11/S6/S7). Result replay stays with the P1-R3 ledger |
| P1 | Paper-processing stale-lease recovery is not fenced | An old worker can overwrite a newer worker and both can pay |
| ~~P1~~ **CLOSED v0.34.1** | A failed quiz-history GET starts a new paid quiz | Generation requires an explicit `session: null` or student intent |
| P1 | Matrix checks do not wait for cell saves | Stale work can be graded, cached, and rewarded |
| ~~P1~~ **CLOSED v0.39.0** | Asset deletion is split from ledger orphaning, and the sweep terminalizes before physical delete | One transaction per deletion; `deleting` lease state before the terminal write |
| ~~P1~~ **CLOSED v0.40.0** | Matched students can run paid syncs that mutate the global fair catalog | One claimed crawler + cooldown, validated output, bounded year, CAS publish, provenance |
| ~~P1~~ **CLOSED v0.34.0** | DOI-only uploads are labeled “peer-reviewed” | Mapping deleted; DOI is shown as an identifier, tier is `null` |
| ~~P1~~ **CLOSED v0.34.0** | Substring-only Google Docs validation stores an attacker URL behind a trusted teacher link | URL parsed and host-pinned; only the canonical doc URL is persisted |
| ~~P1~~ **CLOSED v0.34.0** | Upstash runtime errors fail open, including unvalidated pipeline errors | Elements validated; paid tiers 503, read/mutate documented fail-open |
| P1 | Cron/activity/email side effects lack uniform claims/outbox durability | Duplicate email, dropped history, bursty paid work |
| P1 | The configured E2E workflow has no Prisma DB env, conflicting DB parsers, and impossible fresh-seed order; real-Postgres tests self-skip | A green or configured release can omit/fail browser and database-invariant validation |
| P1 | A13's unique-index migration has no historical dedupe/preflight | Production deploy can fail on rows the old schema/code permitted |
| P1 | No durable AI operation/cost ledger, global budget, or kill switch | Spend and provider outcomes cannot be reconciled |
| P1 | No append-only security audit events or actionable alert thresholds | Role/privacy/destructive abuse is hard to detect or investigate |
| ~~P1~~ **CLOSED v0.35.1** | `link_only` uses a title-derived slug plus only 24 random bits | 128-bit rotatable share token gates both the page and the asset bytes |
| P1 | Team/class membership has no complete switch/leave/remove/transfer/revoke/archive lifecycle | Stale membership becomes stale authorization and pilot support cannot repair it safely |
| P1 | Account export/deletion and retention are manual or undefined | Minor data and private objects cannot be proven removed on request |
| P1 (partial) | Codex authoring and count-based catalog seeders can return false clean/stale success | Forms seeder now keys on code coverage (v0.34.0); the Codex authoring workflow and `seedFairsBatched` remain open |
| P2 | Outbound HTTP lacks redirect/host/byte policy | SSRF and memory/resource exposure remain |
| P2 | ~600 6–9px text declarations still await a **size** design pass; no WebKit/Firefox E2E coverage (A9 remainder — contrast floored to 40% white; sizes deliberately unchanged) | Low-vision readability on tiny chrome still a size question, but the worst faint-contrast text is fixed |
| P2 | Feature ownership split across `app`, `components`, `lib`, `stores`, and component-local API/type files | One contract change touches several unrelated trees |
| P2 | Client fetching has competing patterns (35 component files call `fetch` directly) | Inconsistent cancellation, stale-response handling, parsing, errors |
| P2 | Client load/mutation state collapses failures into empty data and restores whole stale snapshots | Users see false “new/empty” state or lose newer concurrent work |
| P2 | Modal stack, custom dialogs, labels, keyboard controls, and narrow layouts are incomplete | Escape can close two layers; key controls are unnamed/unreachable; phone/AT behavior is unproven |
| P2 | Count caps and bounded reads are application pre-checks or silent truncation | Classroom concurrency can exceed limits and make persisted records disappear from the UI |
| P2 | `globals.css` plus six UI/store/provider hotspots combine materially different responsibilities | Merge pain and unclear ownership |
| P2 | Data lifecycle is documented but untested; storage cleanup can be erased by cascade | Deletion/export behavior and object cleanup can regress unnoticed |
| P2 | Reward-minting duplicated across the grade paths (SVC-1, inherited from `docs/REFACTOR.md`) | Money logic in several places will diverge |
| P3 | Large generated/static domains obscure authored code | Reviewability and ownership suffer |

### v0.30.0 close-out (2026-07-19, working tree)

Track A was executed the same day. Status per finding (see `docs/CHANGELOG.md` [0.30.0] for
the full change list):

| Finding | Status |
| --- | --- |
| A1 | **Closed** — PvP consistently documented as not shipped (the one "has shipped" claim in ARCHITECTURE.md corrected; in-app surface already honest: StubFeature + 501). `shared-types/src/pvp.ts` retained pending the post-pilot PvP decision. |
| A2 | **Closed** — quiz GET team-scoped (test now expects 404), onboarding stops writing `Team.classId`, roster stops reading it; cross-class + null-class roster matrices added. |
| A3 | **Historical browser code landed; release-gate claim reopened by P1-S13.** Smoke/full jobs exist, but the current workflow does not export Prisma's database env, can split tools across two databases, and seeds before identity materialization. Earlier hitbox/browser results remain snapshot evidence only. |
| A4 | **Run-ledger slice closed; notification contract still open.** `NotificationRunTeam`, continuation, and bulk fair indexing exist. Per-member read state, saved deadline preferences, and exactly-once email delivery are not implemented correctly (P2-S3). |
| A5 | **Upload/attach slice closed; deletion lifecycle reopened by P1-S8.** Reservation-first attach and showcase slot locks are valuable. Paper/showcase deletion still commits domain removal before ledger orphaning, so the broad “no attached row without an owner” claim is false. |
| A6 | **Closed** — `lib/economy/lab-credit.ts`: P2002-only "already paid", retry + redacted event + explicit `lcAward` state; failure-injection tests incl. P2025. |
| A7 | **Ten known payload sites closed; broad closure reopened by P2-S11.** The discovery article route logs a raw request-derived title, and the static sweep misses it because it recognizes only a finite variable-name list. |
| A8 | **Closed** — `retryGenClaimedAt` claim election before the paid call; concurrent Promise.all test + real-Postgres race. |
| A9 | **Base primitive/contrast work landed; structural breadth reopened.** `useModalA11y`, focus-visible, reduced-motion, and prior axe smoke are useful. Nested document listeners are not stack-safe, custom dialogs/popovers bypass the primitive, several controls lack names/keyboard behavior, and phone/WebKit/Firefox/AT coverage remains open. |
| A10 | **Closed** — hub tabs are dynamic boundaries; `/daily/log` and `/daily/failure` measured 582 KB → **211 KB** first-load JS. |
| A11 | **Closed (narrow scope)** — `test/pg/invariants.pg.test.ts` covers quota lock, LC unique, claim election, view dedupe on real Postgres; the in-memory harness stays policy-only (it gained read-only `groupBy`/`createManyAndReturn` support, no constraint emulation). |
| A12 | **Closed** — `reserveUploadAsset` advisory-lock quota; per-(showcase, slot) locks for single-slot replacement and multi-slot caps (asset, link, and works-cited routes). |
| A13 | **Runtime invariant implemented; deploy safety reopened by P1-S14.** The day key and duplicate-safe current write exist, but the migration adds the unique index without deduping historical rows that the old schema/race-prone writer allowed. |
| A14 | **Closed for this release** — AGENTS/CLAUDE (Next 15, real CI lanes, PvP phrasing), SECURITY.md harness/remediation sections, ARCHITECTURE.md PvP claim, this table. Coverage thresholds remain unconfigured (open). |
| P1-2 | **§3.2 E queue COMPLETE** — all six inline-workflow routes extracted to application services: teacher student-overview (`lib/teacher/student-overview.ts`), project-log (`lib/logs/project-log-service.ts`), codex complete (`lib/ops/codex/complete-service.ts`), codex study-plan (`lib/ops/codex/study-plan-service.ts`), research-plan review (`lib/research-plan/review-service.ts`, streaming: service returns replay/stream variants), research-plan idea-check (`lib/research-plan/idea-check-service.ts`). Remaining P1-2 work is migrate-on-touch: standardize simple routes onto the adapter shape when they are next changed — do NOT batch-wrap the ~90 remaining simple handlers. |
| N+1 sweep | Narrow echo/query improvements landed. Broader “fixed” wording is withdrawn: forms seeding lacks its promised unique key, measurements use a racy cap and silently truncate, and notifications do not have per-member read/preference semantics. |

The pre-existing `e2e/F1.spec.ts` AC5 failure recorded here was diagnosed and **fixed in
v0.31.0** — a client stale-response race (an in-flight feedback GET overwriting the
optimistic update), not a route defect. F1 is 13/13.

### v0.31.0 close-out (2026-07-20, working tree)

| Item | Status |
| --- | --- |
| **P1-2 / §3.2 E** | **CLOSED** — all six inline-workflow routes are thin adapters over application services (`lib/teacher/student-overview.ts`, `lib/logs/project-log-service.ts`, `lib/ops/codex/{complete,study-plan}-service.ts`, `lib/research-plan/{review,idea-check}-service.ts`), joining `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`. Streaming services return typed replay/stream variants. The ~90 simple handlers stay direct-Prisma **by design** — migrate-on-touch only. |
| **P2-2 `fetchWithPolicy`** | **Transport consolidation complete; safety partial.** `fetchWithRetry` is shared, but `Retry-After` is unbounded, retry bodies are not cancelled/consumed, and there is no total deadline/byte cap/redirect policy. |
| **P2-1 residual reads** | **Narrow response-shape work closed; capacity semantics reopened.** Measurement POST returns only new rows and teacher auth is bounded, but experiment/measurement lists silently truncate and count caps race (P2-S1/S2). |
| **Full-repo over-engineering audit** | **DONE (2026-07-20)** — 601 authored files audited (477 lean), 136 findings adversarially verified, 121 applied, ~15 rejected as behavior-changing, 2 unverified and deliberately not applied. −2,762 net lines. Deleted: `lib/discovery/ncbi.ts`, `packages/shared-types/src/pvp.ts`, dead signed-URL/env accessors. Added shared primitives — see `docs/CHANGELOG.md` [0.31.0]. |
| **P2-4 god files** | Partially reduced, none split: LabProfileSettings 718→565, ExpertisePanel 584→574, ScienceFairFeature 568→548, TeacherRoster 547→518, openalex 601→577, discoveryStore 605 (unchanged). Splitting remains open. |

### Verification baseline (2026-07-20, working tree)

- Branch `Rig-features`, uncommitted working tree at the time of writing.
- Gates 1–5 pass: shared-types build, text integrity, typecheck, lint, production build.
- Vitest: **89 files / 1,286 tests passed**.
- Real-Postgres invariants: `test/pg/invariants.pg.test.ts` (4 tests) against the local dev
  database; self-skips when no database is reachable.
- Playwright: nine suites were re-run green against the surfaces this work touched — `a11y`,
  `settings-smoke`, `topic-removal-confirm`, `placement`, `F1` (13/13), `F13-codex` (15/15),
  `F18-vega-companion` (11/11), `papers-tab` (15/15), `F11-quiz-retry` (14/14). The full
  serial suite was intended to be the release lane in `.github/workflows/e2e.yml`. The later
  no-threshold counter-audit proved that configuring `E2E_ENV_FILE` alone does not bind it:
  Prisma env propagation, duplicate DB parsing, and identity/seed order are broken (P1-S13).
- Production build measures `/daily/log` and `/daily/failure` at **211 KB** first-load
  JavaScript (was ~582 KB before A10).
- A live `pnpm audit` advisory lookup is still not performed here; `docs/SECURITY.md` owns
  that open CI control.

### Verification baseline (2026-07-23, current working tree)

- Pipeline gates 1–5 were rerun after the audit document updates: shared-types build, text
  integrity, TypeScript, lint, and production build all pass.
- Vitest: **88 files passed, 1 skipped; 1,291 tests passed, 4 skipped**.
- The directory-aware Codex check passes with **11 aligned tracks**. Normal CI still does not
  invoke that check (P2-S12).
- Production build passes and renders 93 static pages. It emits one existing bundler warning
  from `unpdf@1.6.2` about direct `import.meta` access on the showcase upload import path.
- Full Playwright E2E was not rerun: it requires the dev database/seed graph and E2E
  credentials, and the audit identified that CI currently passes when its secret is absent.
  Historical browser results above remain evidence for their snapshot, not this sign-off.
- All 98 route files contain a recognized guard/control identifier. This is inventory evidence
  only; direct abuse tracing found authorization defects that the guard sweep cannot express.
- A static working-tree secret pattern scan found only documented/example/CI placeholders.
  Git history and production secret stores were not scanned.
- Live dependency advisory status is **unverified**: registry access failed in the sandbox and
  dependency-inventory egress was not approved. CI must own this check.

---

## 1. End state and communication architecture

### 1.1 End state

The system must support a room of students and teachers where every access decision is
provable from one documented query, every growing list is bounded, every paid call is
accounted for, every consequential event is durable, and every failure is diagnosable
without logging student work.

### 1.2 Communication decision table

| Workload | Correct mechanism |
| --- | --- |
| Reads for a signed-in principal | Synchronous command/query through an application service |
| Paper upload → parse → store → AI metadata | Durable job (already: `PaperProcessingJob`) |
| Streaming chat/tutoring | Authenticated synchronous streaming with server-owned turn state |
| Quiz/explanation/synthesis/study-plan generation | Evaluate individually; synchronous only if bounded and idempotent, otherwise a durable job |
| Activity/notification/email after a committed change | Transactional outbox |
| Scheduled paper/cleanup/notification processing | Bounded cron worker claiming PostgreSQL rows |
| OpenAlex/NCBI/arXiv/Semantic Scholar/Wikipedia search | Server-side provider call with timeout, cache, and schema validation |

Efficiency is judged by bounded work and failure isolation, not by minimizing modules. Avoid
internal HTTP hops, duplicated provider clients, request-lifetime background promises,
polling without backoff, and synchronous chains that combine upload, parsing, storage, paid
AI, side effects, and response delivery.

---

## 2. Long-term repository direction — optional, not a gate

```text
apps/web/
  app/                              # pages/layouts and very thin route adapters only
  src/
    features/<domain>/
      contracts/                    # Zod request/response schemas; inferred TS types
      application/                  # use cases and orchestration
      domain/                       # pure invariants and value objects
      infrastructure/               # Prisma repositories and provider adapters
      ui/                           # components, hooks, feature client
      tests/                        # policy/service/route-adapter integration tests
    platform/                       # auth, db, jobs, llm, observability, rate-limit, storage, web
    shared/                         # genuinely cross-feature UI + contracts
  prisma/ content/ public/ e2e/

packages/shared-types/              # retain while web and seed/tooling consume it
packages/config/                    # retain
art/                                # retain separate deterministic asset pipeline
```

This is a navigation model, not a required migration. Industrial-quality code can retain the
current `app/`, `components/`, and `lib/` directories if their responsibilities become
consistent. Introduce this shape only for a complete feature slice already undergoing
meaningful work; do not manufacture file moves to match the diagram.

### 2.1 Route contract

Every route adapter should do exactly five things:

1. select the policy (`studentTeam`, `teacherClass`, `public`, `cron`);
2. parse params/query/body using Zod;
3. call one application use case;
4. map the typed result to HTTP;
5. emit request/cost/error telemetry.

It must not contain raw Prisma workflows, provider calls, prompt construction, economy rules,
or multi-step authorization.

**Structural reference implementations** (copy the seam, not every current behavior):
`lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`.
Their historical A5/A8 defects closed; current work must preserve those state-machine
boundaries while adding the §0 operation ledger and reward consolidation.

### 2.2 Application-service contract

Application services accept an explicit principal and a validated command/query. They own
transactions, idempotency, authorization-policy calls, and orchestration. Domain functions
remain pure. Prisma code is isolated in repositories only when that creates a real test seam;
trivial single-table reads do not need ceremonial interfaces.

### 2.3 Contract ownership

Use one Zod schema as the runtime and compile-time contract for each endpoint. Response
parsing belongs in the feature contract/client, not handwritten independently in
`components/**/types.ts`, `components/**/api.ts`, and a route. `packages/shared-types`
currently also serves seed/tooling code, so delete or replace it only after migrating every
workspace consumer and the shared build prerequisite.

---

## 3. Current architecture compared with the target

### 3.1 What is already correctly designed

Preserve and generalize these; do not replace them.

- `lib/api/route-context.ts` resolves the active team only through real `TeamMember` rows, and
  delegates the single database resolver to `lib/team/context.ts`. A stale or forged
  `activeTeamId` cannot widen student access.
- `lib/teacher/auth.ts` makes the database role authoritative over stale Clerk claims.
- `lib/rate-limit.ts` has per-user and per-IP tiers, a shared Upstash store, bounded latency,
  and fails closed for paid tiers in production.
- `lib/buildings/service.ts`, `lib/papers/service.ts`, and `lib/literature/quiz-retry.ts` establish
  the application-service seam: thin route adapters and typed results. Preserve the seam while
  fixing A5/A8; do not treat extraction alone as proof of atomicity or idempotency.
- `lib/uploads/assets.ts` gives tracked object storage a database-owned lifecycle with a single
  physical-delete site, per-team quota, and reclaim. A5/A12 cover the caller-side windows and
  quota races that occur before/around that lifecycle.
- `PaperProcessingJob` is the correct direction for durable paid processing.
- Schema-level unique constraints protect one-time/idempotent rules: duplicate team paper
  content, source visits, daily awards, plot occupancy, rubric scorer keys.
- `lib/observability/log.ts` is the right logger shape (JSON events, redaction by design,
  request ids) — it simply is not wired widely enough yet (see P1-5).
- Static sweeps prevent whole regression classes: `test/route-guard-sweep.test.ts` (every
  route carries an auth guard), `test/paid-work-guard.test.ts` (transitive closure over
  Anthropic reachability), `test/cron-guard.test.ts`, `test/prompt-injection-pins.test.ts`.
- `test/harness/route-policy.ts` plus ten policy matrices materially improve runtime access
  coverage for all 29 dynamic route files; A2/A11 define the remaining contract/real-DB limits.
- `art/` is correctly separate from the runtime application.
- 1,246 Vitest tests pass, and 310 authenticated Playwright tests exist for a production build.
  The browser suite is not an enforced CI gate (A3), so its existence is not release evidence.

### 3.2 Where control still overlaps

> **A. Team/class policy** and its runtime compliance are both resolved (ADR-004 + A2).
> **C. Team-context resolution** remains resolved: `route-context.ts` delegates to the single
> resolver in `lib/team/context.ts`. **E. Domain logic in routes** closed in v0.31.0.


E2E: `F9` **13/13**, `F5-bell` **12/12**, `upgrades` **9 passed / 1 failed**. The `upgrades`
failure is **PRE-EXISTING and was proven so, not assumed**: AC12 was re-run with this batch
stashed and fails identically at HEAD — same test, same 30s timeout, same 9 passed. The Next.js
dev error overlay (`<nextjs-portal>`) covers the page and intercepts the click on the activity
FAB. Because the file is `mode: 'serial'`, that one failure also stops AC8, AC7 and both
LC-earning cases from executing — four more criteria silently not running, the false-green
pattern §0.7's own E2E review named. Tracked in `docs/TODO.md`; the handoff's
"309 passed / 0 failed" baseline is stale.

#### B. Route guards and wrappers

`requireTeamContext`, `requireUserContext`, `requireTeacher`, cron auth, middleware
protection, and `withTeamRoute` each own part of transport policy. That separation can be
valid, but adoption is incomplete: **only 6 of 98 routes use `withTeamRoute`** (four building
mutations, two synthesis routes). Direct guard/parse/query code remains the norm.

#### D. API contracts and client state

Contracts and network logic live variously in `components/literature/{api,types,synthesisApi,vocab-api}.ts`;
`components/ops/{data-terminal,failure-log,project-log}/{api,types}.ts`;
`lib/discovery/treeApi.ts` plus `stores/discoveryStore.ts`; direct `fetch` calls in **35**
component files; and `lib/api/client.ts` for only some features. There is still no single
answer to "where does this feature's HTTP contract live?"

_One slice has landed_: `components/discovery/api.ts` is a Zod + `requestJson` feature client
built to this pattern — use it as the template.

#### E. Domain logic in routes — **RESOLVED (v0.31.0)**

Every workflow route is now a thin adapter over an application service. Nine services own the
workflows: `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`,
`lib/teacher/student-overview.ts`, `lib/logs/project-log-service.ts`,
`lib/ops/codex/complete-service.ts`, `lib/ops/codex/study-plan-service.ts`,
`lib/research-plan/review-service.ts`, `lib/research-plan/idea-check-service.ts`.

The remaining ~90 handlers are simple scoped reads/mutations that deliberately stay
direct-Prisma (see the posture rules above: no ceremonial services around trivial reads).
Standardize them onto the adapter shape only when a change already touches them.

#### F. Background work

Paper processing has a durable job model; other paid calls run inline. Fire-and-forget
`logActivity(...).catch(...)` appears at **28 of 29** call sites. Notifications carry a
per-day run ledger (`NotificationRunTeam`) and frequent continuations, but claim-after-work,
full-day-set materialization, roster rescans, and the pre-insert email race mean the prior
10,000-user simulation is not production-scale proof. Email sends and provider failures are
not represented through a general job/outbox lifecycle. The system therefore still has
several incompatible durability guarantees — see §0 and P1-6.

---

## 4. Open findings

### A3-R — Remove the isometric JS-click E2E bypasses _(P1, Track A remainder)_ — **CLOSED**

**Root cause:** each building was an absolutely-positioned `<button>` whose full transparent
rectangle (128×128 display px, sprites only fill a central silhouette) overlapped its
neighbours in the iso layout. A real pointer click on one building's visible art frequently
resolved (`elementFromPoint`) to a stacked neighbour's transparent corner, so the specs fell
back to JS `element.click()` (dispatched straight to the node, no hit-testing).

**Fix (`components/lab/LabPlot.tsx` + `app/globals.css`):** the button box is now
`pointer-events: none`; an inner `.plot-building__hit` layer carries the pointer interaction
and a `clip-path` polygon that hugs the iso-building silhouette, trimming the transparent
corners that caused the occlusion (clip-path clips hit-testing too). Keyboard activation is
unaffected (it never routed through pointer-events), and the floating `.plot-level` badge stays
outside the clip. One generic polygon covers every sprite (ponytail: per-sprite silhouettes
only if a specific building ever mis-hits).

**Bypasses removed:** the `clickBuilding` helper (6 call sites) and the three inline
`evaluate(el.click())` bypasses in `placement.spec.ts` / `upgrades.spec.ts` are deleted; every
site is now a genuine `page.getByRole('button', { name }).click()`. (The doc's earlier list
named `F11-quiz-retry`/`lit-explain-it-back` — those no longer used a bypass.) The
`dispatchEvent('pointerdown')` drag-pickups in arrange mode are real DOM pointer events, not
occlusion bypasses, and were left as-is.

**Validated in a prod-build browser (`E2E_BUILD=1`):** `rubric-self-assessment` AC10 (real
click on **Science Fair**, an occlusion-prone side gateway) and `F3` AC6–AC9 (real clicks on
**Operations Hub**, frontmost, and **Discovery**, the most-occluded centre gateway) all pass.
The one incidental `afterAll` failure observed was the documented Clerk-JWT-expiry flake on a
cleanup PUT, not a building click. Keyboard activation remains covered by `e2e/a11y.spec.ts`.
These are historical local-browser results. The current workflow does not become enforceable
merely by adding `E2E_ENV_FILE`; P1-S13 records its database-environment and seed-order
failures.

### A9-R — Classroom text readability design pass _(P2, Track A remainder)_ — **contrast done; size + cross-browser open**

The structural accessibility floor shipped for the shared panel shell:
`useModalA11y` (focus trap + restore) behind `components/ui/ModalBackdrop.tsx`, many accessible
icon-button names, a global `:focus-visible` outline, a blanket `prefers-reduced-motion`
fallback, and `e2e/a11y.spec.ts` (axe-critical + keyboard trap/restore) on desktop **and** a
tablet viewport. The no-threshold pass later found custom dialogs/popovers outside this
primitive and proved the document-level Escape listeners are not stack-safe; §0.9 is current.

**Contrast floor applied (product decision: contrast-first, keep sizes).** Chrome text is now
floored at **40% white**: 288 Tailwind `text-white/{5..35}` utilities across 80 components and
12 `color: rgba(255,255,255, <0.40)` declarations in `globals.css` were raised to the floor.
The pass is **monotonic** — it only ever increases opacity, never touches font size, and never
reflows layout — so the deliberate pixel aesthetic and dense panel layouts are preserved while
the worst faint text (the flagged 25–40% white, down to 15%) clears the floor. `border-color`
and `background` whites were deliberately left untouched.

**Still open:** the ~600 6–9 px declarations remain small **by design decision** — sizes were
kept, so whether the pixel-aesthetic chrome needs a minimum size (vs. only contrast) is still a
product call. WebKit/Firefox E2E coverage is also still absent.

### P1-1 — Complete route-policy coverage without growing a fake ORM

v0.29.4 closed the original “no route-test harness” finding for dynamic-route access checks:
`test/harness/route-policy.ts` and ten policy files exercise the real guards/rate limiter with
two in-memory teams. A2/A11 prove why the remaining work matters: a harness cannot save an
incorrect expected contract, and an in-memory store cannot prove database behavior.

**What is still missing:** matrices for static/high-risk route families; invalid input,
conflict/race, and provider-failure behavior for the large handlers in §3.2 E; and a narrow
real-Postgres adapter/HTTP suite. Preserve the four-case access matrix (same-team success,
other team's real id rejected, signed-out, over-limit), but keep the fake's mandate limited to
policy rather than reproducing Prisma.

### P1-2 — Migrate high-risk routes first; standardize the rest incrementally — **CLOSED**

The §3.2 E workflow-extraction queue closed in v0.31.0. The remaining P1-2 work was to move
the highest-risk *mutations* onto `withTeamRoute` (the guard-return footgun matters most where
a forgotten `if (error) return error` widens tenancy). Four are now migrated, behaviour
preserved:

- `app/api/team/location/route.ts` — body via the wrapper.
- `app/api/team/invite/route.ts` — no body; guard returns → `ApiError`.
- `app/api/showcase/asset/[id]/route.ts` — dynamic-param DELETE (exercises the wrapper's
  `params` path).
- `app/api/showcase/asset/link/route.ts` — guard via the wrapper, but body parsed **inside**
  the handler so the "save your showcase first" 409 still precedes any body-shape 400.

`team/advance-phase` was deliberately **not** migrated: its prelude is non-standard (conditional
body parse + a mid-handler `ai`-tier rate-limit on only the paid transition), exactly the case
`with-route.ts` documents as keeping `requireTeamContext` directly. Every migrated route still
passes `test/route-guard-sweep.test.ts` and the policy harness.

The remaining ~90 direct-Prisma handlers stay **migrate-on-touch by design** (posture rules:
no ceremonial wrapping of trivial scoped reads/mutations) — do not batch-wrap them.

### P1-4 — Durable AI/job ledger

_Narrowed._ Token accounting already exists as structured logs: `lib/anthropic.ts` emits
`inputTokens`/`outputTokens` for every call and stream. What is missing is a **durable
record** — there is no `Job`/`AiInvocation` model, no idempotency keys, and no spend
reconciliation; only `PaperProcessingJob` exists.

For workflows needing retryability, asynchronous execution, or spend reconciliation, create a
general job model or feature-specific jobs sharing one worker contract. Record tenant, user,
operation, idempotency key, model, prompt-version hash, state, attempts, next-run time,
provider request id, token counts, and terminal error code. Evaluate each AI workflow
individually; do not migrate for uniformity. Streaming chat may stay synchronous, but still
needs server-owned turn state and enough usage metadata to enforce cost policy.

### P1-5 — Widen structured observability

_Narrowed._ `lib/observability/log.ts` exists and is correct. It is wired into five modules:
`lib/anthropic.ts`, `lib/rate-limit.ts`, `lib/cron/auth.ts`, `lib/literature/process-paper.ts`,
`app/api/cron/papers/route.ts`. Sentry is configured across all three runtimes.

**Missing:** a request wrapper, per-route latency/outcome events, and policy-denial events on
ordinary routes. Emit `requestId`, `route`, `operation`, opaque `userId`/`teamId`, duration,
outcome, provider, jobId, model, and token usage — redacting payloads by default.
Before widening instrumentation, remove the raw request title and normalize raw provider/
`Error` logging identified by the reopened A7/P2-S11 finding so the structured migration does
not coexist with a privacy-unsafe fallback convention.

### P1-6 — Make consequential side effects durable

The current tree has 29 `logActivity(...)` call sites; 28 attach `.catch(console.error)`.
Losing an activity entry may be acceptable, but the code does not distinguish optional
analytics from user-visible history.
Use a transactional outbox for activity/notification events that matter to teachers or
progression; name and document genuinely best-effort telemetry as such.

### P2-1 — Bound growing reads — **REOPENED FOR TEACHER SCALE**

The v0.31.0 named offenders are fixed: `data-terminal/route.ts` caps experiments at 200,
`measurements/route.ts` caps at 2,000 per experiment and its POST now returns only the
created rows (`createManyAndReturn`) instead of echoing the full history, and the
`lib/teacher/auth.ts` class lookup is capped. The new audit found that roster/reports then
load all students and proficiency rows for that scope; student overview loads growing team
history; and the 200-class cap silently truncates an authorization scope rather than reporting
overflow. Paginate those reads and never use silent truncation as an authorization boundary.

Standing rule: not every `findMany` needs pagination — fixed vocabularies and rubric rows are
naturally bounded. Define limits in contracts, not ad hoc route constants.

### P2-2 — Standardize external-provider behavior — **PARTIAL**

`lib/fetch-retry.ts` is the single provider primitive: a `Promise.race` timeout (an abort
alone does not interrupt a stalled OS-level connect), 429/5xx `retry-after` backoff capped at
two retries, an optional network-error retry for feeds, and normalized errors. Every discovery
adapter (`openalex`, `articles`, `patents`, `semanticscholar`, `medlineplus`) and the wiki
article route is a one-line binding supplying only its headers, timeout, and backoff base;
the six duplicated `sleep` definitions collapsed into the same module.

Still standing rule: never retry a non-idempotent provider write without an idempotency key.
The policy is not complete: add response-size/content-type caps, redirect revalidation,
scheme/host/DNS/private-range checks, and require OpenAlex citation URLs to stay on an
allowlisted host. Google Docs currently follows redirects outside this primitive.

### P2-3 — Consolidate client data access

Do not adopt TanStack Query for fashion. A small feature-client layer solves the current
inconsistency: runtime response decoding, abort signals, standard errors, request
de-duplication. For screens with real cache/invalidation pressure, TanStack Query is
justified; otherwise typed hooks over `requestJson` suffice.

The client helper has meaningful adoption, but **35 component files still call `fetch`
directly**. Move
networking out of large UI components (`TeacherRoster`, `LabProfileSettings`,
`ScienceFairFeature`, `ExpertisePanel`, discovery shells). UI should render state and emit
intent. Template: `components/discovery/api.ts`.

### P2-4 — Break remaining god files by responsibility

Line count alone is not a defect. These authored files combine materially different
responsibilities (counts refreshed 2026-07-23):

| File | Lines | Mixed responsibilities |
| --- | --- | --- |
| `app/globals.css` | 3,051 | tokens, global/base chrome, and many feature styles in one cascade hotspot |
| `components/settings/LabProfileSettings.tsx` | 565 | several settings domains + loading + mutation + rendering |
| `lib/discovery/openalex.ts` | 577 | multiple endpoint contracts, mapping, caching, provider behavior |
| `stores/discoveryStore.ts` | 605 | server synchronization + several interaction concerns |
| `components/ops/ExpertisePanel.tsx` | 574 | state machine + networking + exam UI + result UI |
| `components/fair/ScienceFairFeature.tsx` | 548 | matching + selection + deadlines + presentation |
| `components/teacher/TeacherRoster.tsx` | 518 | roster + classes + join requests + mutations + UI |

Split along behavior/state ownership, never a line-count quota. Keep cohesive large pure
tables or tests intact.

### P2-6 — Test the data lifecycle

_Reframed._ The inventory landed (`docs/runbooks/data-export-delete.md`), and the schema has
ten `onDelete: Cascade` rules. **The tests did not.** There is no lifecycle/deletion test
file. Add tested deletion behavior for User/Class/Team, uploaded assets, publications,
activity, LLM history, and teacher feedback.

Do not split `schema.prisma` (currently 1,829 lines) using unsupported conventions. Generate
a domain-index document from it, or adopt Prisma's supported multi-file schema only after
verifying the deployed Prisma version and migration workflow.

### SVC-1 — Consolidate reward minting _(inherited from `docs/REFACTOR.md`, now deleted)_

Currency reward-minting is duplicated near-verbatim across **three** sites — the
`paper-quiz:` lock tail, the award calculation, and the `teamCurrency.upsert`:

- `app/api/papers/[id]/quiz/grade/route.ts` (~174)
- `lib/literature/quiz-retry.ts` (~490)
- `app/api/expertise/grade/route.ts` (~154, plus its own clearance raise)

Money logic in several places will diverge. Create `lib/literature/quiz-service.ts` and
`lib/clearance/exam-service.ts`; move the transaction, award, and `logActivity` in; leave the
routes thin.

**Template already shipped:** `lib/economy/lab-credit.ts` (A6) is the shape to copy — one
module owning the transaction, the P2002-only duplicate rule, retry, the redacted failure
event, and an explicit outcome the caller maps to HTTP. Follow it rather than inventing a
second convention.

> This item was originally deferred "until after the PvP concurrent window." PvP did **not**
> ship (A1), and no active concurrent PvP implementation owns these files, so that rationale
> no longer blocks SVC-1.

### P3-1 — Reduce root/tooling noise

The repository tracks hundreds of `.claude` pipeline/agent files and art-pipeline files
alongside the product. Not a runtime defect, but it enlarges review and search scope. Keep
required agent instructions; move historical pipeline outputs to an archive or a separate
tooling package if they are not active inputs. Never delete without confirming workflow
dependencies.

---

## 5. Scope

### 5.1 Clean industrial-level code (Track B)

Apply incrementally, ideally when the work overlaps a file you are already changing:

1. ~~**Thin high-risk routes.**~~ **DONE (v0.31.0)** — every workflow route is an adapter
   over one of nine application services; simple reads deliberately stay direct-Prisma.
2. **One runtime contract per endpoint.** Co-locate Zod request/response schemas with feature
   clients and infer TypeScript types from them.
3. **Consistent route adapters.** Standardize principal resolution, parsing, error mapping,
   request IDs, and telemetry. Migrate routes when touched, not all 98 at once.
4. **Feature-owned client networking.** Move ad hoc fetch/state orchestration out of large
   visual components, preserving specialized streaming, upload-progress, and tolerant-error
   paths.
5. **Responsibility-based file splits.** Split the P2-4 hotspots by state machine or domain
   responsibility.
6. **Durable consequential events.** Add an outbox for events whose absence changes
   teacher-visible or progression-relevant state; keep non-critical telemetry best-effort.
7. **LLM usage accounting.** Record operation, prompt version, model, token usage, result, and
   tenant-safe correlation. Generalize jobs only where durability or async execution is needed.
8. ~~**Provider policy.**~~ **DONE (v0.31.0)** — `lib/fetch-retry.ts` centralizes timeout,
   retryability, backoff, and normalized errors for every provider adapter. Response-size
   caps remain per-adapter.
9. **Lifecycle correctness.** Implement tested export, deletion, and storage reconciliation
   rather than stopping at an inventory document.
10. **Dependency direction.** UI depends on feature contracts; routes depend on application
    services; feature code depends on platform code, never another feature's components.
11. **Architectural checks.** Add import-boundary, contract, and policy tests where they
    prevent a demonstrated regression.
12. **Explicit communication semantics.** Classify each workflow as synchronous, streaming,
    durable job, or outbox. Prohibit internal HTTP calls between feature modules and provider
    calls hidden inside GET reads.
13. **Failure-step verification.** For storage/economy/LLM workflows, inject a failure after
    every external/transactional step and prove retry or reconciliation behavior.
14. **Enforce release tests.** Keep a bounded real-pointer browser lane in PR CI and an
    isolated full E2E lane for release/nightly execution.
15. **Accessibility floor.** Centralize modal/focus behavior, accessible names, readable
    chrome, and automated keyboard/axe checks rather than fixing screens ad hoc.

### 5.2 Explicitly deferred or optional (Track C)

- moving the application under `apps/web/src/features/**`;
- rewriting all 98 API routes;
- repository interfaces for every Prisma model;
- migrating every direct client `fetch` immediately;
- replacing Zustand or local React state wholesale;
- adopting TanStack Query globally;
- splitting `schema.prisma` solely because it is large;
- deleting `packages/shared-types`;
- untracking generated Codex modules;
- relocating `.claude`, art, or pipeline history;
- microservices, a message broker, or a second database;
- an all-purpose job framework before concrete workflows require it.

---

## 6. File-by-file disposition

### 6.1 Delete — cleanup phase only

Delete only after the corresponding migration is complete and references are proven absent:

| File | Action and precondition |
| --- | --- |
| `apps/web/components/literature/api.ts` | After schemas/client move to a literature feature contracts + client module. |
| `apps/web/components/literature/types.ts` | After types are inferred from canonical schemas. |
| `apps/web/components/literature/synthesisApi.ts` | After merge into the literature feature client. |
| `apps/web/components/literature/vocab-api.ts` | After merge into the literature feature client. |
| `apps/web/components/ops/data-terminal/{api,types}.ts` | After merge into the research/experiments contracts + client. |
| `apps/web/components/ops/failure-log/{api,types}.ts` | After merge into the research/log contracts + client. |
| `apps/web/components/ops/project-log/{api,types}.ts` | After merge into the research/log contracts + client. |
| `apps/web/lib/discovery/treeApi.ts` | After its client functions move beside Discovery contracts/UI — it is browser API code despite living under `lib`. |
| `apps/web/components/teacher/student-detail/types.ts` | After teacher response types are inferred from teacher contracts. |
| Generated `apps/web/lib/ops/codex/tracks/*.ts` and `index.ts` | Only if the build reliably generates them before typecheck/build and deploy artifacts include them. Otherwise retain as explicitly generated. |
| `packages/shared-types` | Only after migrating both the web imports and seed/tooling consumer and removing the build prerequisite. (`src/pvp.ts` was deleted in v0.31.0; the package still owns used enums.) |

No runtime file is recommended for deletion solely because it is large or duplicated.

### 6.2 Merge/consolidate incrementally

| Current files | Target |
| --- | --- |
| `lib/teacher/auth.ts`, `lib/teacher/role.ts` | one teacher-principal module + a classroom policy module |
| `lib/api/with-route.ts`, `lib/validation.ts`, HTTP error mapping | one platform route module with policy-specific wrappers and Zod params/query/body |
| Feature `api.ts`/`types.ts` pairs | one feature-owned contracts module and one UI client module |
| `lib/anthropic.ts` plus prompt-call conventions scattered across routes/libs | an LLM gateway with a usage ledger, prompt/version registry, and test fake |
| Provider fetch/retry/timeout fragments | one `fetch-with-policy` used by every provider adapter |
| `logActivity(...).catch(...)` patterns | a transactional outbox for durable events; an explicit best-effort helper for telemetry |

### 6.3 Create when the corresponding slice is implemented

Suggested destinations, not prerequisites. Equivalent cohesive modules under the existing
`lib/**` structure are acceptable and lower-risk.

- a principal module — discriminated student/teacher/admin/system principals;
- a platform route module — request ID, policy, strict Zod parsing, standard errors, telemetry;
- `fetch-with-policy` — bounded external requests and normalized provider errors;
- observability metrics — route/provider/job/LLM measurements;
- jobs `types.ts` / `repository.ts` / `worker.ts` — bounded atomic claim/retry contract;
- `events/outbox.ts` — consequential internal events that must eventually be delivered;
- `llm/gateway.ts` — model policy, prompt version, token/cost recording, timeouts;
- a real-Postgres route/invariant harness for the narrow cases the existing in-memory
  `test/harness/route-policy.ts` cannot represent (A11/P1-1);
- a jobs/outbox/AI-usage migration — only for workflows proven to need it;
- `docs/architecture/adr-005-jobs-outbox-and-ai-usage.md`.

After each slice, create vertical folders only as complete domains are actively migrated.
Recommended order: team/economy, literature, research/logs, discovery, curriculum,
fair/showcase.

### 6.4 Edit when touched

- `app/api/onboarding/teacher/route.ts`, `lib/teacher/auth.ts`, and teacher onboarding UI:
  keep class-scoped database-owned authorization. Optionally add a teacher grant/domain/
  allowlist if open registration is later withdrawn; it is not a current launch requirement.
- `lib/onboarding/profile.ts`, `app/api/settings/route.ts`, `lib/showcase{,-server}.ts`, and
  showcase public routes: separate self-reported school display data from verified school
  membership before retaining `school_only`.
- `app/api/showcase/route.ts`, showcase asset mutation routes, teacher moderation routes, and
  moderation UI: bind decisions to a content revision, reset review on every covered mutation,
  and give authorized reviewers an exact pending-revision preview.
- `app/api/discovery/topic/route.ts` and `app/api/discovery/tree/route.ts`: enforce the
  capability matrix and consume a server-owned destructive proposal; route all object
  retirement through the storage ledger.
- `app/api/team/advance-phase/route.ts`, `lib/research-plan/idea-check-service.ts`, and other
  paid commands: claim an operation/budget slot and use compare-and-set/idempotency.
- `lib/rate-limit.ts`: validate Upstash command responses, fail paid tiers closed on runtime
  store failure, add structured health metrics, and bind client IP to one trusted edge header.
- `app/api/cron/{notifications,papers}/route.ts`: claim-before-work, bound paid concurrency,
  and deliver email through an outbox.
- `lib/research-plan/google-doc.ts`, `lib/discovery/openalex.ts`, and `lib/fetch-retry.ts`:
  adopt the complete outbound HTTP policy in §0.4.
- image upload routes: enforce decoded-pixel limits and re-encode/strip metadata before store.
- `components/settings/LabProfileSettings.tsx`, `components/ops/ExpertisePanel.tsx`,
  `components/fair/ScienceFairFeature.tsx`, `components/teacher/TeacherRoster.tsx`,
  `stores/discoveryStore.ts`, `lib/discovery/openalex.ts`: split per P2-4 **only when
  changing that feature**.
- `app/globals.css`: split into ordered CSS layers by tokens/base and feature ownership while
  retaining one import/cascade entry point.
- `docs/ARCHITECTURE.md`: keep it describing what is implemented, never intentions.

### 6.5 Keep as-is or preserve conceptually

- `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts` — preserve
  their application-service boundaries; add current operation/reward invariants without
  reopening the historical A5/A8 fixes.
- `lib/api/client.ts` — preserve its central request/response behavior.
- `lib/uploads/assets.ts` — preserve the database-owned asset lifecycle; integrate with
  jobs/outbox cleanup.
- `lib/rate-limit.ts` — preserve the store abstraction and paid-tier fail-closed guard.
- `lib/team/{context,active-team}.ts` — the single membership resolver and its pure selector.
- `apps/web/prisma/schema.prisma` — one schema until a verified multi-file migration is
  deliberately adopted.
- `apps/web/e2e/` — retain critical flows; keep static source assertions in unit tests.
- `art/`, `art_ref/`, generated sprite assets, `packages/config/` — retain.

---

## 7. Definition of done — industrial quality

The refactor is complete when:

- one documented query proves every student and teacher access decision;
- every complex route maps to one feature use case, with route-policy coverage proportional
  to its authorization and mutation risk;
- all growing lists and jobs are bounded;
- every paid call is globally rate-limited and usage-accounted, with appropriate idempotency;
- every long-running non-streaming workflow has durable state;
- external calls have explicit timeout/error/retry policies;
- consequential user-visible events are transactional or delivered through an outbox, while
  explicitly non-critical telemetry remains best-effort;
- logs are structured, correlated, redacted, and sufficient for incident/cost diagnosis;
- no raw student query, submission, paper text, prompt, or model-output excerpt reaches logs;
- student data export/deletion and storage reconciliation are documented **and tested**;
- upload/domain workflows survive a failure after every R2/DB transition without untracked or
  permanently unattached objects;
- the notification worker completes a production-day population of at least 3,500 teams;
- PR/release browser gates are enforced, use real hit-testing, and include keyboard/accessibility
  smoke coverage;
- feature contracts have one runtime-validated source;
- each consequential workflow has an explicit communication contract;
- internal feature modules communicate through application services or durable events, never
  internal HTTP callbacks;
- the §6.1 files are deleted only after import and behavior verification.

Judge the architecture by invariants and failure behavior, not by whether every file is small.
A cohesive 400-line pure domain table is healthier than five 80-line files sharing hidden
state. The goal is **one owner per rule, one policy per boundary, one durable record per
consequential action**.

---

## Appendix — what was pruned on 2026-07-19

Originally pruned because the corresponding work had shipped or the old snapshot was no
longer useful. Reopened items are marked explicitly so this appendix is provenance, not a
current completion claim.

| Original finding | Where it landed |
| --- | --- |
| **P0-1** Contradictory classroom boundary | ADR-004 settled the policy and rejected the single-class recommendation. The v0.29.4 audit reopened **implementation compliance** because onboarding still writes and roster still reads `Team.classId` (A2). |
| **P0-2** Embedded NUL bytes | Bytes removed; `apps/web/scripts/check-text-integrity.mjs` is gate 2 in `package.json`, CI, `CLAUDE.md`, and `AGENTS.md`. |
| **P1-3** Paid-work classification | `advance-phase` enforces the `ai` tier before `classifyLabType`; paper detail GET no longer processes; `test/paid-work-guard.test.ts` is a transitive-closure sweep that fails CI on the whole class. |
| **P2-5** Generated curriculum, one source | `lib/ops/codex/__tests__/generated-content.test.ts` validates JSON against the schema, deep-equals the wrapper, and locks a checksum. |
| **§3.2 A** Team/class authorization overlap | Same as P0-1. |
| **§3.2 C** Duplicated team-context resolution | `lib/team/context.ts` is the sole DB resolver; `lib/api/route-context.ts` delegates to it. |
| **§5.1 PILOT-1 … PILOT-7** | Those original slices shipped across v0.26.0–v0.29.1. This is provenance, not a current pilot sign-off; A1–A9 reopened Track A with newly verified defects. |
| **§7** 3-4 day implementation sequence | Executed; it was a plan, not a standing reference. |
| **§8** Claim-validation register | A snapshot of a tree that no longer exists — 8 of its 20 rows had become false. |
| **§9.1** Pilot-ready definition of done | The original checklist was executed, but the v0.29.4 adversarial audit found new launch work. Current sign-off is governed by A1–A9 and `docs/SECURITY.md`, not the deleted snapshot. |

Also corrected rather than deleted: the route-test premise (P1-1), god-file line counts
(P2-4), schema size (P2-6), and the §6.4 instruction to authorize teachers via
`Team.classId` — which had become the **opposite** of accepted policy. A2 now records that
runtime code still violates the corrected document even though the policy itself is settled.
