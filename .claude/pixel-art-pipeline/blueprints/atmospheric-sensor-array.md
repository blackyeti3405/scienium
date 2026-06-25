# Atmospheric Sensor Array — blueprint (bespoke form, STANDARD)

- **Name:** Atmospheric Sensor Array · **Slug:** `atmospheric-sensor-array` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** prediction · **Base:** Track atmospheric chemistry

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a CLUSTER / TANK-FARM of tall slender gas-sampling STACKS on a low base (NOT the gateway cube)
A distinctive **multi-cylinder silhouette** — a tight cluster of 3–4 tall slender sampling stacks of varied height standing on a low base block, like an air-monitoring tank farm. The only "cluster of vertical cylinders" form in the set; immediately distinct from every single-mass sibling.
- **Base block:** a low wide `Box` — `Box(top≈(30,26), wx≈10, wy≈9, h≈8)` — `M`/`D` walls, a flat `L` deck the stacks stand on; an `o` hazard stripe along the base.
- **Sampling stacks:** 3–4 tall slender `cylinder` columns of staggered heights rising from the deck, e.g. `cylinder(cx≈26, top_y≈6, rx≈3, h≈22)`, `cylinder(cx≈34, top_y≈3, rx≈3, h≈26)` (tallest), `cylinder(cx≈42, top_y≈9, rx≈3, h≈19)` — `M`/`D` steel with `K` `o`-banded collars at intervals; a thin `c` sight-strip up the lit-left of the tallest. Draw back stacks before front ones.
- **Intake horns:** each stack is crowned with the signature upward sniffer-horn (see below); thin `D` sample-lines tie the stack tops together into the base analyzer.
- **Roofline:** the staggered stack tops + their intake horns; a small `D` met-mast with a `c` blink on the base deck back corner (NO anemometer — just a blink beacon).
- **Opening side: RIGHT (glowing analyzer on the shaded face).** The hero is the analyzer bay on the SHADED RIGHT face of the base: a `K`-framed window showing a glowing `g`→`c` bell-jar analyzer and a bright `o`/`O` lit interior so it reads on the shaded side, `h` reflection. Keep the LIT LEFT base face plainer — plain wall, one `c` ribbon window, a vent.

## Signature feature (one-of-one — a crown of upward intake horns inhaling drifting gas wisps into a glowing bell-jar analyzer with a predicted-concentration needle climbing)
**The stacks are crowned with a ring of upward-facing intake horns / sniffer-tubes that visibly inhale drifting amber and teal gas wisps out of the air, funneling them down into a glowing bell-jar analyzer in the right-side bay — where a predicted-concentration needle climbs a dial toward a forecast threshold.** No gas-intake / sniffer-horn / bell-jar-analyzer motif exists in the catalog (ChemWorks Spectroscopy splits a light beam through a PRISM — that's optics; this is physically sampling air through intake horns into a chemistry analyzer), so it collides with nothing.
- **Intake horns:** small `D`/`M` flared funnels on the stack tops, mouths up; faint `K` rims.
- **Drifting wisps:** loose `o`/`O` amber and `c`/`g` teal gas wisps drift in the air near the horns and curl down INTO them (a few soft offset pixels, like smoke being sucked in).
- **Bell-jar analyzer:** in the right bay, a `c`/`h` glass bell-jar over a glowing `g`/`G` analyte puck; the collected gas swirls inside as a `o`/`c` tint.
- **Predicted-concentration needle:** a `K`-framed dial beside the jar with an `o`/`O` needle climbing toward a bright `O` forecast threshold mark (the prediction); a tiny `g` ppm readout ticks up.

## Motifs it must honor (TerraBase)
Weatherproof instruments & antennae (the sampling stacks + intake horns + beacon mast), mineral-teal sensor glow (the analyzer, sight-strip, wisps), sample crates/field-rig hardware on the base deck, weathered steel field hardware (`M`/`D`, `o` hazard banding).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_atmospheric-sensor-array.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/atmospheric-sensor-array.png`
- Preview → `art/preview/buildings/terrabase_atmospheric-sensor-array.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **cluster/tank-farm of tall slender gas-sampling stacks on a low base**, distinct from the gateways and all TerraBase siblings, with upward intake horns inhaling gas wisps into a glowing bell-jar analyzer (predicted-concentration needle) as its hero, analyzer glowing on the RIGHT.
