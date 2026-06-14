---
name: pixel-art-generator
description: Generate and re-skin NOVA Lab pixel-art sprites (isometric gateway buildings, ground tiles, UI) using the reproducible code pipeline under art/. Use whenever creating, editing, or recoloring any game sprite for nova-lab.
---

# NOVA Lab pixel-art generator

All NOVA Lab sprites are generated **from code** (reproducible, palette-swappable),
not hand-drawn in an external editor and not via image-generation models. The
pipeline lives in `art/`. Full reference: [`art/README.md`](../../../art/README.md).

## Requirements

```bash
pip3 install Pillow numpy      # numpy is only needed to re-import the Discovery reference
```

## The pipeline (run from the repo root)

```bash
python3 art/iso.py            # 7 generic gateway buildings (Discovery from art_ref + 6 isometric)
python3 art/build_sprites.py  # 9 ground tiles + padlock
python3 art/recolor.py        # 42 reskins (7 gateways × 6 lab types) via palette swap
python3 art/compose_scene.py  # optional: art/scene_*.png full-scene previews
```

Rendered PNGs → `apps/web/public/sprites/{gateways,tiles,ui}/`.
Source char-grids → `art/src/*.json`. Inspection previews → `art/preview/*.png`.

## Key facts

- **Canonical palette** lives in `art/canon.py`, extracted from the reference
  `art_ref/nova_lab_discovery.png`. Chars: `W/L/M/D/d` wall (light→dark),
  `h/c/g/G` glass, `o/O/r` accent, `K` outline.
- **Buildings are isometric** (2:1, a corner faces the viewer, roof visible) so
  the lab can expand right/left/up/down. They are 64×64 and share an iso cube;
  each gateway differs only by its **rooftop feature**.
- **Discovery is imported** pixel-for-pixel from `art_ref/nova_lab_discovery.png`
  (native 64×64). Do not redraw it — re-run `art/iso.py` to regenerate.
- **The app reads only the manifest** `apps/web/lib/sprites/manifest.ts`. Never
  hardcode a sprite path in a component.

## How to...

**Add a gateway building:** add a `rf_*` rooftop function in `art/iso.py`, register
a `build("key", rf_yourfeature)` in its `main()`, rerun `iso.py` + `recolor.py`,
then add the key to `manifest.ts` (`GATEWAY_KEYS`), a config entry to
`apps/web/lib/gateways.ts`, and a component mapping in
`apps/web/lib/featureRegistry.tsx`.

**Re-skin / tune a lab-type palette:** edit that lab's entry in `LAB_PALETTES` in
`art/recolor.py` and rerun `python3 art/recolor.py`. Only gateways reskin; tiles
stay constant (spec §20.5).

**Change the ground / add vegetation:** edit the tile builders in
`art/build_sprites.py` and the tile arrays/frequencies in
`apps/web/components/lab/TileBackground.tsx`.

**Always visually inspect** the rendered PNG (Read the file in `art/preview/`)
before accepting a sprite; iterate until it reads clearly.
