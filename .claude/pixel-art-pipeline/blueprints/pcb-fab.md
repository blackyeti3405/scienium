# PCB Fab — blueprint (bespoke-form rebuild · FLAT CLEAN-ROOM, RIGHT opening)

- **Name:** PCB Fab · **Slug:** `pcb-fab` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** configuration · **Base:** Design and produce circuit boards

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a LOW, FLAT, sleek clean-room block (opening on the RIGHT)
Compose from `art/isobuild.py` (`Box`). Sleek and SEALED — smooth horizontal clean-room, the opposite of the gritty CNC factory and the tall print tower. The big flat roof is the hero (it IS the circuit board), so keep the body low and clean.
- **Main clean-room:** a wide, LOW `Box` with a big flat roof — e.g. `Box(top≈(24,20), wx≈12, wy≈9, h≈11)`. Smooth lit/shaded walls (minimal grime), `W` parapet rim line around the flat roof.
- **Airlock vestibule (RIGHT opening):** a small `Box` abutting the **right (shaded) face** as an entry airlock — a `K`-framed sealed door with an `o`/`K` hazard chevron and a `c` status light. This is the building's opening, on the right (vary from the left-opening prototypes).
- **Glazing:** a sleek horizontal **clean-room window band** (one long `g`/`c` strip, `K`-framed) low on the lit front face — NOT stock punched windows. A couple of `D` louver vents.

## Signature feature (registered — keep it)
**Roof IS a live circuit board — cyan traces, gold pads, a RAISED DIP-chip cupola, yellow current pulse.** Treat the flat roof as the PCB substrate (`d` board): route continuous `g`/`c` **traces** from a central **DIP chip** — a small RAISED rectangular block (flat lit `L`/`W` top, thin `K` shadow edge, `M` **pin** ladders down both long sides, a `g` orientation-notch) — out to `r`/`o` **gold pads**; light ONE trace with an `O`/`o` **current pulse** and one pad bright `O`. Add 2–3 `D` SMD chips + one `c` capacitor can. (The chip must read as a raised IC with pins, never a pit or a featureless mound.)

## Motifs it must honor (Volt Lab)
A thin `D` corrugated/parapet frame around the PCB roof, rivets at the frame corners, cyan board-tester window, `o` current-pulse power line on the roof, an `M` ribbon-cable bundle off one roof edge.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_pcb-fab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/pcb-fab.png`
- Preview → `art/preview/buildings/volt_lab_pcb-fab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down — essential, the roof is the signature). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges. Must read as a **low flat clean-room with a right-side airlock** — distinct from the other Volt buildings.
