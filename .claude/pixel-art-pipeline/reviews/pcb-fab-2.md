# Review: PCB Fab (volt_lab) — round 2

**VERDICT: TWEAK**

The pit is gone — but the painter over-corrected. The central hero is now a smooth bright-grey **mound/dome**, not a chip: no dark DIP body, no pin rows, no rectangular silhouette, no orientation notch. It reads as a generic skylight blob. The r1 critical test ("does the chip read as a RAISED 3D chip with a bright lit top face AND visible pins, NOT a dark pit?") still fails — this time for absence of chip identity rather than a recess. Pins (the #1 "this is an IC" cue) are still completely missing, the cyan traces are disconnected stubs instead of a routed network, and there is no lit current pulse on the roof (only 4 `O` pixels exist in the whole sprite, all on the lower side face — not a roof trace). The box, palette, and pads are good; the signature prop is still not landed. Third strike on the same issue.

## Per-criterion

1. **Isometric 2:1 — PASS.** Clean 2:1 iso box; geometry correct and unchanged.
2. **Roof visible (3/4 top-down) — PASS.** Roof diamond fully visible and dominant.
3. **Front corner faces viewer — PASS.** Vertical front corner splits the two side faces correctly.
4. **Sharp / clean / in-palette — PASS.** Hard `K` outline crisp; 12 palette colors in use (`G` now unused, no off-palette strays, no blur). Edges are single-pixel.
5. **Cohesive Volt Lab palette + motifs — PASS.** Steel-grey + gold + cyan present; corrugated `D` frame, conduit ribbon, cyan side readout windows, gold pads all honored.
6. **One-of-one signature — FAIL (critical, 3rd time).** The roof no longer reads as a live circuit board with a DIP chip:
   - **No chip.** The center (rows 15–19, cols ~30–40) is a rounded `W/L` light-grey mound. It has no dark body, no flat rectangular top edge, no pins, no notch — it reads as a dome/skylight, not an IC. The r1 ask was *invert the value so the lit TOP face dominates while keeping a thin dark shadow edge and adding pins*; instead the entire chip identity was deleted into a featureless blob.
   - **Pins still absent.** There is no `M` pin column with `K` gaps down either iso-facing chip edge. Still the single biggest miss.
   - **Traces are stubs, not a network.** Cyan (`g/c`) appears only as short 2–3px dashes flanking the mound and along the front-roof lip — they don't snake between the gold pads as routed board art. The blueprint's "network of thin cyan traces connecting gold pads" is not present on the roof field.
   - **No current pulse on the roof.** Only 4 `O` pixels exist in the sprite and they sit on the lower-right *side face* (rows ~24–30), not as a lit `o/O` dash running along a roof trace. There is no readable "powered/alive" pulse.
   - **No orientation notch.** The r1 `G` notch was removed and not replaced with a bright `g`/`c` pin-1 dot.
7. **Attractive — PARTIAL.** Box, corrugated frame, side windows, and gold pads look clean and appealing. But the central mound is the focal point and now looks like an undefined grey lump, so the roof doesn't deliver the "wow, the roof is a circuit board" payoff.

## R1-fix audit
- Chip no longer a dark pit — **TECHNICALLY LANDED, but over-corrected** (now a featureless light blob; chip identity lost).
- Chip reads as a raised DIP IC — **NOT LANDED** (no chip silhouette at all).
- Pins added — **NOT LANDED.**
- Orientation notch recolored to bright `g` and placed on lit top face — **NOT LANDED** (removed entirely).
- Current pulse strengthened to a continuous lit dash on a roof trace — **NOT LANDED** (no roof pulse; stray `O` on side face).
- Routed trace network between pads — **REGRESSED** (r1 had continuous `g` runs flanking the chip; r2 has only short stubs).

## Painter-actionable tweaks

1. **Rebuild the DIP chip as a recognizable rectangular block, roof-center (cols ~30–40, rows ~14–22).** Draw an actual chip footprint:
   - **Top face:** a flat **rectangular** lit plane in `L #cdd6dd` with a `W #eef2f6` highlight on the back-left half — keep it rectangular (follow the 2:1 iso, so the top is a small diamond/parallelogram), NOT the current rounded mound. The straight edges are what make it read as a chip.
   - **Body sides:** a **thin** dark band — `K #15181d` on the front-lower edge, `d #49515b` on the right-lower edge — 1–2px only, so it reads as a low proud block, not a pit and not a dome.
2. **Add pins (the #1 IC cue — still missing after 3 rounds).** Down each of the chip's two iso-facing long edges, run an evenly-spaced column of `M #9aa3ad` pin pixels with `K` gaps between them (e.g. M-K-M-K-M). This single change is what makes it unmistakably an IC.
3. **Add the orientation notch.** Place ONE bright `c #aef0fb` (or `g #38cfe2`) pixel at the back-left corner of the lit top face as the pin-1 dot. Must sit on the light top face so it actually reads.
4. **Route real traces between the pads.** From the chip's pins, run continuous 1px `g #38cfe2` traces (right-angle / iso-diagonal) across the open roof field to the existing gold `ror` pads — at least 3 traces that visibly connect chip→pad, replacing the current disconnected stubs.
5. **Put a current pulse ON a roof trace.** Pick one chip→front-pad trace and light a continuous 3–4px dash: `O #fff7a8` core flanked by `o #ffe85a`. Move/replace the 4 stray `O` pixels currently on the lower side face — the pulse belongs on the board, not the wall. Push exactly one solder pad to full `O` bright as the powered terminus.
6. **(Only after 1–5) SMD texture.** Scatter 2–3 small `D` surface-mount chips and one `c` cylindrical capacitor can on the now-open roof quadrants for circuit texture.

Do not ship until the central prop reads as a chip (straight edges + pins + notch) and at least one lit trace pulse runs across the roof. Right now it reads as a grey dome.
