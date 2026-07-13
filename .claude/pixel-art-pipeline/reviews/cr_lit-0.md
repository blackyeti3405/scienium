# Creative Review — Literature Review (gateway) · round 0

**Verdict: TWEAK** (strong, on-identity, palette-perfect — but not yet "spectacular"; the top roof face is bare and contrast is soft vs the _t5 north stars)

Render reviewed: `art/preview/literature_review_creative.png` (64×64, ×8)
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_literature_review.md`
Source: `art/src/literature_review_creative_generic.json`

## Palette gate — PASS
Verified programmatically against the source JSON. Every glyph in `rows` is one of
the 13 canonical chars `K W L M D d / h c g G / o O r` (plus `.`). No off-palette
hexes. Grid is a clean 64×64 (all rows correct width). `d` is declared-but-unused —
harmless. Recolor-safe. ✓

## What works (keep)
- **Floating open-book hologram hero reads instantly** as Literature Review. Two
  splayed pages of `h/c/g` teal, `G` outline, a lighter spine highlight, and —
  the best touch — pale horizontal **text-line dashes** across the pages that sell
  "pages of living knowledge." This is genuinely the catalog's dream for Lit Review.
- **Sparkle language matches _t5**: `cWc` diamond glints scattered around the book.
- **Warm focal core**: the orange `o/O/r` glow erupting from the roof center, plus
  orange arch-trim, gives the required warm counterpoint to the teal.
- **Front library facade**: tall arched glass reading windows (`h/c/g` glass, `o`
  arch) on both front faces — cohesive and on-theme.
- **Crisp iso + strong K silhouette**: the descending K base steps and outline are
  clean and match the _t5 house style.

## Why it's TWEAK, not SHIP (concrete fixes)
1. **The top roof face is a big flat pale-`L` diamond with almost no detail** — this
   is the biggest gap vs _t5 (biocore greenhouse / axiom theater rooftops are
   textured and structured). Right now it's an empty lavender plane with only the
   central orange burst. Add structure: a recessed inner-panel border (`M/D` inset
   lines) and/or radial skylight paneling or faint gold (`o`) seams fanning out from
   the central glow, so it reads as a grand library dome/skylight, not a blank lid.
2. **Wall value contrast is soft** — the body is dominated by pale `L/M`, so the form
   reads flat next to the punchy 3-value shading in _t5. Push the right/shadow face
   down into `D/d`, reserve `L/W` for the lit left face, so the massing pops.
3. **Book should glow, not just be teal** — it's slightly solid/cutout right now.
   Add a lighter `h→W` bloom core along the spine and a `g→G` falloff at the page
   bottoms so it emits light rather than reading as a flat teal shape. (Partly there;
   push it.)
4. **Side particle streams read a touch like tent guy-lines** — the two near-symmetric
   arcs from the roof corners up to the book are structural-feeling. Break them into
   clearly ascending, size-varied dotted `c/W/h` particles (tapering as they rise)
   so they clearly read as knowledge streaming up into the book, not cables.

Fix #1 and #2 are the ones that move it from "good and clearly themed" to
"spectacular." #3/#4 are polish.
