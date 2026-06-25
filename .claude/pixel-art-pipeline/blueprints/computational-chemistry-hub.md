# Computational Chemistry Hub — blueprint (bespoke form, STANDARD)

- **Name:** Computational Chemistry Hub · **Slug:** `computational-chemistry-hub` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** prediction · **Base:** Simulate molecules in silico

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a STEPPED TWO-BLOCK DATA-CENTER with a server-vent wing (NOT the gateway cube)
The compute hub: a clean **stepped two-volume block** — a taller compute core stepped down to a lower server wing wearing a band of louvered vents (the "in silico" building, all quiet machines, no glassware out front). Stepped/setback massing; distinct from the boxy reactor hall and round/tower forms.
- **Compute core:** a taller `Box` — e.g. `Box(top≈(30,14), wx≈9, wy≈9, h≈18)`, flat parapet roof, clean `M`/`L` panel walls with a thin `c` data-strip band.
- **Server wing:** a lower `Box` stepped down off the FRONT-RIGHT — `Box(top≈(40,22), wx≈7, wy≈7, h≈11)` — its RIGHT face a band of `K`/`D` **louvered cooling vents** with a faint `c` glow leaking between slats.
- **Roofline:** flat parapets at two heights + a small rooftop `D` HVAC chiller box + a slim `o` emitter nub feeding the rooftop hologram; no stack.
- **Opening side: LEFT.** The hero is a `K`-framed **glass operator-room** on the LIT LEFT face of the compute core — `c`/`h` glass with `h` reflections, banks of tiny `o`/`c` indicator lights inside, an `o` glow, a `K`-framed door. Keep the shaded RIGHT (the vent wing) plainer (louvers + a `D` conduit, only a faint `c` slat-glow).

## Signature feature (one-of-one — a hovering ball-and-stick molecule model with a predicted-pose ghost)
**Above the roof rotates a translucent ball-and-stick molecule model — colored atom spheres joined by bond sticks — with a faint ghost copy of its predicted next conformation overlaid, the simulation forecasting how it will fold.** No ball-and-stick molecule / atom-and-bond / predicted-pose motif exists anywhere in the catalog (distinct from the Genetics double-helix rungs and the Bioinformatics flat genome ring — this is a 3D ball-and-stick cluster).
- **The molecule**: 4–6 atom **spheres** in set hues (`O`/`o` violet, `c`/`g`/`G` blue, `W`/`L` for light atoms) joined by short `M`/`L` **bond sticks**, arranged as a small 3D cluster (a central atom with branches), each sphere with a `h` highlight + `K` rim.
- **Rotation cue**: a faint `c` orbit ellipse / index tick around it selling slow rotation.
- **Predicted-pose ghost**: a faint translucent `c`/`h` second copy of the molecule offset to one side (the forecast conformation) with a thin `O` arrow from the solid model to the ghost = the prediction.
- **Projector + glow**: a thin `o`/`O` violet beam from the roof emitter up into the model, a soft `c` glow halo + 1–2 `h` sparkles; a tiny `g` confidence bar on the parapet.

## Motifs it must honor (ChemWorks)
Violet reaction glow (`o`/`O`/`r`) on the molecule's accent atoms + projector beam + glow, blue glassware family (`h`/`c`/`g`/`G`) for the blue atoms + operator glass + vent glow, polished lab glass (the operator room), `M`/`D` blue-grey walls; clean precision-machine feel (the "in silico" sibling of the wet reactors).

## Target output paths
- Source JSON → `art/src/buildings/chemworks_computational-chemistry-hub.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/computational-chemistry-hub.png`
- Preview → `art/preview/buildings/chemworks_computational-chemistry-hub.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **stepped two-block data-center with a vent wing and the operator room on the LEFT**, distinct from the gateways and all siblings, with a hovering ball-and-stick molecule + predicted-pose ghost as its hero.
