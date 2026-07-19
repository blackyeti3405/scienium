# Literature Review — image-match review (lit-3)

**Verdict: TWEAK**

Reference: `art_ref/mockups/literature_review.png`
Render:    `art/preview/literature_review_generic.png`
Authoring source: `art/gateways/build_literature_review.py` (regen: `python art/gateways/build_literature_review.py` then `python art/recolor.py`)

## Palette check — PASS
All 8 JSONs (generic + 6 reskins) use ONLY the 13 canonical chars (K W L M D d / h c g G / o O r). No off-palette chars. Clean.

## Fidelity — FAIL on the two signature tells

The two-tier stepped footprint, the arched entrance, the orange columns, and the left hatched blind are all present and read fine. But the two features the authoring doc itself calls the "signature" and the "frontmost focal tell" both miss, and one awning is broken.

1. **Top open tray reads as a lumpy rounded mound, not a crisp open lidded crate (silhouette miss).**
   Reference top is an unmistakable OPEN RECTANGULAR TRAY — a bold flat-topped rim/frame (near + far + side rails) with the recessed interior floor and far wall visible, plus a couple thin rods poking up from the near-left rim. The render's upper volume peaks to a rounded/tented lump in the top-center and reads as a solid filled roof; the crisp rectangular rim and the "you see INTO it" open lid are lost. This is the building's signature — a wrong-shape top is an automatic TWEAK.

2. **Open book is a flat inset panel, not a splayed 3D book (focal tell miss).**
   Reference has a proud open book sitting ON the balcony ledge: two fanned pages meeting at a central spine, tilted in iso, with a visible fanned page-edge lip and colored page stripes. The render flattens it into a slatted panel flush with the terrace (vertical seam + horizontal lines) that reads more like an inset shelf/window than a book. It needs to pop off the ledge with an outlined two-page silhouette.

3. **Right side awning lost its slab — orange posts float.**
   The "slatted side awning on thin posts" on the right is reduced to two orange legs hanging in empty space with no canopy plane above them, so they dangle disconnected (reads as a bug). Either restore the hatched awning slab over them (mirror the left blind's diagonal hatch) or drop the orphan legs.

4. **Spurious teal (glass) blob near center.**
   A small teal `c`/`g` cluster sits between the two central orange columns, corresponding to nothing in the reference. Remove it, or relocate glass as interior glints inside the open top tray.

## Tweaks (concrete)
- Rebuild the top as a flat-topped hollow rectangular tray: crisp rim rails on all four sides, recessed interior floor 1–2 rows down, far interior wall visible; flatten the peaked center of the current silhouette.
- Add 2–3 thin (1px) vertical `K`/`D` rods poking up from the near-left rim of the tray.
- Reshape the ledge book into a raised open book: central spine seam, left+right pages angled in iso, a light (`W`/`L`) fanned page-edge lip on the near side, short `D` page-line dashes, outlined so it sits proud of the terrace.
- Restore the right awning slab (diagonal hatch matching the left blind) over the two orange posts, or remove the orphaned posts.
- Delete the stray central teal `c`/`g` cluster; keep glass confined to the open tray interior if used.
