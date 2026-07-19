# Review — Literature Review (gateway) · fidelity to drawing

Reference: `art_ref/mockups/literature_review.png`
Render: `art/preview/literature_review_generic.png`

**Verdict: TWEAK**

## What the render gets right
- **Two-story stepped silhouette.** Lower box + smaller upper box set back on top, front corner to viewer, true 2:1 iso. Story count and stacking read correctly.
- **Glass canopy present** on top — teal, cross-hatched panels, orange finial at the peak. Glass reads as glass (teal with light highlights).
- **Orange support columns/posts** at the corners and mid-front. Faithful accent color and placement.
- **Arched entrance** on the lower front-right: dark recessed arch with orange trim down both jambs. Clean match to the drawing.
- **Upper window** on the front-right face (teal glass gem). Present.
- **Side extension with thin posts** projecting to the right at the balcony level. Present.
- **Base gates all pass:** crisp nearest-neighbor pixels, no blur/AA/mush, clean K (#241f38) outline, on the generic purple palette, roof visible, glass reads as glass.

## Fidelity misses (why it's a TWEAK)
1. **Open books on the balcony are NOT recognizable — this is the literature tell and the blueprint's co-focal feature.** The drawing puts two splayed open books (shallow V/M page shapes, purple/green pages) front-and-center on the balcony ledge. The render has only scattered teal blocks/blobs on the mid roof that do not read as books at all. This is the single most identity-defining feature of the drawing and it is missing. Automatic TWEAK.
2. **The canopy reads as a CLOSED peaked/hip glass roof, not an OPEN see-into frame.** The drawing's top is an open rectangular frame (lidless box opening upward, tilted so the back-right edge is raised, cross-hatch glass on the FAR slope only) — you see down into an empty upper room. The render built a symmetric convex peak rising to a center point, which reads as a solid glass roof rather than the open, airy terrace the blueprint calls for (priority #1: "see-into, not a closed box").
3. **Lower shelf color-band is missing / replaced.** The drawing's lower front-left face has a horizontal green/purple SHELF BAND (a colored stripe). The render instead put a row of vertical teal windows (a colonnade) there — wrong feature, wrong orientation. Changes how the ground floor reads.
4. **Upper front-left diagonal-hatched blinds/slats are absent.** That face is plain purple in the render; the drawing has diagonal-hatched slatted panels there.
5. **Side awning is bare posts.** The right-side extension has the posts but not the diagonal-hatched overhang/awning that sits on them in the drawing.

## Concrete, painter-actionable fixes (toward the drawing)
- **Add the open books on the balcony ledge, front-center, as the hero detail:** two splayed open-book shapes (a shallow M/V of two pages) in W/L page color with a K spine and a hint of g/G page tint. Make them large enough to read as books at 64px — this is the literature tell and must be unmistakable.
- **Open the canopy:** make the top an open rectangular frame (K rails around an empty top) tilted up toward the back-right, cross-hatched teal glass on the FAR (back) slope only, near interior showing the upper-room floor (M/D) — not a symmetric closed peak. Drop the center peak/finial in favor of a raised back rail.
- **Swap the lower front-left colonnade for a horizontal SHELF BAND:** one or two horizontal g/G + M/d stripes running along the front-left lower face (shelves), not vertical windows.
- **Add diagonal-hatched slats** to the upper front-left face (thin K diagonal lines over L/M) to read as blinds/awning.
- **Add a small hatched awning** over the right-side extension posts (a thin diagonal-hatched overhang) if it fits.
- Keep the arch, orange columns, and upper-right window as-is — they already match.
