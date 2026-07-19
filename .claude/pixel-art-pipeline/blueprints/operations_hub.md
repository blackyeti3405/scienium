# Blueprint — Operations Hub (gateway) · IMAGE-MATCH mode

**Reference (Read FIRST, match it): `art_ref/mockups/operations_hub.png`**

## What the drawing shows (transcription)
A **two-story control center**, wider than tall.
- **Roof / upper:**
  1. **BIG TILTED CONTROL SCREEN** on the front-left roof — a large rectangle with a thick **ORANGE frame**, angled like a drafting screen, a small **arrow/cursor** mark on it. **THE HERO.**
  2. A **green-striped window/vent** panel on the right roof (rectangle, green diagonal stripes).
  3. Two small **PERISCOPE / antenna** shapes (little "9"/lollipop loops) poking up on the left-back.
- **Upper front face:** a prominent diagonal **ORANGE HAZARD-STRIPE band** (caution slashes) across the front; a small framed **square hatch** front-centre.
- **Right (shaded) face:** an **OPERATOR / camera figure** — an orange stick-figure with a round head (a person or a camera-on-tripod), with orange accents.
- **Lower level:** a base story with a wide dark **WINDOW** (blue/purple tint) on the front-left, and a framed **DOORWAY** on the front-right. Orange trim.
- **Focal point:** the big orange-framed tilted control screen (with the periscopes + hazard stripes reinforcing "mission control"). Note "0 = teal" → teal accent.

## Translate to 64×64 (priorities)
1. Wide **two-story** control block. 2. The **big orange-framed tilted control screen** on the roof — the hero, with a cursor mark. 3. **Orange hazard-stripe band** across the upper front. 4. **Periscope antennae** poking up. 5. Green roof vent; operator figure on the right; lower window + door.

## Palette, paths, method
Chars→hex: `K #241f38` · `W #e2dcf0 L #cdc6e2 M #b0a6ca D #897ea6 d #6f6592` · `h #d2f7f4 c #a0efea g #41d2d0 G #23808b` · `o #ff9243 O #ffc089 r #d9641f`. ONLY these 13 chars. (`g/c` teal = the "0=teal" accent.)
Author `art/gateways/build_operations_hub.py` (isobuild: wide 2-story boxes + rooftop screen as a framed `Box.window` on an angled plane + periscope details + hazard band as orange slashes + `Box.window` lower). Emit `art/src/operations_hub_generic.json` (64×64) → PNG + preview via `art/.venv/bin/python3`. No `draw_cube`; don't run `iso.py`.

## Review = fidelity to `art_ref/mockups/operations_hub.png`
Wide two-story control center, the big orange-framed tilted control screen is the obvious hero, orange hazard band + periscopes present, operator figure + lower window/door, crisp iso, on-palette.
