# Incubation Chamber — blueprint (bespoke form, STANDARD)

- **Name:** Incubation Chamber · **Slug:** `incubation-chamber` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** prediction · **Base:** Grow cultures under controlled conditions

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a SEALED WARM POD with a humidity dome (NOT the gateway cube)
A sealed, warm, controlled box: a compact square `Box` body topped by a translucent **inflated humidity dome** (a low `cylinder`/hemisphere cap of frosted glass), reading as a sealed warm incubator — rounder and "puffier" than the Vault's hard block or the Greenhouse's sharp gable. The whole thing glows warm amber inside, the warmest building in the set.
- **Main body:** a compact square `Box` — roughly `Box(top≈(30,20), wx≈11, wy≈10, h≈12)` — `M`/`D` insulated walls with thick `D`/`d` gasket-seam framing (double-line seams = sealed panels) and rounded-feel corners via a `K` plinth.
- **Humidity dome cap:** a low frosted-glass dome on the roof — a shallow `c`/`h` hemisphere (use a low `cylinder` + ellipse cap or a stacked-ellipse dome) with a foggy `h` interior and condensation `W` dots; this is the climate cap.
- **Roofline:** the rounded humidity dome dominates; small `o`/`r` thermostat/heater boxes flank it; a thin `c` vapor wisp rises.
- **Opening side: RIGHT.** The hero is a heavy round-cornered **sealed hatch door with a porthole window on the SHADED RIGHT face** — a `K`-framed `D` hatch with a glowing `O`/`o` warm-amber porthole and `h` condensation, the interior glow spilling around the gasket so it reads on the shaded side. Keep the lit-left face plainer (one small `c` gauge dial only).

## Signature feature (one-of-one — a stacked rack of glowing petri dishes growing colonies)
**Behind the glass, a rotating carousel rack of petri dishes glows warm amber — each dish shows a different bacterial colony blooming and spreading in real time, like little galaxies under heat lamps.** No petri-dish / culture-carousel / colony-bloom motif exists anywhere in the catalog.
- A **carousel rack**: 3–4 stacked circular petri dishes seen edge-on as glowing `O`/`o` discs in a `D` rack frame, lit from behind by `o` heat-lamp glow.
- **On each dish**: a distinct colony pattern — concentric `O`/`o` rings, a scatter of `c`/`g` dots, a branching `g` filament, a single fuzzy `W` bloom — so the dishes read as *different growing cultures*.
- A warm `o`/`O` heat-lamp bar arcs above the rack casting amber light; faint `h` condensation specks float in the warm air.
- A thin `c` thermometer/`o` gauge on the rack ticks toward a target (the prediction game), one bright `O` indicator pip lit.

## Motifs it must honor (BioCore)
Frosted greenhouse-glazing dome, `D`/`d` wood/gasket framing, soft amber `o`/`O` grow-glow (the warmest in the set — heat lamps), the teal glass family on the porthole + vapor, green insulated walls — warm, sealed, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_incubation-chamber.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/incubation-chamber.png`
- Preview → `art/preview/buildings/biocore_incubation-chamber.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **sealed warm pod with a humidity dome** clearly different from the gateways and its BioCore siblings, with the **sealed hatch opening on the RIGHT (shaded, warm interior glow)** and a glowing carousel rack of petri-dish colonies as the feature.
