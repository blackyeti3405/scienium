# Review: Survey Distribution Center (mindframe) — round 4
**VERDICT: SHIP**

Judged `art/preview/buildings/mindframe_survey-distribution-center.png` + the native 64×64 render `apps/web/public/sprites/buildings/mindframe/survey-distribution-center.png` / source `art/src/buildings/mindframe_survey-distribution-center.json` against the blueprint + visual contract. Inspected at native resolution, at 10× nearest-neighbor full view, and via cropped/zoomed + per-pixel char/color-class grids of the rooftop vent box and the annex right-face window.

**Headline:** The round-4 fix LANDED. The opaque louver was relocated to a rooftop vent box on the upper-left depot face and now reads unmistakably as a slatted, opaque vent — a clean vertical stack of alternating bright `W`/`L` highlight slats and dark `d`/`K` shadow gaps (cols 19–24, rows 25–33), using ONLY `W`/`L`/`d`/`K` (zero glass colors, zero magenta sheen). The annex right-face mailroom window remains a glowing `G`/`g`/`c`/`h`/`O` glass cluster with sheen and a lit glow. The two are now plainly distinct: opaque horizontal slats vs. glowing glass. No regressions — 13 colors, all in-palette, zero strays, full signature intact. This is a clean, legible, on-contract sprite. SHIP.

## Per-criterion

1. **Isometric 2:1?** PASS. Clean 2:1 stair across the wide depot box and stepped annex; consistent angles, no skew.

2. **Roof visible 3/4 top-down?** PASS. Flat `M` depot roof reads as a top plane; hopper plinth, tally post, and the new rooftop vent box all seated on it; viewer looks down onto it.

3. **Front corner faces viewer?** PASS. Near vertical corner (lit-left depot face meeting shaded-right annex face) points at the viewer; left lit, right shaded — correct.

4. **Sharp / clean / in-palette / clean K outline / no strays — glass-vs-louver distinct?** PASS.
   - Outline + crispness: clean single-pixel `K` edges throughout; **13 colors, all in-palette**, under the ≤16 cap; **0 off-palette / anti-alias pixels**; no floating strays against transparency.
   - **Vent reads as opaque LOUVER slats:** YES. The rooftop vent box (cols ~17–26, rows ~25–33) shows a clean stack of alternating bright slats (`WWWWWW` / `LLLLLL` rows 27, 30, 33) and dark shadow slats (`dddddd` rows 25, 28, 31) separated by `KKKKKK` gaps — 3+ high-contrast horizontal slats, each a 1px dark shadow + 1px bright highlight. Uses ONLY `W`/`L`/`d`/`K`: flat, opaque, NO `h`/`c`/`g`/`O` glass color, NO `o`/`r` magenta. Reads at a glance as a dark slatted vent.
   - **Window reads as GLASS:** YES. The annex window (cols ~45–51, rows ~37–44) is a `K`-framed `G`/`g`/`c`/`h`/`O` pink-violet glass cluster with a soft sheen gradient and a bright lit glow — clearly a glowing glass pane on the shaded face, with no slats.
   - The two are visually distinct — the round-4 glass-vs-louver requirement is met.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet `M`/`D` walls, `o`/`O` magenta accent (roof curb + hopper rim + tally glow + dock glow), data-screen glow (tally board), observation glass (left sorting panes + glowing right mailroom window), opaque ventilation (rooftop vent box). On-spec, attractive hue.

6. **One-of-one signature present + legible + distinct?** PASS.
   - **Rotary hopper:** reads — `o`/`O`/`h`-rimmed drum on the center-roof plinth, distinct from Operations' dish.
   - **Outgoing darts:** read — a fan of discrete `W`/`L` folded-paper darts with `o` magenta tips arcing out the upper-left toward the field.
   - **Returning cards + sorting bin:** read — `c`/`W` card silhouettes stream down into a `K`-walled bin with an `O`/`o` glow.
   - **Tally board:** reads — `K`-framed `g`/`c`/`h`/`O` glowing panel on a roof-edge post with a climbing magenta read. Full diagnosis story (fling → return → count) present and legible.

7. **Attractive?** PASS. Strong silhouette, cohesive color, legible hero, two glowing right-face openings, and the rooftop vent box now furnishes the upper-left so the building reads as a busy mailroom/depot rather than under-detailed. No quiet dead wall, no clutter.

8. **Unique built form + opening on assigned RIGHT face + glowing?** PASS.
   - **Built form:** Genuinely a wide low horizontal dispatch depot with a stepped-down loading annex — not the gateway cube, distinct from tower/round siblings.
   - **Opening on RIGHT + glowing:** the hero opening IS on the shaded right annex face and IS glowing (correct side, correct glow) — glowing glass mailroom window + `K`-framed loading-dock bay read as two separate framed openings on the right face.
   - **Opaque vent present + distinct:** the rooftop vent box delivers the legible opaque louver, distinct from the glass. (Per the round-4 note, the vent being a rooftop box rather than on the annex face is acceptable — what matters is a legible opaque vent + glass-that-reads-as-glass, both met.)

## Notes
- Round-3's sole blocker (no legible opaque louver distinct from glass) is resolved. Verified the slat band is opaque (`W`/`L`/`d`/`K` only) via per-pixel char grid, and the window is glass (`G`/`g`/`c`/`h`/`O` sheen cluster) — the two no longer collide.
- Palette/cleanliness re-checked programmatically: 13/16 colors used, 0 off-palette pixels, no strays.
- This is the final revision (round 4) and the sprite reads cleanly, on-contract, with the full signature and no regressions. Ships.
