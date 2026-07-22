# Phase 1 Audit Report — §11 PvP Raid System (Report Only)

**Branch:** `matthew/pvp-system` · **Audited commit:** `38ebc2f` (`docs(01): begin phase 1 execution`) · **Audit date:** 2026-07-22
**Phase:** 1 — verify-state-audit-report-only · **Plan:** 01-01 · **Deliverable:** this report (no source mutated — AUDIT-05)

> Phase 1 produces **only** this document. No file under `apps/web/`, `packages/`, `docs/SPEC.md`, or any Prisma/Tsconfig source is edited in this phase. Every fix below is **proposed, not applied**. Phase 2 is hard-blocked on the user's sign-off of the **Phase 2 Fix Scope** table at the bottom of this report.

---

## 0. AUDIT-05 baseline (captured 2026-07-22, before any report-only write)

| Gate | Command | Result |
|------|---------|--------|
| Working tree (watched PvP paths) | `git status --porcelain apps/web packages docs/SPEC.md` | **empty** (no modified/staged PvP source) |
| TypeScript baseline | `cd apps/web && npx tsc --noEmit` | **exit 1 — 16 errors** (6 × `TS2307` + 10 × `TS7006`) |

**Verbatim `tsc --noEmit` output (16 errors):**
```
app/api/pvp/[battleId]/action/route.ts(33,8):  error TS2307: Cannot find module '@/packages/shared-types/src/pvp' or its corresponding type declarations.
app/api/pvp/[battleId]/action/route.ts(158,38): error TS7006: Parameter 's' implicitly has an 'any' type.
app/api/pvp/[battleId]/action/route.ts(185,6):  error TS7006: Parameter 'sum' implicitly has an 'any' type.
app/api/pvp/[battleId]/action/route.ts(185,11): error TS7006: Parameter 'b' implicitly has an 'any' type.
app/api/pvp/[battleId]/action/route.ts(189,6):  error TS7006: Parameter 'sum' implicitly has an 'any' type.
app/api/pvp/[battleId]/action/route.ts(189,11): error TS7006: Parameter 'b' implicitly has an 'any' type.
app/api/pvp/route.ts(26,30):  error TS2307: Cannot find module '@/packages/shared-types/src/enums' or its corresponding type declarations.
app/api/pvp/route.ts(27,57):  error TS2307: Cannot find module '@/packages/shared-types/src/pvp' or its corresponding type declarations.
lib/pvp/combat-engine.ts(3,41): error TS2307: Cannot find module '@/packages/shared-types/src/enums' or its corresponding type declarations.
lib/pvp/combat-engine.ts(11,8): error TS2306: Cannot find module '@/packages/shared-types/src/pvp' or its corresponding type declarations.
lib/pvp/combat-engine.ts(138,47): error TS7006: Parameter 's' implicitly has an 'any' type.
lib/pvp/combat-engine.ts(206,6):  error TS7006: Parameter 'sum' implicitly has an 'any' type.
lib/pvp/combat-engine.ts(206,11): error TS7006: Parameter 'b' implicitly has an 'any' type.
lib/pvp/combat-engine.ts(210,6):  error TS7006: Parameter 'sum' implicitly has an 'any' type.
lib/pvp/combat-engine.ts(210,11): error TS7006: Parameter 'b' implicitly has an 'any' type.
lib/pvp/spell-power.ts(2,37):  error TS2307: Cannot find module '@/packages/shared-types/src/pvp' or its corresponding type declarations.
```
Root cause of all 6 `TS2307`: `apps/web/tsconfig.json` maps only `"@/*": ["./*"]`, so deep imports `@/packages/shared-types/src/{enums,pvp}` resolve to the nonexistent `apps/web/packages/...` instead of the monorepo-root `packages/shared-types/src/*.ts`. The 10 `TS7006` are downstream (the type imports fail → params fall back to `any`). The 4 TS2307-bearing files — `lib/pvp/combat-engine.ts`, `lib/pvp/spell-power.ts`, `app/api/pvp/route.ts`, `app/api/pvp/[battleId]/action/route.ts` — are the **folded finding** (`C-11` escalated to a hard compile break), verified **pre-existing on `matthew/pvp-system`** (pre-merge at `60ce1db`; merge `7f67a12` touched zero PvP TS source).

---

## 1. How to read this report

**Inventory table columns (decision D-01):** `File | §11 point | Status | Deviation + reason | Proposed fix + target plan`

**Status labels (decision D-02):**
- **`broken`** — fails `tsc`, fails at runtime, or violates a stated invariant (e.g. the alias compile break; the `TROPHY_LOSS_TODO` stub computing live currency).
- **`partial`** — present and functions but deviates from spec §11 (e.g. inline tunables where spec says tunable; a phase gate omitted on one route).
- **`duplicated`** — ≥2 competing implementations for one §11 point (canonical identified per D-03).
- **`built`** — present and conforms to §11.
- A row with **both** a `broken` defect and a `partial` deviation takes the more severe label (`broken`) and lists both.

**Canonical-selection (decision D-03):** where duplicates exist, the canonical implementation = the one the **live API route / UI actually calls**; orphaned/stale competing variants are flagged `duplicated`.

---

## 2. §11 Inventory (AUDIT-01 + AUDIT-02)

| File | §11 point | Status | Deviation + reason | Proposed fix + target plan |
|------|-----------|--------|---------------------|----------------------------|
| `lib/pvp/combat-engine.ts` | §11.8 raid engine; §11.6 trophy | **broken** | (a) `TS2307` at L3 (`@/packages/shared-types/src/enums`) & L11 (`.../src/pvp`) → `tsc` fails. (b) **`TROPHY_LOSS_TODO = true`** (L26) — the live trophy-**loss** branch (L322–325) computes **real `PvpTrophies` currency** from an untuned linear placeholder ("0% = -10, 29% = -1"); losing feels arbitrary until tuned (C-02). The gain branch (≥30%, `Math.ceil`, cap 10 — L310–316) and the **symmetric** attacker-gain/defender-loss (L267–285) are otherwise built. | Repoint imports → `\\@scienium/shared-types` barrel **(02-01)**; replace stub + flip `TROPHY_LOSS_TODO=false` + tune loss curve **(03-01)**; loss *mechanism* unit-tested in **02-01/02-02** (TEST-02). |
| `lib/pvp/spell-power.ts` | §11 Spell Power Meter (§11-extension) | **broken** | `TS2307` at L2 (`@/packages/shared-types/src/pvp`) → `tsc` fails. Meter logic itself is **built + wired**: `SPELL_POWER_TIERS` = NONE/Dormant ×0.5 (0 tasks), BASE/Active ×1.0 (1–2), BOOSTED/Charged ×1.5 (3–4), MAX/Overcharged ×2.0 (5+); `getSpellPower` reads `teamDailyTaskDay` keyed `teamId_date` via `todayUtc()`; raid path never calls `incrementDailyTaskCount` → raids fill/drain nothing (METER-01..UT-5 ✓). | Repoint import → `\\@scienium/shared-types` barrel **(02-01)**. |
| `app/api/pvp/route.ts` | §11.5/§11.7 flow + matchmaking; §11.6; §11.3 names | **broken** | (a) `TS2307` at L26 (`/enums`) & L27 (`/pvp`). (b) **Inline tunables** `MAX_RAIDS_PER_DAY = MAX_REFINDS_PER_DAY = 3` (L31–32) — the file header itself says "spec says tunable in v1" (C-03). (c) **`formatBuildingName(key)`** builds `"Power Plant"` from `"power_plant"` casing (L37–39); no catalog `name` lookup (C-04 / RAID-06). (d) **Matchmaking** `findRandomOpponent` (L99–109) scopes by `classId ∧ ¬own` but does **not** filter `working`+ phase, does **not** require a placed base, and on `refind` does **not** exclude already-shown bases (§11.7: pool = same class + `working`+ phase + has a base; refind rerolls excluding shown). Gate wired server-side ✓ (L114–117 GET, L183–186 POST both pass `feature:'pvp'`). Non-destructive ✓ (only `db.pvpRaid.create`; no `team_shop_buildings` write). | Repoint imports **(02-01)**; catalog display names **(02-01)**; matchmaking eligibility + refind-exclude-shown **(02-01)**; externalize constants **(03-02)**. |
| `app/api/pvp/[battleId]/action/route.ts` | §11.8 engine; §11.5 raid; §11.6 | **broken** | `TS2307` at L33 (`/pvp`) + 10× downstream `TS7006` (L158 's', L185/189 'sum'/'b'). Logic otherwise **built**: server-authoritative `resolveCast(session, castEvent, multiplier)` (L166) fed the **live** meter via `getSpellPower(teamId)` (L143) — proves the meter is wired into damage, not just displayed; 15 s window via `Date.now() - raid.startedAt.getTime()` (L119, L197); 1.5 s cooldown via `raidLog.lastCastTs` (L134); `completeRaid(session, battleId)` finalizes (L199, L248); defender base reconstructed from `raidLogJson` (L147–155) — never re-reads/mutates `team_shop_buildings`. Gate wired ✓ (`feature:'pvp'` L52). | Repoint import → barrel — clears all 10 `TS7006` as the type resolves **(02-01)**. |
| `app/api/pvp/spell-power/route.ts` | §14.1 phase gate; §11 meter | **partial** | `requireTeamContext(req, { tier: 'read' })` (L6) **omits `feature: 'pvp'`** → the `working` phase gate is **skipped** (`route-context.ts` L85–93 asserts only when `opts.feature` set). §14.1 enforcement note: PvP gate must be server-side on **every** PvP route, never absent. Impact is limited (read-only; a below-`working` team reads an empty/Dormant meter), but it is a real §14.1 deviation. Returns meter correctly otherwise. | Add `feature: 'pvp'` to the `requireTeamContext` call **(02-01)**. |
| `packages/shared-types/src/index.ts` | §11.8 types (barrel) | **built** | Barrel re-exports `export * from './enums'`, `'./paper'`, `'./pvp'`. **This is the feasibility proof for option (b):** the barrel already exposes exactly what the broken deep imports need (`SpellType`/`LabType` from `enums`; `Spell`/`BuildingTarget`/`RaidCastEvent`/`RaidSession`/`RaidResult`/`SpellPowerTier` from `pvp`), so repointing the 4 PvP files is a **pure import-path edit, no API/type changes**. | (no fix — it is the fix enabler) referenced by **02-01**. |
| `packages/shared-types/src/pvp.ts` | §11.8 types; §11.6 trophy | **built** | Types conform to §11.8. **One stale inline comment** at L100 — `attackerTrophiesAfter // defender unaffected in v1` — contradicts the live `completeRaid` which **does** decrement the defender symmetrically (L267–285). Documentation drift, not a type defect. | Correct the stale comment to match the symmetric implementation **(02-02)** (folds into trophy work). |
| `packages/shared-types/src/enums.ts` | §11.4 type system | **built** | Exports `SpellType` (`empirical | theoretical | applied`) and `LabType` — matches §11.4's three-type cycle. | — |
| `apps/web/prisma/schema.prisma` (`PvpRaid`, `PvpTrophies`, `PvpRaidQuota`, `TeamDailyTaskDay`) | §11.8 schema; idempotency | **built** | `PvpRaid` (`raidLogJson Json?`), `PvpTrophies` (`teamId @id`, `currentTrophies`), `PvpRaidQuota` `@@id([teamId, date])` (the daily-cap idempotency key), `TeamDailyTaskDay` `@@id([teamId, date])` (the meter backing rollup). All match §11.8; non-destructive is a code property (action route), not a schema one. | — |
| `lib/phase.ts` + `lib/featureRegistry.tsx` + `lib/gateways.ts` | §14.1 phase gate | **built** | The §14.1 gate **mechanism is built**: `phase.ts` declares `'pvp'` (L47), maps `working: ['buildings','pvp','data_terminal']` (L57) and `pvp: 'working'` (L100), with `assertFeatureUnlocked` (L153); `featureRegistry.tsx` registers the pvp feature → `/pvp/lobby` (L55–59); `gateways.ts` exposes a `pvp` gateway (`feature:'pvp'`, `route:'/pvp/lobby'`, L108–112). The one wiring gap is row 5 (`spell-power/route.ts` omitting the flag) — the mechanism is fine. | gap folded into row 5 → **02-01**. |
| `apps/web/e2e/pvp.spec.ts` | §11 acceptance (F1–F18 parity) | **broken** (absent) | No file. Every feature F1–F18 has an `e2e/F<N>.spec.ts`; **PvP has none** (C-01, confirmed: 22 e2e specs, none pvp-mentioning). PvP mutates `PvpTrophies` + `PvpRaidQuota` (user-visible currency) — matchmaking/quota/trophy/combat regressions land silently. | Write `e2e/pvp.spec.ts` mapping each §11 AC → a test (EX-→-test convention from `e2e/F11.spec.ts`) **(02-03, TEST-01)**. |
| `app/(dashboard)/pvp/lobby/page.tsx` | §11.7 lobby; §11 meter UI | **built** | Full live entry: `GET /api/pvp` for state + `POST {action:'refind'|'start_raid'}`; `start_raid` → `router.push('/pvp/battle/${data.raidId}')`. Spell Power Meter UI live — 4 notch tiers (`TIER_NOTCHES`) mirror `SPELL_POWER_TIERS`, badge via `getCurrentTierIndex`. **Minor self-documented partial** (header L9–10): the meter *bar fill* is linear (`tasksCompleted/5`) rather than tracking discrete tier thresholds (the badge is threshold-correct; only the bar width is linear between notches); refind/raid counts decrement optimistically. | (optional meter-bar polish) **02-02** if desired. |
| `app/(dashboard)/pvp/battle/[id]/page.tsx` | §11.5 raid view | **partial** | 8-line stub: `{/* TODO: BattleScreen component */}` renders blank. §11.5's raid view (opponent base at top, player's spell bar at bottom, click-spell-→-click-target, results screen) is **not rendered**. **This is the milestone blocker:** the lobby routes players here on every `start_raid`, but the screen is empty — raids can *start* and *cast* via the API, but a human **cannot play a raid** until this view exists. | Build `BattleScreen` (defender grid + spell bar + cast→`/api/pvp/{id}/action` + results/percent) **(02-02)**. |
| `app/(dashboard)/pvp/leaderboard/page.tsx` | §11.6 leaderboard | **partial** | 8-line stub: `{/* TODO: Class / school / global rankings */}`. §11.6 mandates a **class** leaderboard of trophy counts; the UI is absent (the data — `PvpTrophies` — exists). The TODO's "class/school/global" scope also exceeds §11 (class-only). | Build the class leaderboard from `PvpTrophies` **(02-02)**. |
| `app/(dashboard)/pvp/team-builder/page.tsx` | §11.3 loadout | **partial** (superseded) | 8-line stub: `{/* TODO: Select 6 characters from built buildings */}`. References the **superseded 6v6 character model** (§11.3/§11 intro: no characters/movesets — each building grants **one** spell; loadout baseline = 1, tunable). Page is an orphaned stale-design route. | Repurpose to a v1 loadout (select ≥1 of the team's building-granted spells) **or** remove **(02-02)**. |

**AUDIT-02 — duplicate hunt (D-03, canonical = what the live route/UI calls):** two confirmed orphaned exports in `combat-engine.ts`, each shadowed by the live inline path:
- **`createRaidSession` (combat-engine.ts:108)** — `export function`, **0 callers** (grep-verified). The live `start_raid` route builds the `RaidSession` **inline** (`app/api/pvp/route.ts:284–292`) and the action route reconstructs it inline (`action/route.ts:147–155, 238–246`). → **`duplicated`**; canonical = the inline literals; the exported helper is the stale variant. Proposed fix: remove the dead helper **(02-01)**.
- **`resolveSpellPowerMultiplier` (combat-engine.ts:87)** — `export async function`, **0 callers** (grep-verified). The live action route calls `getSpellPower(teamId)` **directly** (`action/route.ts:143`) and passes `multiplier` into `resolveCast`. → **`duplicated`**; canonical = direct `getSpellPower`; the wrapper is the stale variant. Proposed fix: remove the dead wrapper **(02-01)**.

No further duplicates found: the local `RaidLog` interface in `action/route.ts:37–42` is the only such shape (not shadowed by a shared-types export the route imports).

---

## 3. Per-§11 summary (AUDIT-01 prose)

**§11 intro / §11.1 — Overview.** Built-and-wired: raids are a daily engagement loop separate from STEM project work, trophies are ranking-only (never KP/LC), rewards come from building investment. The §11 intro note ("fully replaces the earlier 6v6 … box") is the reason the `team-builder` stub's "6 characters" TODO is stale. **Deviation:** §11 line 516 "Status: Design only — **not yet built** … returns 501 … no raid engine, no spell seed data, and no UI" is **stale** — the engine (`combat-engine.ts`), spell seed (`db.spell`, `getTeamSpells`), and UI (`lobby`) all exist and routes return 200. See §AUDIT-04.

**§11.2 — Design Principles.** Built: non-destructive snapshot raids, trophies-not-currency, building-investment tie-in. **Deviation (out of milestone scope):** "resets at midnight **local time**" vs the code's `todayUtc()` UTC-midnight slice (C-18). Explicitly deferred to v2 (`BAL-02`) — **not** a Phase 2/3 plan; recorded here for completeness.

**§11.3 — Spells.** Built via `buildSpell` (1:1 with economy building, level-tracking, type-bearing, circular-AOE identical in v1). **Deviation:** display names derived from `buildingKey` casing (`formatBuildingName`) instead of catalog `name` rows (C-04 / RAID-06). Loadout baseline (1 chosen spell, tunable) not yet surfaced in UI — the `team-builder` stub is the intended-but-stale home.

**§11.4 — Type System.** Built: `empirical > theoretical > applied` cycle in `combat-engine.ts:162–177` (`typeEffectiveness` → 2× / 0.5× / 1×). **Deviation:** the one-line science explanations "must be surfaced in-game" (type-chart tooltip in raid HUD + lobby) — no such tooltip exists in the committed UI (→ 02-02 with the raid view).

**§11.5 — Raid Flow.** Partially built at the API layer (start → cast → results via `completeRaid`), but the **player-facing raid view is a blank stub** (`battle/[id]/page.tsx`) — the flow is not completable by a human. The 15 s window + cooldown are server-enforced (good). See row `battle/[id]`.

**§11.6 — Trophy System.** Gain mechanism built + correct (≥30% threshold `TROPHY_GAIN_THRESHOLD`, `Math.ceil`, cap `MAX_TROPHY_GAIN=10`). **Loss** is the `TROPHY_LOSS_TODO` stub on live currency (C-02 → 03-01). **Symmetric defender loss** is a deviation-with-closed-decision (§11.6/§18 left it **open**; the live code closes it **symmetric** for v1) — recorded, not a defect. **Leaderboard** is a stub (→ 02-02).

**§11.7 — Matchmaking.** Built (random pick, same class, ¬own, refind reroll), but missing eligibility filters: no `working`+ phase gate, no placed-base requirement, no refind-exclude-already-shown (→ 02-01).

**§11.8 — Technical Impl.** Built: server-authoritative engine, client streams only `{spellId,x,y,clientTs}`, AOE resolved server-side against the stored `raidLogJson` snapshot, `raid_log_json` stores the cast sequence. **Minor deviation:** the spec's "read-only snapshot of `team_shop_buildings` (**plus gateway placements for layout**)" — the committed snapshot (`getTeamBuildings`) reads only `team_shop_buildings`; gateway placements are not yet folded into the snapshot (low severity; → 02-01 if desired). No new libraries introduced. Schema matches (see schema row).

**§11.9 — Educational Justification.** Honored by design (building investment → KP/LC from real engagement; daily cap; type cycle as real epistemology) — contingent on §11.4's tooltip landing (02-02). No code deviation.

---

## 4. AUDIT-03 — Deviations in both directions

**Code exceeds spec (`code > spec`, built but undocumented):**
- **The Spell Power Meter** (§11-extension). It is **built, wired, and live**, but **§11 mentions it nowhere**. Live shape: 4 tiers — NONE/Dormant ×0.5 (0 tasks), BASE/Active ×1.0 (1–2), BOOSTED/Charged ×1.5 (3–4), MAX/Overcharged ×2.0 (5+); team-scoped via `TeamDailyTaskDay` keyed `(teamId, date)`; resets at UTC midnight (`todayUtc()`); raiding neither fills nor drains it; the multiplier is applied to **all attacker spell damage** inside `resolveCast` (proved by `action/route.ts:143,166`). **Recommendation:** add a new §11 subsection (tiers + multipliers + reset + no-drain) — applied later via **SPEC-01 (02-03)**, not in this phase.

**Spec exceeds code (`spec > code`, gaps the audit elevates):**
- §11.5 raid **view** (blank stub → no playable raid) — **milestone blocker** (02-02).
- §11.6 **leaderboard** UI missing (02-02).
- §11.7 matchmaking **eligibility** (working+ phase / placed base / refind-exclude-shown) (02-01).
- §11.4 type-cycle **tooltip** "surfaced in-game" (02-02).
- §11.3 names from **catalog** (02-01) and inline **tunables** "spec says tunable" (03-02).
- §11.8 snapshot **+ gateway placements** (02-01, minor).
- §14.1 **phase gate** on `/api/pvp/spell-power` (02-01).

**Deviation-with-closed-decision (neither pure gap nor defect):**
- **Symmetric defender-trophy loss.** §11.6 ("Whether the defender's trophies also move … is an open question (§18)") and §18 left this **open**; the live `completeRaid` (combat-engine.ts `267–285`) closes it **symmetric for v1** — the defender loses the same `trophyDelta` the attacker gains (Key Decision already ✓ Decided). Labeled `partial` (it deviates from an open spec), recorded as **resolved**, not a defect to fix. **Recommendation:** record the resolution in §11.6/§18 via **SPEC-01 (02-03)**.

---

## 5. AUDIT-04 — Spec staleness & Spell-Power-Meter absence

1. **§11 status block is STALE.** `docs/SPEC.md:516` — "Status: Design only — **not yet built** … the API route is stubbed (`app/api/pvp/*` returns 501) … there is no raid engine, no spell seed data, and no UI" — is false against the committed branch: the raid engine exists (`combat-engine.ts`), spells are seeded (`db.spell` via `getTeamSpells`), the lobby UI exists, and routes return 200 (start/cast/spell-power), not 501.
2. **Spell Power Meter is ABSENT from §11** despite being built, wired, and live (§4 above).

**Recommended exact spec corrections (applied later via SPEC-01, plan `02-03` — NOT in this report-only phase):**
- Replace the §11 status block with a short "Built on `matthew/pvp-system`; §11 documents the shipped design" status noting the known gaps being closed in Phase 2.
- Add a new §11 subsection for the Spell Power Meter (tiers + multipliers + UTC reset + no-drain-by-raiding + applies to all attacker spell damage).
- Amend §11.6 / §18 to record the defender-loss open question as **resolved → symmetric gain/loss for v1**.

---

## 6. AUDIT-05 — No-mutation gate (re-confirmed at close)

| Gate | Command | Expected | At-close result |
|------|---------|----------|------------------|
| Watched PvP source | `git status --porcelain apps/web packages docs/SPEC.md` | empty | **empty** (See close verification in the Task-2 checkpoint; report-only write is under `.planning/` only.) |
| TypeScript | `cd apps/web && npx tsc --noEmit` | still exit 1 / 16 | unchanged — no source touched; the 16 errors are the **baseline**, not introduced by this phase |

This phase wrote **only** `.planning/phases/01-verify-state-audit-report-only/01-AUDIT-REPORT.md` (and its context/plan siblings written earlier). No `apps/web/`, `packages/`, `docs/SPEC.md`, Prisma, or tsconfig file was edited.

**Pre-existing dirty paths NOT introduced by this phase** (do not touch the watched PvP surface, do not affect the no-mutation invariant): `.claude/settings.local.json` (local session settings, snapshot-time), `.planning/config.json` (GSD chain-sync `_auto_chain_active` toggle). Neither is committed by the report commit.

---

## 7. Phase 2 Fix Scope — approval table (decision D-04)

> **This is the review gate.** Ordered broken-first; the **top row is the folded `@/packages` alias-break**, pinned as the first `02-01` action item (option (b) — repoint to the `@scienium/shared-types` barrel, **not** option (a) widening the alias). The **barrel proof** is `packages/shared-types/src/index.ts` (`export * from './enums'`, `export * from './pvp'`) — repointing the 4 PvP files is a pure import-path edit with no API/type changes.

| # | Finding (file / §11 point) | Status | Severity | Proposed fix | Target plan | Approved? (Y/N) |
|---|---------------------------|--------|----------|---------------|-------------|------------------|
| 1 | `@/packages` alias `TS2307` across `combat-engine.ts`, `spell-power.ts`, `app/api/pvp/route.ts`, `action/route.ts` (+10 downstream `TS7006`) | broken | HIGH | Repoint the 4 files' deep imports to `@scienium/shared-types` barrel (option **b**); barrel already exports the needed `enums`/`pvp` symbols; then `cd apps/web && npx tsc --noEmit` → green | `02-01` |  |
| 2 | `TROPHY_LOSS_TODO = true` — live trophy loss from an untuned stub (combat-engine.ts L26, L322–325) | broken | HIGH | Land the loss **mechanism** (low-destruction → scaled loss) + TEST-02 unit test; decide values + flip `TROPHY_LOSS_TODO=false` + loss-curve test | `02-01`/`02-02` (mechanism) → `03-01` (tune+flip) |  |
| 3 | Absent `apps/web/e2e/pvp.spec.ts` — no PvP E2E (C-01) | broken | HIGH | Write `pvp.spec.ts` mapping every §11 AC → a test (F1–F18 parity, `F11.spec.ts` convention) | `02-03` (TEST-01) |  |
| 4 | `battle/[id]/page.tsx` blank stub — **no playable raid** (§11.5) | partial (blocker) | HIGH | Build `BattleScreen` (defender grid + spell bar + cast→`/api/pvp/{id}/action` + results) **matching the v0.23.0 pixel-art style — see §7.1 prerequisite** | `02-02` |  |
| 5 | `spell-power/route.ts` omits `feature:'pvp'` — skips `working` phase gate (§14.1) | partial | MED | Add `feature: 'pvp'` to the `requireTeamContext` call | `02-01` |  |
| 6 | Inline `MAX_RAIDS_PER_DAY` / `MAX_REFINDS_PER_DAY = 3` (C-03) | partial | MED | Externalize into the `lib/pvp` constants block beside the existing `SPELL_*` constants | `03-02` |  |
| 7 | `formatBuildingName` key-casing, no catalog `name` (C-04 / RAID-06) | partial | MED | Pull display names from the catalog (`db.spell` / `Building` seed `name`), as `getTeamSpells` already pulls spell records | `02-01` |  |
| 8 | Matchmaking missing `working`+ phase gate, placed-base requirement, refind-exclude-shown (§11.7) | partial | MED | Add eligibility filters to `findRandomOpponent` + track shown bases across the refind session | `02-01` |  |
| 9 | `leaderboard/page.tsx` stub — §11.6 class leaderboard missing | partial | MED | Build the class leaderboard from `PvpTrophies` **matching the v0.23.0 pixel-art style — see §7.1 prerequisite** | `02-02` |  |
| 10 | `team-builder/page.tsx` stub — superseded 6v6 vestige (§11.3) | partial | LOW | Repurpose to a v1 loadout (≥1 spell selection) **or** remove | `02-02` |  |
| 11 | Symmetric defender loss — §11.6/§18 open → closed symmetric v1 (resolved deviation) | partial (resolved) | LOW | Record the resolution in §11.6/§18 | `02-03` (SPEC-01) |  |
| 12 | Spell Power Meter — built + wired but **absent from §11** | built (deviation) | LOW | Add a new §11 subsection (tiers + multipliers + reset + no-drain) | `02-03` (SPEC-01) |  |
| 13 | `pvp.ts:100` stale comment "defender unaffected in v1" | built (drift) | LOW | Correct the comment to match the symmetric implementation | `02-02` |  |
| 14 | AUDIT-02 — orphaned `createRaidSession` + `resolveSpellPowerMultiplier` (canonical = inline/direct) | duplicated | LOW | Remove the dead exports (canonical already live) | `02-01` |  |
| 15 | Raid snapshot omits gateway placements (§11.8 "plus gateway placements for layout") | partial | LOW | Optionally fold gateway placements into the start-raid snapshot | `02-01` |  |
| 16 | §11 status block stale + SPM absent (AUDIT-04) | spec-stale | LOW | Correct §11 + add SPM subsection + record symmetric-loss resolution | `02-03` (SPEC-01) |  |
| 17 | Lobby visual-pass — `lobby/page.tsx` predates the v0.23.0 pixel-art overhaul (flat Tailwind; imports no `LabScene`/`DecorationLayer`/`TileBackground`/sprites) | visual-pass | LOW | `02-02` assesses whether the lobby needs a visual pass to stay stylistically consistent with the post-overhaul lab world (see §7.1) | `02-02` |  |

**Out of this milestone's scope (recorded, NOT a Phase 2/3 plan):** UTC-vs-local daily reset, C-18 / BAL-02 — `§11.2 "midnight local time"` vs the code's `todayUtc()` UTC slice — deferred to v2 (logged in `.planning/STATE.md` Deferred Items). The lobby meter-bar linear-fill (§2 row `lobby`) is a minor optional polish.

### 7.1 Visual-consistency prerequisite (user-directed 2026-07-22)

Before `02-02` builds the `BattleScreen` (**#4**) and the §11.6 leaderboard (**#9**), the implementer MUST read the teammate's pixel-art overhaul and match its visual style. This is a Phase-2 **plan prerequisite**, recorded here so the review-gate artifact self-contains it (D-04); it is not a §11 deviation (no `broken`/`partial` label is warranted — nothing in §11 mandates a pixel-art render).

- **Overhaul provenance (verified against the `38ebc2f` baseline):** commit `18aae5d` — *"feat: v0.23.0 — pixel-art overhaul of the lab world (#24)"* (teammate PR, 2026-07-13) — entered `matthew/pvp-system` via merge `7f67a12` (2026-07-19). The merge stat **created `apps/web/components/lab/DecorationLayer.tsx` (+98 rows)**, **modified `apps/web/components/lab/LabScene.tsx` and `apps/web/components/lab/TileBackground.tsx`**, and **added** `apps/web/public/sprites/gateways/*.png` + `apps/web/public/sprites/decor/*.png` sprites. All present on the audited commit.
- **Components to read before `02-02` UI work:** `apps/web/components/lab/LabScene.tsx`, `apps/web/components/lab/DecorationLayer.tsx`, `apps/web/components/lab/TileBackground.tsx`.
- **Gateway sprites to reference:** `apps/web/public/sprites/gateways/*.png` (e.g. `discovery_*.png`, `literature_review_*.png`).
- **`#4` BattleScreen** and **`#9` leaderboard** — the new screens built in `02-02` **must** match this style.
- **Lobby visual-pass check (`#17`):** `app/(dashboard)/pvp/lobby/page.tsx` was committed `70f82db` (2026-07-14), **before** `7f67a12` merged the v0.23.0 overhaul into this branch; it imports **none** of `LabScene`/`DecorationLayer`/`TileBackground` and uses flat Tailwind only. `02-02` must assess whether the lobby needs a visual pass to stay consistent with the post-overhaul lab world. Recorded as **#17** (a LOW visual-pass check, approvable/skippable), not an audit-finding defect.

---

## 8. Task-2 sign-off (human-verify gate — **awaiting user**)

> **Phase 2 is hard-blocked on the user's sign-off below** (ROADMAP Handoff). The auditor does not sign off; the **Approved? (Y/N)** column above is intentionally blank and is filled only after the user reviews this report and directs Phase 2 fix scope.

Reviewer sign-off:

- [ ] **Reviewed the inventory (§2) and two-direction deviations (§4).** — ________
- [ ] **Reviewed the spec-staleness / SPM-absent recommendations (§5).** — ________
- [ ] **Directed Phase 2 fix scope** — approve the table above as-is, or mark rows in/out and adjust target plans. — ________
- [ ] **Approved Phase 2 to begin** (all rows the user leaves Approved=Y). — ________

User signature / date: ________________________
