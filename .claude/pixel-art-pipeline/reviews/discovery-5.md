# Discovery gateway — fidelity review (round 5)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`

**Verdict: TWEAK** (near-ship — three hero roof elements land; one named front-face feature does not)

## What matches the drawing (keep)
- **Silhouette**: single cubic observatory mass, front corner to viewer, roof plane visible. Matches the drawing's single-volume cube. No wrong story count.
- **Satellite dish (hero #1)**: unmistakable. Large tilted parabolic disc, straight feed-arm across it, small mount, left-back on the roof. Reads exactly as the drawing's biggest element. 
- **Sensor drum (hero #2)**: cylindrical pod juts off the upper-right roof edge with orange rings and a riveted/dotted round end-cap facing the viewer. Faithful to the drawing's drum, including position and orange banding.
- **Solar/sensor panel (hero #3)**: tilted diagonal-stripe glazing on the roof, right-back next to the drum. Reads as glass, correct color family, correct placement.
- **Accents**: orange roof-edge trim, orange base band, and orange conduit down toward the base are all present and placed like the drawing. Two teal windows on the lit face + a tinted window on the right face near the base with orange trim. Front-centre entry is present.
- **Base gates**: true 2:1 iso, front corner forward, roof visible, on the generic palette (lavender body / orange trim / teal glass), glass reads as glass, and the main box outline is a clean crisp K line with no blur/AA on the primary forms.

## Why it's a TWEAK (fidelity gaps vs. the drawing)
1. **Ladder / pipe rig is not legible (primary miss).** In the drawing the far-left corner carries a big, prominent zig-zag ladder/truss framework spanning roof-to-base — after the dish it's the most distinctive front-face element and it's what makes the building read *busy*. In the render it has been replaced by a fringe of short horizontal dark tufts stuck along the left edge. Those tufts read as **noise on the silhouette**, not as a structured ladder — so a named feature is effectively missing AND the left outline loses crispness (mush on the K edge). This is the one thing that keeps it from shipping.
2. **Front-left face reads cleaner/emptier than the "busy observatory" reference.** Consequence of #1 — with the ladder gone the lit face is mostly flat body + two small windows, versus the drawing's dense greebling (ladder + windows + diagonal red/orange conduit).
3. **Minor — solar panel framing.** The panel floats as a bare rhombus; the drawing frames it with a dark border on all sides and sits it flatter on the roof plane. A one-pixel K frame would tighten it.
4. **Minor — right-face window tint.** Drawing shows a purple/green tinted window; render is teal. Cosmetic only.

## Concrete fixes (toward the drawing)
- Replace the horizontal tuft-fringe on the far-left corner with a **legible vertical zig-zag ladder/pipe truss**: a couple of vertical K rails with short diagonal K rungs between them, running from just under the roof edge down to the orange base band. Make it read as structure, not fringe, and keep it inside the silhouette so the left K outline stays crisp.
- Once the ladder is a real element, add **one diagonal red/orange conduit line** crossing the lit face (drawing has a red run from the upper window down toward the base) to restore the busy density.
- Give the roof **solar panel a 1px dark K frame** and seat it flat on the roof plane rather than floating.
- Optional: shift the right-face window tint from teal toward the drawing's purple/green.

Everything else is faithful — this is a one-feature redo (make the ladder real), not a rebuild.
