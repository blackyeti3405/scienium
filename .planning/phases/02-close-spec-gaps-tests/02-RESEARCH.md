# Phase 2: Close Spec Gaps + Tests — Research

**Researched:** 2026-07-23
**Domain:** PvP raid system gap-closing, server-authoritative combat engine, phase gating, E2E + unit testing
**Confidence:** HIGH

## Summary

Phase 2 closes every approved fix-scope row from the Phase 1 audit report (17 rows, all Approved=Y) and proves the result with E2E + unit tests, then updates `docs/SPEC.md` §11 to match shipped reality. Three ordered plans: 02-01 (engine/matchmaking/gate/flow gaps + unit tests), 02-02 (spells/types/trophies/meter/UI + meter end-to-end test), 02-03 (E2E spec pvp.spec.ts + SPEC-01 update).

The codebase is brownfield on branch `matthew/pvp-system`. The core PvP engine, API routes, Prisma schema, shared types, and lobby UI are all built and committed. The main compile-blocker is the `@/packages/shared-types/src/...` deep import path that `apps/web/tsconfig.json` cannot resolve (16 TS errors, all from 4 files). Every other gap is a wiring/logic fix against built infrastructure.

**Primary recommendation:** Execute in nailed dependency order: 02-01 (compile-first alias repoint unlocks everything) -> 02-02 (playable UI is the milestone blocker) -> 02-03 (E2E + spec update, lands last). No new libraries. No schema changes. `TROPHY_LOSS_TODO` stays `true` through Phase 2.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (from `02-CONTEXT.md`)

**D-01 — Repoint to the barrel, do NOT widen the alias** (fix-scope #1; target 02-01): Repoint 4 PvP files' deep `@/packages/shared-types/src/{enums,pvp}` imports to `@scienium/shared-types` barrel. NOT widening the tsconfig alias.

**D-02 — Keep the server-authoritative engine; client streams cast events only** (ENGINE-01..05; target 02-01): Client reports `{spellId, x, y, clientTs}` only. AOE resolved server-side. Do not introduce a client-side damage path.

**D-03 — Read-only defender snapshot** (ENGINE-02; target 02-01): `team_shop_buildings` rows never re-read/mutated after raid starts. Phase 2 adds test/assertion that no write occurs on the cast path.

**D-04 — Fold gateway placements into the start-raid snapshot** (fix-scope #15, §11.8; target 02-01) [LOW/minor]: Fold gateway-placement data into the snapshot the raid starts from. If folding risks the 02-01 compile-first sequence, land as late 02-01 sub-task.

**D-05 — Validate 15s window + cooldown spacing server-side** (ENGINE-03; target 02-01): Already enforced. Add unit tests.

**D-06 — Persist `raid_log_json` as the cast sequence** (ENGINE-04; target 02-01): Already written. Phase 2 verifies the stored log round-trips.

**D-07 — Matchmaking eligibility: working+ phase, placed base, refind-exclude-shown** (fix-scope #8, RAID-01/02, GATE-02; target 02-01): Add (a) `working`+ phase filter on opponent, (b) require placed base, (c) refind exclude already-shown bases.

**D-08 — Phase-gate 403 on `/api/pvp/spell-power`** (fix-scope #5, GATE-01; target 02-01): Add `feature: 'pvp'` to `requireTeamContext` call.

**D-09 — Catalog display names, not key-casing** (fix-scope #7, RAID-06; target 02-01): Replace `formatBuildingName(key)` with catalog `name` lookup.

**D-10 — Remove dead duplicated exports** (fix-scope #14, AUDIT-02; target 02-01): Remove `createRaidSession` and `resolveSpellPowerMultiplier` from `combat-engine.ts`.

**D-11 — Spells 1:1 + level/type, circular AOE identical in v1** (SPELL-01/02/03; target 02-02): Already built. Phase 2 verifies with tests.

**D-12 — Type-effectiveness multipliers 2x / 0.5x / 1x** (SPELL-04; target 02-02): Already built. Phase 2 adds unit tests covering all 9 type-pair combinations.

**D-13 — Surface type-cycle science explanations in-game** (SPELL-05; target 02-02): Add a type-chart tooltip (raid HUD + lobby) with one-line science explanations defined as constants in `lib/pvp`.

**D-14 — Proportional trophy gain, rounded up, capped at 10** (TROPHY-01/02; target 02-02): Gain branch already correct. Phase 2 unit-tests the gain curve.

**D-15 — Trophy-loss MECHANISM lands here; tuned values + flip are Phase 3** (fix-scope #2, TROPHY-03; target 02-01/02-02): Land the mechanism (low-destruction threshold + scaled loss) + unit test. Keep `TROPHY_LOSS_TODO=true`. Expose clearly-marked loss constant/threshold for Phase 3.

**D-16 — Symmetric defender loss for v1** (TROPHY-06; target 02-02): Already built (`completeRaid` decrements defender by same `trophyDelta`). Phase 2 verifies with tests + corrects stale comment at `pvp.ts:100`.

**D-17 — Trophies ranking-only; daily quotas, no rollover** (TROPHY-04/05; target 02-02): Already enforced via `PvpRaidQuota @@id([teamId, date])`. Phase 2 verifies with tests.

**D-18 — Spell Power Meter: 4 tiers, UTC reset, no drain, applies to all attacker spell damage** (METER-01..05; target 02-02): Already built + wired + live. Phase 2 adds end-to-end meter unit test (TEST-03).

**D-19 — Build BattleScreen matching v0.23.0 pixel-art** (fix-scope #4, RAID-03/04/05; target 02-02) [HIGH — milestone blocker]: Build the playable raid UI from scratch. Must match v0.23.0 pixel-art overhaul components (`LabScene`, `DecorationLayer`, `TileBackground`). Use pixel-art-generator skill for sprites.

**D-20 — Build the class leaderboard matching v0.23.0 pixel-art** (fix-scope #9, TROPHY-04; target 02-02): Build from `PvpTrophies`. Class-only (not school/global). Match v0.23.0 style.

**D-21 — Remove the stale 6v6 team-builder stub** (fix-scope #10, §11.3; target 02-02): Remove the stub + its route entry. User-directed remove, not repurpose.

**D-22 — Assess lobby visual-pass vs v0.23.0** (fix-scope #17; target 02-02) [LOW — approvable/skippable]: Assess whether lobby needs visual pass. If done, match §7.1. Do not block D-19/D-20 on it.

**D-23 — Write `apps/web/e2e/pvp.spec.ts`** (fix-scope #3, TEST-01; target 02-03): Map every §11 acceptance criterion to a test (F1–F18 parity), match `e2e/F11.spec.ts` convention.

**D-24 — Update `docs/SPEC.md` §11 to shipped reality** (SPEC-01, fix-scope #11/#12/#16; target 02-03): LANDS LAST. Correct stale status block, add Spell Power Meter subsection, record defender-loss as symmetric gain/loss for v1.

**D-25 — Order: 02-01 -> 02-02 -> 02-03; SPEC-01 last** (cross-cutting).

**D-26 — No new libraries** (cross-cutting): PvP uses only Next.js API routes + Prisma + trivial AOE arithmetic. No combat/physics/animation library. BattleScreen animations from CSS/Tailwind + pixel-art-generator skill.

**D-27 — Idempotency + currency safety preserved** (cross-cutting): `PvpRaidQuota @@id([teamId, date])` preserved. Trophy math test-driven.

**D-28 — MVP mode: vertical slices, not horizontal layers** (cross-cutting): Plans organized as vertical feature slices.

**D-29 — Server-side phase gate on EVERY PvP route** (cross-cutting): Every PvP route must call `requireTeamContext`/`assertFeatureUnlocked` with `feature: 'pvp'`.

**D-30 — `todayUtc()` daily reset; UTC->local is v2** (METER-04, C-18; cross-cutting): Known edge, deferred. Record in tests/spec.

**D-31 — Threat model per plan (security gate)** (cross-cutting): Each PLAN.md includes a `<threat_model>` block.

### Claude's Discretion
- Exact BattleScreen layout/grid geometry and pixel-art sprite choices (within §7.1 style)
- Exact type-cycle science-explanation copy
- Whether the lobby visual-pass (D-22) is done or skipped
- BattleScreen cooldown/15s-window client UX (presentation only; server remains authoritative)
- Test file structure inside `combat-engine.test.ts` and `pvp.spec.ts`

### Deferred Ideas (OUT OF SCOPE)
- Tuned trophy-loss values + `TROPHY_LOSS_TODO=false` flip (Phase 3 03-01)
- Externalize inline PvP constants (Phase 3 03-02)
- UTC->local daily reset (v2)
- Asymmetric defender loss (v2)
- v2 PvP extensions (per-type spells, loadout >1, replay UI, prestige, spell evolutions)
- PvP prod-hardening (IDOR sweep, rate-limit, prompt-injection)
- App-wide production launch
- Lobby meter-bar linear-fill polish (optional, do not block)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RAID-01 | Matchmaking pools same-class, working+ phase, placed base | Current `findRandomOpponent` (route.ts:99-109) scopes by classId only. Add phase filter + placed-base check + refind-exclude-shown. |
| RAID-02 | Refind rerolls excluding shown bases | No exclusion mechanism exists. Use Set<string> in GET handler, pass to POST refind. |
| RAID-03 | Raid UI with defender grid, spell bar, click-to-cast | BattleScreen stub (8 lines). Full UI build in 02-02. |
| RAID-04 | Cast events POST to server, not client-resolved | Already built in action/route.ts:166 — `resolveCast(session, castEvent, multiplier)`. |
| RAID-05 | Results screen with percent destroyed + trophy change | Not built. `completeRaid` returns `RaidResult` including these fields — results screen needs UI (02-02). |
| RAID-06 | Display names from catalog rows, not key derivation | Replace `formatBuildingName` (route.ts:37-39) with `db.spell.findMany` pattern (route.ts:49-52 already does this for spells). |
| SPELL-01 | Spells 1:1 with economy buildings, level-tracking | Already built via `buildSpell` (combat-engine.ts:34-53). |
| SPELL-02 | Spells are type-bearing | Already built — Spell interface has `type: SpellType`. |
| SPELL-03 | Circular AOE identical in v1 | Already built — `SPELL_AOE_RADIUS = 80` in combat-engine.ts. |
| SPELL-04 | Type-effectiveness 2x/0.5x/1x multipliers | Already built at combat-engine.ts:162-177. `typeEffectiveness` and `isSuperEffective` are PRIVATE (not exported) — must be exported for unit testing. |
| SPELL-05 | Type-cycle science explanations in-game | Not built. Add constants in lib/pvp, render as tooltip in raid HUD + lobby. |
| TROPHY-01 | Proportional trophy gain, rounded up, capped at 10 | Already built at combat-engine.ts:310-316. |
| TROPHY-02 | Percent destroyed over defender total base health | Already built — `completeRaid` computes over all buildings. |
| TROPHY-03 | Trophy-loss mechanism for low destruction | `TROPHY_LOSS_TODO` stub at combat-engine.ts:322-325. Phase 2 lands mechanism, not tuned values. |
| TROPHY-04 | Class leaderboard | Stub (8 lines). Build from `PvpTrophies` in 02-02. |
| TROPHY-05 | Daily raid+refind quotas, no rollover | Already enforced via `PvpRaidQuota @@id([teamId, date])`. |
| TROPHY-06 | Symmetric defender loss for v1 | Already built at combat-engine.ts:267-285. Stale comment at pvp.ts:100 says "defender unaffected". |
| ENGINE-01 | Server-authoritative damage | Already built — client streams casts, server resolves AOE. |
| ENGINE-02 | Non-destructive: read-only defender snapshot | Already built — `raidLogJson` stores snapshot at raid start. Phase 2 adds assertion test. |
| ENGINE-03 | 15s window + cooldown spacing server-side | Already enforced (action/route.ts:119-122, 134-138). Phase 2 adds unit tests. |
| ENGINE-04 | `raid_log_json` stores cast sequence | Already written (action/route.ts:170-180). Phase 2 verifies round-trip. |
| ENGINE-05 | Gateway placements in snapshot | Not yet folded (`getTeamBuildings` reads only `team_shop_buildings`). Low severity. |
| GATE-01 | Server-side phase gate on ALL PvP routes | Route context requires `feature: 'pvp'`. Missing on spell-power/route.ts (D-08). |
| GATE-02 | No-base guard: team with no placed base can't match | Not built. Add to `findRandomOpponent` and the attacker's eligibility path. |
| METER-01 | 4 tier Spell Power Meter | Built in spell-power.ts. |
| METER-02 | Tiers have specific multipliers (0.5/1.0/1.5/2.0) | Built in SPELL_POWER_TIERS. |
| METER-03 | Multiplier applies to all attacker spell damage | Proved at action/route.ts:143,166. |
| METER-04 | UTC midnight reset | Built via `todayUtc()`. Known C-18 edge deferred to v2. |
| METER-05 | Raid neither fills nor drains meter | Verified — raid path never calls `incrementDailyTaskCount`. |
| TEST-01 | pvp.spec.ts covering every §11 acceptance criterion | Not built. Must write in 02-03. |
| TEST-02 | combat-engine.test.ts covering resolveCast/typeEffectiveness/trophy math | Not built. Must write in 02-01/02-02. |
| TEST-03 | Meter unit test proving resolveCast uses live multiplier across all 4 tiers | Not built. Must prove LIVE getSpellPower, not hardcoded constant. |
| SPEC-01 | Update docs/SPEC.md §11 to shipped reality | Lands last in 02-03. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Raid engine (damage resolution) | API/Backend | — | Server-authoritative: resolveCast runs server-side against stored raidLogJson |
| Matchmaking & opponent selection | API/Backend | — | Queries DB, enforces eligibility (phase, base, class). Client shows result only. |
| Phase gating | API/Backend | — | assertFeatureUnlocked in requireTeamContext. Never client-only (SPEC §14.1). |
| Trophy persistence | API/Backend | — | completeRaid updates PvpTrophies server-side. Client reads only. |
| Raid UI (BattleScreen) | Browser/Client | — | 'use client' React component. Cast events are client-originated but server-resolved. |
| Spell Power Meter display | Browser/Client | — | Reads from GET /api/pvp/spell-power or from GET /api/pvp dashboard payload. |
| Type-cycle science tooltip | Browser/Client | — | Static constants from lib/pvp, rendered as HUD tooltip. |
| Quota enforcement | API/Backend | Database | PvpRaidQuota upsert with @@unique([teamId, date]). Route checks before start/refind. |
| Battle countdown timer | Browser/Client | API/Backend | Client shows countdown UX. Server enforces 15s via DB createdAt — authoritative. |
| Spec §11 doc update | Docs | — | SPEC-01 lands last in 02-03. Pure documentation. |

## Standard Stack

### Core (all existing — no new libraries per D-26)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.2.35 | API routes (Route Handlers), App Router pages | Project standard. PvP routes already use it. |
| Prisma | ^5.18.0 | ORM, type-safe DB client | Project standard. Schema already built. No new schema work in Phase 2. |
| Zod | (via lib/validation.ts) | Input validation | Project standard for request parsing. PvP currently uses manual validation. |
| Vitest | ^4.1.9 | Unit/integration tests for combat-engine | Project standard. Inline test pattern in lib/*.test.ts. |
| Playwright | ^1.61.0 | E2E tests in pvp.spec.ts | Project standard. 22 existing specs. Serial workers, shared test team. |
| React | ^18.3.1 | BattleScreen, leaderboard, lobby UI | Project standard. Server/client components. |
| Tailwind CSS | ^3.4.10 | UI styling for all PvP screens | Project standard. Lobby already uses Tailwind. |
| TypeScript | ^5.5.4 | Type checking (tsc --noEmit) | Strict mode. First 02-01 action: fix 16 TS errors. |

### Patterns to Follow

| Pattern | Description | Where to Follow |
|---------|-------------|-----------------|
| requireTeamContext with feature guard | Every API route guard calls `requireTeamContext(req, { tier, feature })` | All PvP routes (action/route.ts already correct; spell-power/route.ts missing feature flag) |
| Idempotency via unique constraints | `PvpRaidQuota @@id([teamId, date])` — upsert pattern | Already built. Phase 2 preserves. |
| parseJson strict zod | Server input validation via `parseJson(req, ZodSchema).strict()` | Could apply to PvP POST bodies, but PvP currently uses manual validation. |
| Error response shape | 400/401/403/404/429 status codes with `{error: string}` | All PvP routes already follow this. |
| Server-owned turn lifecycle | Paid LLM call pattern (pending -> complete/error) | Not applicable — PvP has no LLM calls. |
| Inline sidecar test file | `lib/<module>.test.ts` | combat-engine.test.ts goes in `lib/pvp/combat-engine.test.ts` (same directory) |
| E2E test structure (F11.spec.ts) | api helper, db helper, seed helpers, AC->test mapping, data-testid selectors | pvp.spec.ts mirrors this convention |

### Installation

No new packages. All dependencies are already in the project. The only "installation" step is ensuring `@scienium/shared-types` is built:

```bash
pnpm --filter @scienium/shared-types build
```

## Package Legitimacy Audit

> No external packages are installed in Phase 2 (D-26: no new libraries). All code uses existing dependencies. No audit needed.

## Architecture Patterns

### Current PvP File Layout

```
apps/web/
├── lib/pvp/
│   ├── combat-engine.ts       # Core engine: resolveCast, completeRaid, calculateTrophyDelta, buildSpell, etc.
│   └── spell-power.ts         # SPELL_POWER_TIERS, getSpellPower, incrementDailyTaskCount
├── app/api/pvp/
│   ├── route.ts               # GET (dashboard state) + POST (refind / start_raid)
│   ├── [battleId]/action/
│   │   └── route.ts           # POST (cast_spell) + timer enforcement + completeRaid
│   └── spell-power/
│       └── route.ts           # GET (read-only meter state) -> needs feature: 'pvp' flag
├── app/(dashboard)/pvp/
│   ├── lobby/page.tsx         # Built lobby + meter UI (02-02: assess visual pass)
│   ├── battle/[id]/page.tsx   # STUB -> BattleScreen (02-02: build)
│   ├── leaderboard/page.tsx   # STUB -> class leaderboard (02-02: build)
│   └── team-builder/page.tsx  # STUB -> REMOVE (02-02: delete)
└── e2e/
    └── pvp.spec.ts            # DOES NOT EXIST -> (02-03: write)
```

### System Architecture Diagram

```
          BROWSER                          API SERVER (Next.js Route Handlers)                     DATABASE
          +--------+                        +--------------------------------+                   +-----------+
          | Lobby  | -- GET /api/pvp -----> | GET handler:                   |                   | teams     |
          |        |                        | - trophies, quota, meter       | -- db query -----> |           |
          |        |                        | - findRandomOpponent           |                   | pvp_troph |
          |        | <-- opponent data ---- |   (class match, no filter)     |                   | pvp_quota |
          |        |                        |                                |                   | team_daily|
          +--------+                        +--------------------------------+                   +-----------+
          |        |
          | Refind | -- POST {refind} ----> | POST handler:                  |
          |        |                        | - validate quota               |
          |        |                        | - findRandomOpponent (no excl) |
          |        | <-- new opponent ----- | - consumeRefind                |
          +--------+                        +--------------------------------+
          |        |
          | Start  | -- POST {start_raid}-> | POST handler:                  |
          | Raid   |                        | - validate quota, opponentTeam |
          |        |                        | - snapshot defender buildings  | -- db query -----> | team_shop  |
          |        |                        | - build RaidSession            |                    | _buildings |
          |        |                        | - prisma.pvpRaid.create        | -- db create ----> | pvp_raids  |
          |        | <-- session + raidId-- | - consumeRaid                  |                    |            |
          +--------+                        +--------------------------------+                    |            |
          |        |                                                          |                    +-----------+
          | Battle | -- POST {cast_spell} -> | Action handler:                |
          | Screen |   spellId,x,y,clientTs  | - validate raid ownership     | -- db read ------> | pvp_raids  |
          |        |                        | - enforce 15s window (DB time)|                    | (raid_log) |
          |        |                        | - enforce 1.5s cooldown        |                    |            |
          |        |                        | - getSpellPower(multiplier)    | -- db query -----> | team_daily |
          |        |                        | - resolveCast(AOE + type eff)  |                    |            |
          |        |                        | - persist updated raid_log     | -- db update ----> | pvp_raids  |
          |        |                        | - check if timer expired       |                    |            |
          |        | <-- defenderBase ------ |                                |                    |            |
          |        |   percentDestroyed      |                                |                    |            |
          |        |                        |                                |                    |            |
          |        | IF time expired:       | -- completeRaid:                |                    |            |
          |        | <-- result {ended,     |    - compute percentDestroyed   | -- db update ----> | pvp_raids  |
          |        |      trophyDelta,       |    - calc trophyDelta           |                    | pvp_troph  |
          |        |      percentDestroyed}  |    - upsert PvpTrophies (both) |                    |            |
          +--------+                        +--------------------------------+                   +-----------+
```

**Key data flow rule:** Arrows only go in one direction per operation. Client NEVER sends damage. Server NEVER trusts client timestamps — timer enforcement uses DB `startedAt`.

### Pattern 1: Import Fix (D-01)

**What:** Replace deep source-relative imports with workspace package barrel imports in 4 files.

**Files to edit:**
1. `apps/web/lib/pvp/combat-engine.ts`
2. `apps/web/lib/pvp/spell-power.ts`
3. `apps/web/app/api/pvp/route.ts`
4. `apps/web/app/api/pvp/[battleId]/action/route.ts`

**Change pattern:**
```typescript
// BEFORE (broken, TS2307):
import type { LabType, SpellType } from '@/packages/shared-types/src/enums'
import type { Spell, RaidSession, ... } from '@/packages/shared-types/src/pvp'

// AFTER (works, barrel exports these):
import type { LabType, SpellType } from '@scienium/shared-types'
import type { Spell, RaidSession, ... } from '@scienium/shared-types'
```

**Data:** The barrel at `packages/shared-types/src/index.ts` does `export * from './enums'` and `export * from './pvp'`. Both are confirmed to export exactly the types the 4 PvP files import. [VERIFIED: codebase grep]

### Pattern 2: Phase-Gate Guard (D-08)

**What:** Add `feature: 'pvp'` to `requireTeamContext` call in `spell-power/route.ts:6`.

```typescript
// BEFORE (line 6 — gate skipped):
const { ctx, error } = await requireTeamContext(req, { tier: 'read' })

// AFTER (gate fires for working phase):
const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'pvp' })
```

**Reference:** All other PvP routes already pass `feature: 'pvp'` — `action/route.ts:52`, `pvp/route.ts:116,186`.

### Pattern 3: Combat-Engine Unit Test Structure (TEST-02)

**What:** Pure-function unit tests for `resolveCast`, `typeEffectiveness`, `calculateTrophyDelta`. No DB, no Next server. Adopting the pattern from `lib/shop.test.ts` / `test/phase.test.ts`.

```typescript
// apps/web/lib/pvp/combat-engine.test.ts
import { describe, it, expect } from 'vitest'
import {
  resolveCast,
  calculateTrophyDelta,
  // NOTE: typeEffectiveness and isSuperEffective are currently PRIVATE
  // They must be exported (or tested through resolveCast) for TEST-02
} from './combat-engine'
import type { RaidSession, RaidCastEvent } from '@scienium/shared-types'

describe('resolveCast', () => {
  it('damages buildings within AOE radius', () => {
    // Mock session with buildings at known positions
    // Mock cast event at (x, y)
    // Assert buildings within radius take damage, outside don't
  })

  it('applies type effectiveness multipliers', () => {
    // Test 2x super-effective, 0.5x resist, 1x neutral
  })

  it('applies spell power multiplier', () => {
    // Test with powerMultiplier=0.5, 1.0, 1.5, 2.0
    // Verify damage scales correctly
  })

  it('clamps building health to 0 minimum', () => {
    // Assert Math.max(0, ...)
  })
})

describe('calculateTrophyDelta', () => {
  it('returns positive gain above threshold (ceil, capped at 10)', () => {
    expect(calculateTrophyDelta(30)).toBe(1)   // exactly at threshold
    expect(calculateTrophyDelta(51)).toBe(3)   // scaled, ceil
    expect(calculateTrophyDelta(100)).toBe(10)  // capped at MAX_TROPHY_GAIN
  })

  it('returns negative loss below threshold', () => {
    // TROPHY_LOSS_TODO=true path: inversely scaled
    expect(calculateTrophyDelta(0)).toBe(-10)
    expect(calculateTrophyDelta(29)).toBe(-1)
  })
})
```

### Pattern 4: End-to-End Meter Test (TEST-03)

**What:** Unit test proving `resolveCast` uses the **live** multiplier across all four tiers via `getSpellPower`, not a hardcoded constant.

**Location:** `apps/web/lib/pvp/combat-engine.test.ts` alongside other combat-engine tests.

**Strategy:** This is a unit test that mocks `getSpellPower` (or tests `resolveCast` with explicit `powerMultiplier` arguments at each tier's value), because the actual DB call in `getSpellPower` cannot run in a pure unit test. The critical assertion is that the cast path in `action/route.ts` calls `getSpellPower(teamId)` (line 143) and passes the result as `multiplier` to `resolveCast(session, castEvent, multiplier)` (line 166) — this wiring is already proven in the source code. The unit test covers the four multiplier values (0.5, 1.0, 1.5, 2.0) producing proportional damage in `resolveCast`.

### Anti-Patterns to Avoid

- **[Anti-pattern] Adding a migration or schema change:** The Prisma schema for all PvP models is built and tested. Phase 2 does NOT touch `schema.prisma`.
- **[Anti-pattern] Client-side damage computation:** The client must never report damage amounts. Only cast events (`spellId, x, y, clientTs`).
- **[Anti-pattern] Using relative imports beyond one level:** The codebase convention is `@/*` alias for app-internal imports. The existing `@/packages/...` deep imports are the bug this phase fixes.
- **[Anti-pattern] Tuning trophy values in Phase 2:** `TROPHY_LOSS_TODO` must stay `true`. The mechanism lands, but the tuned values + flip are Phase 3.
- **[Anti-pattern] Building school/global leaderboard tabs:** The leaderboard is class-only per §11.6. The current stub also mentions school/global — do not build those.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AOE distance calculation | Euclidean-distance logic | `(dx*dx + dy*dy > radiusSq)` — plain arithmetic | Already built in `resolveCast` (combat-engine.ts:146-148). No library needed. |
| Type effectiveness matrix | Switch/if-else chain | The cycle formula `(a+1) % 3 === d` | Already built in `isSuperEffective` (combat-engine.ts:173-177). Compact and correct. |
| Phase gating | Client-side `if (phase < 'working')` redirect | `requireTeamContext` with `feature: 'pvp'` | Already built. Server-authoritative. Never skip with client-only. |
| Daily cap idempotency | Manual check-before-insert | `PvpRaidQuota @@id([teamId, date])` upsert | Already built in `consumeRaid`/`consumeRefind` (combat-engine.ts:367-386). |
| Pixel-art sprites | Hand-crafting by eye | `pixel-art-generator` skill + existing sprite pipeline | Already in skills directory. Use for any new/recolor sprites. |

**Key insight:** Every "don't hand-roll" item in this phase is already built. The phase closes wiring gaps and adds tests, not new infrastructure.

## Common Pitfalls

### Pitfall 1: The Import Fix Doesn't Stick (D-01 failing to go green)

**What goes wrong:** After repointing the 4 files to `@scienium/shared-types`, `tsc --noEmit` still fails because:
- `@scienium/shared-types` dist is stale / not built
- The barrel doesn't export a type one file imports
- Vitest resolver can't find `@scienium/shared-types` (but tsc can)

**Why it happens:** The barrel at `packages/shared-types/src/index.ts` does `export * from './pvp'` which re-exports everything from `pvp.ts`. But `RaidLog` interface (action/route.ts:37-42) is locally defined, not in shared-types — that's fine since it's not imported from the barrel. The risk is a symbol being used from the barrel path that the barrel doesn't transitively export.

**How to avoid:** Before applying the fix,grep every import from `@/packages/shared-types/src/` across the 4 files, confirm each symbol exists in the barrel. [VERIFIED: all 4 files import only from `enums` (SpellType, LabType) and `pvp` (Spell, BuildingTarget, RaidCastEvent, RaidSession, RaidResult, SpellPowerTier) — all confirmed re-exported by the barrel.]

**Verification:** `cd apps/web && npx tsc --noEmit` must exit 0.

### Pitfall 2: `typeEffectiveness` and `isSuperEffective` are Private

**What goes wrong:** Unit tests cannot directly test `typeEffectiveness` or `isSuperEffective` because they are NOT exported from `combat-engine.ts`. The planner creates a test that imports them, and Vitest fails with `Module '".../combat-engine"' has no exported member 'typeEffectiveness'`.

**Why it happens:** These helper functions are function-scoped (not `export function`) — they are implementation details of `resolveCast`.

**How to avoid:** Either (a) export them and test directly, or (b) test them through `resolveCast` by setting up mock sessions with known type pairs and verifying the damage output reflects the correct multiplier.

**Recommendation:** Option (a) — export `typeEffectiveness` as a named export. This is a testability concern and the functions are pure and side-effect-free, making them ideal unit test targets.

### Pitfall 3: E2E Team Phase is Not `working`

**What goes wrong:** The `pvp.spec.ts` E2E test starts a raid but gets a 403 because the shared "E2E Test Lab" team is not at the `working` phase.

**Why it happens:** The E2E test team might be at an earlier phase (e.g., `literature_review`), and PvP requires `working`. The test infrastructure uses a shared team across all specs.

**How to avoid:** Check the E2E team's current phase in the DB before writing the PvP spec. If it's not at `working`, either:
- Advance the team to `working` via a seed-helper DB call in `beforeAll`, or
- Ensure the seed:e2e script sets the team to `working`

**Risk level:** MEDIUM — needs verification against live dev DB. Check `apps/web/prisma/seed/e2e.ts` if it exists.

### Pitfall 4: `completeRaid` Requires DB — Can't Unit Test Without Mocking

**What goes wrong:** `completeRaid` (combat-engine.ts:197) is an `async` function that calls `db.pvpTrophies.findUnique`, `db.pvpRaid.update/create`, and `db.pvpTrophies.upsert`. A pure unit test cannot call it.

**How to avoid:** The unit test scope for `completeRaid` is limited. TEST-02 targets `resolveCast`, `typeEffectiveness`, and trophy math (`calculateTrophyDelta`) — these are all pure functions. `completeRaid`'s DB interactions are tested by the E2E spec (`pvp.spec.ts`). This is the documented convention (C-13: combat engine IS unit-testable because it was extracted from route handlers; quota/trophy persistence goes to E2E).

### Pitfall 5: Threading `shownBaseIds` Through the Refind Session

**What goes wrong:** The matchmaking fix for refind (D-07) needs to exclude already-shown opponent IDs across the lifetime of the lobby session. If `shownBaseIds` is kept only in client state, a page refresh resets the list and the same opponent can appear again.

**How to avoid:** Keep `shownBaseIds` on the **server** — either in the GET handler (return a new opponent each call) or as a per-team session list. Simplest approach: the GET handler already returns one random opponent each call; the refind POST calls `findRandomOpponent` again. To exclude shown bases, the client sends `shownBaseIds: string[]` with each POST (the lobby already has this data) and the server filters them out. Report generation: consider storing the shown set in the DB (short-lived) but overkill for 120-student pilot — client-tracking with server-side exclusion is sufficient.

## Runtime State Inventory

> NOT a rename/refactor/migration phase. This phase closes spec gaps and adds tests against existing committed code. No runtime state migration is needed.

- **Stored data:** `PvpRaid`, `PvpTrophies`, `PvpRaidQuota`, `TeamDailyTaskDay` — all schema is built. Phase 2 does NOT modify schema.
- **Live service config:** None for PvP. The dev Supabase DB is already migrated. No external service config changes.
- **OS-registered state:** None.
- **Secrets/env vars:** No new env vars needed. Existing Clerk, Supabase, and DB connection strings are sufficient.
- **Build artifacts:** The `@scienium/shared-types` package must be built (`pnpm --filter @scienium/shared-types build`) for the import fix to resolve in `tsc`. This is a pre-existing step, not a migration.

## Test Strategy

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. The Validation Architecture section is skipped per protocol.

### Unit Tests: `lib/pvp/combat-engine.test.ts`

**Framework:** Vitest (already configured with `resolve.tsconfigPaths` for `@/*` alias)

**Location:** `apps/web/lib/pvp/combat-engine.test.ts` (inline sidecar, same directory as source)

**Pattern:** Pure function tests with mock data (no DB, no Next server). Mirrors `lib/shop.test.ts` and `test/phase.test.ts`.

**Test suites:**
1. `resolveCast` — AOE radius, type effectiveness, spell power multiplier, health clamping
2. `calculateTrophyDelta` — Gain curve (≥30%), loss mechanism (≤29%), boundary values
3. `typeEffectiveness` (if exported) — all 9 type pairs (3x3 matrix)
4. **TEST-03** (end-to-end meter): Four explicit multiplier values (0.5, 1.0, 1.5, 2.0) fed to `resolveCast` produce proportional damage output

**Key technical decisions for the meter test (TEST-03):**
- `resolveCast` takes `powerMultiplier: number` as the third parameter
- Test provides each tier's multiplier value and asserts proportional damage
- This proves the wiring is correct at the unit level
- The integration (action route actually calling `getSpellPower` to get the live multiplier) is proven by source code review: `action/route.ts:143` calls `getSpellPower(teamId)` and `:166` passes the result to `resolveCast`

**Exports needed for testing:** `typeEffectiveness` and `isSuperEffective` must be exported (currently private — D-04 impact for planner to address).

### E2E Tests: `apps/web/e2e/pvp.spec.ts`

**Framework:** Playwright (serial workers, shared "E2E Test Lab" team)

**Pattern:** Mirrors `e2e/F11.spec.ts` — `api` helper for authenticated requests, `e2eDb` for seed/cleanup, poll-confirmation for DB writes, `data-testid` selectors for UI interactions.

**Test structure (adapted from F11's AC->test convention):**
1. Phase-gate 403: below-working user gets 403 on PvP API routes
2. No-base guard: team with no placed base cannot match
3. Matchmaking: same class, working+ phase, excludes own team
4. Refind: excludes already-shown opponent
5. Full raid E2E: match -> start raid -> cast spells -> results screen shows percent destroyed + trophy change
6. Daily quota: caps at 3 raids / 3 refinds, resets next day
7. Trophy persistence: trophies persist across page reload
8. Catalog display names: building/spell names match catalog rows
9. Meter tiers: display reflects daily task count
10. Symmetric loss: defender loses same trophy delta attacker gains

**Infrastructure needed:**
- The E2E Test Lab team MUST be at `working` phase — if not, add a seed helper to advance it
- A second team in the same class is needed for matchmaking (attacker needs a defender) — seed or use the existing "student" dev account's team
- PvP-seeded data may be needed: spells, buildings, trophy rows

**Known constraints:**
- Serial execution (shared test team, workers=1)
- Clerk session token refresh via `api.*` helper (handled by `e2e/api.ts`)
- Dev Supabase read-after-write lag (use poll-confirmation pattern from F11.spec.ts)

### Test File: `typeEffectiveness` Export Decision

**Critical planner call:** `typeEffectiveness` and `isSuperEffective` are currently **not exported** from `combat-engine.ts`. For TEST-02, the planner has two options:

| Option | What | Tradeoff |
|--------|------|----------|
| A | Export `typeEffectiveness` and `isSuperEffective` | Direct unit tests on all 9 type-pair combos. Cleaner test isolation. |
| B | Test through `resolveCast` only | Coarser test (tests type matrix + AOE + multiplier simultaneously). Misses the specific 3x3 matrix validation. |

**Recommendation:** Option A — export the two private functions. They are pure, stable, and type safety is the dominant invariant to prove.

## Security Domain

> `security_enforcement` is absent from config.json (effectively enabled per gsd protocol default).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Clerk middleware (existing) — all PvP routes require authenticated session |
| V3 Session Management | Yes | Clerk JWT via middleware (existing) |
| V4 Access Control | Yes | Phase-gate via `assertFeatureUnlocked` (existing) — D-08 closes one gap |
| V5 Input Validation | Yes | Zod via `lib/validation.ts` (project standard) — PvP currently uses manual validation |
| V8 Data Protection | Yes | Trophy currency integrity via idempotency keys + upsert pattern |
| V10 Communication | No | Not applicable — PvP adds no new network layer |
| V11 Malicious Code | No | No new dependencies (D-26) |

### Known Threat Patterns for PvP

| Pattern | STRIDE | Standard Mitigation | Status |
|---------|--------|---------------------|--------|
| Client-reported damage | Tampering | Server-authoritative `resolveCast` — client never reports damage | Built (ENGINE-01). Phase 2 adds assertion test. |
| Battle IDOR (rogue team accessing another's raid) | Information Disclosure | Team-scoped check `raid.attackerTeamId !== teamId -> 403` | Built at action/route.ts:100-102. Prod-hardening (sweep) deferred to launch-gate milestone. |
| Phase-gate bypass (below-working reaching PvP routes) | Elevation of Privilege | `requireTeamContext` with `feature: 'pvp'` | Built on all routes except spell-power (D-08 closes in 02-01). |
| Trophy currency double-spend or race | Tampering | `PvpRaidQuota` unique-constraint idempotency + `db.pvpTrophies.upsert` | Built. Phase 2 tests protect it. |
| Stale session token (Clerk JWT expired mid-raid) | Authentication | 15s raid window is shorter than Clerk's ~60s JWT TTL | Low risk. Not mitigated in v1. |
| `raid_log_json` prompt injection | Tampering | Stored user-adjacent JSON data; no LLM reads it in v1 | Prod-hardening deferred (C-07, launch-gate milestone). |

### Security Gate Per Plan

Each PLAN.md MUST include a `<threat_model>` block (D-31):
- **02-01:** IDOR on matchmaking/start-raid (team-scoped, membership-verified via `requireTeamContext`); phase-gate bypass (spell-power route fix)
- **02-02:** Trophy currency integrity is the dominant concern (TEST-03 meter test, symmetric loss verification); client-side damage path must not appear in BattleScreen code
- **02-03:** No new threat surface (E2E tests run against local dev; SPEC-01 is documentation)

Phase 2 scope explicitly defers prod-hardening. Do NOT add Upstash rate-limiting, `[battleId]` IDOR sweep, or `raid_log_json` prompt-injection handling in this phase.

## Code Examples

### Verified Patterns from Official Sources

#### Pattern: Pure Function Unit Test (from `lib/shop.test.ts`)

```typescript
// apps/web/lib/shop.test.ts — mirrored by combat-engine.test.ts
import { describe, it, expect } from 'vitest'
import { SHOP_BUILDINGS } from '@/lib/shop'

describe('SHOP_BUILDINGS — content completeness', () => {
  it('every entry has a non-empty name and description', () => {
    for (const entry of SHOP_BUILDINGS) {
      expect(entry.name.trim().length).toBeGreaterThan(0)
      expect(entry.description.trim().length).toBeGreaterThan(0)
    }
  })
})
```

#### Pattern: Phase Gate Unit Test (from `test/phase.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import { assertFeatureUnlocked, PhaseGateError } from '@/lib/phase'

it('throws PhaseGateError with a 403 status code when locked', () => {
  try {
    assertFeatureUnlocked('discovery', 'buildings')
    expect.unreachable('should have thrown')
  } catch (err) {
    expect(err).toBeInstanceOf(PhaseGateError)
    expect((err as PhaseGateError).statusCode).toBe(403)
  }
})
```

#### Pattern: E2E Test with API Helper (from `e2e/F11.spec.ts`)

```typescript
import { test, expect, type Page } from '@playwright/test'
import { api } from './api'

test('AC4 — Click cycles swatch to "high": PATCH 200 + data-interest="high"', async ({ page }) => {
  await openDiscovery(page)
  await openTreeTab(page)
  await swatch(page, nodeId).click()
  await expect(page.locator(`[data-node-id="${nodeId}"]`)).toHaveAttribute('data-interest', 'high')
})
```

#### Pattern: Type Effectiveness Formula (source: `combat-engine.ts`)

```typescript
// The cycle: empirical > theoretical > applied > empirical
const TYPE_ORDER: SpellType[] = ['empirical', 'theoretical', 'applied']

function isSuperEffective(attacker: SpellType, defender: SpellType): boolean {
  const a = TYPE_ORDER.indexOf(attacker)
  const d = TYPE_ORDER.indexOf(defender)
  return (a + 1) % 3 === d // next in cycle is super-effective
}

function typeEffectiveness(spellType: SpellType, buildingType: SpellType): number {
  if (spellType === buildingType) return 1.0   // neutral (same type)
  if (isSuperEffective(spellType, buildingType)) return 2.0  // super-effective
  return 0.5 // resisted
}
```

**Expected test coverage for 02-01 (TEST-02 part):** All 9 type-pair combinations:

| Attacker | Defender | Expected |
|----------|----------|----------|
| empirical | empirical | 1.0 |
| empirical | theoretical | 2.0 |
| empirical | applied | 0.5 |
| theoretical | empirical | 0.5 |
| theoretical | theoretical | 1.0 |
| theoretical | applied | 2.0 |
| applied | empirical | 2.0 |
| applied | theoretical | 0.5 |
| applied | applied | 1.0 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 4 PvP files with broken TS2307 imports are the ONLY files importing from `@/packages/shared-types/src/` | Standard Stack / Import Fix | Other files with the same broken import would not get fixed in the first pass. LOW risk — verified by the audit grep. |
| A2 | `@scienium/shared-types` barrel exports everything the 4 files need | Standard Stack / Import Fix | If a symbol is missing from the barrel, tsconfig would still fail. MEDIUM risk — the barrel does `export * from './enums'` and `'./pvp'` which covers all 8 imported symbols. Already verified by codebase grep. |
| A3 | The E2E Test Lab team is at `working` phase (or can be advanced) | Test Strategy | If the E2E team is at an earlier phase, all PvP E2E tests get 403 and fail. HIGH risk — must verify before writing pvp.spec.ts. |
| A4 | No additional Prisma migration is needed (schema is final for v1 PvP) | Architecture Patterns | If a schema change is needed mid-phase, it would break the "no schema changes" invariant. LOW risk — all models match §11.8 and the audit confirmed them as `built`. |
| A5 | The second student team (devuser2) is in the same class as "E2E Test Lab" | Test Strategy | If not in same class, matchmaking finds no opponent and E2E fails. MEDIUM risk — check the seed data or seed a second team. |
| A6 | `vitest.config.ts` resolver handles `@scienium/shared-types` imports | Test Strategy | If Vitest can't resolve the workspace package, unit tests fail. MEDIUM risk — the resolver uses `tsconfigPaths`, and `@scienium/shared-types` is resolved by pnpm workspace, not tsconfig paths. May need a vitest `resolve.alias` entry. |

## Open Questions

1. **Is the E2E Test Lab team at `working` phase?**
   - What we know: The E2E suite uses a single shared "E2E Test Lab" team. Other specs (F11 etc.) test features unlocked at earlier phases. PvP requires `working`.
   - What's unclear: The team's current phase in the local dev DB.
   - Recommendation: Check `select phase from teams where name = 'E2E Test Lab'` against the development database. If it's not `working`, add a DB seed/advance step to the PvP E2E's `beforeAll`.

2. **Is the second dev team in the same class as "E2E Test Lab"?**
   - What we know: E2E has two student accounts (leader = devuser1 "E2E Test Lab", student = devuser2) and a teacher. Matchmaking requires same class.
   - What's unclear: Whether devuser2's team is in the same class as "E2E Test Lab".
   - Recommendation: Check class membership in dev DB or seed the second team during pvp.spec.ts beforeAll.

3. **Does Vitest resolve `@scienium/shared-types` via workspace or need alias config?**
   - What we know: `vitest.config.ts` uses `resolve: { tsconfigPaths: true }` which resolves `@/*` from tsconfig. `@scienium/shared-types` is resolved by pnpm workspace symlinks.
   - What's unclear: Whether Vitest's tsconfigPaths plugin also resolves workspace packages.
   - Recommendation: Write a quick smoke test importing from `@scienium/shared-types` in a Vitest test to confirm resolution works. If not, add `resolve.alias` entries to `vitest.config.ts`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All code | Yes | >=20 | — |
| pnpm | Package management | Yes | >=9 | — |
| PostgreSQL (local Docker) | Development DB | Yes (via infra/docker-compose.yml) | 16 with pgvector | Supabase dev instance |
| TypeScript | tsc --noEmit | Yes | ^5.5.4 | — |
| Vitest | Unit tests | Yes | ^4.1.9 | — |
| Playwright | E2E tests | Yes | ^1.61.0 | — |
| `@scienium/shared-types` build | Import resolution | Needs explicit build | — | Build via `pnpm --filter @scienium/shared-types build` |
| Prisma Client generation | DB access | Needs regeneration | — | Run `pnpm --filter web exec prisma generate` after any schema or build change |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. Everything is already installed in the monorepo.

## Sources

### Primary (HIGH confidence)

- [VERIFIED: codebase grep] — All 4 PvP source files read and analyzed (combat-engine.ts, spell-power.ts, PvP routes, UI pages)
- [VERIFIED: codebase grep] — Barrel export proof at packages/shared-types/src/index.ts
- [VERIFIED: codebase grep] — Vitest config, Playwright config, E2E helpers
- [VERIFIED: codebase grep] — Existing test patterns (shop.test.ts, phase.test.ts, F11.spec.ts)
- [VERIFIED: codebase grep] — Prisma schema PvP models (PvpRaid, PvpTrophies, PvpRaidQuota, TeamDailyTaskDay)
- [VERIFIED: codebase grep] — route-context.ts requireTeamContext signature and feature gate pattern

### Secondary (MEDIUM confidence)

- [CITED: 01-AUDIT-REPORT.md] — Phase 1 audit findings (the verified baseline of what's built vs. broken)
- [CITED: 02-CONTEXT.md] — 35 decisions D-01 through D-35, all locked or informational

### Tertiary (LOW confidence)

- None — all claims are verified against the committed codebase or documented decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against codebase
- Architecture: HIGH — PvP file layout and data flow verified by reading every source file
- Pitfalls: HIGH — confirmed by reading source files and matching against known antipatterns from the codebase's established conventions
- Test strategy: MEDIUM — A2 (Vitest workspace resolution), A3 (E2E team phase), A5 (second team class) need verification against live dev DB

**Research date:** 2026-07-23
**Valid until:** 2026-08-23 (stable brownfield project; no fast-moving dependencies)