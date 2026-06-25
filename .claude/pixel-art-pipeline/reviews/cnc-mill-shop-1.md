# Review — CNC Mill Shop (round 1)

**VERDICT: SHIP**

## Per-criterion
1. **ISOMETRIC 2:1 — PASS.** Wall faces and roof diamond follow a clean 2:1 isometric projection; left and right faces recede correctly.
2. **3/4 top-down, roof visible — PASS.** Full roof diamond is visible above the two wall faces, well-proportioned.
3. **Front corner faces viewer — PASS.** The vertical front-corner edge sits center-bottom; left/right walls splay away from it.
4. **SHARP / clean K outline — PASS.** Single-pixel `K` silhouette outline, crisp edges. Palette-clean: 13 game-palette colors, zero off-palette pixels (the only non-palette values are the transparency checkerboard). Round-0's roof speckle is resolved — the border now reads as ribbed corrugation + `o` hazard chevrons, not random dots. Minor residual busy-ness on the back-left roof border, but it is legible as ribs, not mush.
5. **Cohesive with Volt Lab palette/motifs — PASS.** Steel-grey body, cyan glass enclosure, electric-yellow accents all on-palette. Yellow eave hazard-chevrons, diagonal yellow power-line stripes on the walls, and cyan readout chips all land the motif family.
6. **One-of-one — SUBTRACTIVE milling legible — PASS.** This is now unmistakable. Inside ONE unified glass enclosure: a grey spindle/tool bit at the cut point with yellow swarf chips curling off it, directly above a light clamped workpiece block with a clear dark `K` **notch carved out of its top** (material removed), sitting on a `M`/`D` carriage that straddles the rails. The cyan coolant-mist highlight sits exactly at the contact point. A player reads "a machine carving a part," clearly distinct from the 3D-print shop's additive tower. The headline round-0 failure is fixed.
7. **Attractive — PASS.** Clean silhouette, readable machine, focused glow at the cut. Happy to ship.

## Round-0 fix audit
1. One glass enclosure, not two windows — **LANDED** (unified cyan wash under a single top rail).
2. Clamped workpiece with cut notch — **LANDED** (dark notch in the light block).
3. Tool bit pointing down — **LANDED** (grey bit + swarf above the notch).
4. Carriage differentiated from rails — **LANDED** (carriage block with darker core over rail line).
5. De-speckle corrugation — **LANDED** (ribs + chevrons read cleanly).
6. Focused mist + swarf — **LANDED** (concentrated at the cut, swarf to one side).
7. Explicit DRO/readout strip — **LANDED** (`g`/`G` cyan chips on the box front).

## Polish nits (optional, do not block ship)
1. The back-left roof border (around source rows 15–18, left of the glass box) is slightly busier than the right side — one or two `L`/`D` pixels could be evened out for perfectly symmetric ribbing. Cosmetic only.
2. The DRO chips on the right of the carriage could read marginally cleaner as a single 3px horizontal `g` strip rather than scattered `g`/`G` pixels. Already legible as a readout; minor.
