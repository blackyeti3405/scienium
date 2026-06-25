# CNC Mill Shop — blueprint (bespoke-form rebuild)

- **Name:** CNC Mill Shop · **Slug:** `cnc-mill-shop` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** configuration · **Base:** Precision subtractive fabrication

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a wide, low machine-shop hall (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`, `cylinder`). Target a squat industrial **fabrication hall**, distinctly wider-than-tall, clearly a *different building* from the gateways and from Robotics Bay:
- **Main hall:** one wide low `Box` — roughly `Box(top≈(24,18), wx≈13, wy≈9, h≈13)`. Low and broad, like a shop floor.
- **Clerestory monitor:** a long, narrow raised `Box` on the roof ridge (a north-light factory monitor) — e.g. `Box(top≈(28,11), wx≈9, wy≈3, h≈5)` — carrying a band of small cyan clerestory windows. This raised ridge is the key silhouette cue that says "factory", not "gateway box".
- **Cyclone dust collector:** a tall narrow `cylinder(...)` abutting the right/back corner (a machine-shop hallmark), with a small `o` conduit running to it.
- **Glazing (bespoke — NOT two stock windows):** a **wide segmented roll-up shutter door** on the lit front face (horizontal `D`/`M` slats under a `K` lintel), a small **cyan control readout panel** beside it, and the clerestory window band on the monitor. Hazard chevrons on the shutter sill.

## Signature feature (registered — keep it)
**Glass-boxed rooftop 3-axis cutting gantry carving a clamped workpiece, with coolant mist + swarf.** A `K`-framed glass enclosure on the roof (beside/over the monitor): a boxy spindle carriage on twin `D` rails, a tool bit pointing straight **down** into a clamped `L` workpiece block with a clear `K` cut-notch removed, a white-hot `O` cut spark with `c`/`h` coolant mist, and 2–3 `o` swarf chips flicking to one side. Reads as **subtractive** milling (material removed), distinct from the additive 3D-print tower.

## Motifs it must honor (Volt Lab)
Corrugated metal roof + rivets, a glowing `o` power line along the front eave, cyan readout panel, warning chevrons, conduit run to the cyclone.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_cnc-mill-shop.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/cnc-mill-shop.png`
- Preview → `art/preview/buildings/volt_lab_cnc-mill-shop.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **different building** from the gateways and from Robotics Bay.
