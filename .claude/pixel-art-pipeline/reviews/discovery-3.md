# Review — Discovery (gateway) · round 3

**Reference:** `art_ref/mockups/discovery.png`
**Render:** `art/preview/discovery_generic.png`
**Verdict: TWEAK**

## Verdict rationale
This reads as the *same* observatory as the drawing — the dish + drum + solar panel
trio makes the building unmistakable, so it does NOT fail the "different building"
test. But the fourth hero element from the blueprint — the **greebled front face** —
is only half-delivered. Two named per-face features are absent and the front-left
face reads noticeably cleaner than the busy drawing. That is a fidelity gap on a redo,
so it's a TWEAK rather than a SHIP.

## Base gates — all PASS
- True 2:1 iso, front corner to viewer: yes.
- Roof visible with all roof equipment: yes.
- Crisp, no blur/AA/mush, clean K outline: yes (checked at 12× on the left face — clean pixels).
- Generic palette (lavender walls / orange trim / teal glass): yes.
- Glass reads as glass: teal windows have highlights; solar panel reads as striped glazing.

## Hero-element checklist vs. the drawing
1. **Satellite DISH (the hero)** — PRESENT and excellent. Large tilted parabolic disc,
   left-back on the roof, with a straight diagonal feed-arm and a feed dot. Silhouette
   and placement match the drawing well. Tiny antenna tufts at the base are there.
2. **Cylindrical DRUM/POD with orange rings** — PRESENT and good. Horizontal canister
   juts off the upper-right roof edge, orange rings, dotted aperture end-cap. Faithful.
3. **Diagonal solar/sensor PANEL** — PRESENT and good. Tilted teal/green diagonal-stripe
   rectangle, right-back on the roof. Matches.
4. **Orange roof trim** — PRESENT along the roof edges and base band. Matches.
5. **Greebled front-left face** — PARTIAL. Present: 2 teal windows + orange conduit +
   orange base band. **Missing:** the ladder/scaffold and the entry/porch (see below).

## What still diverges from the drawing (fix these)
- **Ladder / pipe rig is MISSING.** The drawing's most distinctive front-face greeble is
  a tall vertical zig-zag scaffold/ladder tower climbing the *far-left corner* (it even
  spills below the corner). The render has only orange corner trim there — no ladder at
  all. This is the single biggest miss and the top item under blueprint priority #4.
- **Framed entry/porch is MISSING.** The drawing has a small framed doorway/porch in the
  front-centre (near the bottom corner) with visible frame lines. The render's front
  corner is bare except for the base band — no doorway.
- **Front face reads too CLEAN.** Blueprint says this building "should read *busy*, not
  clean." With the ladder and entry gone, the front-left face is sparse (2 windows +
  lines) versus the dense drawing. It needs more greeble density.
- **No distinct red conduit.** The drawing uses separate red/dark-red diagonal conduit
  lines in addition to the orange. The render only uses orange (`o`). Use `r #d9641f`
  for a couple of diagonal conduit runs so the red reads as its own layer.
- **Right-face window (minor).** Drawing puts a square, purple/green-tinted window LOW on
  the right face with orange trim near the base. Render's right-face window is teal and
  sits high. Lower it and it's fine (tint is a nitpick given the 13-char palette).

## Concrete fixes (toward the drawing)
1. Add a K-outlined vertical **ladder/scaffold** up the far-left vertical corner — a
   zig-zag framework with 3–4 rungs, a few `d`/`D` struts, optionally poking a pixel or
   two below the corner. This is the priority fix; it restores the hero "greebled" read.
2. Add a small **framed entry/porch** on the front-left face near the bottom corner — a
   doorway recess (darker `d`/`K` fill) with a `K` frame and an `o` lintel.
3. Add **1 more small window** and **2 diagonal `r` conduit lines** on the front-left face
   to raise density and match the drawing's busyness; keep `o` for trim only.
4. Drop the right-face window lower and (optional) nudge its tint toward purple/green.
