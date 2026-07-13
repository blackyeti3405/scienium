# Review — Literature Review (gateway) · round 4

Render: `art/preview/literature_review_generic.png`
Reference: `art_ref/mockups/literature_review.png`
Blueprint: `.claude/pixel-art-pipeline/blueprints/literature_review.md`

## Verdict: TWEAK

The render is a competent, crisp iso building — but the two features that make it a
*Literature* building (the open books on the balcony and the shelf color-band) both
fail to read, and the open books are half the named focal point. So it still doesn't
match the drawing where it matters most.

## Base gates — PASS
- True 2:1 iso: top diamond is a clean 2:1, front corner faces the viewer. OK.
- Roof/top visible: yes — the open canopy top is fully visible. OK.
- Crisp: clean K (#241f38) outline, no blur/AA/mush. OK.
- Palette: on the generic 13-char palette. OK.
- Glass reads as glass: the back-right canopy panel and the front-right window both
  read as tinted glass (cross-hatched teal). OK.

## What matches the drawing (keep)
- **Two-story silhouette** with the upper mass set back and raised toward the back-right — reads as the drawing's stacked pavilion.
- **Open glass canopy on top**: the recessed dark diamond well (see-into, not a closed lid) plus the teal cross-hatched glass slope on the back-right is a faithful translation of the tilted skylight. This half of the focal point lands.
- **Orange support columns** on the upper level — present and placed on the front faces/corner, as drawn.
- **Front-right window** (teal/purple tint) on the upper level — present.
- **Arched entrance with orange trim** at the lower front-right — clean, dark arch with orange jambs. Good match.

## Fidelity misses (move it toward the drawing)
1. **The open books on the balcony don't read as books (biggest issue).** On the mid
   ledge they are two amorphous teal blobs. In the drawing they are two clearly-drawn
   *open books* — a butterfly/V pair of pages splayed on the ledge, with purple/green
   pages. They're also the wrong color here (teal glass instead of page tints). This is
   the literature tell and the second half of the named focal point; it currently reads
   as "teal goo," not books.
2. **Lower shelf band is wrong.** The drawing has a single coloured **horizontal shelf
   stripe** (green/purple band) across the lower front-left. The render instead
   scatters teal dots in diagonal rows across the whole face — reads as a control panel
   / speckled texture, not a shelf band. Wrong color (teal, no green G/purple) and wrong
   form (dot field vs. one clean horizontal band).
3. **Right-side element reads as a STAIRCASE, not an awning.** The projecting zigzag on
   the right is stepped treads with risers — unmistakably stairs. The drawing shows a
   **diagonal-hatched awning** (a striped overhang on thin posts). It currently reads as
   a different feature entirely.
4. **Upper front-left diagonal-hatched panels are missing.** The drawing has slatted
   blinds / striped diagonal hatching on the upper front-left face; the render leaves
   that face plain (just columns).
5. **Overall it leans "two solid cubes."** The open top helps, but the lower/upper
   masses read fairly closed. The drawing is airier — keep the openness the canopy gives
   and let the books/awning break the boxy read.

## Concrete tweaks
- Redraw the balcony books as recognizable **open books**: a symmetric V / butterfly of
  two pages with a K spine down the middle, sitting proud of the ledge; use the light
  page tints (W/L for pages) with a green/purple accent, NOT teal glass. Two of them,
  splayed, as in the drawing — this is the literature tell, make it obvious.
- Replace the teal dot-field on the lower front-left with **one clean horizontal shelf
  band**: a 2–3px stripe using green (G #23808b) and purple (d/D) blocks, sitting like a
  bookshelf row, rather than scattered dots across the face.
- Turn the right projection from stairs into an **awning**: a flat/slightly-sloped
  diagonal-hatched overhang on 2 thin posts (drop the stepped risers). If it can't read
  as an awning at this size, drop it entirely rather than leave a staircase.
- Add **diagonal hatch lines** (slatted blinds) to the upper front-left face so it reads
  as the drawing's striped panel instead of a blank wall.
- Keep the canopy, columns, window, and arch as-is — those already match.
