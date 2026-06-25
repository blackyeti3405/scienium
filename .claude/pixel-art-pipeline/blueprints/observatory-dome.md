# Observatory Dome — blueprint (bespoke form, STANDARD · OPEN-TOP)

- **Name:** Observatory Dome · **Slug:** `observatory-dome` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** identification · **Base:** Observe and classify celestial objects

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a ROUND ROTUNDA + a HEMISPHERICAL DOME, cracked open along a slit (NOT the gateway cube)
Compose from `art/isobuild.py` (`cylinder` for the rotunda drum + a hand-built hemisphere cap). This is the most distinctly ROUND form of the set — the canonical observatory: a squat round **rotunda drum** topped by a true **hemispherical silver dome** that is cracked open along a vertical slit, the telescope barrel poking through. Cylinder-heavy, round-on-round — unmistakable against the boxes, halls, and towers.
- **Rotunda drum:** a squat wide `cylinder` body — roughly `cylinder(cx≈30, top_y≈26, rx≈11, h≈12)` — polished `M`/`D` shading, a bright `W` rim glint, `K` rim banding, with a `K`-framed door + a couple of small `c` portholes via window-style glazing around the curved wall (round portholes, NOT square panes).
- **Hemispherical dome:** a filled `L`/`M`/`D` half-sphere cap sitting on the drum (hand-built as nested shrinking ellipse rows so it reads as a smooth silver dome, brighter `W`/`L` on the lit-left, `D` to the shaded-right, `K` outline), with thin `D` meridian seam lines. This dome is the silhouette's signature.
- **Roofline / opening: OPEN-TOP slit.** A vertical **observation slit** is cracked open down the dome (a dark `K`/`d` gap with `L`/`W` shutter lips on either side), and the telescope barrel rises OUT through the slit aimed at the sky. The dome reads as rotated open. The slit faces up-LEFT toward the catalogued star.
- **Opening side: OPEN-TOP.** The signature equipment (telescope + star) is OUT through the open dome slit and must read on its own against the night sky; the drum wall stays a plain rounded backdrop.

## Signature feature (one-of-one — a telescope barrel through the dome slit aimed at a catalogued star that pops a spectral-class ID tag)
**The dome cracks open along its slit and a long telescope barrel aims out at a bright catalogued star, which pops a spectral-class identification tag.** No telescope / dome-slit / star-spectral-class motif exists anywhere in the catalog, and it is deliberately distinct from #10 Cosmology Visualization Theater (that projects the WHOLE cosmic web of galaxies) and Operations Hub's radar dish — this observes ONE star through a real telescope and reads its class. Collides with nothing.
- **Telescope barrel:** a fat `M`/`L` `K`-outlined tube angling up-and-left out of the slit, on a small `D` equatorial fork mount, the eyepiece end inside the dome, the aperture aimed at the star.
- **Catalogued star:** a bright `O`/`W` 4-point star with an `o` glow + a couple of `h` sparkle glints, sitting up-left along the telescope's line, a faint `o` sight-line connecting barrel to star.
- **The identification:** a `K`-framed `c`/`o` **ID tag** beside the star reading its spectral class (a glowing label panel — a tiny `o` class glyph like "G2" implied by 2–3 `o` ticks + an `O` "IDENTIFIED" dot).
- **Sky polish:** a scatter of tiny `W`/`c` background stars around the dome top; one `o` "OBSERVATORY" placard over the drum door.

## Motifs it must honor (Axiom)
Observatory domes & telescopes (the literal silver dome + telescope barrel — the definitive observatory of the set), gold starlight glints (`o`/`O`/`W` catalogued star + background stars), navy night-sky glass (`c` portholes), `M`/`D` polished deep-navy drum, cyan/gold identification readout.

## Target output paths
- Source JSON → `art/src/buildings/axiom_observatory-dome.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/observatory-dome.png`
- Preview → `art/preview/buildings/axiom_observatory-dome.png`
- Builder script → `art/pixel-art-pipeline/builders/observatory-dome.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window`-style glazing (reflection gradient + shine, never a black-barred grid) for the curved portholes; any vents via `Box.louver`. Bespoke form composed from `isobuild.py` (`cylinder` + hand-built hemisphere) — NEVER `iso.draw_cube`/`base_windows`. Must read as a **round rotunda topped by a hemispherical silver dome cracked open along a slit (open-top)**, the most round form of the set, distinct from the gateways and all Axiom siblings, with a telescope-through-the-slit aimed at a catalogued star popping a spectral-class ID tag as its hero.
