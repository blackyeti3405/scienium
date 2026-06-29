# BioCore Lab — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for the 10 BioCore Lab economy buildings, plus
the **canonical code pattern** every painter must follow (proven on `greenhouse.py`,
the reference implementation). Read `UPGRADE_EVOLUTION.md` first for the rules; this
file says *what to add per building* and *how to wire it in*.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions
match that building's signature/role), and the **footprint base never moves** — grow
UP and OUT from the existing form. Stage 1 must stay byte-identical to the shipped
`{slug}.png`. Gold (`q`) is a **t5 flourish only**, never a whole-building recolor.

The BioCore mood is **living systems**, so where Volt's evolved glow was electric
cyan, BioCore's is **BIO-LUMINESCENT** — a green-teal life-bloom — so a maxed building
reads as a glowing **conservatory / vivarium / culture lab**, not a power plant. Every
add is botanical / cultivation / specimen / climate / bio-glow, NEVER mechanical
gantries or forge gear (those are Volt's).

---

## Palette — base BIO + the reserved evolved accents (lab-wide, reuse on all 10)

Keep the shared `BIO` keys; add ONLY these four evolved accents (they appear in no
stage-1 sprite, so every base PNG is unchanged). These EXACT keys+hexes are reused by
all 10 BioCore buildings for lab-wide consistency:

```python
BIO = { ...base keys (K W L M D d  h c g G  o O r)... ,
    "b": "#2f4a2a",   # deep mossy bark-green — matured structure tone for t3+ new masses/frames
    "e": "#74f0b6",   # bioluminescent glow (mid)    — t4/t5 life-glow
    "E": "#ccffe4",   # bioluminescent glow (bright)
    "q": "#f3c63a"}   # premium gold trim — t5 flourish ONLY
```
Chars `b/e/E/q` are unused by every BioCore builder's base palette (verified). A
building may add at most ~1 of its own extra hue if its theme truly needs it, but
prefer reusing `b/e/E/q`.

### The intensity ramp, BioCore-tuned
- **t2 — small functional add.** One modest on-theme element (a water butt, a vent, a
  spool, an extra dish/lamp, a gauge). Base palette; may brighten an `o`/`c` accent.
- **t3 — structural add.** Extend/raise a part or bolt on a secondary unit (an annex, a
  taller section, a cold-frame, a second tank/tooth). Introduces matured bark-green `b`.
- **t4 — major add.** A prominent new mass (a tower, a big tank/dome, a second drum, a
  grow-wall) lit with bio-luminescent `e/E`. Structure tones deepen to `b`.
- **t5 — crowning feature = final form.** Reads as fully maxed/elite: the signature
  blooms / multiplies, a bio-luminescent canopy/swarm, plus a GOLD (`q`) flourish
  (cresting, trim ring, finials). Still recognizably the same building.

---

## The code pattern (copy this from `greenhouse.py`)

Every builder is refactored the same way so all 10 painters are consistent.

### 1. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form exactly as before (return `c`, do NOT write JSON inside build),
then layer cumulative stages with `if stage >= N`. Each stage is its own helper
`stageN_<name>(c, ...)` drawing geometry with `isobuild` primitives (`Box`, `cylinder`,
`Box.window/louver`, `fill_poly`, `line`, `set`). Painter's order: draw rooftop/overhead
additions AFTER the masses they sit on; **draw a floating/hovering signature LAST** so no
addition can ever occlude it (greenhouse draws the terrarium globe after all stages).

```python
def build(stage: int = 1):
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---
    ...exact original body...
    # --- CUMULATIVE UPGRADE STAGES ---
    if stage >= 2: stage2_<small>(c, ...)
    if stage >= 3: stage3_<structural>(c, ...)
    if stage >= 4: stage4_<major>(c, ...)
    if stage >= 5: stage5_<crowning>(c, ...)
    # --- hovering signature drawn LAST (if any) so it's never occluded ---
    return c
```

### 2. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT
overwrite `{slug}.png`). Stages 2–5 render to the manifest paths via
`render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/biocore"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG        = "<slug>"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": BIO, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/biocore_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                  # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/biocore_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 3. Inspect + iterate (mandatory)
Build a 5-up contact sheet: `art/.venv/bin/python art/montage.py building biocore <slug>`
and READ `art/preview/biocore_<slug>_contact.png`. Verify per stage: the addition is
ON-canvas (clamp every drawn point inside 0..63), does NOT collide with the building's
signature feature, reads clearly at 64px (a FEW clear additions beat many tiny ones),
and the 4 stages form a smooth ramp to a maxed-out `_t5`. Confirm the base PNG is
byte-identical after the run:
```
art/.venv/bin/python art/render_pixel_art.py art/src/buildings/biocore_<slug>.json -o /tmp/s1.png >/dev/null && \
art/.venv/bin/python -c "from PIL import Image,ImageChops as C; a=Image.open('/tmp/s1.png').convert('RGBA'); b=Image.open('apps/web/public/sprites/buildings/biocore/<slug>.png').convert('RGBA'); print('BASE_IDENTICAL', C.difference(a,b).getbbox() is None)"
```

### Pitfalls learned on the Greenhouse (and Volt's Workshop)
- **Off-canvas overshoot:** long masts/beams past x=63 read as flat antennas. Clamp
  endpoints (the grow-tower was clamped at x≈54, fully on-canvas).
- **Mush at small size:** a tiny add can't carry an interior glint band + multiple sash
  bars + sprouts at once — it turns to noise. Keep small additions SIMPLE (a few sash bars +
  one tight `c`/`h` glint stripe on the hinge edge ONLY, not a full reflection wash).
- **A flat plane reads as a shard:** the cold-frame's first version was a single flat
  parallelogram lid and read as a floating glass shard / puddle. It only read as a STRUCTURE
  once it got real volume — a 3-D `b` earth-bed (front wall + right return) + a STEEP-pitched
  lid (LIFT≈7 over a ~9px span) + a closed gable end. Give small additions an actual mass.
- **Dark-on-dark + blend-into-host:** the mid teal `g` (#36cc9e) sinks into the dark bg, and a
  new mass that reuses the host's bright `c` glazing disappears against it. Pull the addition
  into CLEAR ground AND differentiate its tone — the cistern body only read once switched to
  light `c` (reserving `g/G` for its shading); the cold-frame only read as separate once moved
  off the hall AND given a deeper `g/G` body with a hard bright `W` frame.
- **Don't crowd the signature:** place rooftop/sky additions in the EMPTY zones flanking
  it. The t5 spore swarm had to be pushed WIDER than the globe's halo (x±13+) to read as
  discrete motes instead of merging into the halo. Verify the signature's tight bbox is
  byte-identical to base across every stage.
- **Cumulative visibility:** make sure an earlier stage's mass stays VISIBLE at higher
  stages — the t4 tower was anchored BEHIND the t3 cold-frame's back edge so the cold-frame
  still reads in front at t4/t5.
- **Gold that doesn't register:** scattered single-pixel gold studs read as noise and vanish
  against the warm `o` grow-glow. t5's gold only read as PREMIUM once it became CONTINUOUS
  lines — a 2px gold cresting rail along the ridge + a full-length gold eave fascia + a ridge
  finial — with just a couple of bright `O` finial bumps. Reach for continuous gold trim, not
  dots, and keep it OFF the warm-amber zones so it stays distinct.

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add,
t5 = crowning feature + gold flourish. All keep the prior stages. Every building's adds
are UNIQUE (no generic add repeated across buildings).

### 1. greenhouse — *long low twin-pitch glazed gable hall; sig: floating holographic TERRARIUM GLOBE above the ridge* — REFERENCE, SHIPPED
- **t2** small: a chunky RAINWATER CISTERN tank (built with the `cylinder` primitive — domed
  top, lit `c` / shaded `g` curved walls, D hoop bands) standing in the open front-left ground,
  fed by a short eave downspout; one brightened `o` float-gauge dot + a ground contact-shadow.
- **t3** structural: a compact peaked COLD-FRAME propagation box pulled OUT into the clear
  right-side ground (x≈53–63) — a `b` raised earth-bed under a STEEP deeper-teal (`g/G`) glazed
  sash lid with a bright `W` hinge rail, sash bars + seedling dabs (deeper tone + hard frame so
  it reads as its own structure, not the hall's bright-`c` roof glazing).
- **t4** major: a tall HYDROPONIC GROW-TOWER rising behind the cold-frame's back edge on the
  right — a `b` frame stacking glowing `e/E` planter trays with `M/g/G` foliage bushing over the
  lips, climbing above the eave (clamped at x≈54, fully on-canvas).
- **t5** crowning: a BIOLUMINESCENT CANOPY — a vine laces up the grow-tower + a low vine/bud trim
  along the lit eave, an `E`/`e` pollinator-spore swarm drifts up FLANKING the globe (pushed wider
  than its halo), + a `q` GOLD cresting RAIL along the ridge, a GOLD eave-fascia line down the lit
  face, a gold ridge-end finial, and a gold door-head lintel.
- **Palette ramp:** base → `o` gauge (t2) → `b` cold-frame (t3) → `b`+`e/E` grow-tower (t4) →
  `E` spores + `q` cresting rail/fascia (t5).

### 2. wet-lab — *wide low assay hall + central clerestory daylight monitor; sig: long BACKLIT RACK OF BUBBLING ASSAY TEST-TUBES on the left bench window*
- **t2** small: an extra REAGENT-CARBOY shelf + a coil of feed tubing on the lit-left bench
  wall beside the tube rack; brighten one `o` reagent-label LED.
- **t3** structural: a stepped AUTOCLAVE/FUME side-annex bolted to the shaded right wall — a
  low `b` box with a `g` glass port + a small `o/r` vent pipe (extends the bench line).
- **t4** major: a second taller CLERESTORY MONITOR bay raising the roof ridge beside the
  signature scoop, its glazing glowing `e` (more daylight over more benches); `b` chassis.
- **t5** crowning: the assay rack blooms into a FULL AUTOMATED ASSAY WALL — a dense column of
  `E` glowing tubes with a travelling `O` pipette droplet, `q` GOLD rail capping the bench +
  a gold ridge finial.
- **Palette ramp:** `o` LED (t2) → `b` annex (t3) → `e` clerestory (t4) → `E` tube wall +
  `q` rail (t5).

### 3. microscopy-suite — *compact imaging pavilion + rooftop optics-drum turret; sig: tilted EYEPIECE barrel projecting a magnified live-cell HOLOGRAM above the roof*
- **t2** small: a SLIDE-CAROUSEL magazine + a small `c` focus-knob box on the turret drum's
  lit side; brighten the `o` lamp dot in the imaging-bay door.
- **t3** structural: a DARKROOM/SAMPLE-PREP annex abutting the right wall — a windowless `b`
  box with a thin `c` safelight slit (controlled-light prep for the scope).
- **t4** major: a second OPTICS DRUM (cylinder) stepped onto the roof beside the first, capped
  by a glowing `e` confocal-laser dome — a clear new turret mass; cooler `b` tones.
- **t5** crowning: the hologram doubles into a MULTI-CHANNEL CELL ARRAY — two stacked `E`
  cell discs (fluorescence split) with `c` channel sparkles, `q` GOLD rim ring on the optics
  dome + a gold barrel collar.
- **Palette ramp:** `o` lamp (t2) → `b` darkroom (t3) → `e` confocal dome (t4) → `E` channels +
  `q` ring (t5).

### 4. specimen-vault — *solid two-tier setback archive block; sig: floor-to-ceiling BACKLIT SHELF OF GLOWING SPECIMEN JARS on the right face*
- **t2** small: two extra CLIMATE-VENT boxes + a `c` thermometer dial on the lit-left parapet;
  brighten one `o` catalog label on the jar wall.
- **t3** structural: a COLD-STORAGE annex stepped onto the lower base's front-left — a small
  `b` box with a frosted `h/c` door slit + a `o/r` compressor vent (more archive volume).
- **t4** major: a third setback ARCHIVE TIER raised on top (extend the stack upward) with a
  glowing `e` clerestory band of cold light; structure deepens to `b`.
- **t5** crowning: the specimen wall powers fully on — a denser grid of `E` glowing jars each
  with a bright backlight, a `q` GOLD top-light rail + gold parapet caps (premium curation).
- **Palette ramp:** `o` label (t2) → `b` cold-store (t3) → `e` tier glow (t4) → `E` jar wall +
  `q` rail (t5).

### 5. incubation-chamber — *sealed warm pod + frosted humidity dome; sig: CAROUSEL RACK OF GLOWING PETRI DISHES under a heat-lamp, seen through the warm right hatch*
- **t2** small: a second HEATER box + a `c` humidity-dial gauge flanking the dome; brighten
  the `O` warm porthole glow on the right hatch.
- **t3** structural: a CO₂/GAS-BOTTLE lean-to annex on the lit-left footing — a slim `b`
  cabinet with one `cylinder` bottle + a thin feed line into the pod (climate supply).
- **t4** major: a second larger HUMIDITY DOME (stacked `c/h` ellipses) rising beside the first
  with an `e` glowing vapour core — a prominent twin-dome cap; warm `b` massing.
- **t5** crowning: the petri carousel becomes a MULTI-TIER CULTURE STACK — three `E` glowing
  dish rings under a bright lamp bar, a `c/O` target gauge, `q` GOLD gasket trim ring on the
  hatch + a gold dome finial.
- **Palette ramp:** `O` porthole (t2) → `b` gas cabinet (t3) → `e` second dome (t4) → `E`
  culture stack + `q` ring (t5).

### 6. genetics-sequencing-lab — *narrow two-story stepped sequencer tower; sig: rotating DNA DOUBLE-HELIX rising BESIDE the tower*
- **t2** small: an extra column of `c` server-indicator lights + a small `o` reagent-cartridge
  box on the lit-left lower stage; brighten one helix base feed dot.
- **t3** structural: a REAGENT-COOLER annex abutting the tower base — a slim `b` box with a
  frosted `h/c` window + a `o/r` chiller vent (sequencer consumables).
- **t4** major: a SAMPLE-PREP SILO (cylinder) rising beside the tower opposite the helix, with
  a glowing `e` centrifuge window band — a clear new vertical mass; `b` structure deepens.
- **t5** crowning: the helix doubles into a TWIN-HELIX SEQUENCER BRAID with bright `E` read
  rungs + a travelling `O` read-head blip, `q` GOLD railing caps on both tiers + a gold roof
  emitter finial.
- **Palette ramp:** `c` lights (t2) → `b` cooler (t3) → `e` prep silo (t4) → `E` twin-helix +
  `q` caps (t5).

### 7. aquatic-habitat — *tall glass cylindrical water-tank rotunda + left entry annex; sig: living KELP-AND-FISH ECOSYSTEM swirling inside the glass water column*
- **t2** small: a roof-mounted FILTER/SKIMMER box + a `c` water-quality probe pipe arcing into
  the tank cap; brighten the `o` gauge on the entry annex.
- **t3** structural: a QUARANTINE SUMP-TANK annex (a short `cylinder`) abutting the base beside
  the entry annex, its own `c/g` water + a `b` housing collar (a second smaller tank).
- **t4** major: a tall STANDPIPE / PROTEIN-REACTOR column rising alongside the rotunda with a
  glowing `e` UV-sterilizer band + bubbling `h` column — a prominent vertical mass; `b` tones.
- **t5** crowning: the reef inside blooms FULLY — a denser `E`-lit ecosystem (coral bloom,
  bigger fish school, `e` bioluminescent jellyfish), a `q` GOLD cap-ring on the tank rim +
  gold trim on the viewing window.
- **Palette ramp:** `o` probe (t2) → `b` sump tank (t3) → `e` UV column (t4) → `E` reef bloom +
  `q` rim ring (t5).

### 8. field-station — *open-concept L plank cabin + packed-earth court; sig: tall guyed ECO-SENSOR MAST (anemometer + trail-camera + data-pennant) in the courtyard*
- **t2** small: a RAIN-GAUGE + SOLAR-PANEL prop on the back-left plank wing roof + an extra `o`
  ground-anchor lantern at the court edge (more field kit); brighten the lit-bay `O` glow.
- **t3** structural: a lean-to SPECIMEN-DRYING RACK + tarp annex off the right wing — a `b`
  timber frame with hanging `M/g` plant bundles + `d` netting (rustic, plank-consistent).
- **t4** major: a SECOND TALLER MAST / GUYED WEATHER-TOWER rising from the court beside the
  signature mast, carrying a glowing `e` data-uplink dish + stacked sensor booms; `b` frame.
- **t5** crowning: the sensor mast maxes into a FULL TELEMETRY ARRAY — a spinning `E`
  anemometer, an `E` camera-eye, a swarm of `e` data-blip pings + a `q` GOLD pennant and gold
  anchor caps. *(Keep the rustic timber identity — gold only as the pennant/caps.)*
- **Palette ramp:** `o` lantern (t2) → `b` drying rack (t3) → `e` uplink tower (t4) → `E`
  telemetry + `q` pennant (t5).

### 9. behavioral-observation-room — *wide low vivarium hall + single half-hipped roof; sig: VIVARIUM OBSERVATION WINDOW with a tracked critter + glowing MOTION-PATH + heat-map*
- **t2** small: a second roof CAMERA POD + an IR `c` floodlight on the hip slope, both aimed
  into the enclosure; brighten one `o` interior glow pip on the window frame.
- **t3** structural: an OBSERVER ANTEROOM annex on the shaded right wall — a small `b` box with
  a one-way `g` glass slit + a `o/r` HVAC vent (the watchers' room, extends the hall).
- **t4** major: a raised ENCLOSURE-CANOPY mezzanine over the back of the hall — a `b`-framed
  mesh box with a glowing `e` UV/day-cycle light bar lighting a taller habitat; `b` massing.
- **t5** crowning: the tracking goes FULL AI — the habitat fills with `E` glowing motion-paths
  + predicted-step ghosts + a dense `e` heat-map, a `c/O` multi-subject readout, `q` GOLD trim
  on the observation window + a gold ridge finial.
- **Palette ramp:** `c` floodlight (t2) → `b` anteroom (t3) → `e` canopy light (t4) → `E`
  motion-paths + `q` window trim (t5).

### 10. bioinformatics-suite — *sleek low glass pavilion, stepped ziggurat of planted green-roof terraces + atrium penthouse; sig: hovering holographic GENOME RING (Circos chord plot)* — PREMIUM CAPSTONE
- **t2** small: extra PLANTER TROUGHS of `M/O` blooms + a `c` data-light strip along the mid
  terrace parapet; brighten one `o` atrium light (the cleanest, most premium small add).
- **t3** structural: a SERVER/COMPUTE annex tucked under the lowest terrace setback — a louvered
  `Box.louver` box venting faint `g`, with a `b` housing (the genome math has to run somewhere).
- **t4** major: a fourth GREEN-ROOF TERRACE tier raised on the ziggurat (extend the setback
  stack upward) — a planted parapet + a glowing `e` grow-lit atrium band; cool `b` deepens.
- **t5** crowning: the genome ring doubles into a TWIN-RING / DUAL-CIRCOS CLUSTER with bright
  `E` chord arcs leaping between them + a travelling `O` blip, a soft `e` halo, and a `q` GOLD
  trim ring on the atrium + gold terrace-edge cresting (the set's premium maxed flourish).
- **Palette ramp:** `o` blooms (t2) → `g` server vents (t3) → `e` terrace grow-light (t4) →
  `E` twin-ring chords + `q` trim ring (t5).

---

## Worked reference — Greenhouse (already shipped, sets the bar)
*Form: long low twin-pitch glazed gable hall; sig: floating holographic terrarium globe above the ridge.*
- **t2** rainwater cistern TANK (cylinder, domed top + hoop bands) + eave downspout + ground
  contact-shadow, front-left ground (small functional add).
- **t3** peaked cold-frame propagation box pulled out into the clear right ground — `b` earth-bed
  + a steep deeper-`g` glazed sash lid with a bright `W` hinge (structural add).
- **t4** tall hydroponic grow-tower of glowing `e/E` planter trays rising behind the cold-frame (major).
- **t5** bioluminescent canopy — vine up the tower + lit eave, an `E`/`e` spore swarm flanking the
  globe, a gold ridge-CREST RAIL + gold eave fascia + gold ridge-end finial + a gold door lintel
  (crowning + gold flourish). Gold is CONTINUOUS lines (rail + fascia), not scattered studs.
- Verified: all stages fully on-canvas (bbox within 0..63); the terrarium globe's tight bbox is
  byte-identical to base across every stage (signature never occluded); base `greenhouse.png`
  unchanged (`BASE_IDENTICAL True`).
- Files: `greenhouse_t2..t5.png` rendered + previewed under
  `apps/web/public/sprites/buildings/biocore/`; JSON under `art/src/buildings/biocore_greenhouse{,_t2..t5}.json`.
