# Review: Behavioral Lab (mindframe) — round 1

**VERDICT: SHIP**

All three round-0 blockers are resolved. The chamber front now reads as a lit glass field (not a black-barred panel); the A/B choice panel resolves as two distinct lit buttons with a readout; the right face of the front box reads as a silvered one-way mirror with a real sheen sweep; and the two volumes now have a clear height step with separate stepped-back roofs. The hero signature (human A/B decision, magenta accent, watched-through-glass) lands and the form is unique versus the gateway cube and its MindFrame siblings. Remaining items are minor polish, not contract failures or regressions, so this ships.

## Per-criterion notes

1. **Iso 2:1?** PASS. Wall verticals and the 2:1 edges are clean; both roof diamonds follow correct isometric slope. No broken iso.

2. **Roof visible?** PASS. Two flat `M` roof faces in 3/4 top-down, each with a `D` parapet curb, the chamber roof clearly higher and the observation-room roof a distinct lower diamond. The `o`/`O` magenta accent strip runs the chamber roof lip cleanly (rows ~17–21), and a small `c` camera nub reads near the mirror-wall corner.

3. **Front corner faces viewer?** PASS. The near vertical corner (col ~10) is the viewer-facing edge; the lit chamber pane splays left and the mirror panel splays right correctly.

4. **Sharp/clean/in-palette/clean K outline/no strays — and do glass + mirror read as GLASS?** PASS.
   - Outline & palette: hard continuous `K` perimeter, all glyphs in the 13-color MindFrame set, no off-palette pixels, no anti-alias, no strays.
   - **Glass read FIXED.** The chamber pane is now a coherent `G`/`g`/`h` lit glass field with sheen and a `K`-framed inner panel sitting *inside* the lit field — it reads as a lit window with a story behind it, not a black box with confetti. The round-0 ~97-`K` black-barred field is gone.
   - **One-way mirror FIXED.** The right face of the front box (cols ~39–50, the bright `c`/`h`/`W` panel) now reads as a silvered mirror: a continuous glass field, a clear diagonal `h`/`W` sheen sweep, and a frame. No longer a dark seam/crack.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet `M`/`D`/`d` walls, magenta `o`/`O` accents, `h`/`c`/`W` highlights — correct MindFrame mood. Motifs now read, not just nominally present: one-way mirror (right panel), clean observation glass (chamber pane), soft-glow data screen (A/B panel + readout), seating/subject (implied at the panel), gentle magenta accent (roof lip + button + needle glow).

6. **One-of-one signature present + legible + distinct (A/B + needle, human not animal)?** PASS (the round-0 blocker is cleared).
   - **A/B two-button panel:** the `K`-framed mini panel now resolves as a clear pair — a `c`/`h` lavender button (A) and a bright `o`/`O`/`h` pink button (B) side by side in the top row, with a lower readout strip beneath. "Two options" reads at 2× and is parseable at 1×.
   - **Predicted-choice needle / magenta lean + ghost-press:** the magenta `o`/`O` cluster concentrates on the B (pink) side with an `O` ghost-press accent, giving the "model leaned toward B before the press" read. Legible, if subtle — see polish #1.
   - **Reaction-time readout:** the lower strip under the buttons reads as a small meter/readout rather than the round-0 vertical glow column.
   - **Human, not animal:** PASS — no path, no heat-map, no maze, no creature. It reads as a person-at-a-choice-panel experiment, distinct from BioCore's vivarium.

7. **Attractive?** PASS. The interior is no longer muddy noise — the lit pane, framed panel, and silvered mirror compose cleanly, the roof lip accent pops, and the eye goes to the LEFT hero pane as intended. Pleasant, clean, characterful.

8. **UNIQUE built form (two-part block, opening LIT-LEFT)?** PASS.
   - Opening LEFT: hero glazing (chamber pane + framed A/B panel) is on the front-left face — correct assigned side.
   - Two-part block FIXED: the chamber is clearly taller and the observation room is stepped back and visibly lower with its own separate roof and plainer face (clean `M`/`D` with one `louver` vent + one small `c`/`g` window). Reads unmistakably as two abutting boxes of different heights — distinct from the Interview booth, the Focus Group pit, and the gateway cube.

## Round-0 issue resolution

1. **Black-barred observation pane (~97 K cells) → lit glass with dark detail on top:** RESOLVED. Pane is now a lit `G`/`g`/`h` glass field with the framed panel silhouetted inside it.
2. **A/B + needle + RT didn't resolve → two distinct buttons + clean leaning needle + RT readout:** RESOLVED. Two distinct buttons (A lavender / B pink) + a magenta lean toward B + a lower readout strip all read. (Needle/RT legibility is good-but-subtle; polish only.)
3. **Near-equal volumes with mirror as a dark seam → clear height step + silvered one-way mirror:** RESOLVED. Clear height step between the two stepped roofs, and the shared/right face is a silvered sheen-and-frame mirror panel, not a dark crack.

## Polish notes (optional — NOT blocking; do not regress the above if attempted)

1. **Needle pop.** The predicted-choice lean reads more as a bright B button than as a discrete leaning arrow. If a future pass touches this sprite, one `O`-tipped 2–3px `o` needle pivoting between the two buttons toward B (with the `K` gutter kept) would sharpen the "prediction pre-press" beat. Subtle today, acceptable at sprite scale.
2. **Seated subject.** The human figure is implied by the panel rather than shown as a separate `d`/`D` seated silhouette. A 3–4px seated figure to the panel's left would make the "person choosing" read explicit — nice-to-have, not required, and not worth risking the now-clean pane.
3. **RT strip contrast.** The lower readout strip reads as a meter but its climbing `o` ticks are quiet; a touch more `o`/`O` contrast on the bar would help at 1×. Minor.
