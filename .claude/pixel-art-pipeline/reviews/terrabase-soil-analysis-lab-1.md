# Review: terrabase / soil-analysis-lab (round 1)

**Verdict: APPROVE**

Judged from the rendered PNGs (contact strip + per-stage + base), backed by pixel-diff
measurements. All checklist boxes pass.

## Per-stage
- **base (L1-3):** byte-identical to shipped PNG. `BASE_IDENTICAL True`. Unchanged.
- **_t2 (L4):** small functional add — a front-hanging soil-sample tray / probe rack
  bolted under the existing front platform (teal+gold detail, short legs). Modest,
  on-theme, clearly visible (+17 opaque px, diff bbox 45,54–52,57). Signature rooftop
  core untouched. PASS.
- **_t3 (L7):** structural add — a stepped left-side annex/wing juts out at lower-left
  (teal-flecked sloped mass, diff bbox 5,36–19,50). Real new mass beyond the base
  silhouette; t2 tray retained. PASS.
- **_t4 (L10):** major add — a tall soil-core drilling derrick / sensor mast rises from
  the roof with teal banding, topping out at y=2 (diff bbox 19,2–35,24). Prominent
  vertical mass, strongly on-theme for a soil lab. Annex + tray retained; the central
  rooftop sample core sits at the mast's base and is NOT occluded. PASS.
- **_t5 (L15):** crowning feature — gold-trimmed assay/readout panel added lower-right
  (diff bbox 54,42–60,52). New premium gold is 24 px localized to that single feature;
  total gold share only 2.6% of the building (the other bright-amber pixels are the
  base's pre-existing lit windows, not a recolor). Mast + annex + tray all retained;
  reads as a fully maxed elite build. PASS.

## Evidence
- Opaque-pixel ramp is monotonic: 1320 → 1337 → 1444 → 1583 → 1603 (every stage adds).
- Cumulative: each prior stage's pixels are 95.5–97.8% preserved; the small deltas are
  painter's-order occlusion exactly where the new mass sits on the old roof, not loss of
  any earlier addition or the signature feature.
- On-canvas: content bboxes stay inside 0..63 (max x=60, top y=2, bottom y=57). Nothing
  clipped or floating off the edges. Footprint/base anchor unchanged across stages.
- Colours mature (teal energized accents deepen/spread); gold reserved to _t5 flourish.
- Readable at 64px — a few clear additions per stage, no mush.

No mustFix items.
