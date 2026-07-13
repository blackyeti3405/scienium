# Image-match review — discovery_generic (disc_densify-4)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`

## Verdict: TWEAK (close — hero props land, secondary features need polish)

## Palette check: PASS
Grid `art/src/discovery_generic.json` `rows` use only the 13 canonical chars
(K W L M D d / h c g G / o O r). Sprite pixels resolve to exactly the 13 canon
hex colors; the only 2 extra PNG colors are the preview's checkerboard backing,
not sprite art. No off-palette chars.

## Fidelity

### Silhouette / massing / footprint — PASS (primary gate)
Correct iso cube, two visible faces + roof, right footprint. The dominant
silhouette elements read: satellite dish top-left, drum tank upper-right,
orange roof + base trim. This matches the reference's core massing.

### Focal features
- **Satellite dish (hero): EXCELLENT.** Tilted parabolic dish top-left with the
  receiver feed arm crossing to a center dot + dark mount cluster at the base.
  Near-exact match to the reference. Best part of the sprite.
- **Cylindrical drum tank: GOOD.** Circular drum upper-right with orange banding
  reads clearly as the reference's protruding tank.
- **Orange trim (roof rhombus + base): GOOD.** Present on both edges, matches.
- **Teal windows: GOOD.** Left-face glass panes present.

### Gaps (the reasons for TWEAK)
1. **Left-front lattice/antenna tower reads as NOISE, not a truss.** The
   reference's most distinctive left-side feature is a cross-braced lattice
   tower (clear diagonals + red bracing) that breaks past the left silhouette.
   The render substitutes a cluster of scattered dark + stray white (W) pixels
   with no diagonal structure — it looks like static/dithering artifacts rather
   than crisp iso geometry. Hurts the "crisp iso" bar.
2. **Roof top-right skylight/solar panel MISSING.** Reference has an angled
   rectangular teal grid panel set into the roof there; the render only has thin
   antenna whips. The whips are a fine observatory touch but the panel is the
   reference's actual feature and is absent.
3. **Bottom-right spectrometer window is plain teal.** Reference draws a
   prismatic / rainbow-striped readout (purple-green-orange). Palette has no
   rainbow, but the render makes it identical to the left glass pane, losing the
   "spectral display" distinction.
4. **(minor) Diagonal support strut on the right face** (tank → base in the
   reference) is absent. Low priority.

## Concrete tweaks
- Rework the left-front tower into a legible iso truss: clean K diagonal
  cross-braces with o/O (and r for the red bracing) accents, extending one or
  two px past the left silhouette edge. Delete the isolated stray W specks that
  read as noise.
- Add the tilted rectangular skylight panel to the roof top-right: a small g/G
  glass grid with K mullions on the roof plane (keep one antenna whip if wanted,
  but add the panel).
- Differentiate the bottom-right window into a spectral readout: vertical stripe
  banding using h/c/g/G columns plus one o/O stripe, so it doesn't read the same
  as the left glass.
- Optional: add a short D/d diagonal strut on the right face under the tank.
