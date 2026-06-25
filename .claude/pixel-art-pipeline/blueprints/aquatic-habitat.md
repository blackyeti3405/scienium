# Aquatic Habitat — blueprint (bespoke form, STANDARD)

- **Name:** Aquatic Habitat · **Slug:** `aquatic-habitat` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Study aquatic ecosystems

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a CYLINDRICAL WATER-TANK rotunda with a low entry annex (NOT the gateway cube)
The water building: a tall **glass cylindrical aquarium tank** (a `cylinder` body, mostly water-filled glass) as the dominant mass, with a small low rectilinear entry annex at its base. This vertical glass water-column silhouette is distinct from the Volt AI-Incubator drum (opaque polished steel) — here the cylinder is a transparent column of water full of life. Cool, blue-green, aquatic.
- **Main water tank:** a tall `cylinder` body — roughly `cylinder(cx≈30, top_y≈14, rx≈10, h≈22)` — but the WALLS read as glass holding water: `c`/`g`/`G` graded water (lighter `c` at the lit-left, deeper `G` to the right and bottom), `K` vertical glass-seam ribs every ~5px, a bright `h` waterline + meniscus near the top and a `W` rim glint. A `D` capping ring + small `o` filter box on top.
- **Entry annex:** a low `Box` abutting the FRONT-LEFT base — roughly `Box(top≈(20,30), wx≈6, wy≈5, h≈8)` — `M`/`D` walls, a `K`-framed glass door with `o` glow.
- **Roofline:** the tank's `D` rim cap + filter box; a thin `c` water-pipe arcs from the filter back into the tank.
- **Opening side: LEFT.** The hero is the front-left entry annex door + a big `K`-framed viewing window on the LIT LEFT of the tank showing the water inside; `h` reflections on the lit glass, `o` glow at the annex door. Keep the right side of the tank plainer (deeper `G` water, fewer seams, no annex).

## Signature feature (one-of-one — a living kelp-and-fish ecosystem swirling inside the tank)
**Inside the glass water-column a whole miniature reef lives — swaying kelp fronds, a school of darting fish, a drifting jellyfish and rising bubble streams — a self-contained aquatic ecosystem you can watch.** No aquarium-ecosystem / kelp-and-fish / jellyfish motif exists anywhere in the catalog.
- **Kelp**: 2–3 tall wavy `g`/`G` fronds rooted in a `d`/`r` gravel bed at the tank bottom, curving with the current.
- **Fish school**: a tight cluster of 4–6 little `O`/`o` fish (2px darts) angled the same way, plus one stray `c` fish.
- **Jellyfish**: a translucent `h`/`c` bell drifting mid-tank with a few `c` tendrils.
- **Bubble streams**: vertical chains of tiny `h`/`W` bubble dots rising to the `h` waterline; a soft `c` light shaft slants down from the lit-left. A small `o`/`O` water-quality gauge on the annex glows (the diagnosis read-out).

## Motifs it must honor (BioCore)
Glass tank/terrarium (greenhouse glazing as a water column), the teal `h`/`c`/`g`/`G` glass family AS the water itself, a `d`/`r` gravel substrate bed, soft amber `o` glow at the entry + gauge, leaf-green `g`/`G` kelp, `D`/`d` framing on the annex — cool, alive, aquatic.

## Target output paths
- Source JSON → `art/src/buildings/biocore_aquatic-habitat.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/aquatic-habitat.png`
- Preview → `art/preview/buildings/biocore_aquatic-habitat.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **cylindrical glass water-tank rotunda with a low entry annex** clearly different from the gateways, the Volt drum, and its BioCore siblings, with the **entry/viewing opening on the LEFT** and a living kelp-and-fish ecosystem swirling inside the tank.
