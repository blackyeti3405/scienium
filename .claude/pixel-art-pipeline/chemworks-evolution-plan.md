# ChemWorks — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for the 10 ChemWorks economy buildings, plus
the **canonical code pattern** every painter must follow (proven on
`fume-hood-bench.py`, the ChemWorks reference implementation). Read
`UPGRADE_EVOLUTION.md` first for the rules; this file says *what to add per building*
and *how to wire it in*. It mirrors the Volt Lab `evolution-plan.md` format.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions
match that building's signature/role), and the **footprint base never moves** — grow
UP and OUT from the existing form. Stage 1 must stay byte-identical to the shipped
`{slug}.png`. Gold (`q`) is a **t5 flourish only**, never a whole-building recolor.

The ChemWorks mood is **wet bench chemistry**: blue-grey steel masses, blue glass
glazing (`c/h`), and a **violet reagent/reaction glow** (`o/O/r`) as the warm accent
(NOT volt-yellow, NOT bio-green). The evolution language reads as *the bench grows
into a built-out reagent/process works*: more reagent vessels → a service annex →
a tall process column/tower → a glowing reagent-reservoir crown.

---

## The evolved-accent palette (lab-wide — reuse these exact keys/hexes)

Keep the shared `CHEM` base keys; add ONLY these evolved accents. They appear in no
stage-1 sprite, so every base PNG is unchanged. Pick chars NOT already in `CHEM`:

```python
CHEM = { ...base keys (K W L M D d  h c g G  o O r)... ,
    "b": "#363c5e",   # deepened structure steel — matured tone for t4+ new masses
    "e": "#36e0c8",   # energized reagent glow (mid)   — t4/t5 process glow (teal)
    "E": "#c2fff2",   # energized reagent glow (bright)
    "q": "#f0c64a"}   # premium gold trim — t5 flourish ONLY
```

The **teal `e/E`** glow is the ChemWorks "powered/energized" tell (distinct from the
violet `o/O/r` *reaction* accent and the blue `c/g` *glass*): it marks an active
process core/reservoir at t4–t5. A building may add at most ~1 extra hue if its theme
truly needs it, but prefer reusing `b/e/E/q` so all 10 read as one lab.

---

## The code pattern (copy this from `fume-hood-bench.py`)

Every builder is refactored the same way so the 10 painters are consistent.

### 1. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form EXACTLY as before (return `c`, never write JSON inside
`build`), then layer cumulative stages with `if stage >= N`. Each stage is its own
helper `stageN_<name>(c, ...)` drawing geometry with `isobuild` primitives (`Box`,
`cylinder`, `Box.window/louver`, `fill_poly`, `line`, `set`). **Painter's order:**
draw rooftop / overhead / back-rising additions AFTER the masses they sit on so
nearer things occlude correctly — and draw the building's front-most **signature
LAST** so no upgrade ever paints over it (the fume-hood flask is drawn after the
column/crown for exactly this reason).

```python
def build(stage: int = 1):
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---
    ...exact original body, but `return c` instead of writing JSON...
    # --- CUMULATIVE UPGRADE STAGES ---
    if stage >= 3: stage3_<structural>(c, ...)   # order chosen so painter's algo holds
    if stage >= 4: stage4_<major>(c, ...)
    if stage >= 5: stage5_<crowning>(c, ...)
    if stage >= 2: stage2_<small>(c, ...)        # back-roof prop drawn after the column
    <signature>(c, ...)                           # ALWAYS last = front-most hero
    return c
```

### 2. Anchoring rule (avoid the volt-lab pitfalls)
- **Clamp every drawn point inside 0..63.** Long columns/masts that overshoot
  `y<0` or `x>63` get silently clamped by `Canvas.set` and read as a flat smear.
  Verify the topmost occupied row ≥ 0 with margin (see step 4).
- **Anchor crowning features ON a host roof point with a visible plinth/collar** —
  never a detached rooftop blob.
- **If t5 references a t4 part, recompute it from the SAME source** (a shared
  module constant or the identical `roof_pt(u,v)` call), don't hardcode a 2nd guess.
  *The reference does this with a module-level `COLUMN_H = 18`: both `stage4_column`
  and `stage5_reservoir_crown` derive the column top from it, and 18 is tuned so the
  globe+finial crown lands fully on-canvas (globe centre ~row 5, finial just inside
  y=0). Each builder with a tall t4 mass + t5 crown should define its own such
  constant.*

### 3. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT
overwrite `{slug}.png`). Stages 2–5 render to the manifest paths via
`render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/chemworks"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG        = "<this-building-slug>"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": CHEM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/chemworks_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                  # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/chemworks_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 4. Inspect + iterate (mandatory)
Build the 5-up contact sheet and READ it: `python3 art/montage.py building chemworks
<slug>`. Verify per stage: addition is ON-canvas (topmost occupied row ≥ 0 with
margin), does NOT collide with / occlude the signature, reads clearly at 64px (a few
clear additions beat many tiny ones), and the 4 stages form a smooth ramp to a
maxed-out `_t5`. Confirm the base PNG is byte-identical after the run
(`ImageChops.difference(...).getbbox() is None`).

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add,
t5 = crowning feature + gold flourish. All keep the prior stages. Every building's
adds are **unique** — no generic add is reused across buildings.

### 1. reaction-synthesis-lab — *boxy lab + a tall cylindrical reactor silo on the back-right corner; sig: a coiled reflux/condenser tube climbing the lit face into the reactor*
- **t2** small: a **chilled-water header + a second short reflux coil** bracketed
  beside the existing coil on the lit face; a brightened `o` reaction bead at the
  reactor mouth.
- **t3** structural: a **jacketed feed-tank annex** (a short `cylinder` charge vessel
  with a `g` sight-glass) abutting the shaded right end, plumbed to the reactor —
  new `b`-shadowed mass.
- **t4** major: a **second taller reactor `cylinder`** twinning the silo, banded with
  steel hoops and an `e` glowing reaction core window; cooler `b` tones arrive.
- **t5** crowning: the reactor pair is topped by a **glowing reflux-condenser dome**
  venting `E` reagent vapor with a reaction arc between the two reactors, `q` gold
  hoop bands + a gold vent finial.
- **Palette ramp:** `o` bead (t2) → `b`/`g` feed-tank (t3) → `b`+`e` 2nd reactor
  (t4) → `E` vapor + `q` hoops (t5).

### 2. spectroscopy-suite — *stepped block; sig: a rooftop spectrometer beam-bench splitting a magenta→cyan refracted spectrum streak (a prism dispersing light)*
- **t2** small: a **sample-cuvette turret + a calibration laser diode** on the bench
  rail; brighten one `o` source LED so the beam reads as freshly lit.
- **t3** structural: a **detector-rack annex** stepped onto the lower roof step (a slim
  louvered `Box` of `g` PMT-tube bays) catching the dispersed beam — `b` housing.
- **t4** major: a **second monochromator arm + a diffraction-grating tower** raising
  the bench, widening the refracted streak into a full `e`-cored spectrum fan;
  deeper `b` chassis.
- **t5** crowning: the bench becomes a **dual-beam spectro-array** throwing a bright
  `E` rainbow dispersion arc across the roof from twin gratings, `q` gold optical-rail
  trim + a gold prism mount.
- **Palette ramp:** `o` source (t2) → `g` detectors (t3) → `e` spectrum (t4) → `E`
  fan + `q` rails (t5).

### 3. materials-testing-bay — *wide open-fronted bay; sig: a tall thin sample/test column on the right carrying a load apparatus over an open work bay*
- **t2** small: an **extensometer dial-gauge cluster + a `c` strain readout** clamped
  on the test column; brighten the `o` load-status light.
- **t3** structural: a **second load column** widening the rig into a twin-post frame
  with a cross-head beam spanning the bay mouth — `b` columns + brackets.
- **t4** major: a **hydraulic power-pack** mass (a `cylinder` accumulator + pump
  housing) on the shaded flank feeding glowing `e` rams up the columns; structure to
  `b`.
- **t5** crowning: a **glass environmental test chamber** drops over the specimen with
  an `E` stress-glow on a crushed sample + a redlined master gauge, `q` gold frame
  caps on the cross-head.
- **Palette ramp:** `c` gauge (t2) → `b` 2nd column (t3) → `e` rams (t4) → `E`
  chamber + `q` caps (t5).

### 4. catalysis-lab — *block + a rooftop catalytic spray-tree on a central post; sig: a reaction burst spitting cyan-violet droplets upward in a fountain*
- **t2** small: a **catalyst-pellet hopper + a feed nozzle** on the spray-tree post; a
  brighter `O` droplet spit at the fountain crown.
- **t3** structural: a **packed-bed reactor annex** (a low covered `Box` showing a
  `g`-glazed catalyst-bed window with stacked `o` pellet beads) bolted to the lit
  side — `b` shell.
- **t4** major: a **fluidized-bed riser tower** rising off the roof beside the spray
  post, a tall `cylinder` with an `e` glowing bubbling-bed core and a cyclone head;
  `b` steel.
- **t5** crowning: the spray-tree becomes a **glowing multi-jet catalytic crown** —
  three `E` reaction plumes fountaining off a hot core ring, `q` gold nozzle collars
  + a gold reactor band.
- **Palette ramp:** `O` droplet (t2) → `g`/`o` packed bed (t3) → `e` riser (t4) →
  `E` plumes + `q` collars (t5).

### 5. distillation-tower — *low shed + a very tall slender fractionating column tower with a vapor wisp + feed pipes; sig: the hero distillation tower itself*
*(The base already owns a tall tower — evolve by THICKENING/PLUMBING/CROWNING the
process, not by adding a generic second tower that would mimic fume-hood-bench.)*
- **t2** small: an **extra feed/reflux pipe run + a relief-valve drum** strapped to the
  tower mid-section; brighten the `o` vapor bead at the tower top.
- **t3** structural: a **reboiler + condenser drum annex** at the tower foot (a
  horizontal `cylinder` drum on saddles with a `g` sight-glass), tying the loop —
  `b` shadow.
- **t4** major: a **trayed stripper column** added alongside, shorter than the hero
  tower, with `e`-glowing tray-level lights climbing it + a steel pipe-bridge linking
  the two; `b` steel.
- **t5** crowning: a **glowing reflux-accumulator sphere** crowns the hero tower
  throwing an `E` boil-up glow down the trays, `q` gold tower bands + a gold crown
  rail on the catwalk.
- **Palette ramp:** `o` bead (t2) → `b`/`g` reboiler (t3) → `e` stripper (t4) → `E`
  boil-up + `q` bands (t5).

### 6. crystallography-room — *domed/vaulted room; sig: a glowing crystal-growth bed of faceted crystals under a glass dome*
- **t2** small: a few extra **seed-crystal facets + a `c` goniometer head** on the
  growth bed; brighten one `o` nucleation glint under the dome.
- **t3** structural: a **diffractometer annex** abutting the room (a low `Box` with a
  rotating `g`-glass sample stage + a detector arm) — `b` housing.
- **t4** major: a **second crystal-growth dome** (a smaller glass dome on a stepped
  base) with an `e`-glowing supersaturated solution bath; cool `b` tones deepen.
- **t5** crowning: the main dome's crystal bed **erupts into a glowing macro-crystal
  cluster** — tall `E` faceted prisms refracting light, `q` gold dome ribs + a gold
  apex finial.
- **Palette ramp:** `o` glint (t2) → `g` diffractometer (t3) → `e` bath (t4) → `E`
  crystals + `q` ribs (t5).

### 7. polymer-workshop — *long low hall + rooftop polymer extruder/pellet hoppers; sig: an extrusion die/spinneret drawing a fiber strand on the front*
- **t2** small: an **extra pellet hopper + a take-up spool** of drawn fiber on the
  front; brighten the `o` heater-band light on the die.
- **t3** structural: a **melt-pump + screw-barrel annex** along the lit wall (a long
  banded `cylinder` extruder barrel with `o` heater zones) feeding the die — `b`
  shell.
- **t4** major: a **cooling/drawing tower** rising off the roof — a tall frame guiding
  multiple `e`-glowing molten filaments up over godet rollers; `b` steel frame.
- **t5** crowning: the spinneret becomes a **glowing multi-filament fiber crown** —
  a fan of bright `E` drawn strands winding onto a premium creel, `q` gold die-plate
  + a gold spool flange.
- **Palette ramp:** `o` heater (t2) → `o`/`b` barrel (t3) → `e` filaments (t4) → `E`
  fiber fan + `q` die (t5).

### 8. computational-chemistry-hub — *server-stack block + louvered compute racks; sig: a hovering ball-and-stick molecular-model constellation orbiting above the roof*
- **t2** small: an **extra atom node + bond** added to the molecule orbit + a `c`
  data-light ring on the rack rim; brighten one orbiting node.
- **t3** structural: a **GPU-blade rack annex** abutting the block (a louvered `Box`,
  `Box.louver` vents glowing faint `g`) — `b` housing.
- **t4** major: a **liquid-cooling tower** beside the racks (a `cylinder` with an `e`
  coolant-glow window + radiator fins) feeding the compute mass; cool `b` deepens.
- **t5** crowning: the molecule **doubles into a twin-molecule simulation cluster**
  with bright `E` electron-density pulses arcing between the two models, `q` gold
  rack trim ring + a gold orbit gimbal.
- **Palette ramp:** `c` ring (t2) → `g` GPU vents (t3) → `e` coolant (t4) → `E`
  pulses + `q` ring (t5).

### 9. cleanroom-synthesizer — *sealed cleanroom box + a gridded HEPA-filter ceiling; sig: a glowing synthesis chamber window / airlock on the front*
- **t2** small: an **airlock pass-through box + a `c` "clean" status panel** on the
  front; brighten the `o` cycle-light over the chamber window.
- **t3** structural: a **gowning-room vestibule annex** bolted to the lit end (a small
  `Box` with a `g`-glass interlock door + a HEPA grille) — `b` shell.
- **t4** major: a **vertical laminar-flow tower / filter plenum** rising off the roof
  (a tall `Box` with stacked `e`-glowing HEPA banks blowing down into the chamber);
  `b` steel.
- **t5** crowning: the synthesis chamber **lights up as a glowing automated reactor
  cell** — a robotic dosing head over an `E` reaction-glow vessel behind the glass,
  `q` gold airlock trim + a gold chamber seal ring.
- **Palette ramp:** `c` status (t2) → `g` vestibule (t3) → `e` plenum (t4) → `E`
  reactor + `q` seal (t5).

---

## Worked reference — Fume Hood Bench (already implemented, sets the bar)
*Form: wide low open-fronted lean-to bench shed; sig: a round-bottom flask of
bubbling blue reagent clamped on a ring-stand over a violet burner flame.*
- **t2** small: a wall-shelf **reagent carboy + a short condenser coil** on the
  back-right roof shoulder, brightened `o` vapor bead (small functional add).
- **t3** structural: a low **chemical-storage annex lean-to** on the shaded right end
  — a reagent closet with a `g`-glass door onto shelved bottles (structural add).
- **t4** major: a tall **glass-and-steel distillation column** rising off the back roof
  with a glowing `e/E` reagent core climbing it + a curved feed pipe (major add).
- **t5** crowning: a glowing spherical **reagent-reservoir globe** crowning the column,
  throwing an `E` reaction arc down it, plus `q` gold column hoops, a gold finial, and
  a gold eave ribbon (crowning + gold flourish).
- Anchoring: a module constant `COLUMN_H = 18` is shared by `stage4_column` and
  `stage5_reservoir_crown` so the crown re-derives the SAME column top (globe centre
  ~row 5, finial just inside y=0 — fully on-canvas).
- Files: `fume-hood-bench_t2..t5.png` rendered + previewed; base `fume-hood-bench.png`
  unchanged (BASE_IDENTICAL True).
