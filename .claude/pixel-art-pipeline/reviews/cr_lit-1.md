# Creative review — Literature Review (gateway) · round 1

**Render:** `art/preview/literature_review_creative.png`
**Blueprint:** `.claude/pixel-art-pipeline/blueprints/creative_literature_review.md`
**Verdict: TWEAK**

## Palette (recolor-safety gate)
PASS. Verified programmatically against the JSON grid: only the 13 canonical
chars are used (`DGKLMOWcdghor`), zero off-palette. 64×64, all rows uniform
width 64. No automatic TWEAK on palette.

## What lands
- **Identity is unmistakable.** The floating teal open-book hologram reads
  instantly as "Literature Review." Strong silhouette, good V/spine shape.
- **Palette identity is distinct + pleasant** — lavender walls (`K/W/L/M/D/d`)
  + teal glass hologram (`h/c/g/G`) + orange trim (`o/O/r`). Reads well and
  differentiates it from the green greenhouse / navy theater.
- **Crisp iso, clean K outline** on the base. Projection is correct, edges are
  consistent.
- Core beats from the blueprint are all present: floating book, rising stream,
  warm glow beneath, arched glass windows, sparkles.

## Why it's not yet SHIP (measured against the `_t5` north stars)
Held up next to `biocore_greenhouse_t5` and
`axiom_cosmology-visualization-theater_t5`, this reads as a strong hologram
bolted onto a **clearance-2/3 base**, not a maxed-out clearance-5 building.

1. **The base is squat and under-built.** The references have real vertical
   mass and architectural detail (roof planes, a rounded dome + stepped
   plinth). This is a low, thin box — it doesn't read as a "grand library
   hall." Biggest gap to the `_t5` bar.
2. **The roof is bare.** The large flat top diamond is empty except the burst.
   `_t5` roofs earn their top surface (skylights, ridge, a dais). The book's
   light has no clear *source* structure to rise from.
3. **The orange roof burst reads as a splat, not a font of light.** The
   radiating spikes (rows ~42–51) are asymmetric and slightly messy, breaking
   the otherwise crisp iso read.
4. **The knowledge stream is thin + static.** Beams and `c/W` particles are
   sparse and evenly spaced. The theater's spectacle comes from a *dense,
   swirling* particle galaxy; this doesn't yet hit "streams of glowing text
   rising."
5. **The book hologram is a touch flat.** It reads slightly fan-like. It needs
   a clearer 3D open-book volume (brighter `h` near-page highlight, darker `G`
   gutter/spine, a hint of page thickness) to match the dimensional glow of the
   greenhouse orb.
6. **The arched windows read as small portholes,** not the "tall arched glass
   reading windows" the blueprint calls for.

## Tweaks (concrete)
- Raise the wall height several rows + add a cornice/ridge so the base reads as
  a grand hall with real mass, matching the vertical bulk of the `_t5` bases.
- Add a small glowing dais/well (stepped `o/O`) on the roof as the visible
  *source* the light-stream rises from; fill the bare top with a skylight/ridge
  detail.
- Rebuild the roof glow as a tight, symmetric concentric core (`r→O→o`, or a
  clean upward flame) instead of the ragged starburst.
- Densify the rising stream: more `c/W` particles, denser near the roof source
  and thinning toward the book, with a subtle swirl — push it toward the
  theater's particle galaxy.
- Give the book explicit open-book shading: `h` highlight on near page edges,
  `G` in the spine gutter, a 1px page-thickness edge.
- Enlarge/heighten the front windows (tie into the taller walls) so they read
  as tall arched reading windows.
