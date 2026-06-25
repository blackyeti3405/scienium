# Reaction Synthesis Lab — blueprint (bespoke form, STANDARD)

- **Name:** Reaction Synthesis Lab · **Slug:** `reaction-synthesis-lab` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** prediction · **Base:** Run controlled chemical syntheses

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a PIPEWORK REACTOR HALL with a back stack (NOT the gateway cube)
The synthesis plant: a **medium-tall closed process hall** wearing a tangle of external **condenser coils and pipework** like a small chemical refinery, with a short reactor-vessel drum bulging off the back-right corner. Boxy and industrial — the "process building" — clearly different from the open bench shed and the slender towers.
- **Main hall:** a `Box` of moderate proportion — e.g. `Box(top≈(30,16), wx≈11, wy≈10, h≈18)`, a flat parapet roof. Walls show vertical `D`/`d` pipe-chase seams.
- **Reactor drum:** a stout `cylinder` (a jacketed reactor vessel) abutting the BACK-RIGHT — `cylinder(cx≈47, top_y≈14, rx≈5, h≈14)` in `M`/`D` steel with a `c` sight-gauge stripe and a `D` cap dome; a thick `K`/`D` transfer pipe runs from the drum into the hall roof.
- **Pipework:** a run of 2–3 horizontal `M`/`D` pipes with `K` flange joints across the upper RIGHT face, plus one `c` coolant pipe; a small `o` pressure-relief glow at a valve.
- **Roofline:** flat parapet + a short vent stack + the reactor drum cap; a thin `o`/`O` vapor wisp off the relief valve.
- **Opening side: RIGHT.** The hero is a tall `K`-framed **control/charging bay** on the SHADED RIGHT face — glowing `g`→`c` glass with a bright `o`/`O` violet reaction-glow interior so it reads on the shaded side, an `h` reflection sweep, a `K`-framed door. Keep the LIT LEFT face plainer (pipe seams + a couple of `c` portholes, fewer accents).

## Signature feature (one-of-one — a coiled glass condenser dripping into a receiving flask)
**Mounted on the front of the hall is a tall, clear Liebig-style condenser — a glass tube wound with a spiral water-cooling coil, a steady drip of distilled product falling from its tip into a receiving flask below.** No coiled-condenser / dripping-tip motif exists anywhere in the catalog.
- **Condenser column**: a vertical `h`/`c` glass tube ~10px tall on the LEFT face, with a tight diagonal `g`/`G` **spiral coil** wound around it (alternating light/dark to sell the helix), `K` glass outline.
- **Coolant lines**: two thin `c` water hoses tee into the coil top and bottom, one `h` highlight.
- **The drip**: a single `h`/`W` droplet just leaving the tube tip, and a small `c`/`g` receiving flask at the base catching it (a tiny meniscus + 1–2 `o` vapor specks rising).
- **Reaction glow**: a soft `o`→`O` violet glow behind the condenser where the synthesis runs, selling "live reaction".

## Motifs it must honor (ChemWorks)
Condenser coils + pipes (the spiral condenser AND the external pipework), bubbling/jacketed reactor tank, drifting violet vapor, violet reaction glow (`o`/`O`/`r`), polished `h`/`c`/`g`/`G` lab glass, `M`/`D` blue-grey walls.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_reaction-synthesis-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/reaction-synthesis-lab.png`
- Preview → `art/preview/buildings/chemworks_reaction-synthesis-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **pipework reactor hall with a back reactor drum and the control bay glowing on the RIGHT**, distinct from the gateways and all siblings, with a coiled glass condenser dripping into a flask as its hero.
