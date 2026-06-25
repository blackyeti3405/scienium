# Review: Soil Analysis Lab (terrabase) — round 1

**VERDICT: TWEAK**

One round-0 issue fully fixed (clerestory recentered), one fixed (pit horizons), one
still failing (the hero sieve-shaker), and a new regression: the back-right roof quadrant
is now a noisy dark checkerboard lump that reads as visual mud. The signature is the whole
point of this building, so this can't ship yet.

## Per-criterion notes

1. **Iso 2:1?** PASS. Wall verticals and the 2:1 diagonal roof/footprint edges are a
   consistent isometric projection. The broad roof plane and left/right face foreshortening
   read correctly.

2. **Roof visible 3/4 top-down (clerestory monitor on ridge)?** PASS — this is the headline
   fix. The raised clerestory lantern now STRADDLES the center of the roof ridge (rows ~28-41,
   cols ~13-23) as a `K`-rimmed box with a band of vertical `c`/`h` teal clerestory window
   slats on its lit face. It is no longer a back-right corner appendage. Reads cleanly as a
   monitor-roof. Round-0 issue (3) RESOLVED.

3. **Front corner faces viewer?** PASS. The near vertical edge faces the viewer; LIT-LEFT and
   SHADED-RIGHT faces splay away correctly.

4. **Sharp/clean/in-palette/clean K outline/no strays?** PARTIAL. Edges are crisp single-pixel,
   no blur/anti-alias, hard `K` silhouette outline, all 13 chars in the TerraBase set (within
   ≤16). BUT the back-right roof block (rows ~23-50, cols ~40-53) is an extremely dense
   `K`/`D`/`d` checkerboard with isolated single-pixel speckle — it crosses from "textured" into
   "noisy/strays-like" and the eye can't resolve any structure there. Clean in the literal sense,
   but it reads as pixel mud.

5. **Cohesive TerraBase palette + motifs?** PASS. Earthy `M`/`D` walls, mineral-teal `c`/`g`/`G`/`h`
   glass and glow, warm `o`/`O`/`r` accents. Soil horizons, sensor glow, and field-hall vocabulary
   all in-family.

6. **One-of-one signature present + legible + distinct?** FAIL — still the weakest axis, and the
   blocking one.
   - **Composition bins:** STRONG. The four graded `K`-framed bins on the left face (under the
     bench window, rows ~36-40) read as sand→silt→clay→organic — `r`/`o`/`O` ambers grading to
     `g` teal. Legible and distinct.
   - **Teal pie-dial:** STRONG. The circular `g`/`G`/`c` dial with the lit `O`/`h` dominant wedge
     on the hall front (rows ~37-46, cols ~16-20) reads exactly as intended.
   - **Sieve-shaker tower:** STILL FAILS. The back-right roof structure is a solid dark
     `K`/`D`/`d` checkerboard slab — NOT a stack of 3-4 distinctly STEPPED, `K`-rimmed sieve
     trays grading coarse→fine. There is no staircase silhouette, no discrete trays, and the
     cascade flecks don't grade legibly into the bins. This is the same lump failure as round-0
     tweak (1), just noisier. Because the sieve-shaker is the literal hero motif of this
     building, the signature is not yet legible-as-a-whole. Round-0 issue (1) NOT RESOLVED.

7. **Attractive?** PARTIAL / mild REGRESSION. The roof center (now with the monitor) and the
   left face (glazing, bins, pie-dial) are genuinely attractive. But the back-right quadrant is
   now busier and muddier than round-0 — a large dark checkerboard lump that fights the central
   monitor for attention and reads as the messiest part of the sprite. The composition is
   right-heavy and that mass is illegible.

8. **Unique built form + opening on LIT-LEFT?** PASS. Clearly a wide low clerestory-monitor
   hall, NOT the gateway cube, with the hero glazing + lab door + bins + pie-dial on the
   assigned LIT-LEFT face. The soil-pit is at the base of the shaded-right. Form is unique and
   correct; only the sieve sub-element drags it down.

## Round-0 issue verification

1. **Sieve-shaker solid lump → stepped graded screens:** NOT RESOLVED. Still a lump (now a
   noisier checkerboard). No stepped tray silhouette.
2. **Auger pole + under-resolved pit → screw-auger + horizon-banded pit:** PARTIALLY RESOLVED.
   The PIT now shows clear horizontal horizon bands (`d`/`D` over a strong `r` subsoil band over
   `M`/`L` parent) — RESOLVED. But the AUGER is still a plain vertical `D`/`M` post/pole on the
   left edge of the pit with no visible flight/helix and no auger head — NOT resolved.
3. **Clerestory shoved to back corner → straddle the ridge:** RESOLVED. Lantern is now centered
   on the roof ridge with a clean teal clerestory window band.

## Tweak list (painter-actionable)

1. **Sieve-shaker — rebuild as a clear stepped staircase (top priority).** Back-right roof,
   rows ~23-50 / cols ~40-53. Clear out the current dense checkerboard and lay in 3-4 DISCRETE
   `K`-rimmed sieve trays, each one row lower and one step offset down-right from the one above,
   so the silhouette reads as a visible staircase against the sky. Rim each tray hard in `K`,
   fill the mesh `D` (coarse) at top → `M` → `L` (fine) at bottom. Leave 1px `.` gaps of sky/roof
   BETWEEN trays so they separate — the current failure is that everything is butted together
   into one mass. Keep one `c`/`d` ghost-offset on a frame edge to hint vibration.

2. **De-noise the whole back-right quadrant.** Right now it's a `K`/`D`/`d` checkerboard with
   single-pixel speckle that reads as mud. Once the trays (tweak 1) define the shape, replace the
   surrounding checkerboard with flat `D`/`M` frame uprights so the trays pop. Fewer, larger,
   intentional shapes — not per-pixel alternation.

3. **Cascade flecks — grade finer/paler down the steps INTO the bins.** Along the right edge of
   the trays, run a top-to-bottom gradient of small flecks: `r` (coarse) at the top tray → `D` →
   `M` → `o`/`O` (fine, pale) spilling toward the composition bins. This is what sells "separating
   by grain size" and visually links the sieve to the bins.

4. **Hand-auger — give it a flight, not a pole.** The vertical `D`/`M` post over the pit
   (cols ~40-41, rows ~23-50). Add a small `K`/`D` auger HEAD at the bottom (in the pit), 3-4
   alternating `K`/`d` helix ticks up the shaft to read as a flight, and a small `M`/`D` T-handle
   or motor block at the top. Keep the shaft 2px so it doesn't read as a guy-wire.

## Optional polish (after the above)

- The `o`/`O` "SOILS" placard over the LEFT door is faint — one brighter `O` row would help the
  door-read.
- Once tweak 2 clears the noise, check the `D` sample-cable run doesn't re-overlap the new tray
  silhouette.
- The pit horizons are good; a single `K` rim line along the pit's near edge would crisp the
  "recessed hole" read vs. a stacked crate.
