# Greenhouse — blueprint (bespoke form, STARTER)

- **Name:** Greenhouse · **Slug:** `greenhouse` · **Lab type:** `biocore`
- **Role:** starter · **Mini-game:** identification · **Base:** Cultivate and observe plant specimens

## Set palette (author on these chars→hex exactly)
`K #1a2417` · `W #e8f2d8  L #c4dba6  M #9fc07e  D #6f9456  d #4a6e3a` · `h #d2f7ec  c #9fefcf  g #36cc9e  G #1d8f70` · `o #f0b24d  O #ffd488  r #b9701e`

## BUILT FORM — a STEEP-GLAZED GABLE GLASSHOUSE (NOT the gateway cube)
The starter is the most literal greenhouse in the set: a long, low **glasshouse with a steep twin-pitch (gable) glazed roof** — almost the whole structure is glass on a low knee-wall, the opposite of the angular Volt sheds. Its silhouette is a long rectangular hall with a tall triangular ridge, instantly readable as a hothouse.
- **Main hall:** a long low `Box` body — roughly `Box(top≈(30,16), wx≈14, wy≈8, h≈9)` — a short `D`/`d` wood-frame knee-wall, then the bulk is glazing (`c`/`g` panes in a regular `K`-mullion grid running the full length, lit `h` reflections on the upper-left panes).
- **Roofline — the signature shape:** a STEEP GABLE — two glazed roof slopes meeting at a high central ridge beam (not flat, not domed). Build the pitched roof as two angled glazed planes (`c`/`g` with `K` mullion ribs every ~3px) climbing to a `D` ridge beam; the lit-left slope is brighter (`h`/`c`), the right slope shaded (`g`/`G`). A small ridge vent cracks open along the top.
- **Opening side: LEFT.** The hero entrance is a tall `K`-framed double glass door on the LIT LEFT face, centered, with a soft amber `o` grow-glow spilling out the doorway; a low soil bed (`r`/`d` planters with `M`/`D` sprouts) runs along the left footing. Keep the right face plainer (continuous glazing, no door).

## Signature feature (one-of-one — a slowly-rotating holographic terrarium globe)
**A slowly-rotating holographic terrarium globe floats above the ridge — a translucent glass sphere holding a miniature living biome (tiny tree, hill, drifting clouds) projected up from the greenhouse, turning on its axis.** No globe/terrarium/floating-biome motif exists anywhere in the catalog.
- The **globe**: a clean `c`/`h` translucent sphere (a 2:1 hover-circle) with a bright `h` rim glint upper-left and a `G` shaded crescent lower-right — reads as glass.
- **Inside the globe:** a tiny biome — a `D`/`d` hill mound, a single `M`/`D` tree with an `O` canopy dot, one or two `h` cloud puffs — a little world.
- An **axis ring / orbit line** (a thin `g` ellipse band tilted around the globe) sells the slow rotation; one `O` glint travels the ring.
- A thin `o`/`O` projector beam rises from a small roof-ridge emitter into the globe; a faint `c` glow halo hugs the sphere.

## Motifs it must honor (BioCore)
Greenhouse glazing (steep glazed gable = the set's signature glasshouse), `D`/`d` wood framing on the knee-wall + ridge, a soil planter bed (`r`/`d`) with `M` sprouts, soft amber `o` grow-glow at the doorway, leaf/vine green palette throughout — lush, clean, alive.

## Target output paths
- Source JSON → `art/src/buildings/biocore_greenhouse.json`
- Rendered PNG → `apps/web/public/sprites/buildings/biocore/greenhouse.png`
- Preview → `art/preview/buildings/biocore_greenhouse.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (BioCore palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **steep-glazed gable glasshouse** clearly different from the gateways and its BioCore siblings, with the **entrance/opening on the LEFT** and a slowly-rotating holographic terrarium globe floating above the ridge.
