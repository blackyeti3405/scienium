# Review — Discovery (gateway) · Round 2 · FIDELITY to `art_ref/mockups/discovery.png`

**Verdict: TWEAK**

Graded directly against the reference drawing (IMAGE-MATCH mode, per the current blueprint), not the
older generic "not-a-cube" criteria. Two of the four named hero elements are wrong or missing, and the
render loses the crowded, greebled "busy observatory" character that is the whole point of the drawing.
As it stands it reads as a *clean* lavender cube with a pearl on top and a gem beside it — a calmer,
different building than the equipment-crawling hub in the reference.

## Base gates
- True 2:1 iso, front corner to viewer, roof visible: PASS.
- On the generic palette (lavenders / teal glass / orange trim): PASS.
- Crisp K outline: mostly PASS on the box; the **rooftop dish is the weak spot** — its edges read
  soft and pebble-like rather than a clean stepped ellipse.
- Glass reads as glass: PASS (teal windows with reflection streak).

## Hero-element checklist (blueprint priority order)
1. **Satellite DISH — PARTIAL / weak.** In the drawing this is the single BIGGEST element: a large,
   flat, tilted **parabolic disc** with a straight feed-arm laid across it, on a small mount, with tiny
   antenna tufts at the base. In the render it reads as a rounded, segmented **orb / pearl** (two lobes
   split by one diagonal line), not a dish. The parabolic-disc silhouette, the mount, and the tufts are
   absent, so the most identifying element of the drawing does not land.
2. **Cylinder DRUM — GOOD.** Horizontal canister jutting off the upper-right roof edge with an orange
   ring/cap. Matches the drawing. Keep.
3. **Solar / sensor PANEL — MISSING (replaced by an invented object).** The drawing's right-back roof
   carries a tilted rectangle of blue/green **diagonal-stripe glazing**. The render instead drops an
   irregular **teal crystal / gem cluster** onto the roof centre. That is not in the reference and reads
   as a completely different feature (an ice/gem formation), not a striped solar panel. This alone is an
   automatic TWEAK — it reads as a different building's part.
4. **Greebled front-left face — LARGELY MISSING.** The drawing's lit face is crowded: a vertical
   zig-zag **ladder/pipe rig** up the far-left corner, diagonal **red/orange conduit lines**, and a
   framed **entry/porch** in the front-centre — plus the orange base band. The render keeps only the
   orange base band and a couple of teal windows; the ladder, the conduits, and the entry are all gone.
   The face reads clean and empty, so the busy-observatory density (explicitly the focal quality per the
   blueprint) is lost.

## Net
Elements 1, 3, and 4 diverge from the drawing; only the drum and the orange roof/base trim are faithful.
The gross silhouette (cube + roof clutter + drum) is broadly right, but the specific features are either
substituted (crystal-for-panel) or dropped (dish clarity, front-face greebling). This is a redo-worthy miss.

## Concrete fixes (move it toward the drawing)
1. **Delete the teal crystal blob** on the roof. In its place, on the **right-back of the roof**, draw the
   tilted **solar/sensor panel**: a parallelogram (iso-tilted rectangle) with a thin 1px K frame, filled
   with `g/G/c` **diagonal stripes** so it reads as striped glazing — not a gem.
2. **Redraw the dish as a dish, and make it the biggest element.** A flatter, tilted **elliptical
   parabolic disc** (light `L/W` concave face, clean 1px K rim, `D` shading toward the rim), a single
   straight **K feed-arm** across the face, a small `D/d` **mount** under it, and 2–3 tiny K **antenna
   tufts** at its base. Lose the two-lobe "pearl" read and the soft edges.
3. **Greeble the front-left face.** Add a vertical **zig-zag ladder/pipe rig** up the far-left corner
   (K frame with `O` highlights); add 1–2 diagonal **red/orange conduit lines** (`r`/`o`) crossing the
   face; add a small **framed entry/porch** in the front-centre (K-outlined doorway). Keep the existing
   orange base band and blue windows.
4. **Keep** the cylinder drum with its orange ring and the orange roof-edge trim — those already match.
5. Tighten the roof dish/panel edges to clean stepped pixels (no soft AA-looking mid-tone mush).
