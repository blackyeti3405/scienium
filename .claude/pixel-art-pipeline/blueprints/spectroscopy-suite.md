# Spectroscopy Suite — blueprint (bespoke form, STANDARD)

- **Name:** Spectroscopy Suite · **Slug:** `spectroscopy-suite` · **Lab type:** `chemworks`
- **Role:** standard · **Mini-game:** identification · **Base:** Identify compounds by spectral signatures

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a LOW WIDE OPTICS BLOCK with a clerestory monitor (NOT the gateway cube)
The optics suite: a **low, very wide single-storey instrument hall** with a raised **clerestory monitor band** running along its ridge (a long light-slot roof) so it reads as a precision optics room kept dark and stable inside. Horizontal, calm, glassy — different from the tall reactor hall and the towers.
- **Main hall:** a wide low `Box` — e.g. `Box(top≈(28,18), wx≈14, wy≈9, h≈13)`, flat roof. The widest, lowest closed mass in the set.
- **Clerestory monitor:** a long narrow raised `Box` along the roof ridge — `Box(top≈(30,12), wx≈10, wy≈3, h≈4)` — its long sides glazed in `c`/`g` ribbon glass with `K` mullions (a row of light-slots), `W`/`L` flat cap.
- **Roofline:** flat roof + the raised clerestory monitor ridge + a small `D` instrument cowl; no stack.
- **Opening side: LEFT.** The hero is a `K`-framed **sample-loading bay** on the LIT LEFT face — a wide `c`/`h` glass roll-shutter window with `h` reflections and an `o` ready-light, plus a `K`-framed door. The shaded RIGHT face stays plain (instrument vents + a `D` cable conduit).

## Signature feature (one-of-one — a prism splitting a white beam into a spectral rainbow)
**A bright white beam enters a glass triangular prism on the roof and fans out the other side into a banded spectral rainbow, the readout the suite reads compounds from.** No prism / beam-splitting / spectral-rainbow motif exists anywhere in the catalog (the Volt oscilloscope CRT shows a single cyan waveform on a screen; this is a refracted fan of colored bands in open air off a glass prism).
- **Prism**: a clear `h`/`c` triangular glass prism (a small filled triangle with `K` edges + a `W` highlight facet) standing on the clerestory roof.
- **Incoming beam**: a single bright `W`/`h` ray striking the prism from the lit-left.
- **Spectral fan**: a fan of 5–6 thin parallel bands spreading from the prism's far face, using the set's available hues to imply a spectrum — `r`/`o`/`O` violet end → `c`/`g`/`G` blue end (e.g. `r,o,O,c,g,G`), widening as it goes.
- **Identification read**: a small `c`/`g` strip-chart panel on the clerestory base showing the matched spectral lines (thin `o`/`c` ticks) with one `O` line lit = "identified".

## Motifs it must honor (ChemWorks)
Polished lab glass (the prism + glazed clerestory), violet reaction glow / accent at the violet spectral end and ready-light (`o`/`O`/`r`), blue glassware family (`h`/`c`/`g`/`G`) for the blue spectral bands + windows, `M`/`D` blue-grey walls; calm precision-instrument feel.

## Target output paths
- Source JSON → `art/src/buildings/chemworks_spectroscopy-suite.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/spectroscopy-suite.png`
- Preview → `art/preview/buildings/chemworks_spectroscopy-suite.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **low wide optics hall with a glazed clerestory ridge and the loading bay on the LEFT**, distinct from the gateways and all siblings, with a prism-split spectral rainbow as its hero.
