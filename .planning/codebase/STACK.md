# STACK.md — Scienium Technology Stack

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## Languages & Runtime

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | TypeScript | ^5.5.4 | Strict mode via `@scienium/config` shared tsconfig |
| Runtime | Node.js | >=20 | Required by package.json engines |
| Package manager | pnpm | >=9 | Workspace-based monorepo |

---

## Monorepo Structure

```
nova-lab/
├── apps/web/          # Next.js 14 application (primary deliverable)
├── packages/
│   ├── config/        # Shared ESLint + TypeScript configs
│   └── shared-types/  # Shared Zod schemas / types (builds to dist/)
├── infra/             # Docker Compose (local Postgres + pgvector)
├── art/               # Pixel-art generator pipeline (game sprites)
├── art_ref/           # Art reference material
└── docs/              # Project documentation
```

**Workspace:** `pnpm-workspace.yaml` covers `apps/*` and `packages/*`.

---

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

**Design system:** shadcn/ui-style CSS-variable theming via Tailwind HSL vars (`--primary`, `--border`, `--radius`, etc.) in `tailwind.config.ts`. Dark mode via `class` strategy. Custom `--font-pixel` for isometric game UI. Components live in `apps/web/components/ui/`.

### State Management

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Zustand | ^4.5.5 | Lightweight client state (one store: `stores/discoveryStore.ts`) |

Most route state is server-driven (Next.js App Router data fetching + server components) — Zustand is used sparingly for cross-component client state.

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

---

## Backend (apps/web — Next.js API Routes)

### Authentication & Authorization

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Clerk | ^5.3.5 | User auth (email/password sign-up, session management, middleware) |
| `@clerk/nextjs` | ^5.3.5 | Next.js App Router integration |

**Middleware:** `apps/web/middleware.ts` — ClerkMiddleware protects all routes except `/`, auth pages, public showcase, cron endpoints, and static files.

### Database

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Prisma | ^5.18.0 | ORM — schema, migrations, type-safe client |
| PostgreSQL | 16 (via pgvector/pgvector:pg16) | Primary database |
| Supabase | (managed Postgres) | Production database with transaction + session poolers |

**Schema:** `apps/web/prisma/schema.prisma` — single-file schema with ~60 models covering users, teams, discovery, papers, research plans, buildings, PvP, fairs, showcases, experiments, Codex curriculum, and more. Uses enums mapped via `@@map()`.

### Caching & Rate Limiting

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Upstash Redis | (REST API — optional) | Rate limiting for LLM-heavy routes (`lib/rate-limit.ts`) |

### File Storage

| Dependency | Version | Purpose |
|-----------|---------|---------|
| AWS S3 SDK | ^3.1065.0 | Cloudflare R2 object storage (S3-compatible API) |
| `@aws-sdk/s3-request-presigner` | ^3.1065.0 | Pre-signed URLs for uploads |

**Storage:** Cloudflare R2 for PDF uploads, showcase assets, and uploaded assets (`lib/uploads/`). Legacy in-DB PDF blobs (`Paper.pdfData`) are being migrated to R2 (`Paper.pdfKey`).

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

AI features run directly in Next.js API routes (removed separate AI service, per `infra/docker-compose.yml` comment). Features include: paper quizzes, literature review grading, expertise exams, research plan review, idea checks, codex study plans, Vega study companion, and PvP combat resolution.

### External Data APIs

| Dependency | Version | Purpose |
|-----------|---------|---------|
| firecrawl | ^4.28.1 | Web scraping for Idea Check novelty search |

**Direct API integrations (no SDK):** arXiv (search + metadata), PubMed/NCBI (E-utilities), OpenAlex (scholarly works), Nominatim (geocoding ZIP codes for fair location matching), Google Docs (published-doc text fetch).

### Email

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Resend | (optional — REST API) | Notification emails (fair deadline reminders) |

### Video

| Dependency | Version | Purpose |
|-----------|---------|---------|
| video.js | ^8.17.1 | Video player component |

---

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

---

## Testing

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Vitest | ^4.1.9 | Unit/integration tests |
| Playwright | ^1.61.0 | End-to-end browser tests |
| `@clerk/testing` | ^2.1.5 | Clerk auth helpers for E2E |

**Test locations:**
- Unit tests: `apps/web/test/` (Vitest — `.test.ts` files)
- Unit tests in lib: inline `.test.ts` files (e.g., `lib/rate-limit.test.ts`)
- E2E tests: `apps/web/e2e/` (Playwright — `.spec.ts` files, ~25 specs)

---

## Dev Tooling

| Tool | Purpose |
|------|---------|
| ESLint | Linting (`eslint-config-next`) |
| Prettier | ^3.3.3 — code formatting |
| TypeScript | ^5.5.4 — type checking (`tsc --noEmit`) |

---

## Version Control & CI

| Tool | Purpose |
|------|---------|
| Git | Version control (current branch: `matthew/pvp-system`) |
| GitHub | Hosting (`.github/` directory present) |

---

## Key Dependencies at a Glance

```
Next.js 14 (App Router) → React 18 → Tailwind CSS 3 → shadcn/ui patterns
Prisma 5 → PostgreSQL 16 → Supabase (managed)
Clerk 5 → middleware-based auth
Anthropic SDK → Claude (all AI features)
Cloudflare R2 (S3 API) → file storage
Upstash Redis → rate limiting
Vitest + Playwright → testing
Vercel → hosting + cron jobs
```

---

*Mapped: 2026-07-19*