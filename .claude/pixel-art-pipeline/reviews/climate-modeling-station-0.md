# Review: Climate Modeling Station (terrabase) — round 0

**VERDICT: TWEAK**

Strong, on-contract sprite: the unique built form (wide low oculus hall — NOT a globe, NOT the data-center block), the LEFT hero glazing, and the cohesive TerraBase palette all land. It tips to TWEAK on two signature-legibility issues the painter half-flagged: (a) the lower two holo sheets (land + ocean) fuse into one vertical blob with no gap, weakening the "exploded/separated sheets" read, and (b) the optimization fork shows only the winning branch, so the "two competing paths, one wins green" read barely registers.

## Per-criterion

1. **Iso 2:1?** Yes. Wall verticals and the 26.5° top edges read as clean 2:1 isometric; front corner geometry is consistent.
2. **Roof visible 3/4 top-down (oculus)?** Yes — strong. The `L`/`M` roof deck is fully visible and carries a clean `K`-rimmed oval **oculus** (centered ~cols 290–430, roof row band) with `c`/`g` teal glow in the mouth. This is the best-realized contract element: an unmistakable round glowing sky-hole.
3. **Front corner faces viewer?** Yes. The near vertical corner sits center-low; LIT-LEFT and SHADED-RIGHT faces splay correctly from it.
4. **Sharp/clean/in-palette/clean K outline?** Yes. Single-pixel `K` outline all around, no blur/anti-alias, no off-palette colors detected. Crisp.
5. **Cohesive TerraBase palette + motifs?** Yes. `M`/`L`/`D` ochre-slate walls, `d` vent on the shaded face, mineral-teal `c`/`g` glass + glow, `o`/`O` amber accents, ribbed `D`/`M` cooling-fin bank along the back-right roof edge. Field-station compute-hall feel honored.
6. **One-of-one signature present + legible + distinct?** PARTIAL. Concept is unmistakably the exploded Earth-system stack (not a globe, not the ChemWorks pose-ghost) and the top sheets — ice (`W`/`h` diamond) and atmosphere (`c`/`h` with `o` amber flow cross) — separate cleanly with visible gaps. BUT the **land band fuses directly onto the ocean slab with zero gap** (mid-stack ~y190–330), and the ocean slab bleeds into the oculus glow below it, so the lower half reads as one teal-and-tan blob rather than distinct floating sheets. The **fork** reads as a single lit teal-stem→bright `g`/`h` node with an `o` connector (top-right), but the **dim losing branch is nearly absent** (a couple stray `D` pixels), so it looks like one glowing antenna rather than an optimization choice between two paths.
7. **Attractive?** Yes — handsome silhouette, good color balance, the oculus + rising hologram is a compelling read at thumbnail size.
8. **Unique built form + opening on LIT-LEFT face?** Yes. Wide low oculus hall is its own form (distinct from gateway cube, data-center block, and rooftop-sphere siblings). Hero `K`-framed operator window strip (`c` panes, `o` placard lights) + tall `c`/`g` control door is on the LIT-LEFT face; shaded RIGHT face is correctly plainer (one recessed `d` vent panel). Not a generic box.

## Tweak list (painter-actionable)

1. **Split land from ocean — open a 2px gap.** Mid-stack, the `o`/`M`/`r` land band (~rows for y200–245) currently sits flush on the `g`/`c` ocean slab (~y260–330). Lift the land sheet up by ~2 rows so a clean transparent gap shows between them, matching the gaps already present between the ice and atmosphere sheets above. The exploded stack must read as 4 separated sheets top-to-bottom, not 2 fused ones.

2. **De-merge the ocean sheet from the oculus glow.** The bottom `g` ocean slab visually continues into the `c`/`g` oculus mouth with no break. Insert a 1–2px `K`/transparent break (or darken the oculus interior immediately under the sheet to `G`) so the floating ocean sheet has its own bottom `K` edge and reads as hovering above the hole, not pouring into it.

3. **Thin and tint the land band so it reads as a slab, not a smear.** The land row is the busiest, widest mass (`o`/`r`/`D` mix spanning ~cols 300–460). Reduce it to a thinner horizontal slab (~3px tall) with a clean `K` top+bottom edge and a flatter `o`/`M` fill (drop the darkest `r`/`D` clutter in its center) so it matches the slab language of the other three sheets.

4. **Give the fork a visible losing branch.** Right of the stack the fork currently shows only the winning path (teal `c`/`G` stem → bright `g`/`h` node, `o` connector). Add a second, clearly **dim** branch forking off the same junction node and angling down-right, drawn in `d`/`D` (no glow), ~3–4px long with a small dark dead-end tip. The contrast of one bright `g`/`O` branch vs one dim `d` branch is what makes the optimization read; right now it looks like a single glowing antenna.

5. **(Optional) Add the future-Earth ghost + OPT readout.** The blueprint calls for a faint `c`/`h` ghosted preview disc beside the lit branch and a tiny `o` "OPT" tag. Neither is clearly present. A 3–4px `c`/`h` faint disc beside the winning node + a 2px `o` blip would complete the scenario-preview read. Lower priority than tweaks 1–4.

6. **(Optional) Cooling-fin bank runs a touch long.** The `D`/`M` fin strip along the back-right roof edge extends nearly the full edge and competes slightly with the fork for attention on the right side. Trimming it by ~2 fins would calm the right side and let the fork's losing branch (tweak 4) sit there with less clutter. Minor.
