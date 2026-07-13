# Creative Review — Showcase gateway (creative_showcase) · Round 1

**Verdict: TWEAK** (close to SHIP — palette is perfect; one concrete geometry blemish)

## Palette check — PASS (recolor-safe)
Programmatically counted colors in `art/preview/showcase_creative.png`: 14 distinct =
the preview background `(210,210,218)` + exactly the **13 canonical chars**
`K W L M D d h c g G o O r`, every hex matching `art/canon.py`. **Zero off-palette
colors.** Teal `h/c/g/G` = star/rings/beam/windows; orange `o/O/r` = beacon, signal
rings, cornice trim, flags; `W` = sparkles; `L/M/D/d` = walls. Fully recolor-safe.

## Spectacular + cohesive — YES
Reads as its own identity — a **broadcast-beacon showcase gallery**: a clean glowing
teal **star** hero, an orange **signal-ring halo**, a teal **beam** down to a roof
beacon, `W` sparkles, orange cornice + teal glowing windows, and two **pennant flags**
that nicely signal "science-fair showcase." Sits squarely in the family visual language
of the other four creatives (glowing teal hologram hero + beam + orange accents +
sparkles). Iso is crisp; K outline is clean across the building and the star.

## The one blocker (concrete)
**The orange front near-corner post protrudes below the building base into the ground
shadow.** Native-res sampling shows the `o/r` corner column running down through rows
54–61, straight through the K shadow band — a dangling ~2px orange stub past the
footprint. The other four creatives all have clean iso footprints; this stub breaks the
clean base silhouette.

## Softer polish (not blockers)
- The full-height solid-orange near corner is heavier than the family's lighter
  cornice/edge-accent use of orange. Consider orange-as-trim + K corner outline.
- The roof deck is fairly empty next to the busier roofs of the other four; a small
  vent/skylight or a couple `c/g` glow tiles near the beacon would enrich it.
- The dark-teal `G` glyph inside the star reads a touch like a letter "A"/figure rather
  than pure star facet shading — simplify so it reads as the star's interior shading.

## Fixes
1. Terminate the orange front-corner post at the base — remove the orange pixels below
   the footprint so the iso base reads clean (match the other four).
2. (Polish) Lighten the near corner to cornice-accent + K outline, not a solid column.
3. (Polish) Add a small detail to the empty roof deck near the beacon.
4. (Optional) Simplify the `G` shape inside the star to read as facet shading.
