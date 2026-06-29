# Review — axiom/numerical-methods-hub (round 1)

**Verdict: APPROVE**

Independent review of the actual rendered PNGs (strip + per-stage previews + pixel scans). Base is byte-identical to the shipped sprite (BASE_IDENTICAL True). All stages are 64x64, content fully on-canvas (content bbox max x=61, min y=2 — nothing clipped at the 0..63 edges), footprint unchanged, readable at 64px. Cumulative check is clean: 0 pixels lost between consecutive stages (strictly additive at every tier).

## Per-stage
- **_t2 (small add):** A real COOLANT/HEAT-EXHAUST VENT STUB seated on the front-left vent-wing roof — own lit-M/shaded-D faces, K-rimmed cowl cap with grille slats, bright o/O exhaust plume + o iteration dot. Net-new opaque mass (verified vs base in a wing crop), not a recolor. On-theme to the heat-exhaust wing. Modest and correct for t2. Base palette only (0 gold / b / e).
- **_t3 (structural add):** A stacked COMPUTE-RACK annex bolted to the shaded-right, seated on the ground, rising to just under the parapet — deep-indigo `b` slab (53px `b` introduced here) with a column of g/G rack-bay slits + o LEDs. Distinct from the front-left louver wing; a true structural mass (298 changed px). Does not occlude the hero mesh.
- **_t4 (major add):** A rooftop SOLVER-ARRAY TOWER in the right-back wedge — `b` lattice frame on a visible K plinth, vertical stack of glowing `e` processor cards + `E` bus spine, small L/M dish cocked up-right. Prominent new vertical mass; energized accents (`e`/`E`) first appear here. Dish sits at y=2, fully on-canvas (not clipped) with top-edge headroom — the volt off-canvas overshoot pitfall is avoided. Anchored on a roof point, not floating.
- **_t5 (crowning + gold):** The convergence-mesh hero blooms into a RECURSIVE MESH-HALO — concentric e/E L-brackets stepping up-left from the converged corner with bright lattice nodes, a white-hot CONVERGED cell at the front tip, and an O residual-landing pulse into the gauge "0" floor (`e` glow nearly triples to 23px). Premium GOLD is reserved strictly here (15px `q`: sparse front-parapet trim studs + solver-tower cap/finial) — a flourish, not a whole-building recolor. Reads as a fully maxed iteration engine while still unmistakably the same compute hall.

## Palette discipline (verified at the pixel level)
gold(q): base/t2/t3/t4 = 0, **t5 = 15** ✓ — gold is t5-only.
b: 0 → 0 → 53 → 66 → 66 ✓ (matured structure from t3).
e/E: 0/0 → 0/0 → 0/0 → 7/4 → 23/16 ✓ (energized glow from t4, brightens at t5).

## Ramp
Smooth and monotonic: small wing stub → ground-seated rack annex → rooftop solver tower → energized halo + gold. No stage jumps the whole way; the front-left/centre floating convergence-mesh signature stays clear and on top at every tier. The t4 tower and t5 halo are confined to the upper-right (50px / 47px changed) but are visually prominent thanks to placement against empty sky and high-contrast glow — they read at 64px, not as mush.

No mustFix. All boxes pass.
