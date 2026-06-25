# Review: Survey Distribution Center (mindframe) — round 3
**VERDICT: TWEAK**

Judged `art/preview/buildings/mindframe_survey-distribution-center.png` + the native 64×64 render `apps/web/public/sprites/buildings/mindframe/survey-distribution-center.png` / source `art/src/buildings/mindframe_survey-distribution-center.json` against the blueprint + visual contract. Inspected at native resolution and via per-pixel char/color-class grids of the annex right face, the tally board, and the depot roof.

**Headline:** The round-3 fix did NOT land. The one remaining round-2 blocker was the opaque LOUVER vent on the right face, and it still does not read as a separate slatted element. The annex right (shaded) face carries exactly TWO readable framed elements — a glowing glass mailroom window and the loading-dock bay — not three. The only `dDd` strip in the entire sprite is the **tally-board mounting post** (cols 47–49, rows 27–32, capped `KKK` under the board frame at rows 19–26), which is on the roof, not the annex face. No flat horizontal 3-slat band exists. Color-class mapping of the annex face (rows 35–50) shows opaque `D`/`d` pixels only as (a) the descending iso wall-edge staircase and (b) the dock-bay recess fill — never an isolated, K-gapped, magenta-free slat band. Everything else holds and the window frame is now cleaner, so this is a narrow TWEAK, but SHIP requires all three right-face elements to read separately and the third still does not.

## Per-criterion

1. **Isometric 2:1?** PASS. Clean 2:1 stair across the wide depot box and stepped annex; consistent angles, no skew.

2. **Roof visible 3/4 top-down?** PASS. Flat `M` depot roof reads as a top plane; hopper plinth + tally post seated on it; viewer looks down onto it.

3. **Front corner faces viewer?** PASS. Near vertical corner (lit-left depot face meeting shaded-right annex face) points at the viewer; left lit, right shaded — correct.

4. **Sharp / clean / in-palette / clean K outline / no strays — glass-vs-louver distinct?** PARTIAL → still FAIL on the louver.
   - Outline + crispness: clean single-pixel `K` edges overall; **13 colors, all in-palette**, under the ≤16 cap. No stray/floating pixels against transparency.
   - **Window reads as GLASS:** YES, and improved. The annex window (cols ~50–52, rows 38–44) is a `K`-framed `h`/`c`/`g` glass cluster with sheen and a lit glow — reads as a glowing glass pane on the shaded face. The tally board (cols 44–51, rows 19–26) is also now a tidy `K` rectangle (round-2 tweak 2 effectively addressed).
   - **Louver reads as opaque slats distinct from glass:** **FAIL — unchanged from round 2.** There is no horizontal 3-slat opaque band on the annex face. The `dDd` vertical strip is the tally-board post, not a vent. The remaining opaque pixels are absorbed into the iso wall staircase and the dock recess. The required glass-vs-louver third distinction is still not delivered.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet `M`/`D` walls, `o` magenta accent (roof curb + hopper rim + tally glow + dock glow), data-screen glow (tally board), observation glass (left sorting panes + right mailroom window). On-spec, attractive hue.

6. **One-of-one signature present + legible + distinct?** PASS.
   - **Rotary hopper:** reads — `o`/`h`-rimmed drum on the center-roof plinth, distinct from Operations' dish.
   - **Outgoing darts:** read — a fan of discrete `W`/`L` folded-paper darts with `o` magenta tips arcing out the upper-left toward the field.
   - **Returning cards + sorting bin:** read — framed `c`/`W` card silhouettes stream down into a `K`-walled bin with an `O`/`o` glow.
   - **Tally board:** reads well — `K`-framed `h`/`g`/`c`/`O` glowing panel on a post with a climbing magenta read. The full diagnosis story (fling → return → count) is present and legible.

7. **Attractive?** PARTIAL → mostly yes. Silhouette, color, hopper, darts, card/bin, and the two glowing right-face openings are all appealing. The only drag is that the annex face has a quiet expanse of plain `M` wall below the window/dock where the third (louver) element should sit, so the face reads slightly under-furnished rather than the busy three-framed mailroom the contract asks for.

8. **Unique built form + opening on assigned RIGHT face + glowing, 3 right-face elements separate?** PARTIAL → close but short.
   - **Built form:** PASS. Genuinely a wide low horizontal dispatch depot with a stepped-down loading annex — not the gateway cube, distinct from tower/round siblings.
   - **Opening on RIGHT + glowing:** the opening IS on the shaded right annex face and IS glowing (correct side, correct glow). Window + dock bay read as two separate framed openings.
   - **Three right-face elements separate:** **FAIL.** Only window + dock read. The louver (3rd element) does not exist as a separate opaque slat band. SHIP requires all three; not met.

## Tweak list (numbered, painter-actionable) — narrow, 2 items

1. **Add the opaque louver band as a real, separate element on the annex right face — this is the only SHIP blocker.** On the quiet `M` wall of the annex right face (e.g. the area around cols ~50–55, rows ~45–49, below/beside the window and clear of the dock recess), paint a wide band of **3 short HORIZONTAL `D`/`d` slats with thin `K` gaps between them** — flat, opaque, NO `h`/`c`/`g` sheen, NO `o`/`O`/`r` magenta. Keep a 1px `M` wall gutter so it touches neither the glass window nor the dock bay. It must read at a glance as a dark, slatted vent distinct from the two glowing openings. (Do NOT count the tally-board post `dDd` strip — that is roof furniture, not a face vent.)

2. **Keep the three elements on quiet wall with clear 1px gutters.** After placing the louver, confirm the annex right face reads top-to-bottom as three discrete framed things — glowing glass window, opaque 3-slat louver, dock bay — each surrounded by clean `M`/`D` wall, no merging or speckle between them.

(Nice-to-have, not blocking: the right face would read busier/more mailroom-like if the window or a small card-slot detail were nudged to balance against the new louver, but two clean glowing openings + one clear louver is sufficient to SHIP.)
