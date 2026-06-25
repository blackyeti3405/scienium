# Review: Remote Sensing Hub (terrabase) — round 1
**VERDICT: SHIP**

All three round-0 fixes landed cleanly with no regressions: the satellite is now a discrete K-outlined cube-with-wings separated from the ring, the tile cascade reads as a clean dotted beam, and the tilted screen's left silhouette edge is a clean continuous `K` frame. The sprite genuinely meets the contract — a low ops blockhouse crowned by a big tilted rooftop display screen (not a dish, not a globe), with an orbital ground-track ring + circling satellite beaming false-color tiles that resolve into a terrain map, and a glowing control room on the shaded RIGHT face.

## Round-0 fix verification

1. **Satellite discrete + K-outlined (was a smear fused with the ring) — RESOLVED.** Rows 12–16, cols ~38–45 now render a compact, self-contained satellite glyph: a `K`-boxed body (`KKKKKK` top/bottom frame rows 13 & 16) with a `W`/`O` core (`KoKWOKoK` / `KoKOWKoK` rows 14–15) and `o` solar wings flanked by `K`. Row 12 carries the little `c.cKc` top nub/antenna. It sits clear of the ring's far arc (ring closes around rows 17–19 to the lower-left), with transparent gaps separating glyph from arc. It reads unmistakably as a satellite-cube-with-wings, not a blob. The stray `g`/`go` tail flagged in round-0 is gone.

2. **Tile cascade thinned to a dotted beam (was too dense) — RESOLVED.** The beam now reads as discrete pixel-tiles: left diagonal `cgg`→`cgcg` (rows 17–18, cols ~14–22) and the right feed `cgg`/`OO`/`oo` (rows 17–19, cols ~35–42) are spaced dotted runs with gaps, biased `o`/`O` near the satellite and `c`/`g` toward the screen. Row 19's `cgcKcgKcgcgcg` traces a clear diagonal into the screen frame rather than blurring into the ring. The eye follows beam → screen.

3. **Screen left edge cleaned (was ragged) — RESOLVED.** The tilted slab's left frame is now a continuous stair-stepped `K` column (rows 20–31, cols descending ~25→21: `KKK`/`KKKK`), and the unresolved decode scatter (`G`/`c`/`O`/`h`) stays strictly inside the frame. The tilted-rectangle silhouette is unbroken and unmistakably a screen — no spill past the left edge.

## Per-criterion notes

1. **Iso 2:1?** PASS. Blockhouse top deck (rows ~36–43) and walls follow clean 2:1 iso; left/right wall edges descend at the correct half-slope (e.g. rows 36–63 stair-step one col per two rows). No skew.

2. **Roof visible 3/4 top-down?** PASS. The flat `L`/`M` roof deck (the broad pale diamond, rows 36–43) is clearly visible around the A-frame stand, with the `o`/`r` trim line reading along the front-right eave (rows 41–43 `KKDDrr`). Good top-down read.

3. **Front corner faces viewer?** PASS. The front vertical corner sits at ~col 12, rows ~39–53, with the lit LEFT face and shaded RIGHT face splaying away from it. Correct.

4. **Sharp/clean/in-palette/clean K outline/no strays?** PASS. JSON uses exactly the 13 declared palette chars; the rendered PNG samples to the 13 TerraBase hexes with zero off-palette sprite pixels (the only non-palette samples are the preview's transparent checkerboard). Edges are single-pixel and crisp. The `K` outline is continuous around the base, screen frame, A-frame stand, and now wraps the satellite. The previously-weak upper-right zone is resolved — satellite, ring arc, and cascade are now distinct.

5. **Cohesive TerraBase palette + motifs?** PASS. Earthy `M`/`L`/`D`/`d` walls (cleaner/paler than the rugged siblings — correct modern ground-station look), `o`/`O`/`r` amber trim and interior, mineral-teal `c`/`g`/`G` glow on ring/tiles/control-room. Motifs honored: downlink whip + ground-station gear, sensor glow, false-color terrain read, clean field hardware. No rugged-sibling overlap.

6. **One-of-one signature present + legible + distinct?** PASS. The orbital `G`/`g`/`c` ground-track ellipse (rows 7–17) clearly hovers over the hub; the discrete satellite circles it; a dotted false-color tile cascade streams down (rows 17–19); the tilted screen face carries a half-resolved false-color terrain map — resolved `G`/`g` terrain and `o`/`O` amber lower-left (rows 23–30), loose `c`/`g`/`O` scatter still decoding toward the right. The decode-in-progress reads clearly and is distinct from any dish/globe sibling.

7. **Attractive?** PASS. Confident silhouette, strong glow hierarchy, the dark tilted screen slab against the pale roof deck is a striking hero shape, and the satellite-on-ring reads as a charming one-of-one beat.

8. **UNIQUE BUILT FORM + opening on RIGHT + glowing on shaded side?** PASS. Unmistakably an ops blockhouse crowned by a big TILTED DISPLAY SCREEN on a `D`/`K` A-frame — not the gateway cube, and crucially **not a parabolic dish** (flat rectangular slab carrying a map, no curved bowl) and not a globe. The interpretation control room GLOWS on the SHADED RIGHT face: a `K`-framed window banked with `c`/`g`/`G` monitor light and `o`/`O` warm interior with `h` reflection (rows 44–58, cols ~44–50). The LIT LEFT face stays plainer. Opening-side contract satisfied.

## Optional polish (non-blocking — SHIP as-is)

1. **DECODE progress bar (blueprint asks for a `c`→`O` bar along the screen frame).** Still effectively absent at 64px. The half-resolved map already conveys "decoding," so this is optional; if revisited, a single explicit 4–5px horizontal run along the screen's bottom frame filling `g`→`O` would add the literal progress cue.

2. **Left-face window tidiness (rows 45–51, cols ~16–24).** The lit LEFT face still carries a slightly speckly `h`/`o`/`c` scatter (`KhKK`/`KoKK`/`KhhKK`/`KooKK`/`cM`/`oc`) rather than one crisp single `c` ribbon window. It reads fine and keeps the face plainer than the glowing right, but consolidating into one tidy ribbon would sharpen the lit-vs-shaded contrast further. Cosmetic only.
