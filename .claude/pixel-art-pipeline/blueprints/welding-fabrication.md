# Welding & Fabrication — blueprint (bespoke form)

- **Name:** Welding & Fabrication · **Slug:** `welding-fabrication` · **Lab type:** `volt_lab`
- **Role:** standard · **Mini-game:** configuration · **Base:** Metalwork and structural assembly

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — an OPEN-AIR FAB YARD (L-footprint) with a GANTRY CRANE (NOT the gateway cube)
An open `^`/L work-yard, but distinct from the Workshop's open-yard: here two low closed wings wrap a back corner and an **overhead gantry crane bridges the open middle** on rails — the crane is the dominant silhouette, not a rooftop ornament. The open middle holds the welding action out in the open, ringed with hazard striping.
- **Two low wings (L / `^`):** a back-LEFT wing `Box(top≈(20,18), wx≈6, wy≈5, h≈12)` and a back-RIGHT wing `Box(top≈(40,18), wx≈5, wy≈6, h≈12)` meeting at the back corner, leaving the FRONT-middle open as the work-yard floor. Corrugated `D` ribs, rivets, flat roofs.
- **Gantry crane over the yard:** two `K`/`D` **gantry legs** (one on each wing) carry a horizontal `M`/`L` **crane bridge beam** spanning the open middle high up, with a `D` trolley + `K` hook-block and a thin `M` cable dropping toward the yard floor. This bridge is the rooftop-height silhouette cue. `o` hazard stripes on the beam.
- **Roofline:** two low flat wing roofs PLUS the high crane bridge above the gap — a stepped/open profile, not a single closed roof. A short `o` power conduit climbs a gantry leg.
- **Bespoke glazing / opening — main opening is the OPEN YARD itself (front-center), plus a door on the RIGHT wing:** no big garage door; the opening is the open yard. The right wing's lit face carries one `g` cyan supervisor window + a `K` man-door; the left wing's face carries a vertical rack of stacked `M`/`D` stock-metal bars (raw material). The yard floor is ringed with `o`/`K` hazard chevrons.

## Signature feature (one-of-one — an arc-welder torch throwing a cyan-white spark fountain over an I-beam)
**In the open yard, a suspended welding torch strikes a brilliant arc on a steel I-beam joint — a fierce `O`/`W` flash with a cyan-white spark fountain raining down, and the surrounding metal glows hot.** No arc-weld/spark-fountain motif exists anywhere (distinct from the Workshop's small weathervane sparks — this is a big directed welding arc on a workpiece).
- A `K`/`D` **torch head** drops from the crane trolley on a `M` lead, nozzle pointed at the joint.
- At the strike point: a hot **arc flash** — an `O` white-hot core, `W`/`h` halo, radiating `c`/`g` cyan spark streaks fountaining outward and down; a couple of `o` ember chips bouncing on the floor.
- A bright steel **I-beam** workpiece (`L` top flange, `M` web, `D` lower flange, `K` outline) sits on `D` trestles in the yard; the weld seam glows `o`→`O` and the nearby metal carries an `r` heat-tint.
- A welder's `g` arc-glow reflection casts onto the inner wing walls (a faint `c` rim light).

## Motifs it must honor (Volt Lab)
Exposed girders (the gantry), corrugated wing roofs + rivets, `o` hazard chevrons ringing the work-yard, glowing `o` power conduit, cyan supervisor window, warning-chevron stripes on the crane beam.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_welding-fabrication.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/welding-fabrication.png`
- Preview → `art/preview/buildings/volt_lab_welding-fabrication.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as an **open fab YARD with an overhead gantry crane** clearly different from the gateways, from the Workshop's open-yard, and from its other Volt siblings, with the **work opening front-center and the door on the RIGHT wing**.
