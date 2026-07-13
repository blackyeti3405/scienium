# Review — Research Plan (gateway) · redo, round 1

**Verdict: SHIP**

Reference: `art_ref/mockups/research_plan.png`
Render: `art/preview/research_plan_generic.png` (native 64×64, 8× preview)
Raw sprite: `apps/web/public/sprites/gateways/research_plan_generic.png`

## Verdict rationale
This redo reads as the SAME building as the drawing — two drafting-desk units in
an L meeting at a back corner, with an open front notch and the pen-holder hero
in that notch. Every named feature is present and correctly placed, and it clears
every base gate. Crucially it fixes the prior attempt's core failure: the tallest
central element is now an ORANGE pencil (was a dull grey "pillar" monolith), and
the cup gains an orange rim + chevron, so the pen holder now reads as the obvious
hero. Remaining deltas are color/refinement, not identity — nothing reads as a
different building, so no automatic TWEAK is triggered.

## Silhouette / stacking — MATCH
- Two distinct L-arranged units meeting at a back corner; front notch opens to
  the viewer with the pen holder in it. ✓
- LEFT unit taller, THREE layers top→bottom: slanted drafting screen → recessed
  band → plain body box. ✓
- RIGHT unit lower + set right/forward, TWO layers: slanted screen → body with a
  square window. ✓

## Focal (pen holder) — PRESENT & now the hero
- Cup with an orange rim/mouth and an orange downward chevron/V at its base;
  pens/rulers stand up out of it; the tallest is a bold orange pencil. Reads
  unmistakably as a pen holder and draws the eye to center. ✓
- A vertical orange trim post rises at the back corner where the wings meet. ✓
- Soft gap (see tweaks): the pens still don't "fan up and out" as a full
  symmetric spray — a couple lean right and the tall orange pen/back-post read as
  one thick column rather than thin-pens + a distinct thin post.

## Per-face features & accents — MATCH
- LEFT: recessed shelf band present (dark-teal G + purple, standing in for the
  green+purple strip); small handle mark on body; orange trim post on the left
  front corner. ✓
- RIGHT: square window on the front body face with orange trim edges. ✓
- Orange accents (o/O/r) placed like the drawing: left-corner post, right-unit
  edges, back-corner post, pen-base chevron. ✓

## Base gates — ALL PASS
- True 2:1 iso (box edges step 2-across/1-down), tops/roofs visible, front corner
  to viewer. ✓
- Crisp: native 64×64 (every 8×8 block uniform), no blur/AA/mush, clean closed K
  (#241f38) outline. ✓
- On the generic palette: 100% of sprite pixels map to the 13 blueprint chars;
  the only non-palette color is the preview canvas gray (#d2d2da) behind the
  sprite. ✓
- Glass: slanted screens read as angled glass with a sketch. ✓

## Fidelity gaps (optional polish — do not block ship)
1. **Screen color variety lost.** Both drafting screens are dominated by
   cyan/teal (h/c). The drawing differentiates them — LEFT is a blue/purple
   scribble, RIGHT is multi-color (blue/green/purple). Mix more M/D/d into the
   left screen and g/G + purple into the right so they don't read as two
   identical teal panels.
2. **Pen fan thin & lopsided.** Split the tall orange column into a distinct thin
   back post + a fuller, more symmetric fan of 4–6 thin pens with varied tips
   (o/D/g), spreading up-and-out both ways as in the drawing.
3. **Left shelf band could read greener.** It uses dark-teal G as the green
   proxy; nudging in true green (g) beside the purple would match the drawing's
   green+purple strip more literally.
