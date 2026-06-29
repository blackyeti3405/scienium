# Review: biocore/greenhouse — round 0

**Verdict: APPROVE**

Independent inspection of the rendered PNGs (not the generator summary).
Base verified byte-identical to shipped PNG (`BASE_IDENTICAL True`). All 5 stages are 64x64.
Content is on-canvas: t3/t4/t5 reach max x=62 (column x=63 is empty — nothing clipped); top
y=4 is the dome, unchanged from base. Footprint/anchor unchanged. Signature seedling-dome on
its stalk is never occluded in any stage.

## Per-stage
- **base**: greenhouse with pitched glass roof + signature haloed seedling-dome on a stalk above
  the roof, warm amber grow-lights at the base windows. Unchanged.
- **_t2**: small cylindrical water-butt / seedling planter added at the lower-left foot. Modest,
  on-theme functional add; dome untouched. PASS.
- **_t3**: keeps the t2 planter; adds a distinct propagation cold-frame mass (white-glass top +
  mint panels + green skirt) at the lower-right. Genuine new structure, not a recolor. PASS.
- **_t4**: keeps t2 planter + t3 cold-frame; the lower-right grows into a tall vertical climbing
  grow-trellis tower up the right side — the prominent new mass and biggest single jump, as
  intended. Fully on-canvas (max x=62). PASS.
- **_t5**: keeps everything; trellis is taller/leafier, gold piping runs along the roof ridge +
  eaves (t5-only flourish, NOT a whole-building recolor), and bright-mint spore/pollen particles
  radiate from the energized dome. Particles read as an intentional emission aura tied to the
  signature feature (both-sides scatter, dome palette) — not orphaned blobs. Reads fully maxed/elite. PASS.

## Checklist
- [x] Each stage adds visible structure (no no-op / recolor-only stage)
- [x] Cumulative — t2 planter → t3 cold-frame → t4 trellis tower → t5 grown trellis+gold+spores, all retained
- [x] Smooth ramp; t5 clearly reads as a fully built-out version of the base
- [x] Colours mature; gold reserved for t5 only (ridge/eave piping), not a building-wide recolor
- [x] Unique + on-theme (water butt / cold-frame / grow-trellis / spore FX); signature dome never occluded
- [x] 64x64, on-canvas (x=63 empty, no clipping), footprint/base position unchanged, readable at 64px
- [x] Base byte-identical (`BASE_IDENTICAL True`)

## mustFix
None.
