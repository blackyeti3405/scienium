# Review — axiom / mathematical-modeling-suite (round 0)

**Verdict: CHANGES_REQUESTED**

(Independent review of the actual rendered PNGs. The prior text in this file was stale — the
current PNGs differ: t2 now adds a real probe element, and no mast apex touches y=0, content
top is y=2. Findings below are from pixel inspection of the shipped strip.)

Base is byte-identical to the shipped PNG (`BASE_IDENTICAL True`). All stages are 64x64,
strictly cumulative (`removed=0` at every step — nothing from an earlier stage is deleted),
content fully on-canvas (bbox 8,2 → 59,54; nothing clipped at the 0..63 edges), footprint
unchanged, and the signature top flask/beaker is never occluded (additions sit right/behind it).
Gold premium trim (palette `q` #f6c945) is correctly t5-exclusive: 0 px in base/t2/t3/t4, 46 px
in t5. The base flask-sparkle highlights (`o`/`O`) are the building's native accent (not premium
trim), so their presence from base on is fine. Palette dict is shared across stages but the
gold-gating holds at the pixel level.

The blocking problem is **t3**: it reads as a recolor of the t2 element, not a new structural mass.

## Per-stage
- **base** — unchanged, byte-identical. Good.
- **_t2** — GOOD. Small upright probe/antenna rod with a gold-capped glowing tip on the right
  shelf (diff vs base: 50 changed px). Modest, on-theme functional add.
- **_t3** — FAIL. Diff vs t2 is only **17 new-geometry px vs 59 recolored px**, in a ~5x6 cluster.
  At player scale t2 and t3 are nearly indistinguishable — the only real change is a small dark
  wedge/cap on the inner platform plus a darkening of the t2 probe. Does not read as a structural
  add; it's effectively a recolor. (The required structural beat is missing here.)
- **_t4** — GOOD. Clear major add: a stepped data-rack / tiered server stack with cyan indicator
  lights at top-center-right (53 new-geometry px, 7 recolor). Prominent new mass, very on-theme
  for a computation/modeling building.
- **_t5** — GOOD. Data tower retained; gains a broadcast antenna with arcing cyan data-stream
  particles (top-right, ends at x=59, on-canvas) + a gold trim railing around the lower platform.
  Reads as fully maxed/elite. 22 new-geom + 49 recolor (the recolor is the gold trim painted over
  the existing platform edge — expected for trim).

## mustFix
- **_t3**: addition is essentially a recolor of the t2 probe, not new structure (only ~17
  new-geometry px; t2 and t3 read identically at 64px). Add a genuine secondary mass that builds
  on t2 — e.g. raise/extend the inner platform into a short second-tier housing, or bolt a small
  annex/bracket cabinet onto the right shelf beside the probe (anchored on an existing roof point).
  It must be clearly visible as new structure at sprite scale while staying a smaller beat than the
  t4 data rack, preserving the smooth t2 < t3 < t4 ramp. Keep everything from t2 present.
