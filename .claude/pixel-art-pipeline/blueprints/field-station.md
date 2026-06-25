# Field Station — blueprint (bespoke form, STANDARD)

- **Name:** Field Station · **Slug:** `field-station` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** prediction · **Base:** Collect ecological data from the field

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — an L-SHAPED OPEN-CONCEPT CABIN around a sample courtyard (NOT the gateway cube)
The most rustic, outdoorsy form: a small **L-shaped wood field cabin** — two low `Box` wings meeting at the back corner, with a slanted/lean-to plank roof — wrapped around an **open sample courtyard** where the signature instrument stands out in the open, ringed by `o` hazard/marker striping. Distinct from every enclosed sibling (this is the open-concept member of the batch). Weathered, expedition-camp feel.
- **Back-left wing:** a low `Box` — roughly `Box(top≈(24,16), wx≈7, wy≈9, h≈10)` — `D`/`d` plank walls (heavier wood than siblings), a low slanted lean-to plank roof (`D`/`d` boards), a small `c` window.
- **Back-right wing:** a low `Box` abutting at the back corner — roughly `Box(top≈(38,18), wx≈6, wy≈8, h≈10)` — same plank treatment, a `K` storage shutter.
- **Open courtyard:** the L embraces an open front-corner yard at ground level; floor of `d`/`r` packed-earth with a ring of `o`/`K` survey-marker striping; this is where the signature mast stands.
- **Roofline:** low slanted lean-to plank roofs on each wing (not flat, not gabled) — rustic boards, a `D` ridge where they meet; a small `o` lantern hangs at the inner corner.
- **Opening side: RIGHT.** Although open-concept, the assigned hero face is the SHADED RIGHT — the right wing's face opens as a wide `K`-framed shutter/glass bay that GLOWS (warm `o`/`O` lamp-lit interior, gear visible) so it reads on the shaded side; the left wing face stays plainer plank with one small window. (Counts as a RIGHT opening for batch balance.)

## Signature feature (one-of-one — a weather-and-wildlife sensor mast with a spinning anemometer)
**A tall guyed sensor mast rises from the open courtyard, crowned with a spinning cup-anemometer, a swiveling wildlife trail-camera, and a fluttering data-pennant — the station's eyes and ears on the ecosystem, with little data blips pinging off it.** No anemometer / sensor-mast / trail-camera motif exists anywhere in the catalog (Volt's weathervane was an anvil-and-wrench cupola, not a meteorological mast; Operations' radar dish is a dispatch dish, not a guyed eco-mast).
- The **mast**: a thin `D`/`M` pole rising from the courtyard with 2–3 `d` guy-wires angling to `o` ground anchors; small `K` rung details.
- **Anemometer crown**: 3 little `W`/`c` cups on thin `K` arms spinning at the top (motion-blur hint via offset `c`/`h` ghost pixels), one cup catching `O` light.
- **Trail-camera**: a small `D`/`M` box mid-mast with a glowing `c`/`O` lens eye aimed out over the courtyard; a thin `g` scan-line.
- **Data pennant**: a small `o`/`O` triangular flag fluttering near the top; faint `c`/`h` data-blip dots ping outward (the prediction signal). A leaf-vine `g` curl winds the mast base (BioCore trim).

## Motifs it must honor (BioCore)
Heavy `D`/`d` wood/plank framing (the most rustic in the set), open-concept courtyard with `o`/`K` marker striping, soft amber `o`/`O` lantern + lit-bay glow, leaf/vine `g` trim on the mast, a `c` window — outdoorsy, expedition, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_field-station.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/field-station.png`
- Preview → `art/preview/buildings/biocore_field-station.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as an **L-shaped open-concept field cabin around a sample courtyard** clearly different from the gateways and its BioCore siblings, with the **lit-bay opening on the RIGHT (shaded, warm interior glow)** and a weather-and-wildlife sensor mast with a spinning anemometer rising from the courtyard.
