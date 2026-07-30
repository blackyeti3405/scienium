# ARCHITECTURE.md — Scienium System Architecture

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## Architectural Pattern

**Monolithic Next.js 14 App Router application** with a layered internal structure. There is no separate backend microservice — all server logic (API, AI, background jobs) runs inside the single Next.js app via API route handlers and Vercel Cron jobs.

The architecture is a **phase-gated educational game engine**: a student team progresses through research-project phases (`discovery` → `lab_selection` → `literature_review` → `research_planning` → `working` → `showcase`), and each phase unlocks gameplay features. The "game" layer (KP currency, lab buildings, PvP raids, shop) wraps a genuine science-fair workflow (literature review, research plan, experiments, showcase).

---

## Layers

### 1. Presentation Layer — `apps/web/app/` (App Router)
Next.js App Router with **route groups** (parenthesized dirs that don't affect URL) segmenting by audience:

| Route group | Audience | Routes |
|-------------|----------|--------|
| `(auth)` | Unauthenticated | `/sign-in`, `/sign-up` |
| `(onboarding)` | New users | `/onboarding` (school/team setup, ZIP capture) |
| `(dashboard)` | Students | `/daily`, `/dashboard`, `/discovery`, `/fair-hub`, `/lab`, `/literature`, `/pvp`, `/research-plan`, `/showcase` |
| `(teacher)` | Teachers | `/teacher` (dashboard, student detail, rubric scoring) |
| `(public)` | Anyone | `/showcase` (public portfolio pages) |
| `app/api/` | API consumers | ~15 resource route groups + `cron/` (see API Layer) |
| `app/game/` | — | Game-related UI |

**Renders:** React Server Components by default; client islands use `use client`. Layouts in each route group (`layout.tsx`) provide shared chrome/shell.

### 2. Component Layer — `apps/web/components/`
Feature-scoped component directories mirror the route structure:
`discovery/`, `fair/`, `lab/`, `literature/`, `ops/`, `research-plan/`, `settings/`, `showcase/`, `teacher/`. Shared primitives live in `components/ui/` (shadcn/ui-style: `button`, `card`, `dialog`, etc.) with skeleton variants in `components/ui/skeletons/`.

### 3. Business Logic Layer — `apps/web/lib/`
Domain-organized modules. Each feature subdirectory is self-contained (`lib/discovery/`, `lib/literature/`, `lib/pvp/`, `lib/research-plan/`, `lib/fairs/`, `lib/teacher/`, `lib/team/`, `lib/ops/`, etc.). Top-level `lib/*.ts` files hold cross-cutting infrastructure (db, env, phase, rate-limit, validation, anthropic, economy, storage, shop).

### 4. Data Access Layer — Prisma
A single Prisma schema (`apps/web/prisma/schema.prisma`) defines ~60 models. All data access goes through `@/lib/db` (a memoized `PrismaClient` singleton). No raw SQL; no second ORM.

### 5. Shared Types Layer — `packages/shared-types`
Workspace package (`@scienium/shared-types`) compiled to `dist/`. Holds canonical enums (`ProjectPhase`, `LabType`, `SpellType`, etc.), PvP types (`pvp.ts`), paper types (`paper.ts`), and an `index.ts` barrel. App code imports both from the package and, in places, deeper into `@/packages/shared-types/src/*` paths.

### 6. Shared Config Layer — `packages/config`
Workspace package (`@scienium/config`) exporting ESLint config, base tsconfig, and Next tsconfig. Consumed by all apps/packages.

---

## Entry Points

| Entry point | Description |
|-------------|-------------|
| `apps/web/app/layout.tsx` | Root layout — fonts, providers, global shell |
| `apps/web/middleware.ts` | Clerk auth middleware — gatekeeps every request before route resolution |
| `apps/web/app/api/**/route.ts` | API handlers (Next.js Route Handlers) |
| `apps/web/app/api/cron/**/route.ts` | Vercel Cron-invoked handlers (auth via `CRON_SECRET`, not Clerk) |
| `apps/web/next.config.mjs` | Next.js build/runtime config (R2 image domain, server externals) |
| `infra/docker-compose.yml` | Local Postgres for dev |

---

## Request Flow

### Authenticated team API request (the dominant pattern)

```
Client fetch()
   │
   ▼
middleware.ts ── ClerkMiddleware ── public route? ──► (skip auth)
   │ (else require Clerk session; redirect to /sign-in if absent)
   ▼
app/api/<resource>/route.ts  (Next Route Handler)
   │
   ▼
requireTeamContext(req, { tier, feature })    [lib/api/route-context.ts]
   │  1. auth() ───────────► 401 if signed out
   │  2. enforceRateLimit ──► 429 if over tier (Upstash or in-memory)
   │  3. pickActiveTeam ────► 404 if no team (resolves via membership, NOT
   │                           trusting stored activeTeamId without a backing row)
   │  4. assertFeatureUnlocked► 403 if phase hasn't unlocked `feature`
   ▼
parseJson(req, ZodSchema)                    [lib/validation.ts]
   │  strict zod parse → 400 on malformed/extra fields
   ▼
Domain logic (lib/<feature>/*.ts)
   │  · db.* (Prisma) for persistence
   │  · anthropic() for Claude calls where LLM is needed
   │  · serverEnv.* for lazy-secret reads
   ▼
NextResponse.json({ data })   ←  success
NextResponse.json({ error })  ←  on failure
```

**Key invariant:** `requireTeamContext` resolves the team through `TeamMember` membership, so a stored `activeTeamId` is only honored when a membership row still backs it. This prevents cross-team data leakage.

### Cron request

```
Vercel Cron (schedule) ── Authorization: Bearer <CRON_SECRET> ──►
   │
   ▼
app/api/cron/<job>/route.ts
   │
   ▼
assertCron(req)            [lib/cron/auth.ts]
   │  fails CLOSED (503) if CRON_SECRET unset; 401 if header mismatch
   ▼
Background work (paper processing queue, notification dispatch)
```

### Public showcase request

```
Visitor ──► middleware.ts (public route matcher: /showcase/(.*), /api/showcase/public/(.*))
        ──► route handler (privacy-checked; no Clerk session required)
```

---

## Data Flow

### State model: the Team
The `Team` is the central aggregate. Nearly every entity is team-scoped (`teamId` FK). A team has:
- **Members** (`TeamMember`) — students; one lead
- **Currency** (`TeamCurrency`) — KP (knowledge points), LC (lab credits), clearance level
- **Phase** (`ProjectPhase`) — drives feature gating
- **Lab type** (`LabType`) — one of 6 themed labs
- **Buildings** (`TeamBuilding`, `TeamShopBuilding`) — game economy
- **Research artifacts** (papers, research plan, experiments, showcase, project logs)
- **Location** (ZIP → state/lat/lng) for science-fair matching

### Phase-gated feature unlocking
`lib/phase.ts` is the **single source of truth** for what features each phase unlocks (`PHASE_UNLOCKS`). Both UI and API import from it — features are never gated client-only. `requireTeamContext` enforces this server-side with `assertFeatureUnlocked`.

```
discovery          → discovery, fair_hub
lab_selection      → lab_selection
literature_review  → literature, daily
research_planning  → research_plan
working            → buildings, pvp, data_terminal
showcase           → showcase
```

### Phase advancement
`lib/team/advance.ts` governs transitions. Only one transition has a mechanical gate: `literature_review` → `research_planning` requires the team to upload 25 sources AND every member to independently demonstrate proficiency (`PaperProficiency`) on all of them. All other transitions are **self-advance** (free student clicks).

### Economy flow (KP / LC)
- **KP earnings:** discovery node visits (idempotent via `DiscoverySourceVisit`), paper proficiency (per-student, capped at 100/source), codex lesson completion, daily tasks.
- **KP spend:** building purchases/upgrades in `lib/shop.ts` (cost scales with live team size).
- **LC (lab credit):** daily per-member per-day ledger (`LabCreditClaim`, idempotent).
- **Clearance:** `Proof of Expertise` exam raises `TeamCurrency.clearanceLevel` — the ceiling shop buildings push against (`lib/clearance/`).

### Idempotency is a pervasive pattern
Almost every award/credit operation uses a unique constraint row as the idempotency key, so re-clicks/re-branches/retries never double-pay:
- `DiscoverySourceVisit` `@@unique([teamId, nodeId])`
- `LabCreditClaim` `@@unique([userId, day])`
- `PaperProficiency` high-water marks (score/KP never lowered by retake)
- `CodexLessonProgress` once-ever KP claim
- `Notification` `dedupeKey` unique (daily cron idempotent)

### AI integration pattern
All LLM calls go through `lib/anthropic.ts` — a single lazily-constructed, memoized `Anthropic` client. Constructed on first call (never at import) so a missing key can't break `next build`. The client is shared by every LLM route. Paid calls follow a **server-owned turn lifecycle** (`pending` → `complete`/`error`) so the paid call and visible state never silently diverge (`PaperChatMessage`, `VegaStudyMessage`, `ExpertiseExam` grading claim).

### Paper processing (async queue)
PDF uploads create a `Paper` (status `pending`) + a `PaperProcessingJob`. A Vercel Cron job (`/api/cron/papers`, every 5 min) claims pending jobs, extracts text (`unpdf`), runs AI quiz generation, and flips status to `ready`. Jobs have retry/backoff (`nextRunAt`) and a terminal state (`terminalAt`) when retries exhaust.

---

## Server-Owned Turn Lifecycle (paid-LLM calls)

For any turn that triggers a paid Claude call, the message row is written `pending` BEFORE the LLM call and flipped to `complete` or `error` after. This guarantees the persisted state matches whether the paid call succeeded:
- `PaperChatMessage.status` (`ChatMessageStatus`)
- `VegaStudyMessage.status`
- `ExpertiseExam.status` (`ExpertiseExamStatus` with a `grading` claim to prevent double-calls)

---

## Cross-Cutting Concerns

| Concern | Mechanism | Location |
|---------|-----------|----------|
| Auth | Clerk middleware | `middleware.ts` |
| Team resolution | Membership-verified active team | `lib/team/context.ts`, `lib/api/route-context.ts` |
| Feature gating | Phase → feature map | `lib/phase.ts` |
| Input validation | Strict zod parse | `lib/validation.ts` |
| Response validation | zod `requestJson` helper | `lib/api/client.ts` |
| Rate limiting | Upstairs Redis / in-memory fallback, tiers | `lib/rate-limit.ts` |
| Server secrets | Lazy memoized zod-validated getters | `lib/env.ts` |
| LLM client | Lazy memoized singleton | `lib/anthropic.ts` |
| DB singleton | Memoized PrismaClient | `lib/db.ts` |
| DB locking | Advisory-lock helper | `lib/db-lock.ts` |
| AI risk/safety | sanitize-html for all AI/user content | inline + `sanitization` |
| Background jobs | Vercel Cron + `assertCron` secret | `lib/cron/auth.ts`, `vercel.json` |

---

## Build Order (dependency-implied, for planning)

1. **Foundation:** env, db, phase, validation, rate-limit, anthropic — everything depends on these.
2. **Identity:** Clerk middleware, user/school/class/team models, onboarding, team invite/join.
3. **Discovery:** Wikipedia tree, external sources (arXiv/PubMed/OpenAlex), KP economy for discovery.
4. **Literature:** Papers, upload→processing queue, quizzes, proficiency gate, citations.
5. **Research plan:** Google Doc sync, idea check, AI review, rubric.
6. **Working phase:** Buildings/shop, clearance/exams, project/failure logs, data terminal, PvP.
7. **Showcase:** Public portfolio, moderation, views, science-fair hub + rubric scoring.

The current branch (`matthew/pvp-system`) is actively building layer 6's PvP raid system.

---

*Mapped: 2026-07-19*