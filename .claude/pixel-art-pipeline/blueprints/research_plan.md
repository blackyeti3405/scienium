# Blueprint — Research Plan (gateway) · IMAGE-MATCH mode

**Reference (Read FIRST, match it): `art_ref/mockups/research_plan.png`**

## What the drawing shows (transcription)
**Two drafting-desk units in an L**, meeting at a back corner, with an **open front notch** between them where the pen holder sits. Left unit taller/larger; right unit lower/smaller, set to the right and slightly forward.
- **LEFT unit — THREE stacked layers (top→bottom):**
  1. Big **slanted DRAWING-SCREEN** roof (angled like a drafting board, tilted toward viewer), showing a **blue/purple scribble sketch**; thick dark frame.
  2. A middle recessed **SHELF BAND** — a green+purple colour strip (supply drawer / light bar).
  3. Plain lower **BODY** box; small handle dot; orange trim on the left corner.
- **RIGHT unit — TWO layers:**
  1. Smaller **slanted SCREEN** showing a colourful (blue/green/purple) scribble.
  2. Lower **BODY** with a **square WINDOW** (blue/purple/green) on its front face; orange trim edges.
- **CENTRE notch — the PEN HOLDER (focal point):** a cup with several thin vertical **pens/rulers fanning UP and out**, an **orange V/chevron** accent at its base. A vertical orange trim post stands at the back corner where the two units meet.

## Translate to 64×64 (priorities)
1. Two distinct L-arranged units, left taller + 3-layered, right lower + 2-layered. 2. The **pen holder fanning up from an orange chevron** in the front notch — the hero, unmistakable. 3. Both **slanted drafting screens** read as angled glass with a sketch. 4. Left's colored shelf band; right's square window. Orange trim posts/edges.

## Palette, paths, method
Chars→hex: `K #241f38` · `W #e2dcf0 L #cdc6e2 M #b0a6ca D #897ea6 d #6f6592` · `h #d2f7f4 c #a0efea g #41d2d0 G #23808b` · `o #ff9243 O #ffc089 r #d9641f`. ONLY these 13 chars.
Author `art/gateways/build_research_plan.py` (isobuild `Box` ×2 wings + hand-placed pen holder; `Box.window` for the angled screens). Emit `art/src/research_plan_generic.json` (64×64) → `apps/web/public/sprites/gateways/research_plan_generic.png` + preview, via `art/.venv/bin/python3`. No `draw_cube`; don't run `iso.py`.

## Review = fidelity to `art_ref/mockups/research_plan.png`
Two L-units (not one box), left 3-layered / right 2-layered, pen holder is the obvious hero, slanted screens read as glass, orange accents placed like the drawing, crisp iso, on-palette.
