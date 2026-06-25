# Sampling Station — blueprint (bespoke form, STARTER)

- **Name:** Sampling Station · **Slug:** `sampling-station` · **Lab type:** `terrabase`
- **Role:** starter · **Mini-game:** identification · **Base:** Collect and catalog field samples

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — an OPEN-SIDED TIMBER-AND-TARP FIELD DEPOT over a sample work-yard (NOT the gateway cube)
The most depot-like, expedition-camp form of the set — a low **open work-yard sheltered by a canvas/tarp lean roof on poles**, NOT an enclosed cube. Four slender corner poles carry a single shallow-pitched tarp awning; under it sits the cataloguing table; around it, stacked sample crates; the whole pad is ringed by `o`/`K` survey striping. Reads as a starter "field collection depot" — the most lightweight, least-walled member of the batch.
- **Tarp roof:** a single shallow `Box`-thin slab used as a tarp panel — `Box(top≈(32,12), wx≈12, wy≈11, h≈2)` drawn as a slack canvas awning (`L`/`M` cloth with `d` seam lines, one `D` sag dip at the front-corner). Only ~2px thick — it's a cloth roof, not a building mass. A small `o` weather-pennant on a `K` pole at the back corner.
- **Corner poles:** four thin `D`/`d` vertical posts (1px wide) dropping from each roof corner to the pad — `roof_pt(0,0) / (1,0) / (0,1) / (1,1)` anchors — with `K` lashing rings. The structure is open between all poles (no walls).
- **Work-yard pad:** an `L`/`M` packed-earth floor diamond at ground level under the tarp, edged by a ring of `o`/`K` dashed survey-marker striping (alternating ochre/black ticks), a `d` strata seam scored across the front edge.
- **Sample crates:** a stack of 3–4 small `Box` field crates at the back-left — e.g. `Box(top≈(20,26), wx≈4, wy≈4, h≈5)` and a smaller one on top — `D`/`d` boards with `o` corner brackets and `K` rope handles; one open crate shows `r`/`M` rock chunks inside.
- **Roofline:** the slack tarp ridge (a soft front-corner sag), pennant at the back corner. No chimney, no clerestory — deliberately humble.
- **Opening side: OPEN.** This is an open-concept depot: the signature cataloguing table sits OUT in the open work-yard under the tarp, in full view, ringed by `o`/`K` survey striping. No single glazed hero face — the openness IS the read. (Counts as one of the batch's two OPEN buildings.)

## Signature feature (one-of-one — a field-cataloguing table where a sample rotates in a scanner ring fanning out ID tags)
**On the cataloguing table under the tarp, a freshly-collected rock/soil sample hovers and slowly rotates inside a mineral-teal scanner ring, fanning out a little arc of holographic ID tags — mineral name + grid-coordinates — as the lab identifies what was just collected.** No floating-rotating-sample-in-a-scanner-ring motif exists in the catalog (BioCore Incubation is a carousel of petri dishes, Specimen Vault a backlit jar wall, Microscopy a magnified-cell hologram — none is a rotating field sample inside an ID-scanner ring fanning ID tags).
- **The table:** a low `D`/`M` field bench under the tarp, front-center of the yard, with a `K` instrument lip.
- **Scanner ring:** a horizontal `g`/`G` mineral-teal ring hovering over the bench, a soft `c`/`h` glow on its inner rim, faint `c` scan-ticks rotating around it.
- **The sample:** a small irregular `r`/`M`/`D` rock-or-soil clod floating in the ring center, slowly rotating (a `W` highlight glint on its upper-left facet; a tiny offset `c` ghost edge hints the rotation).
- **Fanned ID tags:** 2–3 small `W`/`L` holographic label cards arcing out to the right of the ring, each with a `K` tick of "text" and a tiny `o` coordinate dot — the mineral-name + grid-coords identification.
- **Glow + read:** a soft `c` underglow on the bench from the ring; one tag lit brighter `O`/`h` as the confirmed match.

## Motifs it must honor (TerraBase)
Canvas/tarp roof (literal — the awning), sample crates (the stacked field crates), mineral-teal sensor glow (the scanner ring + tag glow), layered rock strata (the `d` strata seam scored across the pad + the rock chunks), weatherproof field-camp feel (`D`/`d` weathered timber, `o` pennant).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_sampling-station.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/sampling-station.png`
- Preview → `art/preview/buildings/terrabase_sampling-station.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as an **open-sided tarp-roofed field depot with a sample work-yard**, distinct from the gateways and all TerraBase siblings, with a rotating sample in a mineral-teal scanner ring fanning out ID tags as its hero.
