# Review: Soil Analysis Lab (terrabase) — round 2

**VERDICT: SHIP**

The substantive rebuild landed the load-bearing fix. The rooftop sieve-shaker now reads
as a stepped graded-sieve cascade — three distinct teal screen clusters stepping
down-and-right with dark `K` gaps between them — not the round-1 checkerboard lump. The
auger reads as a screw-auger (shaft + helical flight stripe + top motor/handle block), not
a plain pole. No regressions to the clerestory monitor, the graded bins, or the teal
pie-dial; the round-1 back-right "pixel mud" is gone.

## Per-criterion notes

1. **Iso 2:1?** PASS. Wall verticals plus the 2:1 diagonal roof/footprint edges are a
   consistent isometric projection. Broad roof plane and the left/right face foreshortening
   read correctly.

2. **Roof visible 3/4 top-down (clerestory monitor on ridge)?** PASS. The raised clerestory
   lantern straddles the center of the roof ridge with a band of vertical `c`/`h` teal
   clerestory window slats on its lit face (visible cols ~13-19, rows ~30-40 in the
   clerestory crop). Clean monitor-roof read, unchanged from the round-1 fix.

3. **Front corner faces viewer?** PASS. The near vertical edge faces the viewer; the
   LIT-LEFT face and SHADED-RIGHT face splay away correctly.

4. **Sharp/clean/in-palette/clean K outline/no strays?** PASS. Crisp single-pixel edges,
   no blur/anti-alias, hard `K` silhouette. 13 chars used, all within the TerraBase set
   (≤16), no off-palette pixels. The round-1 noisy back-right `K`/`D`/`d` checkerboard with
   single-pixel speckle has been replaced with flat `D`/`M` frame uprights — the quadrant
   no longer reads as mud (rows ~34-46, cols ~38-50).

5. **Cohesive TerraBase palette + motifs?** PASS. Earthy `M`/`D` walls, mineral-teal
   `c`/`g`/`G`/`h` glass and glow, warm `o`/`O`/`r` accents. Soil horizons in the pit,
   sensor glow, graded fractions, and field-hall vocabulary are all in-family.

6. **One-of-one signature present + legible + distinct?** PASS — the blocking axis is
   resolved.
   - **Sieve-shaker — NOW READS AS A STEPPED STAIRCASE.** Tracing the teal screen pixels
     (G/g/c) in the back-right roof: a top trapezoidal tray (rows ~22-24, cols ~36-44), a
     middle teal step (rows ~28-31, cols ~38-40 / ~45-49), and a lower teal step (rows
     ~30-34, cols ~44-49). Each is one row lower and offset down-right from the one above,
     with dark `K` gaps separating them — a visible staircase silhouette against the sky.
     Making the screens TEAL (coarse `G` → `g` → fine `c`) was the right call: they pop off
     the warm `L`/`M` roof and the three steps are individually resolvable. This is the same
     element that failed at rounds 0 and 1 as an illegible lump; it is no longer a lump.
   - **Composition bins:** STRONG and intact. The graded `K`-framed bins on the left bench
     window read as sand→silt→clay→organic — amber `o`/`O` grading to teal `c`/`g`. Legible.
   - **Teal pie-dial:** STRONG and intact. The circular `g`/`G`/`c` dial with the lit
     `O`/`h` dominant wedge sits on the hall front (lower-center of the LIT-LEFT face) and
     reads exactly as intended.
   Signature is present, legible as a whole, and distinct from the Geological Core Lab
   (this mechanically separates loose soil into fractions; that is an intact stratified core).

7. **Attractive?** PASS. The right-heavy illegible mass from round 1 is gone. The roof now
   has a clear hierarchy: central clerestory monitor + a readable teal sieve staircase
   cascading toward the bins. The left face (glazing, graded bins, pie-dial) remains the
   strongest area. Balanced and clean.

8. **Unique built form + opening on LIT-LEFT?** PASS. Clearly a wide low clerestory-monitor
   hall — NOT the gateway cube — with the hero glazing, lab door, graded bins, and pie-dial
   on the assigned LIT-LEFT face, and the soil-pit/auger at the front-right. Form is unique
   and the opening is on the correct lit-left side.

## Round-1 fix verification

1. **Sieve-shaker lump → stepped graded staircase:** RESOLVED. Three discrete teal screen
   steps cascading down-right with dark gaps; teal screens pop off the warm roof; the
   surrounding checkerboard mud is replaced with flat frame uprights. Reads as a staircase.
2. **Auger plain pole → screw-auger:** RESOLVED. The front-right shaft (cols ~36-39, rows
   ~41-52) is a 2px `D` shaft with a darker `d` helical inner-stripe reading as threading/
   flight, plus a `D`/`M` motor/handle block at the top by the eave. No longer a flat pole.
   (The cutting head at the bottom is partly obscured by the pit lip but the flight reads.)
3. **Back-right noise de-noised:** RESOLVED. No more per-pixel `K`/`D`/`d` alternation; the
   trays now define the shape against flat frame.

No regressions to the bins, pie-dial, or clerestory.

## Optional polish (non-blocking — do NOT re-open for these)

1. The lower two sieve steps are slightly blobbier than the crisp top tray; a 1px `K` rim
   along each step's leading edge would sharpen the staircase read further. Not required.
2. The auger cutting head/tip is hard to spot under the pit lip — one `K`/`d` tick at the
   shaft base inside the pit would seal the "screw-auger" read. Not required.
3. The `o`/`O` "SOILS" placard over the LEFT door remains faint; one brighter `O` row would
   help the door-read. Cosmetic only.
