# Bioinformatics Suite — blueprint (bespoke form, PREMIUM)

- **Name:** Bioinformatics Suite · **Slug:** `bioinformatics-suite` · **Lab type:** `biocore`
- **Role:** premium · **Mini-game:** optimization · **Base:** Analyze genomic data at scale

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a SLEEK PREMIUM GLASS PAVILION with a stepped green-roof terrace + atrium (NOT the gateway cube)
The premium capstone — it must look richer and more polished than the standard sheds (the way the Volt AI-Incubator out-classed its siblings). A **wide low premium pavilion**: a clean glass-curtain-walled hall with a **stepped planted green-roof terrace** climbing to a small glass atrium penthouse — lots of `W`/`h` highlights, few seams, living roof gardens (the BioCore premium signature, where Volt's premium was a polished steel drum). Distinct from every standard form and from the AI-Incubator drum.
- **Main pavilion:** a wide low `Box` — roughly `Box(top≈(28,18), wx≈14, wy≈11, h≈12)` — a continuous premium glass curtain wall (`c`/`h` ribbon panes, crisp `K` mullions, bright `h`/`W` reflections, very clean) on a thin `L`/`W` plinth.
- **Stepped green-roof terraces:** 2 setback planted tiers on top — a mid `Box` (`Box(top≈(31,9), wx≈8, wy≈7, h≈5)`) and a small glass **atrium penthouse** (`Box(top≈(33,3), wx≈5, wy≈4, h≈5)`) — each terrace edge planted with `M`/`D` greenery + `O` flower dots (living roof). `W`/`L` caps, `W` rim glints = premium.
- **Roofline:** the clean stepped-terrace ziggurat of green roofs climbing to the glass atrium; the signature globe hovers above the atrium.
- **Opening side: RIGHT.** The hero is a wide premium **lobby glass + door on the SHADED RIGHT face** — a tall `K`-framed `g`/`c` curtain panel that GLOWS (bright `h`/`O` lit atrium interior, a sweep of `h` reflection) so it reads on the shaded side. Keep the lit-left face the cleaner curtain wall (plainer, fewer accents).

## Signature feature (one-of-one — a hovering rotating holographic genome ring / Circos plot)
**A large rotating holographic "genome ring" hovers above the atrium — a circular Circos-style chromosome diagram: a banded ring of color-coded segments with bright arcs of light leaping chord-wise across the center linking related genes, the whole thing slowly turning as it optimizes.** No genome-ring / Circos / chord-diagram / chromosome-band motif exists anywhere in the catalog (distinct from the genetics lab's vertical *double-helix* — this is a flat rotating *ring of bands with chord arcs*, premium and analytical).
- **The ring**: a large translucent `c`/`h` torus/ring (a 2:1 hover-ellipse band) divided into ~8 color-coded segments — alternating `O`, `o`, `g`, `G`, `c` chromosome bands with thin `K` ticks between them; bright `h` rim glint upper-left, `G` shade lower-right.
- **Chord arcs**: 2–3 bright `W`/`h`/`c` arcs leaping across the ring's open center connecting distant segments (gene links), one arc lit brightest with an `O` blip traveling it (the optimization running).
- **Rotation + scale**: a faint outer `g` tick-ring and one `O` index marker selling slow rotation; a soft `c` glow halo + `h` sparkles.
- A thin `o`/`O` projector beam rises from the atrium roof emitter into the ring; premium clean — lots of `W`/`h`.

## Motifs it must honor (BioCore)
Premium greenhouse glazing (clean curtain walls + glass atrium), **living green-roof terraces** with `M`/`D` plants + `O` blooms (the premium BioCore flourish), the teal `c`/`g`/`G` + amber `o`/`O` glow family for the hologram, `W`/`h` premium highlights, green palette throughout — sleek, analytical, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_bioinformatics-suite.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/bioinformatics-suite.png`
- Preview → `art/preview/buildings/biocore_bioinformatics-suite.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **sleek premium glass pavilion with stepped green-roof terraces + a glass atrium** clearly different from the gateways, the Volt AI-Incubator drum, and its BioCore siblings, with the **lobby opening on the RIGHT (shaded, lit atrium interior)** and a hovering rotating holographic genome-ring (Circos plot) above the atrium.
