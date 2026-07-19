# Creative review — Operations Hub (round 0)

**Verdict: TWEAK** (close — the hero lands, the base under-delivers on the _t5 bar)

Render: `art/preview/operations_hub_creative.png`
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_operations_hub.md`

## Palette — PASS (recolor-safe)
Source `art/src/operations_hub_creative_generic.json` uses ONLY the 13 canonical chars
(`D G K L M O W c d g h o r`) in both the palette map and all 64×64 pixel rows.
No off-palette characters. `/` (separator) is correctly absent. Not a TWEAK cause.

## What works (spectacular + on-identity)
- **Hero radar globe is genuinely spectacular.** Teal `h/c/g/G` sphere with `c/g`
  data-noise texture reads as a wireframe/hologram; `W` blip sparkles scatter inside
  and around it; a teal projection beam rises from the roof dish into it. Glowing rim
  (no hard `K` outline on the hologram) is the correct call for a projected globe.
- **Reads unmistakably as mission control / operations hub** — radar globe + orange
  orbit ring + front control screens + console bank = clear gateway identity.
- **Orange `o/O/r` console/hazard trim** along the roof rim and the teal `g/c` glowing
  screens on the front-left face are cohesive with the teal+orange theme.
- Iso projection is crisp; the base silhouette carries a clean navy `K` outline.

## Why TWEAK — the base doesn't reach the _t5 density bar
The north star is _t5 economy buildings (`volt_lab_robotics-bay_t5`,
`terrabase_deep-earth-observatory_t5`), which are dense and greebled. The globe matches
that ambition; the base does not yet.

1. **Empty roof.** The roof is one large flat lavender quad — no vents, panel seams,
   hazard stripe, or greebles. Next to _t5's detailed roofs it reads bare.
2. **Antenna masts read as floating poles.** Both masts meet the roof with no base
   plate/foot; the right one is a plain thick navy bar that visually splits the roof.
3. **Plain single box.** The base is one squat volume with no secondary massing —
   less structural richness than the _t5 references.
4. **Orange orbit ring blobs in front.** The front arc thickens into a solid horizontal
   band that reads like a puddle rather than a clean ellipse, slightly cheapening the hero.
5. **Front console is loose.** The right-face indicator lights scatter along a diagonal
   rather than forming an even, organized row/bank.

## Concrete tweaks
- Greeble the roof to _t5 density: add panel seams, 1–2 `Box.louver` vents, a short
  `o/r` hazard stripe, and give each mast a small base plate/foot so they read as mounted.
- Slim the right mast (or turn it into a detailed antenna/dish) so it stops reading as a
  bare navy bar bisecting the roof.
- Thin the globe's orange orbit ring to a consistent 1–2px ellipse; keep a visible back
  arc behind the sphere for depth instead of the thick front band.
- Add one small secondary volume/equipment block to the base for _t5-style massing.
- Tidy the front into a 2–3 screen bank with consistent orange framing and align the
  indicator lights into an even row.
