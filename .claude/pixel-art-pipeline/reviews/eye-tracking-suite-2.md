# Review: Eye Tracking Suite (mindframe) — round 2

**VERDICT: TWEAK**

Real progress on the blocker: the screen is no longer uniform static. The interior now sits on a dark `d` base with ~3 distinct cool→hot heatmap blobs (white `W` cores haloed in `h`, grading from `G`/`g` purple) and faint `c`/`L` patches that hint at an underlying image. The internal `K` holes from round 1 are gone, and the booth/headrest/IR cameras remain good. BUT the non-negotiable hero — a CONNECTED, ORDERED scan-path — is still missing: there is exactly **1** `o` saccade-line pixel inside the whole screen, no chain linking dot→dot, and no readable viewing order. The screen now reads as a "heatmap / scatter of hot-spots," not as "a decoded gaze path." One more focused pass on the connecting line + order.

## Per-criterion

1. **Iso 2:1? YES.** Booth top (rows ~26-31) and the cantilevered display slab follow clean 2:1 diagonals; pedestal/shadow base (rows 48-51) reads correctly. No broken stair-stepping.
2. **Roof visible? YES.** Small flat `M` booth roof with `D` curb and a soft `o`/`O` magenta accent (rows ~26-29, left mass) is visible; the angled display correctly rises above it as the dominant mass.
3. **Front corner faces viewer? YES.** Near vertical `K` seam separates the lit-LEFT booth face from the shaded-RIGHT face. Correct orientation.
4. **Sharp/clean/in-palette/K outline/glass-not-barred? YES (regression from round 1 fixed).** Crisp single-pixel edges, hard `K` outline, all in-palette, no strays. The internal `K` blocks that punched holes in the glass are gone — the only `K` deep in the screen is at row 16 cols 42-45, which is the top-right frame boundary stepping down, not a hole. The lit-LEFT side window still reads as real GLASS (sheen + `K` frame). Glass reads as glass now.
5. **Cohesive MindFrame palette + motifs? YES.** Indigo/violet `M`/`D`/`d` walls + magenta `o`/`O` accent is squarely MindFrame. Soft-glow data screen, observation glass, magenta accent strip, glow wash, and the headrest seating motif are all present.
6. **One-of-one signature present + legible + distinct? NO — still the blocker, though improved.**
   - **Heatmap: YES (new this round).** ~3-4 distinct blobs grade cool→hot: top-left rows 15-17 cols ~29-33 (`G`→`g`→`h`→`W`), mid rows 20-22 cols ~43-45 (`h##h`), lower-right rows 25-28 cols ~42-46 (`G`→`h`→`W`→`O`). These read as gaze hot-spots over the field. Good — this is the part that fixed the "uniform static" complaint.
   - **Faint stimulus image: PARTIAL.** Cooler `c`/`L` patches (rows 17-25) hint at an underlying picture, but there's no clean framed rectangle / recognizable shape, so the heat reads as floating on noise rather than "over a photo."
   - **Connected ordered scan-path: STILL ABSENT — this is the failing point.** The fixation dots (the bright `h##h` cores) exist, but they are NOT connected: only **1** `o` saccade-line pixel sits inside the entire screen interior, so there is no thin line tracing dot→dot. The bright `O` pip runs (`@@@` at rows 18, 23, 27-29) act as loose order-ticks but do not form a chain and do not read as an ordered sequence. A viewer sees a scatter of hot blobs, not "the eye jumped 1→2→3→4 across the image." Per the round-2 brief, this connected scan-path is exactly what this pass had to deliver, and it is not yet legible.
   **Net: the screen now reads as a HEATMAP, but not as "heatmap + connected scan-path." The hero is half-landed.**
7. **Attractive? YES.** Strong silhouette, appealing glow, nice violet/magenta cohesion; the angled-screen-on-an-arm carrel reads well at thumbnail size.
8. **Unique built form + opening on RIGHT + glowing? YES.** A compact booth fronted by a big ANGLED stimulus display cantilevered on a short arm — clearly NOT the gateway cube and clearly NOT a giant eyeball. Opening + glow correctly on the shaded-RIGHT face. IR cameras + headrest: legible cradle (rows 37-40 cols 31-35) with a small head, two `O` glints (row 36 cols 33 & 38), and IR `O`/`o` marks — stereo trackers now read.

## Tweak list (numbered, painter-actionable) — focus on the CONNECTING LINE + ORDER

1. **Draw the connecting saccade line — the non-negotiable hero.** You have the fixation dots; now LINK them. Pick 5-6 of the bright `h##h` cores as the path nodes and connect them in a single chain with a thin continuous `o` line (1px, stepping diagonally dot→dot). Right now the screen has only 1 `o` pixel inside it — a connected chain needs roughly 8-14 `o` pixels stitching the dots into one route. This single change is what turns "heatmap scatter" into "gaze scan-path."
2. **Make the order legible.** After the line connects the dots in sequence, tag the path with a clear START and a clear progression — e.g. a slightly bigger/brighter `W` core on dot 1, and let the `O` pips sit beside each successive dot as ascending order-ticks ALONG the line (not floating). Even at ~19×16px, an eye should be able to follow the chain head-to-tail. (Digits 1→6 are not required at this size, but the path must read as ordered, not random.)
3. **Anchor the heat to a faint framed image.** Tidy the `c`/`L` patches into one quiet framed shape (a small `c` photo rectangle with one `L`/`M` form, e.g. a face oval or horizon line) so the heatmap and path visibly sit OVER a picture rather than over noise. Keep it dim so the dots/line pop.

## Already-fixed this round (do not undo)
- Uniform static replaced by a dark base with real cool→hot heatmap blobs.
- Internal `K` holes in the glass removed (clean frame only).
- IR cameras / headrest / two glints reading well.
