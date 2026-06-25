# Review: Computational Social Science Lab (mindframe) — round 0

**VERDICT: TWEAK**

A genuinely strong premium silhouette — three-tier circular ziggurat with an open oculus and a hovering FLAT swarm plane, clean palette, opening correctly glowing on the RIGHT. It is held back from SHIP by two legibility failures that matter most on the showpiece: the lower-right control-room cluster reads as one noisy magenta smear (window/door/mezzanine-glow/spill not separable), and the hero sim plane is muddy — the optimization dial, city-grid, and tie-threads don't separate from the dot-swarm.

## Per-criterion

1. **Iso 2:1?** PASS. Drum rims and the plane parallelogram run on clean 2:1 iso diagonals (e.g. base rim rows 47–50, mid rim row 28, plane edges rows 1–14). No broken stair-stepping.

2. **Tiers + oculus visible (3/4 top-down)?** PASS. Three concentric stepped drums read clearly: base (rows ~38–49, widest), mid (rows ~29–37, narrower), top oculus drum (rows ~16–28, narrowest). The open oculus is a K-rimmed dark well trimmed with an `o`/`O` magenta ring (rows 16–18). The stepped round-pyramid (ziggurat) silhouette is unmistakable and is the most dramatic in the set.

3. **Front corner faces viewer?** PASS — but slightly soft. As round drums there is no hard corner; the front-facing curve and the top-down rim ellipses correctly present a 3/4 view. Acceptable for a cylinder form.

4. **Sharp / in-palette / clean K outline / glass vs louvers?** MOSTLY PASS, one weak. 15 colors sampled = 13 in-palette + 2 transparency-backing grays; every hex matches the set exactly, no anti-alias, no strays. `r #b03a80` is used on a single pixel (row 6) — effectively wasted, not a defect. The mid-drum glazing (rows 31–35, the `h`/`O`/`c`/`g` vertical bars between K mullions) reads as GLASS — vertical sheen highlights + frame, good. **Weak:** the lower-right base-drum band (rows 41–45) does NOT cleanly distinguish glass panes from any opaque louver/vent band — it is a horizontal run of mixed `O`/`o`/`c`/`g` with no consistent mullion rhythm, so it reads as glow noise rather than framed windows.

5. **Cohesive MindFrame palette + motifs?** PASS. Muted indigo/violet walls (`M`/`D`/`d`), magenta accent (`o`/`O`) on tier rims, oculus ring, and threads; data-screen glow + observation-glass motifs present. Calm-institute tone holds.

6. **One-of-one signature (FLAT swarm plane, not an orb)?** PARTIAL. It IS a flat horizontal parallelogram with a clear `G`/`g` mid-axis (row 8) — correctly a top-down plane, NOT a sphere/ring/orb, so the collision rule is satisfied and it's distinct from Volt's orb / BioCore's ring. **But legibility is weak:** the dot-swarm, faint city-grid, social-tie threads, and the optimization dial all blur into one busy purple-pink mass. There is an `o`/`O` loop at the plane's right edge (rows 4–6) that is presumably the dial, but it reads as just another bright cluster, not a framed gauge with a needle. No 2–3 distinct emergent clusters separate from the field; no readable grid lines.

7. **Attractive / reads as PREMIUM?** PARTIAL. The form is premium-grade — monumental, dramatic, clearly the showpiece. But the two muddy zones (sim plane + lower-right) make it look slightly unresolved rather than polished, which undercuts the "most refined in the set" bar.

8. **Unique built form + opening on RIGHT + glowing on shaded side?** PASS. Tiered round ziggurat, not a gateway cube, most dramatic silhouette in the set. Glow is measurably concentrated on the RIGHT face (27 glow px right vs 2 left across base rows 39–46) — opening + control-room correctly on the assigned shaded RIGHT.

## Painter-actionable tweaks

1. **De-muddy the sim plane (hero — top priority).** Right now rows 1–14 are a near-uniform purple-pink mass. Darken the plane's base field 1 step (more `d`/`D` between dots) so the bright dots pop, then carve **2–3 distinct `O`-bright clusters** with visibly sparser `h`/`c` dots between them — the flocking must read as clumps, not an even sprinkle.

2. **Make the city-grid legible.** Underlay a few thin straight `d`/`D` grid lines (1px, parallel to the two iso axes of the parallelogram) so the swarm clearly sits ON a grid. At present no grid lines survive in the render.

3. **Build a real optimization dial.** The `o`/`O` loop at rows 4–6 (plane's right edge) reads as a blob. Reframe it as a small `K`-outlined circular/arc gauge with ONE clear `O`/`h` needle pointing at a green-lit (`c`/`h`) best-outcome mark — give it a K frame so it separates from the dot field as a distinct instrument.

4. **Separate the lower-right control-room stack (the noted weak spot).** Rows 41–45 currently smear mezzanine glow + window + door + ground spill together. Pull them apart vertically: (a) keep the **mezzanine glow band** as one clean lit-glass row (rows 41–42) with regular K mullions so it reads as gallery windows; (b) below it, make the **control-room window+door** a single readable lit opening — one taller bright `O`/`c` rectangle (the door) with a thin K frame, flanked by a smaller window, with a 1px K gap between them; (c) drop the **ground spill** to a soft, low-saturation `o` pool on the tile BELOW the wall (rows 46–48), not bleeding up into the wall band. The goal: at a glance, eye reads "glowing windows → lit doorway → light spilling on the ground," three separate beats.

5. **Tidy the lower-right glazing rhythm (criterion 4).** Give the right-face glow band (rows 41–45) a consistent mullion cadence (lit pane / K bar / lit pane) so it reads as framed GLASS rather than an undifferentiated magenta streak.

6. **Optional: reclaim the lone `r` pixel.** The single `r #b03a80` pixel (row 6) does nothing; either fold it into the dial's deep-shadow rim or drop it.
