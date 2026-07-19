# Blueprint — Discovery (gateway) · IMAGE-MATCH mode

**Reference (Read this FIRST, match it): `art_ref/mockups/discovery.png`**
Job = faithfully translate the drawing to a 64×64 iso sprite. Do not invent.

## What the drawing shows (transcription)
A busy cubic observatory hub, front corner to viewer, crawling with equipment.
- **Roof — three things:**
  1. **Big satellite DISH**, left-back: a large tilted parabolic disc with a straight feed-arm across it, on a small mount; tiny antenna tufts at its base. This is the biggest single element — the hero.
  2. **Diagonal solar / sensor PANEL**, right-back: a tilted rectangle of blue/green diagonal-stripe glazing.
  3. **Orange trim** along the roof edges.
- **Right (shaded) face:** a **cylindrical sensor DRUM/POD juts out** of the upper-right roof edge — a horizontal canister with **orange rings**. Lower on the right face: a **square window** (purple/green tint) with orange trim near the base.
- **Front-left (lit) face — greebled:** a **ladder/pipe rig** up the far-left corner (vertical zig-zag framework); **2–3 small blue windows**; **red/orange conduit lines** running diagonally; a **framed entry/porch** in the front-centre (small doorway with a frame). **Orange trim band** along the base.
- **Focal point:** the satellite dish, plus the overall greebled density (this building should read *busy*, not clean).

## Translate to 64×64 (priorities, in order)
1. Satellite dish unmistakable on the roof. 2. Cylinder drum jutting off the right face with orange rings. 3. Solar panel on the roof. 4. Greebled front face: ladder + a couple blue windows + the entry + orange base band. Simplify counts to fit 64px, but keep the *busy observatory* read.

## Palette (generic — canon.py), paths, method
Chars→hex: `K #241f38` · `W #e2dcf0 L #cdc6e2 M #b0a6ca D #897ea6 d #6f6592` · `h #d2f7f4 c #a0efea g #41d2d0 G #23808b` · `o #ff9243 O #ffc089 r #d9641f`. Use ONLY these 13 chars (recolor-safe).
Author `art/gateways/build_discovery.py` (isobuild `Box`/`cylinder`; `Box.window` for glass, `Box.louver` for vents; NOT `iso.draw_cube`). Emit `art/src/discovery_generic.json` (64×64) → render `apps/web/public/sprites/gateways/discovery_generic.png` + `art/preview/discovery_generic.png` with `art/.venv/bin/python3`. Do NOT run `art/iso.py`.

## Review = fidelity to `art_ref/mockups/discovery.png`
Silhouette + all four hero elements present (dish, drum, solar panel, greebled face), accents placed like the drawing, crisp iso, on-palette.
