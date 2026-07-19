# Roadmap: scienium — Finish PvP Raid System

## Overview

This roadmap finishes the §11 PvP Raid System mid-built on branch `matthew/pvp-system`, in three coarse, vertically-verifiable phases: (1) a verify-state audit that produces a written inventory of what's built / broken / partial / duplicated against spec §11 — report only, no code changes, with a hard user-review gate before any fixing begins; (2) close every spec gap the audit surfaces and prove them with an E2E spec + combat-engine unit tests, then update §11 to match shipped reality; (3) balance tuning — decide and tune the trophy-loss curve, flip the `TROPHY_LOSS_TODO` stub to false, and externalize all PvP tuning constants into one `lib/pvp` block so the loss curve is tunable without a deploy. The student-facing core (features F1–F18) is validated and out of scope; every phase deliverable is verifiable by a reviewer (an artifact or a green test run), not a horizontal layer.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Verify-State Audit (Report Only)** - A written PvP inventory + deviation report mapped against spec §11, with a hard user-review gate before any fix lands; no code changes.
- [ ] **Phase 2: Close Spec Gaps + Tests** - Spec-complete, server-authoritative, phase-gated, non-destructive PvP proven by E2E + unit tests, with §11 updated to match shipped reality; hard-blocked on Phase 1's user sign-off.
- [ ] **Phase 3: Balance Tuning** - Decided, tuned trophy-loss curve (`TROPHY_LOSS_TODO=false`) and all PvP tuning constants externalized to one `lib/pvp` block, tunable without a deploy.

## Phase Details

### Phase 1: Verify-State Audit (Report Only)
**Goal**: A reviewer can read a single markdown report that tells them the truth of what PvP code is built on the committed branch — what's built, broken, partial, or duplicated — where it deviates from spec §11 in either direction, what the spec itself needs corrected, and proposed (unapplied) fixes — and the user has directed fix scope so Phase 2 knows what to close.
**Mode:** mvp
**Depends on**: Nothing (first phase); ends with a hard user-review gate (see Handoff).
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria** (what must be TRUE):
  1. A markdown report exists under `.planning/` mapping every committed PvP file / route / component to a spec §11 point, each labeled built / broken / partial / duplicated, with the canonical implementation identified where duplicates exist (AUDIT-01, AUDIT-02).
  2. For every §11 design point the code deviates from — in either direction — the deviation and its reason are reported; the report explicitly covers the Spell Power Meter (built, spec-undocumented) and symmetric defender-trophy loss (§11.6/§18 open, now closed symmetric for v1) (AUDIT-03).
  3. The report flags that spec §11's "not yet built" status block is stale and that the Spell Power Meter is absent from §11, and recommends the exact spec correction — to be applied later via SPEC-01, not in this phase (AUDIT-04).
  4. The report proposes fixes but applies none — no committed-code diff lands in Phase 1; the working tree's PvP source matches the branch baseline at phase close (AUDIT-05).
  5. The user has reviewed the report and recorded sign-off / fix-scope direction, so Phase 2's scope is directed (not assumed) before any fix begins.
**Plans**: 1 plan
**UI hint**: no

**Handoff (hard review gate):** Phase 1 is "done" when the report exists AND the user has reviewed it and directed fix scope. Phase 2 is hard-blocked on this sign-off — not merely on Phase 1 "completing".

Plans:
- [ ] 01-01: Build the written PvP inventory + deviation report — every committed PvP file/route/component mapped to a §11 point (built/broken/partial/duplicated; canonical impl identified where duplicates exist), deviations both directions (incl. Spell Power Meter + symmetric defender loss), spec-staleness + Spell-Power-Meter-absent flags, and proposed-but-unapplied fixes; no code changes.

### Phase 2: Close Spec Gaps + Tests
**Goal**: A reviewer can run a `working`-phase raid end-to-end against a server-authoritative, phase-gated, non-destructive engine that honors the Spell Power Meter, see green E2E + combat-engine unit tests covering every §11 acceptance criterion, and read an updated spec §11 that matches the shipped code.
**Mode:** mvp
**Depends on**: Phase 1 — AND explicit user sign-off on the audit report's fix scope (hard review gate; Phase 2 does not begin until the user directs fix scope).
**Requirements**: RAID-01, RAID-02, RAID-03, RAID-04, RAID-05, RAID-06, SPELL-01, SPELL-02, SPELL-03, SPELL-04, SPELL-05, TROPHY-01, TROPHY-02, TROPHY-03, TROPHY-04, TROPHY-05, TROPHY-06, ENGINE-01, ENGINE-02, ENGINE-03, ENGINE-04, ENGINE-05, GATE-01, GATE-02, METER-01, METER-02, METER-03, METER-04, METER-05, TEST-01, TEST-02, TEST-03, SPEC-01
**Success Criteria** (what must be TRUE):
  1. A `working`-phase student can run a full raid end-to-end — press Raid, match against a random eligible base (same class, `working`+ phase, never their own team, defender has a placed base), refind up to cap excluding already-shown bases, cast spells (click spell → click target, cooldown-enforced) inside a server-enforced 15-second window, and see a results screen with percent destroyed + trophy change; spell/building display names come from catalog rows and the type-cycle science explanations surface in-game (RAID-01..06, GATE-02).
  2. The raid engine is server-authoritative and non-destructive: the client streams cast events only (`spell_id, x, y, client_ts`), AOE damage is resolved server-side against a read-only defender snapshot, defender rows are never mutated, the server validates the 15s window + cooldown spacing, and `raid_log_json` stores the cast sequence (ENGINE-01..05).
  3. The spell / type / trophy / meter systems are spec-complete: spells 1:1 with economy buildings (level-tracking, type-bearing, circular-AOE identical in v1) with 2× / 0.5× / 1× type-effectiveness multipliers; trophy gain scales proportionally (rounded up, capped at 10 for 100% destruction), low-destruction raids incur a loss, trophies are ranking-only, daily raid+refind quotas enforce with no rollover, and the defender loses the same trophyDelta the attacker gains (symmetric v1); the team-scoped Spell Power Meter (4 tiers ×0.5 / ×1.0 / ×1.5 / ×2.0, UTC-midnight reset, raid fills/drains nothing) multiplies all attacker spell damage for the rest of the day (SPELL-01..05, TROPHY-01..06, METER-01..05).
  4. PvP routes return 403 for teams below the `working` phase via `assertFeatureUnlocked` from `lib/phase.ts` (server-side; never client-only gating) (GATE-01).
  5. Verification is green and the spec matches reality: `apps/web/e2e/pvp.spec.ts` covers every §11 acceptance criterion (F1–F18 parity), `apps/web/lib/pvp/combat-engine.test.ts` unit-covers `resolveCast` / `typeEffectiveness` / trophy math — including a test proving `resolveCast` multiplies by the attacker's **live** Spell Power multiplier (via `getSpellPower` / `resolveSpellPowerMultiplier`) across all four tiers, not a hardcoded constant (TEST-03) — and `docs/SPEC.md` §11 is updated to shipped reality: stale "not yet built" status corrected, Spell Power Meter subsection added (tiers + multipliers + reset + no-drain), and the §11.6/§18 defender-loss open question recorded as resolved to symmetric gain/loss for v1 (TEST-01, TEST-02, TEST-03, SPEC-01 — the spec update lands last, after the gaps it documents are closed).
**Plans**: 3 plans
**UI hint**: yes

**Ordering note:** SPEC-01 (the §11 doc update) is the last work in this phase — it documents what the gap-closing + tests landed, so it must follow them, not precede. (TROPHY-03's loss *mechanism* — a low-destruction raid causes a loss scaled inversely — lands here behind the `TROPHY_LOSS_TODO` stub; the *tuned values* replacing that stub are Phase 3's TUNE-01.)

Plans:
- [ ] 02-01: Close engine + matchmaking + gate + raid-flow + display-name gaps (server-authoritative `resolveCast`, read-only defender snapshot, 15s window + cooldown validation, `raid_log_json`, matchmaking / refind / quota, phase-gate 403, no-base guard, catalog display names) + combat-engine unit tests for `resolveCast` / `typeEffectiveness` / trophy math (TEST-02 part).
- [ ] 02-02: Close spell + type + trophy + Spell Power Meter gaps (spells 1:1 + level/type, circular-AOE type-effectiveness multipliers, in-game type-cycle science explanations, proportional trophy gain + low-destruction loss + symmetric defender loss + ranking-only + daily quotas, team-scoped Spell Power Meter 4 tiers applied to all attacker spell damage) + the end-to-end meter unit test proving `resolveCast` uses the live multiplier across all four tiers (TEST-03).
- [ ] 02-03: Write `apps/web/e2e/pvp.spec.ts` covering every §11 acceptance criterion (F1–F18 parity) (TEST-01), then update `docs/SPEC.md` §11 to shipped reality — stale status corrected, Spell Power Meter subsection added, defender-loss recorded as symmetric gain/loss for v1 (SPEC-01; lands last).

### Phase 3: Balance Tuning
**Goal**: A reviewer can confirm the trophy-loss curve is decided and tuned (the `TROPHY_LOSS_TODO` stub replaced and flipped to `false`), all PvP tuning constants live in one `lib/pvp` constants block, and the trophy-loss threshold / scaling are tunable without a code deploy.
**Mode:** mvp
**Depends on**: Phase 2 (the proven, spec-complete PvP exists; the loss mechanism lands in Phase 2 behind the `TROPHY_LOSS_TODO` stub, tuned here).
**Requirements**: TUNE-01, TUNE-02, TUNE-03
**Success Criteria** (what must be TRUE):
  1. The `TROPHY_LOSS_TODO` flag in `lib/pvp/combat-engine.ts` is `false` and the placeholder stub is replaced by a decided, tuned trophy-loss threshold + scaling formula, with a unit test (mirroring `lib/shop.test.ts`) covering the loss curve (TUNE-01).
  2. All PvP tuning constants (`MAX_RAIDS_PER_DAY`, `MAX_REFINDS_PER_DAY`, spell damage / radius / cooldown scalars, and the trophy-loss threshold + scaling) live in the single `lib/pvp` constants block next to the existing `SPELL_*` constants — removed from inline `app/api/pvp/route.ts` (TUNE-02, TUNE-03).
  3. The trophy-loss threshold and scaling can be changed in one location (the constants block) without touching route or engine logic — verified by the loss unit test still passing after a constants edit (the "tunable without a deploy" check) (TUNE-03).
**Plans**: 2 plans
**UI hint**: no

Plans:
- [ ] 03-01: Decide and implement the tuned trophy-loss threshold + scaling formula; flip `TROPHY_LOSS_TODO=false`; expose the loss constants in the `lib/pvp` constants block; add the loss-curve unit test (TUNE-01, TUNE-03).
- [ ] 03-02: Externalize the remaining inline PvP tuning constants (`MAX_RAIDS_PER_DAY`, `MAX_REFINDS_PER_DAY`, spell damage / radius / cooldown scalars) from `app/api/pvp/route.ts` into the single `lib/pvp` constants block, beside the existing `SPELL_*` constants (TUNE-02).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3. Phase 2 is hard-gated on the user's sign-off of Phase 1's audit report (not just Phase 1 completing); Phase 3 follows Phase 2 once the proven PvP exists.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Verify-State Audit (Report Only) | 0/1 | Not started | - |
| 2. Close Spec Gaps + Tests | 0/3 | Not started (blocked on Phase 1 review gate) | - |
| 3. Balance Tuning | 0/2 | Not started | - |

---
*Milestone: Finish PvP Raid System. Roadmap created 2026-07-19. 41/41 v1 requirements mapped across 3 phases (5 + 33 + 3).*
