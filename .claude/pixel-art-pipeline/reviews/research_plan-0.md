# Review — research_plan (gateway) · round 0 (REDO) · FIDELITY to `art_ref/mockups/research_plan.png`

**Verdict: TWEAK**

Judged: render `art/preview/research_plan_generic.png` (64×64) vs reference `art_ref/mockups/research_plan.png`.

## What matches the drawing
- **L-arrangement of two drafting-desk units** meeting at a back corner with an open front notch — reads correctly. Front corner faces the viewer.
- **Pen holder present in the notch**: grey/mauve cup with an orange rounded rim/collar and an orange V/chevron accent at its base — the chevron is faithful to the drawing.
- **Both slanted drafting screens read as angled glass** with a scribble sketch and a thick dark frame. Glass reads as glass.
- **Right unit's square window** is on its front face (blue/teal fill + handle dot) — present.
- **Orange accents** roughly placed as in the drawing: left-corner trim post, cup rim/chevron, tall orange back post at the center seam.
- **Base gates all PASS**: true 2:1 iso, slanted roofs visible, crisp (clean continuous dark-K outline, no blur/AA/mush), on the generic 13-char palette.

## Why it's a TWEAK (fidelity gaps vs the drawing)
1. **Left unit reads as 2 layers, not 3 — the middle SHELF BAND is missing.** The drawing's left unit stacks screen → **green+purple lit shelf strip** → body. The render jumps straight from the teal screen to a plain lavender body with no recessed green/magenta colour band. The blueprint's explicit "left 3-layered" criterion is not met, so the left unit reads as a simpler, different desk than drawn.
2. **The pen-holder fan doesn't splay.** In the drawing the pens/rulers spray **up and OUT** in a wide fan from a narrow base — that spread is what makes the hero unmistakable. The render's pens are a near-parallel **vertical bundle** (a little picket fence of bars). Recognizable, but the focal gesture of the drawing is lost.
3. **Too little size contrast between the units.** The drawing's right unit is clearly **lower and set forward-right**; in the render both peaks sit at nearly the same height and depth, muting the "big left / small right" silhouette.

## Minor (not blocking on their own)
- Left slanted screen renders pure teal; the drawing's LEFT screen is a **blue/purple** scribble and the RIGHT one is the multicolour one. Differentiating the two screens would tighten the match.
- The right unit's square window is a touch small/mushy — one or two extra pixels of size (keeping the blue/purple/green fill) would make it read more cleanly as a window.

## Concrete fixes toward the drawing
- Insert the LEFT unit's **middle shelf band**: a recessed horizontal strip of `g #41d2d0` / `G #23808b` mixed with `d #6f6592` / `M` between the slanted screen and the lower body, so the left reads as THREE stacked layers.
- Rebuild the pen holder so the pens/rulers **angle outward from a narrow base** at the cup rim — a couple leaning left, a couple leaning right, the tall orange one center, plus one diagonal ruler — giving a clear V-spread and more height.
- Drop the RIGHT unit a few pixels lower and nudge it forward so it is visibly smaller/lower than the left.
- Recolor the left screen's scribble toward blue/purple (`d`/`M` over the `h/c/g` glass) to distinguish it from the right screen.
