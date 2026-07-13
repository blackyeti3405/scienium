# Blueprint — Grass tile SET (background, 6 tiles)

**Redo the whole background.** Current 9 tiles look flat and the shrubbery doesn't vary. Replace with **6** Stardew-inspired grass tiles: lush layered greens with clutter **graded** from plain → detailed, so a tiled field reads like a natural meadow (NO lakes, few/no big trees — the designer wants grass + varying shrubbery). Reference: the Stardew Valley screenshot the user supplied (rich tufted grass, scattered weeds/flowers/bushes, occasional pebbles).

## The 6 tiles (IDs reuse a subset of the current names so the app change is minimal)
Bucket → id → content:
- **plain** `grass_1` — base grass, subtle tuft texture, tone A
- **plain** `grass_2` — base grass, slightly different tuft pattern/tone B (variation so the field doesn't obviously repeat)
- **light** `grass_flower` — base grass + 2–3 tiny flowers (petal dabs) + a couple tufts
- **light** `grass_pebble` — base grass + 1–2 small grey pebbles + sparse weed blades
- **heavy** `grass_bush` — base grass + a small leafy **bush/weed clump**
- **heavy** `grass_shrub` — base grass + a denser **shrub** (bigger leafy mass, still low)

*(Dropped from the current 9: `grass_3`, `grass_fern`, `grass_tree`.)*

## Target paths (per tile id)
- Source: `art/src/<id>.json` · PNG: `apps/web/public/sprites/tiles/<id>.png` · Preview: `art/preview/<id>.png`
- These are **32×32** (TILE_SRC=32), displayed at 2×.

## Look & palette (tiles have their OWN greens — not the gateway palette)
- Layered grass greens: a highlight, a light, a mid, and a dark green (e.g. around `#a8d06a` → `#7cb85a` → `#57a05c`/`#4e9450` → `#3c7a44`), plus a near-black-green outline tone for clutter edges. Flowers: small warm/white/pink dabs. Pebbles: cool greys. Keep each tile ≤ ~10 colors, cohesive across all 6 (same base greens).
- **Grass texture:** short directional tufts / blade flecks with a 1px highlight on top and a shadow beneath (the Stardew tell) — NOT a flat fill, NOT random noise. Dither the mid/dark greens subtly.
- **Seamless:** every tile must **tile edge-to-edge** with itself and the others (grass texture continues across the seam; clutter sits inset from the edges so it never clips at a border). This is the #1 requirement — verify by mentally tiling.
- Clutter is **inset and centered-ish**, low-density on light tiles, a single clump on heavy tiles. No clutter taller than ~⅔ the tile.

## Method (code-generated, reproducible)
Edit the tile builders in `art/build_sprites.py` to produce exactly these 6 (replace the old 9-tile set), keeping its `write_sprite`/JSON-emit pattern so it writes `art/src/<id>.json` + the PNGs. Run `art/.venv/bin/python3 art/build_sprites.py`. **Read every one of the 6 previews** and a mental 2×2 tiling to confirm seamlessness + graded shrubbery.

## App wiring (the agent proposes exact edits; orchestrator applies + verifies)
- `apps/web/lib/sprites/manifest.ts` → `GROUND_TILE_IDS` becomes the 6 ids above (drop grass_3/fern/tree).
- `apps/web/components/lab/TileBackground.tsx` → `PLAIN = [grass_1, grass_2]`, `LIGHT = [grass_flower, grass_pebble]`, `HEAVY = [grass_bush, grass_shrub]`; keep frequency ~66% plain / ~24% light / ~10% heavy so plain dominates and clutter sprinkles (Stardew-like).

## Review focus
Grass reads as lush tufted grass (not flat) · the 6 tiles are cohesive (same greens) · clutter clearly **graded** plain→light→heavy · **tiles seamlessly** (no visible grid seams, no clipped clutter at edges) · on a small palette · crisp pixels.
