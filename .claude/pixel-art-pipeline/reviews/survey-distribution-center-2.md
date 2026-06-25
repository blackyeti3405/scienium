# Review: Survey Distribution Center (mindframe) — round 2
**VERDICT: TWEAK**

Judged `art/preview/buildings/mindframe_survey-distribution-center.png` + the native 64×64 render `apps/web/public/sprites/buildings/mindframe/survey-distribution-center.png` / source `art/src/buildings/mindframe_survey-distribution-center.json` against the blueprint + visual contract. Inspected region-by-region at native resolution and via a per-pixel char grid of the right annex face.

**Headline:** Round 2 is a REAL improvement over the round-0/round-1 no-op — the darts now read as discrete folded-paper darts, the returning cards + sorting bin now read, and the right hero face has split into recognizable sub-elements. But it falls one element short of SHIP: of the three required right-face framed elements, the **glowing window** and the **dock bay** now read, while the **opaque louver vent does NOT exist as a separate slatted element** — there is no horizontal-slat band; that third frame is still absent/merged into the dock recess. The window frame is also jagged rather than a clean `K` rectangle. SHIP requires all three to read as separate, so: TWEAK (small, targeted).

## Per-criterion

1. **Isometric 2:1?** PASS. Clean 2:1 stair across the wide depot box and stepped annex; consistent angles, no skew.

2. **Roof visible 3/4 top-down?** PASS. Flat `M` depot roof reads as a top plane; hopper plinth seated correctly; viewer looks down onto it.

3. **Front corner faces viewer?** PASS. Near vertical corner (lit-left depot face meeting shaded-right annex) points at the viewer; left lit, right shaded — correct.

4. **Sharp / clean / in-palette / clean K outline / no strays — glass-vs-louver distinct?** PARTIAL → still FAIL on the louver.
   - Outline + crispness: clean single-pixel `K` edges overall; **13 colors, all in-palette**, under the ≤16 cap.
   - **Strays: CLEANED.** The detached upper-left `L`/`W`/`o` clusters from round 0/1 are gone — the dart pixels now belong to legible dart shapes along the arc, no floating debris against transparency.
   - **Window reads as GLASS:** YES (improved). Cols ~47–52, rows 38–42 carry `h` sheen + `c`/`g` glass + an `O`/`o` lit glow — reads as a lit glass pane on the shaded face. Frame is irregular/zigzag, though (see tweak 2).
   - **Louver reads as opaque slats distinct from glass:** **FAIL.** Per the char grid there is no horizontal-slat band — the large dark `d` rectangle (cols ~52–60, rows 35–49) is the DOCK BAY recess, and the only thing below it is an `O`/`r`/`o` magenta glow pool, not flat opaque slats with `K` gaps. The third required element is missing/merged. Glass-vs-louver distinction is therefore still not delivered.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet `M`/`D` walls, `o` magenta accent (roof curb + hopper rim + tally + dock glow), data-screen glow (tally board), observation glass (left panes + right window). On-spec and attractive hue.

6. **One-of-one signature present + legible + distinct?** PASS (much improved).
   - **Rotary hopper:** reads — `o`/`h` rim drum on the roof plinth, distinct from Operations' dish.
   - **Tally board:** reads well — `K`-framed `c`/`g` panel with climbing `o`/`O` magenta bar; now seated on a thicker post, reads as firmly mounted.
   - **Outgoing darts:** NOW READ. The upper-left arc shows ~3 discrete folded-paper dart shapes (`W`/`L` bodies, `o` magenta tips/corners) spaced in a fan — no longer a steam/sparkle plume. A viewer would say "darts." (Could push to 4–5 for a fuller fan, but it reads.)
   - **Returning cards + sorting bin:** NOW READ. ~2 framed `c`/`W` card silhouettes in `K` frames stream down, dropping into a defined `K`-walled bin with an `O`/`o` glow rim. The "cards stream back" half of the diagnosis story is present.

7. **Attractive?** PARTIAL → mostly yes. Silhouette, color, hopper, tally, darts, and card/bin all appealing; the only drag is the busy right-face center where the would-be louver zone is a noisy `d`/`M` scatter rather than a clean third frame.

8. **Unique built form + opening on assigned RIGHT face + glowing?** PARTIAL → close.
   - **Built form:** PASS. Genuinely a wide low horizontal dispatch depot with a stepped-down loading annex — not the gateway cube, distinct from tower/round siblings.
   - **Opening on RIGHT + glowing:** PARTIAL. Opening IS on the shaded right face and IS glowing (correct side, correct glow). The dock bay + window now read as two framed openings — a clear win over round 1's single blob — but the third element (louver) does not read, and the window frame is jagged, so the face isn't yet the clean three-framed read SHIP requires.

## Tweak list (numbered, painter-actionable) — narrow, 3 items

1. **Add the opaque louver band as a real, separate element.** Below the dock bay (or as a low strip on the annex face), paint 3–4 short HORIZONTAL `D`/`d` bars with thin `K` gaps between them — flat, no sheen, no magenta. Keep a 1px `M` wall gutter so it doesn't touch the dock recess. This is the only element that still fails to read; it is the difference between TWEAK and SHIP. Do NOT reuse the `o`/`r` magenta glow pool for slats — magenta reads as accent, not a vent.

2. **Clean up the window frame into a tidy `K` rectangle.** The glass cluster (cols ~47–52, rows 38–42) reads as glass but its `K` border zigzags. Square it off: a clean `K` top lintel + left/right jambs + sill around the `h`/`c`/`g`/`O` fill, matching the crispness of the two LEFT sorting panes.

3. **Tidy the center-face scatter between window and dock.** Rows ~43–51 around cols 49–53 have a noisy run of mismatched `d`/`M`/single-pixel speckle that muddies the gutter between the window, dock, and (new) louver. Resolve it into clean `M`/`D` wall so the three framed elements sit on quiet wall with clear 1px gutters.

(Nice-to-have, not blocking: push the outgoing dart fan from ~3 to 4–5 darts for a fuller spread.)
