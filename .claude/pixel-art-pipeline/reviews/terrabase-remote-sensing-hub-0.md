# Review — terrabase / remote-sensing-hub (round 0)

**Verdict: APPROVE**

Independent review of the rendered PNGs (contact strip + per-stage transparent re-renders
from the JSON sources, plus pixel diffs). All checklist boxes pass.

## Base identity
`BASE_IDENTICAL True` — stage-1 render is byte-identical to the shipped
`apps/web/public/sprites/buildings/terrabase/remote-sensing-hub.png`. Stage 1 uses
zero evolved-accent keys (q/b/e/E all 0), so the base is untouched.

## Cumulativity (transparent re-renders, alpha diff)
Opaque-pixel counts strictly increase and NOTHING is ever removed:
base 1366 → t2 1384 → t3 1501 → t4 1537 → t5 1590.
- base→t2: +18 added, -0 removed
- t2→t3: +117 added, -0 removed  (the dish annex — the big structural jump, correct for t3)
- t3→t4: +36 added, -0 removed
- t4→t5: +53 added, -0 removed
Each stage keeps every prior addition; no no-op stage, no recolor-only stage.

## Palette maturation (q gold = t5 only)
q(gold): 0,0,0,0,**3** — gold appears ONLY in t5 (dish rim + whip finial), never a
whole-building recolor. b(basalt) enters at t3 (annex), e/E energized teal enter at t4
(second ring) and intensify at t5 (coverage swath). Colours mature stage by stage.

## On-canvas / clip
Border-opaque pixels: top=0, left=0, right=0 at every stage; bottom=7 is the shipped
base contact shadow (unchanged). Nothing clips or floats off the 0..63 edges — the
endpoint clamps held. Footprint/base position unchanged across all stages.

## Per-stage
- **t2** (small functional add): 2nd whip antenna off the back-right deck with an o/O
  beacon tip + a faint c telemetry-bead run on the lit-left eave + one O-pinged orbital
  node. Modest, on-theme, base palette only. Reads.
- **t3** (structural add): a real b-housed ground-station DISH ANNEX mass bolted to the
  shaded right wall, carrying a tilted parabolic dish cup on a post with a g feed glint.
  Genuine new mass, distinct from the rooftop screen and clamped on-canvas.
- **t4** (major add): a 2nd steeper inclined SCAN-RING crossing the base ring over the
  rooftop, with a glowing e sensor pod on its arc + a b mast collar mooring it to the
  screen stand. Ring is clipped where it crosses the screen quad — passes cleanly BEHIND
  the hero screen + satellite. Prominent new overhead mass.
- **t5** (crowning feature): the rings resolve into a bright E global-coverage lattice
  (parallel arcs + meridian cross-threads) with traveling e data pulses + a pulsing E
  downlink node + beam toward the dish; gold rim on the dish + gold finial on the whip.
  Reads as a fully maxed-out elite version of the same hub.

## Signature integrity
The one-of-one tilted rooftop SCREEN (false-color terrain decode) + orbital ring +
satellite remain the focal element at every stage; overhead rings/swath duck behind the
screen and satellite (clip + protect-box working), so the signature is never occluded.

## Notes (non-blocking)
- The t5 upper coverage lattice is the busiest zone; at true 64px the meridian spokes get
  slightly dense near top-center but stay on the readable side of mush and do not touch
  the hero screen. Acceptable. If a future polish pass wants extra breathing room, dropping
  one meridian spoke would help — not required.
