# Climate Modeling Station — blueprint (bespoke form, STANDARD)

- **Name:** Climate Modeling Station · **Slug:** `climate-modeling-station` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** optimization · **Base:** Run simulations of Earth systems

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a WIDE LOW SIMULATION HALL with an OPEN ROOF OCULUS (NOT the gateway cube, NOT a sphere, NOT the data-center block)
A wide low **simulation hall** capped by a round **open roof oculus** — a circular opening cut in the center of the roof through which the signature hologram floats up. The oculus (a `K`-rimmed `cylinder`-mouth ring set into the roof) is the form's signature massing element. Deliberately NOT a globe/sphere on the roof (Greenhouse/Bioinformatics own those), and NOT the ChemWorks stepped data-center block (Computational Chemistry Hub owns that) — this is a low broad hall with a glowing circular sky-hole.
- **Main hall:** a wide low `Box` — `Box(top≈(30,18), wx≈12, wy≈10, h≈11)` — `M`/`L` walls (modern compute-hall feel), a flat `L` roof deck.
- **Roof oculus:** a circular opening in the center of the roof — a `K`-rimmed shallow ring (a short `cylinder` rim, e.g. `cylinder(cx≈34, top_y≈12, rx≈5, h≈2)`, hollow), its interior glowing `c`/`g` from the simulation light below; this is where the hologram floats up. A clean recognizable round sky-hole.
- **Side compute-stacks:** a low `D`/`M` bank of cooling fins along the back-right roof edge (a thin ribbed strip with `c` blink lights) — compute hardware without being the stacked data-center block.
- **Roofline:** the central glowing oculus (with the hologram above) + the cooling-fin strip; an `o` "SIM" placard over the door.
- **Opening side: LEFT.** The hero is a `K`-framed control door + a wide operator window on the LIT LEFT face (`M`/`L`, `c` glass, `o` placard, `c`/`g` screen-glow inside). Keep the SHADED RIGHT face plainer — a clean wall with one `d` vent strip and the cooling fins at the roofline.

## Signature feature (one-of-one — a hovering holographic EXPLODED STACK of Earth-system layers with an optimization fork lighting the best-outcome scenario green)
**Rising out of the roof oculus, a hovering holographic exploded stack of Earth-system layers floats apart — separate horizontal sheets for ocean, land, atmosphere and ice — with teal and amber flows passing between the sheets, and an optimization dial that lights one branch of a forecast fork green as the best-outcome scenario (a faint previewed future-Earth ghost).** No exploded-layer-stack / scenario-fork motif exists in the catalog, and it is deliberately NOT a globe (Greenhouse/Bioinformatics own rooftop spheres) and NOT the ChemWorks ball-and-stick-molecule ghost (Computational Chemistry Hub owns that pose-ghost), so it collides with nothing.
- **Exploded layer sheets:** 3–4 floating horizontal `c`/`h` holographic sheets stacked with gaps above the oculus — bottom `g` ocean, `o`/`M` land, `c`/`h` atmosphere, `W`/`h` ice cap — each a thin tinted slab with a `K` edge.
- **Inter-layer flows:** little `c` (teal) and `o` (amber) flow arrows passing up/down between the sheets (energy/water exchange).
- **Optimization fork:** off to one side, a small `g`/`O` branching fork of two forecast paths — one branch lit bright `g`/`O` (the best outcome), the other dim `d` — the optimization read.
- **Future-Earth ghost:** a faint `c`/`h` ghosted preview disc beside the fork hinting the previewed future state; a tiny `o` "OPT" readout.

## Motifs it must honor (TerraBase)
Mineral-teal sensor glow (the holographic sheets, flows, oculus glow — the most data-driven glow in the set), weatherproof/field compute hardware (the cooling-fin stacks), the Earth-systems read (ocean/land/atmosphere/ice layers in earthy + teal tones), `M`/`L` field-station build.

## Target output paths
- Source JSON → `art/src/buildings/terrabase_climate-modeling-station.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/climate-modeling-station.png`
- Preview → `art/preview/buildings/terrabase_climate-modeling-station.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **wide low simulation hall with a glowing open roof oculus (NOT a globe, NOT a data-center block)**, distinct from the gateways and all TerraBase siblings, with a hovering exploded Earth-system layer stack + best-outcome optimization fork as its hero, opening on the LEFT.
