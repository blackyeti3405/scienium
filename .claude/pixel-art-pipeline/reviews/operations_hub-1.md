# Review — Operations Hub (gateway) · IMAGE-MATCH redo, round 1

**Reference:** `art_ref/mockups/operations_hub.png`
**Render:** `art/preview/operations_hub_generic.png` (base `apps/web/public/sprites/gateways/operations_hub_generic.png`, 64×64)

## VERDICT: TWEAK

Reads unmistakably as the same building — a wide two-story mission-control block — and passes every base gate. Nothing reads as a *different* building. But this is a fidelity redo, and two features the blueprint names explicitly are absent (the screen's cursor mark, the upper-front square hatch) and the hero screen is notably under-scaled versus the drawing. Those are exactly the gaps a fidelity pass should close, so: one more targeted pass, not a repaint.

## Base gates — all PASS
- **True 2:1 iso / silhouette:** Front corner points at the viewer; lit front-left and shaded front-right faces split off it correctly. Wide two-story stack (lower wider, upper set back behind a front rooftop ledge) matches the drawing's proportions and story count.
- **Roof visible:** The upper roof diamond is clearly presented top-down with the screen + vent + periscopes standing on it — reads as a roof seen from above, not a wall elevation.
- **Crispness:** Clean single-pixel K (#241f38) outline, no blur/AA/mush on nearest-neighbor upscale.
- **Palette:** On the generic lavender palette (W/L/M/D/d walls). Teal accents (g/c/h) for glass honor the "0 = teal" note. No off-palette strays.
- **Glass reads as glass:** Rooftop screen, roof vent, and lower windows all use a teal field with light highlight streaks — no black mullion bars chopping the glazing.

## Feature-by-feature fidelity
- **HERO — tilted orange-framed control screen (front-left roof):** PRESENT and is the clear focal point of the roof — orange frame, tilted plane, teal glass with sheen. TWO gaps: (1) **under-scaled** — in the drawing it dominates the front-left roof and overhangs the front edge like a drafting table; here it's a modest skylight-sized box sitting inboard. (2) The **arrow/cursor mark** inside it is missing (blueprint names it explicitly as part of the hero).
- **Orange hazard-stripe band (upper front):** PRESENT — caution slashes wrap the upper-front corner and read as hazard tape. Good.
- **Periscope / antenna shapes (back-left roof):** PRESENT — two thin stalks with small orange loop/ball tops poke up. Reads correctly.
- **Green roof vent (right roof):** PRESENT as a striped panel, but renders **teal** rather than green. The 13-char palette has no green, so teal is the nearest legal color — acceptable. Only note: it's the *same* teal as the hero screen, so the two roof features don't visually distinguish. Minor.
- **Operator figure (right shaded face):** PRESENT — small orange stick-figure with a round head. Recognizable. Good.
- **Lower window (front-left):** PRESENT as glass, but rendered **teal** and split into two panes; the drawing shows one **wide, dark blue/purple-tinted** window. Color and shape drift.
- **Doorway (front-right, lower):** PRESENT — dark K-framed doorway with a small handle dot. Good.
- **Square hatch (upper front-centre):** MISSING — the small framed square hatch on the upper front face isn't there.

## Concrete tweaks (painter-actionable, ordered by impact)
1. **Enlarge the hero screen** so it dominates the front-left roof and its front edge reaches/overhangs the roof-front corner, matching the drawing's drafting-table scale. It should be the first thing the eye hits.
2. **Add the arrow/cursor glyph** inside the screen — a few light (`W`/`h`) pixels forming a small up-right arrow — per the blueprint.
3. **Add the framed square hatch** on the upper front face, front-centre: a small K-outlined square panel below the hazard band.
4. **Re-tint the lower front-left window** toward the drawing's dark blue/purple (e.g. `d`/`D` glass over a `K` shadow) and widen it toward one broad pane, so it doesn't mirror the roof vent's teal.
5. Optional: lighten/vary the roof-vent stripes (add `h` highlights) so the green vent reads distinct from the hero screen's glass.
