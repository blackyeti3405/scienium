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

#### P1-R1 — Destructive confirmations are client assertions, not capabilities — **CLOSED (v0.38.0); capability matrix still open**

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
**Still open:** the member/lead/teacher/admin capability matrix — a product decision about who
may destroy shared work, deliberately not made here. Also unaddressed: the audit's preferred
"mark papers out-of-scope instead of deleting" model.

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

#### P1-R5 — Background work is durable only in parts

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

#### P1-R8 — Team and class authority has no revocation lifecycle

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

#### P1-R9 — Account deletion, export, and retention are procedures, not system behavior

The deletion/export runbook explicitly describes a manual post-pilot process. No durable
runtime workflow reconciles Clerk identity, database rows, R2 objects, notification addresses,
and provider state. `ShowcaseView` fingerprints have no age-based cleanup, and activity,
notification, AI/chat, and teacher-history records lack one reviewed retention contract.

Add an authenticated request and idempotent operator workflow backed by a deletion/export
operation and outbox. Publish model-by-model retention/legal-hold rules, make cleanup survive
parent deletion, and rehearse both export and deletion against production-like data.

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

#### P1-R13 — “Check my synthesis” can grade stale cells

Cells save asynchronously on blur. Clicking the check button blurs the textarea and immediately
starts `checkMatrix`; there is no pending-write registry or flush barrier. The paid server check
can therefore read the previous database value, return/cache a verdict for stale work, and award
KP for content different from what the student sees.

Track dirty cells and in-flight writes, batch/await a flush before checking, and pass an
expected matrix version or input digest to the server. The server should atomically snapshot
the exact cells it grades and bind cache/result/KP to that snapshot. Disable the check while a
save failed; never treat local non-empty drafts as proof the server has checkable content.

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

#### P1-R15 — Content authoring can return `allClean: true` after producing nothing

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
| Completion high-waters are not uniformly monotonic | `complete-service.ts` computes a failed-attempt best score before its upsert; concurrent failures can let a later lower score overwrite a higher one. Re-passing also resets `completedAt`. | Use database `GREATEST`, preserve the first completion timestamp, and centralize monotonic progress writes. |
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
| `app/globals.css` | 3,051 | **Split.** A 3,000-line global cascade with 663 rules and 18 `!important`s spans every feature. Move tokens/base to cascade layers and feature ownership to CSS modules/layer imports; merge split duplicate selectors where ordering is not intentional. |
| `prisma/schema.prisma` | 1,829 | **Restructure carefully.** Use supported multi-file Prisma schema when the pinned toolchain permits, or at minimum a generated domain map. More important: add missing tenant/relational invariants and migrate away vestigial/legacy fields; do not split merely for length. |
| `lib/literature/vocab.ts` | 789 | **Keep.** Cohesive, deterministic, pure algorithm with strong commentary/tests. Optional detector modules only if ownership changes. |
| `stores/discoveryStore.ts` | 605 | **Split/refactor.** Types, factories, optimistic mutation, persistence, selection, and history are mixed. `addSourceNode`/`addArticleNode` duplicate a large insert path; deletion is O(n²); fire-and-forget writes and `newTreePending` can lose state. Use node factories + reducer/selectors + feature client. |
| `lib/discovery/openalex.ts` | 577 | **Split/harden.** Separate HTTP transport/runtime schemas, normalization, search, and citation traversal. Provider JSON is asserted, `cited_by_api_url` is fetched without host enforcement, and bodies are uncapped. |
| `components/ops/ExpertisePanel.tsx` | 574 | **Split into state machine + views.** Four-hundred-line main component and many coupled fields. Progress saving is fire-and-forget; “save and exit” does not await it; timer/fetch cancellation is incomplete. |
| `components/settings/LabProfileSettings.tsx` | 565 | **Split by domain.** Profile/school, lab/location/topic, and research-plan settings have separate authority and failure rules. Four fetches and silent research-plan load failure make one component a fragile controller. |
| `lib/ops/codex/scripts/merge-codex-segments.mjs` | 551 | **Refactor build integrity.** Hand-maintained schema mirrors and regex registry editing can drift; sequential output writes can leave a half-merged tree. Derive one schema and stage/validate/atomically install all outputs. |
| `components/fair/ScienceFairFeature.tsx` | 548 | **Split presentation sections.** Extract fair card, countdown/deadline sync, and rubric views. Delete stale “800 sequential query” patch-history comments; content correctness lives in versioned fair modules, not this component. |
| `lib/literature/quiz-retry.ts` | 543 | **Keep workflow, centralize persistence.** Meaningful paid-work service, but grading lacks a pre-call claim and its cloned reward transaction drifted from initial grading. Share monotonic quiz persistence and idempotency before cosmetic splitting. |
| `components/teacher/TeacherRoster.tsx` | 518 | **Split/paginate.** Class creation, join decisions, roster data, counts, and two large views share one file. Approval updates counts/classes but can leave roster stale; clipboard failure is unhandled; responses are unbounded. |
| `lib/fairs/zip.ts` | 501 | **Split data from geocoding.** Static ZIP approximation, lookup, and Nominatim transport are different owners. Hard-coded special ZIPs repeat; runtime geocoding has no deployment-wide 1 req/s queue/cache and no runtime response schema/cap. |
| `components/discovery/DiscoveryFeature.tsx` | 499 | **Extract controller.** Too many hooks and modes, patch-history comments, and unawaited destructive calls. Keep orchestration in one hook/reducer and views in sections. |
| `components/ops/CodexTab.tsx` | 487 | **Split loader/navigation state.** Refresh ignores non-OK responses; track loading errors can leave an endless loader; rapid navigation can commit a stale track. Use abort/versioned requests and one discriminated load state. |
| `components/discovery/DiscoveryTree.tsx` | 484 | **Refactor algorithm/accessibility.** Recursive layout is cycle-unsafe and can be O(n²); graph buttons are pointer-only SVG groups without focus/key handlers; context menu is not viewport-clamped. Memoized adjacency layout plus real keyboard controls. |
| `components/literature/VocabPanel.tsx` | 480 | **Mostly keep; extract repeated views.** Size is driven by several clear modes. Consolidate form/result chrome and move state transitions into the vocabulary hook/reducer; no unique security defect found in this file. |
| `components/teacher/TeacherRubricScoring.tsx` | 423 | **Refactor draft lifecycle.** Track switching can discard unsaved state, blur/click autosaves can race, blank numeric input becomes zero, and success timers are not cleaned up. Use explicit dirty/version/save state. |
| `components/ops/data-terminal/ExperimentDetail.tsx` | 420 | **Split chart/input/table.** Load errors offer no functional retry. Duplicate `(x, series)` points overwrite visually although the table retains them, so the chart can misrepresent data. |
| `components/literature/LiteratureFeature.tsx` | 409 | **Use one subview state.** Boolean views can overlap. Team-phase fetch ignores status and can hide advancement forever; timers are not cleaned; hard-coded slot count duplicates domain constants. |
| `lib/literature/synthesis.ts` | 396 | **Keep algorithm; strengthen ownership.** Cohesive service. Schema must normalize matrix-paper ownership; check operation must bind an exact version/snapshot. |
| `lib/discovery/articles.ts` | 390 | **Split provider adapter/domain mapping.** Feed URLs and provider bodies need canonical host/content-type/byte validation. Licensing assumptions need a current human review. |
| `lib/buildings/service.ts` | 384 | **Keep.** Cohesive command service with transaction/policy ownership. Refactor only shared result helpers if another command genuinely shares them. |
| `components/literature/SynthesisMatrixEditor.tsx` | 383 | **Split grid/verdict and fix save barrier.** Check can race blur saves and grade stale cells. Column/cell controls also need explicit failure/dirty state. |
| `components/lab/LabScene.tsx` | 379 | **Replace overlay booleans with a union.** Six booleans permit overlapping off-path panels; the component imports and coordinates too many overlays. Keep spatial shell, move overlay controller to one state machine. |
| `app/(public)/showcase/[slug]/page.tsx` | 374 | **Split rendering and cache request load.** Metadata and page repeat showcase/viewer work; generic metadata casts bypass runtime validation. Validate every outgoing URL/embed scheme at render time. |
| `lib/fairs/rubric-anchors.ts` | 356 | **Keep as reviewed content, not code truth.** Cohesive authored dataset. It needs edition/source/reviewer provenance and subject-matter review; shape tests cannot certify it. |
| `lib/discovery/tree-service.ts` | 348 | **Fix graph invariant before splitting.** Accepts foreign/cyclic parents, can hang in `depthOf`, catches broad create errors as success, and performs repeated scans. Validate same-team DAG and use adjacency maps. |
| `lib/teacher/student-overview.ts` | 347 | **Split/lazy-load query sections.** About 18 queries per detail request; selected team can be paired with the latest *other* membership's role/join time. Use one selected membership and bounded sections/view models. |
| `lib/hooks/usePlotBuildings.ts` | 346 | **Reducer/state machine.** More than ten coupled state values, no abort/resync, refresh errors swallowed, and duplicated optimistic economy prediction. Keep server authoritative and reconcile visibly. |
| `components/discovery/SourceReader.tsx` | 344 | **Split readers/reflection control.** Sanitized HTML is a central invariant worth retaining. Blur/button saves can duplicate or complete after selection changes; bind requests to node/version and validate every source URL scheme. |
| `components/lab/LabPlot.tsx` | 337 | **Add keyboard placement.** Pointer-centric pick-up/placement is not accessible; forced browser clicks likely mask it. Extract interaction controller and clean timers. |
| `components/fair/FormsChecklist.tsx` | 336 | **Content-blocked, then split rows/hazard guide.** GET status is unchecked and update failures are swallowed. More importantly, it presents the incorrect unversioned form catalog in P0-R4. |
| `app/(onboarding)/onboarding/page.tsx` | 329 | **Split role forms/recovery.** Duplicate school/name fields and large recovery commentary. Open teacher self-registration remains explicitly accepted/optional; do not accidentally convert that choice into a blocker. |
| `components/discovery/DiscoveryHome.tsx` | 321 | **Keep static surface; correct copy.** Help text describes an older Wiki/YouTube-only product and right-click deletion despite visible controls. Unsupported personal attribution should be sourced or removed. |
| `components/research-plan/IdeaCheckView.tsx` | 317 | **Extract result primitives.** Variant consolidation produced ternary-heavy duplicated markup. Model/provider URLs go straight to `href`; enforce `http/https` server-side and at rendering. |
| `lib/ops/codex/engine.ts` | 314 | **Keep.** Cohesive pure grading/progression engine with useful tests. Do not fragment it for a numeric threshold. |
| `components/showcase/ShowcaseEditor.tsx` | 314 | **Keep composition.** Already delegates sections and hook ownership reasonably. Correctness work belongs in revision-bound server moderation, not more component slicing. |
| `components/literature/SynthesisPanel.tsx` | 312 | **Keep orchestration.** Reasonable panel composition. Main defect is editor/server snapshot semantics, not this line count. |
| `components/literature/QuizPanel.tsx` | 311 | **Extract question form/result rows.** Initial and retry forms duplicate substantial markup; score/pass display rules duplicate domain constants. |
| `lib/fairs/match.ts` | 309 | **Fix versioned seeding.** Count fast path suppresses same-size drift; old patch-history comment is misleading. Keep matching service but separate edition sync from queries. |
| `lib/uploads/assets.ts` | 308 | **Strengthen deletion state machine.** Reservation/attach design is good. Add crash-recoverable `deleting` leases, team-deletion tombstones, reconciliation, and safe URL decoding. |
| `lib/sprites/manifest.ts` | 308 | **Keep manifest; remove drift.** Comments say gateway source dimensions are 48/49 while current bespoke source is 64; validate manifest/source/output coverage automatically. |
| `lib/fairs/forms.ts` | 306 | **Disable/rewrite under review.** The form-number mapping and timing are materially wrong. Replace with a versioned, officially sourced, human-approved edition. |
| `lib/ops/codex/complete-service.ts` | 304 | **Keep service; fix monotonic writes.** Failed-attempt upsert can lower best score under concurrency; re-pass changes first completion time. Use `GREATEST`/first-completion semantics. |

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
  make the rule noisy.
- `ApiError` names two different client/server concepts in `lib/api/client.ts` and
  `lib/api/with-route.ts`; rename them by role or create a carefully shared status error.
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
`StubFeature.tsx` and `DiscoveryFeature.tsx` still claim the opposite and should be corrected
as documentation drift.

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
| **P1-S15** | The browser upload test itself leaks quota/objects | `e2e/paper-upload.spec.ts` directly deletes Paper rows after proving an attached asset exists; it never uses the domain/ledger retirement path. Repeated runs leak test-bucket objects/quota and it also fails to restore the team topic. | Use the authenticated deletion lifecycle and wait for/reconcile reclaim in a test bucket; isolate and restore fixture state in `finally`. |

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
