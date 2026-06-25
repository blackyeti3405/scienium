# Behavioral Observation Room — blueprint (bespoke form, STANDARD)

- **Name:** Behavioral Observation Room · **Slug:** `behavioral-observation-room` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** prediction · **Base:** Track and analyze animal behavior

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a WIDE GLASS-FRONTED VIVARIUM HALL with a half-hipped roof (NOT the gateway cube)
An animal-watching enclosure: a wide low `Box` hall whose entire LIT-LEFT face is one big glass observation vivarium window, under a gentle **half-hipped (single-slope) roof** that tilts down toward the front — a roofline used by no sibling (Greenhouse gable, Wet Lab clerestory, Field Station lean-to all differ from this clean single hip). Reads as a naturalistic enclosure you observe through one-way glass.
- **Main hall:** a wide low `Box` — roughly `Box(top≈(28,18), wx≈14, wy≈10, h≈10)` — `M`/`D` walls, a `D`/`d` wood-frame base band, with the lit-left face given over almost entirely to one big observation window (below).
- **Roofline:** a gentle single-slope half-hipped roof (one `L`/`M`/`D` plane sloping down to the front-left eave, a `D` ridge at the back) — soft and naturalistic; a small `o` heat-lamp box + a `c` camera pod sit on the slope aimed into the enclosure.
- **Opening side: LEFT.** The hero is the floor-to-roof **vivarium observation window on the LIT LEFT face** — a big `K`-framed grid of `c`/`g`/`h` glass with bright `h` reflections, a centered `K`-framed glass observer door, soft `o` interior glow; the enclosure scene shows through it. Keep the right face plainer (opaque `M`/`D`, one small `c` vent).

## Signature feature (one-of-one — a naturalistic enclosure with a tracked animal trailing a motion path)
**Behind the glass sits a little naturalistic habitat — a branch, a rock, foliage — where a small animal moves, trailing a glowing dotted motion-path and a heat-map footprint, its next step predicted by a faint ghost marker ahead.** No animal-enclosure / motion-path / heat-map-tracking motif exists anywhere in the catalog (MindFrame's behavioral lab is human-study and a *different set*; this is a tracked *animal* with a path trail).
- **Habitat set-dressing**: a `D`/`d` branch perch, a `M`/`g` foliage tuft, a `r`/`d` rock, a `d` litter floor — a tiny diorama.
- **The animal**: one small `O`/`o` creature (a 3–4px critter — a mouse/lizard silhouette) mid-stride on the branch, a `K` eye dot.
- **Motion path**: a curved trail of glowing `c`/`g` dots behind it tracing where it went, fading `G`→`c`; a faint `h` ghost marker + `o` arrow ahead = the predicted next position (the prediction game).
- **Heat-map**: a couple of soft `o`/`O` warm blobs on the floor where it lingered. A small `c`/`O` tracking-readout pip on the window frame.

## Motifs it must honor (BioCore)
Big observation glazing (greenhouse-glazing as a vivarium window), `D`/`d` wood framing + a real branch perch, soil/litter floor (`d`/`r`), soft amber `o`/`O` heat-lamp glow, leaf-green `M`/`g` foliage, the teal glass family for the tracking overlay — naturalistic, observational, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_behavioral-observation-room.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/behavioral-observation-room.png`
- Preview → `art/preview/buildings/biocore_behavioral-observation-room.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **wide glass-fronted vivarium hall with a half-hipped roof** clearly different from the gateways and its BioCore siblings, with the **observation window/opening on the LEFT** and a naturalistic enclosure with a tracked animal trailing a glowing motion-path as the feature.
