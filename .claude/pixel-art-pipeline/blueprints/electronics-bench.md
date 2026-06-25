# Electronics Bench — blueprint (bespoke form)

- **Name:** Electronics Bench · **Slug:** `electronics-bench` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Build and debug analog/digital circuits

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a STEPPED / TERRACED two-volume block (NOT the gateway cube)
This silhouette is new to the set (none of the 5 made Volt forms is a stepped block): a low front workbench wing with a taller rear instrument tower **set back** behind it, so the roofline rises in two clear steps from front to back.
- **Front bench wing (low, wide):** a low broad `Box` at the front — roughly `Box(top≈(28,24), wx≈13, wy≈9, h≈10)`. Squat and wide, like a long lab bench. Drawn so a front corner faces the viewer.
- **Rear instrument tower (taller, set back):** a narrower, clearly TALLER `Box` set back behind the bench on the back-LEFT — roughly `Box(top≈(22,12), wx≈8, wy≈6, h≈18)`. Draw it FIRST (it's the back volume) so the front bench wing occludes its base — the step/setback reads as one stepped building, not two.
- **Roofline:** two flat decks at different heights (the terrace step). The lower bench roof carries `D` corrugation ribs; the upper tower deck carries the signature scope. A short `K` parapet lip runs the front edge of the upper deck.
- **Bespoke glazing — put the main opening on the RIGHT face (vary from left):** the lit-front **right** face of the low bench wing carries a long horizontal **diagnostics window band** — a single wide ribbon of small cyan readout panels (4–5 little `g` panels in a row under one `K` lintel), NOT two stock gateway windows. The rear tower's left face gets one tall narrow `c` instrument-rack slit. A small `K` service door sits at the right-front corner of the bench wing.

## Signature feature (one-of-one — a working oscilloscope screen on the roof)
**The upper instrument-tower deck is crowned by a giant working oscilloscope — a `K`-bezelled CRT screen showing a live, glowing green waveform trace, with a row of tuning knobs underneath.** Distinct from every other rooftop toy in the catalog (no scope/CRT exists anywhere).
- A chunky `K`-framed screen box stands proud on the tower deck, facing the viewer; the screen field is dark `d`/`K` with a faint `g` graticule grid (a few `G` grid lines).
- Across the screen runs a bright **sine/square waveform** drawn in `g`/`h` (a glowing cyan-green trace, 1px peaks), with one `O` white-hot blip at the cursor.
- Below the bezel: a row of 3–4 round tuning **knobs** (`M` disks, `K` rim, one `o` pointer dot each) and two `o`/`O` status LEDs.
- A thin `o` glowing power line feeds the scope from the conduit run.

## Motifs it must honor (Volt Lab)
Corrugated `D` roof ribs + rivet dots, `o` glowing power line along the bench eave, `o` power conduit down a front corner, cyan readout panels (the diagnostics band), warning chevron on the service-door sill.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_electronics-bench.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/electronics-bench.png`
- Preview → `art/preview/buildings/volt_lab_electronics-bench.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **stepped two-step building** clearly different from the gateways and from its 4 Volt siblings, with the **main window band on the RIGHT face**.
