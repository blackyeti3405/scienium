# scienium — Architecture & Production-Readiness Plan

_Originally an adversarial architecture audit of the 2026-07-15 working tree. **Pruned
2026-07-19**, then re-audited adversarially after v0.29.4 (`aa1ffe5`). Shipped work is kept
only where provenance matters; everything presented as open below was verified against that
working tree._

> **What this document is now.** Track A (A1–A14, reopened by the v0.29.4 audit) **shipped
> in v0.30.0**; its two partial remainders are listed under §4. Track B's §3.2 E route
> extraction queue **completed in v0.31.0**, which also absorbed the `fetchWithPolicy` and
> residual-unbounded-read items via a full-repo over-engineering audit. What remains here is
> the rest of the Track B architecture program (contracts/clients, outbox, AI ledger,
> telemetry, SVC-1) and Track C optional cleanup. `docs/SECURITY.md` is authoritative for the
> broader threat register; `docs/ARCHITECTURE.md` describes the implemented state.

---

## Executive verdict

scienium should remain a **modular monolith**. The product does not need microservices, an
event bus, or multiple databases. It needs vertical feature boundaries, thin transport
adapters, durable paid/background work, bounded reads, runtime-validated contracts, and
production-grade observability.

The foundations are sound: PostgreSQL is the durable source of truth; team-scoped student
guards re-prove membership; teacher roles are server-enforced; mutation schemas are strict
and bounded; and paid routes fail closed in production. The v0.29.4 audit found those
foundations applied inconsistently at several consequential edges — a quiz read that dropped
the active-team boundary, roster shaping that contradicted ADR-004, upload ledgers with
partial-failure windows, daily notification capacity below the 10,000-user target, and green
tests that did not exercise real production contracts. **All of those are closed as of
v0.30.0**; every one now carries a pinning test. The remaining program is the Track B
architecture work below: durable events, an AI/job ledger, per-route telemetry, one contract
per feature, and the SVC-1 money-path consolidation.

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
| **A — Before pilot** | **CLOSED in v0.30.0** (A1–A14). Two scoped remainders carried into Track B: the isometric hitbox / JS-click E2E bypasses (A3) and the tiny-text design pass (A9) | Correct tenancy, classroom behavior, durability, 10k-user jobs, privacy, accessibility, and truthful release gates |
| **B — Clean industrial code** | Incrementally extract complex workflows, unify feature contracts/clients, split mixed-responsibility files, standardize route adapters and durable events | Meaningful changes across authored runtime code over time, one feature at a time |
| **C — Deferred/optional** | Broad `src/features/**` relocation, generalized job platform, generated-content reorganization, deleting `shared-types`, tooling-repository cleanup | Do only when justified by active work or measured operational need |

### Priority summary — open items only

Track A's fourteen findings are closed (see the v0.30.0 close-out table below and
`docs/CHANGELOG.md`). What follows is everything still open, re-measured against the working
tree on 2026-07-20.

| Priority | Finding | Consequence |
| --- | --- | --- |
| P1 | E2E specs still bypass pointer hit-testing via `element.click()` on isometric sprites (A3 remainder) | UI occlusion can pass tests; needs the sprite hitbox/stacking fix first |
| P1 | No durable AI/job ledger — token usage is logged but not recorded, with no idempotency keys | Spend cannot be reconciled; a provider response after disconnect is ambiguous |
| P1 | Structured logger is wired into a handful of modules; no request wrapper or per-route telemetry | Route-level incidents still lack correlation |
| P1 | No transactional outbox; 16 of 31 `logActivity` sites are fire-and-forget | Teacher-visible history can silently drop |
| P1 | Route-policy coverage: static routes and invalid-input/provider-failure matrices remain uneven | The four-case matrix covers dynamic routes; other families rely on the static sweeps |
| P2 | ~600 6–9px text declarations need a design pass; no WebKit/Firefox E2E coverage (A9 remainder) | Low-vision readability below the agreed floor on classroom chrome |
| P2 | Feature ownership split across `app`, `components`, `lib`, `stores`, and component-local API/type files | One contract change touches several unrelated trees |
| P2 | Client fetching has competing patterns (29 component files still call `fetch` directly) | Inconsistent cancellation, stale-response handling, parsing, errors |
| P2 | Six god files combine materially different responsibilities (all shrank in v0.31.0; none split) | Merge pain and untestable logic |
| P2 | Data lifecycle is documented but untested | Deletion/export behavior can regress unnoticed |
| P2 | Reward-minting duplicated across the grade paths (SVC-1, inherited from `docs/REFACTOR.md`) | Money logic in several places will diverge |
| P2 | Only 6 of 98 routes use `withTeamRoute` | Maintainability only — every workflow route now has a service seam; simple routes stay direct-Prisma by design |
| P3 | Large generated/static domains obscure authored code | Reviewability and ownership suffer |

### v0.30.0 close-out (2026-07-19, working tree)

Track A was executed the same day. Status per finding (see `docs/CHANGELOG.md` [0.30.0] for
the full change list):

| Finding | Status |
| --- | --- |
| A1 | **Closed** — PvP consistently documented as not shipped (the one "has shipped" claim in ARCHITECTURE.md corrected; in-app surface already honest: StubFeature + 501). `shared-types/src/pvp.ts` retained pending the post-pilot PvP decision. |
| A2 | **Closed** — quiz GET team-scoped (test now expects 404), onboarding stops writing `Team.classId`, roster stops reading it; cross-class + null-class roster matrices added. |
| A3 | **Partially closed** — PR smoke + nightly/full lanes exist (`.github/workflows/e2e.yml`, gated on the `E2E_ENV_FILE` secret, which must be configured for the gate to bind; branch protection remains a SECURITY.md item). **Open remainder:** the isometric-sprite hitbox fix and removal of the `clickBuilding` element.click() bypasses — needs live-browser iteration; keyboard activation of gateways is real and covered by `e2e/a11y.spec.ts`. |
| A4 | **Closed** — `NotificationRunTeam` day ledger, 15-min continuation schedule, bulk fair index + per-page log grouping; capacity test proves 3,500 teams/day in ≤5 runs. |
| A5 | **Closed** — reservation-first ledger on all three upload paths, transactional attach, atomic showcase replacement, P2002-only orphan adoption; failure-injection tests per step. |
| A6 | **Closed** — `lib/economy/lab-credit.ts`: P2002-only "already paid", retry + redacted event + explicit `lcAward` state; failure-injection tests incl. P2025. |
| A7 | **Closed** — all ten payload sites now redacted `logEvent`s; `test/log-redaction-sweep.test.ts` forbids the class statically. |
| A8 | **Closed** — `retryGenClaimedAt` claim election before the paid call; concurrent Promise.all test + real-Postgres race. |
| A9 | **Substantially closed** — `useModalA11y` trap/restore in all dialog shells, icon-button names, global `:focus-visible`, reduced-motion blanket, axe+keyboard smoke on desktop + tablet (verified live). **Open remainder:** the ~600 6–9px text declarations need a design pass (the two worst 6px/40% styles were raised); WebKit/Firefox coverage still absent. |
| A10 | **Closed** — hub tabs are dynamic boundaries; `/daily/log` and `/daily/failure` measured 582 KB → **211 KB** first-load JS. |
| A11 | **Closed (narrow scope)** — `test/pg/invariants.pg.test.ts` covers quota lock, LC unique, claim election, view dedupe on real Postgres; the in-memory harness stays policy-only (it gained read-only `groupBy`/`createManyAndReturn` support, no constraint emulation). |
| A12 | **Closed** — `reserveUploadAsset` advisory-lock quota; per-(showcase, slot) locks for single-slot replacement and multi-slot caps (asset, link, and works-cited routes). |
| A13 | **Closed** — `day` bucket + `@@unique([showcaseId, visitorFingerprint, day])`, duplicate-safe `recordShowcaseView`, backfill migration documented in `20260719120000_track_a_hardening`. |
| A14 | **Closed for this release** — AGENTS/CLAUDE (Next 15, real CI lanes, PvP phrasing), SECURITY.md harness/remediation sections, ARCHITECTURE.md PvP claim, this table. Coverage thresholds remain unconfigured (open). |
| P1-2 | **§3.2 E queue COMPLETE** — all six inline-workflow routes extracted to application services: teacher student-overview (`lib/teacher/student-overview.ts`), project-log (`lib/logs/project-log-service.ts`), codex complete (`lib/ops/codex/complete-service.ts`), codex study-plan (`lib/ops/codex/study-plan-service.ts`), research-plan review (`lib/research-plan/review-service.ts`, streaming: service returns replay/stream variants), research-plan idea-check (`lib/research-plan/idea-check-service.ts`). Remaining P1-2 work is migrate-on-touch: standardize simple routes onto the adapter shape when they are next changed — do NOT batch-wrap the ~90 remaining simple handlers. |
| N+1 sweep | Forms seeding, citations backfill, measurements POST echo, teacher-auth bound fixed; notifications fan-out fixed under A4; `tree-service` dedup reads accepted as minor. |

The pre-existing `e2e/F1.spec.ts` AC5 failure recorded here was diagnosed and **fixed in
v0.31.0** — a client stale-response race (an in-flight feedback GET overwriting the
optimistic update), not a route defect. F1 is 13/13.

### v0.31.0 close-out (2026-07-20, working tree)

| Item | Status |
| --- | --- |
| **P1-2 / §3.2 E** | **CLOSED** — all six inline-workflow routes are thin adapters over application services (`lib/teacher/student-overview.ts`, `lib/logs/project-log-service.ts`, `lib/ops/codex/{complete,study-plan}-service.ts`, `lib/research-plan/{review,idea-check}-service.ts`), joining `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`. Streaming services return typed replay/stream variants. The ~90 simple handlers stay direct-Prisma **by design** — migrate-on-touch only. |
| **P2-2 `fetchWithPolicy`** | **CLOSED** — `lib/fetch-retry.ts` (`fetchWithRetry` + `sleep`) is the single provider retry discipline: timeout race, 429/5xx `retry-after` backoff, optional network-error retry. All five discovery adapters and the wiki article route are one-line bindings. |
| **P2-1 residual reads** | **CLOSED** — the measurements POST returns only created rows (`createManyAndReturn`); the teacher-auth class lookup is bounded. |
| **Full-repo over-engineering audit** | **DONE (2026-07-20)** — 601 authored files audited (477 lean), 136 findings adversarially verified, 121 applied, ~15 rejected as behavior-changing, 2 unverified and deliberately not applied. −2,762 net lines. Deleted: `lib/discovery/ncbi.ts`, `packages/shared-types/src/pvp.ts`, dead signed-URL/env accessors. Added shared primitives — see `docs/CHANGELOG.md` [0.31.0]. |
| **P2-4 god files** | Partially reduced, none split: LabProfileSettings 718→565, ExpertisePanel 584→574, ScienceFairFeature 568→548, TeacherRoster 547→518, openalex 601→577, discoveryStore 605 (unchanged). Splitting remains open. |

### Verification baseline (2026-07-20, working tree)

- Branch `Rig-features`, uncommitted working tree at the time of writing.
- Gates 1–5 pass: shared-types build, text integrity, typecheck, lint, production build.
- Vitest: **89 files / 1,286 tests passed**.
- Real-Postgres invariants: `test/pg/invariants.pg.test.ts` (4 tests) against the local dev
  database; self-skips when no database is reachable.
- Playwright: nine suites re-run green against the surfaces this work touched — `a11y`,
  `settings-smoke`, `topic-removal-confirm`, `placement`, `F1` (13/13), `F13-codex` (15/15),
  `F18-vega-companion` (11/11), `papers-tab` (15/15), `F11-quiz-retry` (14/14). The full
  serial suite is the release lane in `.github/workflows/e2e.yml`, which binds once the
  `E2E_ENV_FILE` repository secret is configured.
- Production build measures `/daily/log` and `/daily/failure` at **211 KB** first-load
  JavaScript (was ~582 KB before A10).
- A live `pnpm audit` advisory lookup is still not performed here; `docs/SECURITY.md` owns
  that open CI control.

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

**Structural reference implementations** (copy the seam, not every current behavior):
`lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts`.
The latter two still have the partial-failure/concurrency defects in A5 and A8.

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
`lib/discovery/treeApi.ts` plus `stores/discoveryStore.ts`; direct `fetch` calls in **29**
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
`logActivity(...).catch(...)` appears at **16 of 31** call sites. Notifications now carry a
durable per-day run ledger (`NotificationRunTeam`) and frequent continuations that cover the
10,000-user target (A4, closed), but email sends and provider failures are still not
represented through a general job/outbox lifecycle. The system therefore still has several
incompatible durability guarantees — see P1-4 and P1-6.

---

## 4. Open findings

### A3-R — Remove the isometric JS-click E2E bypasses _(P1, Track A remainder)_

The release lanes shipped (`.github/workflows/e2e.yml`: a bounded production-build smoke lane
on PRs, the full serial suite nightly/on-demand). **Still open:** several core specs call DOM
`element.click()` through a `clickBuilding` helper to bypass isometric z-index overlap
(`e2e/F3.spec.ts`, `F11-quiz-retry.spec.ts`, `F13-codex.spec.ts`, `placement.spec.ts`,
`upgrades.spec.ts`, `lit-explain-it-back.spec.ts`, `rubric-self-assessment.spec.ts`). That
verifies handler wiring while bypassing the browser hit-testing a student actually uses.

**Close when:** `components/lab/LabPlot.tsx` sprite hitboxes/stacking are fixed so a real
pointer click lands on the intended gateway, the `clickBuilding` helpers are deleted, and the
specs pass with genuine `.click()`. Keyboard activation is already real and covered by
`e2e/a11y.spec.ts`. Note the lanes only bind once the `E2E_ENV_FILE` repository secret exists.

### A9-R — Classroom text readability design pass _(P2, Track A remainder)_

The structural accessibility floor shipped: `useModalA11y` (focus trap + restore) behind
`components/ui/ModalBackdrop.tsx` for every panel shell, accessible names on icon-only
controls, a global `:focus-visible` outline, a blanket `prefers-reduced-motion` fallback, and
`e2e/a11y.spec.ts` (axe-critical + keyboard trap/restore) on desktop **and** a tablet
viewport.

**Still open:** roughly 600 declarations use 6–9 px text, often at 25–40% white; only the two
worst (`.clr-rung__theme`, `.sc-chip` at 6px/40%) were raised. This needs a design decision on
the minimum classroom-chrome size/contrast, not a mechanical sweep — the pixel aesthetic is
deliberate. WebKit/Firefox E2E coverage is also still absent.

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
Before widening instrumentation, remove the raw payload/model-output logging listed in A7 so
the structured migration does not coexist with a privacy-unsafe fallback convention.

### P1-6 — Make consequential side effects durable

17 of 31 `logActivity(...)` call sites are fire-and-forget. Losing an activity entry may be
acceptable, but the code does not distinguish optional analytics from user-visible history.
Use a transactional outbox for activity/notification events that matter to teachers or
progression; name and document genuinely best-effort telemetry as such.

### P2-1 — Bound growing reads — **CLOSED (v0.31.0)**

All named offenders are fixed: `data-terminal/route.ts` caps experiments at 200,
`measurements/route.ts` caps at 2,000 per experiment and its POST now returns only the
created rows (`createManyAndReturn`) instead of echoing the full history, and the
`lib/teacher/auth.ts` class lookup is bounded.

Standing rule: not every `findMany` needs pagination — fixed vocabularies and rubric rows are
naturally bounded. Define limits in contracts, not ad hoc route constants.

### P2-2 — Standardize external-provider behavior — **CLOSED (v0.31.0)**

`lib/fetch-retry.ts` is the single provider primitive: a `Promise.race` timeout (an abort
alone does not interrupt a stalled OS-level connect), 429/5xx `retry-after` backoff capped at
two retries, an optional network-error retry for feeds, and normalized errors. Every discovery
adapter (`openalex`, `articles`, `patents`, `semanticscholar`, `medlineplus`) and the wiki
article route is a one-line binding supplying only its headers, timeout, and backoff base;
the six duplicated `sleep` definitions collapsed into the same module.

Still standing rule: never retry a non-idempotent provider write without an idempotency key.
Response-size caps remain per-adapter — add them to `fetchWithRetry` if a provider ever
returns unbounded bodies.

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
| `packages/shared-types` | Only if import analysis proves the web app is its sole consumer. (`src/pvp.ts` **was deleted in v0.31.0** — zero consumers, PvP unbuilt; the package still ships the enums the web app imports.) |

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

- `app/api/teacher/student/[id]/overview/route.ts`, `app/api/ops/codex/{complete,study-plan}/route.ts`,
  `app/api/research-plan/{review,idea-check}/route.ts`, `app/api/project-log/route.ts`:
  extract the workflow into a feature service (§3.2 E), following `lib/papers/service.ts`.
- `app/api/data-terminal/[id]/measurements/route.ts`: stop returning the full measurement
  history after every mutation.
- `lib/teacher/auth.ts`: add a bound to the class lookup.
- `app/api/papers/[id]/quiz/route.ts`, `app/api/onboarding/route.ts`,
  `app/api/teacher/roster/route.ts`: close the concrete tenancy/ADR-004 regressions in A2
  before further refactoring.
- `lib/papers/service.ts`, `app/api/project-log/attachment/route.ts`,
  `app/api/showcase/asset/route.ts`, `lib/uploads/assets.ts`: implement the recoverable upload
  state machine and atomic caps in A5/A12.
- `app/api/cron/notifications/route.ts`: replace the one-invocation pseudo-cursor with the
  durable, load-tested daily work contract in A4.
- `lib/rate-limit.ts`: add structured metrics; distinguish limiter-store failure from allowed
  requests.
- `components/settings/LabProfileSettings.tsx`, `components/ops/ExpertisePanel.tsx`,
  `components/fair/ScienceFairFeature.tsx`, `components/teacher/TeacherRoster.tsx`,
  `stores/discoveryStore.ts`, `lib/discovery/openalex.ts`: split per P2-4 **only when
  changing that feature**.
- `docs/ARCHITECTURE.md`: keep it describing what is implemented, never intentions.

### 6.5 Keep as-is or preserve conceptually

- `lib/buildings/service.ts`, `lib/papers/service.ts`, `lib/literature/quiz-retry.ts` — preserve
  their application-service boundaries while fixing the A5/A8 invariants.
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
