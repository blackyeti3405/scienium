# Review — terrabase/atmospheric-sensor-array (round 0)

**Verdict: APPROVE**

Base byte-identical to shipped PNG (`BASE_IDENTICAL True`). All five stage PNGs have
distinct MD5s; every transition is strictly cumulative (removed_px = 0 throughout); all
content is 64x64 and on-canvas (no edge clipped — bbox top y=1, right max x=51); footprint
unchanged. Gold (`q #f3c63a`) appears for the first time at t5 only. Every addition is
air-monitoring-specific and clears the central intake-horn + gas-wisp signature.

## Per-stage
- **base → t2**: small functional add. Two intake-cyclone cans (K rim, teal `c` intake
  glint) + a wind-vane on a short mast + an `O` "sample-active" light on the analyzer frame,
  staked on the lit-left deck among the column feet. 41 px change, distinct MD5 — real, not a
  no-op. Subtle (recolors deck-surface pixels rather than extending the silhouette), but
  legitimate and on-theme. PASS.
- **t2 → t3**: structural add. A calibration-gas annex bolted to the front-left corner
  (basalt `b` housing block + louver vent + two upright calibration-gas bottles piping to the
  columns). +184 opaque px extending the footprint left (bbox x3–13). First use of matured
  basalt tone. PASS.
- **t3 → t4**: major add. A new, taller sampling column on the open right flank (basalt
  cylinder, o-banded collars, energized `e/E` intake bands, glowing aerosol-analyzer pod
  crown). +164 opaque px (bbox x45–49, apex y2). Extends the building's own column motif.
  PASS.
- **t4 → t5**: crowning feature. A hovering air-quality isopleth plume (nested `e/E` contour
  rings + drifting aerosol nodes) fed by a lidar beam from the tallest column, plus premium
  GOLD `q` tip-caps on every column crown and sparse gold front-rim trim. +35 opaque px /
  +25 recolored (bbox y1–13). Reads as fully built-out / elite; gold is a flourish, not a
  recolor. PASS.

## Notes (non-blocking)
- t2 is the weakest stage: its gear sits *inside* the cluster footprint and recolors deck
  pixels rather than adding a clean new silhouette, so it's easy to miss at 1x in the strip.
  It still passes (real, cumulative, on-theme, non-occluding) — flagging only as a future
  polish opportunity, not a required change.

## mustFix
(none)
