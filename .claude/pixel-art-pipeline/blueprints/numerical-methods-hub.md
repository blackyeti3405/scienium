# Numerical Methods Hub — blueprint (bespoke form, STANDARD)

- **Name:** Numerical Methods Hub · **Slug:** `numerical-methods-hub` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** optimization · **Base:** Algorithms for scientific computing

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a BLOCKY TWO-BLOCK COMPUTE HALL with a louvered vent WING + flat parapet (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). A practical **two-block compute hall**: a main flat-roofed block abutted on the front-LEFT by a lower **louvered vent wing** (a heat-exhaust wing whose face is all `Box.louver` slat panels). Two abutted boxes with a flat parapet — a square, utilitarian massing that's clearly NOT the long server hall (no cooling-tower cylinder), NOT the stepped terrace, NOT the L-annex.
- **Main block:** a blocky `Box` — e.g. `Box(top≈(30,17), wx≈10, wy≈8, h≈14)`, flat roof with a thin `L`/`W` parapet lip + `K` outline.
- **Vent wing:** a lower `Box` abutting the FRONT-LEFT — e.g. `Box(top≈(16,24), wx≈5, wy≈6, h≈10)` — its lit LEFT face packed with `Box.louver` vent banks (the heat-exhaust wing). Drawn AFTER the main block on the left so the wing reads in front-left.
- **Roofline:** flat parapet roof; a couple of `D` exhaust cowls + a `c` sensor puck on the back corner; the convergence-mesh hologram hovers over the LEFT-front roof. A thin `o` power line trims the parapet.
- **Opening side: LEFT.** The hero glazing is on the LIT LEFT face of the main block (beside the vent wing) — a `K`-framed **control-room window** (one wide `g`/`c` pane via `Box.window`, `h` reflections, `o` ready-light) + a `K` door. The shaded RIGHT face stays plain: bare `M`/`D` wall + one thin `D` conduit.

## Signature feature (one-of-one — a hovering adaptive convergence mesh that recursively subdivides around a glowing solution front, residual gauge dropping to zero)
**Over the roof hovers an adaptive convergence grid that recursively subdivides into ever-finer cells around a glowing solution front, while a residual gauge ticks down toward zero.** No adaptive-mesh / recursive-subdivision / residual-convergence motif exists anywhere in the catalog, and it is deliberately distinct from #2 Computation Cluster (the compute HARDWARE rack) and #6 Mathematical Modeling Suite (a continuous function SURFACE) — this is the ALGORITHM/iteration itself: a refining grid converging on an answer. Collides with nothing.
- **Adaptive mesh:** a hovering flat `c`/`g` grid that is coarse at the edges and **recursively subdivided** into smaller and smaller cells toward one region — big `c` cells outside stepping down to tiny `h` cells around a bright front (a quadtree/AMR refinement read).
- **Solution front:** a glowing `O`/`o` curved front line snaking through the finest cells (where the mesh refines), the bright edge the algorithm is resolving, with one `O`/`W` hot cell at its tip.
- **Residual gauge:** a small `K`-framed `c`/`o` gauge on the roof/parapet with a bar dropping toward a bottom `g` "0" mark (residual → 0, converged) and an `O` "CONVERGED" dot lighting.
- **Optimization tell:** a faint iteration counter of 3–4 `o` ticks ramping up beside the gauge; a soft `c` glow halo under the floating mesh; one `o` "METHODS" placard on the LEFT face.

## Motifs it must honor (Axiom)
Navy night-sky glass (`g`/`c`/`h` convergence mesh + control window), gold starlight glints (`o`/`O` solution front + converged dot), particle/curve language in the snaking solution front, `M`/`D` deep-navy walls, `Box.louver` vents reading as solid louvers (never glass), the shared cyan-mesh-with-gold-highlight family look (distinct job from the cluster + the modeling suite).

## Target output paths
- Source JSON → `art/src/buildings/axiom_numerical-methods-hub.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/numerical-methods-hub.png`
- Preview → `art/preview/buildings/axiom_numerical-methods-hub.png`
- Builder script → `art/pixel-art-pipeline/builders/numerical-methods-hub.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **blocky two-block compute hall with a louvered vent wing and flat parapet, opening on the LEFT**, distinct from the gateways and all Axiom siblings, with a hovering adaptive convergence mesh (recursive subdivision + residual gauge dropping to zero) as its hero.
