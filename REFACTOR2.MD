# scienium — Architecture Refactor Plan (Track B / C)

_Originally an adversarial architecture audit of the 2026-07-15 working tree. **Pruned
2026-07-19**: every finding that has since shipped was removed, and statements that had gone
stale were corrected against the current code. What remains is open work only._

> **What this document is now.** Track A (the pilot-critical hardening scope) is **complete**
> — see the appendix for what was cut and where it landed. The pilot no longer blocks on
> anything in this file. Everything below is **Track B** (clean industrial code) and
> **Track C** (deferred/optional): maintainability work to do one feature at a time, ideally
> when you are already touching the file for another reason.

---

## Executive verdict

scienium should remain a **modular monolith**. The product does not need microservices, an
event bus, or multiple databases. It needs vertical feature boundaries, thin transport
adapters, durable paid/background work, bounded reads, runtime-validated contracts, and
production-grade observability.

The foundations are sound: PostgreSQL is the durable source of truth; team-scoped student
guards re-prove membership; teacher roles are server-enforced; mutation schemas are strict
and bounded; paid routes fail closed in production; uploads use a database-owned asset
lifecycle; and economy/upload/paper workflows have moved into application services. The
remaining problem is **consistency** — the intended architecture exists in pockets, but most
route handlers still own their queries and workflows, client networking is fragmented, and
durability/observability are uneven.

> **Tenancy is settled — do not re-open it from this document.** The original audit's
> headline finding was a contradiction between `Team.classId` (ADR-001) and membership-derived
> teacher access, and it recommended making a team belong to exactly one class. **The product
> rejected that recommendation.** `docs/architecture/adr-004-per-student-class-membership.md`
> supersedes ADR-001: class membership is **per student**, `Team.classId` is vestigial, and a
> teacher of any member may see shared team artifacts. The schema, `lib/teacher/auth.ts`,
> `docs/ARCHITECTURE.md`, and `test/teacher-scope.test.ts` all now agree. Any surviving prose
> in older documents recommending the single-class model is obsolete.

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
| ~~A — Before pilot~~ | **COMPLETE** (shipped v0.26.0–v0.29.1) | — |
| **B — Clean industrial code** | Incrementally extract complex workflows, unify feature contracts/clients, split mixed-responsibility files, standardize route adapters and durable events | Meaningful changes across authored runtime code over time, one feature at a time |
| **C — Deferred/optional** | Broad `src/features/**` relocation, generalized job platform, generated-content reorganization, deleting `shared-types`, tooling-repository cleanup | Do only when justified by active work or measured operational need |

### Priority summary — open items only

| Priority | Finding | Consequence |
| --- | --- | --- |
| P1 | No route-test harness; 4 ad-hoc route-handler tests exist, but no per-route-family matrix | Status-code, validation, and provider-failure invariants for large routes rest on E2E |
| P1 | Only 6 of 98 routes use `withTeamRoute`; most handlers query Prisma directly | Authorization, validation, error mapping, and telemetry stay copy-pasted |
| P1 | No durable AI/job ledger — token usage is logged but not recorded, with no idempotency keys | Spend cannot be reconciled; a provider response after disconnect is ambiguous |
| P1 | Structured logger exists but is wired into 5 modules; no request wrapper or per-route telemetry | Route-level incidents still lack correlation |
| P1 | No transactional outbox; 17 of 31 `logActivity` sites are fire-and-forget | Teacher-visible history can silently drop |
| P2 | Feature ownership split across `app`, `components`, `lib`, `stores`, and component-local API/type files | One contract change touches several unrelated trees |
| P2 | Two residual unbounded reads (measurements POST echo, teacher class list) | Payload cost grows with classroom history |
| P2 | Client fetching has competing patterns (29 components still call `fetch` directly) | Inconsistent cancellation, stale-response handling, parsing, errors |
| P2 | No shared `fetchWithPolicy`; retry/error-taxonomy/size-cap remain per-adapter | Provider behavior is inconsistent |
| P2 | Six god files combine materially different responsibilities | Merge pain and untestable logic |
| P2 | Data lifecycle is documented but untested | Deletion/export behavior can regress unnoticed |
| P2 | Reward-minting duplicated across three grade paths (SVC-1, inherited from `docs/REFACTOR.md`) | Money logic in three places will diverge |
| P3 | Large generated/static domains obscure authored code | Reviewability and ownership suffer |

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

packages/shared-types/              # delete unless a second runtime package consumes it
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

**Reference implementations** (copy these, don't invent a new shape):
`lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`.

### 2.2 Application-service contract

Application services accept an explicit principal and a validated command/query. They own
transactions, idempotency, authorization-policy calls, and orchestration. Domain functions
remain pure. Prisma code is isolated in repositories only when that creates a real test seam;
trivial single-table reads do not need ceremonial interfaces.

### 2.3 Contract ownership

Use one Zod schema as the runtime and compile-time contract for each endpoint. Response
parsing belongs in the feature contract/client, not handwritten independently in
`components/**/types.ts`, `components/**/api.ts`, and a route. `packages/shared-types` should
exist only if another workspace package truly consumes those types.

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
- `lib/buildings/service.ts`, `lib/papers/service.ts`, and `lib/literature/quiz-retry.ts` are
  the application-service template: thin route adapters, explicit concurrency, typed results.
- `lib/uploads/assets.ts` gives object storage a database-owned lifecycle with a single
  physical-delete site, per-team quota, and reclaim.
- `PaperProcessingJob` is the correct direction for durable paid processing.
- Schema-level unique constraints protect one-time/idempotent rules: duplicate team paper
  content, source visits, daily awards, plot occupancy, rubric scorer keys.
- `lib/observability/log.ts` is the right logger shape (JSON events, redaction by design,
  request ids) — it simply is not wired widely enough yet (see P1-5).
- Static sweeps prevent whole regression classes: `test/route-guard-sweep.test.ts` (every
  route carries an auth guard), `test/paid-work-guard.test.ts` (transitive closure over
  Anthropic reachability), `test/cron-guard.test.ts`, `test/prompt-injection-pins.test.ts`.
- `art/` is correctly separate from the runtime application.
- ~990 unit tests plus a full authenticated Playwright suite that runs green against a
  production build.

### 3.2 Where control still overlaps

> Resolved and removed: **A. Team/class authorization** (settled by ADR-004) and
> **C. Team-context resolution** (`route-context.ts` now delegates to the single resolver in
> `lib/team/context.ts`).

#### B. Route guards and wrappers

`requireTeamContext`, `requireUserContext`, `requireTeacher`, cron auth, middleware
protection, and `withTeamRoute` each own part of transport policy. That separation can be
valid, but adoption is incomplete: **only 6 of 98 routes use `withTeamRoute`** (four building
mutations, two synthesis routes). Direct guard/parse/query code remains the norm.

#### D. API contracts and client state

Contracts and network logic live variously in `components/literature/{api,types,synthesisApi,vocab-api}.ts`;
`components/ops/{data-terminal,failure-log,project-log}/{api,types}.ts`;
`lib/discovery/treeApi.ts` plus `stores/discoveryStore.ts`; direct `fetch` calls in **29**
component files; and `lib/api/client.ts` for only some features. There is still no single
answer to "where does this feature's HTTP contract live?"

_One slice has landed_: `components/discovery/api.ts` is a Zod + `requestJson` feature client
built to this pattern — use it as the template.

#### E. Domain logic in routes

**Extracted (done):** paper upload → `lib/papers/service.ts` (route is 84 lines, adapter
only); quiz retry → `lib/literature/quiz-retry.ts` (route is 58 lines, zero `db.` calls).

**Still inline**, in descending order of size and risk:

| Route | Lines | Direct `db.` calls |
| --- | --- | --- |
| `app/api/teacher/student/[id]/overview/route.ts` | 347 | 18 |
| `app/api/ops/codex/complete/route.ts` | 293 | 6 |
| `app/api/research-plan/review/route.ts` | 261 | 2 |
| `app/api/project-log/route.ts` | 247 | 8 |
| `app/api/ops/codex/study-plan/route.ts` | 202 | 7 |
| `app/api/research-plan/idea-check/route.ts` | — | — |

#### F. Background work

Paper processing has a durable job model; other paid calls run inline. Fire-and-forget
`logActivity(...).catch(...)` appears at **17 of 31** call sites. Notifications use bounded
cron batching, but email sends and provider failures are not represented through a general
job/outbox lifecycle. The system therefore still has several incompatible durability
guarantees.

---

## 4. Open findings

### P1-1 — Establish a route-test harness

_Corrected: the original "no route-level tests" premise is no longer true._ There are now ~70
non-E2E test files, and four tests import route handlers directly
(`test/advance-phase-paid-gate.test.ts`, `test/showcase-public-asset.test.ts`,
`test/topic-removal.test.ts`, `test/team-join.test.ts`). `test/route-guard-sweep.test.ts`
statically proves every route carries a guard.

**What is still missing:** a reusable harness (principal / limiter / repository / provider
fakes) and per-route-family matrices for the large handlers in §3.2 E — signed out, wrong
team or class, invalid input, rate limit, conflict/race, provider failure. Also inherited
from `docs/REFACTOR.md` (SEC-1): the systematic four-case IDOR matrix per route family.
Cross-team 404 behavior is currently proven only spot-wise, in E2E (`F1` AC10, `F11` AC8,
`papers-tab` AC7, `vocab-builder` AC13, `F18` AC4b).

### P1-2 — Migrate high-risk routes first; standardize the rest incrementally

Only six routes use `withTeamRoute`; most import `db` directly. This is a maintainability
concern, not proof that direct-Prisma routes are unsafe. Do not wrap all 98 handlers and
declare victory — move high-risk workflows first, then standardize adapters when touched.
The remaining queue is the §3.2 E table, in that order.

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

### P1-6 — Make consequential side effects durable

17 of 31 `logActivity(...)` call sites are fire-and-forget. Losing an activity entry may be
acceptable, but the code does not distinguish optional analytics from user-visible history.
Use a transactional outbox for activity/notification events that matter to teachers or
progression; name and document genuinely best-effort telemetry as such.

### P2-1 — Bound the two residual growing reads

_Narrowed — the main offenders are fixed_ (`data-terminal/route.ts` caps experiments at 200;
`measurements/route.ts` caps at 2,000 per experiment). Residual:

- `app/api/data-terminal/[id]/measurements/route.ts` still **returns the whole list after
  each write** — the POST should return the created row or a summary, not the history.
- `lib/teacher/auth.ts` class lookup has no `take` (small at pilot scale, but it runs on
  every teacher request).

Not every `findMany` needs pagination — fixed vocabularies and rubric rows are naturally
bounded. Define limits in contracts, not ad hoc route constants.

### P2-2 — Standardize external-provider behavior

_Narrowed — the named gaps are closed_: `lib/notifications/email.ts` and
`app/api/discovery/youtube/resolve/route.ts` both use `AbortSignal.timeout(5_000)`, and every
server-side provider fetch now has an explicit abort.

**Still missing:** a shared `fetchWithPolicy` primitive for timeout, retryable statuses,
maximum response bytes, user agent, and normalized errors. Retry, error taxonomy, caching,
and logging remain per-adapter. Never retry non-idempotent provider writes without an
idempotency key.

### P2-3 — Consolidate client data access

Do not adopt TanStack Query for fashion. A small feature-client layer solves the current
inconsistency: runtime response decoding, abort signals, standard errors, request
de-duplication. For screens with real cache/invalidation pressure, TanStack Query is
justified; otherwise typed hooks over `requestJson` suffice.

17 modules use `lib/api/client`; **29 component files still call `fetch` directly**. Move
networking out of large UI components (`TeacherRoster`, `LabProfileSettings`,
`ScienceFairFeature`, `ExpertisePanel`, discovery shells). UI should render state and emit
intent. Template: `components/discovery/api.ts`.

### P2-4 — Break remaining god files by responsibility

Line count alone is not a defect. These authored files combine materially different
responsibilities (counts refreshed 2026-07-19):

| File | Lines | Mixed responsibilities |
| --- | --- | --- |
| `components/settings/LabProfileSettings.tsx` | 718 | several settings domains + loading + mutation + rendering |
| `lib/discovery/openalex.ts` | 601 | multiple endpoint contracts, mapping, caching, provider behavior |
| `stores/discoveryStore.ts` | 605 | server synchronization + several interaction concerns |
| `components/ops/ExpertisePanel.tsx` | 584 | state machine + networking + exam UI + result UI |
| `components/fair/ScienceFairFeature.tsx` | 568 | matching + selection + deadlines + presentation |
| `components/teacher/TeacherRoster.tsx` | 547 | roster + classes + join requests + mutations + UI |

Split along behavior/state ownership, never a line-count quota. Keep cohesive large pure
tables or tests intact.

### P2-6 — Test the data lifecycle

_Reframed._ The inventory landed (`docs/runbooks/data-export-delete.md`), and the schema has
ten `onDelete: Cascade` rules. **The tests did not.** There is no lifecycle/deletion test
file. Add tested deletion behavior for User/Class/Team, uploaded assets, publications,
activity, LLM history, and teacher feedback.

Do not split `schema.prisma` (currently 1,802 lines) using unsupported conventions. Generate
a domain-index document from it, or adopt Prisma's supported multi-file schema only after
verifying the deployed Prisma version and migration workflow.

### SVC-1 — Consolidate reward minting _(inherited from `docs/REFACTOR.md`, now deleted)_

Currency reward-minting is duplicated near-verbatim across **three** sites — the
`paper-quiz:` lock tail, the award calculation, and the `teamCurrency.upsert`:

- `app/api/papers/[id]/quiz/grade/route.ts` (~113-180)
- `lib/literature/quiz-retry.ts` (~353-412)
- `app/api/expertise/grade/route.ts` (~154, plus its own clearance raise)

Money logic in three places will diverge. Create `lib/literature/quiz-service.ts` and
`lib/clearance/exam-service.ts`; move the transaction, award, and `logActivity` in; leave the
routes thin.

> This item was originally deferred "until after the PvP concurrent window." **That window
> has closed** — PvP has shipped, so SVC-1 is unblocked.

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

1. **Thin high-risk routes.** Extract multi-step authorization, transactions, raw SQL,
   provider calls, prompt construction, and domain workflows into feature application
   services. Simple reads do not need ceremonial services.
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
8. **Provider policy.** Centralize timeout, response-size, retryability, and normalized errors.
9. **Lifecycle correctness.** Implement tested export, deletion, and storage reconciliation
   rather than stopping at an inventory document.
10. **Dependency direction.** UI depends on feature contracts; routes depend on application
    services; feature code depends on platform code, never another feature's components.
11. **Architectural checks.** Add import-boundary, contract, and policy tests where they
    prevent a demonstrated regression.
12. **Explicit communication semantics.** Classify each workflow as synchronous, streaming,
    durable job, or outbox. Prohibit internal HTTP calls between feature modules and provider
    calls hidden inside GET reads.

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
| `packages/shared-types` | Only if import analysis proves the web app is its sole consumer. Note `src/pvp.ts` currently has **zero consumers** — PvP shipped without adopting it; decide whether to reconcile or delete it. |

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
- `test/route-harness.ts` — principal, limiter, repository, and provider fakes (see P1-1);
- a jobs/outbox/AI-usage migration — only for workflows proven to need it;
- `docs/architecture/adr-005-jobs-outbox-and-ai-usage.md`.

After each slice, create vertical folders only as complete domains are actively migrated.
Recommended order: team/economy, literature, research/logs, discovery, curriculum,
fair/showcase.

### 6.4 Edit when touched

- `app/api/teacher/student/[id]/overview/route.ts`, `app/api/ops/codex/{complete,study-plan}/route.ts`,
  `app/api/research-plan/{review,idea-check}/route.ts`, `app/api/project-log/route.ts`:
  extract the workflow into a feature service (§3.2 E), following `lib/papers/service.ts`.
- `app/api/data-terminal/[id]/measurements/route.ts`: stop returning the full measurement
  history after every mutation.
- `lib/teacher/auth.ts`: add a bound to the class lookup.
- `lib/rate-limit.ts`: add structured metrics; distinguish limiter-store failure from allowed
  requests.
- `components/settings/LabProfileSettings.tsx`, `components/ops/ExpertisePanel.tsx`,
  `components/fair/ScienceFairFeature.tsx`, `components/teacher/TeacherRoster.tsx`,
  `stores/discoveryStore.ts`, `lib/discovery/openalex.ts`: split per P2-4 **only when
  changing that feature**.
- `docs/ARCHITECTURE.md`: keep it describing what is implemented, never intentions.

### 6.5 Keep as-is or preserve conceptually

- `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts` — the
  application-service models.
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
- student data export/deletion and storage reconciliation are documented **and tested**;
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

Removed because the work shipped. Kept here as a pointer so the history is findable.

| Original finding | Where it landed |
| --- | --- |
| **P0-1** Contradictory classroom boundary | `docs/architecture/adr-004-per-student-class-membership.md` supersedes ADR-001; schema comments, `lib/teacher/auth.ts`, ARCHITECTURE.md aligned; `test/teacher-scope.test.ts` pins it. **The audit's single-class recommendation was rejected by the product.** |
| **P0-2** Embedded NUL bytes | Bytes removed; `apps/web/scripts/check-text-integrity.mjs` is gate 2 in `package.json`, CI, `CLAUDE.md`, and `AGENTS.md`. |
| **P1-3** Paid-work classification | `advance-phase` enforces the `ai` tier before `classifyLabType`; paper detail GET no longer processes; `test/paid-work-guard.test.ts` is a transitive-closure sweep that fails CI on the whole class. |
| **P2-5** Generated curriculum, one source | `lib/ops/codex/__tests__/generated-content.test.ts` validates JSON against the schema, deep-equals the wrapper, and locks a checksum. |
| **§3.2 A** Team/class authorization overlap | Same as P0-1. |
| **§3.2 C** Duplicated team-context resolution | `lib/team/context.ts` is the sole DB resolver; `lib/api/route-context.ts` delegates to it. |
| **§5.1 PILOT-1 … PILOT-7** | Track A shipped across v0.26.0 (pilot hardening, runbooks, observability, bounded reads) and v0.28.0–v0.29.1 (security sweep, test tripwires, prod-build E2E). |
| **§7** 3-4 day implementation sequence | Executed; it was a plan, not a standing reference. |
| **§8** Claim-validation register | A snapshot of a tree that no longer exists — 8 of its 20 rows had become false. |
| **§9.1** Pilot-ready definition of done | All criteria met; see the runbooks in `docs/runbooks/` and the CHANGELOG entries above. |

Also corrected rather than deleted: the route-test premise (P1-1), god-file line counts
(P2-4), schema size (P2-6), and the §6.4 instruction to authorize teachers via
`Team.classId` — which had become the **opposite** of accepted policy and would have been a
security regression if followed.
