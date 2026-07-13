# Literature Review — image-match review (lit-4)

**Verdict: TWEAK**

Reference: `art_ref/mockups/literature_review.png`
Render:    `art/preview/literature_review_generic.png`
Authoring source: `art/gateways/build_literature_review.py` (regen: `python art/gateways/build_literature_review.py` then `python art/recolor.py`)
Grid: `art/src/literature_review_generic.json`

## Palette check — PASS
All 8 JSONs (generic + 6 reskins + creative) use ONLY the 13 canonical chars
(K W L M D d / h c g G / o O r). Verified programmatically: no off-palette chars in any
grid. The generic PNG contains zero teal pixels and the only non-sprite color is the
`#d2d2da` preview backdrop. Clean.

## What landed since lit-3 (good — do not regress)
- **Open book (mid deck): FIXED.** Now reads clearly as a splayed open book — central dark
  spine seam with two symmetric page halves and `D` page-line dashes fanning on each side.
  Focal tell resolved.
- **Right orange posts: mostly fixed.** The two `o`/`r` legs now attach to the underside of
  the right terrace instead of dangling in empty space, so they no longer read as a bug.
- **Stray teal blob: FIXED.** No `c`/`g`/`G` pixels anywhere in the render; orange is the
  unambiguous dominant accent (~6600 orange cells vs 0 teal).
- **Two-tier stepped massing: correct.** Larger base block front-left, upper block set
  back-right, arched entrance at base front, orange columns flanking the upper window, left
  hatched blind — all present and iso is crisp at the pixel level.

## Fidelity — the one blocker (unchanged from lit-2 / lit-3)

**Top structure still reads as a rounded lumpy mound, not a crisp OPEN RECTANGULAR TRAY.**
This is the building's signature feature and the top third of the silhouette, so per the
rubric (silhouette graded first, wrong-shape signature = automatic TWEAK) it holds the
verdict.

Reference top is an unmistakable open-topped crate tilted up-and-back: a bold flat
rectangular RIM FRAME (near rail low, far rail high, two side rails) that you look INTO,
seeing the recessed interior floor (faint grid) and the far interior wall, with two thin
vertical rods poking up from the near-left rim.

Render top is a soft `W`/`L` rounded silhouette that peaks to a lump in the top-center,
with a single dark `M`/`D` horizontal band across the middle. There is no crisp
near-rim rail, no rectangular open frame, no clear "looking into the box" interior floor +
far wall. It reads as a solid soft canopy/roof, not an open lidded tray. Third consecutive
round on this same note.

## Tweaks (concrete, in priority order)
1. **Rebuild the top as a flat-topped hollow rectangular tray, not a mound.**
   - Draw the four rim rails as crisp 1–2px `K`-outlined `D`/`M` bands forming a rectangle
     in iso: a NEAR rail (front-low), a FAR rail (back-high), and two SIDE rails connecting
     them. Flatten the current peaked center of the silhouette so the top edge is a clean
     rectangle, not a dome.
   - Inside the frame, drop the interior floor 1–2 rows below the rim in a darker shade
     (`d`/`D`) so you read "into" the open box; leave the FAR interior wall visible as a
     1-row lighter (`L`/`M`) strip at the back.
2. **Add 2–3 thin (1px) vertical `K`/`D` rods** poking up from the near-left rim of the tray
   (matches the reference's stick detail; also breaks up the rim silhouette).
3. **(Secondary, low priority) Right awning:** consider a short slatted/hatched canopy plane
   over the two right posts (mirror the left blind's diagonal hatch) so the right side reads
   as a lean-to awning rather than a plain supported balcony. Not a blocker on its own.
