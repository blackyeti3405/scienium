# Phase 2: Close Spec Gaps + Tests — Plan Outline

**Generated:** 2026-07-23
**Source:** 02-CONTEXT.md (D-01..D-25 locked decisions) + 02-RESEARCH.md + 02-UI-SPEC.md + ROADMAP.md
**Mode:** MVP_MODE enabled (vertical slices)
**Schema changes:** NONE (Phase 2 does not modify schema.prisma)
**New libraries:** NONE (D-26)
**`TROPHY_LOSS_TODO`:** Stays `true` through Phase 2 (tuned values + flip are Phase 3 `03-01`)

## Dependency Analysis

### Inter-Plan Dependencies

| Relationship | Type | Rationale |
|---|---|---|
| 02-02 depends on 02-01 | Hard compile dependency | 02-01's pinned-first D-01 action (`@scienium/shared-types` barrel repoint + tsc green) is required before 02-02 can write any code, tests, or UI against the engine. 02-01 also exports `typeEffectiveness`/`isSuperEffective` from combat-engine.ts that 02-02's TEST-03 meter test needs. |
| 02-03 depends on 02-02 | Hard functional dependency | 02-03's `pvp.spec.ts` (TEST-01) needs the playable BattleScreen (02-02 D-19) to E2E-test the full raid flow. SPEC-01 (02-02 D-24) documents what the gap-closing landed, so it must follow all fixes. |

All three plans have sequential dependency — no parallel execution across plans within the same wave.

### File Ownership

| File | Owned By | Shared With | Constraint |
|---|---|---|---|
| `apps/web/lib/pvp/combat-engine.ts` | 02-01 (edit) | 02-02 (read only — tests import from it) | 02-01 modifies exports + constants; 02-02 only reads the exported API for test imports |
| `apps/web/lib/pvp/spell-power.ts` | 02-01 (edit — import fix) | 02-02 (read only) | 02-01 fixes the TS2307 import; 02-02 reads `SPELL_POWER_TIERS` for TEST-03 |
| `apps/web/app/api/pvp/route.ts` | 02-01 | — | Exclusive — matchmaking fixes, catalog names |
| `apps/web/app/api/pvp/[battleId]/action/route.ts` | 02-01 | — | Exclusive — import fix, snapshot assertions |
| `apps/web/app/api/pvp/spell-power/route.ts` | 02-01 | — | Exclusive — add `feature:'pvp'` |
| `apps/web/lib/pvp/combat-engine.test.ts` | 02-01 (creates) | 02-02 (appends) | 02-01 writes TEST-02 tests; 02-02 appends TEST-03 meter tests |
| `packages/shared-types/src/pvp.ts` | 02-02 | — | Fix stale `:100` comment (D-16) |
| `apps/web/app/(dashboard)/pvp/battle/[id]/page.tsx` | 02-02 | — | Exclusive — BattleScreen build |
| `apps/web/app/(dashboard)/pvp/leaderboard/page.tsx` | 02-02 | — | Exclusive — class leaderboard build |
| `apps/web/app/(dashboard)/pvp/team-builder/page.tsx` | 02-02 | — | Exclusive — remove |
| `apps/web/app/(dashboard)/pvp/lobby/page.tsx` | 02-02 | — | Exclusive — assess visual pass |
| `apps/web/e2e/pvp.spec.ts` | 02-03 | — | Exclusive — new file |
| `docs/SPEC.md` | 02-03 | — | Exclusive — §11 update |

## Wave Structure

| Wave | Plans | Autonomous | Rationale |
|---|---|---|---|
| 1 | 02-01 | yes | No plan-level dependencies. Pinned-first compile fix. |
| 2 | 02-02 | yes | Depends on 02-01's compiling baseline + exported engine API. |
| 3 | 02-03 | yes | Depends on 02-02's playable BattleScreen for E2E + engine to be complete before SPEC-01 update. |

## Requirement ID Distribution

Every requirement from ROADMAP.md must appear in at least one plan's `requirements` frontmatter.

| Requirement | Description | Plan |
|---|---|---|
| RAID-01 | Matchmaking pools same-class, working+ phase, placed base | 02-01 |
| RAID-02 | Refind rerolls excluding shown bases | 02-01 |
| RAID-03 | Raid UI with defender grid, spell bar, click-to-cast | 02-02 |
| RAID-04 | Cast events POST to server, not client-resolved | 02-02 |
| RAID-05 | Results screen with percent destroyed + trophy change | 02-02 |
| RAID-06 | Display names from catalog rows, not key derivation | 02-01 |
| SPELL-01 | Spells 1:1 with economy buildings, level-tracking | 02-02 |
| SPELL-02 | Spells are type-bearing | 02-02 |
| SPELL-03 | Circular AOE identical in v1 | 02-02 |
| SPELL-04 | Type-effectiveness 2x/0.5x/1x multipliers | 02-02 |
| SPELL-05 | Type-cycle science explanations in-game | 02-02 |
| TROPHY-01 | Proportional trophy gain, rounded up, capped at 10 | 02-02 |
| TROPHY-02 | Percent destroyed over defender total base health | 02-02 |
| TROPHY-03 | Trophy-loss mechanism for low destruction | 02-01 |
| TROPHY-04 | Class leaderboard | 02-02 |
| TROPHY-05 | Daily raid+refind quotas, no rollover | 02-02 |
| TROPHY-06 | Symmetric defender loss for v1 | 02-02 |
| ENGINE-01 | Server-authoritative damage | 02-01 |
| ENGINE-02 | Non-destructive: read-only defender snapshot | 02-01 |
| ENGINE-03 | 15s window + cooldown spacing server-side | 02-01 |
| ENGINE-04 | Raid_log_json stores cast sequence | 02-01 |
| ENGINE-05 | Gateway placements in snapshot | 02-01 |
| GATE-01 | Server-side phase gate on ALL PvP routes | 02-01 |
| GATE-02 | No-base guard: team with no placed base can't match | 02-01 |
| METER-01 | 4 tier Spell Power Meter | 02-02 |
| METER-02 | Tiers have specific multipliers (0.5/1.0/1.5/2.0) | 02-02 |
| METER-03 | Multiplier applies to all attacker spell damage | 02-02 |
| METER-04 | UTC midnight reset | 02-02 |
| METER-05 | Raid neither fills nor drains meter | 02-02 |
| TEST-01 | pvp.spec.ts covering every section 11 criterion | 02-03 |
| TEST-02 | combat-engine.test.ts covering resolveCast/typeEffectiveness/trophy math | 02-01 (part), 02-02 (part) |
| TEST-03 | Meter unit test proving resolveCast uses live multiplier across all 4 tiers | 02-02 |
| SPEC-01 | Update docs/SPEC.md section 11 to shipped reality | 02-03 |

## Plan Outline

| Plan ID | Objective | Wave | Depends On | Requirements | Key Decisions | Tasks |
|---|---|---|---|---|---|---|
| 02-01 | Close engine + matchmaking + gate + raid-flow + display-name gaps + combat-engine unit tests (resolveCast, typeEffectiveness, trophy math) | 1 | [] | RAID-01, RAID-02, RAID-06, ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04, ENGINE-05, GATE-01, GATE-02, TROPHY-03, TEST-02 | D-01 (barrel repoint), D-10 (remove dead exports), D-07 (matchmaking eligibility), D-08 (spell-power phase gate), D-09 (catalog names), D-03 (snapshot assertion), D-04 (gateway placements), D-05 (15s/cooldown tests), D-06 (raid_log_json verify), D-15 (trophy-loss mechanism behind TROPHY_LOSS_TODO=true) | 3 tasks: (1) Compile baseline: repoint 4 files to barrel, remove dead exports, export typeEffectiveness/isSuperEffective, tsc green; (2) Engine/gate/matchmaking fixes: phase-gate, catalog names, matchmaking eligibility, snapshot assertions, gateway placements, window/cooldown/raid_log_json verification; (3) Trophy-loss mechanism + unit test: land loss mechanism, write combat-engine.test.ts for resolveCast/typeEffectiveness/trophy math |
| 02-02 | Close spell + type + trophy + Spell Power Meter gaps + playable BattleScreen + leaderboard + meter test (TEST-03) | 2 | 02-01 | RAID-03, RAID-04, RAID-05, SPELL-01, SPELL-02, SPELL-03, SPELL-04, SPELL-05, TROPHY-01, TROPHY-02, TROPHY-04, TROPHY-05, TROPHY-06, METER-01, METER-02, METER-03, METER-04, METER-05, TEST-02 (additions), TEST-03 | D-11/D-12 (spell/type tests), D-13 (type-cycle tooltip), D-14 (trophy gain tests), D-16 (symmetric loss verify + comment fix), D-17 (quota tests), D-18 (meter + TEST-03), D-19 (BattleScreen -- milestone blocker), D-20 (leaderboard), D-21 (remove team-builder), D-22 (lobby visual-pass assessment) | 3 tasks: (1) Engine tests + type-cycle tooltip + meter test: TEST-02 additions (9-pair type matrix, symmetric loss), fix pvp.ts:100 comment, TypeCycleTooltip constants+component, TEST-03 meter test (4 tiers x0.5/x1.0/x1.5/x2.0 through resolveCast); (2) BattleScreen (milestone blocker): defender grid with v0.23.0 pixel-art, spell bar, click-spell->click-target cast, results screen, 15s timer UX; (3) Leaderboard + cleanup: class leaderboard from PvpTrophies, remove team-builder stub+route, assess lobby visual-pass |
| 02-03 | Write pvp.spec.ts E2E covering all section 11 criteria + update docs/SPEC.md section 11 to shipped reality | 3 | 02-02 | TEST-01, SPEC-01 | D-23 (pvp.spec.ts), D-24 (SPEC-01 -- lands last) | 2 tasks: (1) Write apps/web/e2e/pvp.spec.ts mapping every section 11 AC to a test (F1-F18 parity, full raid E2E, phase-gate 403, no-base guard, catalog names, meter tiers, symmetric loss); (2) Update docs/SPEC.md section 11: correct stale status block, add Spell Power Meter subsection, record symmetric gain/loss resolution |

## Key Design Decisions Per Plan

### 02-01

| Decision | Implementation |
|---|---|
| Import fix strategy | Repoint 4 files from `@/packages/shared-types/src/{enums,pvp}` to `@scienium/shared-types` barrel (D-01). NOT tsconfig alias widening. |
| `typeEffectiveness` test approach | Export `typeEffectiveness` and `isSuperEffective` from combat-engine.ts for direct unit test access (RESEARCH.md recommendation — option A). |
| Trophy-loss mechanism | Land low-destruction threshold + inversely scaled loss behind `TROPHY_LOSS_TODO=true`. Expose clearly-marked constants for Phase 3 tuning. Do NOT flip flag. |
| Matchmaking refind | Server-side exclusion via `shownBaseIds` array sent by client; GET handler filtered (`findRandomOpponent` excludes by ID set). |
| Gateway placements | Fold gateway-placement data (from existing Prisma models) into the start-raid snapshot at `getTeamBuildings` or parallel read. Low severity — land after the compile baseline. |

### 02-02

| Decision | Implementation |
|---|---|
| BattleScreen pixel-art | MUST match v0.23.0 overhaul (reference `LabScene`, `TileBackground`, `DecorationLayer`, gateway PNGs). Use `pixel-art-generator` skill for new sprites, `ui-ux-pro-max` skill for layout polish. |
| BattleScreen grid | Isometric grid matching `LabPlot` TILE_CELL=64px convention (implementer may use 2D top-down if isometric proves too complex per Claude's Discretion). |
| Leaderboard scope | Class-only. No school/global tabs (D-20). `PvpTrophies` data sorted descending. |
| Team-builder removal | Delete `team-builder/page.tsx` + its route entry. User-directed *remove*, not repurpose (D-21). |
| Type-cycle tooltip | Define explanation constants in `lib/pvp` (not inline in component). Render as `[?]` icon popover in raid HUD + lobby. |
| Meter bar fill | Keep linear (`tasksCompleted/5`). Optional polish deferred (D-18). Badge is threshold-correct — only bar width is imprecise. |
| Lobby visual-pass | LOW priority. Assess; if done, match 7.1 pixel-art style. Do not block BattleScreen or leaderboard. |

### 02-03

| Decision | Implementation |
|---|---|
| E2E team phase | Verify "E2E Test Lab" team is at `working` phase; if not, advance in `beforeAll`. Verify second team (devuser2) is in same class. |
| SPEC-01 ordering | MUST land last, after all gaps in 02-01/02-02 are closed and tests pass. |
| SPEC-01 scope | Correct stale status block, add SPM subsection, record symmetric loss. Do NOT document Phase 3 tuned values. |

## Threat Model

### 02-01 Threats

| Threat ID | STRIDE | Component | Disposition | Mitigation |
|---|---|---|---|---|
| T-02-01-A | Tampering | Client-damage reporting (ENGINE-01) | Mitigate | Server-authoritative resolveCast; client never reports damage. Add assertion test that no `team_shop_buildings` write occurs on cast path. |
| T-02-01-B | Information Disclosure | Battle IDOR on matchmaking/start-raid (action/route.ts) | Mitigate | `requireTeamContext` team-scoped check at route entry. Membership-verified via route-context.ts pattern. |
| T-02-01-C | Elevation of Privilege | Phase-gate bypass on spell-power route | Mitigate | Add `feature:'pvp'` to `requireTeamContext` call — closes the gate gap. |
| T-02-01-D | Tampering | Trophy currency integrity (trophy math) | Mitigate | TROPHY_LOSS_TODO stays true; loss mechanism exposed behind flag; no externalized values shipped untuned. |
| T-02-01-SC | Tampering | npm/pip/cargo installs | Mitigate | No new packages in Phase 2 (D-26). Slop-check gate is N/A. |

### 02-02 Threats

| Threat ID | STRIDE | Component | Disposition | Mitigation |
|---|---|---|---|---|
| T-02-02-A | Tampering | Client-side damage path in BattleScreen code | Mitigate | BattleScreen only POSTs cast events `{spellId, x, y, clientTs}`. No client-side damage computation. Review point in checkpoint. |
| T-02-02-B | Tampering | Trophy currency integrity (meter multiplier abuse) | Mitigate | TEST-03 proves resolveCast uses the live getSpellPower multiplier, not a hardcoded constant. Meter multiplier is server-computed. |
| T-02-02-C | Elevation of Privilege | Phase-gate bypass via new BattleScreen API surface | Mitigate | All new API surface uses `requireTeamContext` with `feature: 'pvp'`. Server-authoritative. |

### 02-03 Threats

No new threat surface. E2E tests run against local dev; SPEC-01 is documentation.

## User Setup

No human-required setup. All dependencies are already installed (existing Node, pnpm, Prisma, Vitest, Playwright). The developer Supabase dev DB is already running. The only build step is `pnpm --filter @scienium/shared-types build` and `pnpm --filter web exec prisma generate` (both CLI-executable). `todayUtc()` UTC reset is fine as-is for this phase (C-18 deferred).