# Workshop — blueprint (bespoke-form rebuild · OPEN-CONCEPT L/^)

- **Name:** Workshop · **Slug:** `workshop` · **Lab type:** `volt_lab`
- **Role:** starter · **Mini-game:** configuration · **Base:** Default workbench for general builds

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — an OPEN-CONCEPT maker-yard, L / `^` footprint (NOT a closed box)
Compose from `art/isobuild.py` (`Box`). This one is the open-concept design: two low wings meeting at the BACK corner in an **L / `^`**, wrapping an **open work-yard** that faces the viewer with the gear sitting out in the middle. Clearly different from the CNC hall (closed wide box) and the Robotics hangar (tall box).
- **Back-left wing:** a low `Box` running along the back-left edge (a tool/storage wing) — e.g. `Box(top≈(22,16), wx≈8, wy≈4, h≈14)`.
- **Back-right wing:** a low `Box` running along the back-right edge (a forge/power wing) — e.g. `Box(top≈(38,16), wx≈4, wy≈8, h≈14)`. The two wings meet at the back apex, leaving the front-center OPEN.
- **Open yard floor:** a thin low `Box` (or `fill_poly` slab, h≈2) across the open front-middle as the concrete pad, ringed by an `o`/`K` **hazard-stripe** kerb. In the middle, place the "icons": a small `K`-outlined **workbench/anvil** block, a `D` tool-rack against a wing, a couple of `c` readout dots — so the open middle reads as an active work-yard.
- **Glazing/doors:** small windows + a tool board on the wing faces (vary them); the open yard itself is the building's "opening" (no big shutter needed). A couple of `K` rivets + `D` corrugation on the wing roofs.

## Signature feature (registered — keep it)
**Spinning anvil-and-wrench weathervane cupola throwing yellow sparks.** A small `M`/`D` corrugated cupola on the taller wing's roof; a short `K` mast; a clear `D`/`d` **anvil** silhouette (squat body, horn one way) with a `M` **wrench** behind it (a readable anvil+wrench, NOT a symmetric X — that's the Arena's); a 3–4px `o`/`O` **spark** burst off the struck face. One `o` power line runs up into the cupola.

## Motifs it must honor (Volt Lab)
Corrugated wing roofs + rivets, glowing `o` power line, `o`/`K` hazard chevrons ringing the yard, cyan readout dot, conduit.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_workshop.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/workshop.png`
- Preview → `art/preview/buildings/volt_lab_workshop.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible. 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges. Must read as an **open-concept L/^ work-yard** — distinct from every other Volt building.
