# Cosmology Visualization Theater — blueprint (bespoke form, PREMIUM · OPEN-TOP OCULUS)

- **Name:** Cosmology Visualization Theater · **Slug:** `cosmology-visualization-theater` · **Lab type:** `axiom`
- **Role:** premium · **Mini-game:** prediction · **Base:** Render large-scale structures of the universe

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a WIDE GRAND DOMED THEATER DRUM with an open oculus (NOT the gateway cube)
Compose from `art/isobuild.py` (`cylinder` for the broad drum + a hand-built shallow dome cap). The premium showpiece: a **wide, grand planetarium theater** — a broad low `cylinder` drum crowned by a shallow, sweeping dome with an **open oculus** at its apex, the holographic cosmos projecting UP through the opening. The widest, grandest, most luxurious round form of the set — clearly richer than the squat Observatory rotunda (this is a broad shallow planetarium, not a slit-domed observatory) and unlike any box or tower.
- **Theater drum:** a wide low `cylinder` body — roughly `cylinder(cx≈30, top_y≈26, rx≈13, h≈12)` — polished `L`/`M`/`D` shading, a bright `W` rim glint, a continuous `c` cyan ribbon-window band wrapping the upper drum (premium curtain-glass, small `g`/`c` panes following the curve), an `o` glowing accent ring at the base, and a grand `K`-framed entrance with an `o`-glow marquee on the lit front.
- **Shallow dome + oculus:** a broad SHALLOW dome cap over the drum (hand-built as nested shrinking ellipse rows — a low sweeping disc, NOT the Observatory's tall hemisphere), `W`/`L` lit, `D` shaded, `K` outline, with thin `D` meridian seams. A `K`-rimmed circular **oculus** is open at the apex, glowing `O`/`c` from the projector within.
- **Roofline / opening: OPEN-TOP OCULUS.** The cosmic-web hologram projects UP and OUT through the open oculus and crowns above the dome against the night sky. The dome reads as a smooth premium disc with a glowing eye at its center.
- **Opening side: OPEN-TOP.** The signature projection is OUT through the oculus and must read on its own against the sky; the drum stays a clean curved premium backdrop with its curtain-glass ribbon glowing.

## Signature feature (one-of-one — a planetarium oculus projecting a rotating cosmic-web of galaxy filaments and voids, with a predicted-expansion arrow stretching the lattice outward)
**Through the open oculus the planetarium projects a rotating holographic cosmic web — glowing galaxy filaments strung between bright nodes around dark voids — with a predicted-expansion arrow stretching the whole lattice outward.** No cosmic-web / large-scale-structure / galaxy-filament-and-void / expansion-prediction motif exists anywhere in the catalog, and it is deliberately distinct from #7 Observatory Dome (that observes ONE star through a telescope) and AI-Incubator's neural-net orb (a small node graph, not a filamentary cosmic lattice) — this projects the WHOLE large-scale structure of the universe. Collides with nothing.
- **Cosmic web:** a hovering 3D lattice above the oculus — bright `O`/`o` galaxy-cluster nodes joined by thin `c`/`g` filament strands, with darker `d`/`G` voids between them (the foamy cosmic-web read), brighter `h`/`W` on the lit-left.
- **Rotation + depth:** the lattice reads slightly turned (a few `c` filaments crossing in front of `G` ones for depth) so it feels like a rotating volume, not a flat net.
- **Predicted-expansion arrow (the prediction):** a glowing `O`/`W` arrow sweeping outward from the lattice center, the outer nodes ghosted to a brighter `O` "future" position (the universe stretching) — the predicted expansion.
- **Premium polish:** a soft `c`/`O` projection cone rising from the oculus, a scatter of tiny `W`/`c` background stars, a `c`/`o` Hubble-rate gauge on the drum predicting outward, and an `o` "COSMOS" marquee over the grand entrance — clean, few seams, lots of `W`/`h` highlights.

## Motifs it must honor (Axiom)
Observatory domes (the grand planetarium dome — premium-scale), particle rings echoed in the cosmic-web nodes-and-filaments lattice, gold starlight glints (`o`/`O`/`W` galaxy nodes + background stars + expansion arrow), navy night-sky glass (`c`/`g` curtain ribbon + projection), `M`/`D` polished deep-navy drum, cyan/gold prediction readout — the premium capstone of the family.

## Target output paths
- Source JSON → `art/src/buildings/axiom_cosmology-visualization-theater.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/cosmology-visualization-theater.png`
- Preview → `art/preview/buildings/axiom_cosmology-visualization-theater.png`
- Builder script → `art/pixel-art-pipeline/builders/cosmology-visualization-theater.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window`-style glazing (reflection gradient + shine, never a black-barred grid) for the curtain ribbon; any vents via `Box.louver`. Bespoke form composed from `isobuild.py` (`cylinder` + hand-built shallow dome + oculus) — NEVER `iso.draw_cube`/`base_windows`. Must read as a **wide grand domed planetarium theater with an open oculus**, the premium showpiece, distinct from the gateways, the Observatory rotunda, and all Axiom siblings, with an oculus-projected rotating cosmic-web (filaments + voids + predicted-expansion arrow) as its hero.
