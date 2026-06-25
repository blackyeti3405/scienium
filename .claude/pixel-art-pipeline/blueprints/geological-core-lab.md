# Geological Core Lab — blueprint (bespoke form, STANDARD)

- **Name:** Geological Core Lab · **Slug:** `geological-core-lab` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** identification · **Base:** Analyze sediment and rock cores

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a LONG LOW SHED built into a CUTAWAY HILLSIDE that shows layered rock strata on its cut side (NOT the gateway cube)
A long, low, single-story **hillside core shed** dug sideways into a hill so one end butts into an exposed earth cut — the cut face literally shows banded rock strata. A horizontal, elongated mass (much longer than deep), with a shallow shed/mono-pitch roof. Distinct from the squat bunker (this is long & shed-roofed, riveted to a hill cut, not a parapet box).
- **Main shed:** a long low `Box` — `Box(top≈(28,16), wx≈13, wy≈7, h≈10)` — `M`/`D` walls, a shallow **mono-pitch shed roof** (a thin `L`/`M` slab tilted so the high edge is at the back-left, low edge front-right; `d` corrugation seam lines run down-slope).
- **Hillside cut:** behind/beside the shed's back-left, a tall earth-cut bank rises — a `Box`-ish berm of stacked **rock strata bands** (`r` rust / `D` brown / `d` dark / `M` ochre / `L` pale, 5–6 clean horizontal layers) — the shed appears carved into it; a `K` retaining lip edges the cut.
- **Core-rack lean-to:** a short open lean-to off the front face shelters the signature core rack (a thin `D`/`M` shelf canopy on two `d` posts).
- **Roofline:** the single mono-pitch corrugated shed roof + a roof vent stub and a `D` cable run dropping into the hill cut; a small `o` core-stack of capped sample tubes leans by the door.
- **Opening side: LEFT.** The hero is a wide `K`-framed roll-up core-bay door + window on the LIT LEFT face (`M`/`D`, `c` glass, an `o` "CORE LIBRARY" placard), the inclined core rack visible just inside/under the lean-to. Keep the SHADED RIGHT face plainer — a long blank wall meeting the strata cut, one `d` vent.

## Signature feature (one-of-one — an inclined glass-cased drill-core on a rack, lit band-by-band by a sliding scanner that pops a mineral label per layer)
**A long inclined glass-cased drill-core lies on a display rack along the shed front — its banded rock strata visible end-to-end — and a sliding mineral-teal identification scanner travels down it, lighting each rock band layer-by-layer and popping up a small mineral label for the layer it's reading.** No inclined-core-on-a-rack motif exists in the catalog: ChemWorks Distillation and BioCore Aquatic are VERTICAL glass tubes with stuff stacked inside — this is a HORIZONTAL/inclined drill-core on a rack being scanned for identification, a different form and read. (And it differs from #10's planetary-interior shaft: this is a small physical core sample on a bench, not a borehole into the planet.)
- **The rack:** a low `D`/`M` rack of 2 rails holding a long tube, tilted gently (the inclined core), front-center under the lean-to.
- **Glass-cased core:** a long `c`/`h` glass cylinder over the core; inside, the **banded rock core** — segments of `r`/`D`/`d`/`M`/`L`/`o` running its length (the stratigraphy).
- **Sliding scanner:** a bright `g`/`G` mineral-teal scanner collar wrapping the core at one point, casting a `c` light-bar onto the band it's over; a faint `c` trail shows it sliding.
- **Per-layer label:** above the scanned band, a small `W`/`L` label card with a `K` text tick + an `O` dot (the mineral name) — the identification; the currently-read band glows brightest `O`/`h`.

## Motifs it must honor (TerraBase)
Layered rock strata (the hillside cut AND the banded core — the most stratigraphy-forward building in the set), drill rigs (the drill-core sample + capped core tubes), mineral-teal sensor glow (the sliding scanner + labels), sample crates (the core-stack by the door), weathered field shed (`M`/`D` corrugated mono-pitch).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_geological-core-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/geological-core-lab.png`
- Preview → `art/preview/buildings/terrabase_geological-core-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **long low hillside core shed cut into exposed rock strata**, distinct from the gateways and all TerraBase siblings, with an inclined glass-cased drill-core scanned band-by-band (per-layer mineral labels) as its hero, opening on the LEFT.
