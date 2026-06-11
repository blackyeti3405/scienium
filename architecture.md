# NOVA Lab — Technical Architecture

> **Companion to:** `spec.md`
> **Last Updated:** 2026-05-26
> **Target initial scale:** ~120 students, single school pilot

---

## 1. Architecture Overview

NOVA Lab is a **two-service architecture**:

1. **Web app (Next.js)** — UI, lightweight API routes, auth, most CRUD operations, and public Showcase rendering
2. **AI microservice (Python FastAPI)** — PDF parsing, paper analysis, citation extraction, content generation, video transcoding

A single **PostgreSQL database** (with `pgvector` extension) is the source of truth. **Object storage (Cloudflare R2)** holds PDFs, images, and Showcase videos. **Redis** runs the background job queue.

```
┌─────────────────┐              ┌─────────────────────────┐
│   Web Browser   │              │  Public Visitors        │
│  (Auth'd users) │              │  (Showcase viewers)     │
└────────┬────────┘              └────────┬────────────────┘
         │                                │
         ▼                                ▼
┌──────────────────────────────────────────────────┐
│           Next.js App (Vercel)                    │
│   - Authenticated UI (/dashboard, /lab, etc)      │
│   - Public Showcase routes (/showcase/[slug])     │
│   - API routes (light CRUD)                       │
│   - Wikipedia integration                         │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Python AI Service       │
│  (FastAPI on Railway)    │
│  - PDF parsing           │
│  - Claude orchestration  │
│  - Quiz generation       │
│  - Citation extraction   │
│  - Embedding computation │
│  - Video transcoding     │
└───────┬──────────────────┘
        │
        ├──────────────────┬────────────────────┐
        ▼                  ▼                    ▼
┌────────────┐    ┌───────────────┐    ┌──────────────────┐
│ PostgreSQL │    │ Cloudflare R2 │    │ Redis (BullMQ)   │
│ (Supabase) │    │ (files+video) │    │ (job queue)      │
│ + pgvector │    │ + CDN         │    │                  │
└────────────┘    └───────────────┘    └──────────────────┘
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
| Visualization | **Recharts** (charts), **react-flow** (Discovery Tree + Citation Graph) | Both stable, well-documented |
| Forms | **react-hook-form + zod** | Validation as types |
| Video player | **video.js** | Mature, accessible, handles HLS/MP4 |
| PDF viewer | **react-pdf** | In-browser report viewing |

### Backend (Next.js side)
| Layer | Choice | Rationale |
|---|---|---|
| API | **Next.js API Routes** | Co-located with frontend |
| Auth | **Clerk** | Email/password, OAuth, sessions, parental consent flow possible |
| ORM | **Prisma** | Type-safe queries, migrations |
| Database | **PostgreSQL via Supabase** + **pgvector** extension | Industry standard; pgvector keeps embeddings co-located, no separate vector DB |
| Image processing | **sharp** | Server-side image resizing/thumbnails |

### AI Microservice
| Layer | Choice | Rationale |
|---|---|---|
| Framework | **FastAPI** | Async, typed |
| LLM | **Anthropic Claude API** | Strong reasoning, long context |
| PDF parsing | **pdfplumber** (primary), **pypdf** (metadata) | Layout fidelity + cheap header extraction |
| Text chunking | **langchain-text-splitters** | Token-aware splitting |
| Embeddings | **Voyage `voyage-3-lite`** | Cheap, good for similarity |
| Clustering | **hdbscan** | Citation graph sub-topic clustering |
| Video transcoding | **ffmpeg** (via `ffmpeg-python`) | Showcase video normalization |

### Infrastructure
| Layer | Choice | Rationale |
|---|---|---|
| Frontend hosting | **Vercel** | Best DX for Next.js |
| Backend hosting | **Railway** | Simple Python deploys |
| Database | **Supabase** | Managed Postgres + RLS + auth helpers |
| Object storage | **Cloudflare R2** | S3-compatible, no egress fees — critical for video |
| CDN | **Cloudflare** (in front of R2) | Fast global video/image delivery |
| Queue | **Upstash Redis** | Serverless, free tier |
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
│   │   │   │   │   ├── review/           # Active review session
│   │   │   │   │   └── graph/            # Citation Graph view
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
│   │   │   │   ├── auth/
│   │   │   │   ├── papers/
│   │   │   │   ├── buildings/
│   │   │   │   ├── teams/
│   │   │   │   ├── pvp/                  # Battle resolution, matchmaking, trophies
│   │   │   │   ├── discovery/
│   │   │   │   ├── project-log/
│   │   │   │   ├── failure-log/
│   │   │   │   ├── citation-graph/
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
│   │   │   ├── discovery/                # Wikipedia reader, tree viz
│   │   │   ├── literature/
│   │   │   │   ├── UploadWidget.tsx
│   │   │   │   ├── QuizDialog.tsx
│   │   │   │   ├── LibraryList.tsx
│   │   │   │   └── CitationGraph.tsx     # react-flow based
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
│   │   │   ├── ai-service.ts             # Client for Python service
│   │   │   ├── db.ts                     # Prisma client singleton
│   │   │   ├── auth.ts                   # Clerk helpers
│   │   │   ├── storage.ts                # R2 client + signed URL generation
│   │   │   ├── permissions.ts            # RBAC + RLS helpers
│   │   │   ├── consent.ts                # Parental consent checks
│   │   │   └── fair-matching.ts          # Match user location to eligible fairs
│   │   ├── hooks/
│   │   ├── stores/                       # Zustand stores
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   │
│   └── ai-service/                       # Python FastAPI microservice
│       ├── app/
│       │   ├── main.py
│       │   ├── routers/
│       │   │   ├── papers.py             # /papers/process, /papers/quiz, /papers/extract-citations
│       │   │   ├── content.py            # /content/field-dispatch, /content/expertise
│       │   │   ├── project_log.py        # /project-log/evaluate
│       │   │   ├── failure_log.py        # /failure-log/evaluate
│       │   │   ├── minigames.py          # /minigames/generate
│       │   │   └── video.py              # /video/transcode, /video/thumbnail
│       │   ├── services/
│       │   │   ├── pdf_parser.py
│       │   │   ├── claude_client.py
│       │   │   ├── chunker.py
│       │   │   ├── embeddings.py
│       │   │   ├── citation_extractor.py
│       │   │   ├── video_processor.py    # ffmpeg wrapper
│       │   │   └── prompts/              # Versioned prompt templates
│       │   │       ├── summarize.py
│       │   │       ├── quiz.py
│       │   │       ├── probe.py
│       │   │       ├── field_dispatch.py
│       │   │       ├── failure_followup.py
│       │   │       └── citation_extract.py
│       │   ├── models/                   # Pydantic models
│       │   └── workers/                  # Background job consumers
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/                     # Types shared web <-> AI service
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
│   ├── api-contracts.md                  # Web <-> AI service contract
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
                      created_at
team_members          user_id, team_id, role (lead | member), joined_at

# Discovery
discovery_nodes       id, team_id, parent_id, source_type (wikipedia | paper),
                      wikipedia_title | paper_id, starred, visited_by_user_id, visited_at
topic_interests       id, team_id, text, created_by_user_id, created_at

# Literature
papers                id, team_id, title, authors, abstract, source_type (pdf | text),
                      file_url, content_hash, embedding (vector), status,
                      uploaded_by_user_id, created_at
paper_summaries       paper_id, summary_json
paper_quiz_attempts   id, paper_id, user_id, question, response, evaluation, created_at
paper_relevance_notes paper_id, user_id, response, created_at
paper_citations       source_paper_id, target_paper_id, edge_type (direct | thematic),
                      confidence_score
paper_clusters        paper_id, cluster_id, cluster_label
                      # updated on add/remove via HDBSCAN re-run

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
                      state, county, country, website_url, parent_fair_id
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

### Paper upload flow (Lit Review)
1. Client uploads PDF to `/api/papers` (Next.js)
2. File uploaded to R2; row created in `papers` with `status = pending`
3. Job enqueued in Redis targeting AI service
4. AI service: download → parse → Claude (summary + quiz + probe) → extract citations → compute embedding → write back
5. Citation extraction: for each reference, fuzzy-match against existing team papers; write edges to `paper_citations`
6. Embedding written to `papers.embedding`; HDBSCAN re-clustering triggered if paper count is at a meaningful threshold
7. `papers.status = ready`; client picks up via TanStack Query polling

### Citation Graph render flow
1. Client requests `/api/citation-graph?team_id=X`
2. Next.js queries `papers` + `paper_citations` + `paper_clusters` for the team
3. Pre-computed layout (force-directed) cached; if stale, recomputed in a worker
4. Returns nodes + edges + cluster colors as JSON
5. `react-flow` renders interactively client-side

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

## 6. Scalability Considerations

### Current scale (120 students)
- Single Postgres instance, no replicas
- Single AI service instance, 2–4 worker processes
- No caching layer beyond Vercel's defaults
- Public Showcase traffic likely the largest unknown — Cloudflare CDN handles it transparently

### When to scale up
| Trigger | Action |
|---|---|
| >1k concurrent authenticated users | Add Redis cache for Wikipedia article fetches and read-heavy endpoints |
| >10k papers in system | Consider dedicated vector DB (Pinecone, Weaviate) if pgvector queries slow down |
| Showcase video transcoding queue backed up | Scale AI service horizontally; add dedicated video workers |
| >100k showcase views/day | Tune Cloudflare cache headers; preload popular pages with ISR |
| Citation graph layouts slow | Move layout computation off main worker into dedicated graph-layout service |

### Cost ceiling for pilot
| Service | Estimated monthly cost |
|---|---|
| Vercel (Hobby/Pro) | $0–20 |
| Railway (AI service) | ~$10 |
| Supabase (Pro) | $25 |
| Cloudflare R2 + CDN | ~$5–15 (depends on Showcase video traffic) |
| Upstash Redis | $0 (free tier) |
| Clerk | $0 (free up to 10k MAU) |
| Anthropic Claude API | ~$200–400 across pilot semester |
| Voyage embeddings | ~$5 |
| **Total estimate** | **~$250–500 / month at pilot scale** |

---

## 7. Security & Privacy

- FERPA/COPPA compliance for minor students; parental consent required for public Showcase publishing
- PII isolated in `users` table; activity feed and social view use names only with consent
- Row-level security (RLS) policies ensure team data isolation
- PDF uploads scanned for known malware signatures before processing
- QR codes on figurines are signed tokens (HMAC), not raw IDs
- Public Showcase visitor tracking is privacy-respecting (no third-party trackers, no PII)
- All file URLs in R2 are accessed via signed time-limited URLs for private assets; only public Showcase assets get long-lived public URLs

---

## 8. Phase Gating System

### 8.1 Single source of truth

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

### 8.2 Enforcement layers

Gating is enforced in **two independent layers** — client-only gating is never sufficient:

**Layer 1 — UI/Nav** (`components/shared/DashboardNav.tsx`, `components/lab/LabCanvas.tsx`):
- Locked nav items rendered as non-interactive divs with a pixel padlock icon
- Wing tiles in the lab canvas are non-clickable for locked features
- Phase badge displayed in the nav and lab header

**Layer 2 — Server-side API routes** (`app/api/*/route.ts`):
- Every handler for a phase-gated endpoint calls `assertFeatureUnlocked(ctx.phase, feature)`
- Returns HTTP 403 with a descriptive error message if the team's phase is insufficient
- `getTeamContext()` is called once per handler to resolve phase from DB

### 8.3 Phase transitions

Phase transitions are explicit server-side actions (not automatic). A team's `phase` field is updated only by dedicated transition API endpoints (not yet built) that validate:
- Current phase is exactly one step below the target
- Any exit conditions are met (e.g., lab_type is set before leaving lab_selection; 25 papers before leaving literature_review)

Phases cannot be skipped.

### 8.4 Pixel-art visual system

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

## 9. Deployment & Environments

| Environment | Purpose | Hosting |
|---|---|---|
| Local | Developer machines | Docker Compose |
| Staging | Internal testing | Vercel Preview + Railway Staging |
| Production | Pilot | Vercel + Railway + Supabase + R2 |

CI/CD via GitHub Actions: lint → typecheck → test → preview deploy.

---

## 10. Open Technical Questions

- [ ] Sync vs. async AI service endpoints — split decision per endpoint
- [ ] Real-time strategy for team feeds — polling until pain, or Supabase Realtime from day one
- [ ] Citation extraction quality: Claude-only vs. Semantic Scholar/OpenAlex augmentation
- [ ] Embedding storage: continue pgvector or migrate to external vector DB at scale
- [ ] Video transcoding: in-house ffmpeg vs. managed service like Mux or Cloudflare Stream (Mux is expensive; in-house works for pilot)
- [ ] Showcase moderation: auto-only vs. always human-reviewed for public publish
- [ ] Caching strategy for Wikipedia articles
- [ ] Lab canvas: fixed pre-placed building slots vs. data-driven layout engine for positioning gateway + economy buildings on the grown plot
- [ ] Reskin delivery: ship all 7 gateway sprites per lab type (49 total) up front, or lazy-load the selected lab type's set
