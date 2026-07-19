# Review — creative_pvp (round 0)

**Verdict: TWEAK**

## Palette (gate)
PASS. Source `art/src/pvp_creative_generic.json` uses only the 13 canonical chars
(`K W L M D d h c g G o O r`) plus `.` transparent. No off-palette chars — recolor-safe.

## What works (cohesive with the family)
- Right idiom: teal glass hologram hero + orange accents + projector beam + white
  sparkle language + iso base with teal crystal windows and orange trim. Sits in the
  same world as discovery / research_plan / operations_hub / literature_review.
- The **base genuinely lands** — arched teal-crystal windows read as a coliseum/arena,
  clean K outline on the left/right/bottom edges, orange top trim, an orange projector
  nub firing the beam, and the twin orange tournament flags on the back corners are a
  crisp, legible identity cue. This is the strongest part of the sprite.
- All blueprint elements are actually present in the emblem: crossed blades (rows 0–13,
  G-cored diagonals), a W clash-burst at the cross point (rows 13–15 `chWWWhc`), a g/G
  shield crest below (rows 16–27), and orange hilt/guard accents.

## Why it's a TWEAK (hero clarity below family bar)
The other four heroes read as one instantly-legible icon (atom, wireframe compass,
crystal, open book). The PvP emblem is busier and the "crossed swords" don't pop:
1. **Blade tips are thin/dotted.** Rows 0–2 are ~3px-per-blade dotted lines that fade
   into the background, so the blades read as lasers/wireframe lines, not swords.
2. **Top-corner clutter.** The blade tips merge into the wide dotted sparkle-diamond
   frame at the top, so the two shapes blur together and the X loses its silhouette.
3. **Crest is a speckle.** Rows 18–22 pack g/G/o/O/r into a noisy cluster; it reads as a
   decorative blob rather than a clean shield behind the cross.
4. Net effect: a cold viewer reads a wireframe star/compass emblem before "crossed
   swords." One sharpening pass gets it to the iconic clarity of the other four.

## Concrete fixes
- Solidify + point the blade tips: make each blade a continuous 2–3px band (G core, `h`
  glass edge, one `K`/`D` shadow edge) that tapers to a clean point with a single `W`
  glint at each tip. Kill the dotted gaps in rows 0–4. Keep both blades equal length and
  truly crossing (tips up-out, hilts down-out) so it's an unmistakable X.
- Separate the blades from the frame: thin the wide dotted diamond into discrete corner
  sparkles (the `+`/diamond sparkle motif used in discovery & research_plan) so the
  crossed swords own the focal point instead of competing with a full outline.
- Keep the W clash-burst but make it a small radiant starburst (a few `W` rays out of the
  cross point) so the "clash" reads as energy, matching the family's sparkle vocabulary.
- Calm the crest: fewer orange pixels in rows 20–22 — one clean orange chevron/device on a
  solid `g` shield with a `G` highlight and `K` outline, so it reads as a shield, not noise.
- Minor: the arena floor top surface (dark speckle grid) is slightly muddy; quiet it a
  touch so the beam origin and crest read cleanly.
