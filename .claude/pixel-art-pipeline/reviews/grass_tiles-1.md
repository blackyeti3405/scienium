# Review — Grass tile SET (round 1)

**Verdict: SHIP**

Reviewed the 6-tile grass set as a set against `blueprints/grass_tiles.md`. Read all 6
previews, generated 8× single-tile zooms, 3×3 self-tilings, a numeric edge/insetting
check, and a 14×10 mixed field rendered with the app's exact `tileFor` hash + 66/24/10
buckets.

## Verdict against the 5 review criteria

1. **Lush tufted grass, not flat / not noise — PASS.** grass_1 shows clear directional
   blade motifs: a highlight tone (`#aede73`) on top with a dark shadow (`#3a7a44`)
   beneath, over a mid-green fill. Reads as tufted grass, the Stardew tell, not a flat
   fill.
2. **Cohesive base greens — PASS (exemplary).** All 6 tiles share the *identical* 5-green
   base palette: `#5da65a` (dominant mid) · `#4d9350` (shadow-mid) · `#86c65e` (light) ·
   `#aede73` (highlight) · `#3a7a44` (dark). Clutter tiles only *add* tones on top.
3. **Clutter graded plain→light→heavy — PASS.** plain (grass_1/2 = base only) → light
   (flower: tiny yellow/white/pink dabs `#f2ce4d`/`#f6f4ea`/`#e88fb2`; pebble: small grey
   stones `#bdb9c7`/`#726e82` + weed) → heavy (bush: one small dark clump; shrub: a wider
   denser mass). Clutter-pixel width confirms the grade: shrub spans x[8–26] (~18px) vs
   bush x[10–22] (~12px).
4. **Seamless, no clipped clutter — PASS.** Numeric check: every clutter bbox is fully
   inset — none touches x=0/31 or y=0/31 (flower y[13–24], pebble x[11–21] y[19–24], bush
   x[10–22] y[13–23], shrub x[8–26] y[13–24]). 3×3 self-tilings show no hard grid seam in
   any tile; the mixed field has no visible tile boundaries in the plain grass.
5. **Small palette, crisp pixels, on-theme — PASS.** 5 colors (plain), 6 (bush/shrub), 8
   (flower/pebble) — all ≤10. Crisp 32×32, no anti-alias fringing. Stardew meadow feel;
   no lakes, no big trees.

## App wiring — PASS
- `manifest.ts` `GROUND_TILE_IDS` = exactly the 6 ids (grass_1, grass_2, grass_flower,
  grass_pebble, grass_bush, grass_shrub); grass_3/fern/tree dropped. TILE_SRC=32,
  TILE_SCALE=2.
- `TileBackground.tsx` buckets correct: PLAIN=[grass_1,grass_2], LIGHT=[grass_flower,
  grass_pebble], HEAVY=[grass_bush,grass_shrub], with ~66/24/10 frequencies. Rendered
  field measured 66% plain / 26% light / 8% heavy — on target, plain dominates.

## Minor notes (non-blocking, optional polish)
- **grass_2** is the weakest tile: its texture is flecky/scattered and reads closer to
  fine noise than the distinct blade tufts of grass_1. Still fine as tonal variation B,
  but a future tweak could give it grass_1-style directional blade clusters.
- **pebble shadow** (`#726e82`) carries a faint violet cast against the greens; reads
  fine as a wet-stone shadow but could be nudged to a neutral cool grey.
- The mixed field can place identical heavy clutter adjacent (a short vertical bush
  column appeared on the left). That is `TileBackground`'s deterministic hash, not a tile
  defect — out of scope for this art review.

None of these block ship. The set fully satisfies the blueprint's #1 requirement
(seamless, graded, lush).
