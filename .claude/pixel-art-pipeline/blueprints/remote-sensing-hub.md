# Remote Sensing Hub — blueprint (bespoke form, STANDARD)

- **Name:** Remote Sensing Hub · **Slug:** `remote-sensing-hub` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** decoding · **Base:** Interpret satellite and aerial data

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a CLEAN LOW OPS BLOCKHOUSE crowned by a big TILTED ROOFTOP DISPLAY SCREEN (NOT the gateway cube, NOT a dish)
A clean, low ground-station **ops blockhouse** crowned by one big **tilted rooftop display screen** angled up toward the sky — a distinct angled-slab silhouette unlike any dish, dome, or cube-with-orb. The screen is the form's signature massing element. Explicitly NOT a rooftop radar dish (that is Gateway Operations Hub's owned feature) and NOT a globe.
- **Ops blockhouse:** a low clean `Box` — `Box(top≈(30,18), wx≈11, wy≈9, h≈11)` — `M`/`L` smooth walls (cleaner/paler than the rugged siblings, a modern ground-station look), a flat `L` roof deck, a thin `o` trim line.
- **Tilted display screen:** a large flat rectangular **screen panel** mounted on a `D`/`K` A-frame stand on the roof, **tilted back** (its top edge leaning away, face angled up-and-toward-viewer) — drawn as a `K`-framed slab whose face is the signature raster map; clearly an angled screen, not a parabolic dish. A small `D` cable run feeds it from the blockhouse.
- **Antenna mast:** a thin `D` whip antenna with a `c` blink at the back corner (a downlink antenna, NOT a dish).
- **Roofline:** the dominant tilted screen on its A-frame + the whip antenna; the deck otherwise clean.
- **Opening side: RIGHT (glowing control room on the shaded face).** The hero is the interpretation control room on the SHADED RIGHT face: a wide `K`-framed glass control-room window that GLOWS (banks of `c`/`g` monitor light, warm `o`/`O` interior) so it reads on the shaded side, `h` reflection. Keep the LIT LEFT face plainer — a clean wall with one `c` ribbon window and the door.

## Signature feature (one-of-one — an orbital ground-track ring with a circling satellite beaming false-color raster tiles down onto the tilted screen where they resolve pixel-by-pixel into a terrain map)
**A glowing orbital ground-track ring arcs above the hub with a tiny satellite circling it, beaming a cascade of false-color raster image-tiles down onto the tilted rooftop screen — where the tiles land and resolve pixel-by-pixel into a coherent terrain map (the decode).** No satellite-ground-track / raster-tile-decode / tilted-screen motif exists in the catalog, and it deliberately uses NO radar dish (Operations Hub owns the dish) and NO globe (Greenhouse/Bioinformatics own the rooftop rotating spheres), so it collides with nothing.
- **Ground-track ring:** a thin tilted `c`/`g` orbital ellipse hovering over the hub, faint `K` shading on its far side; a tiny `W`/`O` satellite cube with little `o` solar-panel wings traveling along it.
- **Beamed tiles:** a slanted cascade of small `c`/`g`/`o` false-color square tiles streaming from the satellite down to the screen (a diagonal dotted beam of pixel-tiles).
- **Resolving terrain map:** on the tilted screen face, the tiles assemble into a `g`/`G`/`o`/`r` false-color **terrain map** — half resolved into a clean map, half still loose scattered tiles (the in-progress decode); the resolved edge glows `h`/`O`.
- **Read:** a tiny `c` "DECODE" progress bar along the screen frame filling `g`→`O`.

## Motifs it must honor (TerraBase)
Weatherproof instruments & antennae (the downlink whip antenna + ground-station gear), mineral-teal sensor glow (the ground-track ring, beamed tiles, monitor glow), the terrain/earth-data read (false-color map), clean field ground-station hardware (`M`/`L`).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_remote-sensing-hub.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/remote-sensing-hub.png`
- Preview → `art/preview/buildings/terrabase_remote-sensing-hub.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **clean low ops blockhouse crowned by a big tilted rooftop display screen (NOT a dish, NOT a globe)**, distinct from the gateways and all TerraBase siblings, with an orbital ground-track ring beaming raster tiles that resolve into a terrain map as its hero, control room glowing on the RIGHT.
