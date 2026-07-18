# scienium — Adversarial Architecture Audit, Rebuild Blueprint, and Refactor Plan

_Audited against the complete working tree on 2026-07-15, including uncommitted files. This document is intentionally independent of `docs/REFACTOR.md`: prior plans and ADRs were treated as claims to verify, not as evidence._

## Executive verdict

scienium should remain a **modular monolith** for the classroom pilot. The product does not need microservices, an event bus, or multiple databases. It needs one unambiguous tenancy model, vertical feature boundaries, thin transport adapters, durable paid/background work, bounded reads, runtime-validated contracts, and production-grade observability.

The current application has several strong foundations: PostgreSQL is the durable source of truth; team-scoped student guards re-prove membership; teacher roles are server-enforced; most mutation schemas are strict and bounded; paid routes have shared-store enforcement in production; uploads use private object storage; and economy mutations have started moving into services. The problem is **consistency**. The intended architecture exists in pockets, but most route handlers still own queries and workflows, client networking is fragmented, authorization policy has contradictory definitions, and durability/observability/testing are uneven.

The most serious issue is not a clever exploit. It is a control-model split:

- `docs/architecture/adr-001-team-class-ownership.md`, `Team.classId`, its migration, and schema comments say a team belongs to one class and must not straddle classes.
- `apps/web/lib/teacher/auth.ts`, `apps/web/lib/teacher/analytics.ts`, `apps/web/app/api/team/join/route.ts`, and teacher routes say `Team.classId` is vestigial and deliberately grant each teacher of any member access to shared team artifacts.

Both policies cannot be authoritative. For a real classroom pilot, the safer and simpler target is: **a team belongs to exactly one class; every student membership must be compatible with that class; the class's teacher controls the team; school administrators are a separate explicit role.** Cross-class collaboration can be designed later as an explicit sharing feature with its own grants, not inferred from member overlap.

### Implementation posture: strengthen, do not rewrite

This document describes both the long-term architectural destination and the changes required to reach the pilot safely. Those are not the same scope.

- **Do not perform a repository-wide rewrite.** Preserve the current Next.js application, routes, URLs, database, components, and user flows.
- **Do not move every file into `src/features/**` during the pilot hardening pass.\*\* That tree is a direction for files already being changed, not a prerequisite for quality.
- **Do not change API contracts, persistence models, and UI behavior in the same refactor step.** Characterize behavior first, extract it unchanged, then make intentional behavior changes separately.
- **Do not create repository interfaces around trivial Prisma reads.** Extract services where there is authorization, a transaction, concurrency, paid work, provider orchestration, or a reusable business rule.
- **Do not replace working state/data libraries merely for consistency.** Standardize new and high-risk work first; migrate existing client calls opportunistically.
- **Do not delete or merge files during the first pass unless they are proven unused.** The delete list in §6.1 is a later cleanup list with explicit preconditions.

The practical refactor is therefore a **strangler migration inside the existing modular monolith**. Most UI, pure helpers, content, art, and stable routes should remain untouched.

### Scope calibration

| Track                         | Required scope                                                                                                                                                                                   | Expected impact                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **A — Before pilot**          | Resolve authorization ambiguity, close paid-work bypasses, protect external calls, add targeted policy/concurrency tests, bound confirmed growing reads, add minimum viable diagnostics/runbooks | Focused changes to high-risk infrastructure and route families; no broad UI or directory rewrite |
| **B — Clean industrial code** | Incrementally extract complex workflows, unify feature contracts/clients, split mixed-responsibility files, standardize route adapters and durable events                                        | Meaningful changes across authored runtime code over time, one feature at a time                 |
| **C — Deferred/optional**     | Broad `src/features/**` relocation, generalized job platform for every workflow, generated-content reorganization, deleting `shared-types`, tooling-repository cleanup                           | Do only when justified by active work or measured operational need                               |

### Priority summary

| Priority | Finding                                                                                                    | Consequence                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0       | Classroom/team ownership has two contradictory implementations                                             | Ambiguous privacy boundary and surprising cross-class teacher access                                    |
| P0       | `app/api/ops/codex/study-plan/route.ts` contains two embedded NUL bytes                                    | Source-integrity defect hidden by the current compiler/linter                                           |
| P1       | 98 route files but no route-level unit/integration tests                                                   | IDOR, status-code, validation, and concurrency invariants rely mainly on E2E/static assertions          |
| P1       | Only six routes use the route wrapper; most handlers query Prisma directly                                 | Authorization, validation, error mapping, transactions, and telemetry remain copy-pasted                |
| P1       | Paid-work classification is incomplete                                                                     | Some Anthropic work runs behind `read`/`mutate`, bypassing the production paid-tier configuration guard |
| P1       | Paid/background workflows are only partly durable                                                          | Request termination can still create ambiguous outcomes or repeated spend                               |
| P1       | No structured observability or error/cost correlation                                                      | Classroom incidents and LLM spend cannot be reconstructed reliably                                      |
| P2       | Feature ownership is split across `app`, `components`, `lib`, `stores`, and component-local API/type files | One rule or contract change touches several unrelated directory trees                                   |
| P2       | Several list/read paths are unbounded                                                                      | Payload and query cost grow with classroom history                                                      |
| P2       | Client fetching has several competing patterns                                                             | Inconsistent cancellation, stale-response handling, parsing, retries, and errors                        |
| P2       | External integration policy is inconsistent                                                                | Some calls have timeouts/fallbacks; others can wait for platform defaults                               |
| P3       | Large generated/static domains obscure authored code                                                       | Reviewability and ownership suffer even when runtime behavior is sound                                  |

## 1. Start at the end goal and work backward

### 1.1 End state

The pilot-ready system must support a room of students and teachers where:

1. A student can only read or mutate their current team's data.
2. A teacher can only read or mutate teams in classes they own.
3. Every paid action has an enforceable budget, idempotency rule, and audit record.
4. Every long-running action survives a request disappearing.
5. A slow or broken external provider does not freeze unrelated product areas.
6. Lists and jobs remain bounded as a class accumulates a school year's data.
7. Operators can answer who did what, which dependency failed, what it cost, and whether retrying is safe.
8. A developer can locate a feature's UI, contracts, application service, persistence, integrations, and tests without searching the entire repo.
9. Deleting/exporting a student or class has a documented, testable data path.

### 1.2 Architecture derived from that outcome

```text
Browser
  -> Next.js pages and route adapters
       -> feature application services
            -> authorization policies
            -> domain rules
            -> repository interfaces / Prisma implementations
            -> durable job/outbox records
       -> PostgreSQL (authoritative state and job ledger)
       -> R2 (private blobs; database owns object metadata)
       -> Redis/Upstash (global rate limits and short-lived cache only)

Scheduled worker invocation
  -> claims bounded PostgreSQL jobs atomically
       -> Anthropic / scholarly APIs / extraction / email
       -> stores result, retry state, usage metadata, and terminal error
```

This is still one codebase and can remain one Vercel project initially. “Worker” means a durable application boundary invoked by cron or a queue consumer; it does not require a second service on day one.

### 1.3 Non-negotiable domain boundaries

- **Identity and tenancy:** Clerk proves identity; the database proves role, membership, class ownership, and active-team selection.
- **Classroom:** School, Class, enrollment/join requests, teacher grants.
- **Team/lab:** Team membership, phase, currency, buildings, activity.
- **Discovery:** topics, nodes, sources, scholarly-provider adapters.
- **Literature:** papers, processing, citations, quiz/chat/explanation, synthesis, vocabulary.
- **Research:** plan, experiments, measurements, logs.
- **Fair/showcase:** fairs, rubrics, forms, publication, moderation, assets.
- **Curriculum/ops:** Codex, expertise, study plan, Vega.
- **Platform:** database, storage, rate limiting, jobs, LLM gateway, telemetry, configuration.

Features may depend on platform capabilities and stable domain contracts. They must not reach into another feature's route or component implementation.

### 1.4 Communication architecture

scienium has many internal feature subsystems and external integrations, but it is not a collection of microservices. Discovery, Literature, Classroom, Team/Lab, Research, Fair, Showcase, Curriculum, notifications, and PvP are modules inside one Next.js deployment. Clerk, PostgreSQL/Supabase, R2, Anthropic, Firecrawl, OpenAlex, NCBI, arXiv, Semantic Scholar, Wikipedia, YouTube/Vimeo, Resend, Upstash, and Vercel Cron are external infrastructure/providers.

Keep this as a modular monolith. Do not introduce network calls between internal features or split them into independently deployed services for the pilot. Choose one of the following communication patterns based on the operation's failure semantics.

#### Pattern A — Synchronous command/query

```text
Browser -> route adapter -> application service -> PostgreSQL/provider -> response
```

Use for quick, bounded work whose result the current interaction needs: ordinary reads, settings, rubric updates, building mutations, and small database-backed commands. Routes resolve the principal, validate input, call one operation, serialize the result, and record diagnostics. Direct Prisma is acceptable for a trivial, correctly scoped read; authorization, transactions, provider orchestration, and business rules belong in an application service.

#### Pattern B — Durable asynchronous job

```text
Browser -> route -> authorize/validate -> create job -> 202/status response
Cron/worker -> atomically claim bounded job -> call provider -> persist result/retry/error
Browser -> poll/refresh status
```

Use for slow, paid, retryable, or disconnect-sensitive work: PDF processing, large exports/deletions, storage reconciliation, email delivery, and selected non-streaming AI operations. PostgreSQL remains the durable job ledger; a Vercel Cron-invoked processor is sufficient initially. A second deployed worker service or message broker is not required.

The existing `PaperProcessingJob` is the model to preserve. Paper upload should securely store bytes and create the job; paper GET should only return paper/job state and must never trigger paid work.

#### Pattern C — Authenticated synchronous streaming

```text
Browser -> authenticated streaming route -> provider stream -> browser
                                      \-> persist server-owned authoritative state
```

Use only when incremental output is central to the experience, such as paper chat or guided AI feedback. Streaming still requires global paid-work enforcement, product quotas, server-owned conversation turns, timeout/disconnect handling, input/output caps, idempotency where meaningful, and token/cost accounting.

#### Pattern D — Transactional outbox/event

```text
Database transaction -> domain write + outbox row
Cron/worker -> claim outbox row -> activity/notification/email -> mark delivered
```

Use when a committed change must eventually produce another consequential effect: class approval notifications, publication/moderation events, phase history, teacher-visible activity, and email. Do not use an outbox for debug logs or expendable telemetry. Internal features should call application services or write an outbox event—not call the application's own HTTP routes.

#### Communication decision table

| Workflow                                                     | Target pattern                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Team/settings/rubric/building CRUD                           | Synchronous command/query                                                            |
| Paper upload and metadata extraction                         | Upload command + durable job + status read                                           |
| Paper status/detail GET                                      | Pure bounded query; no mutation or provider call                                     |
| Paper chat/Vega/guided AI where incremental output matters   | Authenticated streaming + persisted turns/usage                                      |
| Quiz/explanation/synthesis/study-plan generation             | Evaluate individually; synchronous only if bounded/idempotent, otherwise durable job |
| Activity/teacher notification/email after a committed change | Transactional outbox                                                                 |
| Scheduled paper/cleanup/notification processing              | Bounded Cron worker claiming PostgreSQL rows                                         |
| OpenAlex/NCBI/arXiv/Semantic Scholar/Wikipedia search        | Normal server-side provider call with timeout/cache/schema validation                |

Efficiency is judged by bounded work and failure isolation, not by minimizing the number of modules. Avoid internal HTTP hops, duplicated provider clients, request-lifetime background promises, polling without backoff, and synchronous chains that combine upload, parsing, storage, paid AI, side effects, and response delivery.

## 2. Long-term repository direction — optional, not a pilot gate

```text
apps/web/
  app/                              # pages/layouts and very thin route adapters only
  src/
    features/
      classroom/
        contracts/                  # Zod request/response schemas; inferred TS types
        application/                # use cases and orchestration
        domain/                     # pure invariants and value objects
        infrastructure/             # Prisma repositories and provider adapters
        ui/                          # components, hooks, feature client
        tests/                       # policy/service/route-adapter integration tests
      team/
      discovery/
      literature/
      research/
      fair/
      showcase/
      curriculum/
    platform/
      auth/
      db/
      jobs/
      llm/
      observability/
      rate-limit/
      storage/
      web/
    shared/
      ui/                            # genuinely cross-feature UI primitives
      contracts/                     # only cross-feature stable contracts
      test/
  prisma/
    schema.prisma
    migrations/
  content/                           # authored/generated static data, never business logic
  public/
  e2e/

packages/shared-types/              # delete unless a second runtime package consumes it
packages/config/                    # retain shared tooling config
art/                                # retain separate deterministic asset pipeline
```

This shape is a navigation model, not a required migration. Industrial-quality code can retain the current `app/`, `components/`, and `lib/` directories if their responsibilities become consistent. Introduce this shape only for a complete feature slice already undergoing meaningful work; do not manufacture file moves to make the tree match the diagram.

### 2.1 Route contract

Every route adapter should do exactly five things:

1. select the policy (`studentTeam`, `teacherClass`, `public`, `cron`);
2. parse params/query/body using Zod;
3. call one application use case;
4. map the typed result to HTTP;
5. emit request/cost/error telemetry.

It must not contain raw Prisma workflows, provider calls, prompt construction, economy rules, or multi-step authorization.

### 2.2 Application-service contract

Application services accept an explicit principal and validated command/query. They own transactions, idempotency, authorization-policy calls, and orchestration. Domain functions remain pure. Prisma-specific code is isolated in repository implementations when doing so creates a real test seam; trivial single-table reads do not require ceremonial interfaces.

### 2.3 Contract ownership

Use one Zod schema as the runtime and compile-time contract for each endpoint. Response parsing belongs in the feature contract/client, not handwritten independently in `components/**/types.ts`, `components/**/api.ts`, and a route. `packages/shared-types` should exist only if another workspace package or runtime truly consumes those types. Today it mostly imposes a build-order dependency on one web application.

## 3. Current architecture compared with the target

### 3.1 What is already correctly designed

- `apps/web/lib/api/route-context.ts` resolves the active team only through actual `TeamMember` rows. A stale/forged `activeTeamId` cannot widen student access.
- `apps/web/lib/teacher/auth.ts` makes the existing database role authoritative over stale Clerk claims.
- `apps/web/lib/rate-limit.ts` has per-user and per-IP tiers, a shared Upstash implementation, bounded Upstash latency, and fails closed for paid tiers in production without a global store.
- `apps/web/lib/buildings/service.ts` is a good application-service seam: the route adapters are thin, concurrency is explicit, and tests exist.
- `apps/web/lib/uploads/assets.ts` gives object storage a database-owned lifecycle rather than treating arbitrary URLs as durable authority.
- `PaperProcessingJob` and its migrations are the correct direction for durable paid processing.
- Schema-level unique constraints protect several one-time/idempotent rules, including duplicate team paper content, source visits, daily awards, plot occupancy, and rubric scorer keys.
- `art/` is correctly separate from the runtime application. Generated sprite manifests are checked in intentionally and have tests.
- The codebase has meaningful pure unit tests and broad authenticated Playwright coverage.

These should be preserved and generalized, not replaced.

### 3.2 Where control overlaps

#### A. Team/class authorization

Authority is split across `User.classId`, `Team.classId`, membership-derived teacher access, `User.activeTeamId`, and route-specific ownership queries. `Team.classId` is present, indexed, migrated, related to `Class`, and documented as authoritative, while live teacher policy calls it vestigial. This is the highest-risk overlap.

#### B. Route guards and wrappers

`requireTeamContext`, `requireUserContext`, `requireTeacher`, cron auth, middleware protection, and `withTeamRoute` all own parts of transport policy. That separation can be valid, but adoption is incomplete: only the four building mutation routes and two synthesis routes use `withTeamRoute`; direct guard/parse/query code remains the norm.

#### C. Team context resolution

`lib/api/route-context.ts` and `lib/team/context.ts` both execute near-identical membership queries and both depend on `pickActiveTeam`. The pure selector is correctly centralized; the database resolver is duplicated.

#### D. API contracts and client state

Contracts and network logic live variously in:

- `components/literature/api.ts`, `types.ts`, `synthesisApi.ts`, and `vocab-api.ts`;
- `components/ops/*/api.ts` and `types.ts`;
- `lib/discovery/treeApi.ts` plus `stores/discoveryStore.ts`;
- direct `fetch` calls in many UI components and hooks;
- `lib/api/client.ts` for only some features.

There is no single answer to “where does this feature's HTTP contract live?”

#### E. Domain logic in routes

Most API routes import `db` directly. Large examples include paper quiz retry, teacher overview, Codex completion/study plan, research-plan review, project logs, and paper uploads. Some routes necessarily shape data, but multi-step business logic, raw SQL, provider calls, and activity writes in transport files make tests and reuse difficult.

#### F. Background work

Paper processing has a durable job model, while other paid calls run inline. Fire-and-forget `logActivity(...).catch(...)` is widespread. Notifications use cron batching, but email sends and provider failures are not represented through a general job/outbox lifecycle. The system therefore has several incompatible durability guarantees.

## 4. Adversarial findings

### P0-1 — Choose and enforce one classroom boundary

**Validated evidence**

- `docs/architecture/adr-001-team-class-ownership.md` says `Team.classId` is the teacher authorization boundary and teams cannot straddle classes.
- `prisma/migrations/20260708180000_team_ownership_integrity/migration.sql` adds/backfills `teams.class_id` for that purpose.
- `prisma/schema.prisma` retains the `Team.classId` relation and index.
- `lib/teacher/auth.ts::teacherOwnsTeam` instead authorizes through any member whose `User.classId` is owned by the teacher.
- `app/api/team/join/route.ts` explicitly permits cross-class and cross-school teams.
- `lib/teacher/analytics.ts` calls `Team.classId` vestigial.

**Adversarial outcome**

A team containing students from two classes exposes shared papers, plans, feedback, showcase, rubric, and related team-level data to both teachers. That may be intended collaboration, but it directly contradicts the recorded privacy invariant and is too implicit for minors' classroom data.

**Decision**

Make `Team.classId` required for classroom teams and authoritative for teacher access. Permit a nullable class only during onboarding/legacy transition. Reject membership that conflicts with the team's class. If cross-class teams are later required, create explicit `TeamClassGrant(teamId, classId, permission, grantedBy, expiresAt)` records and audit them.

### P0-2 — Remove embedded NUL bytes

`apps/web/app/api/ops/codex/study-plan/route.ts` contains two `0x00` bytes in the `sourceHashOf` template literal. TypeScript and Next lint currently pass, which makes this a repository-integrity defect rather than a current compilation failure. Replace them with an explicit printable delimiter such as `\u001f` written as source text, or length-prefix the fields. Add a repository text-file check so source corruption cannot recur.

### P1-1 — Establish route-level policy tests

There are 98 `route.ts` files, 34 non-E2E test files, 26 E2E specs, and no files named as route tests. E2E coverage is valuable but too slow and stateful to be the sole enforcement of every IDOR, malformed-body, 401/403/404, idempotency, and provider-failure invariant.

Create route-adapter tests around injected application services or a test database. At minimum, every route family needs a matrix for signed out, wrong team/class, invalid input, rate limit, conflict/race, and provider failure. Keep a smaller E2E suite for critical user journeys.

### P1-2 — Migrate high-risk routes first; standardize the rest incrementally

Only six routes currently use `withTeamRoute`; most routes import `db` directly. This is an industrial maintainability concern, not proof that every direct Prisma route is unsafe. Do not merely wrap all handlers and declare victory. Move high-risk workflows first, then standardize other adapters when they are touched.

Start with the highest-risk and largest handlers:

- `app/api/papers/[id]/quiz/retry/route.ts`
- `app/api/teacher/student/[id]/overview/route.ts`
- `app/api/ops/codex/complete/route.ts`
- `app/api/ops/codex/study-plan/route.ts`
- `app/api/research-plan/review/route.ts`
- `app/api/research-plan/idea-check/route.ts`
- `app/api/project-log/route.ts`
- `app/api/papers/route.ts`

### P1-3 — Put every paid call behind a paid-work policy

Direct AI feature routes normally select the `ai` tier, and uploads select `upload`. Two confirmed exceptions cross that abstraction:

- `app/api/team/advance-phase/route.ts` selects `mutate` and then calls `classifyLabType`, which invokes Anthropic.
- `app/api/papers/[id]/route.ts` selects `read` and may synchronously call `processPaperJob`, which invokes Anthropic. The job's atomic claim and attempt cap prevent duplicate processing, but the call still bypasses the paid-tier production shared-store check.

The limiter tier must describe the consequential work, not merely the HTTP verb. Better, make the LLM gateway enforce paid-work availability and usage budgets itself so an internal caller cannot accidentally bypass the rule. The paper detail GET should only report durable job state; it should not perform paid processing on read.

### P1-4 — Add durable jobs and cost accounting where consequences require them

Anthropic construction is centralized, and most direct AI routes select the `ai` tier. As P1-3 shows, that policy is not universal. Even when the right tier is used, rate limiting is not a budget ledger: it does not record tokens/cost, guarantee idempotency, or survive a provider response after the browser disconnects.

For workflows that need retryability, asynchronous execution, or spend reconciliation, create a general `Job`/`AiInvocation` model or feature-specific jobs sharing one worker contract. Record tenant, user, operation, idempotency key, model, prompt-version hash, state, attempts, next-run time, provider request id, input/output token counts, and terminal error code. Preserve paper processing by adapting its existing table only when necessary. Evaluate quiz generation/retry, explanation checking, synthesis checking, expertise generation/grading, plan review, idea check, study-plan classification, failure follow-up, and Vega chat individually; do not migrate them merely for uniformity. Streaming chat may stay synchronous, but it still needs server-owned turn state and enough usage metadata to enforce cost policy.

### P1-5 — Add structured observability

Runtime diagnostics are currently `console.error/warn/log` strings. There is no request ID propagation, structured event schema, route latency split, tenant-safe error context, provider metrics, or exception product in the dependencies.

Create a small platform logger and request wrapper first. Emit JSON fields (`requestId`, `route`, `operation`, opaque `userId`/`teamId`, duration, outcome, provider, jobId, model, token usage) and redact payloads by default. Add an error/trace backend before pilot, but keep vendor integration behind the logger/telemetry module.

### P1-6 — Make side effects transactional or durable

Many routes commit domain state and then invoke `logActivity(...).catch(console.error)`. Losing an activity entry may be acceptable, but the current code does not distinguish optional analytics from user-visible history. Use a transactional outbox for activity/notification events that matter to teachers or progression. Truly best-effort telemetry should be explicitly named and documented as such.

### P2-1 — Bound every growing collection

Confirmed unbounded examples include:

- `app/api/data-terminal/route.ts` — all experiments for a team;
- `app/api/data-terminal/[id]/measurements/route.ts` — all measurements, returned again after writes;
- teacher class lists in `lib/teacher/auth.ts` (small at pilot, but part of every teacher request);
- several feature lists whose natural size grows over a school year.

Not every `findMany` needs pagination: fixed vocabularies and tightly constrained rubric rows are naturally bounded. For user-generated history, add cursor pagination or explicit hard caps and return `nextCursor`/summary counts. Define limits in contracts, not ad hoc route constants.

### P2-2 — Standardize external-provider behavior

OpenAlex, NCBI, arXiv, article feeds, Google Docs, and Upstash have explicit timeout handling in at least some paths. Other calls—such as Resend and YouTube oEmbed—lack an explicit abort signal. Provider adapters also vary in retry, error taxonomy, caching, and logging.

Create a shared `fetchWithPolicy` primitive for timeout, retryable statuses, maximum response bytes, user agent, and normalized errors. Each provider adapter supplies policy values; application services decide fallback behavior. Never retry non-idempotent provider writes without an idempotency key.

### P2-3 — Consolidate client data access

Do not introduce TanStack Query solely for fashion. A small feature client layer can solve the current inconsistency: runtime response decoding, abort signals, standard errors, and request de-duplication. For screens with server-state caching/invalidation pressure, TanStack Query is justified; otherwise typed hooks over `requestJson` are enough.

Move direct networking out of large UI components such as `TeacherRoster`, `LabProfileSettings`, `ScienceFairFeature`, `ExpertisePanel`, and discovery shells. UI components should render state and emit intent.

### P2-4 — Break remaining god files by responsibility

Line count alone is not a defect, especially in tests or generated data. Authored files that currently combine materially different responsibilities include:

- `components/settings/LabProfileSettings.tsx` (632 lines): multiple settings domains, loading, mutation, and rendering;
- `components/ops/ExpertisePanel.tsx` (584): state machine, networking, exam UI, and result UI;
- `components/fair/ScienceFairFeature.tsx` (568): matching, selection, deadlines, and presentation;
- `components/teacher/TeacherRoster.tsx` (547): roster, classes, join requests, mutations, and UI;
- `stores/discoveryStore.ts` (605): server synchronization and multiple interaction concerns;
- `lib/discovery/openalex.ts` (664): multiple endpoint contracts, mapping, caching, and provider behavior.

Split along behavior/state ownership, not arbitrary line thresholds. Keep cohesive large pure tables or tests intact.

### P2-5 — Treat generated curriculum as a build artifact with one source

Codex currently stores JSON content, generated TS track modules, an index, checksums, a generator, and static tests. This can be valid, but the source-of-truth rule must be explicit and enforced in CI. Prefer JSON as canonical content, generated compact modules as disposable build output, and a generated registry. Do not manually edit both. Large generated content should be excluded from ordinary lint/review metrics and validated by schema/checksum tests.

### P2-6 — Resolve schema and lifecycle ambiguity

The 1,768-line Prisma schema is not wrong merely because it is large; Prisma still expects one schema in this setup. The problem is implicit lifecycle policy. Add database comments/ADRs and tests for deletion behavior, especially User/Class/Team, uploaded assets, publications, activity, LLM history, and teacher feedback. Most relations currently rely on required foreign keys without an articulated retention/export/delete procedure.

Do not split `schema.prisma` using unsupported conventions. Generate a domain-index document from it or adopt Prisma's supported multi-file schema only after verifying the exact deployed Prisma version and migration workflow.

### P3-1 — Reduce root/tooling noise

The tracked repository contains hundreds of `.claude` pipeline/agent files and hundreds of art pipeline files alongside the product. They are not runtime defects, but they enlarge review/search scope. Keep required agent instructions; move historical pipeline outputs/drafts to an archive or separate tooling package/repository if they are not active inputs. Never delete them without confirming current workflow dependencies.

## 5. Required scope by outcome

### 5.1 Must be refactored before the classroom pilot

This is the mandatory safety and operability scope. “Before pilot” does not mean every route must be architecturally perfect; it means the system's trust boundaries, paid work, growing workloads, and failure diagnosis must be defensible.

#### PILOT-1 — Resolve the team/class policy

1. Confirm the product rule: one authoritative class per team, or explicitly supported cross-class teams.
2. Audit current data for teams whose members span classes before changing code or constraints.
3. Encode the chosen rule once in a policy/service and use it for team join and every teacher route.
4. Update ADR-001, schema comments, architecture docs, and tests so they say the same thing.
5. Add signed-out, same-class, wrong-class, stale-active-team, and cross-team tests.

This is an intentional policy decision, not a behavior-preserving extraction. Do not deploy the stricter rule until existing data and the expected classroom workflow have been checked.

#### PILOT-2 — Close all paid-work policy gaps

1. Move paper processing out of `GET /api/papers/[id]`; the GET reports durable job state only.
2. Put phase lab-type classification behind the paid-work guard or enforce paid policy inside the LLM gateway.
3. Inventory every Anthropic create/stream call and trace it to authentication, global limiting, product cap/idempotency, input cap, timeout, and error handling.
4. Preserve the existing durable `PaperProcessingJob` design and verify its claim/retry/terminal behavior.
5. Add targeted tests for duplicate requests and limiter misconfiguration.

A generic job table for every AI workflow is not required before pilot. Streaming interactions may remain synchronous when state and cost are bounded.

#### PILOT-3 — Add targeted route and concurrency tests

Add tests for the high-risk boundaries rather than 98 ceremonial route-test files:

- student principal and active-team resolution;
- teacher role and class/team policy;
- team/class join and invite races;
- paper processing claim/retry and paid-policy behavior;
- building/economy mutations and daily/cap ledgers;
- uploads and asset ownership;
- public showcase privacy and asset reads;
- cron authentication and bounded batches;
- the largest paid routes' wrong-team and duplicate-submit behavior.

Keep Playwright for end-to-end classroom flows. Move static source assertions out of Playwright when a fast unit/tooling test can prove the same invariant.

#### PILOT-4 — Bound confirmed growth and provider failure

- Cap or paginate experiments and measurements; do not resend all measurements after each write.
- Review other user-generated history endpoints and add an explicit hard cap where cursor UI is unnecessary for pilot.
- Add explicit timeouts and normalized failures to Resend and YouTube oEmbed.
- Confirm every external provider has a maximum input/output size and no unbounded retry loop.
- Keep cron batches bounded and make partial failure resumable.

#### PILOT-5 — Add minimum viable production observability

Before pilot, operators must be able to correlate a failed request or job without logging student work. Add request IDs; structured events for policy denial, paid calls, jobs, providers, uploads, and cron; duration/outcome fields; opaque user/team/job identifiers; and explicit redaction of prompts, paper text, student submissions, secrets, tokens, and email bodies. Configure one error-reporting destination or document how production logs will be queried.

A full tracing platform and dashboards for every feature are industrial follow-up work, not pilot blockers.

#### PILOT-6 — Establish operational and data-lifecycle minimums

Document and test enough to operate the pilot:

- database restore and migration forward-fix procedures;
- incident contacts and feature-disable procedure;
- student/class data export and deletion inventory;
- uploaded-object reconciliation and cleanup;
- AI/provider data-sharing and retention summary for school approval.

#### PILOT-7 — Source integrity and pipeline gates

- Remove the two NUL bytes and add a text-integrity check.
- Run the existing five gates in order after every behavior-bearing slice.
- Run targeted E2E during iteration and the full authenticated suite after pilot-critical changes integrate.
- Do not combine tenancy, paid-work, and broad UI cleanup in one patch.

### 5.2 Must be refactored for clean industrial-level code

Apply this maintainability work incrementally after or alongside pilot hardening when it overlaps the same files:

1. **Thin high-risk routes.** Extract multi-step authorization, transactions, raw SQL, provider calls, prompt construction, and domain workflows into feature application services. Simple reads do not need ceremonial services.
2. **One principal and policy layer.** Remove duplicate active-team database resolution and route-specific teacher ownership derivations.
3. **One runtime contract per endpoint.** Co-locate Zod request/response schemas with feature clients and infer TypeScript types from them.
4. **Consistent route adapters.** Standardize principal resolution, params/query/body parsing, error mapping, request IDs, and telemetry. Migrate routes when touched instead of wrapping all 98 at once.
5. **Feature-owned client networking.** Move ad hoc fetch/state orchestration out of large visual components while preserving specialized streaming, upload-progress, and tolerant-error paths.
6. **Responsibility-based file splits.** Split the confirmed hotspots in P2-4 by state machine or domain responsibility, never by a line-count quota.
7. **Durable consequential events.** Add an outbox for activity/notification events whose absence changes teacher-visible or progression-relevant state. Keep explicitly non-critical telemetry best-effort.
8. **LLM usage accounting.** Record operation, prompt version, model, token usage, result, and tenant-safe correlation. Generalize jobs only where durability or asynchronous execution is needed.
9. **Provider policy.** Centralize timeout, response-size, retryability, and normalized errors without forcing browser fetches through a server-only abstraction.
10. **Lifecycle correctness.** Implement tested export, deletion, and storage reconciliation rather than stopping at an inventory document.
11. **Dependency direction.** UI depends on feature contracts; routes depend on application services; feature code depends on platform code, not another feature's components or routes.
12. **Architectural checks.** Add import-boundary, generated-content, text-integrity, contract, and policy tests where they prevent a demonstrated regression.
13. **Explicit communication semantics.** Classify each provider/workflow as synchronous, streaming, durable job, or outbox. Prohibit internal HTTP calls between feature modules and provider calls hidden inside GET reads.

### 5.3 Explicitly deferred or optional

Do not spend the 3–4 day hardening window on these unless another required change makes them nearly free:

- moving the entire application under `apps/web/src/features/**`;
- rewriting all 98 API routes;
- creating repository interfaces for every Prisma model;
- migrating every direct client `fetch` immediately;
- replacing Zustand or local React state wholesale;
- adopting TanStack Query globally;
- splitting `schema.prisma` solely because it is large;
- deleting `packages/shared-types`;
- untracking generated Codex modules;
- relocating `.claude`, art, or pipeline history;
- adding microservices, a message broker, or a second database;
- building an all-purpose job framework before concrete workflows require it.

## 6. File-by-file disposition

This section answers “what files should be deleted, merged, created, or edited?” Paths are exact current paths unless marked as a new target directory.

### 6.1 Delete — cleanup phase only

Delete only after the corresponding migration is complete and references are proven absent:

| File                                                          | Action and precondition                                                                                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/lib/team/context.ts`                                | Delete after its database resolution is merged into the new platform principal resolver and all server-component imports move. Keep `active-team.ts` as a pure helper or move it with the resolver tests. |
| `apps/web/components/literature/api.ts`                       | Delete after its schemas/client are moved to `src/features/literature/contracts` and `ui/client.ts`.                                                                                                      |
| `apps/web/components/literature/types.ts`                     | Delete after types are inferred from canonical schemas/domain types.                                                                                                                                      |
| `apps/web/components/literature/synthesisApi.ts`              | Delete after merge into the literature feature client.                                                                                                                                                    |
| `apps/web/components/literature/vocab-api.ts`                 | Delete after merge into the literature feature client.                                                                                                                                                    |
| `apps/web/components/ops/data-terminal/api.ts` and `types.ts` | Delete after merge into the research/experiments feature contracts and client.                                                                                                                            |
| `apps/web/components/ops/failure-log/api.ts` and `types.ts`   | Delete after merge into the research/log feature contracts and client.                                                                                                                                    |
| `apps/web/components/ops/project-log/api.ts` and `types.ts`   | Delete after merge into the research/log feature contracts and client.                                                                                                                                    |
| `apps/web/lib/discovery/treeApi.ts`                           | Delete after its client functions move beside Discovery contracts/UI. It is browser API code despite living under general `lib`.                                                                          |
| `apps/web/components/teacher/student-detail/types.ts`         | Delete after teacher response types are inferred from teacher contracts.                                                                                                                                  |
| Generated `apps/web/lib/ops/codex/tracks/*.ts` and `index.ts` | Delete from version control only if the build reliably generates them before typecheck/build and deploy artifacts include them. Otherwise retain as explicitly generated files.                           |
| `packages/shared-types`                                       | Delete only if repository import analysis after the migration proves the web app is its only consumer. Move enums into `apps/web/src/shared/contracts`; otherwise retain it.                              |

No existing runtime file is recommended for immediate deletion solely because it is large or currently duplicated.

### 6.2 Merge/consolidate incrementally

| Current files                                                                | Target                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lib/api/route-context.ts`, `lib/team/context.ts`, `lib/team/active-team.ts` | `src/platform/auth/student-principal.ts` plus a pure `active-team.ts` and tests                                       |
| `lib/teacher/auth.ts`, `lib/teacher/role.ts`                                 | `src/platform/auth/teacher-principal.ts` and `src/features/classroom/application/policies.ts`                         |
| `lib/api/with-route.ts`, `lib/validation.ts`, HTTP error mapping             | `src/platform/web/route.ts` with policy-specific wrappers and Zod param/query/body support                            |
| Feature `api.ts`/`types.ts` pairs                                            | One feature-owned contracts module and one UI client module                                                           |
| `lib/anthropic.ts` plus prompt-call conventions scattered across routes/libs | `src/platform/llm/gateway.ts`, usage ledger, prompt/version registry, and test fake                                   |
| Provider fetch/retry/timeout fragments                                       | `src/platform/web/fetch-with-policy.ts` used by provider adapters                                                     |
| `logActivity(...).catch(...)` call patterns                                  | transactional outbox/event recorder for durable events; explicit best-effort telemetry helper for non-durable metrics |

### 6.3 Create when the corresponding slice is implemented

The `src/platform/**` paths below are suggested industrial destinations, not pilot prerequisites. Equivalent cohesive modules under the existing `lib/**` structure are acceptable and lower-risk during the first pass. Only the text-integrity script, tenancy decision/migration, targeted tests, and minimum logging/runbooks belong to the mandatory pilot scope.

- `apps/web/src/platform/auth/principal.ts` — discriminated student/teacher/admin/system principals.
- `apps/web/src/platform/auth/student-principal.ts` — one membership-backed active-team query.
- `apps/web/src/platform/auth/teacher-principal.ts` — DB-authoritative role and owned-class scope.
- `apps/web/src/platform/web/route.ts` — request ID, policy, strict Zod params/query/body, standard errors, telemetry.
- `apps/web/src/platform/web/fetch-with-policy.ts` — bounded external requests and normalized provider errors.
- `apps/web/src/platform/observability/logger.ts` — structured, redacted logs.
- `apps/web/src/platform/observability/metrics.ts` — route/provider/job/LLM measurements.
- `apps/web/src/platform/jobs/types.ts`, `repository.ts`, `worker.ts` — bounded atomic claim/retry contract.
- `apps/web/src/platform/events/outbox.ts` — industrial follow-up for consequential internal events that must eventually be delivered.
- `apps/web/src/platform/llm/gateway.ts` — model policy, prompt version, token/cost recording, timeouts.
- `apps/web/src/platform/test/route-harness.ts` — principal, limiter, repository, and provider fakes.
- `apps/web/scripts/check-text-integrity.mjs` — reject NUL bytes and other forbidden binary content in authored text paths.
- `apps/web/prisma/migrations/<timestamp>_authoritative_team_class/` — backfill/check/enforce the chosen team-class invariant.
- `apps/web/prisma/migrations/<timestamp>_jobs_outbox_ai_usage/` — industrial follow-up for workflows proven to need generalized jobs/outbox/invocation records; not a blanket pilot gate.
- `docs/architecture/adr-004-authoritative-team-class.md` — supersede contradictory prose explicitly.
- `docs/architecture/adr-005-jobs-outbox-and-ai-usage.md`.
- `docs/runbooks/incident-response.md`, `restore.md`, `data-export-delete.md`, `llm-cost.md`.

After pilot-critical work, create vertical folders only as complete domains are actively migrated. Recommended order: classroom/tenancy, team/economy, literature, research/logs, discovery, curriculum, fair/showcase.

### 6.4 Edit in the pilot-critical pass

- `apps/web/app/api/ops/codex/study-plan/route.ts`: remove NUL bytes and add cap/reservation concurrency tests during pilot hardening; move the workflow into a Codex service later unless it must change for another pilot item.
- `apps/web/lib/teacher/auth.ts`: implement the confirmed product policy once. Under the recommended single-class model, stop member-overlap authorization and query `Team.classId in ctx.classIds`.
- `apps/web/lib/teacher/analytics.ts`: remove whichever ownership assumption the product rejects; derive report scope from the same policy as authorization.
- `apps/web/app/api/team/join/route.ts`: enforce the confirmed class compatibility rule inside the same locked transaction; never swallow `applySchoolAndClass` errors silently.
- `apps/web/app/api/teacher/roster/route.ts`, `reports/route.ts`, `rubric/route.ts`, `feedback/route.ts`, `nudge/route.ts`, `showcase-moderation/route.ts`, and `student/**`: use the same classroom policy service.
- `docs/architecture/adr-001-team-class-ownership.md`: either reaffirm it through code or mark it superseded; do not leave it contradicted.
- `docs/ARCHITECTURE.md`: update its teacher-boundary description after migration and stop listing refactor intentions as realized architecture.
- `AGENTS.md`: add the text-integrity check to gates after it exists; add the chosen team/class invariant in house rules.
- `.github/workflows/*`: run text integrity, contract/schema tests, route policy tests, and generated-content checks.
- `apps/web/lib/rate-limit.ts`: preserve paid-tier fail-closed behavior; add structured metrics and distinguish limiter-store failure from allowed requests.
- `apps/web/lib/notifications/email.ts` and `app/api/discovery/youtube/resolve/route.ts`: add explicit timeouts and normalized provider errors.
- `apps/web/app/api/papers/route.ts`, `apps/web/app/api/papers/[id]/route.ts`, and `apps/web/app/api/cron/papers/route.ts`: converge on upload-command/create-job, pure status-read, and bounded worker responsibilities; no paid processing on GET.
- `apps/web/app/api/data-terminal/route.ts` and `[id]/measurements/route.ts`: add cursor/limit contracts and avoid returning the entire measurement history after every mutation.
- `apps/web/components/settings/LabProfileSettings.tsx`, `components/ops/ExpertisePanel.tsx`, `components/fair/ScienceFairFeature.tsx`, `components/teacher/TeacherRoster.tsx`, `stores/discoveryStore.ts`, and `lib/discovery/openalex.ts`: split as described in P2-4 only when changing that feature; these splits are industrial-quality work, not pilot gates by themselves.

### 6.5 Keep as-is or preserve conceptually

- `apps/web/lib/buildings/service.ts` and its tests: use as the model for application services.
- `apps/web/lib/api/client.ts`: preserve its central request/response behavior, then move/extend it under platform web code.
- `apps/web/lib/uploads/assets.ts`: preserve database-owned asset lifecycle; integrate with jobs/outbox cleanup.
- `apps/web/lib/rate-limit.ts`: preserve the store abstraction and production paid-tier guard.
- `apps/web/lib/team/active-team.ts`: preserve the pure selector and tests, though its location may change.
- `apps/web/prisma/schema.prisma`: retain one schema until a verified Prisma multi-file migration is deliberately adopted.
- `apps/web/e2e/`: retain critical flows; reduce static source-code assertions and move those to unit/tooling tests.
- `art/`, `art_ref/`, and generated sprite assets: preserve the deterministic art pipeline and its boundary from runtime code.
- `packages/config/`: retain.

## 7. Safe 3–4 day implementation sequence

Three to four days is enough for a disciplined pilot-hardening pass, not the complete industrial destination. Each day should end in a reviewable, revertible state. If the existing working tree is still carrying unrelated feature work, stabilize or isolate it before beginning this sequence.

### Day 1 — Characterize behavior and settle tenancy

1. Capture a baseline: all fast gates, relevant unit tests, and current E2E status.
2. Remove the NUL bytes and add the text-integrity check.
3. Write policy characterization tests before changing team/class behavior.
4. Inspect real/dev fixture data for cross-class teams.
5. Record the product decision in ADR-001 or a superseding ADR.
6. Implement one classroom policy seam and migrate team join plus teacher ownership checks without unrelated route cleanup.

**Stop/go gate:** policy tests pass; no unreviewed data would be orphaned or newly exposed; roster, student detail, feedback, rubric, moderation, and join E2E remain behaviorally correct under the chosen rule.

### Day 2 — Paid work and durable processing

1. Inventory every Anthropic call site and record its guard/cap/idempotency/timeout.
2. Remove paper processing from GET and preserve cron/job polling semantics.
3. Close the phase-classification paid-tier gap.
4. Add duplicate-request and paper-claim/retry tests.
5. Add minimum structured paid-call/job logging without recording prompts or student content.

**Stop/go gate:** no paid call can be reached through an ordinary `read`/`mutate` policy alone; paper upload/status flow and literature E2E pass; retry and terminal states remain recoverable.

### Day 3 — Bounded work, provider failure, and diagnostics

1. Cap/paginate experiments and measurements while preserving the UI contract or versioning it deliberately.
2. Add timeouts and normalized errors to confirmed provider gaps.
3. Add request IDs and structured summaries for sensitive routes, providers, cron, uploads, and policy denial.
4. Write the restore, incident, data-lifecycle, and AI-data-sharing minimum runbooks.
5. Run the first four pipeline gates and targeted E2E for every changed flow.

**Stop/go gate:** external stalls are bounded; growing reads have explicit limits; a failed request/job is diagnosable without sensitive payloads.

### Day 4 — Integration, regression, and one optional extraction

1. Run the full five-gate pipeline in order, restoring E2E fixtures first when required.
2. Test wrong-team/wrong-class IDs, double submits, stale tabs, provider failure, and cron resumption.
3. Review the final diff for accidental API, copy, visual, or data-model changes.
4. Update architecture docs to describe only what is actually implemented.
5. If all pilot gates are already green, extract one high-risk route workflow into a service as the template for later industrial work. Do not start a broad folder migration.

**Final pilot gate:** every item in §5.1 is implemented or explicitly accepted as a dated launch risk by the product owner. All five repository gates pass from a clean integration state.

### Behavior-preservation protocol for every slice

1. Add characterization tests for the current contract and database effects.
2. Extract code without changing responses or schema.
3. Run fast gates and targeted tests.
4. Make intentional policy/schema behavior changes in a separate commit-sized patch with migration/backfill checks.
5. Keep migrations additive and backward-compatible for at least one deployment whenever practical.
6. Preserve route URLs and UI component interfaces.
7. Compare before/after normalized outputs for complex queries.
8. Run full build/E2E only after the slice is otherwise stable.
9. Do not delete the old seam until all callers and rollback needs are verified.

## 8. Claim-validation register

Every material claim in this report was rechecked against the current tree as follows:

| Claim                                                     | Validation method                                                                                             | Result                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Student active team is membership-backed                  | Read `lib/api/route-context.ts`, `lib/team/context.ts`, and `lib/team/active-team.ts`                         | Confirmed                                                                                    |
| Existing DB teacher role overrides Clerk claim            | Read `lib/teacher/auth.ts` and `lib/teacher/role.ts`                                                          | Confirmed                                                                                    |
| Team/class authority is contradictory                     | Compared ADR-001, schema, ownership migration, teacher policy/analytics, team join, and teacher route queries | Confirmed                                                                                    |
| Study-plan route contains NUL bytes                       | Byte-level inspection (`xxd`) and byte count                                                                  | Confirmed: two bytes in `sourceHashOf` delimiters                                            |
| Compiler/linter do not catch those bytes                  | Ran shared-types build, web typecheck, and web lint                                                           | All passed                                                                                   |
| 98 route files                                            | Counted tracked/current `app/api/**/route.ts` paths                                                           | Confirmed                                                                                    |
| Six routes use `withTeamRoute`                            | Searched imports/usages under `app/api`                                                                       | Confirmed: four building mutations and two synthesis routes                                  |
| Most routes query Prisma directly                         | Searched `db.` usage under `app/api`; the large majority matched                                              | Confirmed                                                                                    |
| No route-named tests                                      | Searched test/spec paths for route tests                                                                      | Confirmed; route behavior may still be exercised indirectly by E2E                           |
| 34 non-E2E tests and 26 E2E specs                         | Counted current paths                                                                                         | Confirmed                                                                                    |
| Paid tiers fail closed without shared store in production | Read `lib/rate-limit.ts::paidTierMisconfigured`                                                               | Confirmed, unless `RATE_LIMIT_ALLOW_MEMORY=1` is explicitly set                              |
| All Anthropic work uses a paid tier                       | Traced helper call sites back to route guards                                                                 | Refuted: phase classification uses `mutate`; paper detail GET can process a job under `read` |
| External timeout policy is inconsistent                   | Inspected server-side `fetch` call sites and nearby signals                                                   | Confirmed; examples include Resend and YouTube oEmbed without explicit abort signal          |
| Data-terminal collections are unbounded                   | Read both data-terminal list/measurement handlers                                                             | Confirmed                                                                                    |
| Activity writes are commonly fire-and-forget              | Searched `logActivity` call sites and `.catch(...)` patterns                                                  | Confirmed                                                                                    |
| Contract/client ownership is fragmented                   | Enumerated `api.ts`, `types.ts`, `treeApi.ts`, stores, and direct UI `fetch` call sites                       | Confirmed                                                                                    |
| Prisma schema is 1,768 lines                              | Counted current file                                                                                          | Confirmed; no claim is made that size alone is defective                                     |
| Existing working tree was dirty during audit              | `git status --short` before writing this file                                                                 | Confirmed; this audit did not modify those files                                             |

### Validation limitations

- This was a static architecture/security audit plus the first three repository gates. It did not run the production build, database-backed E2E suite, penetration testing, query plans against production-scale data, or live provider failure injection.
- Uncommitted feature work may change before implementation begins. Re-run the validation register when converting findings to tickets.
- “No route tests” means no dedicated route-test files were found; E2E specs do exercise routes.
- An unbounded query is a scalability risk, not proof of current classroom latency.
- The cross-class behavior is confirmed code, but whether it is a product requirement requires an explicit product/privacy decision. This report recommends the stricter model because it matches the recorded ADR and minimizes implicit access.

## 9. Definitions of done

### 9.1 Pilot-ready

The pilot-critical refactor is complete when:

- the team/class authorization rule is explicit, consistently implemented, data-audited, and policy-tested;
- every paid call has authentication, global production limiting, input/cost bounds, appropriate idempotency, and diagnosable failure;
- paper processing remains durable and no GET performs paid processing;
- confirmed growing collections and cron/provider work are bounded;
- high-risk wrong-tenant and concurrency cases have targeted tests;
- minimum request/job/provider diagnostics exist without sensitive content;
- restore, incident, data lifecycle, storage cleanup, and AI-sharing procedures are documented;
- paid/slow paper processing follows create-job/status-read/worker semantics, and no GET hides a mutation or paid provider call;
- all five repository gates pass after integration.

Broad route thinning, UI decomposition, directory migration, and generalized jobs are not pilot-readiness requirements unless a pilot-critical change makes them necessary.

### 9.2 Industrial-quality destination

The refactor is complete only when:

- one documented query proves every student and teacher access decision;
- every complex route maps to one feature use case, and route-policy coverage is proportional to its authorization and mutation risk;
- all growing lists and jobs are bounded;
- every paid call is globally rate-limited and usage-accounted, with idempotency appropriate to the operation;
- every long-running non-streaming workflow has durable state;
- external calls have explicit timeout/error/retry policies;
- consequential user-visible events are transactional or delivered through an outbox, while explicitly non-critical telemetry remains best-effort;
- logs are structured, correlated, redacted, and sufficient for incident/cost diagnosis;
- student data export/deletion and storage reconciliation are documented and tested;
- feature contracts have one runtime-validated source;
- each consequential workflow has an explicit synchronous, streaming, durable-job, or outbox communication contract;
- internal feature modules communicate through application services or durable events, never internal HTTP callbacks;
- obsolete files in §6.1 are actually deleted only after import and behavior verification;
- all five repository gates pass in order, with E2E data isolated enough to avoid shared-account mutation races.

The architecture should be judged by invariants and failure behavior, not by whether every file is small. A cohesive 400-line pure domain table is healthier than five 80-line files that share hidden state. The goal is one owner per rule, one policy per boundary, and one durable record per consequential action.
