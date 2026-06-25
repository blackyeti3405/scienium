# Materials Testing Bay — blueprint (bespoke form, STANDARD)

- **Name:** Materials Testing Bay · **Slug:** `materials-testing-bay` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Measure mechanical and chemical properties

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — an OPEN-FRONTED TESTING BAY with a side instrument annex (NOT the gateway cube)
The testing bay: an **open industrial bay** (a tall portal-frame opening) with a smaller closed **instrument annex** abutting one side — equipment sits out in the open under the portal, ringed by hazard striping. An open-bay silhouette, distinct from the Volt Robotics roll-up hangar (that one had a robot arm waving out of a roll-up door; this is a rigid portal bay with a test apparatus inside). NOTE: differs from the Volt Mechanical Testing Rig — that was a bare open load-frame crushing a specimen; this is a roofed bay whose hero is a chemical-immersion corrosion stand, not a crusher.
- **Open bay:** a tall `Box` portal frame — e.g. `Box(top≈(32,14), wx≈10, wy≈9, h≈18)` — but the FRONT/RIGHT face is a deep open recess (paint the back interior wall in darker `d`/`G`), framed by thick `M`/`D` portal columns + a `K` lintel. The bay floor in the open middle carries `o` hazard chevrons.
- **Instrument annex:** a lower closed `Box` abutting the LEFT — `Box(top≈(20,22), wx≈6, wy≈7, h≈12)` — `M`/`D` walls, a `c`/`g` readout window with diagnostic dials.
- **Roofline:** the bay gets a low flat slab roof with a small `D` gantry beam across the open mouth; the annex a flat parapet; a thin `c` cooling pipe links them.
- **Opening side: RIGHT.** The hero is the OPEN BAY mouth on the SHADED RIGHT face — make the interior GLOW with `o`/`O` violet test-glow + a bright `c` instrument light so the open shaded recess reads, hazard chevrons lit at the lip. The LIT LEFT face (the annex) stays plainer.

## Signature feature (one-of-one — a sample in a glass tank slowly dissolving/corroding under test)
**Inside the bay, a clamped material coupon hangs half-submerged in a glass corrosion tank — the immersed part visibly etched and pitted, a stream of reaction bubbles fizzing off it and a diagnostic gauge tracking the decay.** No corrosion-tank / dissolving-coupon / immersion-test motif exists anywhere in the catalog.
- **Corrosion tank**: a `c`/`h` glass tank in the open bay, half-filled with `g`/`G` reagent (a clear waterline + `h` meniscus).
- **The coupon**: a `M`/`D` metal sample bar clamped from above, its submerged lower half eaten into a ragged `d`/`r` pitted edge (etched away), its dry upper half clean `L`/`W`.
- **Reaction fizz**: a stream of tiny `h`/`W` bubbles fizzing off the corroding bar, a soft `o`/`O` violet reaction glow in the reagent.
- **Diagnosis gauge**: a small `c`/`g` dial on the tank/annex with an `o` needle dropping into a red `r` zone (the property failing) = the diagnosis read-out.

## Motifs it must honor (ChemWorks)
Bubbling tank (the corrosion bath), polished lab glass (the tank), violet reaction glow (`o`/`O`/`r`) in the reagent + glow, blue glassware family for the tank glass, `M`/`D` blue-grey walls + portal steel, `o` hazard striping around the open bay middle.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_materials-testing-bay.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/materials-testing-bay.png`
- Preview → `art/preview/buildings/chemworks_materials-testing-bay.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as an **open-fronted testing bay with a side annex and the open bay glowing on the RIGHT**, distinct from the gateways, the Volt testing rig/robotics bay, and all ChemWorks siblings, with a corroding coupon in a glass tank as its hero.
