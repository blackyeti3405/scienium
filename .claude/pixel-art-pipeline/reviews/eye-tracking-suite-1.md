# Review: Eye Tracking Suite (mindframe) — round 1

**VERDICT: TWEAK**

The built form, palette, iso geometry, and glass treatment all still land, and round-0's *second* issue (illegible cameras/headrest) is largely fixed — there's now a discernible seat/headrest cradle with two pink glints inside the booth. But round-0's *primary* issue is NOT resolved: the hero decoding motif on the screen is still a uniform magenta/violet scatter. There is no framed stimulus image, no heatmap-over-image read, and — critically — still ZERO numbers and no connected scan-path. The display reads as "static on a glowing screen," not "a decoded gaze pattern." This is a regression-free but unfixed blocker; it needs one more pass.

## Per-criterion

1. **Iso 2:1? YES.** Booth top (rows 26-30) and the cantilevered display slab follow clean 2:1 diagonals; no broken stair-stepping. Pedestal/shadow base reads correctly.
2. **Roof visible? YES.** Small flat `M` booth roof with a `D` curb and a soft `o`/`O` magenta accent strip is visible up top; the angled display correctly rises above it as the dominant mass. (Accent strip is still slightly chunky — minor.)
3. **Front corner faces viewer? YES.** The near vertical `K` seam (col ~28) separates the lit-LEFT face (left) from the shaded-RIGHT booth face (right). Correct orientation.
4. **Sharp/clean/in-palette/K outline/glass-not-barred? MOSTLY YES — one repeat defect.** Crisp single-pixel edges, hard `K` outline, all in-palette, no strays. The lit-LEFT booth side window reads as real GLASS (sheen + `K` frame) — good. BUT the big hero screen still does NOT read as a clean glass screen: it's a dense uniform `G/g/c/h/o/O/W/M` scatter with no frame edge or sheen direction, and internal `K` blocks remain punched into the glass interior (e.g. row 20 cols ~33-34 `ggKgg`, row 23 cols ~37-40 `GGGKh`). These read as holes/bars in the panel, not image content. Round-0 tweak 1's "remove internal `K`" was not done.
5. **Cohesive MindFrame palette + motifs? YES.** Muted indigo/violet `M`/`D`/`d` walls + magenta `o`/`O` accent is squarely MindFrame. Soft-glow data screen (central), observation glass (side window), magenta accent strip, glow wash, and now a legible seating motif are all present.
6. **One-of-one signature present + legible + distinct? NO — this is the blocker (unchanged from round 0).**
   - **Heatmap: PARTIAL.** Warm `o`/`O`/`h` hot-spots pool on the screen (e.g. rows 18-21 `ohOOg` / `hWhhhh` / `OOOg`), so a heat *gradient* is implied — but it floats in noise with no faint framed stimulus underneath, so it never reads as "hot blobs over a picture."
   - **Numbered scan-path: STILL ABSENT.** The decoding signal — the whole point of this building — is missing. There are NO digit glyphs (1→6) anywhere on the screen, and no chain of discrete fixation dots connected by thin `o` saccade lines. The screen interior (cols ~31-44, rows 16-25) is a uniform field, not a sequence. Round-0 tweak 2 was not addressed.
   - **Stimulus image: ABSENT.** No recognizable framed picture base (face oval / photo rect / horizon) for the heat + path to sit on. Round-0 tweak 1 not addressed.
   - **IR cameras + headrest: IMPROVED but still soft.** Inside the booth opening (rows 33-39, cols ~30-41) there's now a legible `M`/`L`/`W` headrest cradle with a pink `o`/`O` head and two `O` glints above it (row 33 `OK...KOK`, row 36 `ODDDDOD`) — a real seat now reads. Good progress. But the "two distinct IR lenses + two angled beams" still resolve as scattered pink ticks rather than clearly-stereo cameras casting two beams; the camera-bar lenses aren't individuated.
   **Net: a viewer still cannot decode "gaze heatmap + numbered scan-path over an image." The hero fails its own spec.**
7. **Attractive? YES.** Strong silhouette, appealing glow, nice violet/magenta cohesion. The angled-screen-on-an-arm carrel reads well at thumbnail size and is genuinely charming.
8. **Unique built form + opening on RIGHT + glowing? YES.** A compact booth fronted by a big ANGLED stimulus display cantilevered on a short arm — clearly NOT the gateway cube and clearly NOT a giant eyeball. Opening + glow are correctly on the SHADED-RIGHT face (the `D` wall carries the bright `o`/`O` content and the screen's glow wash). Assigned RIGHT side satisfied.

## Tweak list (numbered, painter-actionable) — focus the whole pass on the SCREEN

1. **Lay down a faint framed stimulus image FIRST, then heat over it.** Clear the uniform `G/g/c/h/o/O/W/M` scatter in the screen interior (rows ~17-25, cols ~31-44). Paint a quiet base picture in `c`/`M` — e.g. a `c` "photo" rectangle with one `L`/`M` recognizable shape (a face oval or a horizon line). Then pool just 2-3 soft heatmap blobs grading `g`→`o`→`O` (cool center → hot edge) over the high-attention spots. The image must be calm enough that the heat + path read on top of it.
2. **Add the NUMBERED scan-path — this is the non-negotiable hero.** Place 5-6 distinct `h`/`W` fixation dots across the stimulus, connect them in viewing order with thin `o` saccade lines, and tag each dot with a tiny `O` numeral 1→6 (even 1px ticks reading as digits). Without legible numbers + a connected chain, this building is indistinguishable from "a glowing screen."
3. **Remove the internal `K` blocks from the screen interior** (e.g. row 20 cols ~33-34, row 23 cols ~37-40). They punch holes/bars in the glass. The screen should carry only a clean 1px `K` frame border — no `K` inside except as deliberate scan-path/image linework.
4. **Individuate the two IR cameras on the under-bar.** On the camera bar slung under the display lip, draw two separate small `c` lens dots (1-2px each) with one `O` glint pixel on each, and two thin `o`/`O` beams angling down-left toward the headrest. The seat is now a good target — give it two clearly-stereo eye-trackers.

## Optional polish (after the above)
- One `O` highlight pixel at the top-left screen corner for glass sheen.
- Thin the `o`/`O` roof accent strip to 1px to sharpen the roofline.
