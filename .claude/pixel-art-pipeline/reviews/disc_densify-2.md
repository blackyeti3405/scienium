# Discovery gateway — fidelity review (disc_densify round 2)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`
Source: `art/src/discovery_generic.json` (built by `art/gateways/build_discovery.py`)

**Verdict: TWEAK** — near-ship. Round-1's headline asks partially landed: a roof
skylight is now present, the body reads as one cube (the two-block split is gone),
and the orange trim wraps cleanly. What holds it back is the same class of problem
one level down: both roof heroes read as smooth **convex lumps** instead of a
**concave dish** + **banded cylinder tank**, and the new skylight is a floating gem
rather than the drawing's rectangular glazing panel. All three are targeted shading
fixes, not a rebuild.

## Palette check — PASS
Grid uses only `K W L M D d h c g G o r` (+ `.` transparent), all inside the 13
canonical chars. `O` is declared but unused (harmless). No off-palette glyphs
(verified programmatically over every cell).

## Silhouette / massing — mostly fixed
- Chunky observatory cube, front corner to the viewer, both roof planes visible,
  dish on the left-back roof, sensor pod on the right roof edge. True 2:1 iso, crisp
  K outline, orange eave + base bands wrap the front/left/right. Good base gates.
- **Two-block split is resolved.** The deep front seam from rounds 0–1 is gone; the
  left face (louvers + doorway) and right face (window) now meet at one near vertical
  corner and read as a single stepped volume. This was the round-1 massing ask — done.

## Why it's still a TWEAK (focal-feature shape gaps vs. the drawing)
1. **Dish reads convex (egg/boulder), not concave (a bowl you look into).** The
   interior is a single smooth W→M→D gradient with the highlight on the *upper-left*,
   which is exactly how you'd shade a solid convex egg — so the hero reads as a stone
   lump, not the drawing's tilted parabolic dish. The drawing clearly shows the
   concave face (rim ring + a feed strut crossing to a center node). There's a K
   feed-line, but no rim ring and no concave shading, so the dish silhouette doesn't
   land. The K outline is also lumpy/stair-stepped on the upper arc (carried from
   round 1) instead of a crisp ellipse.
2. **Right hero reads as a featureless grey blob, not a banded cylinder tank.** In the
   drawing it's a bold cylinder/silo protruding from the *upper-right face* with a
   rounded cap and an orange band ring. The render's pod is a soft convex lump sitting
   on the roof with no banding, no cap seam, no orange ring — same convex-lump problem
   as the dish.
3. **Roof skylight is a floating gem, not a glazing panel.** Round 1 asked for the
   drawing's green/teal striped roof window; what landed is a small 4-point teal
   diamond (`g/G/c/h`) sitting proud of the roof. It reads as a loose gem rather than
   a flush rectangular skylight, so the roof still looks emptier/less architectural
   than the reference.

## Kept wins (do not regress)
- Left face is legibly busy: vertical louver strip + teal window + K doorway recess.
- Right-face teal window with orange frame is well placed (drawing's striped window;
  teal is correct for the generic base, recolor tints per skin).
- Orange trim coverage on eaves + all three base bands.

## Concrete fixes (toward the drawing)
- **Make the dish concave.** Draw a full elliptical K rim ring around the disc, then
  *invert* the interior shading: shadow (`D`/`d`) tucked under the upper rim, highlight
  (`W`/`h`) on the **lower-inner** curve, so it reads as a bowl catching light from
  above. Keep the K feed-arm and add a 1–2px feed node at its focus. Clean the upper
  K arc to a crisp ellipse (kill the stair-step bump). Optionally tilt it a hair more
  up-left so it faces the sky like the drawing.
- **Rebuild the right pod as a banded cylinder tank.** Short cylinder seated on the
  right roof edge / upper-right face: rounded cap with a W highlight, a K seam under
  the cap, and 1–2 dark/orange band rings around the barrel. An orange band ring is
  what sells it against the drawing.
- **Turn the roof gem into a skylight panel.** Replace the 4-point diamond with a flat
  rectangular glass panel on the roof plane — teal `g`/`G` fill, 1px K frame, one or
  two K mullion lines — sitting flush like the drawing's striped roof window.
- *(optional, low priority)* Hint the drawing's external zig-zag lattice tower at the
  bottom-left with a couple of diagonal K struts over the louvers, and add a light
  front-face frame line — both add density but neither blocks ship.

Bottom line: massing and the roof-skylight-presence asks from round 1 are handled;
what remains is re-shading the two convex lumps into a concave dish + a banded tank
and flattening the gem into a panel. Three focused edits from ship.
