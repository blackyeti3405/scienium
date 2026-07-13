# Review — Grass tile SET (round 0)

**Verdict: SHIP**

Reviewed as a set: 6 previews (`art/preview/grass_{1,2,flower,pebble,bush,shrub}.png`), plus
seam verification via generated 3×3 self-tile composites and a mixed field built with the
exact `TileBackground.tileFor` logic (66/24/10), plus a palette audit of the 32×32 source PNGs.

## Judgments against the blueprint

1. **Lush tufted grass, not flat/noise — PASS.** Directional blade flecks with a light
   highlight and a darker shadow beneath; reads as grass, not a flat fill. In the assembled
   field the tuft texture continues naturally. (Minor: the two plain tiles `grass_1`/`grass_2`
   are a touch more speckly/high-contrast than the softer tufts in the clutter-tile
   backgrounds — reads fine when alternated in the field; polish nit only.)

2. **Cohesive greens — PASS.** All 6 tiles share the same 5-green base ramp:
   `#3a7a43` (dark) → `#4d9350` → `#5da65a` → `#86c65e` → `#aede73` (highlight). Confirmed
   these 5 appear in all six PNGs.

3. **Clutter graded plain→light→heavy — PASS.** plain (`grass_1`/`grass_2`, texture only) →
   light (`grass_flower`: 3 tiny orange/pink flower dabs; `grass_pebble`: 2 grey pebbles +
   a weed speck) → heavy (`grass_bush`: small leafy clump; `grass_shrub`: distinctly bigger/
   denser leafy mass). Grading is clearly readable, and shrub is visibly heavier than bush.

4. **Tiles seamlessly (the #1 requirement) — PASS.** Every 3×3 self-tile shows the grass
   texture continuing across the 32px boundaries with no hard seam line. All clutter is inset
   and whole — no flower/pebble/bush/shrub is clipped at any edge in any tile. The mixed field
   shows no visible grid and no dark margins.

5. **Small palette, crisp, on-theme — PASS.** Per-tile color counts: grass_1=5, grass_2=5,
   flower=8, pebble=8, bush=6, shrub=6; 11 unique across the whole set. Pixels are crisp,
   Stardew-meadow theme with no lakes/big trees.

## App wiring sanity-check — PASS
- `apps/web/lib/sprites/manifest.ts` `GROUND_TILE_IDS` = exactly the 6 ids
  (`grass_1, grass_2, grass_flower, grass_pebble, grass_bush, grass_shrub`); grass_3/fern/tree
  dropped.
- `apps/web/components/lab/TileBackground.tsx` buckets correct:
  `PLAIN=[grass_1,grass_2]`, `LIGHT=[grass_flower,grass_pebble]`, `HEAVY=[grass_bush,grass_shrub]`,
  frequency ~66% plain / ~24% light / ~10% heavy. Field composite counts confirm the mix.

## Optional polish (non-blocking)
- Soften `grass_1`/`grass_2` speckle slightly, or nudge their flecks toward the same
  directional-blade shapes used in the clutter tiles, so plain grass matches the clutter-tile
  tuft feel exactly.
- `grass_2` repeated 3×3 shows a faint recurring motif; mitigated in-app by alternation with
  `grass_1`, but a second tuft variation could reduce it further.
