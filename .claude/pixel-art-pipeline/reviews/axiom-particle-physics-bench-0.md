# Review — axiom / particle-physics-bench (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: BASE_IDENTICAL True. All stages 64×64, edge_touch=0 (nothing clipped/floating off 0..63), footprint x-range unchanged (10..55). Signature feature (central glowing cloud-chamber dome + collision spark) never occluded. The back-half ramp (t4/t5) is good; the front-half (t2/t3) fails the "must ADD structure" gate.

Authoritative per-pixel alpha accounting (the strip hides this — flush-painted adds look like masses but aren't):

| transition | new opaque px (alpha 0→>0) | recolor px | verdict |
|---|---|---|---|
| base→t2 | **0** | 39 | FAIL — pure recolor |
| t2→t3 | **2** | 140 | FAIL — recolor masquerading as a mass |
| t3→t4 | 110 | 138 | PASS — real overhead gantry, grows up to y12 |
| t4→t5 | 15 | 66 | PASS — gold trim + collision burst |

Gold pixel count holds ~50→46→40 through base..t4 (that's the base building's own readout/studs), then jumps 40→78 at t5 — gold correctly reserved as a t5 flourish, not a whole-building recolor.

Root cause (both failing stages): the helpers are authored with real protruding geometry, but their anchors land INSIDE the existing painted silhouette, so they only recolor existing pixels and never grow the form.
- t2 change region (x13–22, y31–40): **100/100 pixels were already opaque in base** → the detector puck + post + dosimeter are drawn flat on top of the left wall. Zero protrusion.
- t3 change region (x40–52, y31–48): 226/234 already opaque, only 8 empty → the "blast-wall annex" overlaps the existing right wall / HV wing; only 2 px survive as net-new structure.

(NOTE: a prior APPROVE in this file described t2/t3 as adding real masses — that was read off the strip; the per-pixel diff disproves it.)

## Per-stage
- base — unchanged, byte-identical. PASS
- t2 (`stage2_detector_puck`) — **FAIL: pure recolor, 0 new structure px.** Puck/post/dosimeter sit entirely on the existing left-front wall face (`_yard_left_post` anchors on, not beyond, the wall).
- t3 (`stage3_shield_wall`) — **FAIL: 2 new structure px; reads as recolor.** The blast-wall Box is seated on `rw.r_front` (already-painted wall), so it overlaps the HV wing instead of standing proud of it in open yard.
- t4 (`stage4_beam_gantry`) — PASS. Prominent overhead beam-collimator gantry, 110 new px, top-beam rises to y12 above the prior y18 roofline, on-canvas, clears the dome. No change requested.
- t5 (`stage5_collision_burst`) — PASS. Gold collimator trim arcs + energized collision flash at the dome; gold first appears here. Reads fully maxed. No change requested.

## mustFix
1. **t2** — the detector puck adds 0 new pixels because it's drawn on the left wall. Move `_yard_left_post` OUT into the empty front-left yard (transparent canvas below/left of the left wall foot, e.g. ~x10–14, y44–50) and raise the post so the puck head clears the deck. After the fix, base→t2 must show ≥ ~20 NEW opaque px (alpha 0→>0), not recolor. Keep it modest (one puck + tiny dosimeter) and keep the in-dome flash spark.
2. **t3** — the shield wall adds only 2 new pixels because it sits on top of the HV wing. Re-seat the Box so it stands proud of the base on the open RIGHT-FRONT yard lip OUTSIDE the current bbox (right edge is x55) — place it so its silhouette occupies new empty pixels in front of/beyond the wing (e.g. seated ~x50–55, y44–52 and rising). After the fix, t2→t3 must show ≥ ~40 NEW opaque px and visibly break the base silhouette (a real annex). Keep the hazard-stripe cap + trefoil so it stays on-theme.

Re-render and re-diff: both base→t2 and t2→t3 must report substantial new_opaque counts (current 0 and 2 are the bug). Do NOT touch t4/t5 — they pass.
