# MindFrame Lab — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for all 10 MindFrame Lab economy buildings,
plus the **canonical code pattern** every painter must follow (proven on
`interview-room.py`, the MindFrame reference implementation, which itself copies the
structure of the cross-lab reference `workshop.py`). Read `UPGRADE_EVOLUTION.md`
first for the rules; this file says *what to add per building* and *how to wire it in*.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions
match that building's signature/role), and the **footprint base never moves** — grow
UP and OUT from the existing form. Stage 1 must stay byte-identical to the shipped
`{slug}.png`. Gold (`q`) is a **t5 flourish only**, never a whole-building recolor.

---

## The MindFrame evolution language (intensity ramp)

Theme: a calm INDIGO behavioral / cognitive-science building **grows into a fully
built-out, multi-channel research instrument** — it gains the gear to *capture more
signal, observe more subjects, and aggregate more data*. The ramp adds SIGNAL /
DATA-CAPTURE / OBSERVATION structure on-theme to each building's own role:

- **t2 — small functional add.** One modest, on-theme element: an uplink/antenna
  whip, an extra readout panel, a sensor pip, a marker node, a probe. Base palette;
  you may brighten the magenta accent (`o/O`) slightly. Subtle but noticeable.
- **t3 — structural add.** Extend or raise part of the building, or bolt on a
  secondary unit: a recording/instrument annex, a taller bay, a second observation
  room, a stepped tower. Introduces the matured deep-indigo `b` on the new mass.
- **t4 — major add.** A prominent new mass: a scanning sensor dish, a server/compute
  stack, a big screen-wall, a data tower, glowing aggregation cores. Palette matures —
  cooler `b` structure + the energized **signal-cyan** glow `e/E` (data) arrives.
- **t5 — crowning feature = final form.** Reads as fully upgraded / elite: a glowing
  neural-data beacon, a synced multi-screen array, a doubled constellation, energy
  arcs. Gold/premium trim (`q`) is allowed **here** as a flourish (an eave banner, a
  finial, rail trim — NOT the whole building). Still recognizably the same building.

The lab's own magenta `o/O` stays the **HUMAN / voice / people** accent; the evolved
glow is cool **signal-cyan `e/E`** (data/scan) so the two never blur. This is the
MindFrame split that keeps the upgrades reading as "more instrumentation," not a
recolor.

---

## Palette — base `MIND` + the reserved evolved shades (shared by all 10)

Keep the shared `MIND` keys, and add ONLY these evolved accents (they appear in no
stage-1 sprite, so every base PNG is unchanged). These EXACT keys+hexes are reused by
all 10 MindFrame buildings for lab-wide consistency:

```python
MIND = { ...base keys (K W L M D d  h c g G  o O r)... ,
    "b": "#2b2440",   # deep indigo steel — matured structure tone for t4+ new masses
    "e": "#7fd4ff",   # energized signal-cyan glow (mid)   — t4/t5 data/scan
    "E": "#d6f4ff",   # energized signal-cyan glow (bright)
    "q": "#f3c63a"}   # premium gold trim — t5 flourish ONLY
```

`e/E` are deliberately COOL CYAN (signal/data) to contrast the lab's warm magenta
`o/O` (human/voice). A building may add at most ~1 of its own extra hue if its theme
truly needs it, but prefer reusing `b/e/E/q`.

---

## The code pattern (copy this from `interview-room.py`)

Every builder is refactored the same way so the 10 painters are consistent.

### 1. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form exactly as before (return the Canvas; do NOT write JSON inside
`build`), then layer cumulative stages with `if stage >= N`. Each stage is its own
helper `stageN_<name>(c, ...)` drawing geometry with `isobuild` primitives (`Box`,
`cylinder`, `Box.window/louver`, `fill_poly`, `line`, `set`). Painter's order: draw
rooftop/overhead additions AFTER the masses they sit on; draw a back-set annex BEFORE
the rooftop features that mount in front of it, so occlusion is correct.

```python
def build(stage: int = 1):
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---  (exact original body, return c)
    ...
    # --- CUMULATIVE UPGRADE STAGES ---
    if stage >= 3: stage3_<structural>(c, ...)   # annex first if it sits behind
    if stage >= 2: stage2_<small>(c, ...)
    if stage >= 4: stage4_<major>(c, ...)
    if stage >= 5: stage5_<crowning>(c, ...)
    return c
```

### 2. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT
overwrite `{slug}.png`). Stages 2–5 render to the manifest paths via
`render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/mindframe"
PREVIEW_DIR = "/path/to/scienium/art/preview"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": MIND, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/mindframe_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                  # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/mindframe_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 3. Inspect + iterate (mandatory)
Build a 5-up contact sheet and READ it:
`art/.venv/bin/python art/montage.py building mindframe {slug}`. Verify, per stage:
addition is ON-canvas (clamp every drawn point inside 0..63 — no row/col 0 or 63
pixels), does NOT collide with the building's signature feature, reads clearly at
64px (a FEW clear additions beat many tiny ones), and the 4 stages form a smooth ramp
to a maxed-out `_t5`. Confirm the base PNG is byte-identical after the run:

```bash
art/.venv/bin/python art/render_pixel_art.py art/src/buildings/mindframe_{slug}.json -o /tmp/s1.png >/dev/null && \
art/.venv/bin/python -c "from PIL import Image,ImageChops as C; a=Image.open('/tmp/s1.png').convert('RGBA'); b=Image.open('apps/web/public/sprites/buildings/mindframe/{slug}.png').convert('RGBA'); print('BASE_IDENTICAL', C.difference(a,b).getbbox() is None)"
```

### Pitfalls learned on the reference (interview-room)
- **Off-canvas overshoot:** long masts/arcs shooting past the canvas read as flat
  antennas — clamp every endpoint inside 0..63.
- **Detached rooftop blobs:** a dish/orb placed too far off the roof looks unmoored —
  anchor every crowning feature ON a roof point of the host mass with a visible
  plinth/pylon/neck.
- **Twin-feature crowding:** two rooftop features fighting for the same spot merge
  into one blob. Spread them in x — on a SMALL roof use opposite roof corners
  (`roof_pt(0.0, v)` vs `roof_pt(0.66, v)`); the reference mast (x≈26) and dish
  (x≈39) sit 13px apart so they never crowd.
- **Stacked features fusing:** a t5 crown sitting directly on a t4 mass reads as one
  tall lump. Lift the crown with a CLEAR neck gap (≈5px) so dish + beacon read as two
  distinct stacked elements.
- **Re-anchoring across stages:** if t5 references a t4 part, recompute from the SAME
  source point (`roof_pt(u,v)` + the same lift), don't hardcode a second guess.
- **Don't occlude the signature:** every building's hero motif must stay clear. Grow
  onto the BACK / roof / side masses, never over the front-and-centre signature.

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add,
t5 = crowning feature + gold flourish. All keep the prior stages. Each building's
adds are UNIQUE (no generic add reused across buildings).

### 1. interview-room — *open one-on-one booth backed by a one-way mirror wall; sig: two seated figures + voiceprint speech-bubble + subject-ID tag in the open front booth* — **REFERENCE (shipped)**
- **t2** small: a slim **DATA-UPLINK MAST** on the canopy's far-left roof corner —
  whip + two signal-tick crossbars + a magenta `o/O` pin-light (the booth starts
  streaming its captured session).
- **t3** structural: a tall slim **RECORDING / CAMERA ANNEX TOWER** rising off the
  back-right (behind the side-fin) with a glowing `c` data-slit + a swivel camera head
  perched on its roof watching the booth — `b` camera mount.
- **t4** major: a rooftop **SCANNING SENSOR DISH** on a light pylon (right-of-centre,
  13px clear of the mast) — a concave cyan reflective cup (`e/E`), K rim, feed-horn at
  focus; deep `b` pylon, the suite now aggregates signal.
- **t5** crowning: a glowing **NEURAL-DATA BEACON** orb + halo ring crowning the dish
  on a clear neck (≈5px gap), forked `E` signal arcs feeding down, `q` gold canopy-eave
  banner + a `q` gold finial pennant on the uplink mast.
- **Palette ramp:** `o` pin (t2) → `b`+`c` annex (t3) → `b`+`e/E` dish (t4) → `E` arcs
  + `q` banner/finial (t5).

### 2. survey-distribution-center — *wide low dispatch hall; sig: a rooftop broadcast mast + cylinder hopper spraying out flying survey-form sheets, with a distribution chute + response kiosk*
- **t2** small: an extra **outbound mailer chute** (one more stepped ramp) + two more
  flying `c`/`L` form-sheets + a brighter `o` dispatch light on the hopper rim.
- **t3** structural: a stepped **response-intake annex** abutting the right kiosk (a
  low box of glowing `g` returned-form slots) — `b` housing, extends the dispatch
  flow with a clear return path.
- **t4** major: a tall **distribution-tower silo** (`cylinder`) beside the hopper with
  a glowing `e` conveyor-window of forms climbing it + a wider broadcast array fan on
  top; cooler `b` massing — throughput scales up.
- **t5** crowning: the broadcast mast becomes a **multi-beam survey-relay array** —
  three `E` outbound signal fans + a dense flock of form-sheets in flight, `q` gold
  array ribs + a gold weathervane finial on the silo.
- **Palette ramp:** `o` light (t2) → `g` intake (t3) → `e` conveyor (t4) → `E` relay
  fans + `q` ribs (t5).

### 3. behavioral-lab — *two connected glass observation rooms with magenta-lit interiors; sig: subjects visible inside a glass-walled behavior room beside a control annex*
- **t2** small: a **ceiling observation-camera dome** + a `c` status light on the
  control annex roof + one brighter `o` interior light (the room is now monitored).
- **t3** structural: a **second glass observation room** stepped off the existing pair
  (repeat the glass `Box` once, slightly smaller) — keeps the paired-room language,
  `b` mullion frames, more subjects observed at once.
- **t4** major: a raised **one-way observation gallery deck** spanning above the rooms
  (a glazed `e`-glowing mezzanine on `b` posts) so observers look DOWN through the
  glass; energized `e` interior glow deepens.
- **t5** crowning: the gallery gains a **synced behavior-analytics screen-wall** with
  bright `E` live subject-tracking overlays + a `q` gold-trimmed observation rail along
  the gallery edge.
- **Palette ramp:** `c` dome (t2) → `b` room (t3) → `e` gallery (t4) → `E` overlays +
  `q` rail (t5).

### 4. eye-tracking-suite — *display-wall building; sig: a screen wall showing magenta gaze-scanpath scribbles (the eye-tracking heatmap/trail)*
- **t2** small: a desk **chin-rest + eye-tracker bar** prop below the screen wall + a
  brighter `o` calibration-dot pip on the scanpath display.
- **t3** structural: a **second tracking-booth annex** abutting the wall (a slim dark
  hood enclosing a subject screen, glowing `g` from inside) — `b` hood, a dedicated
  calibration booth.
- **t4** major: a **stacked monitor-rig tower** raising the roofline with twin glowing
  `e` gaze-heatmap panels (more screens reading more eyes); deeper `b` chassis.
- **t5** crowning: the screen wall becomes a **panoramic gaze-aggregation array** —
  multiple synced `E` heatmaps + a bright fixation-cluster bloom, `q` gold-trimmed
  master console + a gold bezel on the hero screen.
- **Palette ramp:** `o` dot (t2) → `g` booth (t3) → `e` heatmaps (t4) → `E` array +
  `q` bezel (t5).

### 5. statistical-analysis-hub — *compute block crowned by a rooftop bell-curve (normal-distribution) arch; sig: the pink Gaussian-curve arch over the roof*
- **t2** small: a rooftop **significance-marker** (a small p-value flag + a `c` quartile
  pip) planted under the bell curve + a brighter `o` peak light at the curve's apex.
- **t3** structural: a **server/compute annex** bolted to the shaded flank (a slim box
  of glowing `g` instrument bays running the regressions) — `b` housing, real compute
  added under the stats.
- **t4** major: a second **distribution plotted alongside** the bell curve — a raised
  `e`-glowing scatter/box-plot board on a `b` frame beside the arch (the hub now runs
  multivariate models); cooler `b` tones.
- **t5** crowning: the roof becomes a **live multi-distribution dashboard** — the bell
  curve + a confidence-band ribbon glow bright `E`, a pulsing result node, `q` gold
  axis-rails framing the curve + a gold apex finial.
- **Palette ramp:** `o` peak (t2) → `g` bays (t3) → `e` scatter (t4) → `E` bands +
  `q` rails (t5).

### 6. focus-group-chamber — *round sunken discussion pit ringed by seated participants; sig: the circular table-ring of figures + a floating magenta moderation/discussion banner*
- **t2** small: an extra **microphone boom** leaning over the table + one more seated
  `d` participant on the ring + a brighter `o` glow on the moderation banner.
- **t3** structural: a curved **observation-booth annex** wrapping one back arc of the
  pit (a low one-way-glass screen on `b` posts so observers ring the discussion) —
  `b` frame, the group is now observed.
- **t4** major: a suspended **ring of array-mics + a central capture pod** lowering
  over the table on a `b` gantry, glowing `e` as it records every voice; energized `e`
  pit-glow deepens.
- **t5** crowning: the moderation banner blooms into a **live sentiment-cloud array** —
  several `E` floating discussion threads + a bright consensus node over the pod, `q`
  gold rim-trim around the table-ring + a gold boom finial.
- **Palette ramp:** `o` banner (t2) → `b` booth (t3) → `e` capture pod (t4) → `E`
  sentiment cloud + `q` rim (t5).

### 7. longitudinal-study-wing — *long low cohort wing; sig: a rooftop timeline track of milestone lollipop-nodes joined by a pink trend-line, over a row of cohort windows*
- **t2** small: **two more milestone nodes** extending the timeline track + a brighter
  `o` "current wave" marker pip on the latest node (the study runs another wave).
- **t3** structural: an additional **cohort bay** extending the wing (repeat the
  windowed `Box` module once) — keeps the long-wing silhouette, `b` frame, another
  cohort enrolled.
- **t4** major: a **data-warehouse tower** rising off one end with stacked glowing `e`
  archive-drawers of accumulated waves (years of data stored); deeper `b` massing.
- **t5** crowning: the timeline track becomes a **glowing multi-wave trend-ribbon** —
  a dense `E` trend-line with pulsing milestone nodes climbing across the whole roof,
  `q` gold rail along the ridge + a gold cap on the warehouse tower.
- **Palette ramp:** `o` marker (t2) → repeat-bay (t3) → `e` drawers (t4) → `E` ribbon
  + `q` rail (t5).

### 8. eeg-biofeedback-room — *cube whose lit face is a stacked rack of magenta brainwave-trace readout panels; sig: the stacked EEG-trace rack + a roof pulse node*
- **t2** small: an extra **electrode-cap stand** prop beside the rack + one more
  brainwave `c` trace band + a brighter `o` pulse blip on the roof node.
- **t3** structural: a **shielded biofeedback booth annex** abutting the cube (a slim
  dark Faraday box with a glowing `g` interior porthole where a subject sits wired) —
  `b` shielding, a dedicated session booth.
- **t4** major: a **multi-channel amplifier tower** raising the roofline with stacked
  glowing `e` channel-meters (more electrodes, more signal); cooler `b` chassis.
- **t5** crowning: the trace rack becomes a **live full-montage brain-map array** —
  a glowing `E` topographic head-map + synced waveform bands + a bright coherence
  node, `q` gold-trimmed master amp + a gold pulse finial on the roof node.
- **Palette ramp:** `o` blip (t2) → `g` booth (t3) → `e` meters (t4) → `E` brain-map +
  `q` trim (t5).

### 9. data-visualization-studio — *studio with a mounted multi-panel chart dashboard; sig: big screens showing magenta line/bar plots (the dataviz wall)*
- **t2** small: a **second small chart panel** clipped beside the wall (a tiny `c`
  sparkline tile) + a brighter `o` legend/cursor dot on the main plot.
- **t3** structural: a **render-rack annex** abutting the studio (a slim box of glowing
  `g` GPU bays driving the visualizations) — `b` housing, real render compute added.
- **t4** major: a curved **video-wall tower** raising the roofline with twin glowing
  `e` dashboard panels (a big plotting wall); deeper `b` chassis.
- **t5** crowning: the dashboard becomes a **wraparound synced analytics array** —
  multiple `E` live charts (line + bar + scatter) animating in unison + a bright KPI
  node, `q` gold-trimmed master bezel + a gold finial on the video-wall tower.
- **Palette ramp:** `o` cursor (t2) → `g` GPU bays (t3) → `e` panels (t4) → `E` array
  + `q` bezel (t5).

### 10. computational-social-science-lab — *round drum/tower crowned by a hovering social-network constellation; sig: the floating node-and-edge network graph orb over the drum*
- **t2** small: an extra **data-feed whip + a `c` node-light ring** on the drum rim +
  one brightened `o` hub-node in the constellation (more agents ingested).
- **t3** structural: a **server-blade annex** abutting the drum (a louvered `Box.louver`
  box glowing faint `g` running the agent-based sims) — `b` housing.
- **t4** major: a **second smaller network drum** (`cylinder`) stepped beside the main
  one with a glowing `e` cross-network bridge halo (two populations modelled); cool
  `b` tones deepen.
- **t5** crowning: the constellation **doubles into a twin-network cluster** with
  bright `E` information-cascade pulses arcing between the two graphs + a bright
  super-hub node, `q` gold drum trim-ring + a gold finial mast.
- **Palette ramp:** `c` ring (t2) → `g` blades (t3) → `e` bridge (t4) → `E` cascades +
  `q` ring (t5).

---

## Worked reference — Interview Room (already shipped)
*Form: open one-on-one mirror-wall booth; sig: two seated figures + voiceprint bubble
+ subject-ID tag.*
- **t2** data-uplink mast + magenta pin-light on the canopy's far-left roof (small).
- **t3** recording/camera annex tower with a glowing data-slit + a roof-perched swivel
  camera watching the booth (structural).
- **t4** rooftop scanning sensor dish on a light pylon — concave cyan cup, K rim,
  feed-horn at focus (major).
- **t5** neural-data beacon orb + halo crowning the dish on a clear neck, forked cyan
  signal arcs, gold canopy-eave banner + gold mast finial (crowning).
- Files: `interview-room_t2..t5.png` rendered + previewed; base `interview-room.png`
  unchanged (BASE_IDENTICAL).
