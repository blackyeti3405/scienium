# Blueprint — Literature Review (gateway) · IMAGE-MATCH mode · SHAPE LOCKED

**Reference (Read FIRST): `art_ref/mockups/literature_review.png`**
The user has already approved the massing. **DO NOT change the footprint** — build it with exactly this `isobuild.poly_prism` composition, then add details ON TOP. Palette = the 13 canonical chars only (recolor-safe). Output `art/src/literature_review_generic.json` → `apps/web/public/sprites/gateways/literature_review_generic.png` + preview.

## LOCKED massing (use verbatim; `swap` = flip u↔v)
```python
W,H,a,d = 13,12,7,6
sw = lambda pts: [(v,u) for (u,v) in pts]
poly_prism(cv, sw([(0,0),(W,0),(W,H),(a,H),(a,d),(0,d)]), (32,22), 12)  # ground floor = single L solid
poly_prism(cv, sw([(0,0),(a,0),(a,d),(0,d)]),           (32,10), 11)  # 2nd floor MAIN rectangle (reading room)
poly_prism(cv, sw([(0,d),(a-2,d),(a-2,H),(0,H)]),       (30,14),  9)  # 2nd floor EXTRA box on the LEFT corner
```

## Details to add onto the locked shape (match the reference)
- **Open glass canopy** over the reading-room rectangle: an angled glazed skylight (teal `g/c/h`, sheen) tilted up toward the back — reads as an open reading terrace, glows.
- **Open books on the balcony ledge** (front arm of the L): a big open-book butterfly/V, K spine, pages in `g/c` (green-ish) + `D/d` (purple-ish). The literary hero — must read clearly.
- **Orange support columns** (`o`) between the two levels.
- **Arched entrance** (`K` arch + `o` trim) on the ground-floor front.
- **Awning**: a slatted diagonal-hatched overhang on thin `o` posts to one side.
- **Shelf color-band** along the lower front (short `g/c/o/O` verticals = book spines).

## Review = fidelity to the reference (reviewer MUST Read `art_ref/mockups/literature_review.png`)
Massing matches the locked shape (L + rectangle + left-corner box, single solids); open canopy + open books present and reading as a library; on the 13-char palette; crisp iso.
