# Phase 1: Verify-State Audit (Report Only) - Context

**Gathered:** 2026-07-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a **single written markdown report** (no code changes) that tells a reviewer the truth of the §11 PvP Raid System on the committed `matthew/pvp-system` branch: every committed PvP file / route / component mapped to a spec §11 point, each labeled `built` / `broken` / `partial` / `duplicated` (canonical implementation identified where duplicates exist), with deviations reported in both directions (including the Spell Power Meter — built, spec-undocumented — and symmetric defender-trophy loss — §11.6/§18 open, now closed symmetric for v1), a flag that §11's "not yet built" status block is stale and a recommendation for the exact spec correction (applied later via SPEC-01, not in this phase), and proposed-but-unapplied fixes with their target Phase/Plan. The report ends with a consolidated **Phase 2 Fix Scope** approval table the user signs off on to un-gate Phase 2.

**This phase changes zero source.** AUDIT-05 guard: at phase close the working tree's PvP source must match the branch baseline — proposed fixes are listed, never applied. Phase 2 is hard-blocked on the user's sign-off on the report's fix-scope table, not merely on Phase 1 "completing".

</domain>

<decisions>
## Implementation Decisions

### Report shape (Audit deliverable)
- **D-01 — Table-driven inventory:** The report is a single markdown table, one row per committed PvP file/route/component, columns `[file | §11 point | status label | deviation + reason | proposed fix + target plan]`, followed by a short prose summary per §11 subsection and the spec-staleness + Spell-Power-Meter callouts. This makes AUDIT-01 (every file ↔ §11 ↔ label) verifiable by row-count against the PvP file list and makes "proposed-fix → target-plan" a first-class column. File location: `.planning/phases/01-verify-state-audit-report-only/01-AUDIT-REPORT.md`. Chosen over sectioned-prose-per-§11 (harder to prove completeness) and hybrid inline-tables (column drift across sections).
- **Report name convention:** `01-AUDIT-REPORT.md` (phase-prefixed, under the phase dir, committed as a docs change — matches `commit_docs: true`).

### Status-label thresholds (AUDIT-01 labeling consistency)
- **D-02 — Concrete thresholds for the four roadmap labels:**
  - **`broken`** = fails `tsc`, fails at runtime, or violates a stated invariant. → e.g. the `@/packages/shared-types/src/*` alias compile-break (`tsc --noEmit` exit 1, 16 errors); the `TROPHY_LOSS_TODO` stub computing live currency from an untuned placeholder.
  - **`partial`** = present and functions but deviates from spec §11. → e.g. C-03 inline tuning constants (`MAX_RAIDS_PER_DAY` etc. atop the route, spec says tunable); C-04 spell/building display names derived from key casing not catalog rows; the symmetric defender-trophy loss that §11.6/§18 left open (now resolved symmetric for v1 — a *deviation with a closed decision*, not a defect).
  - **`duplicated`** = ≥2 competing implementations for one §11 point (orphaned/stale variants flagged `duplicated` with the canonical identified per D-03).
  - **`built`** = present and conforms to §11.
  - A row with **both** a `broken` defect **and** a `partial` deviation takes the more severe label (`broken`) and lists both in the deviation cell. Softer "runtime/invariant-only" broken (treating the tsc-404 as partial) was rejected — an import that doesn't compile is a broken module, not a wiring nicety, and it feeds Phase 2 priority correctly as `broken`.

### Duplicate canonical-selection rule (AUDIT-01 "canonical identified where duplicates exist")
- **D-03 — Canonical = the implementation the live API route / UI actually calls, then scored against spec §11** for conformance. Orphaned / half-finished / stale competing variants are flagged `duplicated` with the canonical one named. Chosen over "newest commit touching the point" (risks picking a half-finished rewrite — bad for an audit whose premise is untracked sessions left PvP mid-build) and "tested/UI-imported variant wins" (PvP has no `pvp.spec.ts` — C-01 — so that rule degenerates to "first one found" and gives no selection signal here). This matches the locked decision "current code is the source of truth".

### Fix-scope handoff format (AUDIT-02/03 + hard review gate)
- **D-04 — Per-finding column + consolidated approval table:** Each finding's row carries a `Proposed Fix + Target Plan` cell (e.g. the alias-break → "repoint 4 files to `@scienium/shared-types` barrel" → **`02-01`**); the report **also** ends with a consolidated **"Phase 2 Fix Scope"** summary table (ordered, top entry = the folded @/packages finding → `02-01`) the user signs off on to un-gate Phase 2. One artifact self-contains inventory + fix-targets + the review-gate outcome. Chosen over "proposed-fix column + separate conversational sign-off note" (splits the review-gate outcome into a second doc, weakens the option-b→02-01 pin) and "separate `PHASE2-FIX-SCOPE.md` doc" (two artifacts to keep in sync; the report no longer self-contains the review gate).

### Claude's Discretion
None — all four gray areas were decided by the user (recommended option selected each time). The auditor executing this context has no open method questions; only the *content* of the inventory (which files, which §11 points) is uncovered work for the executor.

### Folded Todos
- **Folded from [.planning/todos/pending/2026-07-20-pvp-audit-finding-apps-web-packages-alias-broken.md](`api`, score 0.6)** — *"PvP audit finding: apps/web @/packages/* alias resolution broken (tsc --noEmit fails)"*.
  - **Original problem (pre-verified 2026-07-20):** `cd apps/web && npx tsc --noEmit` fails with exit 1 / 16 errors because `apps/web/tsconfig.json` maps only `"@/*": ["./*"]`, so deep imports `@/packages/shared-types/src/pvp` and `@/packages/shared-types/src/enums` resolve to `apps/web/packages/...` (nonexistent) instead of the monorepo-root `packages/shared-types/src/{pvp,enums}.ts`. 6× `TS2307` + 10× downstream `TS7006`. Affected files: `app/api/pvp/route.ts`, `app/api/pvp/[battleId]/action/route.ts`, `lib/pvp/combat-engine.ts`, `lib/pvp/spell-power.ts`. **Verified pre-existing on `matthew/pvp-system`** (NOT merge-induced: `git diff 60ce1db HEAD -- apps/web/tsconfig.json` empty; merge `7f67a12` touched zero PvP TS source; failing imports pre-exist at `60ce1db`).
  - **Mitigation parity confirmed:** This is CONCERNS **C-11** ("Inconsistent shared-types imports") escalated from a consistency-smell to a hard compile-break. The vulnerability is precisely the C-11 documented smell; the fix is C-11's documented mitigation parity.
  - **How it fits this phase's scope:** It is the **first concrete `broken` row** the audit must inventory — see D-02 (status thresholds) and the decision below.
  - **Folded decision — option (b), pinned as first Phase 2 action item `02-01`:** Repoint the four affected files' deep imports at the `@scienium/shared-types` barrel export (NOT option (a) widening the alias). **Feasibility verified:** `packages/shared-types/src/index.ts` already does `export * from './pvp'` and `export * from './enums'`, so the barrel exposes exactly what the broken deep imports need — the fix is a pure import-path edit, no API/type changes. After repointing, `cd apps/web && npx tsc --noEmit` to confirm green. **⚠️ Applies in Phase 2, not Phase 1** — Phase 1 is report-only; option (b) must be recorded in the report's "Phase 2 Fix Scope" table as the **top / first `02-01` action item**, proposed-not-applied, contingent on user sign-off. AUDIT-05: the finding is reported, NOT fixed, in Phase 1.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-phase-researcher → gsd-planner → gsd-executor who runs the audit) MUST read these before planning or implementing.**

### The target being audited against
- `docs/SPEC.md` §11 — PvP Raid System target design (overview, design principles, spells, type system, raid flow, trophy system, matchmaking, technical impl §11.8, educational justification §11.9). The audit's §11 point labels (D-01 column 2) are drawn from this.
- `docs/SPEC.md` §14.1 — feature-unlock matrix + the phase-gate enforcement note (gate must be server-side via `assertFeatureUnlocked`, never client-only). The audit checks the PvP phase-gate row against this.
- `docs/SPEC.md` §11.6 / §18 — defender-trophy-loss open question (the audit records the deviation: resolved symmetric gain/loss for v1; this is a *deviation-with-closed-decision*, labeled `partial`, not a defect).

### Risk register & deferred work the audit cross-checks
- `.planning/codebase/CONCERNS.md` — risk register C-01…C-19. **C-01..C-04 are the PvP 🔴 risks this milestone closes** (C-01 no E2E, C-02 trophy-loss `TODO` stub = `broken` per D-02, C-03 inline constants = `partial`, C-04 derived names = `partial`). **C-11** ("Inconsistent shared-types imports") is the folded finding's documented smell — the alias-break is C-11 escalated to a compile fail. C-13 (no route-handler unit-test layer) explains why the combat engine is the testable extraction boundary (Phase 2 TEST-02).
- `docs/TODO.md` — deferred-work register (PvP prod-hardening that's out of scope for this milestone).
- `docs/SECURITY.md` — launch-gate / threat-model register (C-05/C-07, explicitly out of scope for this milestone; the audit must not propose those fixes).

### Codebase maps the auditor reads instead of re-mapping
- `.planning/codebase/STRUCTURE.md` — directory layout (the PvP surface to inventory: `lib/pvp/{combat-engine,spell-power}.ts`, `app/api/pvp/{route,[battleId]/action,spell-power}/`, `app/(dashboard)/pvp/`, schema `Pvp*` models, `packages/shared-types/src/pvp.ts`, `e2e/pvp.spec.ts` (absent)). Lines 248 + 272 note the deep `@/packages/shared-types/src/*` import smell — the folded finding's ground truth.
- `.planning/codebase/ARCHITECTURE.md` — layers + the `requireTeamContext` request flow (the audit checks PvP routes use `assertFeatureUnlocked` server-side) + the idempotency pattern ([[pvp_raid_quota]] on `team_id + date`).
- `.planning/codebase/CONVENTIONS.md` — the conventions the audit labels PvP against (strict zod, team-scoped IDOR 404, idempotency unique-constraints, server-authoritative, `@/` alias semantics).

### Plan & requirements sources
- `.planning/ROADMAP.md` — Phase 1 goal + the 5 success criteria + `Handoff` (hard review gate). Drives acceptance (AUDIT-01…05).
- `.planning/REQUIREMENTS.md` — `AUDIT-01` (file↔§11 inventory), `AUDIT-02` (canonical identified where duplicates), `AUDIT-03` (deviations both directions incl. Spell Power Meter + symmetric defender loss), `AUDIT-04` (spec-staleness + Spell-Power-Meter-absent flags, recommends exact spec correction — applied later via SPEC-01), `AUDIT-05` (report proposes, applies none; tree matches baseline at close).
- `.planning/PROJECT.md` — Constraints (no new libraries, server-authoritative engine, non-destructive raids, currency/idempotency safety) + Key Decisions the audit must honor (current code = source of truth; Spell Power Meter is a built §11-extension §11 omits; symmetric defender loss decided for v1).

### Fix-feasibility evidence (option b proof, for the Phase 2 fix-scope row)
- `packages/shared-types/src/index.ts` — barrel already re-exports `./pvp` and `./enums` (`export * from './pvp'`, `export * from './enums'`) → confirms repointing the 4 PvP files to `@scienium/shared-types` is a pure import-path edit.
- `apps/web/tsconfig.json:6` — the `"@/*": ["./*"]` map that can't reach monorepo-root `packages/` (root cause of the folded finding; NOT modified in Phase 1).
- `.planning/todos/pending/2026-07-20-pvp-audit-finding-apps-web-packages-alias-broken.md` — the full folded finding (evidence, affected files, pre-merge verification, both candidate fixes).

### Existing convention the audit cites for E2E-absence (C-01)
- `apps/web/e2e/F11.spec.ts` (and the `F<N>.spec.ts` convention) — the AC-→-test pattern every F1–F18 feature follows; `apps/web/e2e/pvp.spec.ts` is absent, which the audit inventory records as its own `broken` row (C-01) with the canonical-fix = match this convention (lands in Phase 2 TEST-01).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The existing `.planning/codebase/*.md` maps** (STRUCTURE/ARCHITECTURE/CONCERNS/CONVENTIONS/STACK/INTEGRATIONS/TESTING) are the audit's primary input — the auditor reads them rather than re-mapping the codebase. They already flag PvP as the riskiest area (CONCERNS C-01..C-04) and call out the deep-import smell (C-11). The audit's job is to take these *documented* risks, verify each against the live committed code, and promote them from "documented concern" to "labeled inventory row" with a proposed fix + target plan.
- **`packages/shared-types/src/index.ts` barrel** — enable for the folded fix: it already exports the two modules the broken deep imports need, so the Phase-2 repoint is zero-risk (no new exports to add).
- **The `e2e/F<N>.spec.ts` AC-→-test convention** — the reference pattern the audit cites for the absent `pvp.spec.ts` (C-01) and that Phase 2's TEST-01 will follow.

### Established Patterns (the audit labels PvP conformance against these)
- **Server-side phase-gate:** every team route goes through `requireTeamContext` → `assertFeatureUnlocked` (`lib/api/route-context.ts` + `lib/phase.ts`). Audit row for GATE-01 checks PvP routes 403 below the `working` phase via this, never client-only.
- **Strict zod parse** (`lib/validation.ts`) + **team-scoped IDOR 404** (membership-resolved `pickActiveTeam`) + **idempotency unique-constraints** ([[pvp_raid_quota]] on `team_id + date`). Audit checks the PvP routes honor these (currency-safety invariant for trophies).
- **Server-authoritative engine + non-destructive snapshot:** the audit's ENGINE rows check that the client streams casts only (`spell_id, x, y, client_ts`) and the defender's `team_shop_buildings` is never mutated (damage exists only in the raid instance).

### Integration Points
- **Report feeds Phase 2 directly:** `01-AUDIT-REPORT.md`'s "Phase 2 Fix Scope" approval table (D-04) is the artifact that un-gates Phase 2 — each approved row's `Target Plan` (e.g. option-b → `02-01`) becomes a Phase 2 plan item. The folded finding is the **top row** of that table.
- **No source integration in Phase 1:** the phase writes only under `.planning/` (the report + this context + the discussion log). No `apps/web/` or `packages/` files are touched — AUDIT-05 guard.

</code_context>

<specifics>
## Specific Ideas

- **The folded @/packages alias-break is the first concrete `broken` row** — explicitlyanchored: it's already verified (`tsc --noEmit` exit 1, 16 errors captured 2026-07-20, pre-merge), its label is `broken` (D-02), and its proposed fix (option b, repoint to barrel) is pinned as the **first `02-01` action item** in the "Phase 2 Fix Scope" table (D-04). The user's explicit requirement: this must land in the audit report, not just live in this session.
- **Spell Power Meter deviation gets its own treatment** (AUDIT-03): labeled per D-02 (likely `built` — it's live with 4 tiers ×0.5/×1.0/×1.5/×2.0 by task-count 0/1–2/3–4/5+, `team_daily_task_days`, UTC-midnight reset, raid fills/drains nothing) but flagged as a **spec-undocumented §11-extension** — the report recommends the exact §11 subsection to add (applied later via Phase 2 SPEC-01).
- **Symmetric defender loss is a deviation-with-closed-decision** (AUDIT-03): labeled `partial` per D-02 (it deviates from §11.6/§18 which left it open), recorded as resolved symmetric gain/loss for v1 (Key Decision already ✓ Decided). Not a defect to fix — a resolved deviation the spec update records.
- **§11 "not yet built" status block is stale** (AUDIT-04): the report flags it and recommends the exact spec correction (applied via Phase 2 SPEC-01, after the gaps it documents are closed — SPEC-01 is last in Phase 2 per the roadmap ordering note).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 (audit-report-method) scope. The audit's *content* findings (which files are broken/partial/duplicated) are uncovered work for the executor, not deferred ideas from this discussion.

### Reviewed Todos (not folded)
None — the one pending todo (the @/packages alias finding) was folded into scope (above), not deferred.

</deferred>

---

*Phase: 1-Verify-State Audit (Report Only)*
*Context gathered: 2026-07-20*
