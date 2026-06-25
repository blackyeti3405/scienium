# Mechanical Testing Rig — blueprint (bespoke form)

- **Name:** Mechanical Testing Rig · **Slug:** `mechanical-testing-rig` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** prediction · **Base:** Stress, fatigue, and load testing

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a TALL OPEN STRUCTURAL LOAD-FRAME / GANTRY (NOT the gateway cube)
A skeletal, open structure unlike any made Volt form (none is an open load-frame): a low solid base block with a tall **open four-post load-frame** rising out of it — exposed girders, not enclosed walls. The openness is the whole point: you see straight through the frame to the specimen being crushed.
- **Base plinth (low, solid):** a low broad `Box` — roughly `Box(top≈(26,30), wx≈12, wy≈10, h≈9)` — the heavy machine foundation. Corrugated `D` skirt, rivet line.
- **Open load-frame (tall, skeletal):** ABOVE the plinth, build a tall open portal from FOUR `K`/`D` corner columns (thick 2px posts, `L` lit edge / `D` shade) rising ≈22px, joined by a heavy `M`/`L` **crosshead beam** across the top and a mid `D` tie-beam. This is drawn as girders + outline, NOT filled walls — the middle is OPEN so the crush chamber is visible inside. Use `Box` edges/`line` for the frame members; do not fill the interior.
- **Roofline:** the frame's top crosshead beam IS the roofline — a flat heavy `K`-outlined girder cap with `o` hazard chevrons painted on its front face and a small `c` warning-lamp puck at one corner. No corrugated roof up top; the silhouette reads as an open gantry tower.
- **Bespoke glazing / opening — opening on the LEFT face of the plinth:** the lit base block's **left** face carries a single wide `K`-framed control panel (a `g` cyan load-readout screen with a digital number band) — the operator station. No stock gateway windows anywhere. The frame itself has no glazing (it's open steel).

## Signature feature (one-of-one — a glass crush-chamber compressing a glowing specimen)
**Caged inside the open load-frame, a hydraulic piston drives DOWN onto a glowing test specimen inside a small glass crush-cylinder — and a big round gauge needle swings toward redline.** No press/piston/dial-gauge exists anywhere else in the catalog.
- A thick `M`/`L` **hydraulic ram** descends from the crosshead, `K` outline both edges, an `o` band at its collar.
- Beneath it, a short `c`/`g` translucent **glass cylinder** holds a bright specimen (`O`/`o` glowing core) being compressed — a couple of `h` stress-glint cracks radiating, `o` strain sparks at the contact point.
- Mounted on a frame post: a round **load gauge** — a `W`/`L` dial disk, `K` rim, `G` tick marks, and a bold `o`/`r` needle swung up toward an `r` redline arc. One `O` peak-hold blip.
- A glowing `o` hydraulic line snakes from the base pump up to the ram.

## Motifs it must honor (Volt Lab)
Exposed girders & rivets (the whole frame), `o` warning chevrons on the crosshead, glowing `o` hydraulic/power line, cyan readout panel (load screen), `c` warning lamp.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_mechanical-testing-rig.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/mechanical-testing-rig.png`
- Preview → `art/preview/buildings/volt_lab_mechanical-testing-rig.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down) — here the "roof" is the open crosshead cap. 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **tall open load-frame** (see-through girders, specimen visible inside) clearly different from the gateways and the 4 Volt siblings, with the **control panel on the LEFT face**.
