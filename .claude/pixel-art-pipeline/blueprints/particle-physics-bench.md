# Particle Physics Bench — blueprint (bespoke form, STANDARD · OPEN-CONCEPT)

- **Name:** Particle Physics Bench · **Slug:** `particle-physics-bench` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** identification · **Base:** Tabletop physics experiments

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — an OPEN-CONCEPT L/`^` work-yard with the bench out in the open middle (NOT a closed box)
Compose from `art/isobuild.py` (`Box`). This is the open-concept form of the set: two low wings meeting at the BACK corner in an **L / `^`**, wrapping an **open experiment yard** that faces the viewer with the apparatus sitting out in the middle under the night sky. Clearly different from the closed halls and the towers.
- **Back-left wing:** a low `Box` along the back-left edge (an instrument/electronics wing) — e.g. `Box(top≈(22,16), wx≈8, wy≈4, h≈13)`.
- **Back-right wing:** a low `Box` along the back-right edge (a power/HV wing) — e.g. `Box(top≈(40,16), wx≈4, wy≈8, h≈13)`. The two wings meet at the back apex, leaving the front-center OPEN.
- **Open yard floor:** a thin low slab across the open front-middle (the bench pad), ringed by an `o`/`K` **hazard-stripe** kerb (radiation-area striping). A `D` instrument rack leans on one wing, a couple of `c` readout dots on the wings.
- **Glazing/roofline:** small `g`/`c` windows via `Box.window` + a thin `o` HV conduit on the wing faces (vary them, NOT a repeated strip); `D` corrugation + a small `c` sensor puck on the wing roofs. The open yard itself is the "opening".
- **Opening side: OPEN.** The signature apparatus sits OUT in the open middle and must read on its own — the cloud-chamber dome GLOWS so it pops against the open dark yard; the wings stay plain backdrop.

## Signature feature (one-of-one — a benchtop cloud chamber with spiraling cosmic-ray tracks and a lit particle ID tag)
**On the open bench sits a glass-domed cloud chamber where curling cosmic-ray particle tracks spiral through the supersaturated vapor and a detected particle lights up its identification tag.** No cloud-chamber / particle-track / cosmic-ray-detection motif exists anywhere in the catalog, and it is deliberately distinct from #5 Quantum Simulation Lab (a qubit-processor chandelier) and #7 Observatory Dome (a telescope on a star) — this is sub-atomic tracks in vapor on a tabletop. Collides with nothing.
- **Cloud-chamber dome:** a small clear `h`/`c` glass hemisphere on a `D`/`M` base block sitting on the open yard pad, `K`-rimmed, with a faint `c` vapor haze inside.
- **Particle tracks:** 3–4 curling `o`/`O` track lines spiraling and curving inside the dome (a tight spiral, a couple of long arcs, one short fork) — bright `O` for the freshly detected track, dimmer `o`/`c` for older fading ones.
- **The detection:** one track ends in a small bright `O`/`W` flash, and a `K`-framed `c`/`o` **ID tag** pops above the dome reading the particle (a glowing label panel with a tiny `o` glyph + a lit `O` "IDENTIFIED" dot).
- **Yard polish:** a soft `c` glow under the dome on the pad; an `o`/`K` magnet-coil ring around the chamber base (the curving field); one `o` "PARTICLE BENCH" placard on a wing.

## Motifs it must honor (Axiom)
Particle rings (the literal curving cosmic-ray tracks + magnet-coil ring — the definitive particle motif of the set), gold starlight glints (`o`/`O` tracks + detection flash), navy night-sky glass (`h`/`c` chamber dome + wing windows), `M`/`D` deep-navy walls, `o`/`K` hazard striping ringing the open yard.

## Target output paths
- Source JSON → `art/src/buildings/axiom_particle-physics-bench.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/particle-physics-bench.png`
- Preview → `art/preview/buildings/axiom_particle-physics-bench.png`
- Builder script → `art/pixel-art-pipeline/builders/particle-physics-bench.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); any vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as an **open-concept L/^ experiment yard with the apparatus out in the open middle**, distinct from the gateways and all Axiom siblings, with a glowing benchtop cloud chamber (spiraling tracks + lit particle ID tag) as its hero.
