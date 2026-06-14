# NOVA Lab — pixel-art pipeline

All game sprites (gateway buildings, ground tiles, the padlock) are generated
from code so they're reproducible and easy to re-skin. Nothing is hand-drawn in
an external editor.

Buildings are **isometric** (2:1, a corner facing the viewer, roof visible) so the
lab can expand right / left / up / down around the central Discovery building. The
Discovery building is imported directly from `art_ref/nova_lab_discovery.png` (the
canonical design, native 64×64); the other six are generated to match its style.

```
art/
  canon.py              # the canonical NOVA palette (extracted from the Discovery ref)
  render_pixel_art.py   # canonical char-grid JSON  -> PNG renderer
  iso.py                # isometric gateway buildings (imports Discovery + builds 6)
  build_sprites.py      # ground tiles + padlock
  recolor.py            # palette-swaps each gateway into the 6 lab-type skins
  compose_scene.py      # composites preview screenshots of the whole scene
  src/*.json            # generated source char-grids (tracked, reproducible)
  preview/*.png         # upscaled inspection PNGs (gitignored)
```

Output PNGs land in `apps/web/public/sprites/{gateways,tiles,ui}/` and are read
through the manifest at `apps/web/lib/sprites/manifest.ts` — **never reference a
sprite path inline; always go through the manifest.**

## Requirements

```
pip install Pillow
```

## Regenerate everything

```
python art/iso.py             # 7 generic gateways (Discovery from ref + 6 iso)
python art/build_sprites.py   # 9 ground tiles + padlock
python art/recolor.py         # 42 reskins (7 gateways × 6 lab types)
python art/compose_scene.py   # optional: art/scene_*.png previews
```

## Sprite source format (char-grid JSON)

Each sprite is a legible grid of single-char palette keys (`.` = transparent):

```json
{
  "width": 16, "height": 16,
  "palette": { "K": "#241f33", "O": "#f0902a", "o": "#ffc163" },
  "rows": ["................", "......KKKK......", "..."]
}
```

`render_pixel_art.py SRC.json -o OUT.png` renders one at native resolution (one
source pixel = one image pixel; the app upscales with `image-rendering: pixelated`).

## Add a new gateway building

1. Add a `roof feature` function in `iso.py` (draw on the roof diamond with
   `roof_pt`), register a `build("key", rf_yourfeature)` call in `main()`, and
   rerun `iso.py` then `recolor.py`. The iso cube + glazing are shared; you only
   author the rooftop identity.
2. Add the key to `GATEWAY_KEYS` in `apps/web/lib/sprites/manifest.ts`.
3. Add the gateway's config (phase, route, iso `cell`) to
   `apps/web/lib/gateways.ts`, and map it to a feature component in
   `apps/web/lib/featureRegistry.tsx`.

## Re-skin (lab-type palettes)

All gateways are authored once in the canonical palette (`canon.py`) using fixed
palette chars (`W/L/M/D/d` wall light→dark, `h/c/g/G` glass, `o/O/r` accent, `K`
outline). A reskin is a pure palette swap — same grid, new hex values per char —
defined in `LAB_PALETTES` in `recolor.py` (directions follow spec §20.4). To tune
a lab type's look, edit its entry there and rerun `recolor.py`. Only gateways
reskin; the background tiles stay constant for the pilot (spec §20.5).

## How the tile background works

`components/lab/TileBackground.tsx` fills the **entire viewport** with the 9 ground
tiles (it measures its container with a ResizeObserver, so there are no dark
margins). Placement is **deterministic**: each cell picks a tile by hashing its
`(col, row)` plus a stable per-team seed (derived from the team id in
`lab/page.tsx`), so the ground never reshuffles or flickers between renders.
~66% plain grass, ~24% light clutter (flowers / ferns / pebbles), ~10% heavy
clutter (shrubs / bushes / trees).

## How the scene reads it

`components/lab/LabScene.tsx` composes `StatusStrip` + `TileBackground` + the
gateway `BuildingSprite`s that are present for the current `phase`, and opens the
clicked building's feature in a `FeaturePanel` overlay. Which buildings appear,
their skin, and the plot size all derive from `lib/phase.ts` + `lib/gateways.ts`
— see `architecture.md` §8.4.
