# Microscopy Suite — blueprint (bespoke form, STANDARD)

- **Name:** Microscopy Suite · **Slug:** `microscopy-suite` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** identification · **Base:** Visualize cells and microorganisms

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a COMPACT IMAGING PAVILION with a domed observation drum (NOT the gateway cube)
A precise little imaging studio: a low square `Box` body fused to a short `cylinder` drum capped by a low dome — the drum is the optics turret. This drum-on-a-box silhouette is distinct from the Greenhouse gable, the Vault block, and the Volt AI-Incubator (which was a wide *standalone* drum; here the drum is a small turret riding a box). Reads as a clean dark imaging room where light is controlled.
- **Main body:** a low square `Box` — roughly `Box(top≈(30,18), wx≈11, wy≈11, h≈11)` — `M`/`D` walls with `D`/`d` wood-frame seams; darker than its siblings (this is a controlled-light room) with thin `c` indicator dots.
- **Optics drum turret:** a short `cylinder` riding the back of the roof — roughly `cylinder(cx≈30, top_y≈8, rx≈6, h≈5)` — `M`/`D` polished, capped by a low `L`/`W` dome lens; a `c` porthole band wraps it.
- **Roofline:** flat roof + the drum turret rising at the back-center; a small `D` cable conduit runs from the drum down the roof.
- **Opening side: LEFT.** The hero is a wide `K`-framed glass garage-style imaging-bay door on the LIT LEFT face — `g`/`c` panes with `h` reflections, soft `o` interior glow — the way samples roll in. Keep the right face plainer (one small `c` porthole only).

## Signature feature (one-of-one — a giant eyepiece projecting a magnified live cell)
**A giant microscope eyepiece tilts up from the optics turret and projects a huge magnified hologram of a living cell above the roof — a glowing translucent disc showing a cell with its nucleus and organelles, dividing in slow motion.** No eyepiece / projected-cell / micro-organism-hologram motif exists anywhere in the catalog.
- The **eyepiece barrel**: a short tilted `M`/`D` cylinder/tube on the turret with a bright `h`/`W` lens glint at the top, aimed up-left.
- The **projected cell disc**: a large translucent `c`/`h` circle hovering above — inside it a round cell: a `g` membrane ring, an inner `G`/`g` cytoplasm, a bright `O`/`o` nucleus blob, 2–3 small `c` organelle dots; a faint pinch in the middle hints at division.
- A thin `o`/`O` projector cone beams from the eyepiece lens up into the disc; a soft `c` glow halo + a couple of `h` sparkles ring the hologram.
- A tiny `g` scale-bar tick mark sits at the disc's lower edge (the micron scale), selling "this is magnified".

## Motifs it must honor (BioCore)
Glass optics (greenhouse-glazing motif as a porthole band + lens dome), `D`/`d` wood-frame seams, soft amber `o` interior grow-glow at the bay door, the teal `c`/`g`/`G` glass family for the cell projection, green palette walls — clean, scientific, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_microscopy-suite.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/microscopy-suite.png`
- Preview → `art/preview/buildings/biocore_microscopy-suite.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **compact imaging pavilion with a domed optics turret** clearly different from the gateways and its BioCore siblings, with the **imaging-bay opening on the LEFT** and a giant eyepiece projecting a magnified live cell above the roof.
