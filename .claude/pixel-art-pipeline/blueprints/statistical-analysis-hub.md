# Statistical Analysis Hub — blueprint (bespoke form, STANDARD)

- **Name:** Statistical Analysis Hub · **Slug:** `statistical-analysis-hub` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Choose and run the right test

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a STEPPED TWO-BLOCK COMPUTE HUB (server-vent louvers) with a rooftop holo-emitter (NOT the gateway cube)
A small **compute/server hub**: two cleanly-stacked blocks in a stepped setback (a taller compute core behind, a lower terminal block in front), the core's flanks lined with **server-vent LOUVERS** (opaque, not glass), crowned by a rooftop holo-emitter ring. A data-center silhouette — boxy and stepped, deliberately distinct from the Data-Viz gallery (wide glass hall) and the round Comp-Social ziggurat.
- **Compute core (taller, back):** a `Box` — `Box(top≈(28,12), wx≈7, wy≈7, h≈18)` — `M`/`D` walls; its lit-LEFT face carries a `Box.louver` server-vent stack (dark recessed slats — the racks breathing) above a single small `Box.window` status pane.
- **Terminal block (lower, front-left setback):** a `Box` stepped forward and down — `Box(top≈(22,20), wx≈6, wy≈6, h≈11)` — `M`/`D`; its lit-LEFT face a `Box.window` glazed terminal room (`g`/`c` glass, `h` sheen, soft mullion) showing analyst screens.
- **Vents:** a second `Box.louver` band low on the shaded-right core face (HVAC) — opaque, keeping the build reading as a vented machine, not all glass.
- **Roofline:** a flat `M` core roof carrying a small `M`/`D` holo-emitter ring/plinth dead-center (the hero projector); a thin `o` magenta accent strip edges the roof; the stepped lower roof has a small `D` parapet.
- **Opening side: LEFT.** The hero glazing is the lit-LEFT terminal-room `Box.window` (analyst stations behind glass) — well-lit, reads on the lit face; the shaded-RIGHT core face stays plainer (vent louvers + outline), the server vents being the right-side texture. The holographic bell-curve hovers above, lit from within.

## Signature feature (one-of-one — a rooftop holographic BELL-CURVE with magenta-shaded tails, a significance-threshold line, and a p-value needle dropping past it to light a "SIGNIFICANT" stamp)
**Above the roof, a rooftop holographic BELL-CURVE (normal distribution) hovers with magenta-shaded tails; a significance-threshold line crosses it and a p-value needle DROPS past the line, lighting a small "SIGNIFICANT" stamp — diagnosing which test result clears the bar.** No bell-curve / distribution-with-shaded-tails / p-value-needle / significance-stamp motif exists anywhere in the catalog, and it is visually distinct from TerraBase's teal PIE-dial and optimization FORK (this is a smooth symmetric curve with tails + a threshold line, not a pie wedge or a branching fork).
- **Bell-curve:** a smooth symmetric `c`/`g` holographic curve sitting on a faint `M`/`d` axis baseline, glowing soft above the emitter; the two outer **tails shaded magenta** (`o`/`r`) = the rejection regions.
- **Threshold line:** a thin dashed `O`/`o` vertical significance line (α) crossing the curve's tail.
- **p-value needle:** a small `O`/`h` needle/marker dropping DOWN the curve and crossing PAST the threshold line, with a faint motion trail.
- **SIGNIFICANT stamp:** a tiny `K`-framed `o`/`O` stamp lighting up beside the curve when the needle clears the line = the diagnosis (right test, significant result).

## Motifs it must honor (MindFrame)
Soft-glow data screen (the holographic bell-curve + terminal screens behind glass), clean observation glass (the lit terminal-room pane + status pane), seating (analyst stations implied behind the terminal glass — keep subtle), gentle magenta accent light (`o` roof strip + shaded curve tails + threshold/needle). Server louvers add the "computing" texture.

## Target output paths
- Source JSON → `art/src/buildings/mindframe_statistical-analysis-hub.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/statistical-analysis-hub.png`
- Preview → `art/preview/buildings/mindframe_statistical-analysis-hub.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels); server vents read as opaque LOUVERS, not glass. Must read as a **stepped two-block compute hub with server louvers, glazed terminal room on the LEFT**, distinct from gateways + all MindFrame siblings, with a rooftop holographic bell-curve (shaded tails + significance line + p-value needle + SIGNIFICANT stamp) as its hero.
