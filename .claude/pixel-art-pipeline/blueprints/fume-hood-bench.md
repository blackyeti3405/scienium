# Fume Hood Bench — blueprint (bespoke form, STARTER)

- **Name:** Fume Hood Bench · **Slug:** `fume-hood-bench` · **Lab type:** `chemworks`
- **Role:** starter · **Mini-game:** configuration · **Base:** Safe baseline workspace for reactions

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a LOW OPEN-FRONTED BENCH SHED with a sash-glass hood (NOT the gateway cube)
The starter is the humblest, most ground-hugging building in the set: a **wide, low single-storey lean-to shed** whose entire LIT-LEFT front is an **open work-bench under a glass fume-hood sash**, so equipment sits out in the open (the open-concept starter, like the Volt Workshop). It must read clearly shorter and flatter than the towers and reactor halls to come.
- **Main shed:** a wide low `Box` — e.g. `Box(top≈(30,24), wx≈13, wy≈9, h≈11)`. A shallow **mono-pitch (lean-to) roof** — fake the slope by capping the back with a thin second `Box(top≈(30,21), wx≈13, wy≈3, h≈3)` set back so the roof reads as one low slab tilting down to the front eave (a workbench shelter, not a full box).
- **The fume hood:** the dominant LEFT face is recessed and open — a deep `K`-framed **sash window** (sliding glass guard) of `c`/`h` glass over a `D`/`d` bench top, with the sash raised so the bench interior shows. A `D` ducting hood collects up to a small `M`/`D` exhaust stack on the back-right roof corner trailing a thin `o` violet vapor wisp.
- **Roofline:** low mono-pitch slab + the one short exhaust duct stack (the only vertical element) — deliberately plain so the bench reads as the hero.
- **Opening side: LEFT.** The hero is the open glass-sash hood + bench on the LIT LEFT face — `h` reflections on the raised sash, `o` warning-stripe trim along the bench lip, a small `o` glow inside. Keep the shaded RIGHT face plain (a couple of `D` vents + a gas-line valve).

## Signature feature (one-of-one — a bubbling reaction flask on a tripod over a flame)
**On the open bench sits a round-bottom flask of bubbling blue reagent clamped on a ring-stand over a small violet burner flame — vapor curling up off it.** No bubbling-flask / ring-stand / open-flame motif exists anywhere in the catalog (the BioCore "bubbling assay-tube rack" is a backlit row of straight tubes with a pipette arm — this is a single round flask on a tripod over a live flame).
- **Flask**: a round-bottom `c`/`h` glass flask (a small filled disc with a thin `K` neck) half-full of `g`/`G` reagent, 3–4 `h`/`W` bubble dots rising in it.
- **Ring-stand + clamp**: a thin vertical `D` rod with a `M` ring clamp gripping the flask neck, standing on the `d` bench.
- **Flame**: a small `o`/`O` violet burner flame licking the flask base from a `D` burner, a `r` shadow under it.
- **Vapor**: a faint `o`→`O` violet curl rising from the flask mouth and drifting toward the hood duct; one `h` condensation drip on the sash glass.

## Motifs it must honor (ChemWorks)
Polished lab glass (the sash + flask in `h`/`c`/`g`/`G` blue glass), bubbling flask, drifting violet vapor, violet reaction glow (`o`/`O`/`r`) at the flame, `M`/`D` blue-grey walls, a short condenser-style exhaust duct.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_fume-hood-bench.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/fume-hood-bench.png`
- Preview → `art/preview/buildings/chemworks_fume-hood-bench.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **low open-fronted fume-hood bench shed with the open sash/bench on the LEFT**, clearly different from the gateways, the Volt/BioCore sets, and its ChemWorks siblings, with a bubbling flask on a flame as its hero.
