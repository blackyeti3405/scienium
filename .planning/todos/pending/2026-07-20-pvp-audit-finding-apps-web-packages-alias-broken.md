---
created: 2026-07-20T05:53:23.958Z
title: "PvP audit finding: apps/web @/packages/* alias resolution broken (tsc --noEmit fails)"
area: api
phase: 1
kind: audit-finding-input
files:
  - apps/web/tsconfig.json:6
  - apps/web/app/api/pvp/route.ts:26
  - apps/web/app/api/pvp/[battleId]/action/route.ts:33
  - apps/web/lib/pvp/combat-engine.ts:3
  - apps/web/lib/pvp/spell-power.ts:2
---

## Status

**VERIFIED pre-merge on 2026-07-20.** This is a pre-verified **Phase 1 audit finding** — an input to the Verify-State Audit report (Phase 1), not a fix task. The audit must inventory this as a concrete **"broken"** item and carry the recommended fix into Phase 2.

**Constraint (read before any fix):** Phase 1 is **report-only — NO code changes.** Do **not** apply any fix in Phase 1. The recommended fix (below) is the **first Phase 2 action item** (Plan **02-01**), after the user signs off on the audit report.

## Problem

`cd apps/web && npx tsc --noEmit` **FAILS — exit 1, 16 errors** on the merged branch (merge commit `7f67a12`, HEAD of `matthew/pvp-system`). This is the first hard "broken" the Phase 1 Verify-State Audit must report.

**Root cause — module resolution:** `apps/web/tsconfig.json` maps only `"@/*": ["./*"]` (= `apps/web/*`). Four PvP files deep-import into the `@scienium/shared-types` package source via the `@/*` alias:

- `@/packages/shared-types/src/pvp`
- `@/packages/shared-types/src/enums`

Those resolve to `apps/web/packages/shared-types/src/{pvp,enums}` — **nonexistent** (the real files are `packages/shared-types/src/pvp.ts` and `packages/shared-types/src/enums.ts` at the **monorepo root**, outside the `@/*` alias reach).

**Full tsc error set (16):**
- `TS2307 Cannot find module '@/packages/shared-types/src/pvp'` — 3 occurrences
  (`app/api/pvp/[battleId]/action/route.ts:33`, `app/api/pvp/route.ts:27`, `lib/pvp/combat-engine.ts:11`, `lib/pvp/spell-power.ts:2`)
- `TS2307 Cannot find module '@/packages/shared-types/src/enums'` — 3 occurrences
  (`app/api/pvp/route.ts:26`, `lib/pvp/combat-engine.ts:3`)
- `TS7006 Parameter '...' implicitly has an 'any' type` — 10 occurrences, **all downstream** of the failed imports (`.reduce`/`.map` callbacks whose element types would have come from `@scienium/shared-types/src/pvp`; they collapse to `any` once the module doesn't resolve).
  - `app/api/pvp/[battleId]/action/route.ts` lines 158, 185(x2), 189(x2)
  - `lib/pvp/combat-engine.ts` lines 138, 206(x2), 210(x2)

**Affected files (4):**
- `apps/web/app/api/pvp/route.ts`
- `apps/web/app/api/pvp/[battleId]/action/route.ts`
- `apps/web/lib/pvp/combat-engine.ts`
- `apps/web/lib/pvp/spell-power.ts`

## Evidence — NOT merge-induced (pre-existing on matthew/pvp-system)

1. `git diff 60ce1db HEAD -- apps/web/tsconfig.json` → **empty**. The merge left the tsconfig identical to the pre-merge pvp-branch tip (`60ce1db`). The alias config that can't reach `packages/` was already there.
2. `git show --stat 7f67a12` filtered to `app/api/pvp*` and `lib/pvp/*` → **none**. Merge commit `7f67a12` touched zero PvP TS source (it brought art/sprite JSONs, `.claude/` pixel-art + codex pipeline docs, and a 5-line `apps/web/package.json` reorder — nothing affecting `@/*` alias resolution).
3. The failing `@/packages/shared-types/src/{pvp,enums}` import lines **pre-exist at `60ce1db`** (pre-merge pvp-branch tip) in all four affected files (counts 2/2/1/1 = the 6 TS2307 errors). Verified by `git show 60ce1db:<file> | grep`.

**Conclusion:** the `apps/web` typecheck was already failing on `matthew/pvp-system` **before** the merge. The merge (re-confirmed clean + complete) is not implicated. This matches the milestone premise — untracked sessions left PvP mid-build, and the Phase 1 audit has not yet inventoried what's broken.

## Solution

**Recommended fix — OPTION (b): repoint the 4 PvP files' deep imports at the `@scienium/shared-types` barrel export.** Then `cd apps/web && npx tsc --noEmit` to confirm green. (Option (a), adding `"@/packages/*": ["../packages/*"]` to `apps/web/tsconfig.json`, also clears tsc but widens the alias surface and keeps the "deep-import bypasses the barrel" inconsistency CLAUDE.md already flags; the barrel import is canonical.)

**Option (b) feasibility — VERIFIED:** `packages/shared-types/src/index.ts` already re-exports both modules:
```ts
export * from './enums'
export * from './paper'
export * from './pvp'
```
So everything the broken deep imports need is available from `@scienium/shared-types` today. Repointing is a pure import-path edit, no API/type changes.

**⚠️ Applies in Phase 2, not Phase 1.** Per the milestone's hard review gate: Phase 1 produces the report only; the user directs fix scope before any fix lands. This todo's recommended fix (option b) is the **first Phase 2 action item (Plan 02-01)**, contingent on user sign-off on the audit report.

## Audit report must-dos

When the Phase 1 Verify-State Audit runs, it must:
1. List this as a concrete **broken** item (status label: `broken`) under the combat-engine / PvP-routes section of the inventory.
2. Record that it is **pre-existing on `matthew/pvp-system`**, not a merge regression (with the three-point evidence above).
3. Propose fix **option (b)** as the recommended remediation, and flag it as the **first Phase 2 action item (Plan 02-01)** — *proposed, not applied* (Phase 1 = no code diff).
4. Confirm the working tree's PvP source matches the branch baseline at Phase 1 close (AUDIT-05 guard) — i.e. this finding is reported, **not** fixed, in Phase 1.
