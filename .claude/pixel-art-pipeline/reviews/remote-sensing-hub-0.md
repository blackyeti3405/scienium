# Review: Remote Sensing Hub (terrabase) — round 0
**VERDICT: TWEAK**

A genuinely strong, distinctive sprite — the tilted rooftop screen + orbital ring + false-color map decode all land and the form is clearly NOT a dish. Holding at TWEAK for two legibility issues (the satellite barely reads as a discrete object; the screen's tilted-slab silhouette gets muddied at its left edge) plus a couple of small cleanups. None are structural.

## Per-criterion notes

1. **Iso 2:1?** PASS. Base blockhouse top deck (rows ~36–43) and walls follow clean 2:1 iso; left/right wall edges descend at the correct half-slope. No skew.

2. **Roof visible 3/4 top-down?** PASS. The flat `L`/`M` roof deck (rows 36–43, the broad pale diamond) is clearly visible behind/around the A-frame stand, with the `o` trim line reading along the front-right eave. Good top-down read.

3. **Front corner faces viewer?** PASS. The front vertical corner sits at roughly col 12–13 / rows 50–58, with the lit LEFT face and shaded RIGHT face splaying away from it. Correct.

4. **Sharp/clean/in-palette/clean K outline (esp. busy upper-right)?** MOSTLY PASS. All colors are in-palette; edges are single-pixel and crisp. The `K` outline is continuous around the base and screen. BUT the upper-right IS the weak zone the painter flagged: the satellite (rows 14–16, cols ~42–50: `c..g` / `Oo.WO.oO` / `o.KWKKgo`) collides visually with the ring's right arc and the start of the tile cascade — it reads as a bright smear rather than a discrete satellite-with-wings. Also the ring's right arc (rows 19–20 near cols 40–46: `gcgoOK` / `KgcOK`) tangles with the screen's top-right `K` frame corner, so the ring's far side and the screen edge merge.

5. **Cohesive TerraBase palette + motifs?** PASS. Earthy `M`/`L`/`D` walls, `o`/`O` amber trim and interior, mineral-teal `c`/`g`/`G` glow on ring/tiles/control-room — squarely TerraBase. Motifs honored: downlink whip + ground-station gear, sensor glow, false-color terrain read, clean field hardware. No rugged-sibling overlap.

6. **One-of-one signature present + legible + distinct?** PASS (with the legibility caveats in #4). The orbital `c`/`g` ground-track ellipse (rows 8–18) clearly hovers over the hub; a diagonal tile cascade (`cg`/`cgcg` runs, rows 17–20 left side and rows 18–19 right) streams down; the tilted screen face carries a half-resolved false-color map (`GGGG`/`rr`/`oooo`/`hh`, rows 23–30) with loose `cg` tiles still scattered at the left edge — the decode-in-progress reads. Distinct from dish/globe siblings.

7. **Attractive?** PASS. Confident silhouette, good glow hierarchy, the tilted dark screen against the pale deck is a striking hero shape.

8. **UNIQUE BUILT FORM + opening on RIGHT + glowing on shaded side?** PASS. This is unmistakably an ops blockhouse crowned by a big TILTED DISPLAY SCREEN on an A-frame — not the gateway cube, and crucially **not a parabolic dish** (the face is a flat rectangular slab with a map, no curved bowl). The control room glows `c`/`h`/`o` on the SHADED RIGHT face (rows 47–54, cols ~47–50). The LEFT face stays plainer. Opening-side contract satisfied.

## Tweak list (painter-actionable)

1. **Satellite — make it discrete (rows 14–16, cols ~42–49).** This is the #1 issue. Right now `Oo.WO.oO` / `o.KWKKgo` reads as a blob fused with the ring. Tighten it into a readable cube-with-wings: give the body a compact 2×2 `W`/`O` core, flank it with a single `o` solar wing on each side, and **wrap a 1px `K` outline** around the whole satellite so it pops off the ring's `c`/`g` arc behind it. Drop the stray `g` at row 14 col 49 and the loose `go` tail at row 16 — they smear the read. Goal: one clean, obviously-a-satellite glyph, not a cluster.

2. **Separate the ring's far (right) arc from the screen frame (rows 19–20, cols 40–46).** The ring closure (`gcgoOK` / `KgcOK`) currently touches the screen's top-right `K` corner. Pull the ring arc up/right by ~1px or insert a 1px transparent gap so the ellipse reads as a continuous closed orbit passing BEHIND the screen, rather than merging into the frame. Keep the faint `K` far-side shading on the ring's back so depth still reads.

3. **Clean the tile cascade so it reads as falling tiles, not noise (rows 17–20, both diagonals).** Left diagonal (`cgcg` runs rows 17–18 cols ~16–18) and the right run feeding the screen are good in concept but dense. Thin each cascade to a clearly *dotted* diagonal of discrete 1–2px `c`/`g`/`o` squares with gaps between them, biasing color toward `o`/`O` near the satellite and `c`/`g` as they near the screen, so the eye traces beam → screen. Right now they blur into the ring.

4. **Strengthen the screen's left/lower silhouette edge (rows 24–31, cols ~21–22).** The screen's left frame (`KK`/`KKK` at the slab's left) is a bit ragged where the loose `cg` decode tiles spill past it (rows 24–28, the `GGGGG`/`GGGc` left columns bleed to the frame). Re-seat a clean continuous 1px `K` left frame edge for the slab, and keep the unresolved scatter tiles strictly INSIDE the frame, so the tilted-rectangle silhouette is unbroken and unmistakably a screen.

5. **(Minor) DECODE progress bar legibility (screen frame).** The blueprint asks for a tiny `c`→`O` "DECODE" bar along the frame; at 64px it's effectively absent/illegible. Either add a single explicit 4–5px horizontal run along the screen's bottom frame filling `g`→`O` (left portion `g`/`G`, right tip `O`) so there's a readable progress cue, or accept its omission — low priority, the map already conveys "decoding."

6. **(Minor polish) Left-face window (rows 45–50, cols ~18–22).** The lit LEFT face has scattered `h`/`o` specks (e.g. row 45 `KKhKK`, row 46 `KKoKK`) that don't clearly resolve into the one `c` ribbon window the blueprint calls for. Consolidate into a single tidy 1-row `c` ribbon window + door so the lit face stays deliberately plainer and the glow contrast with the right face stays strong.
