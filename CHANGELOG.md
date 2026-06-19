# NOVA Lab — Changelog

All notable changes to this project are documented here.  
Format: `## [version] — YYYY-MM-DD` with sections: **Added**, **Changed**, **Fixed**, **Removed**.

---

## [0.5.0] — 2026-06-18

### Added

#### Multi-student teams with independent proficiency (Feature 1)
- **Per-(student, paper) proficiency** — new `PaperProficiency` model (`@@id([paperId, userId])`, `demonstrated`, `bestScore`, `kpAwarded`) replaces the team-global `papers.proficiency_demonstrated` / `papers.kp_awarded` as the source of truth. Each member now demonstrates proficiency and earns KP **independently** (max 100 per student per source), so team currency accumulates ~2–3× for 2–3-student labs. `GET /api/papers` and `/api/papers/[id]` return the **current user's** proficiency; `quiz/grade` upserts the student's row + high-water mark
- **Team invite / join** — `Team.maxMembers` (default 3) + `TeamInvite` (single-use codes). `POST /api/team/invite` (lead-only) mints a code; `POST /api/team/join` redeems it, enforcing capacity atomically. Onboarding gains a **Create-a-lab / Join-a-lab** toggle; a new **Team panel** (opened from the status-strip team name) shows the roster and lets the lead generate codes (`GET /api/team`)
- **Building-cost scaling** — shop costs are `baseCost × live member count`; `ShopPanel` shows a `×N · N-student lab` badge
- **Phase gate** — `lib/team/advance.ts` computes literature_review → research_planning readiness (25 sources uploaded AND every member proficient on all 25). A lab-scene `PhaseAdvance` banner shows live progress ("18/25 sources · 2/3 members ready") and, once satisfied, advances via `POST /api/team/advance-phase` (gate re-checked server-side)

#### Engineering/Science Research Plan building (Feature 2)
- `research_plan` gateway is now a real feature (`components/research-plan/ResearchPlanFeature.tsx`)
- **Google Doc paste-a-link** — `ResearchPlan` model + `lib/research-plan/google-doc.ts` fetch the published `export?format=txt` text on demand (OAuth deferred; abstraction localizes the future swap). `POST /api/research-plan` saves config + syncs; "Refresh" re-fetches
- **Type-specific AI review** — engineering vs science + a subtype (robotics, software, biology, …); rubrics in `lib/research-plan/rubrics/` compose a track base with subtype emphasis (ISEF-derived). `POST /api/research-plan/review` returns a structured, scored critique (cached on the doc text) and persists it on the plan
- **"Has this idea been done before?"** — `POST /api/research-plan/idea-check` runs Claude with the **Anthropic native web-search tool** (`web_search_20260209`) over the plan, returning a novel/refine/reject verdict, prior work, differentiation, and citations. **Rate-limited 3/day per team** (`IdeaCheck` rows)
- Both the review and the idea-check **stream live** (NDJSON): the review's rubric rows grade in one at a time with filling bars and the three columns populate as bullets arrive; the idea-check shows each web search + sources as they happen. Both results are **persisted on the plan** (`lastReviewJson` / `lastIdeaCheckJson`) so they survive reloads, and each re-run **replaces** the prior result in the DB and on screen

#### Location-based Science Fair gateway (Feature 3)
- `science_fair` gateway is now a real feature (`components/fair/ScienceFairFeature.tsx`): countdown to the team's fair day, cards for the matched **regional** / **state** / **ISEF** fairs, and the full **ISEF rubric** (science + engineering criteria + board guidance) from `docs/isef-2026.md`
- **US location** — `Team.locationZip` / `locationState`, captured at onboarding (optional ZIP) or inline (`POST /api/team/location`); `lib/fairs/zip.ts` derives the state from ZIP prefixes
- **Fair matching** — provisional affiliated-fair dataset in `lib/fairs/dataset.ts` (lazily upserted into `Fair`/`FairEvent` with coordinates + `seedKey`); `matchFairs` finds the state fair + nearest regional by distance (`GET /api/fairs/match`)
- **AI deadline sync** — `POST /api/fairs/[id]/sync-deadlines` reads a fair's site and extracts dates into a `FairEvent` marked **estimated**; the UI is upfront that dates need per-fair verification

### Changed
- Proficiency/KP are now per-student everywhere; `papers.proficiency_demonstrated` and `papers.kp_awarded` are retained one release as a transitional backfill source / fallback (see `TODO.md`)

### Migrations
- `20260618010000_multi_student_teams` — `teams.max_members`, `team_invites`, `paper_proficiency` (+ backfill from passing quiz sessions)
- `20260618020000_science_fair_location` — `teams.location_zip` / `location_state`, `fairs.latitude` / `longitude` / `seed_key`
- `20260618030000_research_plan` — `research_plans`, `idea_checks`
- `20260618040000_research_plan_idea_check` — `research_plans.last_idea_check_json` / `last_idea_check_at` (persist + replace the current idea-check result)

---

## [0.4.0] — 2026-06-18

### Added

#### Building shop
- **Buildings shop** (`components/lab/ShopPanel.tsx`): bottom-right shop button on the lab scene opens a rectangular overlay — a single horizontally-scrolling shelf of two rows of building cards (placeholder image, name, KP cost, description), with the team's three currencies pinned along the bottom. No tabs; buildings only
- Building catalog in `lib/shop.ts` (12 purchasable structures with KP costs); cost text turns red when unaffordable

#### Knowledge Points for quiz proficiency
- A proficient literature-review quiz now awards the team **your score in KP, capped at 100 per source**. `papers.kp_awarded` is a per-paper high-water mark (team-scoped); a passing grade tops up by `max(0, score − kp_awarded)`, failing/non-improving retakes award 0
- Awarded atomically in `POST /api/papers/[id]/quiz/grade` (increments `team_currency.kp`); grade response returns `kpEarned`, surfaced as a **+N KP** badge on the results banner
- Live currency: `lib/labCurrency.tsx` context lets features bump the balance optimistically; the `StatusStrip` stat **ticks up, turns green, and balloons** then settles on any increase
- Teams now seed a zeroed `TeamCurrency` row at onboarding (`currency: { create: {} }`); the award upserts for legacy teams

#### Cloudflare R2 storage
- PDFs are now stored in **Cloudflare R2** instead of Postgres bytes. New helpers in `lib/storage.ts` (`putObject`, `getObjectStream`, `paperPdfKey`); object key on `papers.pdf_key`
- Upload (`POST /api/papers`) writes to R2 and rolls back the row on failure; the viewer (`GET /api/papers/[id]/file`) streams from R2 through the same authenticated, team-scoped route — never a public/signed URL
- Existing PDFs backfilled from `pdf_data` into R2

### Changed
- `.env.example`: added the required `ANTHROPIC_API_KEY`; removed the dead `AI_SERVICE_*` and `UPSTASH_REDIS_*` entries
- Root `package.json`: dropped the deprecated `pnpm.onlyBuiltDependencies` block (build approval now lives in `pnpm-workspace.yaml` `allowBuilds`)

### Removed
- **Python `ai-service` microservice** (entire `apps/ai-service/`), its web client `lib/ai-service.ts`, the shared `packages/shared-types/src/ai-service.ts`, and `docs/api-contracts.md` — all AI work runs directly in Next.js API routes via the Anthropic SDK
- `redis` and `ai-service` services from `infra/docker-compose.yml` (local dev is just Postgres now)
- Unused dependencies: `bullmq`, `@upstash/redis`, `react-flow-renderer`, `d3-force`, `@types/d3-force`

### Migrations
- `20260617000000_add_paper_kp_awarded` — `papers.kp_awarded`
- `20260618000000_add_paper_pdf_key` — `papers.pdf_key`

---

## [0.3.0] — 2026-06-17

### Added

#### Onboarding
- Real onboarding form (`app/(onboarding)/onboarding/page.tsx`) collecting name + lab/team name
- `POST /api/onboarding` creates the `User`, `Team`, and `TeamMember` records (idempotent); seeds the team at `literature_review` phase
- Dashboard layout now redirects users without a team to `/onboarding`

#### Literature Review — Quiz
- Structured **graded comprehension quiz**: free-response (not MCQ), AI-generated questions grounded in the paper's full text, each with a server-only grading key
- Pedagogy/grading rules externalized to `lib/literature/quiz-rubric.md` (tunable, loaded into both generation and grading prompts); knobs `QUIZ_QUESTION_COUNT` (5) and `QUIZ_PASS_THRESHOLD` (70) in `lib/literature/quiz.ts`
- `POST /api/papers/[id]/quiz` generates a quiz; `POST …/quiz/grade` grades all answers in one call (aggregate score, pass/fail); `GET …/quiz` returns the last graded session
- Persistence: `PaperQuizSession` + `PaperQuizAttempt`; proficiency persisted on `papers.proficiency_demonstrated`
- Past results (answers + Nova's feedback) reload on reopen; header tabs switch between **Quiz results** and **Discuss with Nova** (active tab gold); pass → green "Proficiency demonstrated" banner (mirrored on the source slot)

#### Literature Review — Viewer, Chat, Delete
- **In-panel PDF viewer**: PDF bytes stored in `papers.pdf_data`, streamed inline (auth'd) via `GET /api/papers/[id]/file`
- **Chat persistence**: `PaperChatMessage` model; `GET/POST /api/papers/[id]/chat` save and reload the per-user conversation
- Nova replies rendered as **Markdown** (`react-markdown` + `remark-gfm`, styled via `.chat-md`)
- **Delete source** button (`DELETE /api/papers/[id]`, cascades quiz/chat/notes)

#### Discovery — Persistence, Topic, Restyle
- Discovery tree persisted to the DB (`discovery_nodes`, team-scoped) via `GET/POST/DELETE /api/discovery/tree` and `PATCH/DELETE …/tree/[id]`; store hydrates from DB instead of `localStorage`
- **Final research topic** stored on `Team.topic` (`GET/POST /api/discovery/topic`); shown on the Discovery home, settable from the explorer bar or any starred item
- Full **pixel-art restyle** of Discovery (home, search, Wikipedia reader, tree, branch panel) to match the game aesthetic; smooth-animated FAQ accordion; "← Back" button

#### Discovery — YouTube deep dives
- Paste-only YouTube exploration (no API key, no quota): `POST /api/discovery/youtube/resolve` resolves a URL → `{ videoId, title }` via public oEmbed
- Embedded IFrame player; **⌘V/Ctrl+V auto-capture**; `addYouTubeVideo` branches off the current node
- Unified source-tagged forest tree (`DiscoverySource += youtube`, `youtubeVideoId`/`youtubeTitle` columns); ▶ markers on video nodes; cross-source bridging (a video can branch off a Wikipedia node)
- New "What about YouTube deep dives?" FAQ on the Discovery home

### Changed
- **PDF parsing switched from `pdf-parse` to `unpdf`** — in-process, ~250 ms, serverless-ready; extracted text now stored in `papers.full_text` (was temporarily in `content_hash`)
- Paper metadata extraction + Q&A use **prompt caching** on the paper text (follow-up turns ~10% cost)
- Q&A chat reframed as post-quiz discussion (proficiency is now owned exclusively by the quiz, not the chat)
- Clerk redirect env vars migrated to `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` / `SIGN_UP_FORCE_REDIRECT_URL` (deprecation)

### Fixed
- Q&A split view: the PDF pane no longer overflows and hides the quiz/chat panel (`min-w-0` flexbox fix)
- Filled literature slots no longer collapse to a thin line (`shrink-0`)
- Quiz/chat/onboarding/topic inputs given dark backgrounds so typed text is visible
- Chat 500s eliminated: persistence is best-effort (reply never lost) and the conversation is sanitized to start at the first user turn

### Removed
- **Citation graph** feature: `/api/citation-graph`, the graph page, `PaperCitation`, `CitationEdge`, `PaperCluster`
- **Embeddings + clustering**: `embedding` column, `pgvector` extension, `PaperSummary`, and the `voyageai` / `hdbscan` / `langchain-text-splitters` deps (Python service); `embeddings.py` + `citation_extractor.py` deleted
- `pdf-parse` and `@types/pdf-parse` (replaced by `unpdf`)

### Dependencies
- Added: `unpdf`, `react-markdown`, `remark-gfm`
- Removed: `pdf-parse`, `@types/pdf-parse` (web); `voyageai`, `hdbscan`, `langchain-text-splitters` (ai-service)

---

## [0.2.0] — 2026-06-17

### Added

#### Environment & Tooling
- Installed `@anthropic-ai/sdk` and `pdf-parse` npm packages in the web app
- Added `ANTHROPIC_API_KEY` environment variable to `.env.local` (and `.env.example` template)
- Configured `pnpm-workspace.yaml` `allowBuilds` to permit native addon compilation for `@clerk/shared`, `@prisma/client`, `@prisma/engines`, `prisma`, `sharp`, `msgpackr-extract`, `unrs-resolver`
- Added `font-pixel` (`Press_Start_2P`) as a Tailwind CSS utility in `tailwind.config.ts`

#### Landing Page (`apps/web/app/page.tsx`)
- Replaced the old multi-section marketing homepage (hero, feature grid, footer) with a minimal pixel-art landing screen
- Dark navy background (`#0d1b2e`), pixel font throughout, yellow accent (`#F5C518`)
- SVG recreation of the NOVA Lab mascot (figure hunched over a table) rendered inline alongside the "NOVA / Lab" heading
- Single CTA button "↑ ENTER YOUR LAB" links to `/sign-in`
- Logged-in users are still immediately redirected to `/lab`

#### Lab Scene — All Buildings Visible (`apps/web/components/lab/LabScene.tsx`)
- Phase gating temporarily removed from building visibility: all 7 gateway buildings now render regardless of `teams.phase`
- Lock gating also bypassed: all buildings are clickable regardless of phase
- Both bypasses are marked with `// TODO: restore` comments for re-enabling once progression integration begins

#### Literature Review Feature (`apps/web/components/literature/LiteratureFeature.tsx`)
- New component replacing the prior `StubFeature` placeholder, registered in `featureRegistry.tsx`
- **25-slot list view**: displays all 25 required source slots; filled slots show paper metadata, empty slots show as dashed-border rectangles
- **Upload**: first empty slot renders a centered "Upload source" button with drag-and-drop support; clicking opens a native file picker (PDF only)
- **Optimistic UI**: uploaded paper appears immediately as a placeholder with status `uploading` → `processing` → `ready` via 3-second polling
- **Proficiency banner**: every paper without demonstrated proficiency shows an orange "Proficiency not demonstrated" badge above its row
- **Action buttons** per ready paper: "PDF" (opens file in new tab) and "Q&A" (opens split review view)
- **Progress bar + counter**: yellow progress bar and `N / 25` readout in the panel header
- **Q&A split view**: clicking Q&A replaces the panel body with a two-column layout — PDF iframe on the left, chat interface on the right (mirrors Discovery's Wikipedia reader + tree layout)
- Chat is pre-seeded with Nova's opening message; user messages sent via `POST /api/papers/[id]/chat`; Enter key submits
- `PROFICIENCY_DEMONSTRATED` hidden signal stripped from display; triggers removal of the orange banner for that paper

#### API Routes
- `POST /api/papers` — accepts `multipart/form-data` PDF upload; parses text with `pdf-parse`; creates `papers` row with `status = processing`; stores extracted text in `contentHash` field; fires async Claude call (`claude-sonnet-4-6`) to extract title, authors, and abstract; marks paper `ready` on completion
- `GET /api/papers` — returns all papers for the authenticated user's team
- `GET /api/papers/[id]` — returns single paper by ID (used for status polling)
- `POST /api/papers/[id]/chat` — runs a tutoring conversation against the paper's extracted text using `claude-sonnet-4-6`; enforces team ownership; returns `{ reply }` JSON

#### Claude System Prompts
- **Extraction prompt** (in `POST /api/papers`): instructs Claude to return a JSON object `{ title, authors, abstract }` from raw PDF text; used server-side only
- **Q&A tutor prompt** (in `POST /api/papers/[id]/chat`): Nova persona; assesses comprehension across four criteria (hypothesis, methodology, findings, relevance); emits `PROFICIENCY_DEMONSTRATED` signal on a new line when all four are met; encourages genuine understanding over surface recitation

### Changed

- `apps/web/lib/featureRegistry.tsx`: `literature_review` entry changed from `StubFeature` to dynamically imported `LiteratureFeature`
- `apps/web/app/api/papers/route.ts`: replaced the prior stub implementation (which returned `501 Not Implemented`) with full upload + async processing logic

### Removed

- Old multi-section landing page content (nav bar, hero section with gradient heading, feature grid with emoji cards, footer)
- Citation Graph tab from literature review (removed per product decision; will be revisited in a later milestone)
- Upload / Library tab split (merged into single unified 25-slot view per product decision)

---

## [0.1.0] — 2026-06-11

### Added

- Initial monorepo structure (`pnpm workspaces`): `apps/web`, `apps/ai-service`, `packages/`
- Next.js 14 web app with App Router, TypeScript, Tailwind CSS
- Clerk authentication (sign-in / sign-up / session middleware)
- Prisma schema covering the full data model: users, teams, discovery, literature, buildings, currency, daily activities, PvP, showcase, science fair hub
- Database migration baseline (`20260611000000_add_phase_lab_selection_research_planning`) adding `lab_selection` and `research_planning` values to the `project_phase` enum
- Pixel-art lab scene (`LabScene.tsx`) with isometric grid layout, `TileBackground` (deterministic grass tiles), `BuildingSprite`, `FeaturePanel` overlay system, and `StatusStrip`
- All 7 gateway building configurations (`lib/gateways.ts`) with phase unlock rules and isometric cell positions
- Sprite manifest (`lib/sprites/manifest.ts`) covering 49 gateway sprites (7 buildings × 7 skins), 9 ground tiles, and padlock UI sprite
- Pixel-art pipeline under `art/`: `iso.py` (7 isometric gateway buildings), `build_sprites.py` (ground tiles + padlock), `recolor.py` (42 lab-type reskins), `compose_scene.py` (full-scene previews)
- Discovery feature: Wikipedia reader with link interception, branching tree visualization (react-flow), Zustand store, starred nodes, topic interest list
- `StubFeature` placeholder for all 6 non-Discovery gateway buildings
- Docker Compose local dev environment (`infra/docker-compose.yml`): `pgvector/pgvector:pg16` + `redis:7-alpine`
- `SETUP.md` with full macOS setup instructions
- `spec.md` and `architecture.md` design documentation
