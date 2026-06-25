# Wet Lab — blueprint (bespoke form, STANDARD)

- **Name:** Wet Lab · **Slug:** `wet-lab` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** configuration · **Base:** Conduct biological assays

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a WIDE LOW HALL with a clerestory monitor roof (NOT the gateway cube)
A broad working benchlab: a wide, low, horizontal `Box` hall topped by a raised central **clerestory monitor** (a narrow raised roof box with side glazing for daylight) — a different roofline from every sibling (Greenhouse = gable, Vault = stacked block, Microscopy = drum, Incubation = dome). Reads as a long, busy assay hall full of glassware.
- **Main hall:** a wide low `Box` — roughly `Box(top≈(28,17), wx≈15, wy≈9, h≈10)` — `M`/`D` walls with a long `D`/`d` wood-frame band at bench height and a continuous low `c` window strip (the bench windows) running the lit-left length.
- **Clerestory monitor:** a narrow raised `Box` along the roof ridge — roughly `Box(top≈(31,8), wx≈10, wy≈4, h≈5)` — glazed `c`/`h` on its sides (daylight scoop), `L`/`W` cap. This raised light-monitor is the signature roof shape.
- **Roofline:** flat hall roof split by the raised central clerestory monitor; small `o`/`r` reagent vent pipes at the ends.
- **Opening side: LEFT.** The hero is a wide `K`-framed glass entry + bench-window run on the LIT LEFT face — `g`/`c` panes, `h` reflections, a centered `K`-framed glass door with soft `o` interior glow. Keep the right face plainer (opaque `M`/`D` with one small vent).

## Signature feature (one-of-one — an arched rack of bubbling assay test-tubes)
**A long backlit rack of bubbling test-tubes and assay flasks lines the bench window — rows of slim glass tubes in graded teal-to-green liquids, each fizzing tiny bubbles, with a pipette arm dispensing drops down the row.** No test-tube-rack / bubbling-assay / pipette-dispenser motif exists anywhere in the catalog (Volt had flasks-free; ChemWorks' bubbling flasks are a *different set* and reserved separately — here it's a slim assay-tube RACK with a pipette arm, biologically tinted).
- A **rack of 5–7 slim tubes** in a `D` test-tube rack: each tube a thin `c`/`g` glass cylinder with a `K` rim, filled with graded liquid (`c`, `g`, `G`, `o`, `O` — a gradient of assays) and tiny rising `h`/`W` bubble dots.
- A small **pipette arm** on a `D`/`M` rail above the rack, tip down over one tube, releasing a single bright `O`/`h` droplet.
- A bright `h` backlight panel behind the rack makes the liquids glow; a thin `o` reagent-label strip runs under the tubes.
- One tube fizzes harder (a little `W`/`h` froth cap) marking the active assay (the configuration game).

## Motifs it must honor (BioCore)
Glass tubes + bench windows (greenhouse-glazing motif as labware), `D`/`d` wood-frame bench band, soft amber `o` interior glow at the door, the teal-green glass family for the assay liquids, the raised clerestory daylight monitor (greenhouse light), green walls — busy, clean, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_wet-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/wet-lab.png`
- Preview → `art/preview/buildings/biocore_wet-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **wide low hall with a raised clerestory monitor** clearly different from the gateways and its BioCore siblings, with the **entry/opening on the LEFT** and a backlit rack of bubbling assay test-tubes with a pipette arm as the feature.
