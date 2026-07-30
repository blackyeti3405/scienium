# Requirements: scienium — Finish PvP Raid System

**Defined:** 2026-07-19
**Core Value:** Ship a finished, verified, and balanced PvP raid system students can use to raid each other — grounded truth of what's built, completed to spec §11, proven by tests, tuned so losing trophies feels fair.

**Scope:** This milestone finishes the §11 PvP Raid System mid-built on `matthew/pvp-system`. MVP-style vertical phases: (1) verify-state audit, (2) close spec gaps + tests, (3) balance tuning. Brownfield — the student-facing core (F1–F18) is validated and out of scope.

**Grounding:** Per-spec ref is `docs/SPEC.md` §11. The spec's §11 status block ("not yet built") is stale; current committed code is treated as the source of truth (see AUDIT-04 / SPEC-01). Spell Power Meter constants below are read from `apps/web/lib/pvp/spell-power.ts` (built, undocumented in §11).

---

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Audit (verify-state pass — report only, no fixes)

- [ ] **AUDIT-01**: A written PvP inventory maps every built PvP file / route / component against spec §11, each labeled built / broken / partial / duplicated, with the canonical implementation identified where duplicates exist
- [ ] **AUDIT-02**: Duplicated or competing implementations left by loose untracked sessions are identified; the canonical one is recommended (no code changed in this phase)
- [ ] **AUDIT-03**: For every §11 design point the implementation deviates from — in either direction — the deviation and its reason are reported; deviations surfaced include the Spell Power Meter (built, spec-undocumented) and symmetric defender-trophy loss (§18 open, now closed)
- [ ] **AUDIT-04**: The report flags that spec §11's status block is stale ("not yet built") and that the Spell Power Meter is absent from §11, and recommends the spec correction (correction is applied later, via SPEC-01, after fix scope is directed — audit applies none)
- [ ] **AUDIT-05**: The report *proposes* fixes but applies none; the user directs fix scope before any change lands

### Raid (§11.5 raid flow, §11.7 matchmaking)

- [ ] **RAID-01**: A `working`-phase student presses Raid and is matched against a random opponent base (same class, `working`+ phase, never their own team)
- [ ] **RAID-02**: A student can "refind" to reroll into a different base, excluding already-shown bases, up to a per-session/per-day cap
- [ ] **RAID-03**: A raid is time-boxed to 15 seconds; the server (not client) enforces the window
- [ ] **RAID-04**: A student casts by clicking a chosen spell then a target location; spells may be cast repeatedly on an enforced cooldown
- [ ] **RAID-05**: At raid end a results screen shows the percentage of the base destroyed and the trophy change
- [ ] **RAID-06**: Spell and building display names in the raid HUD and PvP lobby come from the catalog rows, not derived from key strings (C-04)

### Spell (§11.3 spells, §11.4 type system)

- [ ] **SPELL-01**: One spell per economy building (1:1); a spell's level tracks its building's level (1–15), strength scaling with level
- [ ] **SPELL-02**: Each spell carries its building's research type — Empirical, Theoretical, or Applied
- [ ] **SPELL-03**: A spell is a circular AOE dealing instant damage to every building within its radius at the target (v1: all spells share identical damage behavior)
- [ ] **SPELL-04**: Type effectiveness is a damage multiplier — 2× super-effective, 0.5× resisted, 1× neutral
- [ ] **SPELL-05**: The type cycle's one-line science explanations (Empirical→Theoretical→Applied→Empirical) are surfaced in-game in the raid HUD and PvP lobby

### Trophy (§11.6 trophy system)

- [ ] **TROPHY-01**: Percent destroyed is computed over the defender's total base health, including partial building damage
- [ ] **TROPHY-02**: Trophy gain scales proportionally with percent destroyed, rounded up, capped at 10 for 100% destruction
- [ ] **TROPHY-03**: A low-destruction raid (≤ a tunable threshold) results in a trophy loss for the attacker; the lower the destruction, the larger the penalty (mechanism designed in Phase 2; tuned values in TUNE)
- [ ] **TROPHY-04**: Trophies are ranking-only — a class leaderboard; never convertible to KP/LC or unlocks
- [ ] **TROPHY-05**: Daily raid + refind quotas per team are enforced with no rollover and no way to earn more
- [ ] **TROPHY-06**: When a defender's base is raided, the defender loses the same trophyDelta the attacker gains — symmetric gain/loss for v1 (officially resolves spec §11.6/§18 open question; revisit in v2 if balancing demands asymmetric)

### Engine (§11.8 technical implementation)

- [ ] **ENGINE-01**: The client only streams cast events (`spell_id, x, y, client_ts`); AOE damage is resolved server-side — the client never reports damage
- [ ] **ENGINE-02**: The defender's base is a read-only snapshot of `team_shop_buildings` (+ gateway layouts); defender rows are never mutated — damage exists only inside the raid instance
- [ ] **ENGINE-03**: The server validates the 15-second raid window and cooldown spacing between casts
- [ ] **ENGINE-04**: `raid_log_json` stores the cast sequence for replay/dispute purposes
- [ ] **ENGINE-05**: AOE resolution matches spec — instant damage to every building within radius; partial damage counts

### Gate (§11.2 design principles, §14.1 feature unlock matrix)

- [ ] **GATE-01**: PvP routes return 403 for teams below the `working` phase via `assertFeatureUnlocked` from `lib/phase.ts` (server-side; never client-only gating)
- [ ] **GATE-02**: A team with no placed base cannot match into a raid as attacker or defender

### Meter (Spell Power Meter — built §11-extension; verify + test)

- [ ] **METER-01**: Daily pillar task completions increment a **team-scoped** counter (`team_daily_task_days.tasks_completed`, unique key `teamId + date`) — team, not per-member
- [ ] **METER-02**: The counter maps to 4 tiers with damage multipliers — **NONE** (Dormant, 0 tasks, ×0.5) / **BASE** (Active, 1–2 tasks, ×1.0) / **BOOSTED** (Charged, 3–4 tasks, ×1.5) / **MAX** (Overcharged, 5+ tasks, ×2.0)
- [ ] **METER-03**: The active tier's multiplier applies to **all** the attacker's spell damage for the rest of the day
- [ ] **METER-04**: The counter resets at UTC midnight (a new day with no row → NONE / ×0.5); the US-classroom UTC-day-boundary edge (CONCERNS C-18) is known and explicitly deferred to v2, not fixed in this milestone
- [ ] **METER-05**: Raiding neither fills nor drains the meter — only daily pillar tasks increment it; the combat engine never touches `team_daily_task_days`

### Test (verification — C-01, C-13)

- [ ] **TEST-01**: `apps/web/e2e/pvp.spec.ts` (or equivalent) covers every §11 acceptance criterion, matching the F1–F18 spec-AC-→-test convention
- [ ] **TEST-02**: `apps/web/lib/pvp/combat-engine.test.ts` unit-covers `resolveCast`, `typeEffectiveness`, and trophy math, mirroring `lib/shop.test.ts`
- [ ] **TEST-03**: A unit test confirms `resolveCast` multiplies `spell.damage` by the passed `powerMultiplier` across all four tiers (×0.5 / ×1.0 / ×1.5 / ×2.0), **and** that the raid action route passes the attacker's **live** Spell Power multiplier (via `getSpellPower` / `resolveSpellPowerMultiplier`) rather than a hardcoded constant — proving the meter is applied end-to-end, not merely a type sitting in `shared-types`

### Tune (balancing — C-02, C-03)

- [ ] **TUNE-01**: The trophy-loss threshold and loss-scaling formula are decided and replace the `TROPHY_LOSS_TODO` placeholder stub in `lib/pvp/combat-engine.ts` (with `TROPHY_LOSS_TODO` flipped to `false`)
- [ ] **TUNE-02**: PvP tuning constants (`MAX_RAIDS_PER_DAY`, `MAX_REFINDS_PER_DAY`, spell damage / radius / cooldown scalars) are externalized from inline `app/api/pvp/route.ts` into the `lib/pvp` constants block, matching the existing `SPELL_*` constant placement
- [ ] **TUNE-03**: The trophy-loss threshold and scaling are tunable without a code deploy — exposed as named constants in the single `lib/pvp` constants block (one location to change)

### Spec (documentation fidelity — applied after fix scope is directed)

- [ ] **SPEC-01**: `docs/SPEC.md` §11 is updated to reflect committed reality: the stale "not yet built" status block is corrected, the Spell Power Meter is documented as a new subsection (tiers + multipliers + reset + no-drain), and the §11.6/§18 defender-trophy-loss open question is recorded as resolved to symmetric gain/loss for v1

---

## v2 Requirements

Deferred to a future release. Tracked, not in this roadmap.

### PvP Extensions

- **PVPEXT-01**: Differentiated per-type / per-building spell effects (§18 brainstorm) — replaces v1's identical-AOE spells
- **PVPEXT-02**: Loadout size > 1 (tunable; v1 baseline is one chosen spell per raid)
- **PVPEXT-03**: Raid replay UI rendering `raid_log_json`
- **PVPEXT-04**: PvP prestige cosmetics for teams placing at higher-level competitions
- **PVPEXT-05**: Spell evolutions / further building-spell depth

### PvP Balancing (post-pilot)

- **BAL-01**: Revisit symmetric defender-trophy loss (TROPHY-06) if live balancing data suggests asymmetric gain/loss is healthier for the class leaderboard
- **BAL-02**: Replace UTC-midnight reset (METER-04 + daily caps) with student-local timezone reset (C-18)
- **BAL-03**: Spell/raid balance tuning revisited against pilot play data (loss curve, daily caps, refind caps)

---

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|-------|
| PvP prod-hardening (battle `[battleId]` IDOR sweep, AI-route Upstash rate-limit enforcement, prompt-injection on `raid_log_json`) | Folds into the app-wide launch-gate milestone (CONCERNS C-07), deliberately not selected for this milestone's bar |
| App-wide production launch (dedicated prod Supabase/Clerk, Vercel project, `scienium.app` deploy, FERPA/COPPA + school-consent, branch protection, alerting) | Separate future milestone (CONCERNS C-05/C-07) |
| `nova-lab` → `scienium` rebrand in Clerk app name + R2 bucket | Ops task (CONCERNS C-06), not PvP scope |
| Legacy `Paper.pdfData` retirement | App-wide `docs/TODO.md` item (C-08), confirmed-safe-locally but deferred until prod DB exists |
| Real Google Drive OAuth for Research Plan | App-wide `docs/TODO.md` item (C-09), paste-a-link fallback stands |
| Science-fair dataset precision (true ZIP-centroid, confirmed dates) | App-wide `docs/TODO.md` item (C-10) |
| Combat-handler route-level unit-test layer (supertest-style isolation from DB) | Architectural improvement (C-13); the *engine* unit-test layer (TEST-02) is what this milestone covers — route handlers stay E2E-tested |
| UTC → local-timezone reset for daily caps / Spell Power Meter | Known US-classroom edge (C-18); explicitly deferred to v2 (BAL-02), not fixed here |
| New PvP features beyond §11 (spell evolutions, defender-base layout editor, prestige) | §18 brainstorm and beyond (see v2) |

---

## Traceability

Which phases cover which requirements. Populated during roadmap creation (Step 8).

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUDIT-01 | Phase 1 | Pending |
| AUDIT-02 | Phase 1 | Pending |
| AUDIT-03 | Phase 1 | Pending |
| AUDIT-04 | Phase 1 | Pending |
| AUDIT-05 | Phase 1 | Pending |
| RAID-01 | Phase 2 | Pending |
| RAID-02 | Phase 2 | Pending |
| RAID-03 | Phase 2 | Pending |
| RAID-04 | Phase 2 | Pending |
| RAID-05 | Phase 2 | Pending |
| RAID-06 | Phase 2 | Pending |
| SPELL-01 | Phase 2 | Pending |
| SPELL-02 | Phase 2 | Pending |
| SPELL-03 | Phase 2 | Pending |
| SPELL-04 | Phase 2 | Pending |
| SPELL-05 | Phase 2 | Pending |
| TROPHY-01 | Phase 2 | Pending |
| TROPHY-02 | Phase 2 | Pending |
| TROPHY-03 | Phase 2 | Pending |
| TROPHY-04 | Phase 2 | Pending |
| TROPHY-05 | Phase 2 | Pending |
| TROPHY-06 | Phase 2 | Pending |
| ENGINE-01 | Phase 2 | Pending |
| ENGINE-02 | Phase 2 | Pending |
| ENGINE-03 | Phase 2 | Pending |
| ENGINE-04 | Phase 2 | Pending |
| ENGINE-05 | Phase 2 | Pending |
| GATE-01 | Phase 2 | Pending |
| GATE-02 | Phase 2 | Pending |
| METER-01 | Phase 2 | Pending |
| METER-02 | Phase 2 | Pending |
| METER-03 | Phase 2 | Pending |
| METER-04 | Phase 2 | Pending |
| METER-05 | Phase 2 | Pending |
| TEST-01 | Phase 2 | Pending |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 2 | Pending |
| SPEC-01 | Phase 2 | Pending |
| TUNE-01 | Phase 3 | Pending |
| TUNE-02 | Phase 3 | Pending |
| TUNE-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41 ✓
- Unmapped: 0 ✓
- Phase distribution: Phase 1 = 5 (AUDIT), Phase 2 = 33 (RAID + SPELL + TROPHY + ENGINE + GATE + METER + TEST + SPEC), Phase 3 = 3 (TUNE)

---
*Requirements defined: 2026-07-19*
*Last updated: 2026-07-19 after roadmap creation — traceability populated (41/41 mapped); METER + TUNE restored + defender-loss decision folded in (initial definition)*
