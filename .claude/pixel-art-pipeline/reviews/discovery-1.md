# Review — Discovery (gateway) · FIDELITY to `art_ref/mockups/discovery.png`

**Verdict: TWEAK**

Compared: reference `art_ref/mockups/discovery.png` vs render `art/preview/discovery_generic.png`.
Blueprint: `.claude/pixel-art-pipeline/blueprints/discovery.md` (IMAGE-MATCH mode).

## Base gates — PASS
- True 2:1 iso, front corner to viewer, roof plane visible.
- Crisp: clean K silhouette, no blur/AA/mush.
- On the generic palette (grays + teal glass + orange trim).
- Glass reads as glass (teal `h/c/g/G` windows + striped panel), not black-barred mullions.

## Silhouette — MATCH
Single cubic observatory hub, one story, front corner forward. This matches the drawing's massing — the reference is essentially one cube, not a stack of stepped volumes. No story-count problem. (Note: an earlier blueprint asked for a stepped annex; the current IMAGE-MATCH blueprint does not — the single cube is correct now.)

## Hero elements — 3 of 4 present
1. **Satellite dish (the hero)** — PRESENT and recognizable: left-back roof, tilted, feed-arm line across it. Minor: shaded like a solid sphere/ball (highlight top-left, dark underside) so it reads a touch like a ball rather than a concave parabolic disc. Flatten the shading and make the straight feed-arm cross the face so it reads unmistakably as a dish.
2. **Cylinder drum off the right roof edge** — PRESENT. Horizontal canister jutting from the upper-right with orange rings and a dotted round end cap. Faithful to the drawing.
3. **Solar / sensor panel** — PRESENT. Diagonal teal/green-striped glazing at the right-back of the roof; stripe read and color are right. Minor: it stands up as a raised vertical fin rather than lying as a flat tilted rectangle on the roof as drawn; tip it toward the roof plane.
4. **Greebled front-left face** — UNDER-DELIVERED. This is the miss that drives the TWEAK. The drawing's signature is a busy, crawling-with-equipment face; the render reads clean/tidy.

## Where it drifts from the drawing (the greebled face)
- **Ladder / pipe rig missing.** The drawing has a prominent vertical zig-zag ladder/pipe framework climbing the far-left corner — the most conspicuous greeble on that face. The render replaces it with a flat dark K strip holding three tiny square vents; it reads as a vent panel, not a ladder. Add an actual zig-zag/rung framework up the far-left corner (K struts with an orange/red accent).
- **Framed entry / porch missing.** The drawing has a small framed doorway/porch in the front-centre at the base. Absent in the render. Add a recessed K-framed entry low-centre on the lit face.
- **Red/orange conduit lines missing.** The drawing runs red/orange diagonal conduit lines across the faces in addition to the orange edge trim. The render only has the orange edge/base trim. Add a couple of `r`/`o` conduit runs diagonally across the front face(s).
- **Reads clean, not busy.** The blueprint explicitly says the building "should read *busy*, not clean." The current render is too tidy. The three additions above restore the busy-observatory density.

## Windows / accents — mostly OK
- 2 teal windows present (one per visible face) — near the low end of the drawn "2–3 small blue windows"; one more on the lit face would help.
- Orange edge + base trim present and placed like the drawing.
- Right-face square window present with orange trim near the base. (The drawing's purple/green tint is not achievable on the generic 13-char palette, so teal is the correct substitute — not a defect.)

## Concrete tweaks (toward the drawing)
1. Add the zig-zag ladder/pipe rig up the far-left corner of the lit face (K struts + orange/red accent); replace the flat vent strip. **Highest priority.**
2. Add a framed entry/porch (recessed K-framed doorway) low-centre on the front-left face.
3. Add 2–3 diagonal `r`/`o` conduit lines across the front faces for the busy density.
4. Tip the roof solar panel down to lie flatter on the roof plane (flat tilted rectangle, not a standing fin).
5. Flatten the dish's sphere shading and cross its face with the feed-arm so it reads as a parabolic disc, not a ball.
6. Optional: add one more small teal window on the lit face to hit the drawn 2–3 count.
