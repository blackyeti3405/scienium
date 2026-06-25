# Mathematical Modeling Suite — blueprint (bespoke form, STANDARD)

- **Name:** Mathematical Modeling Suite · **Slug:** `mathematical-modeling-suite` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** optimization · **Base:** Build models of real phenomena

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a STEPPED TERRACE PAVILION (two setback boxes) (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). A **stepped terrace pavilion** — a broad lower base box with a narrower upper box set back on top, making a two-level zigarat/terrace silhouette with an open roof-terrace deck on the setback. Distinct from the flat lecture hall and the clerestory optics hall — this one stacks into terraces.
- **Lower base:** a broad low `Box` — e.g. `Box(top≈(26,18), wx≈13, wy≈9, h≈11)`, flat roof, forming the ground floor + the lower terrace deck.
- **Upper setback:** a narrower `Box` set back toward the BACK on top of the base — e.g. `Box(top≈(30,12), wx≈8, wy≈5, h≈9)` — leaving an open `L`/`W` **roof-terrace deck** along the front of the lower roof (a thin `L` parapet lip + a `D` rail). The hovering surface floats over this front terrace deck.
- **Roofline:** two stepped flat decks (lower terrace + upper roof); a small `c` skylight on the upper roof; the signature surface hovers over the LEFT-front terrace.
- **Opening side: LEFT.** The hero glazing is on the LIT LEFT face of the lower base — a tall `K`-framed **atrium glass wall** (2 wide `g`/`c` panes via `Box.window`, `h` reflections) + a `K`-framed door with an `o` glow. The shaded RIGHT faces of both boxes stay plain: bare `M`/`D` wall + one thin `D` conduit.

## Signature feature (one-of-one — a hovering wireframe function-surface with a glowing marble rolling down the gradient into the lowest basin)
**Over the terrace hovers a wireframe 3D function-surface — a rolling parametric landscape of hills and valleys — with a glowing marble descending its gradient into the lowest basin, lighting that basin green when it settles.** No function-surface / gradient-descent / rolling-marble-to-minimum motif exists anywhere in the catalog, and it is deliberately distinct from #2 Computation Cluster (the compute HARDWARE), #9 Numerical Methods Hub (an iterating convergence MESH/grid), and Bioinformatics' genome ring — this is a continuous 3D math surface with a ball rolling to its minimum. Collides with nothing.
- **Wireframe surface:** a hovering `c`/`g` wireframe grid warped into a smooth saddle/landscape of peaks and a deep basin (a small mesh of crossing `c` lines following the curve, brighter `h` on the lit crests, `G` in the shaded valley), floating above the terrace.
- **Descending marble:** a bright `O`/`W` marble dot with a tiny `K` pip partway down a slope, trailing a faint `o` motion-streak as it rolls toward the basin (gradient descent).
- **The optimized basin:** the lowest basin glows `g`/`O` green (the found minimum), with a small `O` "MIN" tick — the optimization landing.
- **Optimization tell:** a small `c`/`o` cost gauge on the terrace rail dropping its needle to a low `g` reading; a soft `c` glow halo under the floating surface; one `o` "MODELS" placard on the LEFT face.

## Motifs it must honor (Axiom)
Navy night-sky glass (`g`/`c`/`h` atrium wall + the cyan wireframe surface), gold starlight glints (`o`/`O` marble + minimum tick), particle/curve language in the wireframe mesh, `M`/`D` deep-navy terraced walls, the cyan-mesh-with-gold-highlight pairing shared with the other compute siblings (one family, different jobs).

## Target output paths
- Source JSON → `art/src/buildings/axiom_mathematical-modeling-suite.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/mathematical-modeling-suite.png`
- Preview → `art/preview/buildings/axiom_mathematical-modeling-suite.png`
- Builder script → `art/pixel-art-pipeline/builders/mathematical-modeling-suite.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); any vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **stepped terrace pavilion (lower base + setback upper box, open front terrace) opening on the LEFT**, distinct from the gateways and all Axiom siblings, with a hovering wireframe function-surface + gradient-descending marble settling into a glowing green basin as its hero.
