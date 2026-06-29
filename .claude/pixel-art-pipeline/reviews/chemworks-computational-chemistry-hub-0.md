# Review: chemworks / computational-chemistry-hub (round 0)

**Verdict: APPROVE**

Judged from rendered PNGs (contact strip + per-stage previews + base) and pixel/bbox analysis, not generator text.

## Checklist
- [x] Each stage visibly adds structure (opaque px 1664 → 1679 → 1775 → 1858 → 1891; no no-op stage).
- [x] Cumulative: building-body pixels lost = 0 at every transition (t2/t3/t4 strictly additive; t4→t5 loses 55 px but all in the molecule region y2–12 where the gold orbit ring occludes — 0 lost in the body y>=26).
- [x] Smooth ramp: small data-light ring/rack (t2) → GPU annex mass (t3) → major cooling tower w/ teal display + heat fins (t4) → twin-molecule sim cluster + gold gimbal (t5). t5 reads fully maxed.
- [x] Colours mature; gold (`q`) only in stage5 helpers — confirmed in builder source (lines 635/649/654-672) and in the render.
- [x] Unique + on-theme (molecule sim, GPU annex, cooling tower — specific to a computational-chemistry hub); signature floating molecule not occluded (additions grow down-right; t5 ring frames it).
- [x] 64x64, fully on-canvas (bbox max (62,59), zero edge-touch on all four edges), footprint/base anchor unchanged, readable at 64px.
- [x] Base unchanged — BASE_IDENTICAL True.

## Per-stage
- base: two server/data blocks under the floating molecule + purple data tether. (byte-identical to shipped)
- t2: data-light ring / extra rack windows + node lights along the right block. Modest functional add. OK.
- t3: GPU/cooling annex — a genuine new darker mass front-right with a rack panel. OK.
- t4: standalone cooling tower far-right (teal display screen + horizontal heat-exchanger fins) + dotted data conduit. Prominent new mass. OK.
- t5: gold orbit gimbal ring around the molecule (twin-cluster crowning) + gold conduit/rack trim. Gold-only-at-t5 flourish. OK.

## Notes (non-blocking, optional polish)
- The builder comment intends the t5 gold orbit as "a continuous thin gold hoop, not a scatter of dots," but it renders as a dotted/dashed ring. It still reads clearly as an elite gimbal and is on-canvas, so cosmetic only — not a mustFix.

No mustFix items.
