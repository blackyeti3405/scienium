# Specimen Vault — blueprint (bespoke form, STANDARD)

- **Name:** Specimen Vault · **Slug:** `specimen-vault` · **Lab type:** `biocore`
- **Role:** standard · **Mini-game:** identification · **Base:** Curate and classify biological samples

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a SOLID STACKED ARCHIVE BLOCK with a glazed front wall (NOT the gateway cube)
The opposite of the airy Greenhouse: a **windowless, solid stacked storage block** — a heavy two-tier archive massing (a wide lower base with a narrower upper stack set back), reading as a climate-controlled vault, not a hothouse. Walls are mostly opaque `M`/`D` (the only glass is the curated front wall + the signature), giving a stout, secure silhouette distinct from every glasshouse sibling.
- **Lower base:** a wide solid `Box` — roughly `Box(top≈(30,18), wx≈13, wy≈11, h≈12)` — opaque `M`/`D` walls with thin `D`/`d` panel seams (the set's wood-framing motif as cabinet seams) and a low `K` plinth.
- **Upper stack (setback tier):** a narrower solid `Box` centered on top and set back — roughly `Box(top≈(33,8), wx≈8, wy≈7, h≈8)` — opaque, with a small `c` clerestory slit band on its lit-left for the cold-room glow.
- **Roofline:** flat with a `D` parapet lip; a couple of small `o`/`r` climate-vent boxes on the roof. Compact and blocky.
- **Opening side: RIGHT.** The hero is a tall **glass curation wall + door on the SHADED RIGHT face** of the lower base — a `K`-framed grid of `g`/`c` panes that must GLOW (bright lit interior, `h`/`c` cold-storage light spilling out) so it reads on the shaded side. Keep the lit-left face plainer (opaque with one small `D` seam line only).

## Signature feature (one-of-one — a backlit wall of glowing specimen jars)
**The shaded front wall is a floor-to-ceiling backlit shelf of preserved specimen jars — a grid of glass cylinders each holding a softly glowing curated sample, an illuminated cabinet of curiosities.** No jar-shelf / specimen-collection / backlit-cabinet motif exists anywhere in the catalog.
- A **2×3 (or 3×3) grid of jars**: each jar a small `c`/`h` glass cylinder with a `K` rim and lid, set in a `D` shelf frame against an `h`/`c` backlight panel so each glows.
- **Inside the jars:** tiny curated specimens — a `M`/`D` leaf, a `g` coiled frond, an `O`/`o` amber-preserved bug, a `c` translucent blob — each a distinct 2–3px silhouette so the grid reads as a *collection of different things*.
- A bright `h` top-light rail above the grid casts even glow; a thin `o` catalog-label strip runs under each jar.
- A faint `c` cold-store haze drifts at the base of the wall.

## Motifs it must honor (BioCore)
`D`/`d` wood-framed cabinet seams, glass terrarium jars (greenhouse-glazing motif miniaturized into specimen vessels), soft glow lighting (cold `h`/`c` here instead of amber), green palette on the opaque walls — clean, scientific, curated.

## Target output paths
- Source JSON → `art/src/buildings/biocore_specimen-vault.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/specimen-vault.png`
- Preview → `art/preview/buildings/biocore_specimen-vault.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **solid stacked archive block** clearly different from the gateways and its BioCore siblings, with the **glowing curation wall/opening on the RIGHT (shaded, lit interior)** and a backlit wall of glowing specimen jars as the front feature.
