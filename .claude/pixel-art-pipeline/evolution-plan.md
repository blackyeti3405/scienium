# Volt Lab — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for the remaining 9 Volt Lab economy
buildings, plus the **canonical code pattern** every painter must follow (proven
on `workshop.py`, the reference implementation). Read `UPGRADE_EVOLUTION.md` first
for the rules; this file says *what to add per building* and *how to wire it in*.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions
match that building's signature/role), and the **footprint base never moves** — grow
UP and OUT from the existing form. Stage 1 must stay byte-identical to the shipped
`{slug}.png`. Gold (`q`) is a **t5 flourish only**, never a whole-building recolor.

---

## The code pattern (copy this from `workshop.py`)

Every builder is refactored the same way so the 9 painters are consistent.

### 1. Palette — base + a few reserved evolved shades
Keep the shared `VOLT` keys, and add ONLY these evolved accents (they appear in no
stage-1 sprite, so the base PNG is unchanged):

```python
VOLT = { ...base keys... ,
    "b": "#3b4350",   # deep cool steel — matured structure tone for t4+ new masses
    "e": "#6fe6f4",   # energized cyan glow (mid)   — t4/t5 power
    "E": "#caf7ff",   # energized cyan glow (bright)
    "q": "#f3c63a"}   # premium gold trim — t5 flourish ONLY
```
A building may add at most ~1–2 of its own extra hues if its theme needs them
(e.g. a hot-metal orange for welding), but prefer reusing `b/e/E/q`.

### 2. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form exactly as before, then layer cumulative stages with
`if stage >= N`. Each stage is its own helper `stageN_<name>(c, ...)` that draws
geometry with `isobuild` primitives (`Box`, `cylinder`, `Box.window/louver`,
`fill_poly`, `line`). Painter's order: draw rooftop/overhead additions AFTER the
masses they sit on, so nearer/higher additions occlude correctly.

```python
def build(stage: int = 1):
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---
    ...exact original body, but `return c` instead of writing JSON...
    # --- CUMULATIVE UPGRADE STAGES ---
    if stage >= 2: stage2_<small>(c, ...)
    if stage >= 3: stage3_<structural>(c, ...)
    if stage >= 4: stage4_<major>(c, ...)
    if stage >= 5: stage5_<crowning>(c, ...)
    return c
```

### 3. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT
overwrite `{slug}.png`). Stages 2–5 render to the manifest paths via
`render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/volt_lab"
PREVIEW_DIR = "/path/to/scienium/art/preview"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": VOLT, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/volt_lab_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                  # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/volt_lab_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 4. Inspect + iterate (mandatory)
Read each `art/preview/volt_lab_{slug}_t{2..5}.png`. Verify, per stage: addition is
ON-canvas (additions clamp inside 0..63), does NOT collide with the building's
signature feature, reads clearly at 64px (a few clear additions beat many tiny
ones), and the 4 stages form a smooth ramp to a maxed-out `_t5`. Build a 5-up
contact sheet (base..t5 side by side) to judge the ramp holistically. Confirm the
base PNG is byte-identical after the run (`ImageChops.difference(...).getbbox() is
None`).

### Pitfalls learned on the Workshop
- **Off-canvas overshoot:** long beams/masts shooting past x=63 read as flat
  antennas. Clamp endpoints; for the gantry the jib end was pulled back to ~x=42.
- **Detached rooftop blobs:** a coil/dish placed too far up-right looks unmoored.
  Anchor crowning features ON a roof point of the host mass with a visible plinth.
- **Re-anchoring across stages:** if t5 references a t4 part (banner on the gantry
  mast), recompute from the SAME source point (`roof_pt(u,v)` + mast height), don't
  hardcode a second guess.

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add,
t5 = crowning feature + gold flourish. All keep the prior stages.

### 1. cnc-mill-shop — *wide low factory hall; sig: glass-boxed rooftop 3-axis cutting gantry*
- **t2** small: a rooftop **dust-cyclone collector** can + short ducting beside the
  clerestory; a brightened `o` chip-chute light.
- **t3** structural: a **tool-carousel annex** bolted to the lit side wall (a low
  cylinder magazine of indexed tool holders) — new `cylinder` mass + `b` shadow.
- **t4** major: a second **clerestory monitor bay** raising the roofline + a
  glowing `e` coolant-tank on the shaded flank (cooler `b` tones arrive).
- **t5** crowning: a **glass-boxed second cutting gantry** twinning the signature —
  twin spindles carving stock in `E` coolant mist, `q` gold rails on the gantry box.
- **Palette ramp:** base → `o` brighten (t2) → `b` annex (t3) → `b`+`e` coolant
  (t4) → `E` mist + `q` rails (t5).

### 2. 3d-printing-shop — *tall slender glass-domed tower; sig: extruder printing a glowing part in stacked layers*
- **t2** small: an extra **filament-spool rack** + feed tube on the tower's lit
  face; brighten the `o` heater-block dot.
- **t3** structural: a **second print bay** annex stepped off the base (a shorter
  glass-domed sub-tower) — abut a smaller `Box`/`cylinder`.
- **t4** major: a tall **drying/curing silo** (`cylinder`) beside the tower with a
  glowing `e` UV-cure window; structure deepens to `b`.
- **t5** crowning: the main dome becomes a **multi-head print farm** — three glowing
  `E` parts rising in unison, `q` gold dome ribs + a gold finial.
- **Palette ramp:** `o` (t2) → `b` annex (t3) → `e` cure glow (t4) → `E` parts +
  `q` ribs (t5).

### 3. pcb-fab — *low flat clean-room block; sig: roof is a live circuit board with cyan traces + DIP-chip cupola, yellow current pulse*
- **t2** small: a few extra **SMD-component bumps** + one more `o` current-pulse LED
  on the roof board edge.
- **t3** structural: a stepped **etch-tank annex** on the shaded side (a low covered
  bath with a `g` cyan etchant surface) — new `Box` + `window`-style glaze.
- **t4** major: a **reflow-oven tunnel** raised across the roof (a long box with
  glowing `e` viewports) extending the board theme; `b` housing.
- **t5** crowning: the roof board "powers on" fully — a dense `E` trace lattice with
  a **glowing DIP-chip megacupola**, `q` gold solder pads as the flourish.
- **Palette ramp:** `o` LEDs (t2) → `g` etch (t3) → `e` reflow (t4) → `E` lattice +
  `q` pads (t5).

### 4. robotics-bay — *tall open hangar + control annex; sig: roll-up bay with an articulated arm waving, cyan camera-eye*
- **t2** small: a **second small pick-arm** on a post inside the bay mouth + an extra
  `c` status light on the annex.
- **t3** structural: an **overhead rail track** spanning the bay opening (a beam the
  arm can traverse) — `b` rail + brackets.
- **t4** major: a **charging-dock tower** annex with stacked glowing `e` battery
  cells + a docked drone silhouette; cooler `b` massing.
- **t5** crowning: the hero arm gains a **glowing `E` welding/gripper end-effector**
  mid-task, a hovering drone above the bay, `q` gold safety chevrons on the rail.
- **Palette ramp:** `c` lights (t2) → `b` rail (t3) → `e` cells (t4) → `E` effector
  + `q` chevrons (t5).

### 5. electronics-bench — *stepped two-step block; sig: rooftop oscilloscope CRT showing a live cyan waveform*
- **t2** small: a **bench multimeter + probe leads** prop on the lower step face;
  brighten one `o` panel LED.
- **t3** structural: a **rack-cabinet annex** abutting the tall step (a slim box of
  `g` glowing instrument bays) — new `Box` + repeated `window` slits.
- **t4** major: a **second scope CRT** + a signal-generator tower raising the upper
  step; deeper `b` chassis, `e` trace glow.
- **t5** crowning: the scope wall becomes a **multi-screen diagnostics array** with
  synced `E` waveforms + a `q` gold-trimmed master console.
- **Palette ramp:** `o` LED (t2) → `g` bays (t3) → `e` traces (t4) → `E` array +
  `q` console (t5).

### 6. mechanical-testing-rig — *open structural load-frame; sig: frame crushing a glowing specimen, gauge at redline*
- **t2** small: an extra **dial-gauge cluster** + a `c` readout on the frame upright;
  brighten the `o` load light.
- **t3** structural: a **second load column** widening the frame into a twin-post rig
  + a cross-head beam — `b` columns.
- **t4** major: a **hydraulic power-pack** annex (a `cylinder` accumulator + pump
  housing) feeding glowing `e` rams; structure to `b`.
- **t5** crowning: a **glass environmental chamber** wraps the specimen with an `E`
  stress-glow + a redlined master gauge, `q` gold frame caps.
- **Palette ramp:** `c` gauge (t2) → `b` columns (t3) → `e` rams (t4) → `E` chamber
  + `q` caps (t5).

### 7. welding-fabrication — *open-air L fab yard + gantry crane; sig: gantry arc-welding an I-beam in a cyan-white spark fountain*
- **t2** small: a **gas-bottle rack** (two slim `cylinder` tanks) + a brighter `O`
  arc-spark spit in the yard.
- **t3** structural: a **fume-extraction hood + ducting** over the weld station
  (a canted hood box on posts) — `b` hood. *(Note: this canopy idea overlaps the
  Workshop t3 in spirit — keep it visually distinct as an over-station hood, not a
  full lean-to roof.)*
- **t4** major: a **second gantry rail bay** extending the crane run + a glowing `e`
  positioner turntable rotating a part; `b` rails.
- **t5** crowning: a **robotic weld cell** — twin arms throwing an `E` spark fountain
  over a glowing assembly, `q` gold gantry banner. *Use a HOT-metal `o→O` spark
  palette here so it differs from purely-cyan buildings.*
- **Palette ramp:** `O` sparks (t2) → `b` hood (t3) → `e` positioner (t4) → `E`+`O`
  fountain + `q` banner (t5).

### 8. embedded-systems-lab — *long sawtooth-roof shed; sig: rooftop breadboard garden — jumper-wire trellis + glowing MCU seedlings*
- **t2** small: a few extra **MCU-seedling LEDs** + one more jumper arc on the
  trellis; brighten a `c` board glow.
- **t3** structural: an additional **sawtooth roof bay** extending the shed (repeat
  the existing tooth `Box` once) — keeps the silhouette language.
- **t4** major: a **sensor-mast trellis tower** rising off one tooth with stacked
  glowing `e` dev-boards climbing it; `b` frame.
- **t5** crowning: the breadboard garden becomes a **full glowing circuit-canopy** —
  a dense `E` jumper lattice with pulsing nodes, `q` gold rail along the ridge.
- **Palette ramp:** `c` glow (t2) → repeat-tooth (t3) → `e` boards (t4) → `E` lattice
  + `q` rail (t5).

### 9. ai-incubator — *sleek round drum pavilion; sig: hovering neural-network constellation orb with a traveling pulse*
- **t2** small: an extra **antenna whip + a `c` data-light ring** on the drum rim;
  brighten one orb node.
- **t3** structural: a **server-blade annex** abutting the drum (a louvered box,
  `Box.louver` vents glowing faint `g`) — `b` housing.
- **t4** major: a **second smaller drum** (cylinder) stepped beside the main one with
  a glowing `e` cooling halo; cool `b` tones deepen.
- **t5** crowning: the constellation orb **doubles into a twin-orb neural cluster**
  with bright `E` traveling pulses arcing between them, `q` gold drum trim ring.
- **Palette ramp:** `c` ring (t2) → `g` vents (t3) → `e` halo (t4) → `E` pulses +
  `q` ring (t5).

---

## Worked reference — Workshop (already shipped)
*Form: open-concept L/^ work-yard; sig: spinning anvil-and-wrench weathervane cupola.*
- **t2** flue stack + smoke off the forge wing (small functional add).
- **t3** corrugated work canopy on posts over the court (structural add).
- **t4** tall lattice gantry crane with a glowing cyan hoist + slung I-beam (major).
- **t5** roof-mounted glowing power-core coil + energy arc to the cupola, gold
  mast pennant + gold eave trim (crowning).
- Files: `workshop_t2..t5.png` rendered + previewed; base `workshop.png` unchanged.
