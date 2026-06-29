# Review — biocore / wet-lab (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: BASE_IDENTICAL True (stage-1 render == shipped wet-lab.png). Footprint/base anchor unchanged
(x-extent fixed 10..59 every stage). All content on-canvas, nothing clipped off 0..63 (bboxes: base 16–54y; t5 spire
tip at y2, annex foot at y63 — both inside). No opaque pixel on the extreme top/left/right edge.
Gold (`q`) is confined to stage5; evolved keys (`b/e/E/q`) appear only in stage2+ helpers, so stage 1 is unchanged.
Code follows the workshop.py pattern (build(stage) + cumulative stageN_* helpers + emit/build_all).

Judged from the rendered PNGs only (not generator text).

## Per-stage
- **base** — unchanged, byte-identical. OK.
- **t2** — PASS. Small functional add: a slim exhaust vent stack whose white cowl pokes above the roofline into clear
  sky (a real base→t2 silhouette break) plus a reagent carboy with an amber LED cap, both standing on the open
  front-left roof deck. On-theme (fume exhaust + reagent supply), clear of the central clerestory scoop and the
  lit-left assay rack.
- **t3** — FAIL (detached mass). The autoclave/fume annex is the right idea and on-theme (bark-green `b` box, round `g`
  glass port, `o/r` fume vent), but it is **not connected to the hall** — a band of transparent background separates
  it from the building. Junction scan: the hall's lower-right wall ends at ~x50 on row y48, while the annex's top
  begins at x42 on row y54, with empty ground between the hall eave and the annex. It reads as a floating/unmoored
  outbuilding, not "bolted onto the shaded right wall" — the detached-blob pitfall relocated to ground level.
- **t4** — PASS (cumulatively inherits the t3 detachment). Major add: a second, taller clerestory monitor bay raising
  the ridge behind-right of the original daylight scoop, glazing glowing bio-luminescent `e/E` on a matured bark-green
  `b` chassis. Prominent new mass; does NOT occlude the original scoop (which stays in front-left).
- **t5** — PASS (cumulatively inherits the t3 detachment). Crowning feature: the assay rack blooms into a brighter `E`
  automated assay wall with an overhead pipette rail, a gold (`q`/`O`) bench rail caps the lit-left band, and a glowing
  assay-bloom spire with a gold finial crowns the t4 bay cap (seated on a `b` plinth — not floating; tip on-canvas at
  y2). Reads as fully maxed/elite; gold reserved to this stage only.

## Colour / theme
Colours mature sensibly across the ramp (M/D hall green → bark-green `b` masses → bio-luminescent `e/E` glow → gold
`q` flourish at t5). Gold never recolors the whole building. Additions are unique + on-theme to a wet-lab.

## mustFix
- **t3**: the autoclave annex floats — a transparent gap separates it from the hall's lower-right wall (hall eave ends
  ~x50 on y48; annex top starts ~x42 on y54, with empty ground between). In `stage3_autoclave_annex`, re-seat the annex
  so it physically abuts the hall: raise its top-back corner onto the hall's lower-right wall (move it up ~3–4px and
  left so its back/top edge touches the hall eave) and/or add a short connecting plinth/skirt wall bridging the gap, so
  it reads as a bolted-on side-annex rather than a detached ground structure. This single fix propagates to t4/t5,
  which inherit the same detached annex (junction signature is byte-identical in t3/t4/t5: hall ends ~x50/y48, annex
  begins ~x42/y54).
