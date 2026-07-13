# scienium Technical Architecture

> Last fact-checked against the repository: 2026-07-09
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
Next.js 14 App Router on Vercel
  |-- React server/client components
  |-- route handlers under app/api
  |-- Prisma application services
  |-- Anthropic, Firecrawl, OpenAlex, NCBI, arXiv adapters
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
| Web framework | Next.js 14.2, App Router |
| UI runtime | React 18, TypeScript, Tailwind CSS |
| UI style | Custom pixel-art system and generated sprite assets |
| Authentication | Clerk middleware and server APIs |
| Database | Supabase PostgreSQL through Prisma 5, with pooled runtime URL and direct migration URL |
| Object storage | Cloudflare R2 through the AWS S3 SDK |
| AI | Anthropic SDK, constructed lazily in `lib/anthropic.ts` |
| External extraction | Firecrawl |
| Scholarly discovery | arXiv, NCBI E-utilities, and OpenAlex API |
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
- `paper.ts`: paper-processing contracts.
- `pvp.ts`: raid/spell contracts.
- `index.ts`: package exports.

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
|   |-- data-terminal/            authored stats/methods/quality/plot guides
|   `-- fairs/dataset.ts          affiliated-fair dataset
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

The component folders are feature-owned:

- `components/discovery/`: `DiscoveryFeature`, `DiscoveryHome`,
  `DiscoveryTopicList`, `DiscoveryTree`, `InterestSeeds`, `PapersSearch`,
  `SourceReader`, `TopicSearch`, `WikiReader`, and `YouTubeViewer`.
- `components/fair/`: `ScienceFairFeature`, `CategoryBrowser`,
  `FormsChecklist`, and `RubricSelfCheck`.
- `components/lab/`: `LabScene`, `LabPlot`, `ShopPanel`, `StatusStrip`,
  `Sprite`, `TileBackground`, `DecorationLayer`, `FeaturePanel`, `TeamPanel`, `SettingsPanel`
  integration, `ActivityPanel`, `FeedbackPanel`, `NotificationBell`,
  `MomentumCard`, `PhaseAdvance`, `RequestAdvance`, and the intentional PvP
  `StubFeature`.
- `components/literature/`: `LiteratureFeature`, `PaperSlot`,
  `UploadSourceButton`, `QAPanel`, `QuizPanel`, `PaperChat`,
  `CitationsPanel`, `CredibilityBadge`, `VettingChecklist`,
  `ResearchGuidePanel`, feature hooks, types, and API contracts.
- `components/ops/`: `OperationsHubFeature`, `CodexTab`, `ExpertisePanel`,
  `DataTerminalTab`, `VegaStudyTab`, `RichEditor`, five guide panels, and
  shared guide chrome.
- `components/research-plan/`: `ResearchPlanFeature`.
- `components/settings/`: `SettingsPanel` and `LabProfileSettings`.
- `components/showcase/`: `ShowcaseEditor`, `PrintButton`, and
  `AbstractGuidePanel`.
- `components/teacher/`: `TeacherRoster`, `StudentDetail`,
  `student-detail/PaperQAPanel`, `TeacherReports`, `TeacherRubricScoring`,
  `ShowcaseModerationQueue`, and `DecisionControls`.
- `components/ui/`: `BusyButton`, `Card`, `ConfirmDialog`, `LabeledLoader`,
  `PixelProgressBar`, `PixelSkeleton`, `PixelSpinner`, `SectionTabs`, and
  feature/route skeletons.

## 4. App Router

### 4.1 Route groups and pages

`app/layout.tsx` configures fonts and global providers. `app/page.tsx` is the
public entry page.

`app/(auth)/` contains Clerk sign-in and sign-up pages.

`app/(onboarding)/onboarding/page.tsx` creates or joins a lab and optionally
links the student to a school/class.

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
duplicated route-local loading files. There are no server actions; writes use
route handlers.

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
helper. (Phase 1 of the refactor plan.)

`lib/teacher/auth.ts` is the teacher guard. It validates teacher/admin role,
loads classes owned by the teacher, and scopes team access through
`Team.classId`. The DB `User.role` is authoritative whenever a row exists
(`resolveAuthoritativeRole`, `lib/teacher/role.ts`), so a stale Clerk claim can
never override a DB downgrade; the claim only bootstraps an account with no row.
`teacherOwnsTeam` scopes purely by `Team.classId` — the old `teamLead.classId`
fallback was removed after migration `20260709000000_phase1_ownership_indexes`
backfilled every team's class from its lead.

`lib/cron/auth.ts` validates `Authorization: Bearer <CRON_SECRET>`.

`lib/validation.ts` parses bounded JSON bodies using strict Zod schemas.
`lib/api/client.ts` provides consistent client-side JSON errors and runtime
response validation where a feature contract has been defined.

### 5.2 Caching and rate limiting

`lib/rate-limit.ts` defines `read`, `mutate`, `join`, `upload`, and `ai` tiers.
Each authenticated request is counted per user and against a larger shared-IP
backstop. The default store is process memory. When both Upstash variables are
configured, counters use Redis REST and work across server instances. Redis
failure currently fails open and is logged.

`lib/lru.ts` provides bounded in-process TTL/LRU caching for cheap read-through
caches such as the Wikipedia article proxy. These caches are intentionally
best-effort and per-instance. Durable data and user-visible state live in
PostgreSQL; Redis is not currently a general application state store.

### 5.3 API route inventory

- `api/buildings/`: read plot/shop state; place/purchase, move, sell, upgrade.
- `api/citations/`: list citations and export formatted bibliographies.
- `api/class/join`: join or move a lab into a teacher class.
- `api/cron/notifications`: daily deadline/urgency notifications.
- `api/cron/papers`: retry pending, failed, or stale paper jobs.
- `api/data-terminal/`: experiment CRUD and measurement writes.
- `api/dev/`: development-only backfill and paper-fill helpers.
- `api/discovery/`: Wikipedia search/article, interests, topic, tree CRUD,
  YouTube resolution, scholarly search/resolve/citations/reflection, and source
  promotion.
- `api/expertise/`: create and grade Proof of Expertise exams.
- `api/failure-log/`: failure CRUD and AI follow-up.
- `api/fairs/`: fair matching, forms, form status, and deadline synchronization.
- `api/notifications/`: notification list/read state and preferences.
- `api/onboarding/`: student/team onboarding and teacher onboarding.
- `api/ops/codex/`: progress, completion, and study-plan generation.
- `api/ops/vega-study`: persistent project-grounded team chat.
- `api/papers/`: upload/list/delete/file, chat, quiz, grade, and targeted retry.
- `api/project-log/`: log CRUD, references, attachment upload and viewing.
- `api/pvp`: guarded 501 placeholder for the unbuilt raid system.
- `api/research-plan/`: source synchronization, originality check, and review.
- `api/rubric/self-assessment`: team rubric read/write.
- `api/settings`: team/profile settings.
- `api/showcase/`: showcase CRUD, asset upload/link/delete, public streaming.
- `api/teacher/`: class, roster, reports, feedback, nudge, rubric,
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
- `api/client.ts`, `api/route-context.ts`: browser response decoding and
  authenticated team route context.
- `db.ts`, `db-lock.ts`: Prisma singleton and PostgreSQL advisory locks.
- `economy.ts`, `shop.ts`, `plot.ts`, `phase.ts`, `showcase.ts`: pure domain
  policy.
- `shop-server.ts`, `plot-server.ts`, `showcase-server.ts`: database-backed
  loaders.
- `featureRegistry.tsx`, `gateways.ts`, `labCurrency.tsx`: lab feature wiring and
  client currency context.
- `lru.ts`, `rate-limit.ts`, `storage.ts`, `uploadWithProgress.ts`,
  `validation.ts`, and `wikipedia.ts`: bounded cache, throttling, R2, upload,
  request parsing, and Wikipedia integration.

Feature-owned library folders:

- `buildings/`: plot economy orchestration (`service.ts`) — the place/move/sell/
  upgrade business rules, per-team `team-plot:<teamId>` advisory lock, in-lock
  occupancy re-checks, and race-safe currency debits, lifted out of the route
  handlers so they are unit-testable without a request.
- `clearance/`: expertise context, rubric, authored rubric prompt, and scoring.
- `cron/`: cron bearer authentication.
- `uploads/`: uploaded-asset lifecycle (`assets.ts`) — records every R2 object as a
  durable `UploadedAsset` ledger row and moves it through temporary → attached →
  orphaned → deleted, with a single claim-then-delete reclaim sweep as the only
  physical-delete site.
- `data-terminal/`: CSV utilities, chart-guide index, tests, and one chart module
  per scientific field under `charts/`.
- `discovery/`: arXiv, NCBI, OpenAlex, credibility, sanitization, source
  normalization, interest matching, and KP award policy.
- `fairs/`: abstract guidance, categories, forms, rubric anchors/scoring, safety,
  ZIP lookup, and matching.
- `guides/` and `hooks/`: guide filtering and the reusable toggle-set hook.
- `lab-type/`: Anthropic-backed lab classification.
- `literature/`: citation, quiz, relevance, research-guide, and durable paper
  processing.
- `notifications/`: notification computation and optional Resend delivery.
- `onboarding/`: Clerk-profile normalization.
- `ops/`: failure follow-up and Vega context, plus the Codex engine, schemas,
  source corpus, generated wrappers, checksums, build script, and tests.
- `research-plan/`: Google Doc extraction, review/idea-check logic, types, and
  authored science/engineering rubrics.
- `sprites/`: runtime manifest, generated anchors, and manifest test.
- `teacher/`: role and class/team authorization. Teacher role is read from the
  DB (`role.ts`), not inferred from owning a class.
- `team/`: self-serve phase advancement, membership-verified active-team resolution
  (`active-team.ts` confirms the caller is a member of the requested `activeTeamId`
  before trusting it), and invites.

## 6. Identity, Schools, Classes, and Teams

The ownership chain is:

```text
School
  `-- Class (teacherId)
       `-- Team (classId)
            `-- TeamMember (userId, role)
```

Important invariants:

- Clerk owns authentication; `User.clerkUserId` links the local row.
- `User.activeTeamId` selects the team used by student routes, but a request-supplied
  `activeTeamId` is trusted only after `lib/team/active-team.ts` confirms the caller
  actually belongs to that team — an unverified team id never widens access.
- Teacher authority is read from `User.role` in the DB (`lib/teacher/role.ts`); it is
  no longer inferred from owning a class. `Team.classId` remains the data boundary a
  teacher's reads/writes are scoped to.
- A lab may not straddle classes. A non-lead cannot move individually to a
  different class; a lead class move updates the team and all members.
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
- live currency reconciliation through `lib/labCurrency.tsx`.

`LabPlot` owns isometric input and rendering. Grid math is shared with the server
through `lib/plot.ts`. Sprite lookup is centralized in
`lib/sprites/manifest.ts`; generated anchors live in
`lib/sprites/anchors.generated.ts`.

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

Discovery supports Wikipedia, YouTube, arXiv/PubMed/PMC sources, interest seeds,
multiple trees, citations, reflections, starring, and topic locking.

`stores/discoveryStore.ts` owns cursor/tree interaction but the database remains
authoritative. Mutations update optimistically; failed HTTP responses trigger a
rehydration instead of leaving unsaved local state. External scholarly metadata
is fetched through the OpenAlex, NCBI, and arXiv adapters, sanitized, and cached
in `ExternalWork`. Citation traversal uses factual edges, not algorithmic
related-work recommendations.

Discovery KP uses an idempotent visit ledger, a per-team daily rollup, and a
one-time topic bonus.

### 8.2 Literature Review

PDF upload workflow:

1. Authenticate and apply the upload tier.
2. Validate MIME, size, PDF magic bytes, and content hash.
3. Extract text with `unpdf`.
4. Optionally run the topic relevance check.
5. Create the `Paper`, upload the private PDF to R2, and create one
   `PaperProcessingJob`.
6. Return `processing` to the client.
7. `lib/literature/process-paper.ts` atomically claims the job, extracts metadata
   through Anthropic, and marks the paper ready or failed.
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

The Literature client is decomposed into feature components and hooks. Paper
list/get/delete responses are decoded by `components/literature/api.ts`. Paper and
Vega chat are server-owned: the client posts only the new user message (`{ message }`)
and the server rebuilds bounded history from committed `complete` rows, so a client
can't inject assistant turns into the model context or the persisted thread.

Quiz questions and answer keys stay server-side in JSON. Grading and targeted
retry are Anthropic-backed, team/user scoped, and rate-limited. KP uses
per-student high-water marks. Advisory locks serialize reward calculation so
concurrent submissions cannot pay twice.

### 8.3 Research Plan

Teams synchronize either a public Google Doc URL or pasted plan text. Project
type/subtype selects authored rubrics under `lib/research-plan/rubrics/`.
Idea-check and review outputs are validated, persisted as the latest JSON result,
and displayed by `ResearchPlanFeature`.

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
attachments, links, and backlinks. Failure logs support an AI-generated
follow-up question and persisted response.

Data Terminal stores experiments and measurements in PostgreSQL. CSV parsing and
export are local. Authored reference content is under `content/data-terminal/`;
field-specific chart modules remain under `lib/data-terminal/charts/` and are
loaded by field.

### 8.5 Field Codex

Codex source JSON lives in `lib/ops/codex/content/`. The build script validates
and emits typed wrappers under `tracks/`, with checksums preventing source/wrapper
drift. Checkpoints are graded locally by `engine.ts`; only study-plan generation
uses Anthropic.

Progress keys include user, team, track, and lesson. First completion awards KP
once, and an atomic user/team/day counter enforces the daily cap.

### 8.6 Science Fair Hub

The fair dataset lives in `content/fairs/dataset.ts`. Matching uses team
state/coordinates and returns regional, state, and ISEF candidates. The feature
also includes categories, forms and safety guidance, rubric self-assessment,
teacher rubric scoring, and Firecrawl deadline synchronization.

### 8.7 Showcase

Showcases are team-owned portfolios with text, repository/video links, uploaded
assets, privacy levels, moderation state, public gallery visibility, view
fingerprinting, and a print layout. Private bytes remain in R2 and are streamed
through privacy-checked application routes.

### 8.8 Teacher tools

Teacher routes begin with `requireTeacher`, which reads the caller's role from the
DB (`lib/teacher/role.ts`). Student lookup is class-scoped and team data is
authorized through `Team.classId`.

The dashboard provides:

- roster and attention flags;
- full student/team drill-down;
- read-only paper, quiz, and chat inspection;
- feedback and nudges;
- separate teacher rubric scoring;
- showcase moderation (`app/(teacher)/teacher/showcase-moderation` +
  `app/api/teacher/showcase-moderation`): a class-scoped queue of `pending_review`
  public showcases that a teacher approves or rejects, notifying the team;
- class-wide reports.

Teachers do **not** gate phase progression — advancement is self-paced (see §6).

### 8.9 Notifications

Notifications are persisted in-app. The daily cron computes fair deadlines and
project urgency, uses dedupe keys for idempotency, and optionally sends email to
opted-in users through Resend. Teacher feedback and review decisions also create
notifications. The cron streams teams in id-ordered keyset pages (not one
unbounded `findMany`) with a per-run cap, so its cost stays flat as classes are
added; a capped run reports `stoppedEarly` rather than silently skipping teams.

### 8.10 PvP

The schema and shared contracts describe building-powered raids, spells,
trophies, and daily quotas. The runtime raid engine, matchmaking, battle UI, and
leaderboard are not implemented. `/api/pvp` intentionally returns 501 and the
lab opens a `StubFeature`.

## 9. Data Model

`apps/web/prisma/schema.prisma` is grouped by domain.

| Domain | Models and enums |
|---|---|
| Identity/org | `User`, `School`, `Class`, `UserRole` |
| Teams | `Team`, `TeamMember`, `TeamInvite`, `MemberRole`, `LabType`, `ProjectPhase` |
| Economy/buildings | `TeamCurrency`, `Building`, `TeamBuilding`, `TeamShopBuilding`, `TeamGatewayPlacement`, `LabCreditClaim`, `BuildingRole`, `SpellType` |
| Discovery | `DiscoveryNode`, `ExternalSource`, `ExternalWork`, `TopicInterest`, `DiscoverySourceVisit`, `DiscoveryKpDay`, `DiscoveryTopicBonus`, source/platform/credibility enums |
| Literature | `Paper`, `PaperProcessingJob`, `PaperProficiency`, `PaperChatMessage`, `PaperQuizSession`, `PaperQuizAttempt`, `PaperRelevanceNote`, `Citation`, paper/job/message enums |
| Research plan | `ResearchPlan`, `IdeaCheck` |
| Expertise/logs | `ExpertiseExam`, `ExpertiseAttempt`, `ProjectLog`, `ProjectLogFollowup`, `ProjectLogReference`, `ProjectLogEntry` |
| Teacher workflow | `TeacherFeedback`, `FeedbackTarget` |
| Notifications | `Notification`, `NotificationPref`, `NotificationKind` |
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

These `2026070913xxxx`–`2026070918xxxx` migrations correspond to refactor Phases 3–8
(changelog `0.21.2`–`0.21.7`); Phases 9–11 are code/docs only and add no migration.

## 10. Persistence and Consistency

- Durable game/application data is stored in PostgreSQL.
- R2 stores paper PDFs, project-log images, and showcase assets.
- `localStorage` is used only for ephemeral weekly momentum dismissal.
- Team-scoped mutations include `teamId` in their lookup or derive ownership
  from a guarded parent.
- Unique constraints implement idempotency for rewards, visits, fair events,
  forms, and one-to-one rows.
- Interactive transactions and conditional updates protect currency and level
  changes. Reported results are derived from committed row counts, not
  pre-transaction reads: `api/expertise/grade/route.ts` is claim-based (an
  `ExpertiseExam.status` claim guards the paid grade, and the clearance raise is
  reported from the conditional update's own row count), and the plot economy
  debits/level-bumps are guarded conditional `updateMany`s in `lib/buildings/service.ts`.
- Advisory locks (`lib/db-lock.ts`) serialize aggregates that span multiple tables.
  Every plot mutation — place, move, sell, upgrade — takes the per-team
  `team-plot:<teamId>` lock and re-checks committed occupancy inside it (see §7).
- Uploaded objects have a durable lifecycle rather than leaking: each R2 object is
  tracked by an `UploadedAsset` ledger row (temporary → attached → orphaned →
  deleted), with a single claim-then-delete reclaim sweep on the papers cron as the
  only physical-delete site (`lib/uploads/assets.ts`).
- Paper processing is genuinely retryable: `PaperProcessingJob` carries `nextRunAt`
  (backed-off retry) and `terminalAt`; a transient failure keeps the paper in
  `processing` until attempts are exhausted rather than surfacing a terminal error.
- Chat turns are server-owned: a request sends only the new user message and the
  server loads bounded history from committed `complete` rows, so a client can't
  inject fabricated assistant turns.
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

- Upstash Redis REST URL/token for shared rate-limit counters.
- trusted rate-limit IP header.
- OpenAlex and NCBI identity/API keys.
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
- `/api/cron/notifications` daily at 07:00 UTC.

Migrations are committed under `apps/web/prisma/migrations/` and applied with
`prisma migrate deploy`. Production and development databases must be separate.

No error-monitoring or product-analytics SDK is currently integrated. Those
remain pre-pilot operational work in `SECURITY.md`.

## 13. Tests and Delivery Gates

Required order from the repository root:

```bash
pnpm --filter @scienium/shared-types build
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
pnpm --filter web test:e2e
```

`pnpm --filter web test` runs the Vitest unit suite and should also pass during
development.

Vitest covers pure policy, guides/content integrity, parsing, rate limiting,
economy, phase gates, citations, credibility, showcase policy, sprites, and Codex.

Playwright uses three real Clerk accounts (leader, student, teacher). Auth state
is written to ignored files under `e2e/.auth/`. `seed:e2e` repairs the shared
School -> Class -> Team -> members graph, explicit team class, active-team links,
and currency baseline. The suite is serial by default because accounts and the
development database are shared; isolated databases/accounts are required for
safe write-test parallelism.

### 13.1 Test and tool file index

- `test/`: cross-feature credibility, phase, and showcase policy tests.
- Co-located `*.test.ts`: economy, shop, LRU, rate-limit, Discovery economy,
  Data Terminal content/CSV, fair guidance/forms/rubric, Literature
  citation/research guide, notification computation, sprites, and Codex.
- `e2e/auth.setup.ts`, `e2e/env.ts`, `e2e/roles.ts`, `e2e/db.ts`: shared
  authenticated setup and environment-aware fixture database access. The
  remaining `e2e/*.spec.ts` files cover literature, discovery,
  research plan, Operations Hub, showcase/print, notifications, reports,
  teacher rubric, Codex, Vega, placement, upgrades, and smoke flows.
- `scripts/gen-sprite-anchors.py`: derives runtime sprite anchors.
- `scripts/geocode-fairs.mjs`, `scripts/scrape-isef-fairs.mjs`: fair dataset
  maintenance.
- `scripts/test-upload.mjs`: manual R2 upload check.
- `prisma/seed-e2e.mjs`: idempotent browser-test fixture repair.
- `playwright.config.ts`, `vitest.config.ts`, `tailwind.config.ts`,
  `postcss.config.js`, `next.config.mjs`, `tsconfig.json`, `.eslintrc.json`,
  `.env.example`, and `vercel.json`: web tooling and deployment configuration.

### 13.2 Content and asset ownership

- `content/data-terminal/*.ts`: the four large authored guide catalogs.
- `content/fairs/dataset.ts`: checked-in fair records consumed by matching.
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
- Several mature feature shells remain large (`StudentDetail`,
  `OperationsHubFeature`, `DiscoveryFeature`, `ShowcaseEditor`,
  `ResearchPlanFeature`, `DataTerminalTab`, and `CodexTab`). Their internal
  boundaries should continue moving into feature folders without changing API
  contracts.
- Broader privacy, monitoring, CSP, backup, and incident-response work is tracked
  in `SECURITY.md` for the classroom pilot.
