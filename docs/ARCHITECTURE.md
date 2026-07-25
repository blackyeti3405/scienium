# scienium Technical Architecture

> Last fact-checked against the repository: 2026-07-20
> Product behavior: [`SPEC.md`](SPEC.md)
> Setup and operations: [`SETUP.md`](SETUP.md)
> Security launch checklist: [`SECURITY.md`](SECURITY.md)
> Durable decisions: [`architecture/`](architecture/)

## 1. System Summary

scienium is a browser game for student science-fair teams. The lab scene is the
primary interface: gateway buildings open Discovery, Literature Review,
Operations Hub, Research Plan, Science Fair, PvP, and Showcase experiences.
Teachers use a separate class-scoped dashboard.

The deployed application is a single Next.js service:

```text
Browser
  |
  | Clerk session
  v
Next.js 15 App Router on Vercel
  |-- React server/client components
  |-- route handlers under app/api
  |-- Prisma application services
  |-- Anthropic, Firecrawl, and OpenAlex adapters
  |
  +--> Supabase PostgreSQL through Prisma
  +--> Cloudflare R2 private object storage
  +--> Upstash Redis REST (optional shared rate-limit counters)
  +--> Resend REST API (optional notification email)
```

There is no Python application service and no separate AI microservice. Python
under `art/` and `apps/web/scripts/` is build tooling only.

## 2. Runtime Stack

| Concern | Current implementation |
|---|---|
| Package management | pnpm workspace |
| Web framework | Next.js 15.5, App Router |
| UI runtime | React 19, TypeScript, Tailwind CSS |
| UI style | Custom pixel-art system and generated sprite assets |
| Authentication | Clerk middleware and server APIs |
| Database | Supabase PostgreSQL through Prisma 5, with pooled runtime URL and direct migration URL |
| Object storage | Cloudflare R2 through the AWS S3 SDK |
| AI | Anthropic SDK, constructed lazily in `lib/anthropic.ts` |
| External extraction | Firecrawl |
| Scholarly discovery | OpenAlex API (serves both arXiv-preprint and PubMed-indexed works; arXiv's Atom API and NCBI E-utilities are no longer called) plus keyless Semantic Scholar enrichment |
| Caching and throttling | In-process bounded LRU caches plus optional Upstash Redis REST for shared rate-limit counters |
| Rich text | TipTap with Markdown round-tripping |
| Markdown rendering | react-markdown and remark-gfm |
| Charts | Recharts plus authored chart-guide content |
| Client state | Local React state; Zustand only for Discovery tree interaction |
| Validation | Zod request schemas and selected response contracts |
| Unit tests | Vitest |
| Browser tests | Playwright with real Clerk sessions |
| Scheduled work | Vercel Cron |

TanStack Query, React Hook Form, Sentry, PostHog, and a Python AI service are not
part of the current implementation.

## 3. Repository Map

```text
scienium/
|-- AGENTS.md                     repository rules and required gates
|-- CLAUDE.md                     Claude Code project memory
|-- package.json                  workspace-level scripts
|-- pnpm-workspace.yaml           apps/* and packages/* workspace definition
|-- pnpm-lock.yaml                dependency lock
|-- .claude/PARALLELISM.md        worktree and test parallelism rules
|-- docs/
|   |-- README.md                 product and lab-interface introduction
|   |-- SPEC.md                   current product specification
|   |-- ARCHITECTURE.md           this document
|   |-- CHANGELOG.md              release history
|   |-- SETUP.md                  local, CI, E2E, and deployment setup
|   |-- SECURITY.md               pre-pilot security and privacy checklist
|   |-- TODO.md                   explicitly deferred work
|   |-- architecture/             architecture decision records and refactor plans
|   `-- reference/
|       `-- ISEF-2026.md          ISEF reference notes
|-- infra/
|   `-- docker-compose.yml        optional local PostgreSQL
|-- art/                          reproducible sprite-generation pipeline
|-- art_ref/                      visual references for sprite generation
|-- packages/
|   |-- config/                   shared ESLint and TypeScript configuration
|   `-- shared-types/             canonical cross-package contracts
`-- apps/
    `-- web/                      the Next.js application
```

### 3.1 Shared packages

`packages/shared-types/src/` contains:

- `enums.ts`: canonical lab types, project phase order, and shared enums.
- `index.ts`: package exports.

(The dead `paper.ts` contract module, which had zero consumers, was removed —
paper-processing shapes are validated by a local Zod schema in
`lib/literature/process-paper.ts`. `pvp.ts`, the raid/spell contract module,
was removed the same way — zero consumers, and PvP is unbuilt (§8.10). The
`SpellType` enum it re-exported remains only in `prisma/schema.prisma`, which
does not depend on this package.)

`packages/shared-types` must build before the web typecheck because the web app
imports its generated declarations.

`packages/config/` owns the base and Next.js TypeScript configurations and the
shared ESLint configuration.

### 3.2 Web application folders

```text
apps/web/
|-- app/                          App Router pages, layouts, and route handlers
|-- components/
|   |-- discovery/                discovery search/read/tree UI
|   |-- fair/                     fair matching, forms, categories, rubric UI
|   |-- lab/                      lab scene, plot, shop, panels, sprites
|   |-- literature/               paper list, upload, quiz, chat, citation UI
|   |-- ops/                      Codex, logs, expertise, data, Vega study
|   |-- research-plan/            plan synchronization and review UI
|   |-- settings/                 team/profile settings
|   |-- showcase/                 showcase editor, print, abstract guide
|   |-- teacher/                  roster, student detail, reports, queues
|   `-- ui/                       shared pixel primitives and skeletons
|-- content/
|   |-- data-terminal/            authored guides as *.json + thin typed wrappers
|   `-- fairs/                    affiliated-fair dataset.json + typed wrapper
|-- lib/                          domain, server, integration, and utility modules
|-- prisma/
|   |-- schema.prisma             database schema
|   |-- migrations/               ordered production migrations
|   `-- seed-e2e.mjs              idempotent E2E fixture graph
|-- public/sprites/               generated runtime sprite assets
|-- stores/discoveryStore.ts      Discovery's client interaction store
|-- e2e/                          Playwright setup, roles, and feature specs
|-- test/                         cross-feature unit tests
|-- scripts/                      data/sprite/upload maintenance scripts
|-- middleware.ts                 Clerk route protection
|-- next.config.mjs               images and server external packages
|-- playwright.config.ts          authenticated browser-test configuration
|-- vitest.config.ts              pure unit-test configuration
`-- vercel.json                   scheduled paper and notification jobs
```

### 3.3 Component inventory

The component folders are feature-owned. Phase 3 of the refactor (changelog
`0.23.5`) split the large feature shells into a thin container plus a feature
folder of subcomponents and a `use<Feature>` hook, following the
`components/literature/` model. Network calls route through
`lib/api/client.ts` (`requestJson`) except where a call needs FormData,
streaming, `keepalive`, or tolerant error handling.

- `components/auth/`: `ClerkAuthShell` — the loading-skeleton + widget wrapper
  shared by the sign-in and sign-up pages.
- `components/discovery/`: thin `DiscoveryFeature` container plus
  `DiscoveryHeader`, `FinalTopicBar`, `ExplorerSidePanel`, `ExplorerReaderPane`,
  `DiscoveryHomeScreen`, `DiscoveryModals`, deduped `BranchSelectionPanel`,
  `DiscoveryHome`, `DiscoveryTopicList`, `DiscoveryTree`, `InterestSeeds`,
  `PapersSearch`, `SourceReader`, `ArticlesBrowse`, `ArticleReader`,
  `TopicSearch`, `WikiReader`, `YouTubeViewer`, `TopicConfirmModals` (the
  topic-change and topic-removal confirm modals, shared with
  `components/settings/LabProfileSettings` — both drive the same
  `useFinalTopic`-shaped state), and `hooks/` (`useFinalTopic`,
  `useTeamInterests`, `useSourceLanes`).
- `components/fair/`: `ScienceFairFeature`, `CategoryBrowser`,
  `FormsChecklist`, and `RubricSelfCheck`.
- `components/lab/`: `LabScene` (composition), `LabPlot`, `ShopPanel`,
  `StatusStrip`, `Sprite`, `TileBackground`, `DecorationLayer`, `FeaturePanel`,
  `TeamPanel`, `SettingsPanel` integration, `ActivityPanel`, `FeedbackPanel`,
  `NotificationBell`, `MomentumCard`, `PhaseAdvance`, `RequestAdvance`,
  `BuildingMenu`, `UpgradeBurst`, `DevFillButton`, the `labCurrency.tsx`
  client currency provider (moved here from `lib/`), and the intentional PvP
  `StubFeature`. The plot place/move/sell/upgrade optimistic state machine lives
  in `lib/hooks/usePlotBuildings.ts`.
- `components/literature/`: thin `LiteratureFeature` plus `PaperSlot`,
  `UploadSourceButton`, `QAPanel`, `QuizPanel`, `PaperChat`, `CitationsPanel`,
  `CredibilityBadge`, `VettingChecklist`, `ResearchGuidePanel`, the three new
  learning-tool panels `ExplainPanel`, `SynthesisPanel` (+ `SynthesisMatrixEditor`),
  and `VocabPanel`, feature hooks (`usePapers`, `usePaperChat`, `usePaperQuiz`,
  `useExplainBack`, `useSynthesisMatrix`, `useVocabDeck`), types, and API
  contracts (`api.ts`, `synthesisApi.ts`, `vocab-api.ts`).
- `components/ops/`: thin `OperationsHubFeature` tab switch plus `ProjectLogTab`
  (+ `project-log/` subcomponents and `useProjectLog`), `FailureLogTab`
  (+ `failure-log/` and `useFailureLog`), `DataTerminalTab` (+ `data-terminal/`
  views and `useExperiments`), `CodexTab`, `ExpertisePanel`, `VegaStudyTab`,
  `RichEditor`, `log-shared`, five guide panels, and shared guide chrome
  (`guide-chrome.tsx` also hosts the shared `useCopyToClipboard` hook).
- `components/research-plan/`: thin `ResearchPlanFeature` plus `useResearchPlan`
  and the shared `PlanReviewView`/`IdeaCheckView` (consumed by both the student
  feature and the teacher student-detail sections).
- `components/settings/`: `SettingsPanel` and `LabProfileSettings`.
- `components/showcase/`: thin `ShowcaseEditor` plus `useShowcaseEditor`,
  `editor/` subcomponents, `PrintButton`, and `AbstractGuidePanel`.
- `components/teacher/`: `TeacherRoster`, thin `StudentDetail` plus
  `student-detail/` (`StudentHeader`, `sections/*`, `types`, `shared`,
  `useStudentOverview`, `PaperQAPanel`), `TeacherReports` (+ `next/dynamic`
  `ReportBarChart`), `TeacherRubricScoring`, `ShowcaseModerationQueue`,
  `DecisionControls`, and `TeacherPanelState` (the shared loading-skeleton/
  load-error blocks `TeacherReports` and `TeacherRoster` both render from).
- `components/ui/`: `BusyButton`, `Card`, `ConfirmDialog`, `LabeledLoader`,
  `PixelProgressBar`, `PixelSkeleton`, `PixelSpinner`, `SectionTabs`, the shared
  `Toast`, `EmptyState`, and `RouteError` primitives (Phase 0),
  `ModalBackdrop` + `useModalA11y` (the focus-trap/restore/Escape/scroll-lock
  dialog shell behind every panel), `ChatThread` (the message-list + composer
  shared by Literature's `PaperChat` and the Vega study tab), and
  feature/route skeletons.

## 4. App Router

### 4.1 Route groups and pages

`app/layout.tsx` configures fonts and global providers. `app/page.tsx` is the
public entry page.

`app/(auth)/` contains Clerk sign-in and sign-up pages.

`app/(onboarding)/onboarding/page.tsx` creates or joins a lab, records the
student's school, and — when a class code is entered — files a pending
class-join request the teacher must approve (it does not enrol directly). The
teacher's decision runs through `decideClassJoin` in `lib/onboarding/profile.ts`:
one compare-and-set on `status: 'pending'` under a per-student lock, returning the
committed outcome so a second decision cannot silently no-op or contradict the
first. A replaced approval is marked `superseded`, never `denied`.

`app/game/page.tsx` is the authenticated role router: teachers go to `/teacher`
and students go to `/lab`. The legacy `/dashboard` page redirects to `/lab`.

`app/(dashboard)/layout.tsx` resolves the signed-in user's active team. Teamless
teachers go to `/teacher`; teamless students go to `/onboarding`.

Authenticated student pages:

| Route | Surface |
|---|---|
| `/lab` | Server-loaded spatial lab and gateway shell |
| `/discovery` | Discovery deep link |
| `/literature/library`, `/literature/review` | Literature feature |
| `/daily/codex` | Field Codex |
| `/daily/expertise` | Proof of Expertise |
| `/daily/log`, `/daily/failure` | Operations Hub on the requested tab |
| `/research-plan` | Research Plan feature |
| `/fair-hub/calendar` | Science Fair feature |
| `/fair-hub/rubric` | Rubric self-check |
| `/showcase/edit` | Showcase editor |
| `/pvp/*` | Incomplete PvP placeholders; raid API remains unimplemented |

`app/(teacher)/layout.tsx` enforces teacher/admin access. Teacher pages are the
roster, reports, showcase moderation, and student detail views.

`app/(public)/showcase/` contains the public gallery and privacy-checked showcase
page. Public asset bytes are served by `/api/showcase/public/asset`.

### 4.2 Middleware

`middleware.ts` runs Clerk middleware on application and API routes. Public
exceptions are:

- `/`, sign-in, and sign-up.
- public showcase pages and public showcase asset streaming.
- `/api/cron/*`, which uses `CRON_SECRET` instead of a Clerk session.

Static files and Next.js internals are excluded by the matcher.

### 4.3 Route-file index

Every authored App Router file belongs to one of these surfaces:

- Root: `app/layout.tsx`, `app/page.tsx`, `app/game/page.tsx`,
  `app/globals.css`, and `app/(dashboard)/dashboard/page.tsx`.
- Auth/onboarding: `(auth)/layout.tsx`, Clerk catch-all sign-in/sign-up pages,
  `(onboarding)/layout.tsx`, and `(onboarding)/onboarding/page.tsx`.
- Student dashboard: `(dashboard)/layout.tsx`; lab; discovery; daily Codex,
  expertise, failure, and log; literature library/review; research plan; fair
  calendar/rubric; showcase edit; and PvP lobby, team builder, leaderboard, and
  battle detail pages.
- Teacher: `(teacher)/layout.tsx`; roster home; reports; showcase
  moderation; and student detail.
- Public: `(public)/layout.tsx`; showcase gallery and showcase-by-slug.

Loading behavior is centralized in the shared skeleton components rather than
duplicated route-local loading files. Each route group has an `error.tsx`
boundary (`(dashboard)`, `(teacher)`, `(onboarding)`, `(public)`, `(auth)`)
rendering the shared `components/ui/RouteError` reset UI, so one bad payload
can't dead-end a student on Next's blank error screen. There are no server
actions; writes use route handlers.

## 5. API Architecture

### 5.1 Request guards

`lib/api/route-context.ts` is the standard student/team guard:

1. Resolve the Clerk identity.
2. Apply the selected rate-limit tier.
3. Resolve the database user and explicit `activeTeam` through the
   `User.activeTeamId` relation.
4. Fall back to the most recently joined membership when `activeTeamId` is
   unset.
5. Optionally enforce a phase feature gate.

It returns Clerk user ID, database user ID, team ID, phase, and lab type. The
team is resolved through membership by `pickActiveTeam` (`lib/team/active-team.ts`):
a stored `User.activeTeamId` is honored only when a `TeamMember` row still backs
it, so a stale or forged `activeTeamId` can never surface another team's data.
`getTeamContext` (dashboard layout) and the server-rendered lab page use the same
helper.

For mutating methods (`POST`/`PATCH`/`DELETE`), all three guards also call
`assertSameOrigin` (CSRF discipline): a present `Origin` header must match the
request host, since Clerk sessions ride on cookies and "the browser has a
session" is not "the user intended this write." Origin-less non-browser clients
and reads pass through.

`lib/api/with-route.ts` provides `withTeamRoute({ tier, feature, body }, handler)` —
a wrapper that composes `requireTeamContext` + `parseJson` and maps a thrown
`ApiError` to a response, so a mutating route becomes
`export const POST = withTeamRoute(..., async ({ ctx, data }) => …)` instead of
copying the four-line guard prelude. It is additive (`requireTeamContext` is
unchanged); the `buildings/*` routes are the adopted exemplar and other routes
migrate incrementally.

`requireUserContext(req, { tier })` (also in `route-context.ts`) is the sibling
guard for routes that legitimately run *before* a team exists (onboarding, join
flows) or only need a rate-limited identity (the discovery proxies). It returns
`{ userId }` and applies the same CSRF check.

**Route adapter / application service seam.** Every workflow route with real
authorization, a transaction, concurrency, a provider call, or prompt
construction follows one shape: the route file selects the policy, parses the
body with Zod, calls ONE application-service function, and maps the typed
result to HTTP — it contains no direct `db.` calls of its own. Nine modules
currently own this seam: the three original exemplars (`lib/buildings/service.ts`,
`lib/papers/service.ts`, `lib/literature/quiz-retry.ts` — whose `submitRetry`
elects one grader via `retryGradeClaimedAt` before the paid call and writes the
session monotonically, so a late low-scoring retry cannot un-pass it) plus the six extracted
in the Track B P1-2 sweep — `lib/teacher/student-overview.ts`,
`lib/logs/project-log-service.ts`, `lib/ops/codex/complete-service.ts`,
`lib/ops/codex/study-plan-service.ts`, `lib/research-plan/review-service.ts`,
and `lib/research-plan/idea-check-service.ts`. The two streaming services
return a typed `{ ok: true; kind: 'replay' | 'stream'; ... }` result so the
route only wraps it in a `Response`; the NDJSON framing itself is
`lib/ndjson.ts`'s `createNdjsonStream`, shared by both.

The remaining simple routes — a scoped read or a single-table write behind a
guard, with no transaction, concurrency, or provider call to isolate —
deliberately stay direct-Prisma; extraction would only add an indirection.
These ~90 handlers migrate onto the seam when a change to that route already
touches it, not as a standalone batch — do not "fix" them as cleanup.

`lib/teacher/auth.ts` is the teacher guard. It validates teacher/admin role and
loads the classes the teacher owns. The DB `User.role` is authoritative whenever
a row exists (`resolveAuthoritativeRole`, `lib/teacher/role.ts`), so a stale
Clerk claim can never override a DB downgrade; the claim only bootstraps an
account with no row. `teacherOwnsTeam(classIds, teamId)` is **membership-based**:
a teacher owns a team when at least one of its members is in one of the teacher's
classes (`members: { some: { user: { classId: { in } } } }`). This is what lets
both teachers of a cross-school lab see its shared artifacts; a single
`Team.classId` is no longer read for ownership (it is vestigial — see §6).
Individual-student privacy is preserved separately: the `student/[id]…` routes
gate on the target student's own `classId ∈ classIds`, so a teammate's teacher
cannot open another teacher's student's personal page.

`lib/cron/auth.ts` validates `Authorization: Bearer <CRON_SECRET>` with a
constant-time `crypto.timingSafeEqual` compare and refuses sub-32-char secrets
in production. A static test asserts every `app/api/cron/**` route calls it.

`lib/validation.ts` parses bounded JSON bodies using strict Zod schemas and
exports the shared field helpers `boundedText`, `optionalBoundedText`, `cuid`,
and `httpUrl` so length/ID/URL caps stay consistent across routes.
`lib/api/client.ts` provides consistent client-side JSON errors and runtime
response validation where a feature contract has been defined.

A compiler-enforced server/client boundary backs all of this: the `server-only`
package is imported by every module that reaches Prisma or a secret, so a client
import fails `next build` instead of silently bundling secrets. Unit tests alias
`server-only` to an inert stub (`test/stubs/server-only.ts`).

### 5.2 Caching and rate limiting

`lib/rate-limit.ts` defines `read`, `mutate`, `join`, `upload`, and `ai` tiers.
Each authenticated request is counted per user and against a larger shared-IP
backstop. The default store is process memory. When both Upstash variables are
configured, counters use Redis REST and work across server instances. A Redis
outage fails open (logged). The **paid** tiers (`ai`, `upload`) instead fail
**closed** (503) in production when no shared store is configured, rather than
silently letting the per-student LLM cost cap become `limit × instances`;
`RATE_LIMIT_ALLOW_MEMORY=1` opts out on a single long-lived Node server.

**Paid-work invariant**: every route that can reach an Anthropic call —
directly or through a lib importing `lib/anthropic.ts` — must clear a paid tier
(`ai`/`upload`), an explicit `enforceRateLimit(req, 'ai', …)` before the paid
call (used where a `mutate` route has one paid branch, e.g. phase advance,
discovery promote, topic wipe), or `assertCron`. The static sweep
`test/paid-work-guard.test.ts` enforces this in CI, and the shared client in
`lib/anthropic.ts` logs every call/stream as a structured `llm.call`/
`llm.stream` event (model, duration, token usage — never prompt content; see
`lib/observability/log.ts` and `docs/runbooks/llm-cost.md`).

`lib/lru.ts` provides bounded in-process TTL/LRU caching for cheap read-through
caches such as the Wikipedia article proxy. These caches are intentionally
best-effort and per-instance. Durable data and user-visible state live in
PostgreSQL; Redis is not currently a general application state store.

**Error tracking (Sentry).** `@sentry/nextjs` covers all three runtimes:
`instrumentation.ts` dispatches the node/edge init and exports
`onRequestError`, which captures every unhandled route, server-component, and
server-action error without per-route code; `instrumentation-client.ts` covers
the browser; `app/global-error.tsx` catches root-layout render errors.
`withSentryConfig` wraps `next.config.mjs` and serves browser events through a
same-origin `/monitoring` tunnel (ad-blocker resistant; keeps CSP `connect-src`
at `'self'`). Privacy posture is deliberate and commented in each config: no
Session Replay, no `dataCollection` object (the SDK's conservative no-PII
default), no `includeLocalVariables`, and the SDK is `enabled` only when a DSN
is present, so dev-without-DSN and E2E runs are no-ops. This is the alerting
layer *on top of* the structured logs in `lib/observability/log.ts`, not a
replacement — the logger remains the seam application code writes through.

**Security headers.** `next.config.mjs` sends a catch-all header block (CSP,
HSTS in production, `X-Frame-Options`, nosniff, Referrer-Policy,
Permissions-Policy, COOP). `test/security-headers.test.ts` asserts the
lockdowns in both environments so a config refactor can't silently drop one.

Anthropic prompt caching is used deliberately on the paper-backed routes: the
paper text is composed as the **first**, byte-identical system block (via the
shared `paperTextBlock` helper) so its cache prefix is reused across
chat → quiz → grade → retry, and paper/Vega chat mark the newest history turns
with an ephemeral `cache_control` breakpoint to avoid re-billing prior turns.
This is the PERF-8 invariant, and it now extends to Explain-it-back
(`api/papers/[id]/explain`): its grading call composes the SAME
`paperTextBlock(paper.fullText)` as the first system block, so it lands on the
identical ~30k-token cache prefix rather than opening a new one. The Synthesis
Matrix check (`api/literature/synthesis/[id]/check`) deliberately does the
opposite: it reads paper *abstracts* (or a short `fullText` head), never
imports `paperTextBlock`/`paperTextContext`, and caches its `<sources>` block
on its own, separate prefix — keeping the single-paper PERF-8 prefix clean and
the multi-paper comparison cheap instead of mixing the two.

### 5.3 API route inventory

- `api/buildings/`: read plot/shop state; place/purchase, move, sell, upgrade
  (the mutating routes are the `withTeamRoute` exemplar).
- `api/citations/`: list citations and export formatted bibliographies.
- `api/class/join`: file a pending request to join the caller's teacher class
  (per-student — approval is a teacher action; see `api/teacher/class`).
- `api/cron/notifications`: fair-deadline/project-urgency notifications, run
  across a 15-minute-interval morning window rather than once daily (§12).
- `api/cron/papers`: retry pending, failed, or stale paper jobs.
- `api/data-terminal/`: experiment CRUD; the list returns measurement counts and
  `[id]/measurements` GET lazy-loads one experiment's points on selection.
- `api/dev/`: development-only backfill and paper-fill helpers.
- `api/discovery/`: Wikipedia search/article, interests, topic, tree CRUD,
  YouTube resolution, scholarly search/resolve/citations/reflection, article
  feed browse/resolve, and source promotion.
- `api/expertise/`: create and grade Proof of Expertise exams.
- `api/failure-log/`: failure CRUD and AI follow-up.
- `api/fairs/`: fair matching, forms, form status, and deadline synchronization.
- `api/literature/synthesis/`: Synthesis Matrix create/read/cell-edit and the
  Vega comparison check.
- `api/literature/vocab/`: build a student's deck from their team's ready
  papers, list the deck, and grade one due review (zero LLM).
- `api/notifications/`: notification list/read state and preferences.
- `api/onboarding/`: student/team onboarding and teacher onboarding.
- `api/ops/codex/`: progress, completion, and study-plan generation.
- `api/ops/vega-study`: persistent project-grounded team chat.
- `api/papers/`: upload/list/delete/file, chat, quiz, grade, targeted retry, and
  Explain-it-back grading.
- `api/project-log/`: log CRUD, references, attachment upload and viewing.
- `api/pvp`: guarded 501 placeholder for the unbuilt raid system.
- `api/research-plan/`: source synchronization, originality check, and review
  (a review of unchanged plan text replays the persisted result — no LLM spend).
- `api/rubric/self-assessment`: team rubric read/write.
- `api/settings`: team/profile settings.
- `api/showcase/`: showcase CRUD, asset upload/link/delete, public streaming.
- `api/teacher/`: class create + `class/requests/[id]` approve/deny +
  `class/[id]/code` regeneration; roster, reports, feedback, nudge, rubric,
  moderation, student overview, and teacher paper/Q&A access.
- `api/team/`: active team, activity, feedback, invite/join, location, momentum,
  and phase advancement.

Each leaf under `app/api/` is a `route.ts`; there is no parallel controller
layer. Route handlers should remain thin and move reusable policy or integration
work into `lib/`.

### 5.4 Server module index

Top-level infrastructure and policy files:

- `activity/log.ts`: durable activity feed writes.
- `anthropic.ts`, `env.ts`: lazy AI client and environment access.
- `api/client.ts`, `api/route-context.ts`, `api/with-route.ts`: browser response
  decoding, the authenticated team/user route context + CSRF guard, and the
  `withTeamRoute` handler wrapper.
- `chat/thread.ts`: server-owned chat-turn machinery (bounded history,
  leading-assistant trim, two-turn `cache_control` breakpoints, and the
  pending→complete transaction) shared by paper chat and the Vega study
  thread; each route still owns its own Prisma model, scope, and Anthropic
  call.
- `date.ts`: `todayUtc` — the UTC-midnight day key shared by every daily cap
  (Codex, Lab-Credit award, study-plan re-run).
- `db.ts`, `db-lock.ts`: Prisma singleton and PostgreSQL advisory locks.
- `api/destructive-proposal.ts`: server-owned confirmations for destructive
  commands. A `DestructiveProposal` binds actor, team, command, the exact target
  payload (SHA-256 digest), and a 10-minute expiry; consuming it is a single-use
  compare-and-set. Topic-change paper removal and the discovery tree reset both
  go through it, so a client-sent boolean can no longer authorize a delete.
- `economy.ts`, `shop.ts`, `plot.ts`, `phase.ts`, `showcase.ts`: pure domain
  policy.
- `fetch-retry.ts`: `fetchWithRetry` — 429/5xx retry-after backoff bounded by a
  `Promise.race` timeout (aborting a stalled OS-level connect doesn't reliably
  unblock it) — plus the one shared `sleep`, replacing five copy-pasted
  discovery-adapter retry loops.
- `shop-server.ts`, `plot-server.ts`, `showcase-server.ts` (+
  `resolveShowcaseViewer` — the signed-in viewer's team/school context, plus the
  teams they teach, for a showcase privacy check; and
  `showcaseContentDigest`/`syncShowcaseRevision`/`requiresReview`, which bind
  moderation approval to a specific content revision; and `makeShareToken`, the
  128-bit `link_only` bearer secret that `makeSlug`'s public identifier is
  explicitly not): database-backed loaders.
- `featureRegistry.tsx`, `gateways.ts`: lab feature wiring. (The client currency
  provider moved to `components/lab/labCurrency.tsx`.)
- `lru.ts`, `rate-limit.ts`, `storage.ts`, `uploadWithProgress.ts`,
  `validation.ts`, `ndjson.ts`, and `format.ts`: bounded cache, throttling, R2,
  upload, request parsing + shared field schemas, NDJSON stream read/write
  (`readNdjson` and `createNdjsonStream`, the latter now also backing the
  research-plan streaming services below), and date formatting. (Dead
  `wikipedia.ts` was deleted — the live Wikipedia path is the discovery
  article route.)

Feature-owned library folders:

- `buildings/`: plot economy orchestration (`service.ts`) — the place/move/sell/
  upgrade business rules, per-team `team-plot:<teamId>` advisory lock, in-lock
  occupancy re-checks, and race-safe currency debits, lifted out of the route
  handlers so they are unit-testable without a request.
- `clearance/`: expertise context, rubric, authored rubric prompt, and scoring.
- `cron/`: cron bearer authentication.
- `uploads/`: uploaded-asset lifecycle (`assets.ts`) — `reserveUploadAsset`
  commits a `temporary` `UploadedAsset` ledger row, under a per-team advisory
  lock that atomically checks the storage-quota ceiling, BEFORE any byte
  reaches R2; the row then moves through attached → orphaned → deleted, with a
  single claim-then-delete reclaim sweep as the only physical-delete site, and
  `orphanObjectKey` adopts a legacy object only on a verified Prisma `P2002`
  race.
- `data-terminal/`: CSV utilities, chart-guide index, pure PNG/CSV `export.ts`,
  tests, and one chart module per scientific field under `charts/`.
- `discovery/`: OpenAlex (`openalex.ts` — the sole live scholarly-search/
  citation adapter; serves both arXiv-preprint and PubMed-indexed works via
  `works/arxiv:<id>` / `works/pmid:<id>`, so the standalone `ncbi.ts`
  E-utilities adapter was deleted as dead code and `arxiv.ts` is reduced to
  `normalizeArxivId`, the id-normalization helper OpenAlex and Semantic
  Scholar both consume), Semantic Scholar (`semanticscholar.ts` — keyless
  TL;DR + influential-citation ordering, cache+timeout+degrade, optional
  `S2_API_KEY`), credibility, sanitization, source normalization, interest-tier
  display metadata (`interest.ts` — the color/shape/glyph cycle shared by
  `DiscoveryTree`'s SVG swatch and `DiscoveryTopicList`'s plain glyph),
  interest matching (`interest-match.ts`), KP award policy, the route-side
  `tree-service.ts` (node creation + tree hydration; `assertValidTreeGraph`
  proves the proposed batch is a same-team acyclic forest before any write —
  parents must be null, an existing same-team node, or in the same batch), and the client-safe
  `treeApi.ts` persistence wrappers used by the Discovery store. `articles.ts`
  is a parallel, unified RSS/Atom adapter for the `article` source type (The
  Conversation + science-journalism feeds); see §8.1.
- `economy/`: `lab-credit.ts` — the daily Lab-Credit award for filing a
  project or failure log, consolidated out of both log routes; only a
  verified Prisma `P2002` on the `LabCreditClaim` unique reads as "already
  paid" — every other failure retries once, emits a redacted event, and
  reports `failed` instead of silently dropping the reward.
- `fairs/`: abstract guidance, categories, forms (client-safe versioned
  `ISEF_EDITION` catalog in `forms.ts` — official codes/titles only, with
  applicability and timing fail-closed behind a `reviewedBy` sign-off gate; DB
  seeder split into `server-only` `forms-server.ts`, which keys on code
  coverage so a same-size edition change is not suppressed), rubric
  anchors/scoring, safety, ZIP lookup, and matching.
- `guides/` and `hooks/`: guide filtering; reusable client hooks
  (`useToggleSet`, `useAutoDismiss`, `useResizablePanel`, `usePlotBuildings`,
  `useElementSize` — measures a container via `ResizeObserver`, shared by
  `DecorationLayer`, `LabPlot`, and `TileBackground`).
- `lab/`: `decoration.ts` — pure, unit-tested slot→sprite placement math for the
  lab's nature-scatter layer, extracted from `DecorationLayer` (see §7).
- `lab-type/`: Anthropic-backed lab classification.
- `logs/`: `project-log-service.ts` — the application service behind
  `/api/project-log`: cursor-paginated read (newest 30, windowed entry
  numbering) and the roster-checked attendee/attachment write, including the
  daily Lab-Credit award via `lib/economy/lab-credit.ts`.
- `literature/`: citation (`citation.ts` wraps the plain-JS
  `citation-core.mjs` — the pure APA/MLA/IEEE formatting algorithm, kept
  `.mjs` so both the Next/TS build and the bare-`node` dev seeder
  (`scripts/seed-real-lit.mjs`) import the identical logic without a second
  copy), quiz, relevance, research-guide, the shared
  `grading.ts` (the grading Anthropic call + JSON extraction + `paperTextBlock`
  helper reused by quiz grade/retry, expertise grade, and Explain-it-back), and
  durable paper processing (metadata extraction on Haiku). Three newer, feature-
  owned modules: `explain.ts` (Explain-it-back verdict schema/prompt, graded
  against the paper on the PERF-8 cache prefix); `synthesis.ts` (Synthesis
  Matrix column templates, verdict schema, and its own separate cache-prefix
  builder — deliberately not sharing `paperTextBlock`); and the zero-LLM pair
  `vocab.ts` (extractive term detection — Schwartz-Hearst acronym pairing,
  authored-dictionary hits, repeated-ngram fallback — every definition grounded
  in either the dictionary or a verbatim paper quote, enforced by a unit test)
  and `srs.ts` (pure Leitner scheduling; no Anthropic dependency in either
  module).
- `notifications/`: notification computation and optional Resend delivery.
- `onboarding/`: Clerk-profile normalization and per-student class-join request
  filing/approval (`applySchoolAndClass`, `requestClassJoin`, `approveClassJoin`).
- `ops/`: failure follow-up and Vega context, `complete-service.ts` (the
  Codex application service — server-authoritative progression gate,
  checkpoint re-grading against the real answer key, once-ever KP claim, and
  atomic daily-lesson cap), `study-plan-service.ts` (sourceHash-cached
  generation with a re-run cap enforced by one atomic guarded
  `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING` executed BEFORE
  the paid Haiku call), plus the Codex engine, schemas, source corpus,
  generated wrappers, checksums, build script, and tests.
- `pdf/`: `sanitize.ts` — active-content inspection (rejects JS/launch/embedded/
  XFA/encrypted/page-bomb PDFs) run before an upload is stored or parsed.
- `research-plan/`: Google Doc extraction, types, authored science/engineering
  rubrics, `require-plan-text.ts` (the shared "team must have synced plan
  text" guard both workflows below share), `review-service.ts` (the
  rubric-critique application service — streams the model's JSON-Lines output
  as NDJSON via `lib/ndjson.ts::createNdjsonStream`; a sha256-matched
  unchanged-plan review replays the persisted result), and
  `idea-check-service.ts` (the novelty-check application service, also NDJSON-
  streamed).
- `sprites/`: runtime manifest, generated anchors, and manifest test.
- `teacher/`: role and membership-based class/team authorization
  (`auth.ts`), `student-overview.ts` (the application service behind the
  347-line-route-turned-27-line-adapter student drill-down — class-scope
  authorization lives here with the workflow), plus pure report analytics
  (`analytics.ts`, no DB). Teacher role is read from the DB (`role.ts`), not
  inferred from owning a class.
- `team/`: self-serve phase advancement, membership-verified active-team resolution
  (`active-team.ts` confirms the caller is a member of the requested `activeTeamId`
  before trusting it), and invites.

## 6. Identity, Schools, Classes, and Teams

Class membership is **per-student**: a student belongs to one class
(`User.classId`), and a lab is simply the set of its members — it may span
multiple classes and schools, each member in their own teacher's class. The
ownership chain is:

```text
School
  `-- Class (teacherId)
       `-- User (classId)          <- membership is per-student
       `-- ClassJoinRequest (pending | approved | denied)

Team
  `-- TeamMember (userId, role)    <- a lab spans its members' classes
```

Important invariants:

- Clerk owns authentication; `User.clerkUserId` links the local row.
- `User.activeTeamId` selects the team used by student routes, but a request-supplied
  `activeTeamId` is trusted only after `lib/team/active-team.ts` confirms the caller
  actually belongs to that team — an unverified team id never widens access.
- Teacher authority is read from `User.role` in the DB (`lib/teacher/role.ts`); it is
  no longer inferred from owning a class. A teacher's scope over a **team's shared
  work** is membership-based (`teacherOwnsTeam`): they own a team if they own ≥1
  member, so both teachers of a cross-school lab see its papers/plan/rubric/
  showcase. A student's **individual** pages are gated separately on that student's
  own `classId`, so a teammate's teacher can't open them.
- **Joining a class is a request, not an enrolment.** Entering a class code files
  a `ClassJoinRequest`; the owning teacher approves or denies it. Approval enrols
  **only that student** (sets their `classId` + school) — it never pulls their lab
  in or overwrites teammates. Class codes are teacher-**regenerable**
  (`api/teacher/class/[id]/code`), which revokes a leaked code.
- `Team.classId` is **vestigial** under per-student membership — new teams leave it
  null and nothing authorises on it. The column remains only to avoid a destructive
  migration; roster and report aggregates resolve a student's team via membership.
- `Team.teamLeadId` is a real user foreign key and is mirrored by a lead
  `TeamMember`.
- Team queries and mutations are scoped by the guarded `teamId`.

Onboarding currently creates new teams directly in `literature_review`.
Discovery still exists as an optional earlier experience, and the complete phase
enum remains:

```text
discovery -> lab_selection -> literature_review
          -> research_planning -> working -> showcase
```

Phase policy and presentation metadata live in `lib/phase.ts`; canonical phase
and lab-type values live in `packages/shared-types`.

Phase advancement is **self-paced**: teams advance themselves through the phase
sequence once they meet each phase's completion criteria (choose a final topic →
literature review; all 25 sources proficient → the rest of the lab). The former
teacher-validation gate and its `PhaseAdvanceRequest` model were removed — there is
no teacher approval step in progression.

## 7. Lab Scene and Building Economy

`app/(dashboard)/lab/page.tsx` server-loads team, currency, members, placed
economy buildings, gateway overrides, phase progress, and the requested panel.

`LabScene` owns transient scene interaction:

- gateway/feature panels;
- shop, settings, team, activity, feedback, and momentum panels;
- placed economy and gateway mirrors;
- arrange mode, cursor ghost, selected building, and busy states;
- live currency reconciliation through `components/lab/labCurrency.tsx`.

`LabPlot` owns isometric input and rendering. Grid math is shared with the server
through `lib/plot.ts`. Sprite lookup is centralized in
`lib/sprites/manifest.ts`; generated anchors live in
`lib/sprites/anchors.generated.ts`. The nature-scatter background layer
(`DecorationLayer`) follows the same shape: its slot→sprite placement math
(seeded hash → weighted sprite pick → jittered anchor) was extracted into the
pure, React/DB-free `lib/lab/decoration.ts` and unit-tested — a regression guard
for a signed-shift bug where `>>` on hashes ≥2³¹ went negative and crashed the
lab page for ~37% of slots; `hash()`'s bit-extractions now use unsigned `>>>`
throughout.

Building pickup is local and begins on pointer-down. Placement, movement, and
upgrades use optimistic rendering:

1. Validate the target against the client occupancy map.
2. Update the building/currency immediately.
3. Send the authoritative mutation in the background.
4. Reconcile absolute balances and server-calculated values on success.
5. Roll back immediately and refresh `/api/buildings` if the mutation fails or
   its response is lost.

Server mutation race-safety is uniform across the four plot routes. The
place/move/sell/upgrade business rules live in one module, `lib/buildings/service.ts`;
each route handler is a thin wrapper (parse → resolve context → call the service →
map its result to a response). Every mutation runs inside a transaction, takes the
per-team `team-plot:<teamId>` advisory lock (`lib/db-lock.ts`), and re-checks
committed occupancy inside the lock, so two concurrent edits can't collide on a cell
or overspend. Placement remains split across `TeamShopBuilding.posX/posY` and
`TeamGatewayPlacement.posX/posY`; a single unifying `TeamPlotPlacement` table was
scoped but deferred once the lock made the current split race-safe.

`lib/shop.ts` is the catalog and tier ladder. `lib/economy.ts` contains pure
cost, reward, retry-score, refund, and purchase policy. `lib/shop-server.ts` and
`lib/plot-server.ts` load database-backed state.

## 8. Feature Workflows

### 8.1 Discovery

Discovery supports Wikipedia, YouTube, arXiv/PubMed/PMC sources, science-article
RSS feeds, interest seeds, multiple trees, citations, reflections, starring, and
topic locking.

`stores/discoveryStore.ts` owns cursor/tree interaction but the database remains
authoritative. Mutations update optimistically; failed HTTP responses trigger a
rehydration instead of leaving unsaved local state. External scholarly metadata
is fetched through OpenAlex, sanitized, and cached in `ExternalWork`. Citation
traversal uses factual edges, not algorithmic related-work recommendations.

The citations route (`api/discovery/sources/[id]/citations`) is now
backend-uniform: PubMed sources resolve through a new OpenAlex adapter path
(`resolvePubmedWork`, `works/pmid:<id>`) and traverse the SAME
`getReferences`/`getCitedBy` neighbour functions arXiv sources use, replacing a
separate NCBI ELink/ESummary path. Both platforms are then enriched by the
keyless Semantic Scholar adapter (`lib/discovery/semanticscholar.ts`): a TL;DR
(S2's own extractive summary — no LLM call on our side) and an
influential-citation reorder that stably pulls `isInfluential` citing papers to
the front of the Cited-by lane. S2 enrichment runs independently of the
OpenAlex lane fetch (its own `try`/degrade path) so an S2 outage never blocks
or is blocked by the rest of the route, and it hard-caches with no
retry/backoff — a throttled shared pool must never stall the reader.

Student-facing, that enrichment is two things in `components/discovery/SourceReader.tsx`
(rendered inside `ExplorerReaderPane`): a TL;DR card above the abstract when S2
returns one, and the Cited-by lane's influential-first ordering. Both degrade to
absent/unsorted rather than erroring when S2 is unavailable, so the reader never
depends on it.

OpenAlex is now Discovery's sole live scholarly-search/citation adapter: the
standalone `lib/discovery/ncbi.ts` E-utilities adapter is deleted entirely,
and `lib/discovery/arxiv.ts` is reduced to `normalizeArxivId`, the
id-normalization helper OpenAlex and Semantic Scholar consume rather than an
arXiv API client.

Discovery also has a second, parallel source type: `article` (The Conversation
+ science-journalism RSS/Atom feeds), added alongside the existing
`wikipedia`/`youtube`/`source` types on the `DiscoverySource` enum. One unified
adapter (`lib/discovery/articles.ts`) fetches/parses/caches both providers (RSS
and Atom share the same shape); only the render mode differs per feed —
`full` for The Conversation (CC BY-ND permits verbatim republication with
attribution) versus `linkout` for journalism feeds (no republication rights, so
only an excerpt + outbound link is stored). Article metadata is NOT folded into
`ExternalSource` — it gets its own 1:1 side-row table, `ArticleSource`, because
articles fit neither `ExternalPlatform` nor `CredibilityTier` and a dedicated
table keeps this feature from touching the paper/citation path. Untrusted
article HTML crosses ONE sanitization boundary, the shared
`ARTICLE_SANITIZE_OPTS` allowlist (also used for wiki-article sanitization) —
and it is re-applied on BOTH write paths: the resolve route AND the tree-POST
create path (`tree-service.ts`), since the POST endpoint is independently
reachable and a resolve-only sanitize would leave a hole for crafted HTML sent
straight to tree creation. Article nodes are deliberately non-promotable: the
source-promotion route only accepts `sourceType === 'source'` nodes with an
`externalSource` row, so an article node has no path into `Paper`.

Discovery KP uses an idempotent visit ledger, a per-team daily rollup, and a
one-time topic bonus. Article nodes award their one-time visit KP at CREATE
time (like wiki/youtube reading units), not deferred to reflection like
`source` nodes — an article is read in place, not held for later citation.

### 8.2 Literature Review

PDF upload workflow:

1. Authenticate and apply the upload tier.
2. Validate MIME, size, PDF magic bytes, and content hash, then run
   `lib/pdf/sanitize.ts` active-content inspection (reject JS/launch actions/
   embedded files/XFA/encryption/page bombs before storing or parsing).
3. Extract text with `unpdf`.
4. Optionally run the topic relevance check.
5. Create the `Paper`, upload the private PDF to R2, and create one
   `PaperProcessingJob`.
6. `await` metadata ingestion before responding (`maxDuration: 60`) so the paper
   comes back ready rather than stuck `pending` — on serverless a detached
   promise is frozen once the response flushes. The papers cron drains a full
   classroom's backlog (batch of 30) as the recovery path.
7. `lib/literature/process-paper.ts` atomically claims the job, extracts metadata
   through Anthropic (on Haiku — sufficient for title/author/abstract), and marks
   the paper ready or failed; citation rows are created at ready-time.
8. Status polling may process a claim; `/api/cron/papers` recovers jobs that
   outlive the original request.

`process-paper.ts` is genuinely retryable. `PaperProcessingJob` carries `nextRunAt`
(backed-off retry scheduling) and `terminalAt` (records exhaustion). A transient
failure keeps the paper in `processing` while attempts remain (bounded at three) and
only becomes `error` once retries are exhausted; every claim path is attempt-capped so
a crash-loop can't over-run the extractor, and the papers cron terminalizes a final
attempt that crashed mid-run. Paper **list** reads are metadata-only — `Paper` stores
`doi`/`credibilityTier`/`sourceHost` so listing never loads full text — and a
`(teamId, contentHash)` unique makes a duplicate upload a 409 at the database.
Paper file bytes are streamed inline for the in-panel `<iframe>` by the shared
`lib/papers/pdf.ts::streamStoredPdf` (R2 first, falling back to the legacy
in-DB blob for pre-migration rows), reused by both the student and teacher
file routes.

The Literature client is decomposed into feature components and hooks. Paper
list/get/delete responses are decoded by `components/literature/api.ts`; a failed
list load renders a retry banner rather than the empty first-run state. Paper and
Vega chat are server-owned: the client posts only the new user message (`{ message }`)
and the server rebuilds bounded history from committed `complete` rows, so a client
can't inject assistant turns into the model context or the persisted thread —
`lib/chat/thread.ts` owns this trim/cache-breakpoint/transaction machinery for
both routes.

Quiz questions and answer keys stay server-side in JSON. Grading and targeted
retry are Anthropic-backed, team/user scoped, and rate-limited; the shared
`lib/literature/grading.ts` owns the grading call, JSON extraction, and the
common `<paper_text>` prompt-injection framing. Untrusted paper/plan text is
delimited as data, not instructions, and any AI output touching KP/score/
clearance is Zod-parsed and server-clamped. KP uses per-student high-water marks.
Advisory locks serialize reward calculation so concurrent submissions cannot pay
twice.

Three newer per-student/per-team learning tools extend Literature Review, and
each contributes a variant of the same money-shaped-claim pattern used
elsewhere in the app (§10):

- **Explain-it-back** (`api/papers/[id]/explain`, `lib/literature/explain.ts`):
  the student writes their own-words explanation of a paper; Vega grades it
  against the SAME `paperTextBlock` cache prefix chat/quiz/grade/retry use
  (PERF-8, above). `PaperExplanation` is per-student, and its composite
  `(paperId, userId)` primary key doubles as the once-ever KP claim target: a
  raw `UPDATE ... WHERE kp_awarded = 0 RETURNING` inside the transaction (never
  a caught unique-violation — a caught constraint error inside a Prisma
  `$transaction` still aborts the whole transaction). `PaperExplanationAttempt`
  is the unpaid revise-loop history.
- **Synthesis Matrix** (`api/literature/synthesis/`, `lib/literature/synthesis.ts`):
  a team-shared comparison grid across 2-4 ready papers, `SynthesisCell` rows
  keyed by `(matrixId, paperId, columnId)` so two teammates editing different
  cells never clobber each other (a single JSON blob would be last-write-wins
  across the whole grid). The KP claim is flat, once-per-matrix, AND
  team-capped at `MAX_KP_AWARDED_MATRICES` paid matrices — the cap is a
  correlated `COUNT` across every matrix on the team, so it needs a
  **team-scoped**, not matrix-scoped, advisory lock: locking per-matrix can't
  stop two concurrent checks on two *different* unpaid matrices of the same
  team from each reading `count < cap` and both minting. A re-check of an
  unchanged grid (hash of columns/paperIds/cell text) replays the persisted
  verdict instead of paying for a new call (mirrors the Research Plan review
  replay in §8.3).
- **Vocabulary Builder** (`api/literature/vocab/`, `lib/literature/vocab.ts` +
  `srs.ts`): zero-LLM end to end. Terms are extracted mechanically (Schwartz-
  Hearst acronym pairing → authored-dictionary hits → repeated-ngram fallback,
  in precedence order) with every definition grounded in either the dictionary
  or a verbatim paper quote — never invented — a unit test pins this invariant.
  Review scheduling is pure Leitner (5 integer boxes, no SM-2 ease factor);
  the due-date IS the anti-farm mechanism — `POST /review` 409s a card whose
  `dueAt > now`, so a deck cannot be grinded in one sitting no matter what the
  client sends. Mastery KP (3/card) is claimed once-ever per card the same
  WHERE-gated way as Explain-it-back, but is paid in a SEPARATE transaction
  from the schedule update: the review itself (box/dueAt/lapses) is persisted
  unconditionally first, and only the KP payout can be rolled back by the
  `VocabKpDay` daily-cap ledger (an atomic insert-or-increment gated by
  `... <= cap`, same RETURNING-emptiness pattern, never a caught constraint
  error).

All three add per-student or team-scoped models consistent with the app's
existing scoping (§6, §9); the paper-DELETE cascade (`api/papers/[id]`) was
extended to also delete `PaperExplanationAttempt`/`PaperExplanation` rows for
the deleted paper.

### 8.3 Research Plan

Teams synchronize either a public Google Doc URL or pasted plan text. Project
type/subtype selects authored rubrics under `lib/research-plan/rubrics/`.
Idea-check and review outputs are validated, persisted as the latest JSON result,
and displayed by `ResearchPlanFeature`. A review of unchanged plan text (matched
by a sha256 of the plan + type/subtype stored alongside the result) replays the
persisted review as identical NDJSON events instead of paying for a new call.

Both routes are thin adapters over application services (§5.1):
`lib/research-plan/review-service.ts` and
`lib/research-plan/idea-check-service.ts` own the prompt construction, the
provider call, and the NDJSON framing (`lib/ndjson.ts::createNdjsonStream`),
each returning a typed `replay`/`stream` result the route only wraps in a
`Response`. Both share one precondition guard,
`lib/research-plan/require-plan-text.ts` — a team must have synced plan text
before either workflow runs.

Google OAuth is not implemented; the public-link/paste workflow is the current
behavior.

### 8.4 Operations Hub

`OperationsHubFeature` owns six tabs and accepts an initial tab for deep links:

- Field Codex.
- Project Log.
- Failure Log.
- Proof of Expertise.
- Data Terminal.
- Study with Vega.

Project logs are team-shared, attributed, rich-text entries with attendees,
attachments, links, and backlinks; the GET is cursor-paginated (newest 30, "load
older") with entry numbers derived from one windowed ranking query. Attachments
are referenced by `UploadedAsset` id — the view route authorises through the
team-scoped ledger row, not a client-supplied object key (legacy `?key=` URLs
still resolve). The route is a thin adapter over
`lib/logs/project-log-service.ts` (Track B P1-2), which owns the cursor read,
the roster-checked attendee/attachment write, and the daily Lab-Credit award
(`lib/economy/lab-credit.ts`, shared with the Failure Log route, so the
once-per-member-per-day LC rule for filing either log lives in one place).
Failure logs support an AI-generated follow-up question and persisted
response.

Data Terminal stores experiments and measurements in PostgreSQL; the list returns
measurement counts and a selected experiment lazy-loads its points. CSV parsing
and PNG/CSV export are local (`lib/data-terminal/export.ts`). Authored reference
content is under `content/data-terminal/` as `*.json` behind thin typed wrappers;
field-specific chart modules remain under `lib/data-terminal/charts/` and are
loaded by field.

### 8.5 Field Codex

Codex source JSON lives in `lib/ops/codex/content/`. The build script validates
and emits typed wrappers under `tracks/`, with checksums preventing source/wrapper
drift. Checkpoints are graded locally by `engine.ts`; only study-plan generation
uses Anthropic.

The completion and study-plan routes are thin adapters over application
services (§5.1): `lib/ops/codex/complete-service.ts` owns the
server-authoritative progression gate (re-derives correctness from the real
answer key; a locked lesson 403s before grading or paying anything) plus the
once-ever KP claim and the atomic daily-lesson cap; `lib/ops/codex/study-plan-service.ts`
owns the sourceHash-cached generation with a re-run cap enforced by one atomic
guarded `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING` executed
BEFORE the paid Haiku call, so two concurrent requests can never both claim
the last daily slot.

Progress keys include user, team, track, and lesson. First completion awards KP
once, and an atomic user/team/day counter enforces the daily cap.

Content growth is a `.claude/codex-pipeline/` authoring process (one Workflow
per segment), not an architectural change to the engine above. As of this
writing the library stands at 6/29 fields (36/174 segments); the
`clinical-medicine-pharmacology` field is now complete (Core + 5 subfield
branches, 275 lessons).

### 8.6 Science Fair Hub

The fair dataset lives in `content/fairs/dataset.json` behind a thin typed
wrapper (`dataset.ts`); `scripts/scrape-isef-fairs.mjs` emits the JSON directly.
Matching uses team state/coordinates and returns regional, state, and ISEF
candidates. The feature also includes categories, forms and safety guidance,
rubric self-assessment, teacher rubric scoring, and Firecrawl deadline
synchronization — the latter restricted to fairs the team is matched with (ISEF
or the team's own state) and refusing to overwrite a `confirmed` event.

### 8.7 Showcase

Showcases are team-owned portfolios with text, repository/video links, uploaded
assets, privacy levels, moderation state, public gallery visibility, view
fingerprinting, and a print layout. Private bytes remain in R2 and are streamed
through privacy-checked application routes; `lib/showcase-server.ts::resolveShowcaseViewer`
resolves the signed-in viewer's team/school context once for that privacy
check. View analytics are deduped per visitor per UTC day by a
`(showcaseId, visitorFingerprint, day)` unique — `recordShowcaseView` is
duplicate-safe, so concurrent first loads still count once. Asset uploads
(single-slot replacement, multi-slot caps, and the works-cited export) reserve
their `UploadedAsset` ledger row and enforce the slot/quota ceiling under a
per-`(showcase, slot)` or per-team advisory lock before any byte reaches R2 —
the same reservation-first discipline as paper and log-attachment uploads
(§10).

### 8.8 Teacher tools

Teacher routes begin with `requireTeacher`, which reads the caller's role from the
DB (`lib/teacher/role.ts`). Individual-student lookups are gated on the student's
own `classId ∈ classIds`; team data is authorised through membership
(`teacherOwnsTeam` — a teacher owns any team with ≥1 member in their classes),
so a cross-school lab's shared work is visible to both owning teachers while
personal pages stay private to each student's own teacher.

The dashboard provides:

- roster and attention flags;
- a **class-join request queue**: students who enter a class code appear as
  pending requests the teacher approves or denies (`api/teacher/class/requests/[id]`);
  approval enrols only that student;
- **class-code regeneration** (`api/teacher/class/[id]/code`) to revoke a leaked,
  non-expiring class code;
- full student/team drill-down;
- read-only paper, quiz, and chat inspection;
- feedback and nudges;
- separate teacher rubric scoring;
- showcase moderation (`app/(teacher)/teacher/showcase-moderation` +
  `app/api/teacher/showcase-moderation`): a class-scoped queue of `pending_review`
  public showcases that a teacher approves or rejects, notifying the team;
- class-wide reports.

Teachers do **not** gate phase progression — advancement is self-paced (see §6).
They **do** gate class enrolment (approval queue above).

### 8.9 Notifications

Notifications are persisted in-app. The cron runs every 15 minutes across a
07:00-11:45 UTC window (`vercel.json`, §12) rather than once daily, computing
fair deadlines and project urgency and using dedupe keys for idempotency; it
optionally sends email to opted-in users through Resend. Teacher feedback and
review decisions also create notifications. Each run streams teams in
id-ordered keyset pages (not one unbounded `findMany`), bulk-loads the fair
index and per-page log timestamps instead of per-team fan-out, processes teams
and email sends with bounded concurrency, batches notification inserts, and
records every checked team — including teams that produced no draft — in a
durable `NotificationRunTeam(runDay, teamId)` ledger row, so a re-run resumes
from where the day left off instead of rechecking or restarting; a 50s soft
budget stops each run cleanly (`stoppedEarly`) before the 60s cap rather than
being killed mid-team. A deterministic test proves one day's runs cover at
least 3,500 teams within this budget. The in-app feed is served by
`(teamId, createdAt)` / `(userId, createdAt)` indexes.

### 8.10 PvP

`prisma/schema.prisma` (`Spell`, `PvpRaid`, `PvpTrophies`, `PvpRaidQuota`,
`SpellType`) describes building-powered raids, spells, trophies, and daily
quotas. The `packages/shared-types/src/pvp.ts` contract module that once
mirrored those shapes was deleted as dead code — zero consumers, since nothing
outside the schema referenced them. The runtime raid engine, matchmaking,
battle UI, and leaderboard are not implemented. `/api/pvp` intentionally
returns 501 and the lab opens a `StubFeature`.

## 9. Data Model

`apps/web/prisma/schema.prisma` is grouped by domain.

| Domain | Models and enums |
|---|---|
| Identity/org | `User`, `School`, `Class`, `ClassJoinRequest`, `UserRole`, `ClassJoinRequestStatus` |
| Teams | `Team`, `TeamMember`, `TeamInvite`, `MemberRole`, `LabType`, `ProjectPhase` |
| Economy/buildings | `TeamCurrency`, `Building`, `TeamBuilding`, `TeamShopBuilding`, `TeamGatewayPlacement`, `LabCreditClaim`, `BuildingRole`, `SpellType` |
| Discovery | `DiscoveryNode`, `ExternalSource`, `ArticleSource`, `ExternalWork`, `TopicInterest`, `DiscoverySourceVisit`, `DiscoveryKpDay`, `DiscoveryTopicBonus`, source/platform/credibility enums (`DiscoverySource` now includes `article`) |
| Literature | `Paper`, `PaperProcessingJob`, `PaperProficiency`, `PaperExplanation`, `PaperExplanationAttempt`, `PaperChatMessage`, `PaperQuizSession`, `PaperQuizAttempt`, `PaperRelevanceNote`, `Citation`, `SynthesisMatrix`, `SynthesisCell`, `VocabCard`, `VocabKpDay`, paper/job/message/`VocabSource` enums |
| Research plan | `ResearchPlan`, `IdeaCheck` |
| Expertise/logs | `ExpertiseExam`, `ExpertiseAttempt`, `ProjectLog`, `ProjectLogFollowup`, `ProjectLogReference`, `ProjectLogEntry` |
| Teacher workflow | `TeacherFeedback`, `FeedbackTarget` |
| Notifications | `Notification`, `NotificationPref`, `NotificationKind`, `NotificationRunTeam` |
| Experiments | `Experiment`, `Measurement` |
| Showcase | `Showcase`, `ShowcaseAsset`, `ShowcaseView`, privacy/moderation/asset enums |
| Fairs/rubric | `Fair`, `FairEvent`, `FairUserAssociation`, `RubricVersion`, `RubricCriterion`, `RubricSelfAssessment`, `TeamRubricScore`, `IsefCategory`, `FormsCatalog`, `TeamFormStatus`, related enums |
| PvP | `Spell`, `PvpRaid`, `PvpTrophies`, `PvpRaidQuota` |
| Activity | `ActivityFeed` |
| Codex/Vega | `CodexLessonProgress`, `CodexKpDay`, `TeamStudyPlan`, `VegaStudyMessage` |
| Uploads | `UploadedAsset`, `UploadedAssetStatus` |

Closed vocabularies use Prisma enums. Extensible event names, project subtypes,
and versioned AI/content payloads remain strings or JSON intentionally.

### 9.1 Migration history

The migration chain is append-only:

- `00000000000000_init`: baseline schema.
- `20260701004819_discovery_v2_papers_tab` through
  `20260701050000_discovery_external_work_cache`: Discovery scholarly sources,
  KP ledger, citations, and metadata cache.
- `20260703193456_team_rubric_score` and
  `20260705220250_team_rubric_scorer_role`: teacher rubric scoring.
- `20260703225354_research_plan_paste_text`: pasted-plan support.
- `20260704051500_fair_event_unique_dedupe`: fair event idempotency.
- `20260704093000_discovery_node_interest_level`: Discovery interest levels.
- `20260706165927_pvp_raid_overhaul`: dormant PvP schema.
- `20260707015737_field_dispatch_streak_claim` and
  `20260708002914_drop_field_dispatch`: introduced, then removed, Field Dispatch.
- `20260707033902_codex_curriculum`: Codex curriculum persistence.
- `20260707090651_vega_study_messages`: Vega history.
- `20260708180000_team_ownership_integrity`: adds `Team.classId` and backfills
  it. Membership is proven in the resolver rather than by a DB constraint (see
  section 5.1).
- `20260708181000_paper_processing_jobs`: claim-based PDF-processing queue
  (`status`, `attempts`, `claimedAt`); retry-backoff fields are added later by
  `20260709150000` (see below).
- `20260708182000_codex_team_scoping`: team-scoped Codex keys and rewards.
- `20260708183000_closed_vocabulary_enums`: database enums for bounded values.
- `20260709000000_phase1_ownership_indexes`: ownership access-path indexes
  (`users.class_id`, `classes.teacher_id`, `team_members.team_id`,
  `team_invites(team_id, expires_at)`) and a top-up backfill of `teams.class_id`
  from each team's lead.
- `20260709120000_drop_phase_advance_requests`: drops the teacher
  phase-validation pipeline (`phase_advance_requests` table + `validation_status`
  enum); phase advancement is now fully self-paced.
- `20260709130000_expertise_grading_claim`: adds `ExpertiseExam.status`
  (`ExpertiseExamStatus`) + `gradingClaimedAt`/`gradingRequestId` so grading claims
  before the paid LLM call and is idempotent under retries.
- `20260709140000_paper_list_metadata`: stores `Paper.doi`/`credibilityTier`/
  `sourceHost` and a `(teamId, contentHash)` unique so duplicate uploads 409 at the
  DB and list reads never touch full text.
- `20260709150000_paper_job_retry_backoff`: adds `PaperProcessingJob.nextRunAt`/
  `terminalAt` for backed-off, bounded retries.
- `20260709160000_server_owned_chat_turns`: adds `status`/`requestId`/`error`/
  `tokenUsageJson` to `PaperChatMessage` and `VegaStudyMessage` so chat turns are
  server-owned.
- `20260709170000_growth_path_indexes`: composite indexes on the common
  classroom-scale list/dashboard access paths.
- `20260709180000_uploaded_asset_lifecycle`: adds the `UploadedAsset` ledger +
  `UploadedAssetStatus` enum for the uploaded-object lifecycle.
- `20260713100000_plot_cell_unique`: unique `(teamId, posX, posY)` on
  `TeamShopBuilding` — the durable backstop behind the plot advisory lock
  (refactor Phase 2, changelog `0.23.4`).
- `20260714010000_notification_feed_indexes`: `(teamId, createdAt)` /
  `(userId, createdAt)` indexes for the recency-ordered notification feed
  (Phase 4, `0.23.6`).
- `20260714120000_class_join_requests`: adds the `ClassJoinRequest` table +
  `ClassJoinRequestStatus` enum for the teacher class-join approval gate
  (`0.23.7`).
- `20260714150000_add_article_source`: adds the `article` value to
  `DiscoverySource` and the `ArticleSource` 1:1 side-row table (`0.24.0`).
- `20260714170000_paper_explanation`: adds `PaperExplanation` +
  `PaperExplanationAttempt` for Explain-it-back (`0.24.0`).
- `20260714225544_synthesis_matrix`: adds `SynthesisMatrix` + `SynthesisCell`
  for the team-shared comparison grid (`0.24.0`).
- `20260714230500_vocab_builder`: adds `VocabCard`, `VocabKpDay`, and the
  `VocabSource` enum for the zero-LLM vocabulary/SRS deck (`0.24.0`).
- `20260716000000_vocab_llm_definition`: adds the `llm_definition` value to
  `VocabSource` for the LLM-curated vocabulary step (`0.26.0`).
- `20260717000000_vocab_paper_curation`: adds `VocabPaperCuration` — the
  once-ever "this student already paid this paper's curation call" marker
  (`0.26.0`).
- `20260717120000_openalex_platform`: adds the `openalex` value to
  `ExternalPlatform` for works with neither an arXiv id nor a PMID — OA
  journal articles and non-arXiv preprint servers (`0.26.0`).
- `20260717130000_reference_tier`: adds the `reference` value to
  `CredibilityTier` for the plain-language explainer lane (`0.26.0`).
- `20260717150000_class_join_code_expiry`: adds `Class.joinCodeExpiresAt` and
  backfills existing codes with a fresh 30-day window (SEC2-003, `0.27.0`).
- `20260719120000_track_a_hardening`: adds `PaperQuizSession.retryGenClaimedAt`
  (A8 retry-generation claim), `ShowcaseView.day` plus the
  `(showcaseId, visitorFingerprint, day)` unique (A13 per-day view dedupe,
  backfilled from each row's own `viewedAt` date), and the
  `NotificationRunTeam` per-day run ledger table (A4, `0.30.0`).

The `2026070913xxxx`–`2026070918xxxx` migrations correspond to the earlier
refactor Phases 3–8 (changelog `0.21.2`–`0.21.7`). The
`0.23.2`–`0.23.8` hardening pass (planned in the since-removed `docs/REFACTOR.md`;
see the changelog entries for what shipped) added the three
migrations before the class-join-requests entry above; its per-student
class-membership change (`0.23.8`) reworked authorization in code and left
`Team.classId` vestigial without a migration. The four `20260714*` migrations
above (`0.24.0`) are unrelated new-feature schema, not part of that hardening
pass.

## 10. Persistence and Consistency

- Durable game/application data is stored in PostgreSQL.
- R2 stores paper PDFs, project-log images, and showcase assets.
- `localStorage` is used only for ephemeral weekly momentum dismissal.
- Team-scoped mutations include `teamId` in their lookup or derive ownership
  from a guarded parent.
- Unique constraints implement idempotency for rewards, visits, fair events,
  forms, one-to-one rows, and showcase views (per visitor per UTC day, see
  below).
- Interactive transactions and conditional updates protect currency and level
  changes. Reported results are derived from committed row counts, not
  pre-transaction reads: `api/expertise/grade/route.ts` is claim-based (an
  `ExpertiseExam.status` claim guards the paid grade, and the clearance raise is
  reported from the conditional update's own row count), and the plot economy
  debits/level-bumps are guarded conditional `updateMany`s in `lib/buildings/service.ts`.
  The daily Lab-Credit award (`lib/economy/lab-credit.ts`, shared by the
  project-log and failure-log routes) is likewise claim-based: only a verified
  Prisma `P2002` on the `LabCreditClaim` unique reads as "already paid" — every
  other failure retries once, emits a redacted structured event, and reports
  an explicit `failed` state rather than silently dropping the member's LC.
- Advisory locks (`lib/db-lock.ts`) serialize aggregates that span multiple tables.
  Every plot mutation — place, move, sell, upgrade — takes the per-team
  `team-plot:<teamId>` lock and re-checks committed occupancy inside it (see §7),
  backed by the `(teamId, posX, posY)` unique constraint. Discovery source
  promotion locks the node and re-reads `paperId` in-transaction, and the Codex
  once-ever KP claim is a WHERE-gated `kp_awarded = 0` transition, so a
  double-click can't mint a duplicate paper or double-award KP. The same
  WHERE-gated-RETURNING shape (never a caught unique-violation — that still
  aborts the surrounding `$transaction`) now also backs Explain-it-back's
  once-per-paper claim, Vocab's once-per-card mastery claim, and quiz-retry's
  `retryGenClaimedAt` conditional-update claim (`lib/literature/quiz-retry.ts`)
  that elects exactly ONE retry-question generator under concurrent requests
  before the paid call; Synthesis Matrix adds a **team**-scoped advisory lock
  around a correlated `COUNT`-gated claim, since its cap is per-team across
  matrices, not per-row (§8.2).
- CSRF: mutating requests are same-origin-checked in the shared guards, since
  Clerk sessions are cookie-borne (`assertSameOrigin`).
- Uploaded attachments are referenced by `UploadedAsset` id, not raw URL; the
  view route authorises through the team-scoped ledger row (`?id=`), so a
  client-supplied object key is never the capability.
- Uploaded objects follow a reservation-first, durable lifecycle rather than
  leaking: `reserveUploadAsset` commits a `temporary` `UploadedAsset` ledger
  row — under a per-team advisory lock that atomically checks the
  storage-quota ceiling — BEFORE any byte reaches R2, for all three upload
  paths (paper PDF, log attachment, showcase asset). The domain link and the
  `attached` transition commit together in one transaction; the object then
  moves through orphaned → deleted, with a single claim-then-delete reclaim
  sweep on the papers cron as the only physical-delete site
  (`lib/uploads/assets.ts`). `orphanObjectKey` adopts a legacy object only on
  a verified Prisma `P2002` race — any other DB failure propagates as a real
  error instead of silently leaking the object. Showcase single-slot
  replacement and multi-slot caps (including the works-cited export) are
  enforced the same way, under a per-`(showcase, slot)` lock.
- Showcase views are deduped per visitor per UTC day by a
  `(showcaseId, visitorFingerprint, day)` unique on `ShowcaseView`;
  `recordShowcaseView` is duplicate-safe, so concurrent first loads still
  count exactly once (§8.7).
- Paper processing is genuinely retryable: `PaperProcessingJob` carries `nextRunAt`
  (backed-off retry) and `terminalAt`; a transient failure keeps the paper in
  `processing` until attempts are exhausted rather than surfacing a terminal error.
- Chat turns are server-owned: a request sends only the new user message and the
  server loads bounded history from committed `complete` rows, so a client can't
  inject fabricated assistant turns (`lib/chat/thread.ts` owns this machinery
  for both paper chat and the Vega study thread).
- AI outputs stored as JSON are validated before business use where schemas exist.

## 11. External Integrations and Environment

`lib/env.ts` lazily validates required and optional server variables. Clients are
created only when used so unrelated missing secrets do not break route imports.

Required by the corresponding deployed features:

- Clerk publishable and secret keys.
- Supabase `DATABASE_URL` and `DIRECT_URL`.
- `ANTHROPIC_API_KEY`.
- R2 account, access keys, and bucket.
- `FIRECRAWL_API_KEY`.
- production `VIEW_FINGERPRINT_SALT`.
- `CRON_SECRET`.

Optional:

- Upstash Redis REST URL/token for shared rate-limit counters — **required on
  serverless/multi-instance production**, where the paid `ai`/`upload` tiers fail
  closed without it (or `RATE_LIMIT_ALLOW_MEMORY=1` on a single-instance host).
- trusted rate-limit IP header.
- OpenAlex identity/API key, and an optional Semantic Scholar `S2_API_KEY`
  (raises the anonymous shared-pool rate limit; the adapter works keyless
  without it).
- Resend API key and sender.
- E2E credentials and test-mode flags.

## 12. Deployment and Scheduled Work

The intended hosted stack is Vercel + Supabase + private Cloudflare R2. Supabase
is already wired through `DATABASE_URL` for pooled app runtime queries and
`DIRECT_URL` for Prisma migrations. Upstash Redis is wired as the optional
multi-instance rate-limit backend; in-process LRU remains the app's best-effort
read cache. Resend is optional for email notifications.

`apps/web/vercel.json` schedules:

- `/api/cron/papers` every five minutes.
- `/api/cron/notifications` every 15 minutes across a 07:00-11:45 UTC window —
  a durable `NotificationRunTeam` per-day ledger (§9, §10) lets each run
  resume where the last one left off, so one day's runs can cover a
  10,000-student population instead of the previous single daily invocation.

Migrations are committed under `apps/web/prisma/migrations/` and applied with
`prisma migrate deploy`. Production and development databases must be separate.

No error-monitoring or product-analytics SDK is currently integrated. Those
remain pre-pilot operational work in `SECURITY.md`.

## 13. Tests and Delivery Gates

Required order from the repository root:

```bash
pnpm --filter @scienium/shared-types build
pnpm --filter web check:integrity
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web test:e2e
```

`pnpm --filter web test` runs the Vitest unit suite and should also pass during
development.

`.github/workflows/ci.yml` runs integrity, typecheck, lint, unit tests, and
build on every PR and on pushes to `main`. `.github/workflows/e2e.yml` is the
separate browser-test gate: a bounded production-build smoke lane
(`e2e/F1.spec.ts`, real pointer input) on every PR, plus the full Playwright
suite on a nightly schedule and on demand. Both lanes report a passing
"skipped" status when the `E2E_ENV_FILE` repository secret is not configured,
so the gate becomes enforceable the moment that secret is set.

Vitest covers pure policy, guides/content integrity, parsing, rate limiting,
economy, phase gates, citations, credibility, showcase policy, sprites, Codex,
the route-policy authorization matrices, and the real-Postgres invariant suite
below.

Playwright uses three real Clerk accounts (leader, student, teacher). Auth state
is written to ignored files under `e2e/.auth/`. `seed:e2e` repairs the shared
School -> Class -> Team -> members graph, explicit team class, active-team links,
and currency baseline. The suite is serial by default because accounts and the
development database are shared; isolated databases/accounts are required for
safe write-test parallelism.

### 13.1 Test and tool file index

- `test/`: cross-feature credibility, phase, and showcase policy tests, the
  static cron-guard sweep (`cron-guard.test.ts`, asserts every cron route calls
  `assertCron`), and the same-origin/CSRF unit test (`same-origin.test.ts`).
- `test/harness/route-policy.ts`: calls route handlers directly as Student
  A/B, Teacher A/B, or anonymous, mocking only Clerk `auth()` and `@/lib/db`
  (real where-clause filtering, including compound uniques and relation
  filters) — the real rate limiter, CSRF check, phase gate, and Zod schemas
  all run for real. `route-policy-selftest.test.ts` proves the harness
  discriminates (a deliberately unscoped handler leaks the other team's row;
  a guard-dropping handler serves anonymous traffic). Eight matrix specs
  (`test/{data-terminal,discovery,failure-log,literature,papers,project-log,
  fairs-showcase,teacher}-policy.test.ts`) cover all 29 dynamic routes with
  the four-case access contract: same-team success, another team's real id
  rejected, signed-out, and over-limit.
- `test/pg/invariants.pg.test.ts`: a narrow REAL-Postgres suite proving what
  the in-memory harness cannot — the storage-quota reservation lock, the LC
  claim unique, the quiz-retry claim election, and showcase-view dedupe —
  against the local dev database; self-skips when none is reachable.
- `test/log-redaction-sweep.test.ts`: statically forbids raw
  query/prompt/submission/model-output text in any `console.*` call.
- `test/notifications-cron-capacity.test.ts`, `test/quiz-retry-concurrency.test.ts`,
  `test/upload-reservation.test.ts`, `test/showcase-view-dedupe.test.ts`, and
  `test/lab-credit-award.test.ts`: deterministic/concurrent-`Promise.all`
  proofs of the notification-scale, quiz-retry-idempotency, upload-reservation,
  showcase-view-dedupe, and Lab-Credit-claim invariants respectively.
- Co-located `*.test.ts`: economy, shop, LRU, rate-limit, Discovery economy,
  Data Terminal content/CSV, fair guidance/forms/rubric, Literature
  citation/research guide, notification computation, sprites, and Codex. The
  guide/glossary/fairs shape tests validate the authored content through its new
  JSON wrappers.
- `e2e/auth.setup.ts`, `e2e/env.ts`, `e2e/roles.ts`, `e2e/db.ts`,
  `e2e/fixtures.ts`, `e2e/discovery-helpers.ts`: shared authenticated setup,
  environment-aware fixture database access, and spec-level fixture/helper
  dedup. `e2e/a11y.spec.ts` runs axe (critical severity) plus a real keyboard
  focus-trap/restore flow on desktop AND a tablet viewport;
  `e2e/settings-smoke.spec.ts` is the Lab Profile settings panel's first
  browser coverage. The remaining `e2e/*.spec.ts` files cover literature,
  discovery, research plan, Operations Hub, showcase/print, notifications,
  reports, teacher rubric, Codex, Vega, placement, upgrades, and smoke flows.
- `scripts/gen-sprite-anchors.py`: derives runtime sprite anchors.
- `scripts/geocode-fairs.mjs`, `scripts/scrape-isef-fairs.mjs`: fair dataset
  maintenance.
- `scripts/test-upload.mjs`: manual R2 upload check.
- `prisma/seed-e2e.mjs`: idempotent browser-test fixture repair.
- `playwright.config.ts`, `vitest.config.ts`, `tailwind.config.ts`,
  `postcss.config.js`, `next.config.mjs`, `tsconfig.json`, `.eslintrc.json`,
  `.env.example`, and `vercel.json`: web tooling and deployment configuration.
  `.github/workflows/ci.yml` and `.github/workflows/e2e.yml` are the CI lanes
  described above.

### 13.2 Content and asset ownership

- `content/data-terminal/*.json` + `*.ts` wrappers: the four authored guide
  catalogs (data moved to JSON so tsc/bundles don't carry ~1.3 MB of literals;
  `research-glossary.json` under `lib/literature/` is the same pattern).
- `content/fairs/dataset.json` + `dataset.ts` wrapper: checked-in fair records
  consumed by matching, emitted by `scripts/scrape-isef-fairs.mjs`.
- `lib/ops/codex/content/*.json`: canonical authored Codex source.
- `lib/ops/codex/tracks/*.ts`: generated typed Codex wrappers.
- `lib/research-plan/rubrics/*.md`, `lib/clearance/expertise-rubric.md`, and
  `lib/literature/quiz-rubric.md`: versioned authored evaluation material.
- `public/sprites/buildings/`, `gateways/`, `tiles/`, and `ui/`: generated
  runtime PNGs; `public/scienium-logo.png` is the public logo.
- `art/`: source JSON, Python generators, previews, and sprite build
  documentation. `art_ref/` holds visual references. These are build-time only.

Generated images, Codex corpus records, and art source records are indexed by
their owning directory instead of being repeated one filename per line. The
source-code, route, workflow, configuration, test, migration, and authored
content ownership boundaries are all listed above.

## 14. Known Boundaries

- PvP is represented in schema/spec but is not implemented.
- The public home currently advertises PvP even though the playable raid flow is
  still the guarded 501 stub.
- Google Drive OAuth is deferred; Research Plan uses public links or pasted text.
- Legacy `Paper.pdfData` remains as a read fallback until production backfill is
  verified; new PDFs use R2.
- The former large feature shells (`StudentDetail`, `OperationsHubFeature`,
  `DiscoveryFeature`, `ShowcaseEditor`, `ResearchPlanFeature`, `DataTerminalTab`,
  `LabScene`) were decomposed into thin containers + feature folders + hooks in
  refactor Phase 3 (`0.23.5`); `CodexTab` remains the one larger shell.
- `Team.classId` is vestigial after the per-student membership change (`0.23.8`)
  — retained to avoid a destructive migration; a later cleanup could drop it.
- The isometric plot's z-index/hitbox stacking still forces several E2E specs
  (`e2e/F3.spec.ts`, `F11-quiz-retry.spec.ts`, `F13-codex.spec.ts`, and others)
  to click through `element.click()` rather than real pointer hit-testing;
  removing that bypass needs the hitbox fix first. Keyboard activation of
  gateways is real and covered by `e2e/a11y.spec.ts`.
- Roughly 600 remaining 6-9px text declarations (many at 25-40% white) still
  need a readability/contrast design pass; the two worst 6px/40%-white styles
  were already raised. Playwright coverage is desktop Chromium plus one tablet
  viewport only — WebKit/Firefox are not run.
- Track B P1-2 is complete only for the nine route/service pairs listed in
  §5.1. The remaining ~90 simple routes (a scoped read or single-table write
  behind a guard) stay direct-Prisma by design and migrate onto the seam only
  when a change to that route already touches it — this is not a backlog to
  clear in bulk.
- `SVC-1` (extracting the duplicated quiz/exam currency-minting into a service) is
  the one item from the `0.23.x` hardening pass never completed. Its original
  deferral — until after the concurrent PvP window, since it churns hot routes —
  no longer applies: **PvP did not ship** (the gateway renders `StubFeature`,
  `/api/pvp` returns 501, and the `/pvp/*` pages are placeholders — see A1 in
  [`REFACTOR2.MD`](../REFACTOR2.MD)), and no concurrent PvP implementation owns
  those files. SVC-1 is tracked in [`REFACTOR2.MD`](../REFACTOR2.MD) §4 "SVC-1",
  with all three current duplication sites listed.
- Broader privacy, monitoring, CSP, backup, and incident-response work is tracked
  in `SECURITY.md` for the classroom pilot.
