# Review — Discovery (gateway) · round 0 (IMAGE-MATCH redo)

**Reference:** `art_ref/mockups/discovery.png`
**Render:** `art/preview/discovery_generic.png`
**Builder:** `art/gateways/build_discovery.py`
**Verdict: TWEAK**

## Base gates (pass)
- True 2:1 iso, cubic mass, front corner to viewer — matches the drawing's stance. ✓
- Roof visible in 3/4 top-down; roof-edge orange trim present. ✓
- Crisp: clean single-pixel K outline, no blur / AA / mush. ✓
- On the generic palette (purples / oranges / teals); no off-palette strays. ✓
- Glass reads as glass — the solar panel and windows carry highlight→mid→shadow
  banding under a light frame, not black-barred glazing. ✓

## Fidelity to the drawing
Silhouette and two of the four hero elements land, but the building's *defining
character* — a busy, greebled observatory — is softened. The render reads noticeably
**cleaner** than the drawing, so it drifts toward "tidy little cube with a dish" rather
than the crawling-with-equipment hub in the reference.

**Present and faithful (keep):**
- **Satellite dish** (priority 1): unmistakable, left-back, tilted disc with a straight
  feed-arm across it on a neck mount. This is the hero and it reads instantly. (Could sit
  a touch larger — in the drawing it's the single biggest element — but acceptable.)
- **Solar / sensor panel** (priority 3): tilted rectangle, right-back, diagonal-stripe
  cyan glazing. Matches the drawing well.
- Orange roof-edge trim and orange base band present on both lit faces. ✓

**Weak / missing (why this is a TWEAK):**
1. **Sensor drum (priority 2) is underdone.** In the drawing a horizontal *canister*
   juts off the upper-right roof edge, banded with two bold orange rings. The render has
   only a small round pod / porthole with a thin orange arc at the roof edge — it reads
   as a hole or button on the roof, not a cylinder projecting outward. This is a named
   hero element and it's the weakest part of the sprite.
2. **Front-left face lost most of its greebling (priority 4).** The drawing's lit face is
   *crawling*: a vertical zig-zag ladder/pipe rig up the far-left corner, diagonal
   red/orange conduit lines, and a framed entry/porch in the front-centre — plus the
   windows. The render keeps the windows + orange band and a small stacked-square greeble
   on the left, but the **conduit lines are absent, the entry/porch is absent,** and the
   left-corner greeble reads as tiny window frames, not a ladder rig. The "busy
   observatory" density the blueprint explicitly calls for is missing.
3. **Window tints don't differentiate.** Drawing: front windows blue, right-face window
   purple/green. Render: everything is the same teal. Minor, but it flattens the read.
4. Dish base is missing the tiny antenna tufts shown at the mount in the drawing. Minor.

## Concrete fixes (toward the drawing)
- **Rebuild the drum as a real jutting cylinder** (in `build_discovery.py`). Use the
  isobuild `cylinder`, wider than tall, projecting off the upper-right roof edge with a
  clean K outline and **two full orange (`o`/`r`) rings** wrapping the barrel. Make it
  unmistakably a canister, not a porthole.
- **Add the front-centre entry/porch** — a small framed doorway (K frame, one-shade-
  darker recess) at the base where the two lit faces meet at the front corner.
- **Add 1–2 diagonal conduit lines** in `r #d9641f` running along the iso diagonal across
  the front-left lit face, to restore the greebled "busy" read.
- **Make the far-left corner a ladder/pipe rig** — a vertical K zig-zag / rung framework
  up the corner, replacing the current stacked-square greeble.
- **Differentiate glass:** keep the front windows blue/cyan; tint the right-face window
  purple/green (`M`/`d` + `g`/`G`) to match the drawing. Add a few K pixels of antenna
  tufts at the dish base.

Fix items 1 and 2 and this ships.
