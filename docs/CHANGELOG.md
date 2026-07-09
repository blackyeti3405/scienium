# scienium — Changelog

All notable changes to this project are documented here.  
Format: `## [version] — YYYY-MM-DD` with sections: **Added**, **Changed**, **Fixed**, **Removed**.

---

## [0.21.3] — 2026-07-09

Refactor Phase 4 — paper lists are metadata-only, and duplicate uploads are
prevented by the database.

### Added
- `Paper.doi`, `Paper.credibilityTier`, and `Paper.sourceHost`, computed once at
  upload. The paper list now reads these stored columns instead of loading every
  paper's extracted full text to derive a DOI/credibility badge, so listing a
  library stays metadata-only and fast as it grows.
- A `(teamId, contentHash)` unique index. Two uploads of the same PDF for one
  team can no longer both persist even under a race — the second is rejected and
  returns the same 409 as the application-level pre-check. (Null content hashes
  stay distinct, so non-PDF papers are unaffected.)
- `Paper(teamId, createdAt)` and `Paper(teamId, status)` indexes for the common
  list queries.

_Deferred:_ moving `Paper.fullText` into a separate `PaperContent` table (the
plan's larger "heavy content" split) — the list no longer reads full text, so
the high-value outcome is already achieved; leaning the row is a follow-up.

---

## [0.21.2] — 2026-07-09

Refactor Phase 3 — expertise grading is now claim-based, idempotent, and honest.

### Added
- `ExpertiseExam.status` (`active`/`grading`/`graded`/`failed`) plus
  `gradingClaimedAt`/`gradingRequestId`, so a grade is claimed before the paid
  Claude call. A second concurrent grade of the same exam is refused instead of
  calling the model twice, and a claim older than five minutes is treated as
  stale and may be retaken (a crashed grade never strands the exam).

### Fixed
- The grade response now derives `raised`, `newClearance`, and `kpEarned` from
  the committed transaction — the conditional clearance raise's row count — rather
  than a pre-transaction guess. A pass that didn't actually advance the team (a
  teammate already raised clearance) can no longer report a raise or bonus that
  never happened.
- A failed or unparseable grading call releases the claim back to `active`, so
  the exam stays retryable instead of stuck.

---

## [0.21.1] — 2026-07-09

Refactor Phase 2 — plot placement occupancy races.

### Fixed
- Building **move** is now race-safe. It runs inside the per-team plot advisory
  lock (the same `team-plot:<teamId>` lock `place` uses) and re-checks cell
  occupancy against committed rows before writing, so two simultaneous moves can
  never land two items on the same cell. Previously `move` wrote with no
  transaction and no lock at all.
- **Sell** reads the building row and deletes it inside the plot lock, so a
  concurrent double-sell now returns 404 instead of a delete-not-found 500.

### Changed
- **Upgrade** takes the per-team plot lock as well, so every plot mutation
  (place / move / sell / upgrade) serializes on one key. Its conditional currency
  debit and level-bump guards are unchanged.

_Deferred:_ a unified `TeamPlotPlacement` table with a DB-level `(teamId, posX,
posY)` uniqueness constraint (the plan's larger "durable refactor") — the
advisory lock already delivers the race-safety outcome; the table is a
defense-in-depth follow-up.

---

## [0.21.0] — 2026-07-09

An architecture-integrity pass focused on authoritative ownership, durable
background work, race-safe rewards, smaller feature boundaries, immediate
lab-building interactions, and fully self-paced phase progression.

### Added
- Explicit `User.activeTeamId` and `Team.classId` ownership, with an additive
  backfill migration and a membership-verified active-team resolver — a stale or
  forged `activeTeamId` can never surface a team the user does not belong to.
- Ownership access-path indexes (`users.class_id`, `classes.teacher_id`,
  `team_members.team_id`, `team_invites(team_id, expires_at)`).
- Durable `PaperProcessingJob` records, an atomic paper processor, and a
  five-minute recovery cron for pending, failed, or stale PDF work.
- PostgreSQL advisory-lock helpers for team membership, plot occupancy, quiz
  rewards, and other multi-row aggregates.
- Runtime-validated Literature API contracts and a shared browser JSON client.
- Architecture decision records for team/class ownership, paper processing, and
  feature boundaries.
- Closed Prisma enums and migrations for bounded roles, statuses, source types,
  notification kinds, showcase policy, and fair workflow values.

### Changed
- Building pickup now begins on pointer-down. Placement, movement, and upgrades
  render optimistically and reconcile with the server afterward, eliminating
  network latency from the visible interaction while preserving rollback.
- Codex progress and daily rewards are scoped by user and team; first-completion
  and daily-cap writes are serialized.
- Teacher authorization is fully `Team.classId`-scoped — the transitional
  lead-class fallback was removed after a backfill — and the DB `User.role` is
  authoritative, so a stale Clerk claim can no longer keep a downgraded teacher in.
- Phase advancement is fully self-paced: `research_planning → working` and
  `working → showcase` are free student-clicked advances (the literature-review
  gate — 25 sources + per-member proficiency, then Haiku lab-type classification —
  is unchanged).
- Large authored Data Terminal guides and the fair dataset moved from `lib/` to
  `content/`; teacher paper Q&A moved into a feature-owned subfolder.
- Former placeholder deep links now open the real Operations Hub, Literature,
  Research Plan, and Science Fair surfaces on the requested tab.
- Discovery optimistic mutations now rehydrate after failed persistence instead
  of leaving unsaved client state.
- `ARCHITECTURE.md` was rewritten and fact-checked against the routes, modules,
  workflows, schema, migrations, integrations, tests, assets, and deployment
  configuration. `SETUP.md` and `.env.example` no longer describe the removed
  Python AI service.

### Fixed
- Class joins can no longer split a lab across classes, and concurrent team joins
  cannot overfill a team.
- Concurrent building placement cannot occupy one cell twice.
- Concurrent quiz grading/retry submissions and Codex completions cannot award
  duplicate KP.
- Paper processing survives request timeout or process loss and can be retried
  safely.
- Teacher roster, reports, student detail, and paper inspection no longer infer
  authorization from any coincidental class membership.
- Owned-but-unplaced buildings preserve their real paid cost and level when
  positioned.
- Lab feedback reuses its prefetched snapshot instead of issuing a duplicate
  request when the panel opens.
- Building E2E setup now mutates the configured application database instead of
  a hard-coded Docker database, and resolves the fixture team by name rather
  than assuming a stale ID. Its KP baseline now covers the member-scaled purchase
  and upgrade sequence.
- `E2E_SKIP_LLM` no longer leaks into a normal `pnpm dev` server — it moved from
  `.env.local` to the Playwright config — so local quiz, grading, Vega, and Codex
  study-plan features generate real content instead of deterministic test stubs.

### Removed
- The teacher **phase-validation pipeline**: the `PhaseAdvanceRequest` model and
  `validation_status` enum, the `/teacher/validations` queue (page, API, and
  `ValidationQueue` component), and the student "request validation" affordance.
  Phase advancement is self-paced instead.
- Unused TanStack Query and React Hook Form dependencies.
- Stale environment variables and documentation for the deleted Python AI
  service.

---

## [0.20.0] — 2026-07-08

A **maintainability and hardening pass** — no gameplay changes; all runtime behavior is
preserved. It standardizes API auth, decomposes the largest feature component, moves the
Field Codex's enormous authored tracks to generated data, and centralizes environment-variable
access behind lazy validation.

### Added
- **`apps/web/lib/env.ts`** — centralized, **lazy, per-variable** zod validation for server env
  (R2, Anthropic, Firecrawl, Database, Clerk, view-fingerprint salt). Each variable is validated
  and memoized on first use, never at import — so `next build` and routes that don't need a given
  secret never fail because an unrelated var is unset.
- **`apps/web/lib/anthropic.ts`** — one shared, lazily-constructed Anthropic client.
- **Field Codex generated-content pipeline** — JSON source (`lib/ops/codex/content/<slug>.json`) +
  `pnpm --filter web codex:build` (`scripts/build-codex-tracks.mjs`) that emits the typed
  `tracks/*.ts` wrappers and a checksum lock, plus a new `generated-content.test.ts` (zod
  `TrackSchema` + wrapper-deep-equals-JSON + checksum) alongside the existing content-shape gate.
- **`AGENTS.md`** and the `.agents/` / `.codex/` agent-tooling configs.

### Changed
- All remaining team-scoped **API routes migrated to `requireTeamContext`** — one standardized
  auth → team-scope → rate-limit → feature-gate path.
- **`ProjectPhase` / `LabType` / phase order / labels are now canonical in
  `packages/shared-types`**; `lib/phase.ts` re-exports them (fixes drift with Prisma — adds
  `lab_selection` and `research_planning`).
- **Field Codex tracks moved from ~29,000-line authored TS modules to JSON data** generated into
  ~10-line wrappers — runtime lesson data is unchanged (deep-equal, checksum-locked).
- **`LiteratureFeature.tsx` (1,383 lines) decomposed** into a shell plus workflow components
  (`PaperSlot`, `UploadSourceButton`, `QAPanel`, `QuizPanel`, `PaperChat`, `CredibilityBadge`,
  `VettingChecklist`) and feature-local hooks (`usePapers`, `usePaperQuiz`, `usePaperChat`).
- **Storage (R2), Firecrawl, and Anthropic clients now construct lazily** via `env.ts` instead of
  eager `process.env.X!` reads.

### Fixed
- Stale doc pointers: `AGENTS.md` → `.claude/PARALLELISM.md`; `ARCHITECTURE.md` component tree and
  flows brought back in line with the tree.

### Removed
- Eager `process.env.X!` non-null env reads (replaced by lazy validated getters in `env.ts`).
- Stray `.DS_Store` files.

---

## [0.19.0] — 2026-07-07

**Field Codex replaces Field Dispatch** as the daily engagement pillar, plus the rest of the
batch: the **Study with Vega** companion, the teacher **Class Reports** tab, the quiz
**targeted-retry** loop, Literature **credibility badges**, the Showcase **Abstract guide**,
and the **PvP raid redesign** (spec-level; replaces the turn-based battle design). One drop
migration. Starts the 0.19.x line — subsequent Codex lesson batches ship as 0.19.1, 0.19.2, …

### Added

- **Field Codex (F13)** — the new daily learning pillar: authored, typed lesson tracks
  (Track → Core/Branch Segment → sequentially-gated Units → Lessons, each ending in a
  3–5-question checkpoint graded locally at an 80% bar — zero LLM at read/grade time). Ships
  with 3 field tracks / **609 lessons** (gait-biomechanics 274, acoustics-sound 287,
  astronomy-astrophysics Core 48; 13 of 174 planned segments across the 29-field taxonomy).
  KP per first-ever lesson pass with an atomic per-student daily cap (`codex_lesson_progress`
  + `codex_kp_days`); an LLM **Study Plan** (the feature's only Anthropic call, 2/team/day)
  routes teams to relevant tracks (`team_study_plans`). Authored via the vendored
  `.claude/codex-pipeline/` harness (`/codex-pipeline`), gated by a content-shape unit test.
  E2E spec F13.
- **Study with Vega (F18)** — persistent, team-shared study chat grounded in the team's own
  project (research idea + study plan + Codex tracks in context, `lib/ops/vega-study-context.ts`);
  messages persist per team (`vega_study_messages`). E2E spec F18.
- **Teacher Class Reports (F8)** — `/teacher/reports`: read-only class-wide analytics
  (phase distribution, engagement/progress summaries). Zero LLM, no new tables. E2E spec F8.
- **Quiz targeted retry (F11)** — a failed paper quiz now shows per-miss rationale plus a
  "what a strong answer covers" note, and "Fix my misses" re-asks only the failed questions
  (+1 fresh) via `POST /api/papers/[id]/quiz/retry`, with a capped retry aggregate
  (`lib/economy.ts`). E2E spec F11-quiz-retry.
- **Literature credibility badges (F12)** — the papers list resolves a per-paper
  `credibilityTier` at read time (promoted Discovery source tier → DOI extraction from the
  PDF text → "self-uploaded — verify yourself" fallback; `lib/discovery/credibility.ts`).
- **Showcase Abstract guide** — static authored reference for the 250-word ISEF abstract
  (structure, conventions, worked examples — `lib/fairs/abstract-guide.ts`,
  `AbstractGuidePanel`), test-pinned.
- **`/update-github` command** — one-shot release flow: docs pass → gates → branch → commit →
  PR → CI → merge, encoding the 0.19.x lesson-batch versioning convention.

### Changed

- **Field Codex leads the Operations Hub** — first and default tab; the Ops Hub gateway
  building routes to the new `/daily/codex` deep link. The Momentum card's 7-day KP window
  and the teacher student drill-down now report **Codex** KP/progress (lessons completed,
  KP from lessons, recent lessons with track/lesson labels) in place of dispatch streaks.
- **PvP redesigned as a raid system (spec §11)** — an attacker raids a snapshot of another
  team's base with building-granted spells; fully replaces the earlier 6v6 turn-based
  battle design. Design-only this release: the API is stubbed (501), the old combat engine /
  moves seed / battle-action route are deleted, and `infra/seed/buildings.ts` now assigns
  each building a raid `spellType`.
- **SETUP.md absorbed setupwindows.md** — one setup doc with macOS and Windows sections.

### Removed

- **Field Dispatch — the entire feature.** The Ops Hub tab, `/daily/dispatch` deep link,
  `GET/POST /api/field-dispatch`, the daily pre-generation cron (route + `vercel.json`
  entry), `lib/field-dispatch/`, the teacher drill-down section, both dispatch E2E specs,
  and the three DB tables (`field_dispatch_content`, `field_dispatch_responses`,
  `field_dispatch_streak_claims`) via migration `drop_field_dispatch`. The unshipped
  dispatch streak/fluency/archive work (F15) was retired with it — Codex's daily-cap
  economy replaces the dispatch streak mechanic.
- The turn-based PvP battle implementation remnants (`lib/pvp/combat-engine.ts`,
  `infra/seed/moves.ts`, `POST /api/pvp/[battleId]/action`).

---

## [0.17.0] — 2026-07-06

**Teacher rubric scoring**, three more reference guides (**Methods**, **Data Quality**, and a
Literature **Research Guide**), full **ISEF form guides + hazard classes** in the Forms
checklist, **30 new economy buildings** completing all six lab-type catalogs, an app-wide
**loading-state overhaul** on shared pixel primitives, and a deep multi-agent **code-review
pass** (23 verified findings — 9 bug fixes + 14 refactors). One additive migration.

### Added

- **Teacher rubric scoring** — a "Rubric" tab in the teacher's per-student drill-down scores the
  team against the same ISEF criteria the students self-check, side-by-side with the team's own
  scores, guided by curated low/mid/high **anchor descriptions and talking points** per criterion
  (`lib/fairs/rubric-anchors.ts`, all 10 criteria across both tracks). New teacher-scoped
  `GET/PUT /api/teacher/rubric` (rate-limited, `teacherOwnsTeam` IDOR guard). `TeamRubricScore`
  gains a `scorerRole` discriminator (`'student' | 'teacher'`) so a teacher save can never
  overwrite the team's self-check (migration `team_rubric_scorer_role`); the seed script and a new
  F10 E2E spec cover the flow end-to-end.
- **Data Terminal — Methods Guide** — **45 experimental-design concepts** (variables, controls,
  randomization, blinding, sample size, validity threats, …) — everything a team must get right
  before any data exists (`lib/data-terminal/methods-guide.ts`).
- **Data Terminal — Data Quality Guide** — **36 concepts** on everything after data is collected:
  measurement uncertainty, significant figures & units, data cleaning, methodology pitfalls
  (`lib/data-terminal/data-quality-guide.ts`).
- **Literature — Research Guide** — a header-toggled reference inside Literature Review: a
  **70-term research glossary** plus an 8-section **anatomy-of-a-paper** walkthrough with a
  recommended reading order (`lib/literature/research-guide.ts`).
- **ISEF form guides + hazard classes** — each of the 12 tracked ISEF forms in the Forms
  checklist now expands into a full in-app guide (what it is, who needs it, section-by-section
  walkthrough — `ISEF_FORM_GUIDES`), plus a 4-class **hazard primer** (`lib/fairs/safety.ts`) so
  teams can tell which conditional forms apply. Unit tests pin guide↔form completeness.
- **Economy catalogs for TerraBase, MindFrame, Axiom** — **30 new purchasable buildings**
  (10 per lab type, matching the spec §9.3 rosters) on the shared 10-step cost/clearance ladder,
  with sprites. New `lib/shop.test.ts` pins per-lab completeness, sprite↔manifest membership,
  key uniqueness, and economy-curve parity.
- **Loading-state overhaul** — shared pixel primitives (`PixelSpinner`, `PixelSkeleton`,
  `BusyButton`, `LabeledLoader`, `PixelProgressBar`, plus panel/route skeletons under
  `components/ui/skeletons/`) replace the ad-hoc spinners and busy ternaries across the app;
  new route-level `loading.tsx` for the dashboard, teacher, game, gallery, and showcase routes;
  `lib/uploadWithProgress.ts` (XHR) drives real byte-level upload progress bars.
- **Showcase gallery browser** — the gallery's filter tabs + grid moved into a client component
  with `useTransition`: the clicked tab highlights instantly while the grid dims for the server
  round trip.

### Changed

- **Robotics Bay requires clearance 3** (was 2), aligning volt_lab with the shared tier ladder.
  Stale dev DBs need `pnpm --filter web seed:e2e` (which now also restores the E2E team's
  KP/clearance baseline) before the upgrades E2E passes; teams sitting at clearance 2 see it
  locked until they earn clearance 3.
- **Shop catalog is now derived, not hand-repeated** — an exported `TIER_LADDER` plus a per-lab
  builder derive `cost`/`minClearance` from ladder position and the sprite slug from the key
  (~565 lines of literals → ~160); a price rebalance is now a one-line edit, and `shop.test.ts`
  imports the same ladder instead of a copy.
- **Guide panels share one chrome** — `SectionLabel`, `CsvTable`, the search/category/count/empty
  scaffold, and the collapsible box extracted to `components/ops/guide-chrome.tsx`, with one
  generic `filterGuideEntries()` (`lib/guides/filter.ts`) behind each guide's typed filter export,
  and a shared `useToggleSet` hook replacing nine hand-rolled Set toggles. All six guide panels
  (Stats / Charts / Plot / Methods / Data Quality / Research) consume it — no visual change.
- **Guide panels are code-split** — every guide panel now loads via `next/dynamic` on first open
  instead of shipping its static text with the Operations Hub / Literature chunks.
- **Teacher review queues share one decide flow** — `useDecisionQueue` + `DecisionControls`
  (`components/teacher/DecisionControls.tsx`) replace the twin copy-pasted approve/reject
  implementations in ValidationQueue and ShowcaseModerationQueue.
- **Rubric wire format slimmed** — the static anchors/talking points now render from the client
  bundle; `GET /api/teacher/rubric` returns only score rows + totals, and both rubric PUTs total
  scores in Postgres (`aggregate _sum`) instead of re-reading all rows. The
  `'student' | 'teacher'` contract is centralized as `SCORER_ROLES` in
  `lib/fairs/rubric-scoring.ts`.

### Fixed

- **Teacher rubric: focus+blur no longer persists an unintended 0** — blur saves only when the
  draft actually changed (an unscored criterion previously gained a real 0-score row, a changed
  total, and a "Last scored by" line from a mere click-through), saves serialize behind an
  in-flight guard, and a save resolving after a track switch can no longer stamp the other
  track's total onto the header.
- **Showcase gallery thumbnails could stay permanently invisible** when a cached image finished
  loading before React hydration (the reveal relied solely on React's `onLoad`); a callback ref
  now checks `img.complete` on mount. Cmd/ctrl-clicking a filter tab opens a new tab again
  (the transition handler no longer calls `preventDefault` on modified clicks).
- **Upload responses that aren't JSON fail loudly again** — `uploadWithProgress`'s `json()`
  matches fetch semantics (rejects on an unparsable body) instead of returning `{}` that call
  sites dereferenced into undefined asset/url/id values.
- **Teacher student drill-down: stale-response guard** — a slow overview response for a
  previously viewed student can no longer overwrite the currently displayed student's page.
- **Teacher queues: only the clicked decision shows busy** — approving no longer relabels the
  adjacent Request-changes button to "Requesting…" (and vice versa).
- **Onboarding can no longer strand a disabled form** — if the post-signup navigation bounces
  back to /onboarding, an 8s recovery re-enables the form with a retry message.
- **E2E hardening** — the F3 research-plan spec's load gate tracked the new skeletons (its old
  `.animate-spin` gate went vacuous with the spinner overhaul); its ACs no longer assume a
  virgin DB row (the "synced" assertion could pass on a *previous* save, ending the test while
  the new save was still in flight — the root cause of a deterministic stale-reload failure);
  F10's re-save ACs use the explicit Save button now that no-op blurs are deliberately skipped;
  the heaviest F11 test is marked slow (measured at ~29s of its 30s budget on a clean tree).

---

## [0.16.0] — 2026-07-05

The largest feature release so far: **eight gameplay features** from a pipeline batch, a
**Discovery overhaul** (per-topic interest color-coding, a full-window tree view, and
multi-tree creation), and three new **Data Terminal reference guides** built to expose students
to real analysis knowledge — a **65-measure Stats Guide**, a **250-chart field-specific Charts
Guide** whose example charts are real matplotlib renders of realistic data (lazy-loaded per
field across 29 scientific fields), and a **45-type Plot Guide**. Also fixes the
`/api/fairs/match` hang that froze the Science Fair Hub, and adds a reproducible E2E fixture
seed script. Four additive migrations.

### Added

- **Rubric self-assessment** — a "Self-check" tab in the Science Fair Hub (and the revived
  `/fair-hub/rubric` route) lets a team score itself against each ISEF criterion with a live
  judge-readiness total out of 100. New team-scoped `GET/PUT /api/rubric/self-assessment`,
  backed by a new `TeamRubricScore` table; scores drive off the existing `ISEF_RUBRIC` literal.
- **Data Terminal — Stats Guide** — a searchable, category-filtered guide of **65 statistics
  measures** (`lib/data-terminal/stats-guide.ts`). Each teaches one concept with a plain-language
  definition, the Unicode formula, a symbol-by-symbol breakdown, a sample CSV dataset, and
  step-by-step Python whose printed output is **empirically verified by execution**.
- **Data Terminal — Charts Guide** — **250 field-specific charts across 29 scientific fields**
  (gait biomechanics, chemistry, astronomy, clinical medicine, oceanography, …), each with a
  description, plot type, bulleted `data needed` (name + unit), interpretation, and a **real
  matplotlib-rendered example** of realistic noisy data. Content is split into per-field lazy
  modules (`lib/data-terminal/charts/<field>.ts`) behind a light eager index so only the
  selected field's charts load.
- **Data Terminal — Plot Guide** — **45 general plot types** (bar, line, box, violin, scatter,
  heatmap, sankey, …) across six categories, each with when-to-use, bulleted data needs, and a
  matplotlib example (`lib/data-terminal/plot-guide.ts`).
- **Discovery interest color-coding + Discovery Tree view + New tree** — mark each topic
  green / orange / red inline on the tree; a new full-window "Discovery Tree" tab shows the tree
  beside all topics grouped color-major then tree-minor (`DiscoveryTopicList.tsx`); a "New tree"
  button makes the next opened source a fresh root. New nullable `DiscoveryNode.interestLevel`.
- **Research Plan paste-text fallback** — teams can paste/type their plan instead of being
  forced to connect a Google Doc; `POST /api/research-plan` now accepts `googleDocUrl` **or**
  `planText` (exactly one). New `ResearchPlan.lastSyncedSource` column. No new Anthropic call.
- **Showcase one-pager print export** — a `?print=1` print view on the showcase page (gated by
  the same `canViewShowcase`) plus a "Print one-pager" button; browser-native, no PDF library.
- **Project-Log ⇄ entry linking** — activates the dormant `ProjectLogReference` self-relation;
  `POST/DELETE /api/project-log/[id]/references` (both-endpoint team scoping, 10-ref cap,
  idempotent) with a picker + reference/back-reference chips in the Operations Hub.
- **Field Dispatch archive** — past dispatches now show per-entry KP earned and date.
- **Teacher "Nudge"** — a one-click check-in on stale/unlogged roster rows fires a friendly
  team notification, deduped one-per-team-per-day, with a `TeacherFeedback` audit row
  (`POST /api/teacher/nudge`).
- **Momentum recap card** — a dismissible lab card summarizing the team's last 7 days (KP,
  sources, logs, experiments, days to next fair) from a read-only `GET /api/team/momentum`
  aggregate; no new persisted state, no LLM.
- **E2E fixture seed script** — `pnpm --filter web seed:e2e` (`prisma/seed-e2e.mjs`) idempotently
  restores the School / Class / team / membership fixtures the Playwright suite depends on;
  documented in a new SETUP.md "E2E tests" section (with a local-Postgres E2E recipe).
- **Migrations** — `team_rubric_score`, `research_plan_paste_text`, `discovery_node_interest_level`,
  `fair_event_unique_dedupe` (all additive).

### Changed

- **Notification bell** — all five notification kinds (`fair_deadline`, `urgency`,
  `teacher_feedback`, `phase_reviewed`, `showcase_reviewed`) now render with a distinct
  icon / accent / label instead of only two.
- **Feature pipeline tooling** — `.claude/commands/pipeline.md` rewritten with process-weight
  tiers (implement-only default for UI/content, full test+review for schema/auth/currency/LLM
  work), a build-once rule, and the accumulated tester playbook; `.claude/PARALLELISM.md` gains
  an integration protocol; CLAUDE.md and SETUP.md updated accordingly.

### Fixed

- **`/api/fairs/match` hang** — `ensureFairsSeeded()` re-ran a ~266-row sequential upsert on
  every call (the seeded count had fallen behind the grown dataset), freezing the Science Fair
  Hub's Overview tab for minutes. Rewritten with a count fast-path, batched `createMany`,
  targeted drift updates, and a module-level single-flight guard; added
  `FairEvent @@unique([fairId, year])` and a dedupe migration. The route now returns in well
  under a second, and `matchFairs()` is safe to call from other code.

---

## [0.15.0] — 2026-06-29

The 4-stage upgrade evolution from 0.13.0 (Volt Lab) is **extended to the remaining five lab
types** — biocore, chemworks, terrabase, mindframe, axiom. Every economy building now visibly
grows from its base form into a fully built-out, high-tech version by L15, each on its own lab
palette. **200 new stage sprites** (5 labs × 10 buildings × 4 stages). No app or schema changes:
the level→stage machinery (`buildingStageSuffix` / `getBuildingSprite`) already shipped in
0.13.0, so these are pure static assets that render live at L4/7/10/15. Each building passed an
independent generator→reviewer loop; base L1–3 sprites are byte-identical to the shipped forms.

### Added

- **200 upgrade-stage sprites** (`apps/web/public/sprites/buildings/{biocore,chemworks,terrabase,mindframe,axiom}/{slug}_t2..t5.png`) — cumulative, on-theme build-ups per building (e.g. biocore greenhouse: vine planters → trellis annex → climbing-plant tower → spore-burst + gold ridge; chemworks distillation-tower: reflux condenser → reboiler drum → second tray-column → condenser-orb crown; axiom cosmology-visualization-theater: expanding cosmic-web dome → gold-ringed theater). Colours mature across stages; gold reserved as the L15 flourish only. Char-grid sources in `art/src/buildings/`.
- **Reproducible staged builders** for all 50 buildings — each `.claude/pixel-art-pipeline/builders/{slug}.py` refactored to `build(stage=1)` layering cumulative geometry, following the Volt Lab `workshop.py` pattern. Per-lab evolved-accent palettes (deepened structure tone + energized glow + premium gold) tuned to each lab's mood: biocore bio-green, chemworks reagent-teal, terrabase basalt/earth, mindframe signal-violet, axiom stellar-blue.
- **Per-lab evolution plans** (`.claude/pixel-art-pipeline/{lab}-evolution-plan.md`) and a montage / contact-sheet helper (`art/montage.py`) used by the review loop and for sign-off.

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

- **Upgrade economy redesigned** (was: clearance-capped levels, LC-per-level). Now KP-per-level + LC-only-at-tier-ups, no clearance cap; clearance gates *purchase* only. `SPEC.md` §8/§9.2/§14 updated to match.
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

- The in-memory rate-limit and article-cache stores remain per-instance unless Upstash is configured; this resolves the long-standing "move counters to a shared store" open question (see ARCHITECTURE.md §12).
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
- **Rate limiting on every API route** — new `lib/rate-limit.ts`. `enforceRateLimit(req, tier, userId)` returns a graceful **429 + `Retry-After`** when exceeded. Tiers (per minute): `ai` 12, `upload` 8, `mutate` 40, `read` 120, `join` 10. Checks **both a per-user and a per-IP bucket**; the per-user bucket is the real limit while the per-IP bucket is a generous `×12` backstop so a classroom behind one school NAT IP isn't locked out. Specifically caps the Claude-backed endpoints (chat, quiz gen/grade, paper-upload metadata, research-plan review/idea-check, fair deadline sync) so a single account can't run up unbounded Anthropic spend. `join` is kept tight against invite-code brute-forcing. Counters are in-memory (per instance) by design — see ARCHITECTURE.md §6/§7.1 for the shared-store / Cloudflare-edge upgrade path
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
- `science_fair` gateway is now a real feature (`components/fair/ScienceFairFeature.tsx`): countdown to the team's fair day, cards for the matched **regional** / **state** / **ISEF** fairs, and the full **ISEF rubric** (science + engineering criteria + board guidance) from `docs/reference/ISEF-2026.md`
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
- `SPEC.md` and `ARCHITECTURE.md` design documentation
