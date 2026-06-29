# TerraBase Lab — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for all 10 TerraBase economy buildings, plus
the **canonical code pattern** every painter must follow (proven on `sampling-station.py`,
the reference implementation). Read `UPGRADE_EVOLUTION.md` first for the rules; this
file says *what to add per building* and *how to wire it in*.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions match
that building's signature/role), and the **footprint base never moves** — grow UP and OUT
from the existing form. Stage 1 must stay byte-identical to the shipped `{slug}.png`. Gold
(`q`) is a **t5 flourish only**, never a whole-building recolor.

TerraBase is the warm **expedition / field-geology camp** lab: weathered heavy timber,
packed-earth pads, canvas tarps, ochre survey markers, mineral-teal scanner glows. The
evolution theme across the whole lab is **a lone field outpost maturing into a fully
instrumented, surveyed, powered research basecamp** — more survey/sampling gear, then a
structural field annex, then a prominent dig/sensing mass, then a glowing geo-data /
contour-map crown with gold survey trim.

---

## The evolved-accent palette (reused by all 10 buildings)

Keep each builder's base `TERRA` keys (`K W L M D d  h c g G  o O r`) and add ONLY these
four evolved-accent keys (chars NOT in the base palette, so they appear in no stage-1
sprite and the base PNG is unchanged). **Identical keys+hexes lab-wide** for consistency:

```python
TERRA = { ...base keys... ,
    "b": "#3a3326",   # deep basalt/bedrock — matured warm structure tone for t4+ new masses
    "e": "#5fe0c4",   # energized mineral-seismic glow (mid)   — t4/t5 power
    "E": "#c4fff0",   # energized mineral-seismic glow (bright)
    "q": "#f3c63a"}   # premium survey gold — t5 flourish ONLY
```

`b` is a deepened **warm earth/basalt** tone (not a cool steel — it stays in TerraBase's
earthy mood); `e/E` are an **energized mineral-seismic teal** that intensifies the base
`g/G/c/h` scanner family for powered cores, glowing water, seismic arcs and holo data;
`q` is survey gold for the t5 flourish only. A building may add at most ~1 of its own
extra hues if its theme truly needs it (e.g. a hot magma orange for deep-earth-observatory),
but prefer reusing `b/e/E/q`. Evolved keys appear ONLY in stage2+ helpers.

### The evolution language (intensity ramp), tuned to TerraBase

- **t2 — small functional add.** One modest, on-theme survey/sampling element: staked
  geophones, a probe, a marker, a small intake, a gauge cluster. Base palette; you may
  brighten an `o/O` survey light or add a faint `c` sensor glint. Subtle but noticeable.
- **t3 — structural add.** A real new structural mass that abuts/extends the form: a
  timber field annex, a covered rack/lean-to, a repeated roof bay, a side tank/bath.
  First use of the deepened structure tone `b` (posts / underside shadow).
- **t4 — major add.** A prominent new mass: a derrick/pylon/tower, a big tank or dish,
  a gantry, a stacked column. Palette matures — deep basalt `b` masses + an energized
  `e/E` mineral glow on the working part (raised core, glowing water, charged sensor).
- **t5 — crowning feature = final form.** Reads fully maxed/elite: a glowing geo-data /
  contour-map / orbital crown, an energy arc, a powered array — plus **gold `q` survey
  trim** (banner / pennant / corner caps / a single gold marker) as the only-here
  flourish. Still recognizably the same building, just maxed out.

---

## The code pattern (copy this from `sampling-station.py`)

Every builder is refactored the same way so all 10 painters are consistent.

### 1. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form EXACTLY as before (return the Canvas; do NOT write JSON inside
`build`), then layer cumulative stages with `if stage >= N`. Each stage is its own helper
`stageN_<name>(c, ...)` drawing geometry with `isobuild` primitives (`Box`, `cylinder`,
`Box.window/louver`, `fill_poly`, `line`, `set`). Painter's order: draw rooftop/overhead
additions AFTER the masses they sit on so nearer/higher things occlude correctly. If a
building's **signature hovers/sits in the open** (sampling-station's scanner ring, the
hovering orbs/rings), draw the upgrade stages BEFORE the signature so nothing occludes
the hero — `sampling-station.py` draws the stages then `cataloguing_signature` LAST.

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
    # (signature LAST if it hovers in the open)
    return c
```

### 2. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT overwrite
`{slug}.png`). Stages 2–5 render to the manifest paths via `render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/terrabase"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG        = "<slug>"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": TERRA, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/terrabase_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                   # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/terrabase_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 3. Inspect + iterate (mandatory)
Run the builder, then verify stage-1 is byte-identical to the shipped base PNG:
```
art/.venv/bin/python art/render_pixel_art.py art/src/buildings/terrabase_<slug>.json -o /tmp/s1.png >/dev/null && \
art/.venv/bin/python -c "from PIL import Image,ImageChops as C; a=Image.open('/tmp/s1.png').convert('RGBA'); b=Image.open('apps/web/public/sprites/buildings/terrabase/<slug>.png').convert('RGBA'); print('BASE_IDENTICAL', C.difference(a,b).getbbox() is None)"
```
Build the 5-up contact sheet and READ it: `art/.venv/bin/python art/montage.py building terrabase <slug> --scale 6`.
Per stage confirm: the addition is ON-canvas (zero opaque pixels on x∈{0,63}/y∈{0,63}),
does NOT collide with the signature, reads clearly at 64px (a FEW clear additions beat
many tiny ones), and the 4 stages form a smooth ramp to a maxed-out `_t5`.

### Pitfalls learned (volt-lab Workshop + terrabase Sampling-Station)
- **Off-canvas overshoot:** long masts/beams shooting past x=63 read as flat antennas.
  Clamp every endpoint inside 0..63 (the derrick apex is clamped `y>=4`, feet `x<=61`).
- **Detached rooftop blobs:** a dish/coil placed too far out looks unmoored — anchor
  crowning features ON a roof point of the host mass with a visible plinth/mast.
- **Re-anchoring across stages:** if t5 references a t4 part (gold band on the derrick
  crown), recompute it from the SAME source (a shared `_geom()` helper or the same
  `roof_pt(u,v)` + offsets) — never hardcode a second guess.
- **A fully-occupied base has no empty interior.** Sampling-station's court is packed,
  so small t2 props placed *in* it vanished. Lessons: place each stage in a DIFFERENT
  zone (front-apron / left flank / right flank / top margin) so adds never stack into
  mush and each stays individually legible; give small ground props strong value contrast
  (lit `M/L` legs on dark understory, or dark legs on the bright apron); push tall masses
  up into the clear TOP margin where they read as silhouettes.

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add, t5 = crowning
feature + gold flourish. All keep the prior stages. Every building's adds are **UNIQUE**
(no generic add shared across buildings) and grow from THIS building's own theme.

### 1. sampling-station — *open timber/tarp field depot; sig: rock/soil clod hovering & rotating in a mineral-teal scanner ring, fanning holographic ID tags* — REFERENCE (built)
- **t2** small: a cluster of **seismic geophone / soil-probe stakes** on the bright front-
  right apron — three short timber stakes (lit `M`, `K` feet) with reflector tips + one
  ochre survey flag, wired by a thin `d` sensor cable. Brightened `O`/`h` tip glint.
- **t3** structural: a **specimen drying-rack lean-to** bolted onto the LEFT wing — a
  slatted timber roof plane on two `b` posts, hung with small `M`-framed sieve/screen
  trays (one catching a faint `c` glint). First `b`.
- **t4** major: a tall **core-drill derrick** rising off the right pad — a tapered trussed
  tower (basalt `b` legs, `M` upper girts) whose top clears the tarp, a crown sheave
  winching a glowing mineral **core-sample tube** (`e` body, `E` cap) up out of a borehole.
- **t5** crowning: a **geo-survey mapping array** — an uplink dish on the right-wing roof
  beaming a hovering holographic **contour/terrain map** over the ridge (`e` fill, `E`
  grid, `e` contour rings) + **gold** survey trim (gold pennant, `q` kerb caps, gold
  derrick-crown cap, a gold survey-peak marker on the map).
- **Palette ramp:** base → `O`/`h` glint (t2) → `b` rack (t3) → `b`+`e/E` derrick core (t4)
  → `E` contour map + `q` survey trim (t5).

### 2. seismograph-array — *low timber block, flat roof; sig: rooftop teal seismic drum-disc with a glowing waveform-ring + recording pen/needle and a swung pendulum mass; copper ground-rod legs*
- **t2** small: a second **recording-drum + pen** beside the signature disc — a small
  `c`-glow paper drum on a post with an `o` ink-pen tick (more traces being logged); add
  one brighter `O` event-LED on the roof rim.
- **t3** structural: a **buried vault annex** stepped off the shaded side — a low half-sunk
  `b` concrete instrument bunker with a slatted `Box.louver` vent and a `g` status slit
  (houses the seismometers). New `b` mass.
- **t4** major: a tall **strong-motion sensor mast** rising from a roof corner carrying
  stacked **glowing `e` accelerometer pods** + guy-wires, with a swinging `e` pendulum-
  bob below it; deep `b` mast. (A mast/pods, NOT a derrick — distinct from sampling-station.)
- **t5** crowning: the rooftop disc erupts into a **live seismic wavefield** — concentric
  `E` shock-rings radiating outward across the roof with a bright `E` epicentre flash and
  a jagged `e` seismograph trace, ringed by `q` **gold** corner bosses + a gold ridge band.
- **Palette ramp:** `O` LED (t2) → `b` vault (t3) → `e` accel pods (t4) → `E` wavefield +
  `q` bosses (t5).

### 3. weather-monitoring-post — *tall stilted/legged tower hut; sig: tethered weather BALLOON on a line + a teal forecast billboard/screen with a gold sun*
- **t2** small: a **tipping-bucket rain gauge + anemometer cup-cross** clamped to a stilt-
  leg rail — a small `M` funnel + `K`/`o` cups on a short arm; brighten one `O` panel LED
  on the forecast screen.
- **t3** structural: a **stilt-level instrument deck** — a railed `b` timber platform built
  out between the legs under the hut (extends the structure downward/outward) carrying a
  louvered Stevenson-screen box (`Box.louver`). New `b` mass.
- **t4** major: a second, larger **sounding balloon + winch drum** — a big `L` balloon on a
  taut `e`-lit tether reeling off a `b` winch on the deck, plus a glowing `e` radiosonde
  pod slung beneath it (the post now launches soundings). (A balloon/winch, unique.)
- **t5** crowning: the forecast billboard becomes a **full glowing weather-map wall** — an
  `E` synoptic isobar/front map with pulsing `e` storm cells, twin balloons aloft, and a
  `q` **gold** sun-and-vane finial + gold screen trim.
- **Palette ramp:** `O` LED (t2) → `b` deck (t3) → `e` sounding balloon (t4) → `E` weather-
  map + `q` sun finial (t5).

### 4. geological-core-lab — *long low timber shed; sig: a long horizontal core-sample rack of laid-out drill cores + a small front reader*
- **t2** small: an extra **labelled core tray + a hand-lens loupe** added at the rack's
  open end — one more `r/M` core segment in a `D` tray with `o` label tags; a small `c`
  loupe glint at the reader.
- **t3** structural: a **covered core-store annex** abutting the shaded end — a low `b`
  timber lean-to roof over additional stacked core boxes (extends the rack lengthwise),
  with a `K` plank skirt. New `b` mass.
- **t4** major: a **rooftop split-core scanner gantry** — a `b` bridge beam traversing the
  rack on rails, lowering a glowing `e` CT/XRF scan-head that lights the core beneath it
  with an `e` analysis glow (the cores are now being logged). (A scan gantry, distinct
  from the sampling-station derrick.)
- **t5** crowning: a **glowing stratigraphic-column hologram** rises over the rack — a tall
  banded `E` core-log column with `e` mineral-zone bands and depth ticks, + `q` **gold**
  rack rails and a gold "type-section" plaque.
- **Palette ramp:** `c` loupe (t2) → `b` core-store (t3) → `e` scan-head (t4) → `E` strat
  hologram + `q` rails (t5).

### 5. hydrology-bay — *timber block + front water flume/channel; sig: a teal-water flume with flowing water, a rooftop cistern tank + a tall gauge mast*
- **t2** small: a **stilling-well float gauge + staff** in the flume — a slim `b` tube with
  a bright `c` water-level float and an `o`/`K` graduated staff; one extra `h` ripple glint
  on the water.
- **t3** structural: a **second settling-tank bath** abutting the flume — a low `b`-walled
  open basin with a glazed `g` water surface and a weir lip spilling into the channel.
  New `b` mass.
- **t4** major: a **rooftop water-tower cistern + feeder pipe** — a tall `cylinder` tank on
  `b` legs with a glowing `e` level-window, feeding a pipe that pours a bright `e/E` water
  jet down into the flume (the bay now circulates water). (A water tower, unique.)
- **t5** crowning: the flume becomes a **glowing hydro-flow model** — an `E` streamline
  current map shimmering down the channel with `e` turbine/eddy nodes and a small spinning
  `e` flow-turbine, + `q` **gold** weir caps and a gold gauge-mast finial.
- **Palette ramp:** `c` float (t2) → `b` settling tank (t3) → `e` cistern jet (t4) → `E`
  flow model + `q` weir caps (t5).

### 6. atmospheric-sensor-array — *clustered tall sampling-column towers on a base; sig: the cluster of vertical atmospheric sampling columns with teal intake bands + gold tips*
- **t2** small: a ring of **small intake cyclones + a wind-vane** around the column feet —
  two stubby `M` cyclone cans with `c` intake glints and a tiny `o` direction vane on the
  base rim; brighten an `O` sample-active light.
- **t3** structural: a **gas-bottle / calibration annex** abutting the base — a `b` housing
  with two slim upright `cylinder` calibration-gas bottles and a slatted `Box.louver` vent
  feeding the columns. New `b` mass.
- **t4** major: one **extra, TALLER sampling column** added to the cluster, capped with a
  glowing `e` aerosol-analyzer head and stepped `e` intake bands climbing it — the array
  literally grows a new spire; `b` column body. (Extends ITS OWN column motif, not a derrick.)
- **t5** crowning: a hovering **glowing air-quality plume model** crowns the cluster — an
  `E` particulate/isopleth cloud with drifting `e` aerosol nodes and a `e` lidar beam
  lancing up from the tallest column, + `q` **gold** column-tip caps and a gold trim ring.
- **Palette ramp:** `c` cyclones (t2) → `b` gas annex (t3) → `e` new column (t4) → `E`
  plume model + `q` tip caps (t5).

### 7. soil-analysis-lab — *long low greenhouse-ish shed; sig: rooftop soil-sample garden / tray bed with teal sprout-probe rows + front glazed sample windows*
- **t2** small: a few extra **soil-moisture probe spikes + a pH flag-marker** in the tray
  bed — slim `K` spikes with `c` sensor tips bedded among the rows + one `o` marker flag;
  brighten a `c` tray glow.
- **t3** structural: a **cold-frame / propagation annex** stepped off the lit side — a low
  slanted-glass `b`-framed frame box (repeated `window` glaze with a `g` interior glow)
  extending the grow-shed. New `b` mass.
- **t4** major: a **rooftop hydroponic rack tower** — a stepped `b` A-rack of glowing `e`
  nutrient-tray shelves rising over the bed with a feeder manifold (vertical farming of
  samples); cooler `b` framing. (A grow-rack tower, distinct from the drying-rack lean-to.)
- **t5** crowning: the tray bed becomes a **glowing soil-spectrum / root-network canopy** —
  a dense `E` nutrient-grid lattice with pulsing `e` root nodes and a bright `E` analysis
  bloom, + `q` **gold** bed rails and a gold seed-vault medallion.
- **Palette ramp:** `c` probes (t2) → `g` cold-frame (t3) → `e` hydro tower (t4) → `E` root
  canopy + `q` rails (t5).

### 8. remote-sensing-hub — *block building; sig: a big elliptical orbit/scan RING hovering over a rooftop sensor mast*
- **t2** small: an **extra whip antenna + a `c` data-light ring** clipped to the mast — a
  thin `K` whip with an `o` tip beacon and a faint `c` telemetry-bead ring on the drum rim;
  brighten one orbit-ring node.
- **t3** structural: a **ground-station dish annex** abutting the shaded wall — a `b`-housed
  bay carrying a tilted `L/D` parabolic dish (small ellipse cup) aimed up, with a `g` feed
  glint. New `b` mass.
- **t4** major: a **second, larger inclined scan-ring** crossing the first — a wide `e`-lit
  orbital ring at a different tilt sweeping the rooftop mast, with a glowing `e` sensor pod
  riding it (a denser sensing constellation); deep `b` mast collar. (Extends ITS OWN ring
  motif — distinct from remote-sensing kept unique vs climate-modeling's orbs.)
- **t5** crowning: the rings resolve into a **glowing global-coverage swath** — a bright
  `E` ground-track lattice with traveling `e` data pulses arcing between rings and a
  pulsing `E` downlink node, + `q` **gold** dish rim and a gold antenna finial.
- **Palette ramp:** `c` data ring (t2) → `b` dish bay (t3) → `e` second ring (t4) → `E`
  coverage swath + `q` dish rim (t5).

### 9. climate-modeling-station — *block building; sig: a hovering teal globe/orbital climate model with traveling pulse nodes + a gold node, over a rooftop dish-dimple*
- **t2** small: an **extra orbital satellite bead + a `c` ring** on the globe — one more
  small `c/h` node on a thin orbit arc and a faint `c` equatorial band; brighten one
  pulse node to `O`. (Augments the hovering model subtly.)
- **t3** structural: a **server-blade compute annex** abutting the drum — a slim `b`-housed
  box of louvered (`Box.louver`) blade bays glowing faint `g` (the model needs compute).
  New `b` mass.
- **t4** major: a **rooftop cooling-tower + radiator bank** — a `cylinder` chiller stack on
  `b` legs venting an `e` cooling halo beside a finned `e`-glow radiator wall (cooling the
  compute); cool `b` tones deepen. (A cooling plant, distinct from any other building.)
- **t5** crowning: the globe **doubles into a twin-hemisphere climate model** — two linked
  `E` globes (atmosphere + ocean) with bright `E` circulation pulses and `e` jet-stream
  arcs sweeping between them, + a `q` **gold** orbit ring and a gold model armature.
- **Palette ramp:** `c` orbit bead (t2) → `g` blade annex (t3) → `e` cooling halo (t4) →
  `E` twin-globe model + `q` orbit ring (t5).

### 10. deep-earth-observatory — *tall stepped pyramidal drilling-pylon tower; sig: the pyramid pylon with a glowing magma/core light at its base + teal core windows; gold tip*
- **t2** small: a ring of **guy-anchor stays + a `c` strain-gauge readout** at the pylon
  base — three taut `d` cable stays pinned to `K` ground anchors with `o` tensioner nuts
  and a small `c` gauge panel; brighten the base core light a touch warmer.
- **t3** structural: a **drill-mud / sample shed annex** abutting the base — a low `b`
  timber shed with a `K`-skirted plank wall and a `g`-glow mud-tank window (services the
  bore). New `b` mass.
- **t4** major: a **lattice headframe + hoist cage** straddling the pylon foot — a `b`
  trussed winding-tower with a glowing `e` core-cage rising on cables out of the shaft,
  intensifying the pylon's own deep-drilling read; warm magma `o→O` at the shaft mouth +
  `e` cage glow. (Grows ITS OWN drilling tower — NOT the sampling-station derrick: this is
  a mine headframe + cage over the existing pyramid.)
- **t5** crowning: the shaft **erupts into a glowing geothermal / deep-core column** — a
  bright `E` energy column lancing up the pylon's spine with `e` strata-band rings and a
  pulsing magma `O` core at the base, + `q` **gold** pylon-edge caps and a gold apex
  beacon (the observatory at full power). *(May add one hot `#ff8a3a`-ish magma orange if
  the base palette's `o/O` reads too cool at the shaft — prefer reusing `o/O` first.)*
- **Palette ramp:** `c` strain gauge (t2) → `g` mud shed (t3) → `e/o` headframe cage (t4)
  → `E` geo-core column + `q` apex beacon (t5).

---

## Worked reference — Sampling-Station (built & verified)
*Form: open timber/tarp field depot; sig: rock hovering in a mineral-teal scanner ring
fanning holographic ID tags.*
- **t2** seismic geophone/soil-probe stakes on the front-right apron (small functional add).
- **t3** specimen drying-rack lean-to on `b` posts bolted to the left wing (structural add).
- **t4** tall tapered core-drill derrick winching a glowing `e/E` core tube up a borehole
  (major add).
- **t5** geo-survey mapping array — uplink dish beaming a hovering `E` contour map over the
  ridge — + gold pennant / kerb caps / derrick-crown cap / survey-peak marker (crowning).
- Stage 1 verified **BASE_IDENTICAL True**; every stage fully on-canvas (0 edge pixels).
- Files: `art/src/buildings/terrabase_sampling-station{,_t2..t5}.json`,
  `apps/web/public/sprites/buildings/terrabase/sampling-station_t2..t5.png`,
  contact sheet `art/preview/terrabase_sampling-station_contact.png`.
