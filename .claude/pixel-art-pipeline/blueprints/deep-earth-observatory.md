# Deep Earth Observatory — blueprint (bespoke form, PREMIUM)

- **Name:** Deep Earth Observatory · **Slug:** `deep-earth-observatory` · **Lab type:** `terrabase`
- **Role:** premium · **Mini-game:** prediction · **Base:** Probe planetary-scale processes

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a TALL DRAMATIC DRILL-RIG DERRICK rising over a glowing borehole shaft (NOT the gateway cube)
The premium showpiece: a **tall open lattice drill-rig derrick** — a tapering four-leg steel tower — rising over a low equipment base, straddling a glowing borehole that plunges into the earth. The tallest, most dramatic, most open-lattice silhouette of the set (an airy tapering tower, not a solid cylinder or box). The hero is the cutaway shaft DOWN through the planet beneath it.
- **Derrick tower:** four `D`/`M` steel legs rising from a wide base footprint and tapering inward to a small crown platform near the canvas top — drawn as four converging `K`/`D` lines with `d` cross-bracing rungs (an open lattice you can see through). A small `D` crown block + a `c` work-light at the top.
- **Equipment base:** a low `Box` around the derrick feet — `Box(top≈(30,30), wx≈11, wy≈9, h≈8)` — `M`/`D` walls, the rig house; an `o` hazard stripe and a `D` draw-works drum on its deck. The borehole opens through the center of this base.
- **Borehole collar:** a `K`-rimmed circular shaft mouth in the center of the base deck, glowing `O`/`c` from below (the top of the cutaway shaft).
- **Roofline:** the open lattice derrick crown + crown-block + work-light; thin `D` cable/draw-line running from the crown down into the borehole.
- **Opening side: RIGHT (glowing).** The hero rig-house face is the SHADED RIGHT face of the base: a `K`-framed control window + door that GLOWS (bright `O`/`o` interior, `g`/`c` instrument readouts, `h` reflection) so it reads on the shaded side. Keep the LIT LEFT base face plainer — plain wall with one `c` window and the draw-works drum.

## Signature feature (one-of-one — a cutaway glowing vertical SHAFT plunging through the planet's concentric interior layers, a probe descending, a predicted reading rising the shaft, crowned by the derrick)
**Beneath the derrick, a cutaway glowing vertical shaft plunges straight down into a cross-section of the planet's interior — concentric crust / mantle / outer-core / inner-core layers glowing amber→teal — with a probe descending the shaft on its line and a predicted seismic/heat reading rising back up to the surface, the whole thing crowned by the lattice derrick.** No planetary-interior-cross-section / descending-borehole-probe motif exists in the catalog, and it is deliberately distinct from #4 Geological Core Lab (that's a small physical drill-core SAMPLE on a rack; this is the whole PLANET'S interior in cutaway down a live borehole), so it collides with nothing.
- **Cutaway shaft:** a narrow vertical `K`-walled shaft dropping from the borehole collar down through the base of the sprite, its interior glowing.
- **Interior layers:** the shaft passes through nested concentric bands toward the bottom — `D`/`r` crust → `r`/`o` mantle → `O`/`o` outer-core (hottest, brightest) → `c`/`g` inner-core glint — an amber→teal gradient deep glow.
- **Descending probe:** a small `W`/`c` probe capsule on a thin `D` line, partway down the shaft, with a blinking `O` sensor light.
- **Rising prediction:** a thin `g`/`c` data-trace + small rising `O` reading-blips traveling UP the shaft to a `K`-framed surface gauge whose needle climbs to a bright `O` predicted mark (the prediction).
- **Premium polish:** a subtle `O`/`c` glow halo around the whole borehole; an `o` "DEEP EARTH" placard on the rig house.

## Motifs it must honor (TerraBase)
Drill rigs (the literal derrick + borehole + draw-works — the definitive drill-rig of the set), layered rock strata (the planetary interior cross-section), weatherproof instruments & antennae (the descending probe + surface gauge + work-lights), mineral-teal sensor glow (the rising data-trace + readouts), `M`/`D` steel field hardware, `o` hazard striping.

## Target output paths
- Source JSON → `art/src/buildings/terrabase_deep-earth-observatory.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/deep-earth-observatory.png`
- Preview → `art/preview/buildings/terrabase_deep-earth-observatory.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **tall open-lattice drill-rig derrick over a glowing borehole**, the premium showpiece, distinct from the gateways and all TerraBase siblings, with a cutaway shaft through the planet's glowing interior layers (descending probe + rising prediction) as its hero, rig-house glowing on the RIGHT.
