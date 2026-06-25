# Theoretical Physics Annex — blueprint (bespoke form, STANDARD · L-SHAPE)

- **Name:** Theoretical Physics Annex · **Slug:** `theoretical-physics-annex` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** decoding · **Base:** Symbolic reasoning and derivations

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a SMALL L-SHAPE ANNEX (two abutted boxes, one taller, one low) (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). A modest **L-shape annex** — a taller main study block with a lower reading wing abutting its front-right, the two meeting at a right angle. A compact two-mass L silhouette (closed, not an open yard) — distinct from the open-concept particle yard and from the single big halls.
- **Main block:** a medium `Box` — e.g. `Box(top≈(24,16), wx≈9, wy≈7, h≈17)`, flat roof. The taller of the two.
- **Low wing:** a lower, smaller `Box` abutting the FRONT-RIGHT of the main block — e.g. `Box(top≈(40,24), wx≈5, wy≈6, h≈10)` — forming the L. Drawn AFTER the main block so it sits front-right; this puts the main opening on the RIGHT.
- **Roofline:** two flat roofs at different heights (the L step); a small `D` chimney/instrument cowl on the main block; the signature spacetime hologram hovers over the wing's roof. A thin `o` accent line trims the main parapet.
- **Opening side: RIGHT (glowing).** The hero is on the SHADED RIGHT face of the low wing: a `K`-framed **study window-wall** that GLOWS (warm `O`/`o` interior lamplight + `g`/`c` instrument readouts + `h` reflection) so it reads on the dark face — bright glazing via `Box.window`. Keep the LIT LEFT face of the main block plainer: one `c` window via `Box.window` + a `K` door.

## Signature feature (one-of-one — a hovering holographic curved-spacetime grid dimpled by a glowing mass, with orbiting field-equation symbols, one term decoding)
**Above the wing hovers a holographic curved-spacetime grid — a stretched rubber-sheet lattice dimpled downward by a glowing mass — with field-equation symbols orbiting it and one term lighting up as it decodes.** No spacetime-curvature / gravity-well-grid / orbiting-field-equation motif exists anywhere in the catalog, and it is deliberately distinct from #1 Chalkboard Room (a PHYSICAL slate with chalk) — this is a floating HOLOGRAPHIC curvature grid, no chalkboard. Collides with nothing.
- **Curved spacetime grid:** a hovering `c`/`g` wireframe sheet (a flat grid of crossing `c` lines) warped into a deep funnel/dimple in its center — the lines bending steeply toward the well, brighter `h` on the lit-left rim, `G` deep in the well.
- **The mass:** a glowing `O`/`W` orb sitting at the bottom of the dimple with a `K` pip and an `o` halo (the mass curving space).
- **Orbiting symbols:** 3–4 small `o`/`O` field-equation glyphs (short broken `o` strokes implying tensor/Greek symbols + an `=`) circling the grid at the rim, one glyph lit brightest `O`/`W` = the term being decoded.
- **Decoding tell:** a small `c`/`o` decode strip on the wing's right-face sill with a row of `o` ticks and one `O` "SOLVED" tick lit; a soft `c` glow halo under the floating grid.

## Motifs it must honor (Axiom)
Chalk-equation language reimagined as floating field-equation glyphs (decoding), gold starlight glints (`o`/`O` mass + symbols + decode tick), navy night-sky glass (`c`/`g` curvature grid + study windows), `M`/`D` deep-navy walls, particle/curve language in the warped lattice, cyan/gold decode readout.

## Target output paths
- Source JSON → `art/src/buildings/axiom_theoretical-physics-annex.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/theoretical-physics-annex.png`
- Preview → `art/preview/buildings/axiom_theoretical-physics-annex.png`
- Builder script → `art/pixel-art-pipeline/builders/theoretical-physics-annex.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); any vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **small L-shape annex (taller main block + lower front-right wing) opening on the RIGHT**, distinct from the gateways and all Axiom siblings, with a hovering holographic curved-spacetime grid (dimpling mass + orbiting field-equation symbols, one decoding) as its hero (glowing study wall on the shaded right face).
