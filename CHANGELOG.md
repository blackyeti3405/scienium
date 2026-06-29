# scienium — Changelog

All notable changes to this project are documented here.  
Format: `## [version] — YYYY-MM-DD` with sections: **Added**, **Changed**, **Fixed**, **Removed**.

---

## [0.14.0] — 2026-06-28

Database moves from a local Postgres instance to **Supabase Postgres**, and the migration
history is repaired so a fresh database can be built from zero. The app runs through
Supabase's **transaction pooler** (port 6543, `pgbouncer=true`) at runtime and the
**session pooler** (port 5432) for migrations — the standard serverless-safe setup that
keeps Prisma from exhausting connections on Vercel. No table/column changes: the schema
shape is identical. Validated end-to-end against Supabase — Playwright E2E green (70 passed,
1 skipped).

### Changed

- **Datasource is now pooled** (`apps/web/prisma/schema.prisma`) — added `directUrl` so `url` (transaction pooler) serves app traffic while `directUrl` (session pooler) is used only by `prisma migrate` / `db push`. `.env.local` / Vercel now set `DATABASE_URL` + `DIRECT_URL`.
- **Migrations squashed to a single baseline** (`prisma/migrations/00000000000000_init/`) — the 20 incremental migrations are collapsed into one `init` generated from the current schema. This fixes `prisma migrate deploy` against a **fresh** database (Vercel/CI): the previous history had no baseline before the first migration, which assumed a pre-existing schema and failed on an empty DB (`type "project_phase" does not exist`). Verified by deploying into a throwaway empty DB — all 57 tables created from zero. Existing databases were re-baselined to `init`.

### Removed

- **20 incremental migration files** (`prisma/migrations/2026*`) — superseded by the squashed `init` baseline; recoverable from git history if ever needed.

---

## [0.13.0] — 2026-06-28

Building upgrades now **visibly evolve**. The flat gold tier-2 reskin from 0.12.0 is
replaced by a **4-stage evolution** per economy building: each stage *physically adds
structure* to the previous one at the Lab-Credit tier-ups, so a building grows from its
base form into a fully built-out, high-tech version by L15. All 10 **Volt Lab** buildings
are done (40 new stage sprites). Colours mature across stages; gold is reserved as the
L15 flourish, not a whole-building recolor. Green: typecheck, lint, `next build`, Vitest
(114). No schema/migration changes.

### Added

- **Multi-stage upgrade sprites** — `lib/sprites/manifest.ts` gains `buildingStageSuffix(level)` and a level-aware `getBuildingSprite`, mapping level → stage at the four LC tier-ups: base `{slug}.png` (L1–3) → `_t2` (L4–6) → `_t3` (L7–9) → `_t4` (L10–14) → `_t5` (L15). The plot already threads each placed building's `level` into the renderer, so an upgrade swaps the sprite live (audited end-to-end: the rendered `<img src>` changes at L4/7/10/15 and every file resolves).
- **40 Volt Lab upgrade-stage sprites** (`apps/web/public/sprites/buildings/volt_lab/{slug}_t2..t5.png`) — for all 10 buildings, each a cumulative on-theme build-up (e.g. Workshop: forge flue → work canopy → lattice gantry crane → glowing power-core + gold pennant; 3D Printing Shop: spool rack → second print bay → curing silo → gold multi-head dome). Char-grid sources in `art/src/buildings/`.
- **Reproducible staged builders** — each `.claude/pixel-art-pipeline/builders/{slug}.py` refactored to `build(stage=1)` that composes the base form then layers cumulative geometry per stage (new evolved palette shades for energized/glow/gold accents). Design brief + per-building plan in `.claude/pixel-art-pipeline/UPGRADE_EVOLUTION.md` and `evolution-plan.md`.

### Changed

- **Upgrade visuals are now incremental, not a recolor** — supersedes 0.12.0's single gold `_t2`. Base sprites are byte-identical (each stage builds on the unchanged footprint/silhouette); the `_t2` PNGs are regenerated as the proper "small functional add" stage.

---

## [0.12.0] — 2026-06-28

The lab plot becomes interactive: economy buildings are **placed, moved, sold, and
upgraded** on an isometric grid (Clash-of-Clans style), and a full **upgrade economy**
goes live (KP every level + Lab Credits at the tier-ups, with a tier-2 reskin at L≥4).
Lab Credits become earnable from daily logs. All green: typecheck, lint, `next build`,
Vitest (115), Playwright E2E (70). Two additive migrations.

### Added — Features

- **Building placement system** (`lib/plot.ts`, `lib/plot-server.ts`, `components/lab/LabPlot.tsx`, `app/api/buildings/{place,move,sell}/`) — pick a building from the shop and drop it on a free isometric tile (the drop is the purchase; KP debits on drop), rearrange any building (including the 7 gateways) for free in **Arrange mode**, or sell economy buildings. 1×1 footprints, per-sprite footprint anchoring (`scripts/gen-sprite-anchors.py` → `lib/sprites/anchors.generated.ts`) so each building sits centred on its tile. Positions persist (`team_shop_buildings.pos_x/pos_y`, `team_gateway_placements`). Server-validated placement (on-grid, unoccupied) and cost.
- **Building upgrades** (`app/api/buildings/upgrade/`, `lib/economy.ts`) — economy buildings level **1 → 15**. **Every** upgrade costs KP = `round(baseCost × 0.25 × (level−1))`; the four tier-ups (3→4, 6→7, 9→10, 14→15) also cost LC (2/4/6/10). No clearance cap on level. Atomic, race-safe KP+LC debit. Clicking a placed economy building opens a **Sell / Upgrade menu**; Arrange mode offers **Delete**.
- **Lab Credits earning** (`app/api/{project-log,failure-log}/`, new `lab_credit_claims` table) — +1 LC per team member per real calendar day they create a Project/Failure log entry, capped 1/member/day, never backfilled.
- **Tier-2 building skins** — buildings show a reskinned sprite at level ≥ 4 (`{slug}_t2.png`); `getBuildingSprite` is now level-aware. The 10 **Volt Lab** tier-2 reskins are generated (`art/tier2_reskin.py`).
- **Sell refund = 90% of total KP invested** (purchase + every upgrade, tracked in `cost_paid`).
- **UI polish** — hovered building name shown top-of-screen + an **L{n} level box** over the building on hover; a pixel-art **green particle effect** on upgrade (scattered sparkles rising in a smooth sine).

### Changed

- **Upgrade economy redesigned** (was: clearance-capped levels, LC-per-level). Now KP-per-level + LC-only-at-tier-ups, no clearance cap; clearance gates *purchase* only. `spec.md` §8/§9.2/§14 updated to match.
- **Schema** — `team_shop_buildings` gains `pos_x`, `pos_y`, `level`, `cost_paid`; new `team_gateway_placements` and `lab_credit_claims` tables. Migrations `20260627000000_building_placement`, `20260627000001_building_upgrades` (applied via `migrate deploy`, not shadow `migrate dev`).
- **E2E test isolation** — the suite now runs as a dedicated test account (`devuser2`) on a throwaway **E2E Test Lab**, so `pnpm test:e2e` never mutates a real lab. New `e2e/placement.spec.ts` + `e2e/upgrades.spec.ts`; `BuildingSprite.tsx` (orphaned by `LabPlot`) removed.

---

## [0.11.0] — 2026-06-24

The economy building art is **complete**: the final four lab-type sets — **⚗️ ChemWorks** (10), **🌍 TerraBase** (10), **🧠 MindFrame** (10), and **🔭 Axiom** (10) — bringing all **60 economy building sprites** (6 lab types × 10) to drawn, on top of the Volt Lab + BioCore sets from 0.10.0. Every sprite is code-generated (char-grid → PNG), 64×64, on its set's 16-colour palette, a one-of-one *signature feature* on a *bespoke built form*, with opening sides deliberately alternated left/right across each set. Catalog of record `art/building.md` is now fully realized (**67/67** made). All sprites resolve through the manifest; no schema/migration changes.

### Added — Features

- **40 economy building sprites** (`apps/web/public/sprites/buildings/{chemworks,terrabase,mindframe,axiom}/`, char-grid sources in `art/src/buildings/`) — the complete ChemWorks, TerraBase, MindFrame, and Axiom sets. Each is a distinct iso silhouette with a unique signature feature on its set's palette (e.g. the ChemWorks distillation column with stacked separating fractions, the TerraBase derrick over a glowing planetary-core cutaway, the MindFrame open-oculus focus-group pit, the Axiom suspended quantum-processor chandelier).
- **Manifest entries for all four lab types** (`lib/sprites/manifest.ts` `BUILDING_SPRITES`) — every team's lab-type set now resolves to real sprites via `getBuildingSprite`; the "coming soon" placeholder fallback no longer triggers for any lab type.

### Changed

- **`art/building.md` fully realized** — all 67 catalog rows (60 economy + 7 gateways) are `[x]` with their locked signature features; nothing remains for the generation pipeline to pick up.
- **Pixel-art generation tooling** — added the iso building toolkit (`art/isobuild.py`: parametric `Box`/`cylinder` primitives plus glass/louver glazing helpers) used to compose each bespoke economy form; generation tooling and its working artifacts are consolidated under `.claude/`.

---

## [0.10.0] — 2026-06-24

The first wave of **economy building art**: two complete lab-type sets of isometric building sprites — **⚡ Volt Lab** (10) and **🧬 BioCore** (10) — each building a one-of-one *signature feature* on its own *bespoke built form*, plus a **lab-type-gated Buildings shop** that serves each team its own set. Every sprite is code-generated (reproducible char-grid → PNG), 64×64, on its set's 16-color palette; openings deliberately alternate left/right across each set. Catalog of record: `art/building.md`. All green: typecheck, lint, unit tests (5 new economy-gate tests), `next build`. No schema/migration changes.

### Added — Features

- **20 economy building sprites** (`apps/web/public/sprites/buildings/{volt_lab,biocore}/`, char-grid sources in `art/src/buildings/`) — the complete Volt Lab set (Workshop, CNC Mill Shop, 3D Printing Shop, PCB Fab, Robotics Bay, Electronics Bench, Mechanical Testing Rig, Welding & Fabrication, Embedded Systems Lab, AI Incubator) and BioCore set (Greenhouse, Specimen Vault, Microscopy Suite, Incubation Chamber, Wet Lab, Field Station, Aquatic Habitat, Genetics Sequencing Lab, Behavioral Observation Room, Bioinformatics Suite). Each is a distinct iso silhouette with a unique signature feature on its set's palette. `art/building.md` records every building's **form, opening side, signature, and description**.
- **Lab-type Buildings shop** (`lib/shop.ts`, `lib/sprites/manifest.ts`, `components/lab/ShopPanel.tsx`) — the Buildings shop now offers **lab-type-specific** economy buildings rendered with their real sprites: a team sees its own lab's set (Volt Lab or BioCore), each with a KP cost, clearance tier, and description. The grid is a fixed **10 slots**; lab types whose art isn't made yet fall back to non-purchasable **"coming soon"** placeholders. Sprites resolve through the manifest (`getBuildingSprite`) — never a hardcoded path.

### Changed

- **Purchase gating adds a lab-type check** (`lib/economy.ts` `evaluatePurchase`, `app/api/buildings/route.ts`) — a lab-type-restricted building is only buyable by a matching team, enforced **server-side** (403) ahead of the owned/clearance/affordability checks, with the shop UI filtering to match (defence-in-depth, IDOR-guarded).

### Removed

- The 12 generic placeholder shop buildings (Reagent Store, Microscope Bay, … Telescope Dome) — replaced by the real lab-type building sets.

---

## [0.9.0] — 2026-06-22

A focused pass on the **teacher dashboard**: a cleaner, information-dense **UI redesign** (sidebar-navigated student drill-down, an identity header with a phase stepper, stat-tile grids), a **read-only literature view** so teachers can see each student's sources + quiz results + chat, richer **roster attention states**, **lab → class enrollment** so every lab member appears on the roster, the **research-plan review** surfaced with a link to the plan, and a rubric fix so engineering plans aren't judged on presentation readiness. All green: typecheck, lint, **98 unit tests**, `next build`. No schema/migration changes.

### Added — Features

- **Read-only teacher literature view** (`GET /api/teacher/student/[id]/literature/[paperId]` + its `/file` PDF stream, `components/teacher/StudentDetail.tsx`) — the drill-down's Literature section lists every source with the student's proficiency, and a **Q&A** button opens that source's actual quiz (questions, the student's answers, per-question scores + Vega's rationale), the chat transcript, and the PDF. Read-only and class-scoped (IDOR-guarded via `requireTeacher` + `teacherOwnsTeam`); no new LLM calls.
- **Research-plan review on the drill-down** (`overview` route now returns `googleDocUrl`; `StudentDetail` research-plan section) — an **"Open research plan"** link plus two read-only sections: an **Originality check** (the novelty/idea-check verdict + prior work) and a **Plan review** (readiness score, per-section scores, strengths / gaps / next-steps).

### Changed

- **Teacher dashboard redesign** (`components/teacher/StudentDetail.tsx`, `TeacherRoster.tsx`, `components/ui/Card.tsx`, `SectionTabs.tsx`) — the student drill-down's overflowing 13-tab strip is replaced by a **grouped left sidebar** (Profile / Work / Lab / Showcase / Activity); a real **identity header** (avatar, role pill, meta, KP/clearance chips) with a **phase stepper**; **stat-tile grids** with tabular numbers; and a single enforced type scale (pixel font reserved for section eyebrows). The roster gains a carded table, semantic flag pills, and an icon-driven overview.
- **Richer roster attention states** (`app/api/teacher/roster/route.ts`, `TeacherRoster.tsx`) — the single `staleLog` boolean becomes `on_track` / `unlogged` / `stale`: **unlogged** = recent activity/KP but no progress journal (vs. **stale** = genuinely quiet). The "needs attention" filter and count cover unlogged + stale + pending validation.
- **Labs enroll into the teacher's class** (`lib/onboarding/profile.ts`, `app/api/team/join/route.ts`, `app/api/class/join/route.ts`) — a member who joins a lab inherits the lab's (lead's) class, and a lead who joins a class brings their labmates, so **every member of a lab appears on the teacher's roster** — not just the one who entered the class code. Only fills an empty class slot; never overrides a deliberate choice.
- **Engineering research-plan review drops "presentation readiness"** (`lib/research-plan/rubrics/_engineering.md`, `app/api/research-plan/review/route.ts`) — an early-stage **plan** is no longer judged on the end-of-process poster/interview criterion (engineering now scores four sections; science is unchanged at five; the review prompt flexes the section count so the model emits exactly the rubric's sections).

---

## [0.8.0] — 2026-06-21

Player-facing **account & settings** work: a self-serve **teacher account** path, a **student settings screen** (reachable from a status-strip gear *and* the Clerk account modal) for editing all profile/lab/research info, the **lab↔teacher class link** surfaced in the lab panel, and a batch of **Operations Hub** improvements. Display names now stay in sync with Clerk. All green: typecheck, lint, **98 unit tests**, `next build`. No schema/migration changes — every field already existed.

### Added — Features

- **Student settings screen** (`components/settings/LabProfileSettings.tsx`, `SettingsPanel.tsx`, `GET/PATCH /api/settings`) — one form to edit **Name** + **School** (any member) and **Lab name** + **ZIP** (lead-only, enforced server-side with a 403, not just disabled in the UI). Reachable two ways from the lab: a **⚙ gear button** in the status strip (a pixel popup) and a custom **"Lab & Profile"** page injected into the Clerk account modal — both render the same component. Also edits the **research topic** (reusing `/api/discovery/topic` including its AI relevance-check + paper-wipe confirmation), the **research-plan** Google Doc, and the **one-sentence research idea**, all inline against the existing endpoints (no new AI routes).
- **Self-serve teacher accounts** (`POST /api/onboarding/teacher`) — onboarding gains an "I'm a student / I'm a teacher" choice. Choosing teacher sets Clerk `publicMetadata.role` **and** DB `User.role`, then lands on `/teacher` to create a class. Open self-select (an accepted pilot trade-off); a student who already onboarded **cannot** self-upgrade (409).
- **Lab ↔ teacher class link in the lab panel** (`components/lab/TeamPanel.tsx`) — a "Your teacher's class" section lets each member paste the class code any time after onboarding (reuses `POST /api/class/join`); the teacher's roster then sees the lab. `GET /api/team` now returns the caller's class.
- **Data Terminal: bulk paste + notes + export** (`lib/data-terminal/csv.ts`) — paste spreadsheet rows (tab/comma) in bulk, attach a per-point note, and export the table as CSV and the chart as PNG. Blank/invalid rows are dropped and counted.
- **Field Dispatch: history + streak** (`lib/field-dispatch/dispatch.ts` `computeStreak`) — a scrollable history of past dispatches with the student's saved answers, plus a calendar-consecutive answer-streak badge. Pure display of already-persisted data (no new LLM calls).

### Changed

- **Display name syncs to Clerk** (`lib/onboarding/profile.ts` `syncClerkDisplayName`) — editing the name in settings, and every onboarding path (create-a-lab, join-a-lab, teacher), now mirrors the name into the Clerk profile so the avatar/account never drift from the DB `User.name`.
- **Teacher gate falls back to the DB role** (`lib/teacher/auth.ts`, `(teacher)/layout.tsx`) — `requireTeacher` and the teacher layout resolve the role from the Clerk session claim **or** the DB `User.role`, so a freshly-promoted teacher isn't bounced before the session token re-mints.
- **Role-aware routing** (`app/page.tsx`, `(dashboard)/layout.tsx`) — the post-sign-in landing and the dashboard bounce now send a team-less **teacher** to `/teacher` instead of `/onboarding`.
- **ZIP moved out of the Science Fair hub** (`components/fair/ScienceFairFeature.tsx`) — the `LocationBar` ZIP input is removed; ZIP is now edited only at onboarding and in settings. Fair matching still reads the stored `Team.locationZip`.
- **Failure Log shows dates** (`components/ops/OperationsHubFeature.tsx`) — failure entries now display the formatted date, matching the progress log.

### Fixed

- **Literature Review re-prompted for the research idea** (`components/literature/LiteratureFeature.tsx`) — the idea box tracked submission only in local state and never loaded the persisted `Team.researchIdea`/`labType`, so reopening it after advancing showed the empty input again. It now hydrates from `GET /api/team` and shows the submitted idea + assigned lab type. The completed row's spacing and iconography were also cleaned up (single flask, a filled green "complete" bar instead of a stray hairline).
- **Data Terminal paste edge cases** — a blank x/y cell no longer parses as `0`; the CSV download anchor is appended to the DOM before click (Safari).

### Notes

- Editing the research idea in settings updates the text only; it does **not** re-run lab-type classification, so the assigned lab stays stable.

---

## [0.7.0] — 2026-06-20

Removes the **figurine** and **parental-consent** systems entirely and replaces the figurine-gated milestones with **teacher-validated phase advancement**. Adds four new (non-graphics) features — **Field Dispatch**, a **fair-deadline notification engine**, the **Data Terminal**, and the pilot **Teacher Dashboard** — plus **classroom join codes** and **high-school ingest** at onboarding. Gated by the full CI suite: typecheck, lint, **66 unit tests**, and `next build` all green.

### Added — Features

- **Field Dispatch** (`lib/field-dispatch/`, `GET/POST /api/field-dispatch`) — the daily ~2-minute discipline tip + reflection question (spec §7.1), surfaced as the first Operations Hub tab. Content is generated once per lab type per day by Claude Haiku and shared by every student of that type (≤6 calls/day; idempotent on a `(labType, publishedDate)` unique constraint; self-heals if the cron misses). Answering awards a flat **+10 KP once per student per day**, enforced by a `(userId, contentId)` unique constraint inside the award transaction so a double-submit can't double-pay.
- **Notification / reminder engine** (`lib/notifications/`, `GET/POST /api/notifications`, `/prefs`) — fair-deadline reminders at 30/14/7/1-day brackets plus a smart-urgency nudge when a fair is near and the Project Log has gone stale (spec §13.7). Pure compute logic is unit-tested; a deterministic `dedupeKey` + unique column makes the daily cron idempotent (re-runs and caught-up missed runs never double-notify). In-app `NotificationBell` in the status strip (60s poll); optional Resend email that is a no-op without `RESEND_API_KEY`.
- **Data Terminal** (`Experiment` + `Measurement` models, `/api/data-terminal/*`) — experiment tracking + graphing (spec §14.1) as an Operations Hub tab, gated at the `working` phase. recharts line charts with multi-series support; finite-number validation on every measurement so a bad client can't poison a chart.
- **Teacher Dashboard** at `/teacher/*` (`lib/teacher/auth.ts`, `app/api/teacher/*`) — the pilot-minimum dashboard (spec §15.11): a single-pass **roster** aggregate (no N+1) with attention flags, a phase-adaptive **student detail** view, a **validations queue**, and **feedback**. Strictly class-scoped via `requireTeacher` (Clerk `metadata.role`) + a `teacherOwnsTeam` IDOR guard, so a teacher can never read another class's data.
- **Classroom join + high-school onboarding** — onboarding now ingests the student's **high school** (find-or-create `School` by unique name) and an optional **class code**; teachers mint reusable class join codes (`Class.joinCode`); `POST /api/class/join` lets students join later. Shared resolution lives in `lib/onboarding/profile.ts` (used by onboarding, team-join, and class-join).

### Changed

- **Figurine milestones → teacher-validated phase transitions** — the two real-world checkpoints that used to hand out figurines (start data collection → `working`, advance to competition → `showcase`) are now `PhaseAdvanceRequest`s: a student requests via `POST /api/team/advance-phase` (`RequestAdvance` affordance in the lab scene), and a teacher approves in the dashboard with a race-safe conditional phase bump. `literature_review → research_planning` stays automatic/self-serve.
- **Showcase gateway is phase-only** (no Presenter figurine); **Data Terminal** is gated at `working` (was Analyst-figurine).
- **Cron routes** (`/api/cron/*`) added to the middleware public allowlist and authenticated by `CRON_SECRET` (`lib/cron/auth.ts`, fails closed); scheduled in `apps/web/vercel.json` (Field Dispatch 06:00 UTC, notifications 07:00 UTC).

### Removed

- **Figurine system** — dropped `FigurineUnlock` / `FigurineTier` and every code reference (`requiresFigurine`, `hasPresenter`, the figurine query in the lab page, the figurine validation stub).
- **Parental consent** — dropped the unused `ParentalConsent` model.
- **Legacy team-global paper columns** — dropped `papers.proficiency_demonstrated` and `papers.kp_awarded`, verified unread/unwritten (per-student `PaperProficiency` is the source of truth). `papers.pdf_data` is intentionally **kept** — it's still the active fallback for pre-R2 rows in the file route (see TODO.md for its staged retirement).

### Security / Robustness

- Every new route uses the established guards: strict zod (`parseJson`), rate-limiting (`requireTeamContext` / `requireTeacher`), and phase/role gating. KP awards and notifications are idempotent via unique constraints; teacher reads carry an explicit ownership check.
- Added DB indexes on the new hot paths (`activity_feed`, `field_dispatch_content`, `notifications`, `experiments`, `phase_advance_requests`, `teacher_feedback`). Distributed rate limiting was already wired (Upstash) and is verified, not rebuilt.

### Migrations

- `20260621030000_remove_figurines_add_teacher_notif_dataterminal` — drop figurine + parental-consent tables; add `PhaseAdvanceRequest` (+`ValidationStatus`), `TeacherFeedback`, `Notification`, `NotificationPref`, `Experiment`, `Measurement`; `School.adminId` nullable + `School.name` unique; `Class.joinCode` + teacher relation; new indexes.
- `20260621040000_drop_legacy_paper_proficiency_columns` — drop `papers.proficiency_demonstrated` + `papers.kp_awarded`.
- Both authored via `migrate diff` + `db execute` + `migrate resolve` (the shadow DB can't replay a pre-existing enum migration, so `migrate dev` is unusable in this repo). Apply with `prisma migrate deploy`.

### Notes / follow-ups

- Email reminders require `RESEND_API_KEY` (optional); without it the in-app bell is the only channel. Crons require `CRON_SECRET`. See `.env.example`.
- No production deployment exists yet (local Docker Postgres + R2 only). Vercel/Supabase setup and the final `pdf_data` retirement are tracked in `TODO.md`.

---

## [0.6.0] — 2026-06-20

A two-part release: the **Showcase Wing** and **Proof of Expertise / Clearance + KP Shop** feature work lands, and a dedicated **production-hardening pass** (testing, scalability, and security) layered on top of it. The hardening pass is functionality-preserving — every change is either additive or a verified-equivalent extraction, gated by `tsc --noEmit` (strict) and a new unit-test suite (60 tests).

### Added — Features

- **Showcase Wing** — teams publish a completed project as a portfolio: short/long title, ≤250-word abstract, board (PDF), quad chart (PNG), a ~2-minute video link, and optional repo / demo-video / supplement links. Privacy is server-enforced (`public` / `school_only` / `link_only` / `private`) via `canViewShowcase` in `lib/showcase.ts`. Image/PDF bytes stream from **private R2** through the privacy-checked `GET /api/showcase/public/asset` route — never a public bucket or signed URL. Public gallery (`/showcase/gallery`) + per-slug pages (`/showcase/[slug]`) with per-day, per-visitor view counting that never stores a raw IP. Video links are host-allowlisted (YouTube/Vimeo) and the embed src is rebuilt server-side; all other links are validated `http(s)` and rendered with `rel="noopener noreferrer"`.
- **Proof of Expertise / Clearance ladder** — a team raises `TeamCurrency.clearanceLevel` (0→5) by passing escalating clearance exams generated from the team's *own* project context (topic, idea, plan, sources, logs) and graded by Claude. A passing aggregate (≥75) raises clearance as a high-water mark and grants a one-time KP bonus. In-progress answers persist (`answersJson` / `progressIndex`) so an exam can be resumed. Surfaced in the Operations Hub (`components/ops/ExpertisePanel.tsx`).
- **Knowledge-Point shop** — 12 purchasable lab buildings (`lib/shop.ts`) gated by **KP** (`cost × max(1, memberCount)`) and a **clearance ceiling** (`minClearance`), so the best structures require demonstrated expertise, not just grinding. Purchases debit atomically (conditional `updateMany` + unique constraint) to prevent double-spend / double-buy.

### Added — Engineering

- **Unit-test harness (Vitest)** — `vitest.config.ts`, `pnpm --filter web test`. 60 tests, no DB / no Next server / no network. Covers the highest-stakes pure logic: economy invariants, the `canViewShowcase` privacy truth table, phase-gating, the rate limiter (memory + Upstash + fail-open), and the LRU cache.
- **`lib/economy.ts`** — the KP / clearance / purchase arithmetic, extracted from the route handlers into pure, unit-tested functions: `computeQuizAward`, `computeClearanceRaise`, `evaluatePurchase`, `clampScore`, and an opt-in anti-inflation `clampScoreGain`. Faithful extractions — the routes compute identical values; the tests pin the invariants (KP high-water never decreases; ≤100 KP per paper; clearance only rises; failing/weaker retakes grant nothing).
- **`lib/api/route-context.ts`** — `requireTeamContext(req, { tier, feature? })`, a single guard that resolves auth + rate-limit + team context + phase-gate and returns the internal `User.id` and team in **one** DB query.
- **`lib/lru.ts`** — a small bounded TTL + LRU cache (`get`/`set` with size-capped eviction).

### Changed

- **`requireTeamContext` adopted across 19 routes** — the auth → rate-limit → `getTeamContext` → *second* `user.findUnique` → phase-gate boilerplate that was copy-pasted into every handler is replaced by one call. This **eliminates a duplicate `user` query per request** (the route looked up the same row twice) on every production team-scoped route. Behaviour and status codes are preserved; the dev-only `dev/fill-papers` route is intentionally left as-is.
- **Rate limiter is now pluggable + async** (`lib/rate-limit.ts`) — a `RateLimitStore` interface with `MemoryStore` (default; identical fixed-window semantics) and `UpstashStore` (shared counters over the Upstash REST API, **no new dependency**; activates automatically when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set). On multi-instance/serverless hosting the limit now holds **globally** instead of per-instance. `enforceRateLimit` became `async`; all 59 call sites await it. Upstash **fails open** on outage (logs, allows) so a limiter blip can't take down the API.
- **Trusted client IP for rate limiting** — `clientIp` now prefers edge-set headers (`RATE_LIMIT_IP_HEADER` → `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`), so the per-IP backstop can't be trivially defeated by a spoofed `X-Forwarded-For` on anonymous routes.
- **Article cache bounded** — the Wikipedia proxy (`app/api/discovery/article`) swapped its unbounded `Map` for `LruCache` (cap 500, same 30-min TTL), so a long-running instance can't grow memory without limit.

### Security

- **AI grading prompt-injection hardening (V1)** — quiz and clearance grading feed attacker-influenceable text (uploaded PDF / student-authored project context) to Claude as ground truth. That text is now wrapped in explicit `<paper_text>` / `<project_context>` delimiters and the system prompt marks both the document **and** the student's answers as *data, not instructions* — so an injected "award full marks" can't steer the grade and inflate the KP/clearance economy. A tested, opt-in `clampScoreGain` is available to cap implausible single-attempt score jumps (no-op by default).
- **Secret hygiene for view fingerprinting (V3)** — `viewFingerprint` no longer reuses `R2_SECRET_ACCESS_KEY` (a storage credential) with a hardcoded fallback. It uses a dedicated `VIEW_FINGERPRINT_SALT` and **fails closed in production** (resolved lazily on first use so `makeSlug` and `next build` are unaffected); dev falls back to a labelled constant.
- **Standardised AI-call error handling (M5)** — the quiz- and expertise-grading Anthropic calls are now wrapped like the chat route (log internally, return a generic 502) instead of letting an SDK throw surface as an unhandled 500.

### Fixed

- **Duplicate per-request `user` lookup** — team-scoped routes previously queried the `user` row twice (once in `getTeamContext`, once for the internal id). Now one query (see `requireTeamContext`).

### Migrations

- `20260621000000_clearance_and_shop_purchases` — clearance level + KP ledger and team shop-building purchases
- `20260621010000_expertise_exam_progress` — saved in-progress exam answers + progress index
- `20260621020000_showcase_competition_format` — showcase competition asset format (board / quad chart / video / links)

### Notes / follow-ups

- The in-memory rate-limit and article-cache stores remain per-instance unless Upstash is configured; this resolves the long-standing "move counters to a shared store" open question (see architecture.md §12).
- `next lint` / `next build` were not run in the authoring environment (lint needs interactive ESLint setup; build needs Clerk/DB/R2 env). `tsc --noEmit` (strict) is clean, `--noUnusedLocals` shows no dead imports, and 60 unit tests pass. Run lint + build in CI before release.

---

## [0.5.2] — 2026-06-19

### Added
- **Fair dataset expanded** — `lib/fairs/dataset.ts` rebuilt from the Society for Science affiliated-fair directory: **268 entries** (1 ISEF + 40 state + 227 regional fairs), up from the provisional 56. Every entry includes `websiteUrl` (scraped from the directory listing), `latitude`/`longitude` (geocoded via Nominatim or manually fixed), and a stable `seed_key` for idempotent upserts
- **City-level fair geocoding** — 184 fairs re-geocoded from Nominatim by extracting the city hint from each fair's name (e.g. "Synopsys Silicon Valley" → San Jose); 60 further manual coordinate fixes applied. Tooling: `scripts/geocode-fairs.mjs`. Result: all 268 fairs at city level rather than state centroid
- **Team location stored as lat/lng** — `teams.location_lat` / `teams.location_lng` (DOUBLE PRECISION) stored at onboarding and on every `POST /api/team/location` call via `geocodeZip()` (Nominatim, 1 req/s). Eliminates the ZIP3-centroid approximation that caused dense metros (Bay Area ZIPs → SF centroid) to match the wrong fair
- **ISEF category browser** — `components/fair/CategoryBrowser.tsx` + `lib/fairs/categories.ts`: the 22 ISEF categories with descriptions and recommended lab types
- **Forms checklist + per-form status API** — `components/fair/FormsChecklist.tsx` + `app/api/fairs/forms/route.ts` + `app/api/fairs/forms/[formId]/route.ts` + `lib/fairs/forms.ts`. Progress denominator now starts at **3** (required forms: 1, 1A, 1C) and grows by 1 each time a team engages with an optional form (marks it `in_progress` or `complete`)

### Changed
- **`matchFairs` uses stored team coordinates** — `lib/fairs/match.ts` now accepts `coords?: readonly [number, number] | null` and uses them (falling back to `STATE_CENTROIDS[state]`) instead of the old ZIP3 lookup. 95051 → Synopsys Silicon Valley at 3.9 mi ✓; 94086 → same fair at ~5 mi ✓
- **Firecrawl externalized** — added `firecrawl` to `serverComponentsExternalPackages` in `next.config.mjs` so webpack doesn't try to bundle `undici`. Fixes the build error on `sync-deadlines`

### Fixed
- **Nearest-regional fair matching for dense ZIPs** — all CA regionals previously returned Orange County (first in DB order; all fairs shared identical state-centroid coordinates). Root cause: 35 states had Nominatim rate-limit failures during the initial scrape. Fixed by re-geocoding fairs + storing team lat/lng at onboarding
- **Forms progress bar denominator** — was `completed / 12` (all 12 forms). Now `completed / (3 + touchedOptional)`, starting at `X / 3`

### Migrations
- `20260619010000_reseed_isef_fairs` — clears all seeded fairs and their events before the 268-entry re-seed
- `20260619020000_add_team_location_coords` — adds `location_lat` / `location_lng` DOUBLE PRECISION to `teams`

---

## [0.5.1] — 2026-06-18

### Added

#### API security hardening (OWASP API Top 10)
- **Rate limiting on every API route** — new `lib/rate-limit.ts`. `enforceRateLimit(req, tier, userId)` returns a graceful **429 + `Retry-After`** when exceeded. Tiers (per minute): `ai` 12, `upload` 8, `mutate` 40, `read` 120, `join` 10. Checks **both a per-user and a per-IP bucket**; the per-user bucket is the real limit while the per-IP bucket is a generous `×12` backstop so a classroom behind one school NAT IP isn't locked out. Specifically caps the Claude-backed endpoints (chat, quiz gen/grade, paper-upload metadata, research-plan review/idea-check, fair deadline sync) so a single account can't run up unbounded Anthropic spend. `join` is kept tight against invite-code brute-forcing. Counters are in-memory (per instance) by design — see architecture.md §6/§7.1 for the shared-store / Cloudflare-edge upgrade path
- **Strict input validation** — new `lib/validation.ts`. Every body-accepting route now parses via `parseJson(req, schema)` against **strict** zod schemas: type checks, length caps (names ≤80, chat ≤60 msgs × 8k chars, quiz answers ≤50 × 5k, node batches ≤200, …), and `.strict()` so unexpected fields are rejected (mass-assignment defense). Malformed JSON returns a clean 400 instead of an unhandled 500
- **Upload limits** — paper PDF upload capped at **20 MB** and verified by **`%PDF-` magic bytes** (the client-declared MIME type is no longer trusted)

### Changed
- **Secret/error handling** — confirmed Anthropic + R2 keys are server-only (no `NEXT_PUBLIC_*`); removed `detail: String(err)` from client error responses across papers upload, chat, and fair deadline sync (internal errors are now logged server-side only)

### Fixed
- **Stored-XSS hardening in the Wikipedia reader** — `app/api/discovery/article` now runs article HTML **and** the page title through **`sanitize-html`** (strict tag/attribute allowlist) before they're rendered via `dangerouslySetInnerHTML` in `WikiReader`. The prior regex tag-stripping was cosmetic, not a security boundary, and Wikipedia content is publicly editable

### Removed
- Dead `'/api/showcase/(.*)/view'` entry from the `middleware.ts` public-route matcher (no such route exists)

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
- Past results (answers + Vega's feedback) reload on reopen; header tabs switch between **Quiz results** and **Discuss with Vega** (active tab gold); pass → green "Proficiency demonstrated" banner (mirrored on the source slot)

#### Literature Review — Viewer, Chat, Delete
- **In-panel PDF viewer**: PDF bytes stored in `papers.pdf_data`, streamed inline (auth'd) via `GET /api/papers/[id]/file`
- **Chat persistence**: `PaperChatMessage` model; `GET/POST /api/papers/[id]/chat` save and reload the per-user conversation
- Vega replies rendered as **Markdown** (`react-markdown` + `remark-gfm`, styled via `.chat-md`)
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
- SVG recreation of the scienium mascot (figure hunched over a table) rendered inline alongside the "scienium" heading
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
- Chat is pre-seeded with Vega's opening message; user messages sent via `POST /api/papers/[id]/chat`; Enter key submits
- `PROFICIENCY_DEMONSTRATED` hidden signal stripped from display; triggers removal of the orange banner for that paper

#### API Routes
- `POST /api/papers` — accepts `multipart/form-data` PDF upload; parses text with `pdf-parse`; creates `papers` row with `status = processing`; stores extracted text in `contentHash` field; fires async Claude call (`claude-sonnet-4-6`) to extract title, authors, and abstract; marks paper `ready` on completion
- `GET /api/papers` — returns all papers for the authenticated user's team
- `GET /api/papers/[id]` — returns single paper by ID (used for status polling)
- `POST /api/papers/[id]/chat` — runs a tutoring conversation against the paper's extracted text using `claude-sonnet-4-6`; enforces team ownership; returns `{ reply }` JSON

#### Claude System Prompts
- **Extraction prompt** (in `POST /api/papers`): instructs Claude to return a JSON object `{ title, authors, abstract }` from raw PDF text; used server-side only
- **Q&A tutor prompt** (in `POST /api/papers/[id]/chat`): Vega persona; assesses comprehension across four criteria (hypothesis, methodology, findings, relevance); emits `PROFICIENCY_DEMONSTRATED` signal on a new line when all four are met; encourages genuine understanding over surface recitation

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
