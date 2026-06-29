# Building upgrade evolution — art brief

Each economy building gets **4 upgrade-stage sprites** that the player unlocks at the
Lab-Credit tier-ups. They are NOT recolors — each stage **physically adds structure**
to the previous one, so the building visibly *grows and improves* as it levels, and by
the final stage looks like a fully built-out, high-tech version of the base.

## Stages & output paths (per building, under `apps/web/public/sprites/buildings/volt_lab/`)

| Stage | Levels | Sprite | Meaning |
|---|---|---|---|
| base  | 1–3   | `{slug}.png` (UNCHANGED — do not touch) | the form as drawn today |
| _t2   | 4–6   | `{slug}_t2.png` | base **+ a small functional addition** |
| _t3   | 7–9   | `{slug}_t3.png` | _t2 **+ a structural addition** |
| _t4   | 10–14 | `{slug}_t4.png` | _t3 **+ a major addition** |
| _t5   | 15    | `{slug}_t5.png` | _t4 **+ a crowning feature** = fully evolved |

**Cumulative:** _t3 contains everything in _t2 plus more; _t5 contains everything. Build
up, never restart.

## The evolution language (intensity ramp)

- **_t2 — small functional add.** One modest, on-theme element: an extra vent/antenna/
  light, a crate or tool, a short pipe, a small dish. Palette = base palette; you may
  brighten the accent (`o/O`) slightly. Subtle but noticeable.
- **_t3 — structural add.** Extend or raise part of the building, or bolt on a secondary
  unit: a taller section, a side annex, a roof panel/solar array, a second chimney. Add
  one new richer accent shade.
- **_t4 — major add.** A prominent new mass: a second story, a large tower/dish/tank, a
  gantry, glowing windows/cores. Palette matures — deeper/cooler structure tones, an
  energized glow (cyan `g/G` or a new shade).
- **_t5 — crowning feature = final form.** The building reads as fully upgraded/elite:
  a big antenna array, a glowing reactor core, banners/trim, energy arcs. Gold/premium
  trim is allowed **here** as a flourish (NOT the whole building). It should still be
  recognizably the same building, just maxed out.

## Hard constraints

- 64×64 canvas; additions must stay on-canvas and not overcrowd into mush at 64px —
  keep it readable. Prefer a few clear additions over many tiny ones.
- **Keep the footprint base unchanged** — grow UPWARD and outward from the existing
  form; do not move where the building sits (the plot anchor is the base centre, reused
  for every stage). Stage 1 must remain identical to the current base sprite.
- Each building's additions must be **unique and on-theme** (Workshop → more forge/tools;
  AI Incubator → more servers/glow; Robotics Bay → arms/drones; PCB Fab → boards/etch
  tanks; CNC Mill → spindles/stock; etc.). Don't apply the same generic add to all.
- Compose with `art/isobuild.py` (`Box`, `cylinder`, `window`, `louver`) + the existing
  `VOLT` palette; add only a few new hex shades for evolved accents/glows.

## How to build a stage (per builder, `.claude/pixel-art-pipeline/builders/{slug}.py`)

1. Refactor `build()` → `build(stage: int = 1)`: compose the base form, then
   `if stage >= 2: …`, `if stage >= 3: …`, `if stage >= 4: …`, `if stage >= 5: …`
   adding cumulative geometry. (Earlier stages' additions stay drawn at higher stages.)
2. Emit + render each stage 2–5:
   - write the char-grid JSON for the stage, then render to PNG + a scaled preview:
     `python3 art/render_pixel_art.py <stage.json> -o apps/web/public/sprites/buildings/volt_lab/{slug}_t{stage}.png --preview art/preview/volt_lab_{slug}_t{stage}.png`
   - **Read the preview PNG and visually inspect it.** Iterate until the stage reads as
     a clear, on-theme addition and the four stages form a smooth build-up to _t5.
3. Do NOT overwrite the base `{slug}.png` (verify stage 1 still matches it).

The renderer already resolves these paths (`lib/sprites/manifest.ts` `buildingStageSuffix`),
so once the PNGs exist the plot shows them at L4/L7/L10/L15.
