# Discovery gateway — fidelity review (disc_densify round 0)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`
Source: `art/src/discovery_generic.json` (built by `art/gateways/build_discovery.py`)

**Verdict: TWEAK** — and note this is a *regression* from review round 5. The
densify pass muddied the left face slightly but, more importantly, both hero roof
elements no longer read as science equipment: the dish now reads as a flat
spoon/paddle and the observatory reads as a mixing bowl with a stir-stick.

## Palette check — PASS
Grid uses only `K W L M D d h g G o r` (plus `.` transparent) — all inside the 13
canonical chars. No off-palette glyphs.

## Silhouette / massing
- L-shaped footprint with a front-corner notch is present and directionally right
  vs the drawing. **But** the notch is cut too deep, so the right arm reads as a
  *detached tall tower* rather than part of the drawing's single chunky cube. The
  drawing is one unified volume with a shallow front step; the render splits into
  two blocks.
- True 2:1 iso, front corner to viewer, roof plane visible, crisp K box outline on
  the main mass — those base gates are fine.

## Why it's a TWEAK (focal-feature failures — automatic TWEAK)
1. **Satellite dish reads as a spoon/paddle (hero #1 broken).** It is now a flat
   lavender oval on a thin stem — no rim ring, no concave interior shading, no
   feed-arm across the face, no mount. Round 5 had a legible tilted parabolic disc
   with a feed strut; that read has been lost. This is the single biggest miss.
2. **Observatory dome + telescope reads as a bowl + stir-stick (hero #2 broken).**
   The dome is too shallow (a round pot), and the telescope is a 1px rod with an
   orange tip poking up-right — together they read as a kitchen mixing bowl, not the
   drawing's horizontal sensor drum (banded cylinder + domed end-cap) or an
   observatory dome. Round 5's banded drum read is gone.
3. **Accent windows are missing — the building reads empty, not "busy observatory."**
   The drawing is dense with glazing: a green roof skylight, blue windows on the lit
   left face, and a purple/green striped window low on the right face. The render has
   none of those except the compressed teal greeble bottom-left. Outside that corner
   the two big faces are bare lavender.
4. **Left-face greeble still reads as a dark smudge, not structure (carried over from
   round 5).** The densify added teal strips + orange flecks in a cramped dark
   cluster; it does not resolve into the drawing's tall zig-zag ladder/truss. Low
   contrast makes it read as noise on the silhouette.
5. **Orange trim is under-covered.** Bright orange eaves on the two top roof edges are
   good, but the drawing wraps orange base bands around the front and right faces too;
   the render only carries orange on the top edges + a little at the base-left corner.

## Concrete fixes (toward the drawing)
- **Rebuild the dish so it reads as a dish:** elliptical K rim ring all the way
  around; concave interior with a W highlight on the upper-inner curve grading to
  M/D shadow on the lower-inner curve; a straight K feed-arm crossing the face to a
  small feed node at the focus; a small K mount/tripod where it meets the roof.
  Restore round 5's parabolic read.
- **Rebuild the right hero as the drawing's sensor drum** (preferred): a horizontal
  cylinder seated on the right roof edge with 2–3 dark banding rings and a riveted
  domed end-cap facing the viewer. If keeping the dome, make it a deeper hemisphere
  with a base drum ring, and thicken the telescope into a real barrel + yoke mount so
  it stops reading as a stir-stick.
- **Add the missing glazing** with the existing `wall_win` helper: a roof skylight
  panel on the right roof plane (teal `g`, 1px K frame) and one window low on the
  right/front face (the drawing's striped window). Generic palette = teal glass;
  recolor handles per-skin tint.
- **Make the left greeble a real ladder/truss:** two vertical K rails with short
  diagonal K rungs from under the roof edge to the base band, plus one clean teal
  window and one diagonal orange conduit line. Raise contrast with `h` highlights so
  it reads as structure, not a blob. Keep it inside the silhouette so the left K edge
  stays crisp.
- **Extend orange base bands** along the right and front-notch edges to match the
  drawing's wraparound trim.
- **Shallow out the front notch** (raise the connecting roof) so the two arms read as
  one cube instead of a detached tower.

Bottom line: the two roof heroes both misread as kitchenware and the faces went
bare — this needs the dish and drum/dome rebuilt (round-5 quality) plus the glazing
restored, not just a left-face densify.
