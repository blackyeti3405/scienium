# scienium

## What This Is

scienium is a hybrid physical-digital STEM engagement game that motivates students through the science-fair process. Students build and expand a personalized pixel-art virtual lab where each core feature lives behind a *building* on their plot, earning building upgrades through daily learning activities, demonstrated knowledge, and real research-project progress. Students progress through sequential phases (`discovery` → `literature_review` → `research_planning` → `working` → `showcase`), unlocking new capabilities as they go, solo or in shared-lab teams. Target: ~120 students in a single-school pilot. The student-facing core is feature-complete and E2E-tested (features F1–F18); teacher tooling is minimal-for-pilot. This project's active milestone is **finishing the §11 PvP Raid System**, which is mid-build on the `matthew/pvp-system` branch.

## Core Value

Ship a **finished, verified, and balanced** PvP raid system students can use to raid each other — grounded truth of what's actually built on the branch, completed to spec §11, proven by tests, and tuned so losing trophies feels fair instead of arbitrary. If everything else slips but the user can look at a trustworthy inventory of the PvP system and trust that raids run correctly and currency math is honest, the milestone has succeeded.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Brownfield: inferred from existing built + E2E-tested code (F1–F18). Locked. -->

- ✓ Onboarding & identity (Clerk auth, solo/team setup, school/class/ZIP capture) — existing, E2E-tested
- ✓ Topic Discovery (Wikipedia tree, YouTube/arXiv/PubMed/OpenAlex sources, signaling, KP economy) — existing, F-tested
- ✓ Literature Review (PDF upload→async processing queue, comprehension quizzes, 25-source proficiency gate, auto lab-type classification) — existing, F-tested
- ✓ Daily Engagement Pillars (Field Codex, Proof of Expertise, Project Log, Failure Log, Study-with-Vega) — existing, F-tested
- ✓ Economy & Buildings (KP/LC ledger, clearance exams, 60-building catalog, purchases/upgrades, gateway spine) — existing, F-tested
- ✓ Research Plan (paste-a-link Google Doc sync, AI rubric review, novelty idea-check, web search) — existing, F-tested
- ✓ Data Terminal (experiment/measurement tracking, Recharts graphing, reference guides) — existing, F-tested
- ✓ Team collaboration, attribution, momentum recap — existing, F-tested
- ✓ Project Showcase (portfolio privacy levels, publishing, teacher moderation queue) — existing, F-tested
- ✓ Science Fair Hub (personalized fair calendar, ISEF rubric self-check, deadline reminders via Resend) — existing, F-tested
- ✓ Teacher dashboard (class roster + attention flags, validations queue, phase-adaptive student detail, feedback, daily nudge) — existing, pilot-core tested

### Active

<!-- Current scope: finish §11 PvP to spec+tests+tuning. Hypotheses until shipped and validated. -->

- [ ] Verify-state audit produces an accurate, written PvP inventory (built / broken / duplicated) mapped against spec §11
- [ ] Every §11 design point the implementation deviates from is reported with the reason (and the stale §11 "not yet built" spec status corrected)
- [ ] All §11 spec gaps found by the audit are closed (raid engine, matchmaking + refind, daily quota caps, spell system, lobby/HUD, results/trophy-change screen)
- [ ] Server-authoritative raid engine enforced (client streams casts only; server resolves AOE against read-only defender snapshot; defender rows never mutated)
- [ ] Phase gate enforced server-side for PvP (`working` phase via `assertFeatureUnlocked`, never client-only)
- [ ] PvP E2E spec (`pvp.spec.ts`) covering every §11 acceptance criterion — parity with F1–F18
- [ ] Combat-engine unit tests (`resolveCast`, `typeEffectiveness`, trophy math) mirroring `lib/shop.test.ts`
- [ ] Trophy-loss `TODO` stub replaced with a decided, tuned loss curve; `TROPHY_LOSS_TODO` flipped to `false`
- [ ] PvP tuning constants externalized from inline route into `lib/pvp` constants block (matching existing `SPELL_*` placement)
- [ ] Spell & building display names catalog-sourced (replace `formatBuildingName` key-derivation)

### Out of Scope

<!-- Explicit boundaries with reasoning to prevent re-add. -->

- PvP prod-hardening (battle `[battleId]` IDOR sweep, AI-route Upstash rate-limit enforcement, prompt-injection on `raid_log_json`) — deferred to the app-wide launch-gate milestone (CONCERNS C-07); deliberately *not* selected for this milestone's bar
- App-wide production launch (dedicated prod Supabase/Clerk, Vercel project, `scienium.app` deploy, FERPA/COPPA posture, branch protection, alerting) — separate future milestone (CONCERNS C-05/C-07)
- New PvP features beyond §11 (per-building/per-type differentiated spell effects, defender-trophy movement on defense, loadout size >1, spell evolutions) — §11 defers these to a separate §18 brainstorm; not in this milestone
- `nova-lab` → `scienium` rebrand in Clerk app name + R2 bucket (CONCERNS C-06) — ops task, not PvP scope
- Legacy `Paper.pdfData` retirement, Google Drive real OAuth, science-fair dataset precision upgrade — app-wide `docs/TODO.md` items, separate work
- Combat-handler/route unit-test layer (supertest-style isolation from DB) — architectural improvement (C-13); the combat *engine* is already unit-testable and that layer is what this milestone covers

## Context

**Brownfield — a mature app, not greenfield.** scienium is a monolithic Next.js 14 App Router application (single `apps/web`) using Prisma 5 + PostgreSQL/Supabase, Clerk auth, the Anthropic SDK (all AI features), Tailwind/shadcn UI, and pixel-art game art via the `art/` pipeline. It is a **phase-gated game engine wrapping a genuine science-fair workflow**: each `Team` is the central aggregate, nearly every entity is team-scoped, and `lib/phase.ts` (`PHASE_UNLOCKS`) is the single source of truth for what features each phase unlocks — gated server-side via `requireTeamContext` / `assertFeatureUnlocked`. Idempotency is pervasive (unique-constraint rows as idempotency keys). See `.planning/codebase/{STACK,ARCHITECTURE,STRUCTURE}.md` (mapped 2026-07-19) and `docs/SPEC.md` (§14.1 for the feature-unlock matrix).

**Current branch `matthew/pvp-system` is mid-build on §11 PvP.** Several untracked Claude Code sessions advanced it without careful progress tracking, so the branch has diverged and may contain duplicated or competing implementations — the user is not fully sure what's done vs. broken. The working tree is **clean**, so the committed branch is the baseline; the audit contrasts *committed reality* against spec §11. The codebase map (`.planning/codebase/CONCERNS.md`, C-01–C-04) already flags PvP as the riskiest area on the branch: no E2E spec, the trophy-loss formula is a `TROPHY_LOSS_TODO` placeholder mutating live user-facing currency (`PvpTrophies.currentTrophies`), balancing constants hardcoded inline (`MAX_RAIDS_PER_DAY` etc. atop `app/api/pvp/route.ts`), and spell/building display names derived from key strings instead of catalog rows.

> **Spec-staleness alert (the audit's first catch).** `docs/SPEC.md` §11 status block reads *"Design only — not yet built; `app/api/pvp/*` returns 501; no raid engine, no spell seed data, no UI"* (§11 last updated 2026-07-06). The branch has advanced well past that — `lib/pvp/combat-engine.ts`, `lib/pvp/spell-power.ts`, a PvP lobby UI, and opponent-trophy display are all committed (≈70f82db). The verify-state audit must therefore treat **current code as the source of truth**, not the spec's dated status note, and explicitly report which §11 design points the implementation honors vs. deviates from — including whether the spec itself needs updating.

**Authoritative references for downstream phases:**
- `docs/SPEC.md` §11 — target PvP Raid System design (overview, design principles, spells, type system, raid flow, trophy system, matchmaking, technical impl §11.8, educational justification §11.9)
- `docs/TODO.md` — deferred-work register
- `docs/SECURITY.md` — launch-gate / threat-model register
- `.planning/codebase/CONCERNS.md` — risk register C-01…C-19 (C-01..C-04 are PvP)

## Constraints

- **Tech stack:** Next.js 14 App Router, Prisma 5 + Postgres/Supabase, Clerk, Anthropic SDK, Tailwind/shadcn. Per SPEC §11.8, **no new libraries** for PvP — API routes + Prisma + trivial AOE arithmetic suffice.
- **Phase gating:** PvP unlocks at `working`. Any feature work must keep the gate server-side (`assertFeatureUnlocked` from `lib/phase.ts`); client-only gating is unacceptable (SPEC §14.1 enforcement note).
- **Currency & idempotency safety:** Trophies are user-visible currency — never convertible, only ranking. PvP persistence must use the app's unique-constraint idempotency pattern (`pvp_raid_quota` on `team_id + date`); bad trophy math ships as a user-visible regression, so the loss curve is test-driven (C-02).
- **Non-destructive raids:** The raid runs against a **read-only snapshot** of the defender's `team_shop_buildings` (+ gateway placements). Defender rows are never mutated; damage exists only inside the raid instance (SPEC §11.2/§11.8).
- **Server-authoritative engine:** The client only streams cast events (`spell_id, x, y, client_ts`); the server validates the 15-second window + cooldown spacing and resolves AOE damage. The client never reports damage (SPEC §11.8).
- **Daily caps, local reset:** Raids/refinds per team per day are capped (tunable; currently 3/3). The reset day boundary is `todayUtc()` (UTC midnight) — a known US-classroom edge (C-18); flagged, not in this milestone's scope to fix.
- **Scope cap:** This milestone = spec §11 complete + tested + tuned. PvP prod-hardening and app-wide launch gates are explicitly out of scope (see Out of Scope).
- **Branch & git:** Continue on `matthew/pvp-system`; planning-doc commit tracking is decided in the next config step (Step 5).
- **Scale:** 120 students at a small daily cap = trivial write load; archive raids older than 30 days if `raid_log_json` grows (SPEC §11.8).

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Verify-state before continuing | Loose untracked sessions left PvP's real state opaque; user explicitly asked for a clear, verified picture of what's built before adding features | — Pending |
| Finish bar = spec + tests + tuning | C-01 (no E2E), C-02 (trophy-loss TODO on live currency), C-03 (inline constants) are all HIGH — "finished" must close all three; C-04 (derived names) folds in | — Pending |
| Audit produces a report first, then user directs fixes | User wants to review reality and decide fix scope *before* any fixes land (no premature committing) | — Pending |
| PvP prod-hardening deferred | Deliberately not selected; battle IDOR + AI-rate-limit work folds into the broader launch-gate milestone (C-07) | — Pending |
| PROJECT.md scoped to whole scienium (brownfield), milestone = Finish PvP | scienium was never GSD-initialized; Validated set inferred from the already-built F1–F18 features | — Pending |
| Treat current code as truth; spec §11 status out of date | SPEC §11 still reads "not built" but the branch has a committed combat engine — audit contrasts code vs. spec and flags both directions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-19 after initialization*
