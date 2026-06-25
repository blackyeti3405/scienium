# Distillation Tower — blueprint (bespoke form, STANDARD)

- **Name:** Distillation Tower · **Slug:** `distillation-tower` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** optimization · **Base:** Separate and purify mixtures

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a VERY TALL CYLINDRICAL FRACTIONATING COLUMN with a low base block (NOT the gateway cube)
The distillation tower: the **tallest, most slender vertical mass in the set** — a towering cylindrical fractionating column (a `cylinder` body) banded with horizontal tray plates, rising from a small base building. A skinny industrial chimney-tower silhouette; distinct from the 3D-print tower (a square `Box` tower) and the Aquatic water-cylinder (a fat glass water column) — this is a tall steel-and-glass process column with banded trays.
- **Main column:** a tall narrow `cylinder` — e.g. `cylinder(cx≈34, top_y≈8, rx≈6, h≈34)` — `M`/`D` steel with `K` horizontal **tray bands** every ~5px (the fractionation plates), a vertical `c` sight-glass strip up the lit-left showing graded liquid levels, a `W` rim glint, and a small `D` reflux-condenser drum capping the top.
- **Base block:** a low `Box` abutting the FRONT-LEFT base — `Box(top≈(20,30), wx≈7, wy≈6, h≈9)` — `M`/`D` walls, the reboiler/feed unit.
- **Pipework:** a feed pipe enters the base, a `c` reflux pipe loops from the top condenser back down one side; 2–3 `M` draw-off pipes tap out at different tray heights.
- **Roofline:** the column's `D` reflux-drum cap + a thin `o`/`O` violet vapor plume off its vent.
- **Opening side: RIGHT.** The hero is a `K`-framed **control room window + door** on the SHADED RIGHT face of the base block — glowing `g`→`c` glass with a bright `o`/`O` violet interior so it reads on the shaded side, `h` reflection. Keep the LIT LEFT face plainer (the base's plain wall + a vent), letting the column's lit sight-glass be the left-side interest.

## Signature feature (one-of-one — a rising vapor stack separating into stacked colored fractions)
**Up the clear sight-glass of the column, the mixture separates into a vertical stack of distinct colored bands — heaviest fraction at the bottom, lightest vapor rising off the top — with one band lit as the optimized cut being drawn off.** No fractionation-band / rising-separation motif exists anywhere in the catalog (the 3D-print tower showed cooling print-LAYERS of a solid model; this is liquid/vapor fractions separating in a glass column with a vapor plume).
- **Fraction bands**: the column's `c` sight-glass strip filled with 4–5 stacked horizontal bands grading bottom→top: `r`/`G` (heavy) → `g` → `c` → `h`/`W` (light vapor), each band a clean ruled stripe.
- **Rising vapor**: a `h`→`O` violet-tinged vapor plume curling off the top of the column from the condenser vent.
- **Optimized draw**: one mid band lit brighter (`O`/`h`) with a small `o` arrow/draw-off tap pulling it out a side pipe = the optimization (best cut selected).
- **Glow + readout**: a soft `o` glow at the reboiler base (heat in) and a tiny `c`/`g` purity gauge on the base block climbing toward an `O` target mark.

## Motifs it must honor (ChemWorks)
Distillation column + condenser (literal), condenser coils & pipes (reflux + draw-off pipes), drifting violet vapor (the plume), violet reaction glow (`o`/`O`/`r`), polished lab glass (the sight-glass), `M`/`D` blue-grey steel.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_distillation-tower.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/distillation-tower.png`
- Preview → `art/preview/buildings/chemworks_distillation-tower.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **very tall slender fractionating column with a low base and the control room glowing on the RIGHT**, distinct from the gateways, the Volt/BioCore towers, and all ChemWorks siblings, with stacked separating fractions + a vapor plume as its hero.
