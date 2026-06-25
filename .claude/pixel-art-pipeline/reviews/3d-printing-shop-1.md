# Review — 3D Printing Shop (round 1)

**VERDICT: SHIP**

Sprite: `art/preview/buildings/volt_lab_3d-printing-shop.png`
Source: `art/src/buildings/volt_lab_3d-printing-shop.json`
Blueprint: `art/pixel-art-pipeline/blueprints/3d-printing-shop.md`

## Per-criterion

1. **True isometric (2:1)** — PASS. Clean 2:1 box; the two visible wall faces recede on the correct iso slope, vertical near-corner centered.
2. **Roof visible (3/4 top-down)** — PASS. Corrugated metal roof ring and top deck read clearly; the glass dome sits on the deck with the roof apron around it.
3. **Front corner faces viewer** — PASS. Near vertical corner is centered; left and right wall faces splay correctly.
4. **Sharp / clean K outline** — PASS. Source is exactly 64×64, all 13 palette colors, zero off-palette characters, every row width-64. Hard `K` silhouette, crisp single-pixel edges, no blur/AA/strays. (The only blended pixels are upscaling seams in the 10× preview raster, not in the source.)
5. **Cohesive with palette + motifs** — PASS. Steel-grey body, cyan glass dome, electric-yellow power line from roof edge to printer base, cyan glass front windows. Most blueprint motifs present: corrugated roof ring, power line, filament/cable `c`/`M` runs into the extruder, front-face sample shelf. (Progress-bar readout, rivet ring, and a distinct spool disc are weak/absent — see nits; not blockers.)
6. **One-of-one signature feature** — PASS. This is the round-0 blocker and it is fixed. The model now reads as a half-built part in **stacked horizontal print-line layers**: hot pale `o`/`O` top layer, cooling through gold to darker `r` cooled base (rows 14–22), with discrete stepped bands. A grey `M`/`D`/`K` gantry/extruder head assembly spans the chamber above it, a hot-end `o` glow sits at the top of the stack, and a `c` cyan filament glint feeds in. It is now unmistakably **additive** and clearly distinct from the Mill's subtractive cut.
7. **Attractive** — PASS. Strong silhouette and contrast; the layered model + gantry are the clear focal point; the left front window's stepped print-sample shelf differentiates the two faces and reinforces the print-shop theme.

## Round-0 fix audit

- Rebuild model as legible print layers — **LANDED** (hot→cooled stacked bands).
- Vertical gantry + extruder head — **LANDED** (head assembly over the top layer).
- Hot-end glow dot — **LANDED** (`o` glow at stack top).
- Filament spool + feed line — **PARTIAL** (cyan filament glints feed in; no distinct round spool disc).
- Build-progress readout bar — **WEAK** (a front panel exists but doesn't clearly read as a filled `c`-on-`G` bar).
- Rivets on dome base ring — **WEAK** (no clearly legible rivet row).
- Front-face sample shelf — **LANDED** (left window shows stacked print samples).
- Declutter dome glass — **PARTIAL** (some cyan streaking remains, but the model is now the focal point).

## Polish nits (optional, do not block ship)

1. **Progress-bar readout** — On the dome base ring front, convert ~5×2 px into an explicit `c`-filled segment against a `G` track so the build-progress motif reads at a glance.
2. **Spool + rivets** — Add a small `c` 3×3 spool disc on the gantry and a sparse `D`/`K` rivet row along the corrugated ring; both would complete the motif set, but neither is missed at gameplay scale.
