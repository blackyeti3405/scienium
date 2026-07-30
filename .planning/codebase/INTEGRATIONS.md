# INTEGRATIONS.md — Scienium External Integrations

**Mapped:** 2026-07-19
**Last commit mapped:** (current HEAD)

---

## Authentication

### Clerk
- **Type:** Managed auth provider
- **SDK:** `@clerk/nextjs` ^5.3.5
- **Scope:** User sign-up/sign-in, session management, middleware route protection
- **Key files:**
  - `apps/web/middleware.ts` — route protection via `clerkMiddleware`
  - `apps/web/app/(auth)/sign-in/` — sign-in page
  - `apps/web/app/(auth)/sign-up/` — sign-up page
- **Env vars:** `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **User model:** `User.clerkUserId` links Clerk identity to app DB row

---

## Database

### Supabase PostgreSQL
- **Type:** Managed database
- **Connection:** Dual pooler — transaction pooler (port 6543, app runtime) + session pooler (port 5432, migrations)
- **Schema:** `apps/web/prisma/schema.prisma` (~60 models)
- **Key files:**
  - `apps/web/lib/db.ts` — PrismaClient singleton
  - `apps/web/lib/env.ts` — `DATABASE_URL`, `DIRECT_URL` lazy getters
- **Dev:** Docker Compose `pgvector/pgvector:pg16` on port 5432

---

## Object Storage

### Cloudflare R2
- **Type:** S3-compatible object storage
- **SDK:** `@aws-sdk/client-s3` ^3.1065.0
- **Scope:** PDF uploads, showcase assets, uploaded assets, pixel-art sprites (served via `public/`)
- **Key files:**
  - `apps/web/lib/uploads/` — upload/attach/cleanup lifecycle
  - `apps/web/lib/env.ts` — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Pattern:** Pre-signed URLs for direct upload (`@aws-sdk/s3-request-presigner`), public URLs for serving
- **Next.js config:** Images R2 domain allowed in `next.config.mjs` `remotePatterns`

---

## AI / LLM

### Anthropic Claude API
- **Type:** Paid LLM API
- **SDK:** `@anthropic-ai/sdk` ^0.104.2
- **Scope:** ALL AI features — paper quizzes, literature grading, expertise exams, research plan review, idea checks, Codex study plans, Vega study companion, PvP combat resolution
- **Key files:**
  - `apps/web/lib/env.ts` — `ANTHROPIC_API_KEY` (required)
- **Model usage pattern:** Direct API calls from Next.js API route handlers (no separate AI microservice)
- **Features powered by Claude:**
  - Literature quiz generation + grading (`PaperQuizSession`/`PaperQuizAttempt`)
  - Research plan review (`ResearchPlan.lastReviewJson`)
  - Idea novelty check (`IdeaCheck` — web-search agent via Firecrawl + Claude)
  - Expertise clearance exams (`ExpertiseExam`)
  - Codex study plan recommendations (`TeamStudyPlan` — Haiku classification)
  - Vega study companion (`VegaStudyMessage`)
  - PvP combat simulation (spec §11)

---

## Web Scraping / Search

### Firecrawl
- **Type:** Web scraping API
- **SDK:** `firecrawl` ^4.28.1
- **Scope:** Novelty search for idea checks — scrapes web sources to determine if a research idea has been done before
- **Key files:**
  - `apps/web/lib/env.ts` — `FIRECRAWL_API_KEY` (required)
- **Next.js config note:** Marked as server-only external package in `next.config.mjs`

---

## Academic Data APIs

### arXiv
- **Type:** REST API (no SDK — custom client)
- **Scope:** Scientific paper search + metadata retrieval for literature review discovery
- **Key files:**
  - `apps/web/lib/discovery/arxiv.ts`

### PubMed / NCBI E-utilities
- **Type:** REST API (no SDK — custom client)
- **Scope:** Biomedical paper search + metadata retrieval
- **Key files:**
  - `apps/web/lib/discovery/ncbi.ts`
- **Env vars:** `NCBI_EMAIL` (optional), `NCBI_API_KEY` (optional)

### OpenAlex
- **Type:** REST API (no SDK — custom client)
- **Scope:** Scholarly works catalog — shared paper cache (`ExternalWork`) for cross-team deduplication
- **Key files:**
  - `apps/web/lib/discovery/openalex.ts`
- **Env vars:** `OPENALEX_MAILTO` (optional), `OPENALEX_API_KEY` (optional)

---

## Caching & Rate Limiting

### Upstash Redis
- **Type:** Serverless Redis (REST API)
- **SDK:** Direct REST calls (no Upstash SDK)
- **Scope:** Rate limiting for LLM-intensive routes (idea check daily cap, exam generation, etc.)
- **Key files:**
  - `apps/web/lib/rate-limit.ts`
- **Env vars:** `UPSTASH_REDIS_REST_URL` (optional), `UPSTASH_REDIS_REST_TOKEN` (optional)
- **Note:** Optional — falls back to in-memory rate limiting when not configured

---

## Email

### Resend
- **Type:** Transactional email API
- **SDK:** REST API (no SDK detected)
- **Scope:** Notification emails (fair deadline reminders)
- **Env vars:** `RESEND_API_KEY` (optional), `NOTIFICATION_EMAIL_FROM` (optional)
- **Note:** Optional — email notifications disabled when not configured

---

## Geocoding

### Nominatim (OpenStreetMap)
- **Type:** Free geocoding API (no SDK)
- **Scope:** Convert ZIP codes to lat/lng for science fair proximity matching
- **Key files:**
  - `apps/web/lib/fairs/zip.ts` (ZIP → state + coordinates)
  - `apps/web/lib/fairs/match.ts` (nearest fair matching)

---

## Document Integration

### Google Docs
- **Type:** Published document text fetch
- **Scope:** Research plan syncing — paste a published Google Doc URL, fetch text server-side
- **Key files:**
  - `apps/web/lib/research-plan/google-doc.ts`
- **Pattern:** Fetch published doc text, no OAuth needed (deferred per `docs/TODO.md`)

---

## Hosting & Infrastructure

### Vercel
- **Type:** Next.js hosting platform
- **Scope:** App hosting + cron jobs
- **Key files:**
  - `apps/web/vercel.json` — cron schedule:
    - `/api/cron/papers` — paper processing every 5 minutes
    - `/api/cron/notifications` — notification dispatch at 7am daily
- **Auth:** Cron endpoints authenticated by `CRON_SECRET` header, not Clerk session

---

## Integration Dependency Map

```
User Auth:     Clerk ──────────────────────────────────────► middleware.ts
                                                            │
Database:      Supabase PostgreSQL ◄── Prisma ◄─────────────┤ API routes
                                                            │
LLM:           Anthropic Claude ◄── @anthropic-ai/sdk ◄─────┤ API routes
                                                            │
Search:        Firecrawl ◄── firecrawl SDK ◄────────────────┤ Idea Check
               arXiv ◄── lib/discovery/arxiv.ts ◄───────────┤ Discovery
               PubMed ◄── lib/discovery/ncbi.ts ◄───────────┤ Discovery
               OpenAlex ◄── lib/discovery/openalex.ts ◄─────┤ Papers
                                                            │
Storage:       Cloudflare R2 ◄── @aws-sdk/client-s3 ◄───────┤ Uploads
                                                            │
Rate Limit:    Upstash Redis ◄── lib/rate-limit.ts ◄────────┤ Heavy routes
                                                            │
Email:         Resend ◄── REST ◄────────────────────────────┤ Cron/notifications
                                                            │
Geo:           Nominatim ◄── lib/fairs/zip.ts ◄─────────────┤ Fair matching
                                                            │
Docs:          Google Docs ◄── lib/research-plan/ ◄─────────┤ Research plan
```

---

*Mapped: 2026-07-19*