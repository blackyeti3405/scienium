# Catalysis Lab — blueprint (bespoke form, STANDARD)

- **Name:** Catalysis Lab · **Slug:** `catalysis-lab` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** optimization · **Base:** Study reaction acceleration

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a DOMED GLASS REACTOR-VESSEL PAVILION on a drum base (NOT the gateway cube)
The catalysis lab: a **round drum base capped by a clear glass dome** housing a single big catalytic reactor vessel — a rounded, glass-domed silhouette. Different from the BioCore microscopy dome (an opaque optics turret) and the Volt AI drum (a closed steel drum): here the dome is a TRANSPARENT reactor bell you can see the vessel glowing inside. Round + glass-topped, contrasting all the boxy/tower siblings.
- **Drum base:** a `cylinder` base — e.g. `cylinder(cx≈32, top_y≈22, rx≈11, h≈14)` — `M`/`D` steel with `K` panel seams and a `c` instrument band; OR a short octagonal `Box` read if cleaner. The dominant low round mass.
- **Glass dome:** a clear hemispherical cap over the drum — paint a `c`/`h` glass dome (a filled half-ellipse with `K` rib seams + a `W` crown glint) so the reactor inside shows through; a `D` collar ring where dome meets drum.
- **Pipework:** 2–3 `M`/`c` feed/coolant pipes curving up the drum into the dome collar; a small `o` relief valve.
- **Roofline:** the glass dome (the whole roof) + a thin `o`/`O` vapor wisp off the relief valve.
- **Opening side: LEFT.** The hero is a `K`-framed **charge door + viewing window** on the LIT LEFT of the drum — `c`/`h` glass with `h` reflections and an `o` glow, a `W` rim highlight. Keep the shaded RIGHT of the drum plainer (deeper `D`/`G` panels, one dark porthole).

## Signature feature (one-of-one — a glowing catalyst pellet bed speeding up a two-stream reaction)
**Inside the glass dome sits a packed bed of glowing catalyst pellets, with two reactant streams flowing IN cool and a single fast product stream rushing OUT bright — the reaction visibly accelerated as it crosses the hot pellet bed.** No catalyst-bed / two-streams-merging / acceleration motif exists anywhere in the catalog.
- **Catalyst bed**: a packed cluster of small round `o`/`O`/`r` (violet, glowing-hot) **pellets** sitting in a `M`/`D` perforated tray inside the dome, a bright `O` glow rising off them.
- **Reactant inflow**: two thin slow `c`/`g` (cool blue) streams entering the bed from two feed pipes, with small spaced droplets (slow).
- **Accelerated outflow**: one single bright `h`/`W` product stream rushing OUT fast (a continuous dense streak with `o` speed-sparks) — clearly faster than the inputs.
- **Optimization read**: a small `c`/`g` rate dial on the drum with an `o` needle swung up to an `O` peak mark (rate maximized) + 1–2 `h` heat sparkles in the dome.

## Motifs it must honor (ChemWorks)
Glass-domed reactor vessel (literal), bubbling/reacting tank, condenser coils & pipes (the feed/coolant pipes), violet reaction glow (`o`/`O`/`r`) at the hot catalyst bed, polished `h`/`c`/`g`/`G` lab glass (the dome + cool streams), `M`/`D` blue-grey drum.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_catalysis-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/catalysis-lab.png`
- Preview → `art/preview/buildings/chemworks_catalysis-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **glass-domed round reactor pavilion with the charge door on the LEFT**, distinct from the gateways, the BioCore microscopy dome / Volt drum, and all ChemWorks siblings, with a glowing catalyst bed accelerating a two-stream reaction as its hero.
