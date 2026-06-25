# Review: Survey Distribution Center (mindframe) — round 1
**VERDICT: TWEAK**

Rendered preview `art/preview/buildings/mindframe_survey-distribution-center.png` (and the 64×64 source render `apps/web/public/sprites/buildings/mindframe/survey-distribution-center.png` / `art/src/buildings/mindframe_survey-distribution-center.json`) judged against the blueprint + visual contract.

**Regression note / key finding:** This revision is effectively a NO-OP. The round-1 render is visually identical to round-0 in every region I inspected (right-annex hero face, rooftop dart plume, return-card column, stray pixels). I diffed it region-by-region at native 64×64 resolution. None of the seven round-0 tweaks landed: the right face is still one muddy blob with a frameless pink glow (no separated dock / window / louver), the darts still read as a steam/sparkle plume rather than folded-paper darts, the returning cards + sorting bin still read as an ambiguous vertical glyph stack, and the stray detached pixels in the dart region remain. The built form, palette, left-face glass, hopper, and tally board remain good (as in round 0). Cannot SHIP — the hero face and half the signature story are still illegible.

## Per-criterion

1. **Isometric 2:1?** PASS. Wall edges follow a clean 2:1 stair across the wide depot box and stepped annex; consistent iso angles, no skew.

2. **Roof visible 3/4 top-down?** PASS. Flat `M` depot roof reads as a top plane; viewer looks down onto it with the hopper plinth seated correctly.

3. **Front corner faces viewer?** PASS. Near vertical corner (lit-left depot face meeting shaded-right annex) points at the viewer; left lit, right shaded — correct.

4. **Sharp / clean / in-palette / clean K outline / no strays — glass-vs-louver distinct?** FAIL (unchanged from round 0).
   - Outline + crispness: mostly clean single-pixel `K` edges; 13 colors, within the ≤16 cap, in-palette.
   - **Stray pixels NOT cleaned:** the upper-left dart region (rows ~11–18) still has detached 1–2px `L`/`W`/`o` clusters floating against transparency — the round-0 stray issue persists.
   - **Glass reads as glass:** PARTIAL. The two LEFT sorting panes still read as glass (good). The RIGHT mailroom "window" is still an amorphous pink glow smear with NO `K` frame and NO distinct `h` sheen streak — does not read as a framed glass pane.
   - **Vents read as opaque louvers distinct from glass:** FAIL. No legible horizontal-slat louver band on the right annex face; the lower-right `dd`/`r` runs are wall shading, not opaque slats with `K` gaps. Glass-vs-louver distinction is absent.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet `M`/`D` walls, `o` magenta accent (roof curb + hopper rim + tally bar), data-screen glow (tally board), observation glass (left panes) all honored. On-spec, attractive hue.

6. **One-of-one signature present + legible + distinct?** PARTIAL — present but half-illegible (unchanged).
   - **Rotary hopper:** reads OK — `o`/`h` rim drum on the roof plinth; distinct from Operations' dish. Good.
   - **Tally board:** reads WELL — `K`-framed `c`/`g` panel with a climbing `o`/`O` magenta bar toward a target line; mounted on a post. Best-executed element.
   - **Outgoing questionnaire darts:** WEAK (unchanged). The up-left spray is still a diffuse steam/sparkle plume of soft blobs — no discrete folded-paper chevron/triangle darts, no `o` question-marks/corners. A viewer would not say "darts."
   - **Returning response cards + sorting bin:** FAIL (unchanged). The vertical `K`/`d` glyph column between hopper and tally is still ambiguous — no flat card silhouettes with tick-rows, no defined `D` sorting bin with `O` glow rim. The "cards stream back" half of the diagnosis story is missing.

7. **Attractive?** PARTIAL. Silhouette, color, hopper, and tally board are appealing; dragged down by the muddy right face and the unreadable dart/card story — the busiest, most important corner remains the least legible.

8. **Unique built form + opening on assigned RIGHT face + glowing on shaded side?** PARTIAL (unchanged).
   - **Built form:** PASS. Genuinely a wide low horizontal dispatch depot with a stepped-down loading annex — not the gateway cube, distinct from tower/round siblings.
   - **Opening on RIGHT + glowing:** PARTIAL. The glow IS on the shaded right face (correct side), but the OPENING does not read: no legible framed loading-dock bay, and the three sub-elements (dock bay / mailroom window / louver band) still collapse into one dark blob. The painter's flagged weak spot did not survive — the three do NOT read as separate.

## Tweak list (numbered, painter-actionable) — RE-APPLY round-0 fixes; this revision did not change them

1. **Separate the three right-annex sub-elements vertically and frame each.** Give the loading-dock bay its own clear wide `K`-framed rectangular opening (recessed darker `K`/`d` interior, `K` top lintel + side jambs) as the LOWER band; place the glowing mailroom window as a distinct `K`-framed pane ABOVE it; place the opaque louver band as a third clearly-separated strip. Keep a 1px `M`/`D` wall gutter between each so they don't touch.

2. **Make the mailroom window read as GLASS, not a glow smear.** Wrap it in a `K` frame, fill with bright `c`/`O` lit interior, and add ONE clean `h` diagonal sheen streak — matching the quality of the two LEFT sorting panes, just brighter so it reads on the shaded face.

3. **Make the louver band read as OPAQUE slats.** Use 3–4 horizontal `D`/`d` dark bars with thin `K` gaps — flat, no sheen, no glow — unmistakably a vent, distinct from the glowing window above. (Do not reuse the magenta `r` wall pixels for this; they read as accent, not slats.)

4. **Redraw the outgoing darts as discrete folded-paper darts.** Replace the diffuse plume with 4–5 distinct small `W`/`L` chevron/triangle dart shapes fanning out, each with a tiny `o` question-mark or `o` corner dot and clear gaps between them. Keep at most a couple of faint `h`/`c` motion-ghost pixels — not a continuous spray.

5. **Make the returning response cards + sorting bin legible.** Render 3–4 small `c`/`h` rectangular cards (each with 1–2 `K`/`d` tick-rows) streaming down the OTHER side of the hopper into a clearly-shaped `D` sorting bin with an `O` glow rim. Replace the current ambiguous vertical glyph column.

6. **Anchor the tally board cleanly to the roof edge.** It reads as mounted but on a thin floating post; thicken/shorten the `D` post (or seat it on the roof curb) so it reads as firmly attached.

7. **Remove the stray detached pixels** in the upper-left dart/hopper gap (isolated `L`/`W`/`o` clusters against transparency) — delete them or fold them into the dart arc.
