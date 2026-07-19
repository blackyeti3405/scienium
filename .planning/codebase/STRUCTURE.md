# STRUCTURE.md — Scienium Directory Layout

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## Top-Level Layout

```
nova-lab/                       # Repo root (pnpm workspace)
├── apps/
│   └── web/                    # ★ The Next.js 14 application (only app)
├── packages/
│   ├── config/                 # Shared ESLint + tsconfig (workspace pkg @scienium/config)
│   └── shared-types/           # Shared TS types + enums (workspace pkg @scienium/shared-types)
├── infra/
│   ├── docker-compose.yml      # Local Postgres (pgvector/pgvector:pg16)
│   └── seed/                   # Seed scripts
├── art/                        # Pixel-art sprite generator pipeline (isometric game art)
├── art_ref/                    # Reference material for art generation
├── docs/                       # Project documentation (SPEC, architecture, SECURITY, etc.)
├── .github/                    # GitHub config (CI/workflows)
├── .claude/ .agents/ .codex/   # Agent config dirs (multi-runtime)
├── package.json                # Root scripts: dev/build/lint/typecheck/test/format
├── pnpm-workspace.yaml         # Workspace packages: apps/*, packages/*
├── pnpm-lock.yaml
├── .prettierrc
├── AGENTS.md                   # Agent workflow instructions
└── .gitignore
```

The root `package.json` is a thin orchestration layer — its scripts filter into `apps/web` (e.g., `pnpm --filter web dev`).

---

## `apps/web/` — The Application

```
apps/web/
├── app/                # Next.js App Router (pages + API)
├── components/         # React components (feature-grouped + ui/ primitives)
├── lib/                # Server-side business logic (75+ .ts files)
├── content/            # Static content/data (fairs, data-terminal)
├── stores/             # Zustand client stores
├── prisma/             # Prisma schema + migrations + seed
├── e2e/                # Playwright E2E specs (~25)
├── test/               # Vitest unit tests
├── scripts/            # One-off CLI scripts (geocoding, ISEF scraping, sprite anchors, e2e helpers)
├── public/             # Static assets served as-is
├── middleware.ts        # Clerk auth middleware (runs before every request)
├── next.config.mjs      # R2 image domains + server external packages
├── tailwind.config.ts   # Tailwind + shadcn/ui CSS-variable theme
├── postcss.config.js
├── vercel.json          # Vercel Cron schedule
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

### `app/` — Next.js App Router

Route groups (parenthesized dirs = URL-neutral audience segments):

```
app/
├── layout.tsx                  # Root layout
├── (auth)/                     # /sign-in, /sign-up (+ layout)
├── (onboarding)/               # /onboarding (+ layout)
├── (dashboard)/                # Authenticated student app
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── dashboard/              # Main hub
│   ├── daily/                  # Field Codex, PoE, Project/Failure log
│   ├── discovery/              # Topic exploration tree
│   ├── fair-hub/               # Science fair calendar + rubric
│   ├── lab/                    # Lab building game (isometric grid)
│   ├── literature/             # Literature review + library
│   ├── pvp/                    # PvP raids UI (current branch focus)
│   ├── research-plan/         # Research plan editor + idea check
│   └── showcase/              # Showcase wing
├── (teacher)/                  # /teacher dashboard, student-detail (+ layout)
├── (public)/                  # /showcase public pages (+ layout)
├── api/                        # API route handlers (see below)
└── game/                       # Game-related UI
```

### `app/api/` — API Route Handlers (~15 resource groups)

```
api/
├── buildings/         # Lab building purchase/upgrade
├── citations/         # Citation generation/storage
├── class/             # Classroom (teacher-owned) ops
├── cron/              # ★ Cron-invoked (CRON_SECRET auth, no Clerk)
│   ├── notifications/ # Daily 7am notification dispatch
│   └── papers/        # Every 5 min paper processing queue
├── data-terminal/     # Experiment tracking + graph data
├── dev/               # Dev-only endpoints
├── discovery/         # Topic tree / external sources
├── expertise/         # Proof of Expertise exams
├── failure-log/       # Failure log entries
├── fairs/             # Science fair + ISEF data
├── notifications/    # In-app notifications
├── onboarding/       # School/team/ZIP onboarding
├── ops/              # Operations hub / Codex
├── papers/           # Paper upload/processing/quizzes/chat
├── project-log/      # Project log entries
├── pvp/              # ★ PvP: dashboard, raid start/refind, battle detail
│   ├── route.ts
│   ├── [battleId]/   # Battle detail
│   └── spell-power/  # Spell power meter endpoint
├── research-plan/    # Plan sync (Google Doc / paste) + review + idea check
├── rubric/           # Rubric versions + criteria
├── settings/         # User/team settings
├── showcase/         # Showcase CRUD (+ /public/ unauthenticated)
├── teacher/          # Teacher feedback + rubric scoring
└── team/             # Team invite/join/advance-phase
```

Each resource has `route.ts` (handler for the collection route); nested dynamic segments use `[param]/route.ts`.

### `components/` — React Components

```
components/
├── ui/                # shadcn/ui-style primitives (button, card, dialog, etc.)
│   └── skeletons/     # Loading skeleton variants
├── discovery/         # Discovery tree components
├── fair/              # Science fair components
├── lab/               # Lab/isometric game components
├── literature/        # Literature review components
├── ops/                # Operations hub / Codex components
├── research-plan/     # Research plan editor components
├── settings/          # Settings components
├── showcase/          # Showcase components
└── teacher/           # Teacher dashboard components
    └── student-detail/
```

### `lib/` — Business Logic (the heart of the app)

Top-level cross-cutting modules (no subdir):

```
lib/
├── db.ts              # PrismaClient singleton (memoized)
├── db-lock.ts         # Advisory lock helper
├── env.ts             # Lazy zod-validated server-secret getters
├── anthropic.ts       # Memoized Anthropic client (all LLM calls)
├── phase.ts           # ★ Phase→feature gating (single source of truth)
├── validation.ts      # parseJson — strict zod request validation
├── rate-limit.ts       # Upstash/in-memory rate limiting
├── economy.ts          # KP/LC economy ops (sell refunds, etc.)
├── shop.ts             # Building catalog + purchase logic (cost scales w/ team size)
├── shop-server.ts      # Server-side shop logic
├── gateways.ts         # Gateway (navigation building) placement
├── plot.ts / plot-server.ts # Isometric grid plot logic
├── storage.ts          # R2 object storage ops
├── showcase.ts / showcase-server.ts
├── uploadWithProgress.ts
├── wikipedia.ts         # Wikipedia API client
├── lru.ts              # LRU cache util
└── api/
    ├── client.ts      # requestJson — zod-validated fetch + ApiError
    └── route-context.ts # ★ requireTeamContext (auth+rate+team+phase gate)
```

Feature subdirectories:

```
lib/
├── activity/          # Activity feed
├── buildings/         # Building definitions
├── clearance/         # Proof of Expertise / clearance level
├── cron/auth.ts       # assertCron — CRON_SECRET guard
├── data-terminal/     # Experiment graphing
│   └── charts/
├── discovery/         # arXiv / PubMed / OpenAlex / Wikipedia clients
├── fairs/             # Fair matching, ZIP→state, ISEF rubric
├── guides/            # Student guides
├── hooks/             # React hooks
├── lab-type/          # Lab-type auto-classification (Haiku)
├── literature/        # Citation generation (deterministic, no LLM)
├── notifications/     # Notification dispatch
├── onboarding/        # Profile/school/team setup
├── ops/               # Field Codex curriculum content + Vega study
│   └── codex/         # Codex track/branch/unit/lesson TS curriculum
├── pvp/               # ★ PvP combat engine + spell power (current branch)
│   ├── combat-engine.ts
│   └── spell-power.ts
├── research-plan/     # Google Doc sync, idea check, rubric review
│   └── rubrics/
├── sprites/            # Sprite helpers (pixel art)
├── teacher/           # Teacher dashboard logic
├── team/              # Team context, advance gate, invite
└── uploads/           # Upload lifecycle (temporary→attached→swept)
```

### `prisma/`

```
prisma/
├── schema.prisma      # Single-schema, ~60 models, enums, @@map to snake_case tables
├── migrations/        # Prisma migration history
└── seed-e2e.mjs       # E2E seed script (run via pnpm seed:e2e)
```

### `content/` — Static bundled content
```
content/
├── fairs/            # Science fair seed data
└── data-terminal/    # Data terminal reference content
```

### `stores/` — Zustand client state
```
stores/
└── discoveryStore.ts  # Cross-component discovery tree state
```

---

## `packages/`

### `packages/config/` — `@scienium/config`
```
packages/config/
├── package.json      # exports: ./eslint, ./tsconfig, ./tsconfig-next
├── eslint.js
├── tsconfig.base.json
└── tsconfig.next.json
```

### `packages/shared-types/` — `@scienium/shared-types`
```
packages/shared-types/
├── package.json     # main: dist/index.js, types: dist/index.d.ts
├── tsconfig.json
├── src/
│   ├── index.ts     # Barrel export
│   ├── enums.ts     # Canonical enums (ProjectPhase, LabType, SpellType, etc.)
│   ├── paper.ts     # Paper-related shared types
│   └── pvp.ts       # PvP shared types (Spell, RaidResult, etc.)
└── dist/            # Built output (gitignored)
```
**Note:** app code sometimes imports deep paths like `@/packages/shared-types/src/pvp` (in addition to the package root).

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files / dirs | kebab-case | `route-context.ts`, `data-terminal/` |
| React components | PascalCase files & exports | `DiscoveryTree.tsx` |
| Route groups | `(parenthesized)` — URL-neutral | `(dashboard)/` |
| Prisma models | PascalCase, `@@map` snake_case tables | `model Team` → `teams` |
| Prisma fields | camelCase, `@map` snake_case cols | `teamId` → `team_id` |
| DB enums | snake_case values, `@@map` snake_case | `UserRole { student teacher admin }` |
| API routes | resource noun (collection) | `/api/papers`, `/api/pvp` |
| Typed IDs | `<resource>-<number>` in REQUIREMENTS | (planning convention, not yet in code) |
| Test files | `*.test.ts` (Vitest), `*.spec.ts` (Playwright E2E) | `rate-limit.test.ts`, `F1.spec.ts` |

---

## Import Path Aliases

- `@/` → `apps/web/` root (tsconfig paths) — used pervasively (`@/lib/db`, `@/components/ui/button`)
- `@scienium/config`, `@scienium/shared-types` → workspace package names
- Some deep imports: `@/packages/shared-types/src/*` and `@/lib/pvp/*`

---

## Key Locations Quick Reference

| Need to find... | Look in |
|-----------------|---------|
| A route handler | `apps/web/app/api/<resource>/route.ts` |
| The auth guard for a team route | `apps/web/lib/api/route-context.ts` → `requireTeamContext` |
| What a phase unlocks | `apps/web/lib/phase.ts` → `PHASE_UNLOCKS` |
| The DB schema | `apps/web/prisma/schema.prisma` |
| A Claude call | `apps/web/lib/anthropic.ts` (client) + consuming `lib/<feature>/*.ts` |
| Server secrets | `apps/web/lib/env.ts` → `serverEnv` |
| An external API client (arXiv/PubMed/OpenAlex) | `apps/web/lib/discovery/*` |
| A shared type/enum | `packages/shared-types/src/` |
| E2E test for a feature | `apps/web/e2e/F<N>.spec.ts` (organized by feature number) |
| Cron schedule | `apps/web/vercel.json` |

---

*Mapped: 2026-07-19*