# Review — Grass tile SET (6 tiles) · Round 2

**Verdict: SHIP**

Reviewed the 6 previews individually, then rendered 3×3 self-tilings of each PNG
plus an 8×6 mixed field (app bucket frequencies) at native 32px resolution to
judge the set as a whole and verify edge continuity.

## Judged as a set

1. **Lush tufted grass, not flat/noise — PASS.** Every tile has a mid-green base
   with scattered highlight blades and darker shadow specks that read as short
   directional tufts, not a flat fill and not random static. grass_1 and grass_2
   carry genuinely different tuft densities/patterns so the field doesn't
   obviously repeat.
2. **Cohesive greens — PASS.** All 6 share the same base + highlight greens
   (palette 5–8 colors each, well under the ~10 cap). Bush/shrub use darker
   greens from the same family for the clump; flower adds warm yellow/pink dabs;
   pebble adds cool greys. The set hangs together.
3. **Clutter graded plain → light → heavy — PASS, clearly legible.**
   plain (grass_1/2) = pure grass; light (flower = 2–3 tiny petal dabs; pebble =
   one larger + one small grey stone) = sparse; heavy (bush = small leafy clump;
   shrub = larger denser leafy mass) = single obvious clump. The mixed field
   shows the grading naturally: plain dominates, flowers/pebbles sprinkle, a lone
   shrub anchors.
4. **Seamless tiling — PASS (the #1 requirement).** In all six 3×3 self-tilings
   there is no visible grid seam and the grass texture flows across every
   boundary. All clutter (flowers, pebbles, bush, shrub) is inset and centered —
   nothing clips at a tile edge. The mixed field confirms no seam artifacts when
   different tiles abut.
5. **Small palette, crisp pixels, on-theme — PASS.** 32×32, crisp nearest-neighbor
   pixels, tight palettes, Stardew meadow feel — grass + graded shrubbery, no
   lakes, no big trees.

## App wiring sanity — PASS
- `manifest.ts` `GROUND_TILE_IDS` = exactly the 6 ids (grass_1, grass_2,
  grass_flower, grass_pebble, grass_bush, grass_shrub); grass_3/fern/tree dropped.
- `TileBackground.tsx` buckets: PLAIN=[grass_1,grass_2], LIGHT=[grass_flower,
  grass_pebble], HEAVY=[grass_bush,grass_shrub]; frequencies ~66% plain / ~24%
  light / ~10% heavy — matches the blueprint.
- No stale references to the dropped ids in source; no orphan tile PNG/JSON files.

## Optional polish (non-blocking, do NOT gate on these)
- Plain grass could carry a touch more shadow-blade contrast (highlight-on-top +
  shadow-beneath) for extra Stardew tuft depth — it already reads as tufts.
- The bush/shrub silhouette can read faintly "face-like" at 1×; varying the top
  highlight row would break that. Cosmetic only.
