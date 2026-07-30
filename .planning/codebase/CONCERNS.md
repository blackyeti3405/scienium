# CONCERNS.md — Scienium Technical Debt & Risk Register

**Mapped:** 2026-07-19
**Last commit mapped:** 70f82db (branch `matthew/pvp-system`)
**Authoritative source docs:** `docs/TODO.md` and `docs/SECURITY.md` — this file cross-references & prioritizes.

Severity legend: **🔴 High** (launch/hot-path risk) · **🟡 Medium** (tech debt / fragility) · **🔵 Low** (cosmetic / deferred-by-design)

---

## 🔴 High — PvP system (current branch focus, incomplete & untested)

The active branch is building the PvP raid system (`§11` of `docs/SPEC.md`). It is **partially wired and has no automated tests** — the riskiest area right now.

### C-01 · No E2E coverage for PvP
- **What:** `apps/web/e2e/` has no `pvp.spec.ts`. Every other major feature (F1–F18) has a spec; PvP routes have none.
- **Where:** `apps/web/app/api/pvp/{route,[battleId]/action,spell-power}/`
- **Impact:** Regressions in matchmaking, quota, trophy calc, or the combat engine land silently. PvP mutates `PvpTrophies` and `PvpRaidQuota` — bad math here is user-visible currency.
- **Mitigation parity:** Match the pattern of every other feature spec — write `pvp.spec.ts` mapping each spec-§11 acceptance criterion to a test (see `e2e/F11.spec.ts` for the AC-→-test convention).

### C-02 · Trophy-loss formula is a placeholder TODO
- **What:** `apps/web/lib/pvp/combat-engine.ts` ships `TROPHY_LOSS_TODO = true` and a hardcoded placeholder for `percent < 30%`:
  ```ts
  // TODO: replace with proper tuned loss formula once balancing values are set.
  if (TROPHY_LOSS_TODO) { ... }
  ```
- **Impact:** Live PvP sends a winner/loser real trophies (`PvpTrophies.currentTrophies`) computed from an *untuned* stub. Losing feels arbitrary until it's tuned.
- **Mitigation:** Decide the loss curve (spec §11 §4) and replace the branch; flip `TROPHY_LOSS_TODO = false`; add a unit test to `lib/pvp/` mirroring `lib/shop.test.ts`.

### C-03 · PvP balancing constants hardcoded inline
- **What:** `MAX_RAIDS_PER_DAY = MAX_REFINDS_PER_DAY = 3` are hardcoded at the top of `app/api/pvp/route.ts`. The route's own header comment says "spec says tunable in v1."
- **Impact:** Can't tune without a deploy; no single source of truth (the route file mixes tunables and logic).
- **Mitigration:** Promote to a `lib/pvp/pvp-constants.ts` (or extend `combat-engine.ts` constants block) where `SPELL_*` constants already live.

### C-04 · PvP display names derived, not catalog-sourced
- **What:** `formatBuildingName(key)` builds `"Power Plant"` from `"power_plant"` string casing (`app/api/pvp/route.ts:37`). The catalog lookup is skipped for spell/building display names.
- **Impact:** Drift between the `Building` seed rows' `name` and the derived string; typos in `buildingKey` surface directly to players.
- **Mitigation parity:** Pull display names from the catalog the same way `getTeamSpells` already pulls spell records (`db.spell.findMany`).

---

## 🔴 High — Production readiness (from docs/SECURITY.md & docs/TODO.md)

These are **P0 launch blockers** documented in `docs/SECURITY.md` (last reviewed 2026-07-09). No deployment exists yet.

### C-05 · No production environment exists
- **What:** No Vercel project linked (no `.vercel/`). Dev runs on Supabase + Upstash + R2; production should be its OWN Supabase project/DB. Domain `scienium.app` is registered but undeployed.
- **Where:** documented in `docs/TODO.md` §"Production deployment"
- **Impact:** Zero path-to-prod today; dev DB would be overloaded by real classroom traffic.

### C-06 · `nova-lab` branding lives in external accounts
- **What:** Clerk app is named "Nova-lab" (shows in auth emails); R2 bucket is `nova-lab-assets`. Code is fully "scienium" (no `nova-lab` in `apps/web/`).
- **Where:** `docs/SECURITY.md` §5 + `docs/TODO.md` §"Branding"
- **Impact:** User-visible "as Nova-lab" branding in transactional Clerk emails. R2 bucket rename requires new bucket + migrate (R2 can't rename in place).

### C-07 · Deferred P0 security sweeps (unfilled)
- **What:** `docs/SECURITY.md` lists P0 launch blockers still open: dedicated prod Supabase/Clerk, `CRON_SECRET` ≥32 bytes verified by tests, R2 private-bucket fetch-failure test, no secrets in frontend bundles, **published Privacy Policy + ToS**, **FERPA/COPPA posture + school consent flow**, DPAs reviewed, full `[id]` route IDOR sweep, upload-abuse sweep, prompt-injection sweep, backup/restore drill, error/cron/spend alerting, branch protection.
- **Why it's a concern:** scienium serves **minors** (`User.isMinor` defaults true) and sends student work to Anthropic — FERPA/COPPA + subprocessor posture is a *legal* launch gate, not a nice-to-have.

---

## 🟡 Medium — Migration / tech debt

### C-08 · Legacy in-DB PDF blob (`Paper.pdfData`) not yet retired
- **What:** `Paper.pdfData Bytes?` is the R2-migration transitional fallback. The file route prefers `Paper.pdfKey` and only serves `pdfData` for pre-R2 rows. Local DB has 0 rows relying on it (verified in `docs/TODO.md`); retirement is **safe locally but deferred until production exists** to confirm against prod data.
- **Where:** `apps/web/prisma/schema.prisma` `Paper.pdfData`; `app/api/papers/[id]/file/route.ts`
- **Risk:** Two code paths + a dead column. Low until retirement (one migration drops the column + removes the fallback branch), but it's a literal "do this before launch" TODO.

### C-09 · Google Drive OAuth deferred — paste-a-link fallback only
- **What:** Research Plan sync (Feature 2A) uses a "anyone with the link" Google Doc URL fetch. Real Google OAuth (Drive+Docs read-only) is deferred (`docs/TODO.md`).
- **Impact:** Students who don't publish their doc as link-accessible can't sync; the fallback breaks the workflow when a teacher requires private Docs. Planned, just incomplete.

### C-10 · Science Fair dataset provisional
- **What:** `content/fairs/dataset.ts` is a starter modeled on the Society for Science affiliated-fair directory — coordinates are **approximations**, all dates are **estimated**. ZIP→state uses a state centroid, not ZIP centroid.
- **Impact:** "Nearest regional fair" ordering is coarse; fair deadlines shown to students are estimates. Mitigation already scaffolded: `ensureFairsSeeded()` upserts by `key` so growing the array is safe; an AI "Sync from site" step promotes events to `confirmed`.

---

## 🟡 Medium — Code consistency

### C-11 · Inconsistent shared-types imports (deep path vs package)
- **What:** App code imports shared types **two ways**:
  - Deep into source: `import { ... } from '@/packages/shared-types/src/pvp'` (e.g. `lib/pvp/combat-engine.ts`, `app/api/pvp/route.ts`)
  - Via the workspace package name (`@scienium/shared-types`) elsewhere (e.g. `lib/phase.ts`)
- **Impact:** Bypasses the compiled `dist/` package barrel, couples app to the package's internal layout, and means changes to a source file's location break the app without a typecheck of the package itself. Found ≥6 deep `@/packages/shared-types/src/...` imports.
- **Mitigation parity:** Import from `@scienium/shared-types` (or add the missing exports to the barrel) — match the `lib/phase.ts` style which re-imports from the package and re-exports.

### C-12 · `lib/docs` vs `apps/web` two `docs/` directories
- **What:** There is a top-level `docs/` (SPEC, TODO, SECURITY, SETUP) **and** `apps/web/docs` is not present — but `.claude/pipeline/plan-F<n>.md` planning docs are referenced by E2E spec headers as the source of acceptance criteria.
- **Impact:** Plan files referenced by E2E specs (`e2e/F11.spec.ts` cites `.claude/pipeline/plan-F11.md`) live outside `apps/web/` — tests point at docs not co-located with the code. If those plan files move/delete the mapping goes stale. (Low-medium — self-contained spec headers usually reproduce the ACs inline.)

---

## 🟡 Medium — Test architecture fragility

### C-13 · No route-handler unit-test layer
- **What:** API route handlers are exercised ONLY through E2E (which hits real Supabase dev over public internet). There is no `supertest`/`next-test-api-route-handler` isolating handlers from the DB.
- **Impact:** Unit testing combat math (C-02) requires extracting it from route handlers (combat-engine.ts is already extracted — good). But **quota / trophy persistence / IDOR guards** have no fast feedback loop — they go straight to a 5-7s E2E round trip. Slow CI + network-dependent greens.
- **Mitigation parity:** The combat engine IS already unit-testable (`lib/pvp/combat-engine.ts` pure functions). Add a `lib/pvp/combat-engine.test.ts` for `resolveCast`/`typeEffectiveness`/trophy math, even before the E2E spec.

### C-14 · E2E suite is serial-only (shared single test team)
- **What:** `playwright.config.ts` forces `workers: 1` / `fullyParallel: false` because every spec authenticates as the same leader on ONE shared "E2E Test Lab" team. Parallel runs race on shared team state (currency, daily LC claim, placed buildings).
- **Impact:** E2E wall-clock grows linearly with the spec list. Already calls itself out in the config comment ("Until each worker gets its own dedicated test account + team"). At ~22 specs this is tolerable; at 40+ it'll be a real bottleneck.
- **Mitigation parity (the documented one):** Per-worker dedicated test account + team so the suite can go `fullyParallel: true`.

### C-15 · Rate-limit in-memory store is per-instance on serverless
- **What:** The default `MemoryStore` (`lib/rate-limit.ts`) keeps fixed-window counters in module memory. On serverless/multi-instance hosting each instance keeps its own window → **effective ceiling is `limit × instances`**, and cold starts reset it.
- **Impact:** In production (Vercel serverless) without Upstash configured, per-user rate limits effectively don't enforce — important for the Claude-backed routes (`tier: 'ai'` = 12/min) where each misbehaving call costs money.
- **Mitigation parity (already scaffolded):** Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in prod env (auto-activates `UpstashStore`, global across instances; fails-open gracefully). This is a **config gap at deploy**, not a code gap.

---

## 🔵 Low — By-design / minor

### C-16 · Rate limiter fails OPEN on Upstash outage
- **What:** `UpstashStore.incr` catches errors, logs `Upstash unreachable — failing open`, and returns a fresh-window result (always allowed).
- **Why it's acceptable:** A limiter outage shouldn't take the API down; the code suggests pairing with an edge WAF for a hard guarantee. **Flag only if prod lacks the WAF.**

### C-17 · `Math.random()` for PvP opponent matching
- **What:** `findRandomOpponent` does `eligible[Math.floor(Math.random() * eligible.length)]`.
- **Why it's low:** Gameplay match-making, not security-critical. No nonce/PRNG brittleness risk worth solving. Worth a comment noting it's not crypto-strong if that ever matters.

### C-18 · `todayUtc()` daily-cap date derivationTimeString slice
- **What:** `new Date().toISOString().slice(0, 10)` is reused for the PvP daily task day, the Codex daily cap, and the Discovery KP rollup.
- **Why it's low:** Consistent across pillars (good — a team can't game the daily cap by hitting a different pillar). But "today" is **UTC midnight**, not the student's local day — a US classroom's "Monday" straddles the UTC boundary. Acceptable for a pilot; worth revisiting for a timezone-picky feature.

### C-19 · `recharts` & `video.js` dependency hygiene
- **What:** `recharts` is now in use (Data Terminal). `video.js` is reserved for Showcase video playback but may not yet render. (Documented in `docs/TODO.md`.)
- **Why it's low:** Minor. Either wire `video.js` or remove it.

---

## Summary Table

| ID | Severity | Area | One-liner |
|----|----------|------|-----------|
| C-01 | 🔴 | PvP | No E2E coverage — PvP routes have no spec |
| C-02 | 🔴 | PvP | Trophy-loss formula is a `TODO` stub (live currency) |
| C-03 | 🔴 | PvP | Balancing constants hardcoded inline, spec says tunable |
| C-04 | 🟡 | PvP | Display names derived from key, catalog lookup skipped |
| C-05 | 🔴 | Ops | No production env / Vercel project; dev DB only |
| C-06 | 🟡 | Branding | `nova-lab` in Clerk app name + R2 bucket |
| C-07 | 🔴 | Security | P0 sweep gates unfilled (FERPA/COPPA, IDOR, prompt-injection…) |
| C-08 | 🟡 | Migration | Legacy `Paper.pdfData` fallback not retired |
| C-09 | 🟡 | Feature | Google Drive OAuth deferred (paste-link fallback) |
| C-10 | 🟡 | Data | Science-fair dataset provisional (estimated dates/coords) |
| C-11 | 🟡 | Consistency | Mixed shared-types imports (deep src vs package barrel) |
| C-12 | 🟡 | Docs | E2E specs cite `.claude/pipeline/plan-*` not co-located |
| C-13 | 🟡 | Tests | No route-handler unit-test layer → slow E2E-only feedback |
| C-14 | 🟡 | Tests | E2E serial-only (shared single test team) |
| C-15 | 🟡 | Ops | In-memory rate limiter per-instance on serverless |
| C-16 | 🔵 | Design | Rate limiter fails-open on Upstash outage (by design) |
| C-17 | 🔵 | PvP | `Math.random()` for opponent matching (gameplay, not security) |
| C-18 | 🔵 | Design | `todayUtc()` slice → UTC day boundary for US classroom |
| C-19 | 🔵 | Deps | `video.js` reserved but possibly unused |

---

*Mapped: 2026-07-19 — cross-reference `docs/TODO.md` and `docs/SECURITY.md` for the full deferred-work and threat-model lists.*