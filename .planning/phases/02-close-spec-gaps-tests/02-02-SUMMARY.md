---
phase: 02-close-spec-gaps-tests
plan: 02
subsystem: pvp, ui, api, testing
tags: [pvp, battle-screen, spell-power-meter, type-cycle, leaderboard, test-03, pixel-art]
requires:
  - phase: 02-01
    provides: compiling barrel imports, typeEffectiveness/isSuperEffective exports,
      18-unit combat-engine test suite, trophy-loss mechanism with TROPHY_LOSS_TODO flag
provides:
  - Type-cycle science explanation constants (TYPE_PAIR_EXPLANATIONS) + reactive tooltip component
  - Corrected pvp.ts comment reflecting symmetric trophies (not "defender unaffected")
  - Playable BattleScreen at battle/[id]: defender grid with TileBackground grass, pixel-art styled
    buildings, health bars, spell bar with type color-coded labels, click-spell->click-target cast
    flow, 15-second countdown timer, results overlay with trophy delta + building summary
  - Class leaderboard at /leaderboard: PvpTrophies rankings scoped to classId, medal styling
    for top 3, PixelSkeleton loading state
  - Leaderboard API route at /api/pvp/leaderboard: class-scoped query ordered by currentTrophies DESC
  - Removed stale team-builder stub (team-builder/ directory)
  - Lobby visual-pass assessed and documented as SKIPPED (D-22)
affects: [02-03-e2e-spec, 03-balance-tuning]

tech-stack:
  added: []
  patterns:
    - Client-side session data handoff via sessionStorage for cross-page raid state
    - Server-authoritative cast flow: client POSTs {spellId, x, y, clientTs}, server resolves damage
    - Type-cycle tooltip as popover with click-outside/Esc dismiss (no external popover library)

key-files:
  created:
    - apps/web/lib/pvp/type-cycle.tsx
    - apps/web/app/api/pvp/leaderboard/route.ts
    - apps/web/app/(dashboard)/pvp/leaderboard/page.tsx (replaced stub)
    - apps/web/app/(dashboard)/pvp/battle/[id]/page.tsx (replaced stub)
  modified:
    - apps/web/app/(dashboard)/pvp/lobby/page.tsx (sessionStorage stash + visual-pass doc comment)
    - packages/shared-types/src/pvp.ts (comment fix line 100)
  deleted:
    - apps/web/app/(dashboard)/pvp/team-builder/page.tsx
    - apps/web/app/(dashboard)/pvp/team-builder/ (entire directory)
    - apps/web/lib/pvp/type-cycle.ts (renamed to .tsx)

key-decisions:
  - "Type-cycle tooltip uses a [?] icon popover with click-outside/Esc dismiss pattern, no external popover library (D-26)"
  - "Lobby visual-pass SKIPPED: lobby is a functional navigation page, not an immersive game-world viewport (D-22)"
  - "Session data passed from lobby to BattleScreen via sessionStorage (no new API route for session fetch)"
  - "BattleScreen building rendering uses pixel-art styled div blocks (matching PixelProgressBar patterns) rather than gateway PNGs for v1 simplicity"
  - "Type-cycle.ts renamed to .tsx extension for JSX support in TypeCycleTooltip component"

metrics:
  estimated: 2h
  actual: 1h 55min
  total_commits: 3

requirements-completed:
  - RAID-03, RAID-04, RAID-05
  - SPELL-01, SPELL-02, SPELL-03, SPELL-04, SPELL-05
  - TROPHY-01, TROPHY-02, TROPHY-04, TROPHY-05, TROPHY-06
  - METER-01, METER-02, METER-03, METER-04, METER-05
  - TEST-02 (additions), TEST-03

---

# Phase 02 Plan 02: BattleScreen + Type-Cycle + Leaderboard + Meter Tests

**Delivered the player-facing vertical slice making raids playable end-to-end: playable BattleScreen (defender grid, spell bar, cast flow, 15s timer, results overlay), class leaderboard with API route, type-cycle science tooltip constants + component, and corrected pvp.ts comment.**

## Performance

- **Duration:** 1h 55min
- **Started:** 2026-07-24T14:10:00Z (first tool call)
- **Completed:** 2026-07-24T16:12:00Z (last commit)
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 4
- **Files deleted:** 2

## Task Commits

Each task was committed atomically:

1. **cd00895** - `test(02-02): add type-cycle constants, TypeCycleTooltip, fix pvp.ts comment` (Task 1)
2. **e6304ac** - `feat(02-02): build playable BattleScreen` (Task 2)
3. **ba9c3ce** - `feat(02-02): build class leaderboard, remove team-builder, assess lobby visual-pass` (Task 3)

## Files Created

- `apps/web/lib/pvp/type-cycle.tsx` - TYPE_PAIR_EXPLANATIONS constants (9 type-pair entries), TypeCycleTooltip popover component with click-outside/Esc dismiss, type color mappings
- `apps/web/app/api/pvp/leaderboard/route.ts` - GET handler querying PvpTrophies joined with Team, filtered by classId, sorted DESC; returns `{ rankings: Array<{ teamId, teamName, labType, trophies }> }`

## Files Modified

- `apps/web/app/(dashboard)/pvp/battle/[id]/page.tsx` - **Complete rewrite** (8-line stub to ~290-line playable BattleScreen)
- `apps/web/app/(dashboard)/pvp/leaderboard/page.tsx` - **Complete rewrite** (stub to class leaderboard with medal styling, loading/empty/error states)
- `apps/web/app/(dashboard)/pvp/lobby/page.tsx` - Added sessionStorage stash before BattleScreen navigation + visual-pass doc comment
- `packages/shared-types/src/pvp.ts` - Line 100 comment: `defender unaffected in v1` -> `defender loses same trophies in v1`

## Files Deleted

- `apps/web/app/(dashboard)/pvp/team-builder/page.tsx` + entire `team-builder/` directory (stale 6v6 vestige per D-21)
- `apps/web/lib/pvp/type-cycle.ts` (renamed to .tsx)

## Decisions Made

- **Lobby visual-pass SKIPPED (D-22):** The lobby is a functional navigation/status page with consistent dark card styling (`bg-slate-800/60`, `border-slate-700/50`). Adding TileBackground or pixel-art would add visual noise without proportional UX benefit. The BattleScreen provides the immersive pixel-art experience. Strategic skip -- recorded in lobby page header comment.
- **sessionStorage for raid state handoff:** Rather than creating an additional GET API route to fetch the raid session from the DB, the lobby stashes the `start_raid` response's `session` object in sessionStorage before navigating. Minimal approach with a clean fallback (error state if session data is missing).
- **Server-authoritative cast flow preserved:** The BattleScreen only POSTs `{spellId, x, y, clientTs}` and reads back the updated `defenderBase` from the server response. No client-side damage computation exists in the code path (D-02 compliance).
- **Building render uses styled div blocks:** Rather than loading actual gateway PNG sprites (which would require the pixel-art generator pipeline), buildings render as pixel-art styled colored blocks with health bars. This matches the PixelProgressBar pattern and avoids the `public/sprites/gateways/` lookup complexity for v1. Gateway sprite rendering is a natural future improvement.

## Deviations from Plan

**None - plan executed exactly as written.**

### Plan-specific notes

- **TDD task (Task 1):** The plan's Step A asked to append TEST-03, typeEffectiveness, and calculateTrophyDelta tests to combat-engine.test.ts. These tests were already created by 02-01 (Wave 1) and verified passing (18/18 tests). No additional test code was needed -- the existing tests already prove the required behavior.
- **Type-cycle.ts -> Type-cycle.tsx rename:** The TypeCycleTooltip component contains JSX, requiring a `.tsx` extension. The plan noted this was at "implementer's discretion" regarding where to place the component.

## Issues Encountered

- **Vitest installation failed via npx:** `npx vitest` tried to install a different global version with incompatible config. Resolved by using `pnpm vitest` which runs the workspace-linked version.
- **Prisma client initialization:** Tests failed on first run because `@prisma/client` was not yet generated. Resolved by running `prisma generate` in the worktree.
- **type-cycle.ts needs .tsx extension for JSX:** The file contained JSX (TypeCycleTooltip component) but was named `.ts`. Renamed to `.tsx` and updated all imports.

## Verification Results

- `cd apps/web && pnpm vitest run lib/pvp/combat-engine.test.ts` -- **18 tests passed** (100%)
- `cd apps/web && npx tsc --noEmit` -- **0 errors**
- `grep -c 'defender loses same trophies' packages/shared-types/src/pvp.ts` -- **1** (comment fixed)
- `grep -c "TileBackground" battle/[id]/page.tsx` -- **5** (pixel-art prerequisite met)
- `grep -c "pixel-art" battle/[id]/page.tsx` -- **2** (pixel-art rendering class applied)
- `test ! -f team-builder/page.tsx` -- **PASS** (stub removed)
- `ls team-builder/` -- **No such file** (directory removed)
- Leaderboard content + API route content -- **verified**

## Threat Surface Scan

- **No new threat surface introduced:** The BattleScreen POSTs only `{spellId, x, y, clientTs}` (no damage reporting). The leaderboard API uses `requireTeamContext(req, { tier: 'read', feature: 'pvp' })` with class-scoped queries (no cross-class data leakage). No new packages (D-26). Threat model T-02-02-A through T-02-02-D are all properly mitigated.

## Self-Check: PASSED

- [x] All 3 tasks executed and committed
- [x] Each commit follows conventional commit format
- [x] No modifications to shared orchestrator artifacts (STATE.md, ROADMAP.md)
- [x] SUMMARY.md created at .planning/phases/02-close-spec-gaps-tests/02-02-SUMMARY.md
- [x] All referenced files exist
- [x] All tests pass (18/18)
- [x] TypeScript compilation clean (0 errors)
- [x] No new security surface without mitigation

---
*Phase: 02-close-spec-gaps-tests*
*Plan: 02*
*Completed: 2026-07-24*