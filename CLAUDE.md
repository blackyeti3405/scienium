<!-- GSD:project-start source:PROJECT.md -->
## Project

**scienium**

scienium is a hybrid physical-digital STEM engagement game that motivates students through the science-fair process. Students build and expand a personalized pixel-art virtual lab where each core feature lives behind a *building* on their plot, earning building upgrades through daily learning activities, demonstrated knowledge, and real research-project progress. Students progress through sequential phases (`discovery` → `literature_review` → `research_planning` → `working` → `showcase`), unlocking new capabilities as they go, solo or in shared-lab teams. Target: ~120 students in a single-school pilot. The student-facing core is feature-complete and E2E-tested (features F1–F18); teacher tooling is minimal-for-pilot. This project's active milestone is **finishing the §11 PvP Raid System**, which is mid-build on the `matthew/pvp-system` branch.

**Core Value:** Ship a **finished, verified, and balanced** PvP raid system students can use to raid each other — grounded truth of what's actually built on the branch, completed to spec §11, proven by tests, and tuned so losing trophies feels fair instead of arbitrary. If everything else slips but the user can look at a trustworthy inventory of the PvP system and trust that raids run correctly and currency math is honest, the milestone has succeeded.

### Constraints

- **Tech stack:** Next.js 14 App Router, Prisma 5 + Postgres/Supabase, Clerk, Anthropic SDK, Tailwind/shadcn. Per SPEC §11.8, **no new libraries** for PvP — API routes + Prisma + trivial AOE arithmetic suffice.
- **Phase gating:** PvP unlocks at `working`. Any feature work must keep the gate server-side (`assertFeatureUnlocked` from `lib/phase.ts`); client-only gating is unacceptable (SPEC §14.1 enforcement note).
- **Currency & idempotency safety:** Trophies are user-visible currency — never convertible, only ranking. PvP persistence must use the app's unique-constraint idempotency pattern (`pvp_raid_quota` on `team_id + date`); bad trophy math ships as a user-visible regression, so the loss curve is test-driven (C-02).
- **Non-destructive raids:** The raid runs against a **read-only snapshot** of the defender's `team_shop_buildings` (+ gateway placements). Defender rows are never mutated; damage exists only inside the raid instance (SPEC §11.2/§11.8).
- **Server-authoritative engine:** The client only streams cast events (`spell_id, x, y, client_ts`); the server validates the 15-second window + cooldown spacing and resolves AOE damage. The client never reports damage (SPEC §11.8).
- **Daily caps, local reset:** Raids/refinds per team per day are capped (tunable; currently 3/3). The reset day boundary is `todayUtc()` (UTC midnight) — a known US-classroom edge (C-18); flagged, not in this milestone's scope to fix.
- **Scope cap:** This milestone = spec §11 complete + tested + tuned. PvP prod-hardening and app-wide launch gates are explicitly out of scope (see Out of Scope).
- **Branch & git:** Continue on `matthew/pvp-system`; planning-doc commit tracking is decided in the next config step (Step 5).
- **Scale:** 120 students at a small daily cap = trivial write load; archive raids older than 30 days if `raid_log_json` grows (SPEC §11.8).
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | TypeScript | ^5.5.4 | Strict mode via `@scienium/config` shared tsconfig |
| Runtime | Node.js | >=20 | Required by package.json engines |
| Package manager | pnpm | >=9 | Workspace-based monorepo |
## Monorepo Structure
## Frontend (apps/web)
### Core Framework
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.35 | App Router framework, React Server Components |
| React | ^18.3.1 | UI library |
| React DOM | ^18.3.1 | DOM renderer |
### Styling
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Tailwind CSS | ^3.4.10 | Utility-first CSS framework |
| tailwindcss-animate | ^1.0.7 | Animation utilities for Tailwind |
| tailwind-merge | ^2.5.2 | Tailwind class conflict resolution |
| clsx | ^2.1.1 | Conditional class name construction |
| class-variance-authority | ^0.7.0 | Type-safe component variant API |
| Lucide React | ^0.436.0 | Icon library |
### State Management
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Zustand | ^4.5.5 | Lightweight client state (one store: `stores/discoveryStore.ts`) |
### Rich Text & Markdown
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Tiptap | ^3.27.1 | Rich-text editor (React) with starter-kit, extensions, and markdown |
| react-markdown | ^10.1.0 | Render markdown in components |
| remark-gfm | ^4.0.1 | GitHub-flavored markdown support |
| sanitize-html | ^2.17.5 | HTML sanitization for user/AI content |
### Data Visualization
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Recharts | ^2.12.7 | Composable chart library (Data Terminal experiments) |
## Backend (apps/web — Next.js API Routes)
### Authentication & Authorization
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Clerk | ^5.3.5 | User auth (email/password sign-up, session management, middleware) |
| `@clerk/nextjs` | ^5.3.5 | Next.js App Router integration |
### Database
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Prisma | ^5.18.0 | ORM — schema, migrations, type-safe client |
| PostgreSQL | 16 (via pgvector/pgvector:pg16) | Primary database |
| Supabase | (managed Postgres) | Production database with transaction + session poolers |
### Caching & Rate Limiting
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Upstash Redis | (REST API — optional) | Rate limiting for LLM-heavy routes (`lib/rate-limit.ts`) |
### File Storage
| Dependency | Version | Purpose |
|-----------|---------|---------|
| AWS S3 SDK | ^3.1065.0 | Cloudflare R2 object storage (S3-compatible API) |
| `@aws-sdk/s3-request-presigner` | ^3.1065.0 | Pre-signed URLs for uploads |
### PDF Processing & Web APIs
| Dependency | Version | Purpose |
|-----------|---------|---------|
| sharp | ^0.33.5 | Image processing (server-side) |
| unpdf | ^1.6.2 | PDF text extraction |
| fast-xml-parser | ^5.9.3 | XML parsing (PubMed/arXiv API responses) |
### AI / LLM
| Dependency | Version | Purpose |
|-----------|---------|---------|
| `@anthropic-ai/sdk` | ^0.104.2 | Anthropic Claude API — all AI features |
### External Data APIs
| Dependency | Version | Purpose |
|-----------|---------|---------|
| firecrawl | ^4.28.1 | Web scraping for Idea Check novelty search |
### Email
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Resend | (optional — REST API) | Notification emails (fair deadline reminders) |
### Video
| Dependency | Version | Purpose |
|-----------|---------|---------|
| video.js | ^8.17.1 | Video player component |
## Infrastructure
### Local Dev
| Tool | Purpose |
|------|---------|
| Docker Compose (`infra/docker-compose.yml`) | Local PostgreSQL 16 with pgvector |
| `infra/seed/` | Database seed scripts |
### Production
| Platform | Purpose |
|----------|---------|
| Vercel | Next.js hosting (configured in `vercel.json`) |
| Vercel Cron Jobs | Scheduled tasks: paper processing (`*/5 * * * *`), notifications (`0 7 * * *`) |
| Supabase | Managed PostgreSQL (transaction pooler port 6543, session pooler port 5432) |
| Cloudflare R2 | Object storage (S3-compatible) |
| Clerk | Managed authentication |
| Upstash Redis | Rate limiting (optional) |
| Resend | Transactional email (optional) |
## Testing
| Dependency | Version | Purpose |
|-----------|---------|---------|
| Vitest | ^4.1.9 | Unit/integration tests |
| Playwright | ^1.61.0 | End-to-end browser tests |
| `@clerk/testing` | ^2.1.5 | Clerk auth helpers for E2E |
- Unit tests: `apps/web/test/` (Vitest — `.test.ts` files)
- Unit tests in lib: inline `.test.ts` files (e.g., `lib/rate-limit.test.ts`)
- E2E tests: `apps/web/e2e/` (Playwright — `.spec.ts` files, ~25 specs)
## Dev Tooling
| Tool | Purpose |
|------|---------|
| ESLint | Linting (`eslint-config-next`) |
| Prettier | ^3.3.3 — code formatting |
| TypeScript | ^5.5.4 — type checking (`tsc --noEmit`) |
## Version Control & CI
| Tool | Purpose |
|------|---------|
| Git | Version control (current branch: `matthew/pvp-system`) |
| GitHub | Hosting (`.github/` directory present) |
## Key Dependencies at a Glance
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## TypeScript Conventions
- **Strict mode:** `strict: true` in `packages/config/tsconfig.base.json` — the base config inherited by both `shared-types` (NodeNext) and `apps/web` (Bundler/Next).
- **No `any` without reason:** ESLint `@typescript-eslint/no-explicit-any: 'warn'`. When unavoidable, the actual type is usually ghosted above the cast.
- **Unused vars:** `@typescript-eslint/no-unused-vars: 'error'` with `argsIgnorePattern: '^_'`. Prefix intentional throwaway args with `_`.
- **Module/target:** Base = `ES2022`/`NodeNext`. Next app = `ES2017` lib + `dom`, `Bundler` resolution, `isolatedModules`, `noEmit`. shared-types = `ES2022`/`NodeNext` + `declaration`/`sourceMap`.
- **Path alias:** `@/*` → project root (`apps/web/*`). Used pervasively for app-internal imports. Workspace packages imported by name (`@scienium/config`, `@scienium/shared-types`).
## Formatting (Prettier)
## File & Directory Naming
- **Files/dirs:** kebab-case — `route-context.ts`, `data-terminal/`, `combat-engine.ts`.
- **React components:** PascalCase filenames and exports — `DiscoveryTree.tsx`.
- **Route groups:** `(parenthesized)` — URL-neutral audience segmentation: `(auth)`, `(dashboard)`, `(teacher)`, `(public)`, `(onboarding)`.
- **Tests:** `*.test.ts` (Vitest, logic units), `*.spec.ts` (Playwright E2E).
## Comment Density — HIGH
## Error Handling — Server-Side API Routes
### Validation
- **Input:** `parseJson(req, ZodSchema)` (`lib/validation.ts`) — strict zod parse; rejects malformed JSON with 400, rejects unexpected/extra fields (`.strict()`), surfaces the first issue with its field path.
- **Responses (client):** `requestJson(url, ZodSchema, init)` (`lib/api/client.ts`) — runtime-validates responses against a zod schema; throws `ApiError` with status on non-2xx.
### Error response shape
- 400 — validation failure (zod)
- 401 — unauthenticated (no Clerk session)
- 403 — phase-gate failure (`PhaseGateError`)
- 404 — no team / team-scoped resource not found (also the IDOR guard)
- 429 — rate-limited (sets `Retry-After`)
- 500 — unhandled (rare; most paths catch and return a shaped error)
### Logging
- `console.error('[scope] message:', err)` with a bracketed scope tag — e.g. `[unpdf]`, `[r2]`, `[rate-limit]`. Prisma query logging is intentionally OFF (would flood the terminal; flip on temporarily to debug).
- Background promise chains fire-and-forget with `.catch(console.error)` (paper processing, activity logging) so they never crash the request but surface failures.
## Security Conventions (Defense-in-Depth)
- **Strict input validation (OWASP API8:2023 — Mass Assignment):** every JSON body is parsed through a *strict* zod schema rejecting extra fields.
- **Team-scoped IDOR guard:** `teamId` is resolved through membership via `pickActiveTeam`, not by trusting a stored `activeTeamId`. Foreign IDs return 404 (not 403) to avoid leaking existence.
- **XSS sanitizer — one shared allowlist:** `ARTICLE_SANITIZE_OPTS` / `TITLE_SANITIZE_OPTS` in `lib/discovery/sanitize.ts`. All server-produced HTML rendered via `dangerouslySetInnerHTML` runs through `sanitize-html` (parses + re-serializes known-safe tags only). "Do NOT fork a looser allowlist — one allowlist, one XSS surface."
- **Lazy server secrets:** `lib/env.ts` validates ONLY the variable it returns, memoized on first use — so `next build` (imports every route) and routes that don't need a given secret never fail on an unrelated unset var.
- **Fail-closed cron:** `lib/cron/auth.ts` returns 503 if `CRON_SECRET` unset rather than world-open.
- **Production view-fingerprint salt required:** `viewFingerprintSalt()` throws in production if `VIEW_FINGERPRINT_SALT` < 16 chars (dev falls back to a labelled constant).
- **Auto-forgery prevention:** client-sent `host`/`credibilityTier` on external sources are advisory only — recomputed server-side at resolve/persist.
## Idempotency — Pervasive Ledger Pattern
- `DiscoverySourceVisit` `@@unique([teamId, nodeId])` — first-visit KP ledger
- `LabCreditClaim` `@@unique([userId, day])` — daily lab credit
- `PaperProficiency` / `CodexLessonProgress` — high-water-mark scoring (score & KP never lowered by a weaker retake)
- `Notification` `dedupeKey` unique — cron idempotent
- `TeamDailyTaskDay` / `CodexKpDay` — per-day rollups for daily caps (single fast read + atomic increment)
## Economy & Game Logic Conventions
- **KP / LC:** KP = knowledge points (positive earnings); LC = lab credits (daily per-member). Tracked in `TeamCurrency`.
- **Cost scaling:** building purchase cost scales with the live team member count (`lib/shop.ts`) — bigger teams earn more KP but pay more.
- **High-water marks everywhere:** per-student per-source KP caps (`max 100/source`), and per-student daily caps — enforced atomically at the route, not just by the DB.
- **Deterministic, no-LLM paths:** citation formatting (`lib/literature/citation.ts`) and ISEF rubric scoring (`lib/fairs/isef-rubric.ts` literal) are computed locally + deterministically by design; the DB row is just a cache.
## AI / LLM Conventions
- **Single shared client:** `lib/anthropic.ts` memoized singleton — every Claude call routes through it. Constructed lazily (never at import) so missing keys can't break the build.
- **Server-owned turn lifecycle:** paid-call rows are written `pending` before the LLM call and flipped to `complete`/`error` after — the visible state never silently diverges from whether the paid call succeeded (`PaperChatMessage`, `VegaStudyMessage`, `ExpertiseExam`).
- **Grading claim:** `ExpertiseExam` uses a `grading` claim + stale-detection so a concurrent re-grade can't call Claude twice for one exam.
## State Management Conventions
- **Server-first:** Next App Router data fetching + RSC by default. Most state is server-driven.
- **Client state (Zustand):** used sparingly. Only one store exists (`stores/discoveryStore.ts`) for cross-component discovery-tree state. Most route state doesn't need a client store.
- **Client islands:** `'use client'` only on components that actually need browser APIs / interactivity.
## Import Conventions
- App-internal imports use `@/...` alias, NOT relative paths beyond a single level.
- Within `lib/`, modules import peers via `@/lib/...` (e.g. `combat-engine.ts` imports `@/lib/db`).
- Some deep imports bypass the package barrel: `@/packages/shared-types/src/pvp` and `@/lib/pvp/*`. (This is intentional in spots but inconsistent — see CONCERNS.)
- Server-only modules (env, anthropic, cron/auth) carry a `SERVER-ONLY` docblock warning never to import from client components.
## Naming: Database
- **Models** PascalCase, tables snake_case via `@@map` — `model Team` → `@@map("teams")`.
- **Fields** camelCase, columns snake_case via `@map` — `teamId` → `@map("team_id")`.
- **Enums** snake_case values, `@@map` snake_case type — `UserRole { student, teacher, admin } @map("user_role")`.
## Common Module Skeleton (a representative `lib/` module)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Architectural Pattern
## Layers
### 1. Presentation Layer — `apps/web/app/` (App Router)
| Route group | Audience | Routes |
|-------------|----------|--------|
| `(auth)` | Unauthenticated | `/sign-in`, `/sign-up` |
| `(onboarding)` | New users | `/onboarding` (school/team setup, ZIP capture) |
| `(dashboard)` | Students | `/daily`, `/dashboard`, `/discovery`, `/fair-hub`, `/lab`, `/literature`, `/pvp`, `/research-plan`, `/showcase` |
| `(teacher)` | Teachers | `/teacher` (dashboard, student detail, rubric scoring) |
| `(public)` | Anyone | `/showcase` (public portfolio pages) |
| `app/api/` | API consumers | ~15 resource route groups + `cron/` (see API Layer) |
| `app/game/` | — | Game-related UI |
### 2. Component Layer — `apps/web/components/`
### 3. Business Logic Layer — `apps/web/lib/`
### 4. Data Access Layer — Prisma
### 5. Shared Types Layer — `packages/shared-types`
### 6. Shared Config Layer — `packages/config`
## Entry Points
| Entry point | Description |
|-------------|-------------|
| `apps/web/app/layout.tsx` | Root layout — fonts, providers, global shell |
| `apps/web/middleware.ts` | Clerk auth middleware — gatekeeps every request before route resolution |
| `apps/web/app/api/**/route.ts` | API handlers (Next.js Route Handlers) |
| `apps/web/app/api/cron/**/route.ts` | Vercel Cron-invoked handlers (auth via `CRON_SECRET`, not Clerk) |
| `apps/web/next.config.mjs` | Next.js build/runtime config (R2 image domain, server externals) |
| `infra/docker-compose.yml` | Local Postgres for dev |
## Request Flow
### Authenticated team API request (the dominant pattern)
```
```
### Cron request
```
```
### Public showcase request
```
```
## Data Flow
### State model: the Team
- **Members** (`TeamMember`) — students; one lead
- **Currency** (`TeamCurrency`) — KP (knowledge points), LC (lab credits), clearance level
- **Phase** (`ProjectPhase`) — drives feature gating
- **Lab type** (`LabType`) — one of 6 themed labs
- **Buildings** (`TeamBuilding`, `TeamShopBuilding`) — game economy
- **Research artifacts** (papers, research plan, experiments, showcase, project logs)
- **Location** (ZIP → state/lat/lng) for science-fair matching
### Phase-gated feature unlocking
```
```
### Phase advancement
### Economy flow (KP / LC)
- **KP earnings:** discovery node visits (idempotent via `DiscoverySourceVisit`), paper proficiency (per-student, capped at 100/source), codex lesson completion, daily tasks.
- **KP spend:** building purchases/upgrades in `lib/shop.ts` (cost scales with live team size).
- **LC (lab credit):** daily per-member per-day ledger (`LabCreditClaim`, idempotent).
- **Clearance:** `Proof of Expertise` exam raises `TeamCurrency.clearanceLevel` — the ceiling shop buildings push against (`lib/clearance/`).
### Idempotency is a pervasive pattern
- `DiscoverySourceVisit` `@@unique([teamId, nodeId])`
- `LabCreditClaim` `@@unique([userId, day])`
- `PaperProficiency` high-water marks (score/KP never lowered by retake)
- `CodexLessonProgress` once-ever KP claim
- `Notification` `dedupeKey` unique (daily cron idempotent)
### AI integration pattern
### Paper processing (async queue)
## Server-Owned Turn Lifecycle (paid-LLM calls)
- `PaperChatMessage.status` (`ChatMessageStatus`)
- `VegaStudyMessage.status`
- `ExpertiseExam.status` (`ExpertiseExamStatus` with a `grading` claim to prevent double-calls)
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
## Build Order (dependency-implied, for planning)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| pixel-art-generator | Generate and re-skin scienium pixel-art sprites (isometric gateway buildings, ground tiles, UI) using the reproducible code pipeline under art/. Use whenever creating, editing, or recoloring any game sprite for scienium. | `.claude/skills/pixel-art-generator/SKILL.md` |
| ui-ux-pro-max | "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples." | `.claude/skills/ui-ux-pro-max/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
