# Image-match review — discovery_generic (disc_densify-5)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`
Source grid: `art/src/discovery_generic.json` (64×64)

## Verdict: TWEAK (one blocker left — otherwise ship-quality)

## Palette check: PASS
`rows` uses only the 13 canonical chars (K W L M D d / h c g G / o O r) plus `.`
transparent. Chars present: `. D G K L M O W c d g h o r`. No off-palette
characters.

## Fidelity

### Silhouette / massing / footprint — PASS (primary gate)
Correct iso cube with two visible faces + roof and the right footprint. Dominant
silhouette reads exactly like the reference: overhanging dish top-left, drum tank
upper-right, antenna whips, orange roof-rhombus + base trim. Crisp iso edges.

### Focal features
- **Satellite dish (hero): EXCELLENT.** Tilted parabola top-left, feed arm to a
  center dot, dark mount cluster at the base. Near-exact to the reference.
- **Drum tank (upper-right): GOOD.** Clean circular tank with orange banding,
  protruding off the right roof edge as in the reference.
- **Bottom-right spectral window: EXCELLENT (fixed from round 4).** Now a true
  prismatic readout — vertical o/O + W/h + c/g stripe banding. Clearly distinct
  from the plain left glass and matches the reference's rainbow window.
- **Left-face glass + lattice: GOOD (improved).** Upper teal pane is clean; the
  left-front tower now has legible vertical members, horizontal rungs and orange
  accents instead of round-4's pure static. A few stray W specks on the lower-left
  still read slightly noisy but no longer as dithering.
- **Antenna whips + orange trim: GOOD.**

### Remaining gap (the reason for TWEAK)
1. **Roof skylight still reads as NOISE, not a panel.** The reference's roof
   top-center feature is a framed teal skylight/solar grid. The render places a
   scattered cluster of loose h/c/g pixels there with no frame or rectangular
   footprint — it looks like debris/artifacts dropped on the roof, which is the
   one spot that breaks the "crisp iso" bar. This was flagged in round 4 and is
   the last unresolved item.

## Concrete tweaks
- Rebuild the roof teal cluster into a clean, tilted rectangular skylight on the
  roof plane: a solid c/g glass fill with a 1px K mullion frame (optionally one
  interior K divider), aligned to the iso roof grid. Delete the loose scattered
  teal pixels so it reads as one designed panel, not confetti.
- (minor) Trim the 2–3 stray W specks on the lower-left truss so they read as
  intentional highlights rather than noise.
