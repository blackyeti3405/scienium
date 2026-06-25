# 3D Printing Shop — blueprint (bespoke-form rebuild · TALL TOWER, RIGHT opening)

- **Name:** 3D Printing Shop · **Slug:** `3d-printing-shop` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** optimization · **Base:** Additive prototyping

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a TALL, SLENDER print tower (NOT the gateway cube; opening on the RIGHT)
Compose from `art/isobuild.py` (`Box`). Vertical emphasis — the opposite of the wide CNC hall — so the silhouette reads "tower". Different again from the Robotics hangar (which is tall but a hollow open bay).
- **Main tower:** a narrow, TALL `Box` — e.g. `Box(top≈(26,12), wx≈7, wy≈6, h≈30)`. Slender footprint, tall walls.
- **Base annex:** a small low `Box` abutting the LEFT side as a materials/base unit, so the tower has a stepped base.
- **OPENING ON THE RIGHT:** put the main door/entry + glazing on the **right (shaded) face** this time (vary from the left-opening prototypes) — a `K`-framed entry with a tall narrow cyan window stack and a sample-shelf window. Keep the left face plainer (a couple of vents).
- Corrugated tower walls (vertical `D`/`d` ribs read as panel seams), rivets, an `o` power line up one corner.

## Signature feature (registered — keep it)
**Glass-domed extruder tower printing a glowing part up in visible stacked layers.** Cap the tower with a clear `c`/`h` `K`-framed **print-chamber dome**; inside, a `D`/`M` gantry post + `K` extruder head over a half-built **model** drawn as stepped horizontal **print-lines** — hot `o`/`O` top layers cooling to `r` below — so it's unmistakably additive. A `c` filament spool feeds a thin `c` line to the head; an `o` hot-end glow dot under the nozzle; a small `g` build-progress bar on the dome base.

## Motifs it must honor (Volt Lab)
Corrugated panel seams + rivets, glowing `o` power line, cyan readout/progress bar, conduit (the filament line + a cable bundle).

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_3d-printing-shop.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/3d-printing-shop.png`
- Preview → `art/preview/buildings/volt_lab_3d-printing-shop.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible. 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges. Must read as a **tall slender print tower with a right-side opening** — distinct from the other Volt buildings.
