# Computation Cluster — blueprint (bespoke form, STANDARD)

- **Name:** Computation Cluster · **Slug:** `computation-cluster` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** optimization · **Base:** Numerical simulations

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a LONG LOW SERVER HALL with an abutting cooling-tower cylinder + louvered roof (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box` + `cylinder`). The compute building: a **long, deep server hall** (data-center massing — low and horizontal, all vents) with a round **cooling-tower cylinder** rising off its back-right corner. Two clearly different volumes (a box hall + a tank) so the silhouette is unmistakable and not box-only.
- **Server hall:** a long low `Box` — roughly `Box(top≈(24,16), wx≈13, wy≈8, h≈13)`, flat roof. Reads as a windowless machine hall.
- **Cooling tower:** a `cylinder` rising off the BACK-RIGHT corner of the hall — roughly `cylinder(cx≈48, top_y≈12, rx≈5, h≈16)`, `M`/`D` shading, a `K` rim, with a faint `c` vapor wisp (2–3 `h`/`W` dots) drifting off its top. Drawn before the hall front so it sits behind-right.
- **Roofline:** flat roof packed with `Box.louver` HVAC vent banks (parallel slat panels), a couple of `D` exhaust cowls, and a thin `o` power bus running the ridge — a busy mechanical deck, no parapet.
- **Opening side: RIGHT (glowing).** The hero is on the SHADED RIGHT face: a wide `K`-framed **glass equipment wall** revealing the blade rack inside (see signature), which must GLOW cyan to read on the dark face — bright `c`/`h` glass via `Box.window` with `h` reflections. Keep the LIT LEFT face plainer: mostly `Box.louver` server-vent panels + one small `c` status window + a `K` access door.

## Signature feature (one-of-one — a glowing immersion-cooling GPU blade rack with a green optimization heat-sweep)
**Behind the right-face glass, a transparent immersion-cooling tank of GPU blades glows cyan while a green optimization heat-gradient sweeps across the rack, balancing the compute load.** No server-blade-rack / immersion-cooling / load-balancing-heat-sweep motif exists anywhere in the catalog, and it is deliberately distinct from #9 Numerical Methods Hub (that's the abstract convergence ALGORITHM mesh) and #6 Mathematical Modeling Suite (a function SURFACE) — this is the literal HARDWARE doing the work. Collides with nothing.
- **Blade rack:** behind the right-face glass, a tall stack of ≈6–8 thin vertical `c`/`g` blade cards in a `K`/`d` chassis, each card edged in bright `h` (a glowing server rack seen through glass).
- **Immersion tank:** the rack stands in a clear `h`/`c` coolant bath with a bright `h` fluid line near the top and tiny `W` bubble dots rising (the immersion-cooling tell).
- **Optimization heat-sweep:** a diagonal `g`→`o`→`O` heat band sweeping across the rack — the hottest blades flushing `O`/`o` (gold), the cooled/optimized ones settling `g`/`c` green-cyan — with one column lit brightest `O` = "balancing now".
- **Identification of the win:** a small `c`/`o` load-bar gauge on the right-face sill leveling out to an even `g` reading (load balanced).

## Motifs it must honor (Axiom)
Navy night-sky glass (`g`/`c`/`h` equipment wall + status window), gold starlight glints (`o`/`O` on the heat-sweep + power bus), particle-ring echo in the rising vapor wisp, `M`/`D` deep-navy walls, `Box.louver` vents reading as solid louvers (never glass), the cyan/gold readout pairing.

## Target output paths
- Source JSON → `art/src/buildings/axiom_computation-cluster.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/computation-cluster.png`
- Preview → `art/preview/buildings/axiom_computation-cluster.png`
- Builder script → `art/pixel-art-pipeline/builders/computation-cluster.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **long low server hall with a cooling-tower cylinder and a louvered roof, opening on the RIGHT**, distinct from the gateways and all Axiom siblings, with a glowing immersion-cooled GPU blade rack + green optimization heat-sweep as its hero (glowing on the shaded right face).
