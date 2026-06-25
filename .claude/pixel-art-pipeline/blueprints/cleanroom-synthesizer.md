# Cleanroom Synthesizer — blueprint (bespoke form, PREMIUM capstone)

- **Name:** Cleanroom Synthesizer · **Slug:** `cleanroom-synthesizer` · **Lab type:** `chemworks`
- **Role:** premium · **Mini-game:** optimization · **Base:** Precision synthesis under contamination control

## Set palette (author on these chars→hex exactly)
`K #161a2e` · `W #e6ecfb  L #c2cdee  M #9aa8d8  D #6f7cb0  d #4b5688` · `h #d6ecff  c #a8d4ff  g #4aa0e6  G #2166b0` · `o #c89cf0  O #e0c2ff  r #6a34a8`

## BUILT FORM — a SLEEK SEALED CLEANROOM with a curved glass curtain wall + airlock (NOT the gateway cube)
The premium capstone: the **cleanest, most polished building in the set** — a sleek sealed cleanroom block with one fully glazed **curved premium curtain wall**, a stepped clerestory plenum on top (the HEPA-filter ceiling), and a small projecting **airlock vestibule**. The most refined silhouette; reads "premium / contamination-controlled" — no exposed pipework or open benches, everything sealed and gleaming.
- **Main cleanroom block:** a wide low-to-mid `Box` — e.g. `Box(top≈(30,18), wx≈14, wy≈10, h≈14)` — one continuous premium glass curtain wall (`c`/`h` ribbon panes, crisp `K` mullions, bright `W`/`h` reflections, very clean) on a thin `L`/`W` plinth.
- **Filter plenum:** a setback `Box` on the roof — `Box(top≈(31,12), wx≈10, wy≈6, h≈5)` — a clean `L`/`W` plenum with a `K`-grid of square HEPA-filter panels on its top + a thin `c` clerestory band, `W` premium rim glints.
- **Airlock vestibule:** a small projecting `Box` at the FRONT corner — `Box(top≈(22,28), wx≈4, wy≈4, h≈9)` — a sealed glass airlock pod with a `K`-framed double-door + an `o` "cycle" indicator.
- **Roofline:** the stepped filter plenum (HEPA grid) + `W` rim glints — sleek and flat, premium; a faint `o`/`O` violet downflow shimmer at the eave.
- **Opening side: RIGHT.** The hero is a tall premium **synthesis-bay curtain panel + airlock** on the SHADED RIGHT face — a `K`-framed `g`/`c` curtain made to GLOW (bright `h`/`O` violet-clean lit interior, an `h` reflection sweep, the glowing airlock door) so it reads on the shaded side. The LIT LEFT face stays the cleaner, plainer curtain wall (calm `c`, one quiet `h` glint, fewer accents).

## Signature feature (one-of-one — a robotic glovebox arm assembling a molecule under a laminar-flow shimmer)
**Behind the glass, a sealed glovebox with a precise robotic arm places a single glowing atom onto a part-built molecule, all bathed in the faint vertical shimmer of laminar clean-air downflow falling from the HEPA ceiling.** No glovebox-arm / laminar-downflow / single-atom-placement motif exists anywhere in the catalog (distinct from the Volt robot arm waving out of a bay — this is a fine isolated arm inside a sealed glovebox placing an atom, under a clean-air curtain).
- **Glovebox + arm**: a small `K`-framed `c`/`h` glass glovebox in the glowing right bay; inside, a slim `M`/`L` articulated robotic arm with a fine `K` tip, poised over a workpiece.
- **The molecule being built**: a tiny part-built ball-and-stick cluster (2–3 `c`/`O` atom dots + `M` bonds) with ONE bright `O`/`W` atom held at the arm tip about to be placed (the precision synthesis), an `o` glow where it joins.
- **Laminar downflow**: a faint set of vertical `h`/`c` shimmer lines falling evenly from the HEPA plenum down through the bay (the clean-air curtain) — even, parallel, premium.
- **Optimization read**: a small `c`/`g` purity/yield gauge by the bay pinned at an `O` 99.9% mark + 1–2 `h` sterile sparkles; a soft `o` violet clean-glow pooling at the bay floor.

## Motifs it must honor (ChemWorks)
Polished lab glass (the premium curtain wall + glovebox — the cleanest glass in the set), violet reaction glow (`o`/`O`/`r`) at the placed atom + clean-glow, blue glassware family (`h`/`c`/`g`/`G`) for the curtain + downflow shimmer, `M`/`D` blue-grey trim; sealed, gleaming, contamination-controlled premium feel (the ChemWorks answer to the Volt steel drum / BioCore green-roof capstones).

## Target output paths
- Source JSON → `art/src/buildings/chemworks_cleanroom-synthesizer.json`
- Rendered PNG → `apps/web/public/sprites/buildings/chemworks/cleanroom-synthesizer.png`
- Preview → `art/preview/buildings/chemworks_cleanroom-synthesizer.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (ChemWorks palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **sleek premium sealed cleanroom with a curved glass curtain wall, HEPA filter plenum, airlock, and the synthesis bay glowing on the RIGHT**, distinct from the gateways, the Volt/BioCore premium capstones, and all ChemWorks siblings, with a glovebox robotic arm placing an atom under laminar downflow as its hero.
