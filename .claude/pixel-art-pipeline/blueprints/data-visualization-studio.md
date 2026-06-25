# Data Visualization Studio — blueprint (bespoke form, STANDARD)

- **Name:** Data Visualization Studio · **Slug:** `data-visualization-studio` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** configuration · **Base:** Communicate findings visually

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a WIDE LOW GLASS-FORWARD GALLERY HALL with a skylight terrace (NOT the gateway cube)
The most **glass-forward**, gallery-like member of the set: a wide low exhibition hall whose lit front is dominated by large display windows showing charts, topped by a slim skylight/terrace lantern. A broad, transparent, gallery silhouette — distinct from the boxy compute Hub and the long narrow Wing.
- **Gallery hall block:** a wide low `Box` — `Box(top≈(26,15), wx≈12, wy≈7, h≈12)` — `M`/`D` walls; its lit-LEFT face is mostly GLASS: TWO large `Box.window` **display windows** (big panes, soft sheen, a single soft mullion each, `g`/`c` glass) showing framed charts inside — the gallery showing its work.
- **Skylight lantern:** a slim raised `Box` clerestory/lantern running along the roof ridge — `Box(top≈(28,8), wx≈9, wy≈2, h≈5)` — its sides small `Box.window` skylight strips letting light onto the studio floor; this lantern base is the plinth the hero projects from.
- **Entry terrace stub:** a tiny low `Box` terrace/porch off the front corner — `Box(top≈(22,24), wx≈4, wy≈3, h≈6)` — `M`/`D`, a `K`-framed glass entry.
- **Roofline:** a flat `M` gallery roof with the skylight lantern as its ridge; a soft `o` magenta accent strip along the eave; small `c` rooflights; the hovering viz composes above the lantern.
- **Opening side: LEFT.** The hero glazing is the lit-LEFT pair of big display windows (charts visible through glass) — glass-forward on the lit face by design; the shaded-RIGHT face stays plainer (one small window + plain wall). The hovering dashboard sits above the skylight lantern.

## Signature feature (one-of-one — a hovering 3D BAR-CHART skyline + a sweeping LINE-GRAPH ribbon being composed onto a dashboard board, with magenta scatter-dots streaming in and a color legend)
**Above the skylight lantern, a hovering 3D BAR-CHART "skyline" of glowing bars stands beside a sweeping LINE-GRAPH ribbon, both being composed onto a dashboard board — magenta SCATTER-DOTS stream in to populate it and a small color LEGEND keys the series — configuring the visualization.** No 3D-bar-skyline + line-graph + scatter-stream + legend dashboard motif exists anywhere in the catalog, and per the collision rule there is no pie chart hero (TerraBase owns the teal pie-dial) and this is distinct from the Stat Hub's smooth bell-curve (bars + a line + scattered dots + a legend = a built dashboard, not a single distribution).
- **3D bar-chart skyline:** a row of 4–5 glowing iso bars at varying heights (`g`/`c`/`o` faces, `h` tops, `K` edges) standing like a little skyline above the lantern.
- **Line-graph ribbon:** a sweeping `o`/`O` magenta line-graph ribbon arcing across/above the bars with small `h` node-dots at its vertices.
- **Scatter-dots streaming in:** a scatter of small `c`/`h`/`o` dots drifting in toward a faint `M`/`d` dashboard board frame, populating it = the configuration in progress.
- **Color legend:** a tiny `K`-framed legend swatch-stack (`g`/`o`/`c` chips with `W` label-ticks) keying the series — the "configure the viz" tell.

## Motifs it must honor (MindFrame)
Clean observation glass (the big display windows + skylight strips — most glass-forward of the set), soft-glow data screen (the hovering charts + dashboard board), seating/booths (studio desks implied behind the display glass — keep subtle), gentle magenta accent light (`o` eave strip + line-graph ribbon + scatter-dots).

## Target output paths
- Source JSON → `art/src/buildings/mindframe_data-visualization-studio.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/data-visualization-studio.png`
- Preview → `art/preview/buildings/mindframe_data-visualization-studio.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **wide low glass-forward gallery hall with big display windows on the LEFT and a skylight lantern**, distinct from gateways + all MindFrame siblings, with a hovering 3D bar-chart skyline + sweeping line-graph ribbon + streaming scatter-dots + color legend as its hero (no pie chart).
