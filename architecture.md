# NOVA Lab — Technical Architecture

> **Companion to:** `spec.md`
> **Last Updated:** 2026-06-19
> **Target initial scale:** ~120 students, single school pilot

---

## 1. Architecture Overview

NOVA Lab is a **single-service architecture**: all UI, API routes, AI calls, and CRUD live in the Next.js app. The Python AI microservice originally planned has been removed.

1. **Web app (Next.js on Vercel)** — UI, API routes, auth (Clerk), all CRUD operations, Claude API calls (paper processing, quizzes, chat, research plan review, idea-check, fair deadline sync), and public Showcase rendering
2. **PostgreSQL (Supabase)** — single source of truth for all application state
3. **Cloudflare R2** — PDF storage (`lib/storage.ts`); all PDFs served through the authenticated `/api/papers/[id]/file` route, never via public URL

> **Current state (as of 2026-06-19):** The Python AI service has been removed. All AI work runs in Next.js API routes via `@anthropic-ai/sdk`. PDFs are stored in R2. Rate limiting (`lib/rate-limit.ts`) and input validation (`lib/validation.ts`) are applied on every route. Firecrawl is used for AI-powered deadline extraction from fair websites and is configured as a server-side external package to avoid webpack bundling `undici`.

```
┌─────────────────┐              ┌─────────────────────────┐
│   Web Browser   │              │  Public Visitors        │
│  (Auth'd users) │              │  (Showcase viewers)     │
└────────┬────────┘              └────────┬────────────────┘
         │                                │
         ▼                                ▼
┌──────────────────────────────────────────────────┐
│           Next.js App (Vercel)                    │
│   - Authenticated UI (/lab, onboarding, etc.)     │
│   - Public Showcase routes (/showcase/[slug])     │
│   - API routes (CRUD + all AI calls)              │
│   - Wikipedia / YouTube integration               │
│   - PDF parsing (unpdf, in-process)               │
│   - Claude API: all AI features                   │
│   - Firecrawl: fair deadline extraction           │
│   - Nominatim: ZIP geocoding                      │
└──────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────────────┐
│  PostgreSQL      │  │  Cloudflare R2            │
│  (Supabase prod  │  │  PDFs (private bucket;    │
│   Docker local)  │  │  served via /api route)   │
└──────────────────┘  └──────────────────────────┘
```

---

## 2. Tech Stack

### Frontend
| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR for Showcase SEO, file-based routing, React Native sharing later |
| Language | **TypeScript** | Type safety |
| Styling | **Tailwind CSS + shadcn/ui** | Fast iteration, no runtime CSS overhead |
| State | **Zustand** (client), **TanStack Query** (server state) | Lightweight |
| Visualization | **Recharts** (charts); the Discovery tree is a **custom SVG** component (`DiscoveryTree.tsx`) | No react-flow dependency — the tree layout is hand-rolled |
| Markdown | **react-markdown + remark-gfm** | Renders Nova's chat replies (styled via `.chat-md`) |
| Forms | **react-hook-form + zod** | Validation as types |
| Video player | **video.js** (Showcase); YouTube via official **IFrame embed** | Mature; YouTube embed needs no key |
| PDF viewer | Literature Review uses a native **`<iframe>`** streaming the stored PDF; `react-pdf` planned for report viewing | iframe needs no extra deps |

### Backend (Next.js side)
| Layer | Choice | Rationale |
|---|---|---|
| API | **Next.js API Routes** | Co-located with frontend |
| Auth | **Clerk** | Email/password, OAuth, sessions, parental consent flow possible |
| ORM | **Prisma** | Type-safe queries, migrations |
| Database | **PostgreSQL via Supabase** | Industry standard |
| LLM (current) | **`@anthropic-ai/sdk`** (`claude-sonnet-4-6`) | Paper metadata extraction + Literature Review Q&A tutor running directly in API routes |
| PDF parsing (current) | **`unpdf`** (Node.js) | Lightweight in-process text extraction (~250ms); replaces Python `pdfplumber` until AI service is active |
| Image processing | **sharp** | Server-side image resizing/thumbnails |

### External services (used by Next.js API routes)
| Service | Purpose |
|---|---|
| **Anthropic Claude API** (`claude-sonnet-4-6`) | Paper metadata extraction, quiz gen/grade, Q&A chat, research plan review, idea-check (w/ native web-search), fair deadline extraction |
| **Firecrawl** (`firecrawl@4.x`) | Structured data extraction from fair websites for deadline sync. Marked `serverComponentsExternalPackages` to avoid bundling `undici` |
| **Nominatim (OpenStreetMap)** | ZIP-to-lat/lng geocoding at onboarding and location update (1 req/s, User-Agent required per ToS) |
| **Wikipedia REST API** | Article fetch + OpenSearch autocomplete for Discovery |
| **YouTube oEmbed** | Title resolution for pasted YouTube links (no API key) |

### Infrastructure
| Layer | Choice | Rationale |
|---|---|---|
| App hosting | **Vercel** | Best DX for Next.js |
| Database | **Supabase** | Managed Postgres + RLS + auth helpers |
| Object storage | **Cloudflare R2** | S3-compatible, no egress fees |
| CDN | **Cloudflare** (in front of R2) | Fast global delivery |
| Monitoring | **Sentry** (errors), **PostHog** (analytics) | Free tiers |

---

## 3. Repository Structure

Single monorepo using **pnpm workspaces**.

```
nova-lab/
├── apps/
│   ├── web/                              # Next.js application
│   │   ├── app/
│   │   │   ├── (auth)/                   # Sign-in, sign-up
│   │   │   ├── (onboarding)/             # Apprentice scan, team setup
│   │   │   ├── (dashboard)/              # Authenticated layout
│   │   │   │   ├── lab/                  # Lab visualization + buildings
│   │   │   │   ├── discovery/            # Wikipedia explorer + paper explore
│   │   │   │   ├── literature/
│   │   │   │   │   ├── library/          # All papers
│   │   │   │   │   └── review/           # Active review session
│   │   │   │   ├── daily/                # Field Dispatch, Expertise, Project Log
│   │   │   │   │   ├── dispatch/
│   │   │   │   │   ├── expertise/
│   │   │   │   │   ├── log/
│   │   │   │   │   └── failure/          # Failure Log entry
│   │   │   │   ├── teams/
│   │   │   │   ├── pvp/                  # PvP combat system
│   │   │   │   │   ├── lobby/            # Initiate battle, view trophies
│   │   │   │   │   ├── team-builder/     # Select 6 characters
│   │   │   │   │   ├── battle/[id]/      # Active battle screen
│   │   │   │   │   └── leaderboard/      # Class/school/global rankings
│   │   │   │   ├── showcase/             # Showcase editor (private)
│   │   │   │   │   ├── edit/
│   │   │   │   │   └── settings/
│   │   │   │   ├── fair-hub/             # Science Fair Information Hub
│   │   │   │   │   ├── calendar/         # Personalized fair calendar
│   │   │   │   │   ├── rubric/           # ISEF rubric viewer + self-assessment
│   │   │   │   │   ├── categories/       # ISEF categories browser
│   │   │   │   │   ├── forms/            # Forms checklist
│   │   │   │   │   └── requirements/     # Project board specs
│   │   │   │   ├── social/               # Classroom feed
│   │   │   │   └── settings/
│   │   │   ├── (public)/                 # Public-facing, no auth required
│   │   │   │   ├── showcase/
│   │   │   │   │   ├── [slug]/           # Public showcase page
│   │   │   │   │   └── gallery/          # Browseable gallery
│   │   │   │   └── about/
│   │   │   ├── (teacher)/                # Teacher-only routes
│   │   │   │   ├── layout.tsx            # Enforces teacher role
│   │   │   │   ├── page.tsx              # Roster (home)
│   │   │   │   ├── student/[id]/         # Student detail view (phase-adaptive)
│   │   │   │   ├── validations/          # Figurine validation queue
│   │   │   │   ├── showcase-review/      # Showcase moderation queue
│   │   │   │   ├── settings/             # Class settings
│   │   │   │   └── reports/              # Generated reports
│   │   │   ├── api/                      # Next.js API routes
│   │   │   │   ├── onboarding/           # Creates User/Team/TeamMember after sign-up
│   │   │   │   ├── papers/               # upload/list/get/delete, + [id]/{file,chat,quiz,quiz/grade}
│   │   │   │   ├── buildings/
│   │   │   │   ├── teams/
│   │   │   │   ├── pvp/                  # Battle resolution, matchmaking, trophies
│   │   │   │   ├── discovery/            # article, search, tree[, /[id]], topic, youtube/resolve
│   │   │   │   ├── project-log/
│   │   │   │   ├── failure-log/
│   │   │   │   ├── showcase/
│   │   │   │   ├── fair-hub/             # Fair calendar, rubric, categories endpoints
│   │   │   │   ├── teacher/              # Teacher-only endpoints
│   │   │   │   │   ├── roster/
│   │   │   │   │   ├── students/[id]/
│   │   │   │   │   ├── validations/
│   │   │   │   │   ├── feedback/
│   │   │   │   │   └── showcase-review/
│   │   │   │   ├── consent/              # Parental consent flow
│   │   │   │   └── webhooks/             # Clerk, payment, etc.
│   │   │   ├── layout.tsx
│   │   │   └── sitemap.ts                # Auto-generated incl. public showcases
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn primitives
│   │   │   ├── lab/                      # Lab canvas, building cards, upgrade modal
│   │   │   ├── discovery/                # DiscoveryFeature/Home/Tree, TopicSearch, WikiReader, YouTubeViewer
│   │   │   ├── literature/
│   │   │   │   └── LiteratureFeature.tsx # 25 slots, upload, PDF viewer, graded quiz, Q&A chat
│   │   │   ├── daily/
│   │   │   │   ├── ProjectLogForm.tsx
│   │   │   │   ├── FailureLogForm.tsx
│   │   │   │   └── FailureWall.tsx       # Display documented failures
│   │   │   ├── minigames/                # 6 mini-game category components
│   │   │   ├── pvp/
│   │   │   │   ├── BattleScreen.tsx      # Main battle UI
│   │   │   │   ├── CharacterCard.tsx     # Character display with sprite + stats
│   │   │   │   ├── MoveSelector.tsx      # Pick move during battle
│   │   │   │   ├── TeamBuilder.tsx       # Select 6 from owned buildings
│   │   │   │   ├── TrophyDisplay.tsx     # Current trophies + tier badge
│   │   │   │   ├── Leaderboard.tsx       # Class/school/global rankings
│   │   │   │   └── BattleAnimator.tsx    # Turn animations
│   │   │   ├── showcase/
│   │   │   │   ├── ShowcaseEditor.tsx    # Internal editing UI
│   │   │   │   ├── ShowcaseRenderer.tsx  # Public rendering (used both internally + publicly)
│   │   │   │   ├── AssetUploader.tsx
│   │   │   │   ├── PrivacyControls.tsx
│   │   │   │   └── ConsentBanner.tsx
│   │   │   ├── fair-hub/
│   │   │   │   ├── FairCalendar.tsx      # Personalized upcoming fairs
│   │   │   │   ├── FairCard.tsx          # Single fair display
│   │   │   │   ├── RubricViewer.tsx      # ISEF rubric display
│   │   │   │   ├── RubricSelfAssessment.tsx
│   │   │   │   ├── CategoryBrowser.tsx
│   │   │   │   ├── FormsChecklist.tsx
│   │   │   │   └── DeadlineBanner.tsx    # Urgency banner
│   │   │   ├── teacher/
│   │   │   │   ├── ClassRoster.tsx       # Main roster table
│   │   │   │   ├── AttentionIndicator.tsx
│   │   │   │   ├── StudentDetailView.tsx
│   │   │   │   ├── PhaseAdapter.tsx      # Switches view based on student phase
│   │   │   │   ├── ValidationQueue.tsx
│   │   │   │   ├── ValidationCard.tsx
│   │   │   │   ├── FeedbackEditor.tsx
│   │   │   │   ├── ShowcaseReviewQueue.tsx
│   │   │   │   └── TeacherRubricRating.tsx
│   │   │   └── shared/                   # Layout, nav, modals
│   │   ├── lib/
│   │   │   ├── wikipedia.ts
│   │   │   ├── db.ts                     # Prisma client singleton
│   │   │   ├── auth.ts                   # Clerk helpers
│   │   │   ├── db.ts                     # Prisma client singleton
│   │   │   ├── phase.ts                  # Phase order, feature gates, getTeamContext()
│   │   │   ├── rate-limit.ts             # Per-user + per-IP rate limiter (tiers, 429)
│   │   │   ├── validation.ts             # parseJson() + strict zod schemas
│   │   │   ├── storage.ts                # R2: putObject, getObjectStream, paperPdfKey
│   │   │   ├── gateways.ts               # 7 gateway building configs + unlock phases
│   │   │   ├── featureRegistry.tsx        # Maps gateway key → feature component
│   │   │   ├── shop.ts                   # Economy building catalog (60 buildings)
│   │   │   ├── labCurrency.tsx            # Client context for live KP/CLR/LC display
│   │   │   ├── wikipedia.ts              # Wikipedia REST + OpenSearch helpers
│   │   │   ├── literature/
│   │   │   │   ├── quiz.ts               # QUIZ_QUESTION_COUNT, QUIZ_PASS_THRESHOLD
│   │   │   │   └── quiz-rubric.md        # Grading rubric (tunable without code changes)
│   │   │   ├── research-plan/
│   │   │   │   ├── google-doc.ts         # Fetch published Google Doc text
│   │   │   │   ├── rubric.ts             # Compose track + subtype rubric from .md files
│   │   │   │   ├── idea-check.ts         # Web-search idea-check streaming logic
│   │   │   │   ├── types.ts              # ResearchPlan shared types
│   │   │   │   └── rubrics/              # _science.md, _engineering.md, biology.md, ...
│   │   │   ├── fairs/
│   │   │   │   ├── dataset.ts            # 268-entry seed (ISEF + 40 state + 227 regional)
│   │   │   │   ├── match.ts              # ensureFairsSeeded(), matchFairs()
│   │   │   │   ├── zip.ts                # zipToState(), geocodeZip(), haversineMiles()
│   │   │   │   ├── forms.ts              # 12 ISEF forms catalog + requiredFor
│   │   │   │   ├── categories.ts         # 22 ISEF categories
│   │   │   │   └── isef-rubric.ts        # ISEF rubric structured for display
│   │   │   └── team/
│   │   │       ├── advance.ts            # getLiteratureAdvanceProgress() phase gate
│   │   │       └── invite.ts             # generateInviteCode() helpers
│   │   ├── hooks/
│   │   ├── stores/                       # Zustand stores
│   │   └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   ├── shared-types/                     # Types shared across the workspace
│   └── config/                           # Shared ESLint, Prettier, tsconfig bases
│
├── infra/
│   ├── docker-compose.yml                # Local dev environment
│   └── seed/
│       ├── lab_types.ts
│       ├── buildings.ts                  # All 60 buildings as seed data
│       ├── characters.ts                 # 60 PvP characters (mapped 1:1 to buildings)
│       ├── moves.ts                      # ~50 PvP moves across 3 types
│       ├── fairs.ts                      # Initial fair database (regional, state, ISEF)
│       ├── isef_categories.ts            # 22 ISEF categories
│       └── starter_content.ts            # Curated starter Field Dispatch entries
│
├── docs/
│   ├── spec.md
│   ├── architecture.md
│   └── decisions/                        # ADRs
│
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 4. Database Schema (High Level)

```
# Users & Org
users                 id, clerk_user_id, name, email, school_id, class_id,
                      role (student | teacher | admin), is_minor, created_at
schools               id, name, admin_id
classes               id, school_id, name, teacher_id
parental_consents     id, user_id, consent_type, granted_at, revoked_at, evidence_url

# Teams (solo students get a "team of 1")
teams                 id, name, team_lead_id, lab_type, topic,
                      phase (discovery | lab_selection | literature_review |
                             research_planning | working | showcase),
                      max_members (default 3), location_zip, location_state,
                      created_at
team_members          user_id, team_id, role (lead | member), joined_at
team_invites          id, code (unique), team_id, created_by_user_id, expires_at,
                      used_by_user_id, used_at, created_at
                      # Single-use join codes; POST /api/team/join enforces max_members

# Discovery   (the final research topic lives on teams.topic)
discovery_nodes       id, team_id, parent_id, source_type (wikipedia | youtube | paper),
                      wikipedia_title | youtube_video_id | youtube_title | paper_id,
                      starred, visited_by_user_id, visited_at
topic_interests       id, team_id, text, created_by_user_id, created_at

# Literature
papers                id, team_id, title, authors, abstract, source_type (pdf | text),
                      file_url, content_hash, full_text, pdf_key (R2 object key),
                      pdf_data (legacy bytes fallback), status,
                      uploaded_by_user_id, created_at
                      # proficiency_demonstrated / kp_awarded retained one release as a
                      # backfill fallback — superseded by paper_proficiency (per-student)
paper_proficiency     paper_id, user_id, demonstrated, best_score, kp_awarded, updated_at
                      # @@id([paper_id, user_id]) — each member demonstrates + earns
                      # KP (max 100/source) independently; backfilled from passing quizzes
paper_chat_messages   id, paper_id, user_id, role, content, created_at
paper_quiz_sessions   id, paper_id, user_id, questions_json, score, passed,
                      graded_at, created_at
paper_quiz_attempts   id, session_id, paper_id, user_id, question, response,
                      evaluation, score, created_at
paper_relevance_notes paper_id, user_id, response, created_at

# Research Plan (Engineering/Science plan review + originality check)
research_plans        team_id (PK), google_doc_url, project_type, project_subtype,
                      last_synced_text, last_synced_at,
                      last_review_json, last_reviewed_at,
                      last_idea_check_json, last_idea_check_at
                      # One per team; the review + idea-check results are the current
                      # values, replaced on each re-run so they persist across reloads
idea_checks           id, team_id, user_id, verdict, findings_json, created_at
                      # Per-day rate-limit ledger (3/day per team)

# Lab
gateway_buildings     id, key (discovery | literature_review | research_plan |
                      operations_hub | science_fair | showcase | pvp),
                      display_name, feature_route, unlock_phase, is_central,
                      sort_order
                      # Fixed config/seed (7 rows). NOT per-team and NOT purchasable.
                      # Per-team visibility derives from teams.phase >= unlock_phase;
                      # per-team skin derives from teams.lab_type. No per-team rows needed.
buildings             id, lab_type, name, role (starter | standard | premium),
                      description, mini_game_category
team_buildings        id, team_id, building_id, current_level,
                      last_upgraded_by_user_id, last_upgraded_at

# Currency
team_currency         team_id, kp, clearance_level, lc, updated_at

# Daily
field_dispatch_content    id, lab_type, body, reflection_question, published_date
field_dispatch_responses  id, user_id, content_id, response, kp_awarded, created_at
expertise_attempts        id, user_id, clearance_level_at_attempt, question,
                          response, passed, created_at
project_logs              id, team_id, entry_type (progress | failure), stage, body,
                          artifact_url, created_by_user_id, created_at
project_log_followups     id, project_log_id, question, response, created_at
project_log_references    id, project_log_id, references_log_id  # Resilience Bonus link

# Mini-games
mini_game_plays       id, user_id, team_id, building_id, score, kp_awarded, played_at

# Figurines
figurine_unlocks      id, user_id, figurine_tier, lab_type_variant, qr_token, unlocked_at

# Showcase
showcases             id, team_id, slug (unique), title, abstract, privacy_level,
                      published_at, last_edited_at, moderation_status
showcase_assets       id, showcase_id, asset_type (script | board | video | visual |
                      report | repo_link), file_url, metadata_json, uploaded_at
showcase_views        id, showcase_id, visitor_fingerprint, viewed_at
                      # Analytics-grade, not strict tracking

# Science Fair Hub
fairs                 id, name, level (school | regional | state | international | affiliated),
                      state, county, country, website_url, parent_fair_id,
                      latitude, longitude, seed_key (unique)
                      # lat/lng + seed_key support nearest-fair matching + idempotent
                      # upsert of the affiliated-fair dataset (lib/fairs/dataset.ts)
fair_events           id, fair_id, year, event_date, registration_deadline,
                      abstract_deadline, venue, status (confirmed | estimated),
                      previous_year_event_id
fair_user_associations  user_id, fair_id, is_primary, registered_at
rubric_versions       id, fair_id, year, rubric_json
rubric_criteria       id, rubric_version_id, name, description, max_score,
                      checklist_items_json
rubric_self_assessments  id, team_id, rubric_criterion_id, score, notes,
                      assessed_by_user_id, assessed_at
isef_categories       id, name, description, example_subtopics_json,
                      recommended_lab_type
forms_catalog         id, name, form_code, required_for_levels_json,
                      template_url, description
team_form_status      id, team_id, form_id, status (not_started | in_progress | complete),
                      completed_at

# PvP Combat System
characters            id, building_id, name, type (empirical | theoretical | applied),
                      base_hp, base_atk, base_def, base_spd,
                      sprite_1_url, sprite_2_url
moves                 id, name, type, base_damage, accuracy, pp,
                      secondary_effect_json, flavor_text
character_moves       character_id, move_id, level_learned
pvp_teams             id, team_id, character_slots_json (6 building_ids),
                      updated_at
pvp_battles           id, attacker_team_id, defender_team_id, phase, started_at,
                      ended_at, winner_team_id, trophies_delta_attacker,
                      trophies_delta_defender, battle_log_json
pvp_trophies          team_id, current_trophies, tier (bronze | silver | gold |
                      platinum | diamond | master), season, updated_at
pvp_battle_quota      team_id, date, battles_used  # enforces 2-per-day cap

# Teacher Dashboard (DEFERRED — post-pilot)
teacher_class_assignments  id, teacher_user_id, class_id, role (primary | co_teacher),
                           assigned_at
teacher_validations        id, team_id, validation_type (analyst | experimenter |
                           presenter | pioneer), status (pending | approved |
                           rejected | changes_requested), submitted_at,
                           reviewed_by_user_id, reviewed_at, notes,
                           evidence_snapshot_json
teacher_feedback           id, team_id, target_type (paper | project_log |
                           failure_log | lab_note | showcase), target_id,
                           body, created_by_user_id, created_at, resolved
showcase_review_queue      id, showcase_id, status (pending | approved |
                           changes_requested | rejected), flagged_reasons_json,
                           reviewed_by_user_id, reviewed_at, decision_notes

# Social / Feed
activity_feed         id, team_id, user_id, action_type, payload_json, created_at
```

---

## 5. Key Service Interactions

### Onboarding flow
1. After Clerk sign-up, a user with no team is redirected to `/onboarding` (enforced in the dashboard layout)
2. The form offers **Create a lab** or **Join a lab**:
   - *Create* `POST`s name + lab/team name + optional US ZIP to `/api/onboarding`, which idempotently creates the `User`, `Team` (seeded at `literature_review`, `location_state` derived from ZIP), and `TeamMember` (lead) rows
   - *Join* `POST`s name + a join code to `/api/team/join`, which creates the `User` if needed and adds a `TeamMember` to the invited team (capacity re-checked atomically)
3. User is redirected to `/dashboard`

### Team invite / join flow
1. The lead opens the **Team panel** (status-strip team name) and `POST /api/team/invite` mints a single-use `team_invites` code (7-day expiry; refused at capacity)
2. Another student redeems it via `/onboarding` (Join) or directly → `POST /api/team/join`, which validates the code, re-checks `max_members` in a transaction, creates the membership, and burns the code
3. `GET /api/team` backs the panel (roster, capacity, the lead's active code, and the phase-advance gate)

### Paper upload flow (Lit Review) — current implementation
1. Client uploads PDF via `POST /api/papers` (multipart/form-data)
2. Next.js API route extracts text locally with `unpdf` (server-side, in-process, ~250ms, no Python service); the raw PDF bytes are stored in `papers.pdf_data`
3. `papers` row created with `status = processing`; extracted text stored in `full_text`; `file_url` points at `/api/papers/[id]/file` (an authenticated streaming route that serves the stored PDF inline to the viewer)
4. Async Claude call (`claude-sonnet-4-6`) extracts `{ title, authors, abstract }` from the first ~24k chars; paper marked `ready`
5. Client polls `GET /api/papers/[id]` every 3 seconds until `status = ready`

### Quiz flow (Lit Review) — proficiency gate
1. Opening a paper's Q&A panel calls `GET /api/papers/[id]/quiz`; if a graded session exists its results load, otherwise `POST /api/papers/[id]/quiz` generates a fresh quiz
2. Generation: Claude reads the paper (prompt-cached) + the rubric (`lib/literature/quiz-rubric.md`) and returns N free-response questions, each with a server-only grading key, stored in `paper_quiz_sessions.questions_json`
3. The student answers in natural language; `POST /api/papers/[id]/quiz/grade` grades all answers in one call against the keys + rubric, writes per-question rows to `paper_quiz_attempts`, sets the session score/passed, and on pass **upserts the current user's `paper_proficiency` row** (demonstrated + per-student KP high-water mark, max 100/source). KP is per student but accrues into the shared `team_currency` total shown identically to all members
4. After grading, the panel exposes a **Discuss with Nova** chat tab; messages persist to `paper_chat_messages` via `GET/POST /api/papers/[id]/chat` (paper text prompt-cached). The chat no longer grants proficiency — the quiz owns it.

### Phase-advance gate flow (literature_review → research_planning)
1. `lib/team/advance.ts#getLiteratureAdvanceProgress` computes readiness: 25 sources `ready` AND **every** member `demonstrated` on all 25 (per-student `paper_proficiency`)
2. The lab scene renders a `PhaseAdvance` banner with live progress ("18/25 sources · 2/3 members ready"); when satisfied it offers an advance button
3. `POST /api/team/advance-phase` re-runs the gate server-side and bumps `teams.phase`; the scene refreshes (the Research Plan gateway appears)

### Research Plan flow (Engineering/Science)
1. Student picks a project type + subtype and pastes an "anyone with the link" Google Doc URL; `POST /api/research-plan` fetches the published text (`lib/research-plan/google-doc.ts`) and stores it on `research_plans` ("Refresh" re-syncs)
2. **Review:** `POST /api/research-plan/review` streams a structured critique (NDJSON) graded against the composed rubric (`_<type>.md` + `<subtype>.md`, prompt-cached on the doc); the assembled review is saved to `last_review_json` and replaces the prior one
3. **Idea check:** `POST /api/research-plan/idea-check` runs Claude with the native web-search tool (`web_search_20260209`), streaming each search + sources live; verdict/findings save to `last_idea_check_json` (and an `idea_checks` ledger row for the 3/day-per-team limit), replacing the prior result

### Science Fair matching flow
1. At onboarding or `POST /api/team/location`, `geocodeZip()` (`lib/fairs/zip.ts`) calls Nominatim for the ZIP → stores `teams.location_lat` / `teams.location_lng`
2. `GET /api/fairs/match` reads the team's stored coords + state and calls `matchFairs(state, coords)` in `lib/fairs/match.ts`
3. `ensureFairsSeeded()` lazily upserts the 268-entry dataset (`lib/fairs/dataset.ts`) into `fairs`/`fair_events` (idempotent by `seed_key`); ordering is ISEF → state → regional so parent FK always exists before child
4. `matchFairs` sorts all regional fairs in the state by Haversine distance from the stored team coordinates (falls back to state centroid if no coords stored); returns nearest regional + state fair + ISEF
5. `POST /api/fairs/[id]/sync-deadlines` calls Firecrawl with the fair's `website_url` to extract dates into a `fair_events` row marked `estimated`

### YouTube deep-dive flow (Discovery)
1. In YouTube mode, a pasted link (or ⌘V) calls `POST /api/discovery/youtube/resolve`, which extracts the video id and fetches the title via public **oEmbed** (no API key, no quota)
2. The video is added to the team's `discovery_nodes` tree as a child of the current node (`source_type = youtube`) and persisted via `POST /api/discovery/tree`; it plays in an embedded IFrame
3. Wikipedia and YouTube nodes share one team-scoped forest; the final research topic is saved to `teams.topic` via `POST /api/discovery/topic`

**Planned migration** (once Python AI service is active):
- R2 for file storage; `papers.file_url` points at signed R2 URLs instead of the in-DB stream
- Quiz generation + evaluation optionally moved into the Python worker (`/papers/process`, `/papers/quiz`)

### Failure Log entry flow
1. User opens Failure Log form
2. Structured prompts presented (prediction, actual, hypothesis, next steps)
3. Required artifact uploaded
4. Submit → `/api/failure-log` → row written in `project_logs` with `entry_type = failure`
5. AI service evaluates for specificity, returns follow-up questions if generic
6. If user explicitly references a prior log, write to `project_log_references` and award Resilience Bonus

### Showcase publish flow
1. Team navigates to `/showcase/edit` (requires Presenter figurine unlocked)
2. Editor surfaces all uploaded assets; team fills in title/abstract/tags
3. Asset uploads use signed R2 URLs — client uploads directly to R2, not through Next.js (critical for video)
4. Video uploads trigger transcoding job in AI service → produces normalized MP4 + thumbnail
5. On publish: privacy level selected; if `public` and any team member is a minor, parental consent check runs
6. Without consent, publish blocked; consent request sent to parent email
7. On consent grant, `showcases.privacy_level = public`, `moderation_status = pending_review`
8. Moderation: auto-checks run; flagged items go to teacher dashboard
9. Once approved: showcase live at `/showcase/[slug]`; sitemap regenerated

### Public Showcase view flow
1. Visitor hits `/showcase/[slug]` (no auth required)
2. Next.js SSR queries `showcases` with privacy check; serves 404 if not public/link-only
3. Renders with Open Graph meta tags, structured data, video player
4. Assets served from R2 + Cloudflare CDN — fast even globally
5. View counter increments via lightweight beacon to `/api/showcase/[slug]/view`

### Fair Hub deadline notification flow
1. Vercel Cron runs daily
2. Job queries `fair_events` for events with upcoming deadlines (registration, abstract, event date)
3. Cross-references `fair_user_associations` to identify affected users
4. For each user, computes urgency by comparing `project_logs` activity against time remaining
5. Generates notifications: routine deadline reminders for confirmed events, urgency warnings for stale projects, fallback estimates for events without confirmed dates
6. Writes notifications to `notifications` table; in-app banner reads from this on next user visit
7. Optional email digest sent for high-urgency items via Resend

### Teacher roster load flow
1. Teacher loads dashboard home
2. Single API call to `/api/teacher/roster?class_id=X`
3. Backend query joins `users`, `teams`, `team_currency`, `project_logs` (latest), `teacher_validations` (pending), `showcase_review_queue` (pending) to compute per-student:
   - Current phase (derived from team state)
   - Phase progress (papers reviewed, log streak, etc.)
   - Last activity timestamp
   - Active attention flags
4. Result returned as one denormalized list — no per-student requests
5. Detail views fetched lazily when teacher clicks a row

### Teacher validation flow
1. Student progresses to a figurine-qualifying state (e.g., completes hypothesis + research stage for Analyst)
2. Trigger writes to `teacher_validations` with `status = pending` and snapshot of evidence
3. Teacher's roster shows attention indicator; Validations tab badge increments
4. Teacher opens validation, reviews evidence, decides
5. On approval: `figurine_unlocks` row created; in-app notification to student; figurine fulfillment (physical or digital) triggered
6. On rejection or changes_requested: student receives in-app notification with teacher's notes

> **Note:** During the pilot, the above flow is bypassed. Teachers physically validate progress and hand over figurines directly; students scan the QR code to unlock features.

### PvP battle flow (async, pilot)
1. Player initiates battle from `/pvp/lobby`
2. Server checks `pvp_battle_quota` — if already used 2 today, blocks request
3. Server runs matchmaking: pulls candidates from `pvp_teams` in same phase + sub-bucket with closest trophy count
4. Selected opponent's team composition snapshotted; AI heuristic chosen for opponent's actions
5. Battle resolves turn-by-turn:
   - Client submits action (move or switch)
   - Server validates legality, runs combat math, returns result + animation cues
   - State persisted to `pvp_battles.battle_log_json`
6. On battle end:
   - Winner/loser determined
   - Trophy delta calculated based on opponent's trophy count
   - `pvp_trophies` updated for both teams
   - `pvp_battle_quota` incremented for initiator
7. Result screen shown to player with trophy change, replay option

---

## 6. Feature File Map

Quick reference for debugging each feature without scanning the whole repo. For each feature: UI component → API routes → lib modules → DB tables touched.

### Onboarding / Team setup
| Layer | File |
|---|---|
| UI | `app/(onboarding)/onboarding/page.tsx` |
| API (create) | `app/api/onboarding/route.ts` |
| API (join) | `app/api/team/join/route.ts` |
| API (invite code) | `app/api/team/invite/route.ts` |
| API (roster/panel) | `app/api/team/route.ts` |
| API (location) | `app/api/team/location/route.ts` |
| Lib | `lib/fairs/zip.ts` — `geocodeZip()`, `zipToState()` |
| DB | `users`, `teams`, `team_members`, `team_invites` |

### Lab scene & navigation
| Layer | File |
|---|---|
| UI (scene) | `components/lab/LabScene.tsx` |
| UI (sprites) | `components/lab/BuildingSprite.tsx`, `Sprite.tsx`, `TileBackground.tsx` |
| UI (overlay shell) | `components/lab/FeaturePanel.tsx` |
| UI (status bar) | `components/lab/StatusStrip.tsx` |
| UI (team panel) | `components/lab/TeamPanel.tsx` |
| UI (shop) | `components/lab/ShopPanel.tsx` |
| UI (phase gate) | `components/lab/PhaseAdvance.tsx` |
| Lib | `lib/gateways.ts`, `lib/shop.ts`, `lib/featureRegistry.tsx`, `lib/phase.ts` |
| API (buildings) | `app/api/buildings/route.ts` |
| DB | `gateway_buildings`, `team_buildings`, `team_currency` |

### Currency (KP / CLR / LC)
| Layer | File |
|---|---|
| UI context | `lib/labCurrency.tsx` (React context, live ticker in StatusStrip) |
| KP awarded | `app/api/papers/[id]/quiz/grade/route.ts` (upserts `team_currency.kp`) |
| DB | `team_currency` |

### Discovery
| Layer | File |
|---|---|
| UI | `components/discovery/DiscoveryFeature.tsx`, `DiscoveryHome.tsx`, `DiscoveryTree.tsx` |
| UI (Wikipedia) | `components/discovery/WikiReader.tsx`, `TopicSearch.tsx` |
| UI (YouTube) | `components/discovery/YouTubeViewer.tsx` |
| API (article) | `app/api/discovery/article/route.ts` — fetches + sanitizes Wikipedia HTML |
| API (search) | `app/api/discovery/search/route.ts` |
| API (tree) | `app/api/discovery/tree/route.ts`, `app/api/discovery/tree/[id]/route.ts` |
| API (topic) | `app/api/discovery/topic/route.ts` |
| API (YouTube) | `app/api/discovery/youtube/resolve/route.ts` |
| Lib | `lib/wikipedia.ts` |
| DB | `discovery_nodes`, `teams.topic` |

### Literature Review
| Layer | File |
|---|---|
| UI | `components/literature/LiteratureFeature.tsx` (25 slots, upload, PDF viewer, quiz, chat) |
| API (list/upload) | `app/api/papers/route.ts` |
| API (get/delete) | `app/api/papers/[id]/route.ts` |
| API (PDF stream) | `app/api/papers/[id]/file/route.ts` — streams from R2 |
| API (quiz gen) | `app/api/papers/[id]/quiz/route.ts` |
| API (quiz grade) | `app/api/papers/[id]/quiz/grade/route.ts` — awards KP per student |
| API (chat) | `app/api/papers/[id]/chat/route.ts` |
| Lib | `lib/literature/quiz.ts`, `lib/literature/quiz-rubric.md`, `lib/storage.ts` |
| DB | `papers`, `paper_proficiency`, `paper_quiz_sessions`, `paper_quiz_attempts`, `paper_chat_messages` |

### Phase advance gate (lit → research planning)
| Layer | File |
|---|---|
| UI | `components/lab/PhaseAdvance.tsx` |
| API | `app/api/team/advance-phase/route.ts` |
| Lib | `lib/team/advance.ts` — `getLiteratureAdvanceProgress()` |
| DB | `teams.phase`, `paper_proficiency`, `papers` |

### Research Plan
| Layer | File |
|---|---|
| UI | `components/research-plan/ResearchPlanFeature.tsx` |
| API (sync/save) | `app/api/research-plan/route.ts` |
| API (review) | `app/api/research-plan/review/route.ts` — streams NDJSON critique |
| API (idea-check) | `app/api/research-plan/idea-check/route.ts` — streams web-search results |
| Lib | `lib/research-plan/google-doc.ts`, `lib/research-plan/rubric.ts`, `lib/research-plan/idea-check.ts`, `lib/research-plan/rubrics/` |
| DB | `research_plans`, `idea_checks` |

### Science Fair Hub
| Layer | File |
|---|---|
| UI (main) | `components/fair/ScienceFairFeature.tsx` |
| UI (categories) | `components/fair/CategoryBrowser.tsx` |
| UI (forms) | `components/fair/FormsChecklist.tsx` |
| API (match) | `app/api/fairs/match/route.ts` — returns regional + state + ISEF |
| API (deadline sync) | `app/api/fairs/[id]/sync-deadlines/route.ts` — Firecrawl extraction |
| API (forms list) | `app/api/fairs/forms/route.ts` |
| API (form update) | `app/api/fairs/forms/[formId]/route.ts` |
| Lib (dataset) | `lib/fairs/dataset.ts` — 268-entry seed array |
| Lib (matching) | `lib/fairs/match.ts` — `ensureFairsSeeded()`, `matchFairs()` |
| Lib (geo) | `lib/fairs/zip.ts` — `geocodeZip()`, `zipToState()`, `haversineMiles()` |
| Lib (forms) | `lib/fairs/forms.ts` — 12-form catalog |
| Lib (categories) | `lib/fairs/categories.ts` — 22 ISEF categories |
| Lib (rubric) | `lib/fairs/isef-rubric.ts` |
| DB | `fairs`, `fair_events`, `team_form_status`, `isef_categories` |
| DB (team coords) | `teams.location_lat`, `teams.location_lng`, `teams.location_zip`, `teams.location_state` |

### Security middleware (applied to all routes)
| Layer | File |
|---|---|
| Auth gate | `middleware.ts` — Clerk session check on all non-public routes |
| Rate limiting | `lib/rate-limit.ts` — `enforceRateLimit(req, tier, userId)` |
| Input validation | `lib/validation.ts` — `parseJson(req, schema)` with strict zod |

---

## 7. Scalability Considerations

### Current scale (120 students)
- Single Postgres instance, no replicas
- No caching layer beyond Vercel's defaults
- Public Showcase traffic likely the largest unknown — Cloudflare CDN handles it transparently

### When to scale up
| Trigger | Action |
|---|---|
| Running >1 app instance (serverless / autoscaled) | Rate-limit counters are in-memory per instance — move them to a shared store (Upstash Redis / Cloudflare KV / Durable Objects) and/or enforce at the Cloudflare edge (Rate Limiting Rules) for an exact global limit. See §8.1. |
| >1k concurrent authenticated users | Add Redis cache for Wikipedia article fetches and read-heavy endpoints |
| >100k showcase views/day | Tune Cloudflare cache headers; preload popular pages with ISR |

### Cost ceiling for pilot
| Service | Estimated monthly cost |
|---|---|
| Vercel (Hobby/Pro) | $0–20 |
| Supabase (Pro) | $25 |
| Cloudflare R2 + CDN | ~$5–15 (depends on Showcase video traffic) |
| Clerk | $0 (free up to 10k MAU) |
| Anthropic Claude API | ~$200–400 across pilot semester |
| Firecrawl | $0–20 (depends on deadline sync usage) |
| **Total estimate** | **~$230–480 / month at pilot scale** |

---

## 8. Security & Privacy

### 8.1 Application security (API hardening)

Defense-in-depth on every API route, following OWASP API Top 10. The primitives live in two shared modules so the rules stay consistent:

- **Rate limiting** — `apps/web/lib/rate-limit.ts`. Every route calls `enforceRateLimit(req, tier, userId)` and returns a graceful **429 with `Retry-After`** when exceeded. Tiers (per-minute): `ai` 12, `upload` 8, `mutate` 40, `read` 120, `join` 10. It checks **both a per-user and a per-IP bucket** — the per-user bucket is the precise limit; the per-IP bucket is a generous `×12` backstop so a whole classroom behind one school NAT IP isn't locked out. This protects the Claude-backed endpoints specifically (each call costs money), and `join` is kept tight to blunt invite-code brute-forcing. The domain cap of **3 idea-checks/day per team** still applies on top.
  - **Topology caveat:** counters are **in-memory, i.e. per server instance** (Redis/queue were removed from the stack). On a single long-lived Node server this is exact. On multi-instance/serverless the effective limit becomes `limit × instances` — see §6 for the upgrade path (Cloudflare edge Rate Limiting Rules, and/or a shared store: Upstash Redis / Cloudflare KV / Durable Objects). Only the store inside `hit()` changes; call sites don't.
- **Input validation** — `apps/web/lib/validation.ts`. Body-accepting routes parse with `parseJson(req, schema)` against **strict** zod schemas: type checks, length caps (names ≤80, chat ≤60 msgs × 8k chars, quiz answers ≤50 × 5k, etc.), and `.strict()` so unexpected fields are **rejected** (mass-assignment defense). Malformed JSON returns a clean 400 instead of an unhandled 500.
- **Secret handling** — Anthropic and R2 keys are read **server-side only** (no `NEXT_PUBLIC_*`), so nothing secret is ever bundled to the browser. Error responses return generic messages; internal error text (`String(err)`) is logged server-side only, never sent to the client.
- **Upload safety** — PDF uploads are capped at **20 MB** and verified by **`%PDF-` magic bytes** (the client-declared MIME type is not trusted). (Note: NOT antivirus-scanned — add ClamAV/an upstream scanner before accepting untrusted public uploads at scale.)
- **Untrusted HTML** — Wikipedia article HTML (publicly editable) is rendered via `dangerouslySetInnerHTML` in `WikiReader`, so `app/api/discovery/article` runs it (and the page title) through **`sanitize-html`** with a strict tag/attribute allowlist before returning it — the regex passes there are cosmetic, not the security boundary.
- **Authz** — Clerk middleware gates all non-public routes; every handler independently re-checks `auth()` and scopes each query by `teamId` (no object reads across teams). Phase-gated endpoints additionally call `assertFeatureUnlocked` (§8).

### 8.2 Data & privacy

- FERPA/COPPA compliance for minor students; parental consent required for public Showcase publishing
- PII isolated in `users` table; activity feed and social view use names only with consent
- Team data isolation is enforced in application queries (every read/write is scoped by `teamId`); enabling Postgres/Supabase RLS as a DB-level backstop is recommended
- Private assets (paper PDFs) live in **private R2** and are streamed through the authenticated, team-scoped `/api/papers/[id]/file` route — **never** a public or signed URL. Signed/public URLs are reserved for public Showcase assets only.
- QR codes on figurines are signed tokens (HMAC), not raw IDs
- Public Showcase visitor tracking is privacy-respecting (no third-party trackers, no PII)

---

## 9. Phase Gating System

### 9.1 Single source of truth

`apps/web/lib/phase.ts` exports all phase-gating logic. Both UI components and API route handlers import from this file — never define feature availability in two places.

Key exports:

| Export | Purpose |
|---|---|
| `PHASE_ORDER` | Ordered array of all phase keys |
| `isPhaseAtLeast(current, required)` | Range check for phase comparisons |
| `getUnlockedFeatures(phase)` | Full feature set available at a phase (cumulative) |
| `isFeatureUnlocked(phase, feature)` | Boolean gate used by nav components |
| `assertFeatureUnlocked(phase, feature)` | Throws `PhaseGateError` (403) for API routes |
| `getLabSize(phase)` | Returns `'small'` or `'grown'` for lab visual |
| `getTeamContext(clerkUserId)` | DB lookup: returns `{ teamId, phase, labType }` |

### 9.2 Enforcement layers

Gating is enforced in **two independent layers** — client-only gating is never sufficient:

**Layer 1 — UI/Nav** (`components/shared/DashboardNav.tsx`, `components/lab/LabCanvas.tsx`):
- Locked nav items rendered as non-interactive divs with a pixel padlock icon
- Wing tiles in the lab canvas are non-clickable for locked features
- Phase badge displayed in the nav and lab header

**Layer 2 — Server-side API routes** (`app/api/*/route.ts`):
- Every handler for a phase-gated endpoint calls `assertFeatureUnlocked(ctx.phase, feature)`
- Returns HTTP 403 with a descriptive error message if the team's phase is insufficient
- `getTeamContext()` is called once per handler to resolve phase from DB

### 9.3 Phase transitions

Phase transitions are explicit server-side actions (not automatic). A team's `phase` field is updated only by dedicated transition endpoints that re-run the gate server-side before bumping the phase.

- **literature_review → research_planning** is built: `POST /api/team/advance-phase` calls `lib/team/advance.ts` and requires **25 sources uploaded AND every member proficient (per-student `paper_proficiency`) on all 25**. The lab scene's `PhaseAdvance` banner surfaces live progress and the advance affordance. Bigger teams take proportionally more total work to advance, balancing the extra KP they earn.
- Other transitions' gates (e.g. lab_type set before leaving lab_selection) are not yet built.

Phases cannot be skipped.

### 9.4 Pixel-art visual system

The lab home (`/lab`) replaces the old dashboard as the spatial navigation hub. Navigation feels like "entering buildings" rather than switching tabs: the scene is a pixel-art plot, and **each feature is reached by clicking its building**, which opens that feature's panel as an overlay. There is no persistent tab bar.

**Two building classes (see spec §9.1):**
- **Gateway buildings** — 7 fixed structures that *are* the navigation. Seeded via `gateway_buildings`; rendered by `LabCanvas`. Visibility derives from `teams.phase >= unlock_phase`; skin derives from `teams.lab_type`. The Operations Hub (`is_central = true`) renders at plot center once unlocked.
- **Economy buildings** — the 60 purchasable/upgradeable buildings (`buildings` / `team_buildings`), rendered as additional sprites on the grown plot after specialization.

**Lab visual variables:**
- `size`: `small` (discovery + lab_selection phases) | `grown` (all later phases)
- `skin`: `generic` grey/teal (before lab type selection) | one of 6 lab types (after). **Only gateway buildings reskin**; the background/environment is constant for the pilot.

**Implementation files:**

| File | Purpose |
|---|---|
| `lib/sprites/manifest.ts` | All sprite definitions — path, dimensions, scale, placeholder color |
| `components/lab/Sprite.tsx` | Renders PNG with `image-rendering: pixelated`; falls back to labeled colored div |
| `components/lab/LabCanvas.tsx` | Lab hub: renders gateway + economy building sprites by phase/lab_type, handles click-to-open-panel, phase progress dots |
| `components/lab/FeaturePanel.tsx` | Overlay shell a building opens into; pixel-art frame |

**Asset spec for artists:**
- **Resolution intent:** deliberately **more pixelated / lower-res than the design reference images** (those are HD pixel art). Favor fewer, larger pixels and a tight palette.
- **Generic base palette:** lavender/grey structure, cyan-teal glass, warm orange accents. **Six reskin palettes** (one per lab type) per spec §20.4.
- Gateway building sprites: `public/sprites/gateways/{key}_{skin}.png` where `key ∈ {discovery, literature_review, research_plan, operations_hub, science_fair, showcase, pvp}` and `skin ∈ {generic, biocore, chemworks, volt_lab, terrabase, mindframe, axiom}` → 7 × 7 = 49 sprites at full coverage (start with `generic` set + one lab type for the vertical slice).
- Lab plot/size sprites: `public/sprites/lab/plot_{small,grown}.png`
- Source dimensions: target **32×32 px** building tiles (down from 48×32), displayed at 3–4× scale; keep palette to **16 colors** where possible. Confirm final grid with the artist.
- UI sprites: `public/sprites/ui/padlock_closed.png`, `padlock_open.png` — 16×16 px at 2× scale
- Pixel font: `Press Start 2P` (Google Fonts) via `--font-pixel` CSS variable; applied with `.font-pixel` class

> **Provisional:** gateway building names are placeholders (must not be "laboratory"); Operations Hub and Science Fair unlock timing are open (spec §19).

---

## 10. Deployment & Environments

| Environment | Purpose | Hosting |
|---|---|---|
| Local | Developer machines | Docker Compose (Postgres only) |
| Staging | Internal testing | Vercel Preview + Supabase |
| Production | Pilot | Vercel + Supabase + R2 |

CI/CD via GitHub Actions: lint → typecheck → test → preview deploy.

---

## 11. Open Technical Questions

- [ ] Real-time strategy for team feeds — polling until pain, or Supabase Realtime from day one
- [ ] Showcase: video transcoding — in-house ffmpeg vs. Mux / Cloudflare Stream
- [ ] Showcase moderation: auto-only vs. always human-reviewed for public publish
- [ ] Caching strategy for Wikipedia articles
- [ ] Lab canvas: fixed pre-placed building slots vs. data-driven layout engine for positioning gateway + economy buildings on the grown plot
- [ ] Reskin delivery: ship all 7 gateway sprites per lab type (49 total) up front, or lazy-load the selected lab type's set
- [ ] Existing teams need lat/lng backfill — teams onboarded before 0.5.2 don't have `location_lat`/`location_lng`; fair matching falls back to state centroid until they re-submit their ZIP via the location field
- [ ] Fair Hub: annual refresh process for the fair dataset; official Society for Science data feed
- [ ] Rate limiting: move in-memory counters to a shared store (Upstash Redis / Cloudflare KV) before multi-instance deploy
