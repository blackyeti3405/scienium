# Quantum Simulation Lab — blueprint (bespoke form, STANDARD)

- **Name:** Quantum Simulation Lab · **Slug:** `quantum-simulation-lab` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** prediction · **Base:** Model quantum systems

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a TALL NARROW CRYOSTAT TOWER/DRUM (NOT the gateway cube)
Compose from `art/isobuild.py` (`cylinder` + a small `Box`). The quantum building stands UP: a **tall narrow cryostat tower** — a slender vertical `cylinder` drum (the dilution-fridge housing) — the tallest, thinnest mass of the set, with a small low equipment annex at its foot. A vertical needle silhouette, clearly not a wide hall and not the wide premium drum.
- **Cryostat tower:** a tall narrow `cylinder` body — roughly `cylinder(cx≈30, top_y≈14, rx≈7, h≈26)` — polished `L`/`M`/`D` shading, a bright `W` top-rim glint, `K` ring banding every ~6px (the fridge stages), and a `c` frost shimmer near the base. Tall and slender.
- **Equipment annex:** a small low `Box` abutting the FRONT-RIGHT foot of the tower — roughly `Box(top≈(40,32), wx≈5, wy≈4, h≈8)` — `M`/`D` walls. Drawn AFTER the tower so it sits front-right; this puts the main opening on the RIGHT.
- **Roofline:** the tower is open-topped — a `K`-rimmed circular cryostat mouth at the top from which the chandelier hangs DOWN inside (and crowns just above the rim). A thin `o` cryo-line coils up the tower.
- **Opening side: RIGHT (glowing).** The hero is on the SHADED RIGHT face of the tower: a tall `K`-framed **viewing slit** cut down the drum revealing the glowing chandelier inside — it must GLOW gold/cyan to read on the dark face (bright `O`/`c`/`h` interior). The annex's lit LEFT-facing window stays plain (one small `c` window via `Box.window`).

## Signature feature (one-of-one — a suspended golden quantum-processor chandelier with a qubit core and flickering superposition ghost-states)
**Suspended in the open cryostat hangs a golden quantum-processor chandelier — tiered dilution-fridge coils — with a glowing qubit core at its base and flickering superposition ghost-states it predicts.** No quantum-processor-chandelier / dilution-fridge / qubit-superposition motif exists anywhere in the catalog, and it is deliberately distinct from #3 Particle Physics Bench (a cloud chamber) and Volt Lab AI-Incubator (a neural-net constellation orb) — this is the iconic tiered gold "quantum chandelier" with a qubit core. Collides with nothing.
- **Tiered chandelier:** 3 stacked horizontal `o`/`O` gold disc plates (largest at top, smallest at bottom), joined by thin gold `o` rods and dripping `o`/`r` cryo-coil loops between the tiers — the unmistakable gold quantum-computer chandelier, hanging from the cryostat mouth.
- **Qubit core:** a bright `O`/`W` glowing orb at the very bottom tip with a tiny `K` pip and a `c` halo (the qubit chip).
- **Superposition ghost-states (the prediction):** 2–3 faint translucent `c`/`h` "ghost" copies of the core offset to the sides (the qubit in multiple states at once), one slightly brighter `O` ghost marked as the predicted measured outcome.
- **Prediction tell:** a small `c`/`o` probability gauge on the right-face slit showing two bars (a `g` and an `O`), the `O` bar lit taller = the predicted state; soft `c` frost glow at the tower base.

## Motifs it must honor (Axiom)
Gold starlight glints (the all-gold chandelier + qubit core — gold is the hero), navy night-sky glass (`c`/`h` ghost-states + viewing slit + annex window), particle-ring echo in the tiered coil loops, `M`/`D` polished deep-navy cryostat, cyan/gold prediction readout.

## Target output paths
- Source JSON → `art/src/buildings/axiom_quantum-simulation-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/quantum-simulation-lab.png`
- Preview → `art/preview/buildings/axiom_quantum-simulation-lab.png`
- Builder script → `art/pixel-art-pipeline/builders/quantum-simulation-lab.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); any vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **tall narrow cryostat tower with a foot annex, opening on the RIGHT**, distinct from the gateways and all Axiom siblings, with a suspended golden quantum-processor chandelier (qubit core + superposition ghost-states) as its hero (glowing on the shaded right slit).
