# Review: Eye Tracking Suite (mindframe) — round 0

**VERDICT: TWEAK**

The built form, palette, iso geometry, and glass all land — but the one-of-one signature fails its own spec: the numbered SCAN-PATH is absent (no numbers, no connected saccade chain) and the dot-chain that does exist was painted DOWN THE SHADED BOOTH WALL instead of ON the screen, so the hero reads as "magenta static on a screen + magenta speckle near a seat" rather than "decoding a gaze pattern." The painter's flagged weak spot is real and confirmed.

## Per-criterion

1. **Iso 2:1? YES.** The booth top (rows 26-30) and the cantilevered display slab both follow clean 2:1 diagonals. No broken stair-stepping.
2. **Roof visible? YES.** A small flat `M` booth roof with a `D` curb and a soft `o`/`O` magenta accent strip is visible (rows 26-27, cols ~20-27, the `oooL`/`oOoL` run). Reads as a proper 3/4 top-down roof, and the angled display correctly rises above it as the dominant mass.
3. **Front corner faces viewer? YES.** The vertical `K` seam at col ~28 (rows 28-44) is the near corner; lit-LEFT face on the left, shaded-RIGHT face on the right. Correct.
4. **Sharp/clean/in-palette/K outline/glass-not-barred? MOSTLY YES.** Crisp single-pixel edges, hard `K` outline, all in-palette, no strays. The lit-LEFT booth window (rows 31-35, cols ~17-19: `c`/`L`/`g` pane in a `K` frame) reads as real GLASS with sheen + frame — good, not black-barred. BUT the big hero screen (display face) does NOT read as a coherent glass screen — it's a dense uniform scatter of `g/h/o/O/c` with no frame edge, no sheen direction, and a couple of internal `K` blocks (rows 19-20 `KKKK`, row 24 `KK`) that read as holes/bars punched in the glass rather than image content. See tweak 1.
5. **Cohesive MindFrame palette + motifs? YES.** Muted indigo/violet `M`/`D`/`d` walls + magenta `o`/`O` accent is squarely MindFrame. Motifs present: soft-glow data screen (central), observation glass (side window), magenta accent strip, glow wash. Seating/headrest is the weak motif (see crit 6).
6. **One-of-one signature present + legible + distinct? NO — this is the blocker.**
   - **Heatmap: PARTIAL.** There are warm `o`/`O` hot-spots pooled on the screen (rows 17-19, e.g. `ohoo`, `ohWhh`) over cooler `g`/`G`, so a heatmap *gradient* is implied — but it's drowned in noise and never reads as "hot blobs over a faint framed stimulus image"; there is no discernible underlying picture for the heat to sit on.
   - **Numbered scan-path: ABSENT.** This is the decoding signal and it is missing. There is no connected chain of distinct fixation dots with thin `o` saccade lines, and there are ZERO numbers (1→6) anywhere. Without the numbers + connecting lines, the "scan-path = viewing order = the decoding" reading is gone.
   - **Misplaced dot-chain.** The only dot-chain present (rows 32-40, cols ~32-37: the diagonal `o`/`O`/`h` zigzag on the dark `D` wall) was painted on the SHADED BOOTH WALL, not on the display. Per the blueprint, heatmap + scan-path must live "on the angled display ... over a stimulus image." On the wall it reads as random magenta speckle, not gaze data.
   - **IR cameras: PARTIAL/illegible.** The right edge (cols ~38-39, rows 32-39: bright `g`/`gg` strip with `c` highlight + the `O`/`o` beam at row 39 `oOD` and row 44 `ooooorr`) is meant to be two IR lenses + glints + beam, but it reads as one glowing vertical bar, not two distinct lenses casting two beams at a headrest. The `d` viewer head + `M`/`L` headrest never resolve as a seat. Confirms the painter's note: "magenta activity near a seat."
   **Net: a viewer cannot decode "gaze heatmap + numbered scan-path over an image."**
7. **Attractive? YES.** Strong silhouette, appealing glow, nice violet/magenta cohesion. The angled-screen-on-an-arm carrel is genuinely charming and reads at thumbnail size.
8. **Unique built form + opening on RIGHT + glowing on shaded side? YES.** Excellent here. A compact booth fronted by a big ANGLED stimulus display cantilevered on a short arm — clearly NOT the gateway cube and clearly NOT a giant eyeball (no eyepiece/lens-barrel form). Opening + glow are correctly on the SHADED-RIGHT face (the `D` wall carries the bright `o`/`O` content and the screen's glow wash), satisfying the assigned RIGHT side.

## Tweak list (numbered, painter-actionable)

1. **Build a readable stimulus image UNDER the heatmap on the screen.** Replace the uniform `g/h/o/O` scatter (rows 16-25, cols ~28-44) with: a faint framed picture base in `c`/`M` (a simple recognizable shape — e.g. a `c` rectangle "photo" with an `M` horizon or a `L` face oval) occupying the screen interior, then pool 2-3 soft heatmap blobs grading `g`→`o`→`O` (cool center → hot edge) over the high-attention spots. Remove the internal `K` blocks at rows 19-20 and row 24 — they punch holes in the glass; the screen interior should have no `K` except a clean 1px `K` frame border.
2. **Paint the NUMBERED scan-path ON the screen, not on the wall.** Place 5-6 small `h`/`W` fixation dots across the stimulus image, connect them with thin `o` saccade lines in viewing order, and tag each dot with a tiny `O` numeral 1→6 (even single-pixel ticks reading as digits). This is the decoding hero — it must be legible on the display face.
3. **Remove (or greatly reduce) the magenta dot-zigzag on the shaded booth wall** (rows 32-40, cols ~32-37). Right now it competes with and is mistaken for the scan-path. Let the dark `D` right wall stay plainer so the SCREEN owns the gaze data; keep only the screen's soft `o` glow wash spilling onto the upper wall.
4. **Resolve the two IR cameras as two distinct lenses + two beams.** On the camera bar slung under the display lip (around rows 30-33, cols ~37-39), draw two separate small `c` lens dots (1-2px each, with a single `O` glint pixel on each) and two thin `o`/`O` IR beams angling down-left toward the headrest. Two reads as "stereo eye-trackers"; the current single bright bar does not.
5. **Make the headrest/seat legible.** Inside the booth opening (lower-right, rows 36-42, cols ~30-36) shape a small `M`/`L` headrest cradle with a `d` viewer-head silhouette facing the screen, lit by the screen's `o` wash. A clear seat + head sells "viewing booth" and gives the IR beams a target.

## Optional polish (after the above)
- A single `O` highlight pixel at the top-left screen corner would add a glass sheen and reinforce "glowing display."
- The pink `o`/`O` roof accent strip is nice but slightly chunky (rows 26-27); thinning it to 1px would sharpen the roofline.
