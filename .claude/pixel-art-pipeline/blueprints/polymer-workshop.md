# Polymer Workshop — blueprint (bespoke form, STANDARD)

- **Name:** Polymer Workshop · **Slug:** `polymer-workshop` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** configuration · **Base:** Synthesize and test polymers

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a LONG SAWTOOTH-ROOF EXTRUSION SHED with a take-up spool annex (NOT the gateway cube)
The polymer workshop: a **long, low industrial shed with a sawtooth (north-light) roof** — a factory-floor silhouette for a continuous extrusion line — with a small spool/winder annex at the discharge end. The sawtooth ridge is its signature massing; distinct from the Volt Embedded sawtooth shed by ChemWorks glazing + the extruder hero. Horizontal, long, factory-like.
- **Main shed:** a long low `Box` — e.g. `Box(top≈(28,18), wx≈14, wy≈8, h≈12)`. Build the **sawtooth roof** by abutting 3 small angled `Box` ridges along the top, each with one vertical `c`/`g` north-light glass face (the classic sawtooth glazing) and a sloped `D` back — 3 repeating tooth profiles.
- **Spool annex:** a small `Box` abutting the FRONT-RIGHT discharge end — `Box(top≈(46,24), wx≈5, wy≈5, h≈9)` — housing the take-up winder.
- **Roofline:** the 3-tooth sawtooth ridge (glazed faces all toward the lit side), a small `D` vent; no tall stack.
- **Opening side: RIGHT.** The hero is a `K`-framed **discharge/output bay** on the SHADED RIGHT face where the extruded polymer comes out — glowing `g`→`c` glass with a bright `o`/`O` violet interior so it reads on the shaded side, the emerging filament catching the light. Keep the LIT LEFT long face plainer (the sawtooth north-lights provide the left interest + a couple of `c` strip windows + an `o` line).

## Signature feature (one-of-one — a screw extruder pulling a molten polymer strand onto a take-up reel)
**A horizontal screw extruder pushes molten polymer out through a die, and a long bright strand is drawn off, cooling as it runs to a slowly-winding take-up reel — a continuous polymer chain being spun.** No extruder-strand / take-up-reel / polymer-chain motif exists anywhere in the catalog (the Volt 3D-printer extruded a stacked solid PART upward; this is a continuous horizontal strand drawn onto a winding reel).
- **Extruder + die**: a `M`/`D` horizontal barrel with a `K` die head at the discharge end, an `o`/`O` violet melt glow at the nozzle (hot polymer).
- **The strand**: a single bright strand leaving the die — hot `O`/`o` at the die cooling to `c`/`h` as it travels, drawn as a long gently-sagging line; 1–2 `h` cooling-mist specks along it.
- **Take-up reel**: a `c`/`g` spool on the annex with the cooled strand wound several turns around it (concentric arcs), a small `o` rotation tick selling it winds.
- **Config read**: a small `c`/`g` panel with 2–3 `o`/`O` setting sliders (die temp / pull rate) = the configuration mini-game; a faint `O` chain-link glyph motif near the strand to read "polymer".

## Motifs it must honor (ChemWorks)
Polished lab glass (sawtooth north-lights + the cooling strand), violet reaction glow (`o`/`O`/`r`) at the melt + die, condenser/pipe motif (the cooling run), blue glassware family for the cooled strand + windows, `M`/`D` blue-grey shed walls.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_polymer-workshop.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/polymer-workshop.png`
- Preview → `art/preview/buildings/chemworks_polymer-workshop.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **long sawtooth-roof extrusion shed with a spool annex and the discharge bay glowing on the RIGHT**, distinct from the gateways, the Volt embedded sawtooth shed / 3D printer, and all ChemWorks siblings, with a screw extruder drawing a polymer strand onto a take-up reel as its hero.
