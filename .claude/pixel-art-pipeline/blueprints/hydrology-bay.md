# Hydrology Bay — blueprint (bespoke form, STANDARD)

- **Name:** Hydrology Bay · **Slug:** `hydrology-bay` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Study water systems and flow

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — an OPEN-FRONTED WATER-YARD: a hall with a big ARCHED CHANNEL MOUTH onto an open courtyard (NOT the gateway cube)
A waterworks **hall with a big arched channel mouth** that opens onto an open front courtyard holding the signature flume — an open-concept building where the water rig lives outdoors in a striped work-yard. Distinct from the enclosed siblings and from the other OPEN building (Sampling's tarp depot): this one is a solid masonry hall with a hollow arched mouth and a flowing water courtyard.
- **Main hall:** a `Box` masonry hall at the back — `Box(top≈(30,14), wx≈9, wy≈9, h≈13)` — `M`/`D` walls, a low hipped `L`/`M` roof. Its FRONT face is cut by a large **arched channel mouth** (a `K`-outlined arch, dark `d`/`K` interior, the channel water emerging from it) — the visual hook of the form.
- **Open courtyard:** in front of the arch, an open ground-level yard (an `L`/`M` apron) holds the flume, ringed by a band of `o`/`K` survey striping along its outer edge.
- **Header tank:** a short `cylinder` water tank on a stub stand at the hall's back-right roof — `cylinder(cx≈44, top_y≈10, rx≈4, h≈8)` — `M`/`D` with a `c` waterline band — feeding the flume (a thin `c` supply pipe arcs from it to the channel head).
- **Roofline:** low hipped hall roof + the header tank + a `D` gauge mast with a `c` blink; a couple of `D` valve wheels on the front wall beside the arch.
- **Opening side: OPEN.** The signature flume sits OUT in the open courtyard in front of the arched mouth, ringed by `o`/`K` striping — the openness is the read. (Counts as the batch's second OPEN building, paired with Sampling Station.)

## Signature feature (one-of-one — a working scale-model watershed FLUME with a teal dye-trace plume revealing a fault, flow gauges reading the diagnosis)
**In the open courtyard, a working scale-model watershed flume sends water cascading down a terraced channel — and a mineral-teal dye-trace plume injected upstream spreads through the flow, pooling and stalling at a leak/blockage fault to reveal it, while flow gauges along the channel read out the diagnosis.** No water-flume / dye-trace motif exists in the catalog (BioCore Aquatic Habitat is a fish-and-kelp REEF tank — a static ecosystem; this is moving water down a terraced flume diagnosed by a dye plume), so it collides with nothing.
- **The flume:** a stepped terraced channel of 3–4 `D`/`M` troughs descending front-left across the courtyard, white-edged `K` lips; water inside is `c`/`g` with `W` riffle highlights stepping down each fall.
- **Dye-trace plume:** a brighter `g`/`G` teal dye cloud released at the top, streaming down — and **bunching/stalling** at one trough where a `r`/`d` crack (the fault) blocks flow; that fault spot glows `O`/`r` (the diagnosed leak).
- **Flow gauges:** 2 small `K`-framed gauge dials on stub posts along the flume — needles in `o`/`O`, one swung to a red `r` low-flow reading at the fault (the diagnosis).
- **Read:** a soft `c` water-glow over the whole courtyard; a tiny `o` "FLOW" placard at the flume head.

## Motifs it must honor (TerraBase)
Mineral-teal sensor glow (the dye-trace + water glow + gauges), weatherproof instruments (the flow gauges + gauge mast), open-yard with `o`/`K` survey striping, weathered masonry/timber waterworks (`M`/`D`), sample/field-rig feel.

## Target output paths
- Source JSON → `art/src/buildings/terrabase_hydrology-bay.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/hydrology-bay.png`
- Preview → `art/preview/buildings/terrabase_hydrology-bay.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as an **open-fronted water-yard: an arched-mouth masonry hall onto a flume courtyard**, distinct from the gateways and all TerraBase siblings, with a terraced watershed flume + teal dye-trace plume revealing a fault as its hero (OPEN concept).
