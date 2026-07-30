# Phase 2: Close Spec Gaps + Tests - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning
**Source:** Audit Express Path — synthesized from the signed-off Phase-1 audit report (`.planning/phases/01-verify-state-audit-report-only/01-AUDIT-REPORT.md`, commit `7c6e9e2`, user sign-off 2026-07-22 — all 17 fix-scope rows Approved=Y) + ROADMAP Phase-2 plan synthesis + `REQUIREMENTS.md` + `STATE.md` accumulated decisions.

> This phase has no `discuss-phase` round. The Phase-1 audit report IS the discuss artifact: it inventoried the committed PvP code against spec §11, labeled every deviation `built`/`broken`/`partial`/`duplicated`, and the user signed off a 17-row **Phase 2 Fix Scope** table (audit §7) that directs exactly what closes here. Every decision below is grounded in a `broken`/`partial`/`duplicated` finding the user approved. Treat the audit report as the single source of truth for current state; `docs/SPEC.md` §11 is stale (AUDIT-04) and is *updated* — not trusted — by this phase.

<domain>
## Phase Boundary

Phase 2 closes every spec-§11 gap the signed-off audit surfaced and proves the result with E2E + unit tests, then updates `docs/SPEC.md` §11 to match shipped reality. In scope:

- **Fix the broken baseline** (audit §0/§2): repoint the 4 PvP files' deep `@/packages/shared-types/src/{enums,pvp}` imports to the `@scienium/shared-types` barrel so `tsc --noEmit` goes green — clearing all 6 `TS2307` + 10 downstream `TS7006` (fix-scope row #1, the pinned-first `02-01` action).
- **Close the engine / matchmaking / gate / raid-flow / display-name gaps** (#1, #5, #7, #8, #14, #15) — server-authoritative `resolveCast` already built (wire it), read-only defender snapshot, 15s window + cooldown validation, `raid_log_json`, matchmaking eligibility (working+ phase / placed base / refind-exclude-shown), phase-gate 403 on `spell-power`, remove dead `createRaidSession`/`resolveSpellPowerMultiplier` exports, optionally fold gateway placements into the snapshot.
- **Land the trophy-loss MECHANISM** (#2) behind the existing `TROPHY_LOSS_TODO` stub (low-destruction → scaled loss) + unit test. **The tuned values + `TROPHY_LOSS_TODO=false` flip are Phase 3 (`03-01`), NOT this phase.**
- **Build the playable raid UI** (#4 — the **milestone blocker**): `BattleScreen` (defender grid + spell bar + click-spell→click-target + cast→`/api/pvp/{id}/action` + results/percent) matching the v0.23.0 pixel-art overhaul (§7.1 prerequisite).
- **Close spell + type + trophy + meter gaps** — spells 1:1 + level/type, circular-AOE type-effectiveness multipliers (2×/0.5×/1×), in-game type-cycle science explanations, proportional trophy gain + low-destruction loss + symmetric defender loss + ranking-only + daily quotas, team-scoped Spell Power Meter 4 tiers applied to all attacker spell damage.
- **Build the class leaderboard** (#9) matching v0.23.0 pixel-art; **remove** the stale 6v6 `team-builder` stub (#10, user-directed *remove*, not repurpose); correct the `pvp.ts:100` stale comment (#13); **assess** the lobby visual-pass vs v0.23.0 (#17).
- **Verify** — write `apps/web/e2e/pvp.spec.ts` covering every §11 acceptance criterion (F1–F18 parity) (#3 / TEST-01); `apps/web/lib/pvp/combat-engine.test.ts` unit-covers `resolveCast` / `typeEffectiveness` / trophy math (TEST-02), including the end-to-end meter test proving `resolveCast` uses the **live** Spell Power multiplier across all four tiers (TEST-03).
- **Update `docs/SPEC.md` §11** (SPEC-01, #11/#12/#16) — lands LAST (after the gaps it documents close): correct the stale "not yet built" status block, add the Spell Power Meter subsection (tiers + multipliers + reset + no-drain), record the §11.6/§18 defender-loss open question as resolved → symmetric gain/loss for v1.

**Out of Phase 2 (tagged `[informational]` below, do NOT plan here):** tune + flip `TROPHY_LOSS_TODO` (Phase 3 `03-01`); externalize inline `MAX_RAIDS_PER_DAY`/`MAX_REFINDS_PER_DAY` + spell scalars into the `lib/pvp` constants block (Phase 3 `03-02`); UTC→local daily reset (C-18 / BAL-02 → v2); per-type/per-building differentiated spells, loadout >1, replay UI, prestige, spell evolutions (§18 / v2 PVPEXT-01..05); app-wide launch gates, prod env, branding, IDOR/rate-limit/prompt-injection prod-hardening (C-05/06/07 → separate milestone).

</domain>

<decisions>
## Implementation Decisions

> Every trackable decision below maps to a `02-01` / `02-02` / `02-03` target plan (audit §7 fix-scope column). Phase-3-only or v2 items are tagged `[informational]` — they are recorded context, NOT work this phase plans. The planner MUST cite each trackable D-NN in the relevant plan's `must_haves.truths` / `requirements`.

### D-01 — Repoint to the barrel, do NOT widen the alias (fix-scope #1) — target 02-01
The `@/packages/shared-types/src/{enums,pvp}` TS2307 break is closed by **option (b)**: repoint the 4 PvP files (`lib/pvp/combat-engine.ts`, `lib/pvp/spell-power.ts`, `app/api/pvp/route.ts`, `app/api/pvp/[battleId]/action/route.ts`) to `@scienium/shared-types` (the workspace package barrel). NOT option (a) (widening the `@/*` tsconfig alias to the monorepo root). Proof the barrel already exports exactly what's needed: `packages/shared-types/src/index.ts` does `export * from './enums'` and `export * from './pvp'`. This is a **pure import-path edit, zero API/type changes** — it also clears all 10 downstream `TS7006` (the `any` params resolve once the type imports resolve). Acceptance: `cd apps/web && npx tsc --noEmit` exits 0. This is the **pinned-first** `02-01` action (everything else depends on a compiling baseline).

### D-02 — Keep the server-authoritative engine; client streams cast events only (ENGINE-01..05) — target 02-01
The engine is already server-authoritative and wired — `resolveCast(session, castEvent, multiplier)` at `app/api/pvp/[battleId]/action/route.ts:166`, fed the **live** meter via `getSpellPower(teamId)` at `:143`. Client streams only `{spellId, x, y, clientTs}`; AOE is resolved server-side against the stored `raidLogJson` snapshot; the client never reports damage. Phase 2 keeps this architecture verbatim and locks it with tests. No new libraries (SPEC §11.8) — API routes + Prisma + trivial AOE arithmetic suffice. Do NOT introduce a client-side damage path.

### D-03 — Read-only defender snapshot; never mutate `team_shop_buildings` (ENGINE-02) — target 02-01
Non-destructive raids are a code property of the action route. The defender base is reconstructed from `raidLogJson` (`action/route.ts:147-155, 238-246`) — `team_shop_buildings` rows are never re-read/mutated after the raid starts. Phase 2 preserves this and adds a test/assertion that no `team_shop_buildings` write occurs on the cast path. Start-raid reads the snapshot via `getTeamBuildings` (only `team_shop_buildings` today).

### D-04 — Fold gateway placements into the start-raid snapshot (fix-scope #15, §11.8) — target 02-01 [LOW/minor]
§11.8 says the snapshot is "`team_shop_buildings` **plus gateway placements for layout**". The committed `getTeamBuildings` reads only `team_shop_buildings`. Phase 2 folds gateway-placement data into the snapshot the raid starts from (so AOE/grid layout reflects gateway positions) per §11.8. Low severity — the audit marked it `partial`/LOW. If folding it risks the 02-01 compile-first sequence, land it as a late 02-01 sub-task after `tsc` is green, not as a blocker.

### D-05 — Validate 15s window + cooldown spacing server-side (ENGINE-03) — target 02-01
Server already enforces: 15s window via `Date.now() - raid.startedAt.getTime()` (`action/route.ts:119, :197`); 1.5s cooldown via `raidLog.lastCastTs` (`:134`). Phase 2 adds unit tests asserting both reject out-of-window / too-fast casts. No client-side enforcement is authoritative.

### D-06 — Persist `raid_log_json` as the cast sequence (ENGINE-04) — target 02-01
`PvpRaid.raidLogJson Json?` stores the cast sequence (already written). Phase 2 verifies the stored log round-trips (replay/dispute). Keep storing `{spellId, x, y, clientTs, ...}` per cast; do not store client-computed damage.

### D-07 — Matchmaking eligibility: working+ phase, placed base, refind-exclude-shown (fix-scope #8, RAID-01/02, GATE-02) — target 02-01
`findRandomOpponent` (`app/api/pvp/route.ts:99-109`) currently scopes by `classId ∧ ¬own` only. Add: (a) `working`+ phase filter on the opponent; (b) require the defender has a **placed base** (GATE-02 — a team with no placed base cannot match as attacker or defender); (c) on `refind`, exclude already-shown bases (track shown base ids across the refind session). The pool per §11.7 = same class + `working`+ phase + has a placed base; refind rerolls excluding shown.

### D-08 — Phase-gate 403 on `/api/pvp/spell-power` (fix-scope #5, GATE-01) — target 02-01
`app/api/pvp/spell-power/route.ts:6` calls `requireTeamContext(req, { tier: 'read' })` **omitting `feature: 'pvp'`**, so the `working` phase gate is skipped (`route-context.ts` asserts only when `opts.feature` is set). Add `feature: 'pvp'` so the gate fires server-side. Every PvP route must gate server-side via `assertFeatureUnlocked` — never client-only (SPEC §14.1). The other PvP routes already pass `feature:'pvp'` (verified audit §2).

### D-09 — Catalog display names, not key-casing (fix-scope #7, RAID-06) — target 02-01
`formatBuildingName(key)` (`app/api/pvp/route.ts:37-39`) derives `"Power Plant"` from `"power_plant"` casing. Replace with catalog `name` lookup — pull display names from the catalog (`db.spell` / `Building` seed `name`), as `getTeamSpells` already pulls spell records. Spell **and** building display names in the raid HUD and PvP lobby come from catalog rows, not derived strings.

### D-10 — Remove dead duplicated exports (fix-scope #14, AUDIT-02) — target 02-01
Two orphaned exports in `lib/pvp/combat-engine.ts`, each shadowed by the live inline path (canonical = what the live route/UI calls): `createRaidSession` (`:108`, 0 callers — live `start_raid` builds `RaidSession` inline at `app/api/pvp/route.ts:284-292`; action route reconstructs inline) and `resolveSpellPowerMultiplier` (`:87`, 0 callers — live action route calls `getSpellPower(teamId)` directly at `:143`). Remove both. Do NOT keep them "just in case" — they are the stale variants the canonical path already supersedes.

### D-11 — Spells 1:1 + level/type, circular AOE identical in v1 (SPELL-01/02/03) — target 02-02
Already built via `buildSpell` (1:1 with economy building, level-tracking 1–15, type-bearing, circular AOE identical in v1). Phase 2 verifies with tests; no behavior change. No per-type/per-building differentiation in v1 (`[informational]` → PVPEXT-01 v2).

### D-12 — Type-effectiveness multipliers 2× / 0.5× / 1× (SPELL-04) — target 02-02
`typeEffectiveness` at `lib/pvp/combat-engine.ts:162-177` implements `empirical > theoretical > applied` cycle → 2× super-effective, 0.5× resisted, 1× neutral. Built. Phase 2 adds unit tests covering all 9 type-pair combinations (incl. neutral self-pairs).

### D-13 — Surface type-cycle science explanations in-game (SPELL-05) — target 02-02
§11.4 mandates the type cycle's one-line science explanations (Empirical→Theoretical→Applied→Empirical) be surfaced in-game **in the raid HUD and PvP lobby**. No such tooltip exists in the committed UI. Phase 2 adds a type-chart tooltip (raid HUD + lobby) with the one-line explanations. Define the explanation strings as constants in `lib/pvp` (not inline in the component).

### D-14 — Proportional trophy gain, rounded up, capped at 10 (TROPHY-01/02) — target 02-02
Gain branch already correct: ≥30% threshold (`TROPHY_GAIN_THRESHOLD`), `Math.ceil`, cap `MAX_TROPHY_GAIN=10` (`combat-engine.ts:310-316`). Built. Phase 2 unit-tests the gain curve. Percent destroyed is computed over defender total base health incl. partial building damage (TROPHY-01).

### D-15 — Trophy-loss MECHANISM lands here; tuned values + flip are Phase 3 (fix-scope #2, TROPHY-03) — target 02-01/02-02
The `TROPHY_LOSS_TODO = true` stub (`combat-engine.ts:26`, loss branch `:322-325`) is an untuned linear placeholder computing real `PvpTrophies` currency ("0% = -10, 29% = -1") — losing feels arbitrary. Phase 2 lands the **mechanism**: a low-destruction raid (≤ a tunable threshold) causes a trophy loss scaled inversely (lower destruction → larger penalty), + TEST-02 unit test. **Phase 2 does NOT pick the tuned values or flip `TROPHY_LOSS_TODO=false`** — that is Phase 3 `03-01` (TUNE-01). Keep `TROPHY_LOSS_TODO=true` through this phase; expose a clearly-marked loss constant/threshold the Phase-3 plan tunes. The loss path must remain behind the flag so it does not silently ship untuned.

### D-16 — Symmetric defender loss for v1 (TROPHY-06) — target 02-02 (mechanism) + 02-03 (doc)
`completeRaid` already decrements the defender by the same `trophyDelta` the attacker gains (`combat-engine.ts:267-285`) — resolves the §11.6/§18 open question **symmetric** for v1. **Mechanism is built** — Phase 2 verifies with tests. The **doc resolution** (recording it in §11.6/§18) is SPEC-01 in 02-03. Also correct the stale comment `packages/shared-types/src/pvp.ts:100` (`attackerTrophiesAfter // defender unaffected in v1`) to match the symmetric implementation (fix-scope #13). Revisit asymmetric in v2 only if pilot data demands (BAL-01 → `[informational]`).

### D-17 — Trophies ranking-only; daily quotas, no rollover (TROPHY-04/05) — target 02-02
Trophies are ranking-only (a class leaderboard; never convertible to KP/LC or unlocks). Daily raid + refind quotas per team enforce via `PvpRaidQuota @@id([teamId, date])` (the daily-cap idempotency key) with no rollover and no way to earn more. Currently 3/3 (inline in `app/api/pvp/route.ts` — externalized in Phase 3 `03-02`, `[informational]` here). Phase 2 verifies the cap + no-rollover with tests against the existing constraint.

### D-18 — Spell Power Meter: 4 tiers, UTC reset, no drain, applies to all attacker spell damage (METER-01..05) — target 02-02
The meter is built + wired + live (`lib/pvp/spell-power.ts`): `SPELL_POWER_TIERS` = NONE/Dormant ×0.5 (0 tasks) / BASE/Active ×1.0 (1–2) / BOOSTED/Charged ×1.5 (3–4) / MAX/Overcharged ×2.0 (5+); `getSpellPower` reads `teamDailyTaskDay` keyed `(teamId, date)` via `todayUtc()` (UTC midnight reset — METER-04; the US-classroom UTC-edge C-18 is known and deferred to v2 BAL-02, `[informational]`); raiding neither fills nor drains it (the raid path never calls `incrementDailyTaskCount` — METER-05); multiplier applied to all attacker spell damage inside `resolveCast` (proved `action/route.ts:143,166` — METER-03). The lobby meter UI is live (4 notch tiers, threshold-correct badge). Phase 2 adds the **end-to-end meter unit test** (TEST-03) proving `resolveCast` multiplies by the **live** multiplier across all four tiers via `getSpellPower`, not a hardcoded constant. Optional minor polish (audit §2 lobby row): meter **bar fill** is linear (`tasksCompleted/5`) rather than tracking discrete tier thresholds — the badge is threshold-correct; only bar width is linear between notches. Polish is optional; do not block on it.

### D-19 — Build `BattleScreen` matching v0.23.0 pixel-art (fix-scope #4, RAID-03/04/05) — target 02-02 [HIGH — milestone blocker]
`app/(dashboard)/pvp/battle/[id]/page.tsx` is an 8-line blank stub (`{/* TODO: BattleScreen component */}`). Raids start and cast via the API but **a human cannot play a raid** until this view exists. Build `BattleScreen`: defender grid at top (read-only snapshot), player spell bar at bottom, click-spell→click-target interaction, cast→`POST /api/pvp/{id}/action` (15s server-enforced window, cooldown-enforced), results screen showing percent destroyed + trophy change. **§7.1 prerequisite (MUST):** the BattleScreen MUST match the v0.23.0 pixel-art overhaul — read `apps/web/components/lab/LabScene.tsx`, `DecorationLayer.tsx`, `TileBackground.tsx` and reference `apps/web/public/sprites/gateways/*.png` + `apps/web/public/sprites/decor/*.png` (overhaul provenance: commit `18aae5d` "feat: v0.23.0 — pixel-art overhaul of the lab world (#24)", entered this branch via merge `7f67a12` 2026-07-19). Use the **pixel-art-generator** project skill for any new/recolor sprites. This is the phase's highest-risk, highest-value UI task.

### D-20 — Build the class leaderboard matching v0.23.0 pixel-art (fix-scope #9, TROPHY-04) — target 02-02
`app/(dashboard)/pvp/leaderboard/page.tsx` is an 8-line stub. §11.6 mandates a **class** leaderboard of trophy counts. The data (`PvpTrophies`) exists. Build the class leaderboard from `PvpTrophies` **matching the v0.23.0 pixel-art style (§7.1 prerequisite — same sprites/components as D-19)**. Scope is **class-only** (the stub's "class/school/global" exceeds §11 — do not build school/global).

### D-21 — Remove the stale 6v6 `team-builder` stub (fix-scope #10, §11.3) — target 02-02
`app/(dashboard)/pvp/team-builder/page.tsx` is an 8-line stub referencing the **superseded 6v6 character model** ("Select 6 characters from built buildings"). §11.3 has no characters/movesets — each building grants one spell; v1 loadout baseline = 1 (bring any of your spells; no meaningful picker to build yet). User-directed 2026-07-22: **remove** (not repurpose). Remove the stale stub + its route entry. The loadout-size >1 decision is the v2 extension (PVPEXT-02, `[informational]`).

### D-22 — Assess lobby visual-pass vs v0.23.0 (fix-scope #17) — target 02-02 [LOW — approvable/skippable]
`app/(dashboard)/pvp/lobby/page.tsx` was committed `70f82db` (2026-07-14) **before** the v0.23.0 overhaul merged (`7f67a12`); it imports none of `LabScene`/`DecorationLayer`/`TileBackground` and uses flat Tailwind only. Phase 2 **assesses** whether the lobby needs a visual pass to stay stylistically consistent with the post-overhaul lab world. This is a LOW visual-pass check, approvable/skippable — record the decision in the plan; if a pass is done, match §7.1. Do not block D-19/D-20 on it.

### D-23 — Write `apps/web/e2e/pvp.spec.ts` (fix-scope #3, TEST-01) — target 02-03
No PvP E2E exists today (C-01; 22 e2e specs, none pvp). Write `apps/web/e2e/pvp.spec.ts` mapping **every §11 acceptance criterion → a test**, matching the F1–F18 spec-AC-→-test convention (reference `apps/web/e2e/F11.spec.ts` for the EX-→-test convention). PvP mutates `PvpTrophies` + `PvpRaidQuota` (user-visible currency) — matchmaking/quota/trophy/combat regressions must not land silently. Cover the full raid E2E (working-phase student: raid → match → refind → cast → results), phase-gate 403 (below-working blocked), no-base guard (GATE-02), catalog names, meter tiers, symmetric loss.

### D-24 — Update `docs/SPEC.md` §11 to shipped reality (SPEC-01, fix-scope #11/#12/#16) — target 02-03 — **LANDS LAST**
SPEC-01 is the **last** work in Phase 2 (ROADMAP ordering note): it documents what the gap-closing + tests landed, so it must FOLLOW them, not precede. (a) Correct the stale §11 status block (`docs/SPEC.md:516` "Status: Design only — not yet built … returns 501 … no raid engine, no spell seed data, and no UI" is false). (b) Add a new §11 subsection for the Spell Power Meter (4 tiers + multipliers ×0.5/×1.0/×1.5/×2.0 + UTC midnight reset + no-drain-by-raiding + applies to all attacker spell damage). (c) Amend §11.6 / §18 to record the defender-loss open question as **resolved → symmetric gain/loss for v1**. Do NOT document Phase-3 tuned values (they aren't decided yet).

### D-25 — Order: 02-01 → 02-02 → 02-03; SPEC-01 last (ROADMAP ordering) — cross-cutting
Three plans, ordered: **02-01** (engine + matchmaking + gate + raid-flow + display-name gaps + remove dead exports + snapshot gateways + combat-engine unit tests for `resolveCast`/`typeEffectiveness`/trophy math — TEST-02 part) → **02-02** (spell + type + trophy-loss-mechanism + symmetric loss + SPM + `BattleScreen` + leaderboard + remove team-builder + type tooltip + lobby visual-pass + the end-to-end meter unit test — TEST-03) → **02-03** (E2E `pvp.spec.ts` — TEST-01 — then SPEC-01 doc update, lands last). 02-02 depends on the 02-01 compiling baseline; 02-03 depends on 02-02's playable UI + meter test. Waves reflect this; do not parallelize across the dependency.

### D-26 — No new libraries (SPEC §11.8) — cross-cutting
PvP uses only Next.js API routes + Prisma + trivial AOE arithmetic. Do NOT add a combat/physics/animation library. BattleScreen animations come from CSS/Tailwind + the existing sprite pipeline (pixel-art-generator skill), not a new dependency. Any PR adding a PvP library dependency is out of scope.

### D-27 — Idempotency + currency safety preserved — cross-cutting
The `PvpRaidQuota @@id([teamId, date])` daily-cap idempotency key and the high-water-mark / no-rollover conventions are preserved. Trophy math is user-visible currency — never silently regress. Tests (TEST-02/03, E2E) are the gate. Bad trophy math ships as a user-visible regression, so the loss curve is test-driven.

### D-28 — MVP mode: vertical slices, not horizontal layers — cross-cutting
**Mode: mvp** (ROADMAP P2). Plans are organized as vertical feature slices (each plan delivers a completable, reviewer-verifiable outcome), NOT horizontal layers (one plan for "all routes", one for "all UI"). 02-01 = the engine/flow slice the API proves; 02-02 = the player-playable slice + meter; 02-03 = the verification + spec slice. Not a Walking Skeleton (Phase 1 already has a completed summary; this is phase 02, and the project is brownfield).

### D-29 — Server-side phase gate on EVERY PvP route (§14.1) — cross-cutting
Every PvP route (incl. the new BattleScreen's API surface, spell-power, action, start) must call `requireTeamContext`/`assertFeatureUnlocked` with `feature: 'pvp'` server-side. Client-only gating is unacceptable. The gate mechanism (`lib/phase.ts` `'pvp'` → `working`, `featureRegistry.tsx`, `gateways.ts`) is built; the one wiring gap (D-08) closes here.

### D-30 — `todayUtc()` daily reset; UTC→local is v2 (METER-04, C-18) — cross-cutting [known edge, deferred]
Daily caps + Spell Power Meter reset at `todayUtc()` (UTC midnight). The US-classroom UTC-day-boundary edge (CONCERNS C-18) is **known and explicitly deferred to v2 (BAL-02)** — NOT fixed in this milestone. Record in tests/spec; do not attempt a local-timezone fix here.

### D-31 — Threat model per plan (security gate) — cross-cutting
Each PLAN.md must include a `<threat_model>` block (security gate enabled, ASVS L1, block-on high). PvP threat surfaces: (a) server-authoritative damage (client must never report damage — ENGINE-01); (b) IDOR on `[battleId]` action route (team-scoped, membership-verified); (c) phase-gate bypass (below-working reaching PvP APIs — GATE-01); (d) trophy-currency integrity (quota idempotency + no double-counting — D-27); (e) `raid_log_json` is stored user-adjacent data (no prompt-injection handling in this milestone — out of scope, C-07 `[informational]`). Prod-hardening (Upstash rate-limit on AI routes, prompt-injection on `raid_log_json`, `[battleId]` IDOR sweep hardening) is the app-wide launch-gate milestone, NOT this phase — recorded, not implemented.

### D-32 — Tune + flip `TROPHY_LOSS_TODO` [informational — Phase 3 03-01]
Decide tuned loss threshold/scaling, flip `TROPHY_LOSS_TODO=false`, add loss-curve unit test. Recorded for context; NOT planned in Phase 2 (Phase 2 lands the mechanism only — D-15). `[informational]`.

### D-33 — Externalize inline PvP tuning constants [informational — Phase 3 03-02]
Move `MAX_RAIDS_PER_DAY`/`MAX_REFINDS_PER_DAY` + spell damage/radius/cooldown scalars out of `app/api/pvp/route.ts` into the single `lib/pvp` constants block beside the existing `SPELL_*` constants. Phase 3 work. `[informational]`.

### D-34 — v2 PvP extensions [informational — §18, PVPEXT-01..05]
Per-type/per-building differentiated spells, loadout >1, replay UI, prestige cosmetics, spell evolutions. Out of scope this milestone. `[informational]`.

### D-35 — UTC→local reset + asymmetric loss [informational — v2, BAL-01/02]
UTC→local-timezone reset (BAL-02/C-18) and asymmetric defender loss if pilot data demands (BAL-01). v2. `[informational]`.

### Claude's Discretion
- Exact `BattleScreen` layout/grid geometry and pixel-art sprite choices (within §7.1 style) — implementer picks, matching the v0.23.0 overhaul; use the **pixel-art-generator** skill for any new/recolor sprites and the **ui-ux-pro-max** skill for layout/interaction polish.
- Exact type-cycle science-explanation copy (one-liners per Empirical/Theoretical/Applied) — factual science phrasing, implementer-author, kept in `lib/pvp` constants.
- Whether the lobby visual-pass (D-22) is done or skipped — assessor's call, recorded in the plan.
- BattleScreen cooldown/15s-window client UX (countdown, dimmed spell bar) — client-side *presentation* only; server remains authoritative (D-02/D-05).
- Test file structure inside `combat-engine.test.ts` (mirrors `lib/shop.test.ts`) and `pvp.spec.ts` (mirrors `e2e/F11.spec.ts`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-1 audit (the discuss artifact for this phase)
- `.planning/phases/01-verify-state-audit-report-only/01-AUDIT-REPORT.md` — the §11 inventory (every PvP file/route/component labeled built/broken/partial/duplicated), both-direction deviations, the AUDIT-02 duplicate hunt, the spec-staleness + SPM-absent flags, and the **§7 Phase-2 Fix Scope approval table** (17 rows, all Approved=Y) + **§7.1 pixel-art prerequisite**. This is the single source of truth for current state.

### PvP source (committed reality to close gaps in)
- `apps/web/lib/pvp/combat-engine.ts` — the raid engine: `resolveCast`, `typeEffectiveness` (`:162-177`), `completeRaid` symmetric loss (`:267-285`), gain branch (`:310-316`), `TROPHY_LOSS_TODO` stub (`:26`/`:322-325`), dead exports `createRaidSession` (`:108`) + `resolveSpellPowerMultiplier` (`:87`). TS2307 at `:3`/`:11`.
- `apps/web/lib/pvp/spell-power.ts` — the Spell Power Meter: `SPELL_POWER_TIERS`, `getSpellPower` (reads `teamDailyTaskDay` keyed `(teamId,date)` via `todayUtc()`). TS2307 at `:2`.
- `apps/web/app/api/pvp/route.ts` — start-raid + matchmaking: `findRandomOpponent` (`:99-109`), `formatBuildingName` key-casing (`:37-39`), inline `MAX_RAIDS_PER_DAY=MAX_REFINDS_PER_DAY=3` (`:31-32`), inline `RaidSession` build (`:284-292`), phase gates on GET (`:114-117`) + POST (`:183-186`). TS2307 at `:26`/`:27`.
- `apps/web/app/api/pvp/[battleId]/action/route.ts` — the action route: `resolveCast` call (`:166`), live `getSpellPower` (`:143`), 15s window (`:119`/`:197`), 1.5s cooldown (`:134`), `raidLogJson` reconstruct (`:147-155`/`:238-246`), `completeRaid` (`:199`/`:248`), local `RaidLog` interface (`:37-42`), gate (`:52`). TS2307+TS7006 at `:33`/`:158`/`:185`/`:189`.
- `apps/web/app/api/pvp/spell-power/route.ts` — meter read route; add `feature:'pvp'` at `:6` (D-08).
- `apps/web/app/(dashboard)/pvp/battle/[id]/page.tsx` — blank stub → build **BattleScreen** (D-19).
- `apps/web/app/(dashboard)/pvp/lobby/page.tsx` — live lobby + meter UI; assess visual-pass (D-22); optional meter-bar polish (D-18).
- `apps/web/app/(dashboard)/pvp/leaderboard/page.tsx` — stub → class leaderboard (D-20).
- `apps/web/app/(dashboard)/pvp/team-builder/page.tsx` — stale 6v6 stub → **remove** (D-21).

### Types + schema (the feasibility proof + unchanged schema)
- `packages/shared-types/src/index.ts` — the barrel (`export * from './enums'`, `export * from './pvp'`) — D-01 repoint target.
- `packages/shared-types/src/pvp.ts` — PvP types (`Spell`, `BuildingTarget`, `RaidCastEvent`, `RaidSession`, `RaidResult`, `SpellPowerTier`); correct stale comment at `:100` (D-16).
- `packages/shared-types/src/enums.ts` — `SpellType` (`empirical | theoretical | applied`), `LabType` (§11.4 cycle).
- `apps/web/prisma/schema.prisma` — `PvpRaid` (`raidLogJson Json?`), `PvpTrophies` (`teamId @id`, `currentTrophies`), `PvpRaidQuota` `@@id([teamId, date])` (daily-cap idempotency), `TeamDailyTaskDay` `@@id([teamId, date])` (meter backing rollup). **All built + matching §11.8 — Phase 2 does NOT modify the schema** (no `prisma db push` task).

### v0.23.0 pixel-art prerequisite (§7.1)
- `apps/web/components/lab/LabScene.tsx`, `DecorationLayer.tsx`, `TileBackground.tsx` — the pixel-art overhaul components `02-02` UI MUST match (D-19/D-20).
- `apps/web/public/sprites/gateways/*.png`, `apps/web/public/sprites/decor/*.png` — sprite references (overhaul provenance: commit `18aae5d`, merge `7f67a12`).

### Tests (mirrors + acceptance)
- `apps/web/test/` + inline `lib/*.test.ts` convention — `apps/web/lib/pvp/combat-engine.test.ts` mirrors `apps/web/lib/shop.test.ts` (TEST-02).
- `apps/web/e2e/F11.spec.ts` — the EX-→-test spec-AC-→-test convention `pvp.spec.ts` mirrors (TEST-01, D-23).
- `apps/web/e2e/` — ~22 existing `F<N>.spec.ts` specs; PvP has none (C-01, confirmed).

### Project conventions + skills
- `./CLAUDE.md` — project instructions (strict zod, team-scoped IDOR, idempotency ledger pattern, server-authoritative turn lifecycle, phase gating, no-new-libraries for PvP). FOLLOW.
- `.claude/skills/pixel-art-generator/SKILL.md` — use for any new/recolor PvP sprites (D-19/D-20).
- `.claude/skills/ui-ux-pro-max/SKILL.md` — use for BattleScreen/leaderboard layout + interaction polish.

### Spec (target of SPEC-01, lands last)
- `docs/SPEC.md` §11 (esp. `:516` stale status block) — UPDATE in 02-03 (D-24); do NOT trust as current state.

</canonical_refs>

<specifics>
## Specific Ideas

- **First action of `02-01` is the alias repoint (D-01)** — it must compile (`tsc --noEmit` green) before any other 02-01 task, because every other engine/test task depends on a compiling baseline. The audit pins this as the top row.
- **`TROPHY_LOSS_TODO` stays `true` through Phase 2** (D-15) — Phase 2 lands the *mechanism* + test; Phase 3 picks tuned values + flips to `false`. Do not flip in Phase 2.
- **TEST-03 is the end-to-end meter proof** (D-18) — it must assert `resolveCast` uses the **live** `getSpellPower`/`resolveSpellPowerMultiplier` multiplier across all four tiers (×0.5/×1.0/×1.5/×2.0), not a hardcoded constant. This is the requirement that stops the meter from being "a type sitting in shared-types".
- **`BattleScreen` is the milestone blocker** (D-19) — without it a human can't play a raid. It's the single highest-value UI task in the phase, and the §7.1 pixel-art match is mandatory, not optional.
- **`team-builder` is *removed*** (D-21) — user-directed 2026-07-22, not repurposed. v1 loadout = bring any of your spells; no picker to build.
- **Leaderboard is class-only** (D-20) — the stub's "class/school/global" exceeds §11.
- **`completeRaid` symmetric loss is already built** (D-16) — Phase 2 *verifies* it + corrects the stale `pvp.ts:100` comment + records the resolution in §11.6/§18 (SPEC-01). It is NOT a defect to "fix".
- **Schema is untouched** (canonical_refs prisma) — no `prisma db push` / migration task. If a planner adds one, that's a mistake.

</specifics>

<deferred>
## Deferred Ideas

- **Tuned trophy-loss values + `TROPHY_LOSS_TODO=false` flip** → Phase 3 `03-01` (TUNE-01) — `[informational]` (D-32).
- **Externalize inline PvP constants** (`MAX_RAIDS_PER_DAY`, `MAX_REFINDS_PER_DAY`, spell scalars) → Phase 3 `03-02` (TUNE-02/03) — `[informational]` (D-33).
- **UTC→local daily reset** (METER-04/C-18/BAL-02) → v2 — `[informational]` (D-30/D-35).
- **Asymmetric defender loss if pilot data demands** (TROPHY-06 revisit / BAL-01) → v2 — `[informational]` (D-35).
- **v2 PvP extensions** — per-type/per-building differentiated spells (PVPEXT-01), loadout >1 (PVPEXT-02), raid replay UI (PVPEXT-03), prestige cosmetics (PVPEXT-04), spell evolutions (PVPEXT-05) → `[informational]` (D-34).
- **PvP prod-hardening** — `[battleId]` IDOR sweep hardening, AI-route Upstash rate-limit, `raid_log_json` prompt-injection handling → app-wide launch-gate milestone (C-07) — `[informational]` (D-31).
- **App-wide production launch** (dedicated prod Supabase/Clerk/Vercel, `scienium.app`, FERPA/COPPA, branch protection, alerting) → separate milestone (C-05/C-07).
- **Lobby meter-bar linear-fill polish** (audit §2 lobby row) — minor optional; do not block (D-18).
- **`nova-lab` → `scienium` rebrand** (Clerk app name + R2 bucket) → ops task (C-06).

</deferred>

<scope_fence>
## Scope Fence

**IN this phase:** close every approved fix-scope row §7 (#1, #5, #7, #8, #14, #15 in 02-01; #2-mechanism, #9, #10, #13, #17, + spell/type/trophy/meter/UI in 02-02; #3, #4-via-02-02-UI, #11, #12, #16 in 02-03), prove with E2E + unit tests, update §11 to reality. SPEC-01 lands last.

**OUT (tagged `[informational]` — do NOT plan):** Phase 3 tune+flip (D-32), Phase 3 externalize constants (D-33), v2 PvP extensions (D-34), UTC→local + asymmetric loss (D-30/D-35), prod-hardening (D-31/C-07), app-wide launch. **Schema is built + unchanged — no `prisma db push` / migration task.** **No new libraries.** **`TROPHY_LOSS_TODO` stays `true` through Phase 2.**

**Hard invariants (regressions = phase failure):** server-authoritative damage (client never reports damage); non-destructive raids (no `team_shop_buildings` write on the cast path); `PvpRaidQuota` idempotency (no rollover, no double-earn); trophies ranking-only (never KP/LC); every PvP route phase-gated server-side; `tsc --noEmit` green after 02-01.

</scope_fence>

---

*Phase: 02-close-spec-gaps-tests*
*Context gathered: 2026-07-23 via Audit Express Path (signed-off Phase-1 audit report `01-AUDIT-REPORT.md` + ROADMAP P2 synthesis + REQUIREMENTS + STATE decisions; user approved skip-UI-SPEC + research-first 2026-07-23)*
