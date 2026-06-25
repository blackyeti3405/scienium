# Embedded Systems Lab — blueprint (bespoke form)

- **Name:** Embedded Systems Lab · **Slug:** `embedded-systems-lab` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** configuration · **Base:** Microcontroller-based projects

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a LONG SAWTOOTH-ROOF SHED (NOT the gateway cube)
A long, low single-volume shed whose roof is a row of **sawtooth monitors** — a serrated profile no made Volt form has (the CNC used ONE clerestory; this is a repeated saw-tooth ridge line, the unmistakable cue of a maker shed).
- **Main shed (long, low):** one long low `Box` — roughly `Box(top≈(24,20), wx≈14, wy≈8, h≈12)`. Distinctly elongated and squat.
- **Sawtooth roof:** along the top, build 3 repeating **sawtooth wedges** — small `Box`/triangular monitors stepped across the ridge, each with a steep `D` shaded back slope and a near-vertical glazed front face. Each tooth's front face carries a small `g`/`c` north-light glazing strip. The serrated roof outline is the silhouette signature; vary tooth shading W→L→M so the row reads as repeated teeth.
- **Bespoke glazing / opening — main door on the LEFT face:** the lit-front **left** face carries a wide `K`-framed roll-aside **garage/bay door** of vertical `M`/`D` slats (vertical, distinct from CNC's horizontal slats) on the LEFT; the **right** face carries a horizontal strip of small square **bench portholes** (a row of 4 tiny `c` round windows) — NOT stock gateway windows. A `o` chevron sill under the bay door.

## Signature feature (one-of-one — a rooftop breadboard garden of glowing microcontroller "seedlings")
**The roof between the sawteeth is a working solderless breadboard "garden": a `W`/`L` breadboard slab studded with a grid of tie-point holes, sprouting a trellis of bright jumper wires, and three little microcontroller boards glowing like seedlings with blinking pin LEDs.** No breadboard/jumper-wire/MCU-seedling motif exists in the catalog (and it's not the PCB Fab's circuit-board roof — this is a 3D prototyping garden with raised boards + arching wires, not a flat trace board).
- A pale `W`/`L` **breadboard slab** lies on the front roof deck with a faint grid of `d` tie-point dots and a central `D` channel.
- **Jumper-wire trellis:** several thin arching wires in distinct palette colors (`o` yellow, `c` cyan, `g` teal, `r` amber) hopping between boards like climbing vines — single-pixel arcs with `K`-pinned ends.
- Three tiny **MCU boards** stand up like seedlings: small `g`/`G` board chips on `K` legs, each with a raised `K` DIP and a blinking pin LED (`o`/`O`/`c`) — one mid-blink bright.
- A faint `c` glow halo over the garden; an `o` power rail line feeds it.

## Motifs it must honor (Volt Lab)
Corrugated `D` ribs on the shed walls + rivets, `o` glowing power rail to the garden, `o` power conduit down a front corner, cyan readout/porthole glazing, warning chevron on the bay-door sill.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_embedded-systems-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/embedded-systems-lab.png`
- Preview → `art/preview/buildings/volt_lab_embedded-systems-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **long sawtooth-roof shed** clearly different from the gateways, from the CNC's single clerestory, and from its other Volt siblings, with the **bay door on the LEFT face**.
