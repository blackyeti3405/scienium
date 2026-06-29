# Review — biocore/aquatic-habitat (round 0)

**Verdict: APPROVE**

Independent review of the rendered PNGs (not the generator summary). Base is byte-identical
to the shipped sprite (`BASE_IDENTICAL True`). All five stages are 64x64 with **zero**
edge-touching pixels (content bbox max x7..49, y6..52) and an unchanged footprint/anchor.

## Per-stage
- **base (L1-3):** Tall transparent teal glass water-column rotunda + lit-left viewing window
  with the living kelp/fish/jelly ecosystem + front-left entry annex. Unchanged. PASS.
- **_t2 (small):** Skimmer box on the cap front-centre + a gooseneck water-quality probe arcing
  above the rim, and the annex gauge brightens to a lit `e`/`O` readout (42 px, x16..33 y6..43).
  Modest but a distinct, on-theme functional unit — confirmed legible in the top crop. PASS.
- **_t3 (structural):** A short/fat quarantine SUMP-TANK (second `c/g` water cylinder) with a
  matured bark-green `b` base collar + feed pipe, front-left of the rotunda (132 px, x7..20
  y36..51). Real new mass, not a recolor. Introduces `b`. PASS.
- **_t4 (major):** Tall STANDPIPE / protein-reactor column on the plainer RIGHT side, climbing
  above the rim (top y6, on-canvas), with a glowing `e/E` UV-sterilizer band, internal bubble
  train, and a `b` cross-brace tying it to the tank (104 px, x41..48 y6..37). The prominent new
  vertical mass. PASS.
- **_t5 (crowning):** Reef BLOOMS — `E`-lit coral fan, 2 extra fish, a glowing `e/E` jellyfish
  (all painted only over water, so they sit behind the front glass) — plus a single `q` GOLD
  cap-ring tracing the front rim arc + 4 gold window-corner bosses (47 px). Reads fully maxed.
  PASS.

## Checks
- **Cumulative:** diffs are purely additive in fresh regions; each stage retains all prior adds
  (skimmer -> +sump -> +standpipe -> +bloom/gold). PASS.
- **Smooth ramp:** small -> structural -> major mass -> crowning; no stage jumps the whole way;
  _t5 clearly reads as the fully built-out tank. PASS.
- **Colour maturation / gold discipline:** `b` from t3, `e/E` bioglow from t4, gold `q` ONLY in
  t5 (26 gold px, none earlier). Gold is a sparse rim/corner accent (over base `K` outline +
  window corners) — NOT a whole-building recolor; tank still reads as glass-and-water.
- **Signature not occluded:** verified pixel-wise — **zero** amber (`o/O/r`) ecosystem pixels are
  overwritten t4->t5; the gold ring traces the rim outline, not the surface coral/fish.
- **On-canvas / footprint:** no clipping on any edge; base position unchanged; readable at 64px.

No mustFix. All stages good as-is.
