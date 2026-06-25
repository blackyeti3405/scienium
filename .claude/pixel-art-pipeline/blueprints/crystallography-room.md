# Crystallography Room — blueprint (bespoke form, STANDARD)

- **Name:** Crystallography Room · **Slug:** `crystallography-room` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** decoding · **Base:** Determine molecular structures

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a FACETED HEXAGONAL-PRISM PAVILION with a crystal-cut roof (NOT the gateway cube)
The crystallography room: a compact **angular, gem-cut pavilion** whose body is a chamfered prism and whose roof is a low **faceted crystal cap** of tilted glass planes — the whole building echoes a single grown crystal. Sharp, jewel-like, the most geometric form in the set; distinct from every boxy hall and round tower.
- **Main body:** a `Box` with chamfered reading — e.g. `Box(top≈(30,18), wx≈10, wy≈10, h≈14)` — then ABUT a second narrower `Box(top≈(33,15), wx≈6, wy≈6, h≈4)` set back and centred on the roof, and break its top into **faceted triangles** (paint the roof diamond as 3–4 tilted `L`/`M`/`D` planes with bright `W` crystal-edge highlights) so the cap reads as a cut gem, not a flat slab.
- **Glazing:** narrow tall `c`/`g` slot windows angled like crystal faces; `K` chamfer seams down each corner to sell the faceting.
- **Roofline:** the faceted crystal cap (tilted planes + `W` edge glints), one small `o` X-ray-source nub; no stack.
- **Opening side: LEFT.** The hero is a `K`-framed **viewing door + tall slot window** on the LIT LEFT face — `c`/`h` glass with `h` facet reflections and an `o` glow, a `W` crystal-edge highlight running down the door frame. Keep the shaded RIGHT face plainer (a couple of dark `G` slot windows, a `D` conduit).

## Signature feature (one-of-one — a growing crystal lattice / X-ray diffraction spot pattern)
**A single large faceted crystal floats glinting in a beam above the roof, and a symmetric grid of glowing diffraction spots (its X-ray pattern) fans out around it — the structure being decoded from the spots.** No crystal-lattice / diffraction-spot motif exists anywhere in the catalog.
- **The crystal**: a faceted `h`/`c`/`g` gem (a small multi-plane shape with `W` highlight edges + `G` shadow facets) hovering on a thin `o`/`O` violet beam from the roof nub.
- **Diffraction pattern**: a symmetric square grid of small glowing `O`/`o` (violet) and `c`/`h` (blue) **spots** radiating outward around the crystal, brighter at center fading out — clearly a Laue/diffraction spot array, not random sparkles.
- **Decoding read**: 2–3 of the spots ringed/lit in `O` (the ones being indexed) with a thin `c` connector to a tiny `g` index tag = the decoding in progress.
- **Glow**: a soft `o`→`O` violet halo behind the whole pattern selling the X-ray glow + 1–2 `h` sparkles on the crystal facets.

## Motifs it must honor (ChemWorks)
Polished lab glass / faceted glass (the crystal + glazing), violet reaction glow (`o`/`O`/`r`) for the X-ray beam, spots and halo, blue glassware family (`h`/`c`/`g`/`G`) for the blue diffraction spots + windows, `M`/`D` blue-grey faceted walls.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_crystallography-room.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/crystallography-room.png`
- Preview → `art/preview/buildings/chemworks_crystallography-room.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **faceted gem-cut crystal pavilion with the viewing opening on the LEFT**, distinct from the gateways and all siblings, with a floating crystal + X-ray diffraction-spot pattern as its hero.
