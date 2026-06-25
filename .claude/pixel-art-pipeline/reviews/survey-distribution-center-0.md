# Review: Survey Distribution Center (mindframe) — round 0
**VERDICT: TWEAK**

Rendered preview judged against `art/pixel-art-pipeline/blueprints/survey-distribution-center.md` and the visual contract. The built form, palette, and left face are largely right; the failure is on the assigned HERO right face (the painter's own flagged weak spot) plus low legibility on the signature's dart/card/bin elements.

## Per-criterion

1. **Isometric 2:1?** PASS. Wall edges follow a clean 2:1 stair; the wide depot box and stepped annex share consistent iso angles. No skew.

2. **Roof visible 3/4 top-down?** PASS. The flat `M` depot roof reads as a top plane with the hopper plinth sitting on it; viewer looks down onto the roof correctly.

3. **Front corner faces viewer?** PASS. The near vertical corner (center, where lit-left depot face meets shaded-right annex) points at the viewer; left face is lit, right face shaded — correct.

4. **Sharp / clean / in-palette / clean K outline / no strays — glass-vs-louver?** MIXED.
   - Outline + crispness: mostly clean single-pixel `K` edges, in-palette.
   - **Stray pixel:** an isolated `c`/lilac pixel floats detached above the roof, top of the dart plume region (around the gap between hopper and tally board) — disconnected from any form against transparency. Clean it up or connect it into the dart arc.
   - **Glass reads as glass:** PARTIAL. The two LEFT sorting panes read as glass (`g`/`c` violet fill + `h`/`o` sheen, `K` frame) — good. But on the RIGHT the glowing mailroom "window" is an amorphous pink blob with no frame and no distinct sheen — it does not read as a framed glass pane.
   - **Vents read as opaque louvers distinct from glass:** FAIL. No louver band is legible on the right annex face. The blueprint calls for a `Box.louver` opaque-slat HVAC band; I cannot find slats distinct from the glow — the lower-right of the annex is an undifferentiated dark mass.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet walls (`M`/`D`), magenta accent (`o` roof-curb strip + hopper rim + tally bar) all present; data-screen glow (tally board), observation glass (left panes) honored. Palette is on-spec and attractive in hue.

6. **One-of-one signature present + legible + distinct?** PARTIAL — present but under-legible.
   - **Rotary hopper:** reads OK — oval `o`/`h` rim drum on the roof plinth. Good, distinct from Operations' dish.
   - **Tally board:** reads WELL — `K`-framed `c`/`g` panel with a climbing `o`/`O` magenta bar rising diagonally toward a target. Best-executed signature element. (Minor: it floats fully detached in mid-air to the right rather than anchored to the roof edge per blueprint.)
   - **Outgoing questionnaire darts:** WEAK. The up-left spray reads as a smoke/steam plume or generic particle stream, NOT a fan of 4–5 folded-paper darts. No discrete dart shapes, no `o` question-marks/corners. A viewer would not say "darts."
   - **Returning response cards + sorting bin:** FAIL to read. The arch/"n"-shaped `K` glyphs between hopper and tally are ambiguous abstract shapes; they don't read as filled response cards with tick-rows, and there is no legible `D` sorting bin with `O` glow catching them. The "cards stream back in" half of the diagnosis story is missing.

7. **Attractive?** PARTIAL. Silhouette, color, and the tally board are appealing. Dragged down by the muddy right face and the unreadable dart/card story — the busiest, most important corner is the least legible.

8. **Unique built form + opening on assigned RIGHT face + glowing on shaded side?** PARTIAL.
   - **Built form:** PASS. Genuinely a wide low horizontal depot with a stepped-down loading annex — not the gateway cube, distinct from tower/round siblings. Good.
   - **Opening on RIGHT + glowing on shaded side:** PARTIAL. The glow IS on the shaded right face (correct side), but the OPENING does not read: the wide `K`-framed loading-dock bay is not legible as a framed dock entrance, and the three sub-elements (dock bay / mailroom window / louver band) collapse into one dark blob. This is exactly the painter's flagged weak spot — and it did not survive. The three do NOT read as separate.

## Tweak list (numbered, painter-actionable)

1. **Separate the three right-annex sub-elements vertically and frame each.** Give the loading-dock bay its own clear wide `K`-framed rectangular opening (recessed darker interior, `K` top lintel + side jambs) as the LOWER band; put the glowing mailroom window as a distinct `K`-framed pane ABOVE/beside it; put the opaque louver band as a third clearly-separated strip. Insert at least a 1px `M`/`D` wall gutter between each so they don't touch.

2. **Make the mailroom window read as GLASS, not a blob.** Add a `K` frame around it, fill with bright `c`/`O` lit interior, and add a single clean `h` diagonal sheen streak. It should look like a glowing framed pane on the shaded face, mirroring the quality of the two LEFT sorting panes.

3. **Make the louver band read as OPAQUE slats.** Use 3–4 horizontal `D`/`d` dark bars with thin `K` gaps — flat, no sheen, no glow — so it is unmistakably a vent, distinct from the glowing window above it. Currently no louvers are legible.

4. **Redraw the outgoing darts as discrete folded-paper darts.** Replace the diffuse plume with 4–5 small distinct `W`/`L` chevron/triangle dart shapes fanning out, each with a tiny `o` question-mark or `o` corner dot, with clear gaps between them — so it reads as flung questionnaires, not steam. Keep at most a couple of faint `h`/`c` motion-ghost pixels, not a continuous spray.

5. **Make the returning response cards + sorting bin legible.** Render 3–4 small `c`/`h` rectangular cards (each with 1–2 `K`/`d` tick-rows) streaming down the OTHER side of the hopper into a clearly-shaped `D` sorting bin with an `O` glow rim. Right now these read as ambiguous arch glyphs — give them flat card silhouettes and a defined bin.

6. **Anchor the tally board to the roof edge.** It currently floats fully detached in mid-air. Connect it to the roof curb (or a short `D` post) so it reads as mounted on the building, not hovering.

7. **Remove the stray detached pixel** above the roof in the hopper/dart gap (isolated `c`/lilac pixel against transparency) — either delete it or fold it into the dart arc.
