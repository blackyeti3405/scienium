# Axiom Lab — building upgrade-evolution plan

Per-building 4-stage (`_t2.._t5`) plan for the 10 Axiom Lab economy buildings, plus
the **canonical code pattern** every painter must follow (proven on
`chalkboard-room.py`, the Axiom reference implementation). Read `UPGRADE_EVOLUTION.md`
first for the rules; this file says *what to add per building* and *how to wire it in*.

Stages are **cumulative** (each keeps the prior additions), **on-theme** (additions
match that building's signature/role), and the **footprint base never moves** — grow
UP and OUT from the existing form. Stage 1 must stay byte-identical to the shipped
`{slug}.png`. Gold (`q`) is a **t5 flourish only**, never a whole-building recolor.

Axiom's mood is **cosmos / theory / mathematics** — deep midnight-indigo steel, cyan
night-sky glass, and warm **starlight-gold** that reads as *glowing knowledge/energy*
(equations, constellations, QED boxes, qubit cores). So the Axiom evolution language
ramps each building from a humble closed form into a **maxed-out theory institute /
observatory**: study annexes and cryo-reservoirs grow into beacon/projector towers
that finally bloom a glowing **constellation / lattice / orb-cloud**, gold-crowned.

---

## The Axiom evolution language (intensity ramp)

- **_t2 — small functional add.** One modest, on-theme element: an extra skylight /
  vent / detector puck / mirror relay / antenna + a brightened `o`/`c` glow node.
  Palette = base Axiom palette; you may brighten the accent. Subtle but noticeable.
- **_t3 — structural add.** A real new mass bolted on or raised: a rooftop penthouse,
  a sub-drum reservoir, a shielding annex, an extra terrace tier, a colonnade skirt.
  Introduce the deepened structure tone `b` on the new mass so it reads as matured.
- **_t4 — major add.** A prominent new vertical mass: a beacon / projector / dish /
  collimator / cryo-line **tower or gantry** with a glowing **quantum-stellar core**.
  Palette matures — `b` armature + energized `e`/`E` glow (cooler/brighter than the
  base `g/c`). This is the silhouette-changing "axiom engine" of the building.
- **_t5 — crowning feature = final form.** The building's hero theme **completes and
  illuminates**: a glowing **constellation / lattice / cosmic-web / orb-cloud** blooms
  above the t4 tower (cast by it, so it never floats unmoored), and premium **GOLD**
  trim dresses it — a gold finial, a gold band/ring on the tower, a gold pediment /
  marquee / banner. Reads elite, still unmistakably the same building.

## Evolved-accent palette (LAB-WIDE — reused by all 10 Axiom buildings)

Keep the shared `AXIOM` keys, and add ONLY these four evolved accents (they appear in
no stage-1 sprite, so every base PNG is unchanged). These exact chars+hexes are the
Axiom-wide convention for consistency across the whole lab:

```python
AXIOM = { ...base keys (K W L M D d  h c g G  o O r)... ,
    "b": "#2a3158",   # deep indigo steel — matured structure tone for t3+ new masses
    "e": "#7ad0ff",   # quantum-stellar glow (mid)   — t4/t5 energy (cooler/brighter than g/c)
    "E": "#cdeeff",   # quantum-stellar glow (bright) — stellar flare / core
    "q": "#f6c945"}   # premium gold trim — t5 flourish ONLY (richer than the base o)
```

A building may add at most ~1 of its own extra hue if its theme strictly needs it,
but prefer reusing `b/e/E/q` so the lab stays cohesive.

---

## The code pattern (copy this from `chalkboard-room.py`)

Every builder is refactored the same way so the 10 painters are consistent.

### 1. `build()` → `build(stage: int = 1)` returning the Canvas
Compose the base form exactly as before (return the Canvas; do NOT write JSON inside
`build`), then layer cumulative stages with `if stage >= N`. Each stage is its own
helper `stageN_<name>(c, ...)` drawing geometry with `isobuild` primitives (`Box`,
`cylinder`, `Box.window/louver`, `fill_poly`, `line`, `set`). Painter's order: draw
rooftop/overhead additions AFTER the masses they sit on. **If a building's hero
signature floats high (a hovering grid/orb/cosmic-web), re-draw the signature LAST**
at every stage (as chalkboard-room does with the slate) so the hero always reads in
front of the new structure.

```python
def build(stage: int = 1):
    c = Canvas()
    # --- BASE FORM (stage 1, unchanged) ---  (compose exactly as before, return c)
    ...
    if stage >= 2: stage2_<small>(c, ...)
    if stage >= 3: stage3_<structural>(c, ...)
    if stage >= 4: stage4_<major>(c, ...)
    if stage >= 5: stage5_<crowning>(c, ...)
    # --- re-draw a high-floating hero signature LAST so it stays in front ---
    return c
```

Share one tiny `_loft_box(...)` / anchor helper so t3/t4/t5 recompute the SAME mass
(no hardcoded second guesses — the volt gantry-banner re-anchoring pitfall).

### 2. `emit(stage)` + `build_all()` — write JSON, render PNG + preview
Stage 1 re-emits only the JSON (it must keep matching the shipped PNG — do NOT
overwrite `{slug}.png`). Stages 2–5 render to the manifest paths via
`render_pixel_art.py`:

```python
SRC_DIR     = "/path/to/scienium/art/src/buildings"
PNG_DIR     = "/path/to/scienium/apps/web/public/sprites/buildings/axiom"
PREVIEW_DIR = "/path/to/scienium/art/preview"
SLUG        = "<slug>"

def emit(stage):
    c = build(stage)
    spec = {"width": 64, "height": 64, "palette": AXIOM, "rows": c.rows()}
    suffix = "" if stage == 1 else f"_t{stage}"
    src = f"{SRC_DIR}/axiom_{SLUG}{suffix}.json"
    json.dump(spec, open(src, "w"), indent=0)
    if stage == 1:
        return                                  # base PNG untouched
    subprocess.run([sys.executable,
        "/path/to/scienium/art/render_pixel_art.py", src,
        "-o",        f"{PNG_DIR}/{SLUG}{suffix}.png",
        "--preview", f"{PREVIEW_DIR}/axiom_{SLUG}{suffix}.png"], check=True)

def build_all():
    for s in (1, 2, 3, 4, 5): emit(s)

if __name__ == "__main__": build_all()
```

### 3. Inspect + iterate (mandatory)
Verify stage-1 is byte-identical to the shipped base, then build a 5-up contact sheet
and READ it:

```
art/.venv/bin/python art/render_pixel_art.py art/src/buildings/axiom_{SLUG}.json -o /tmp/s1.png >/dev/null && \
art/.venv/bin/python -c "from PIL import Image,ImageChops as C; a=Image.open('/tmp/s1.png').convert('RGBA'); b=Image.open('apps/web/public/sprites/buildings/axiom/{SLUG}.png').convert('RGBA'); print('BASE_IDENTICAL', C.difference(a,b).getbbox() is None)"
art/.venv/bin/python art/montage.py building axiom {SLUG}
```

Per stage, confirm: addition is ON-canvas (clamp inside 0..63), does NOT collide with
the building's signature, reads clearly at 64px (a FEW clear additions beat many tiny
ones), and the 4 stages form a smooth ramp to a maxed-out `_t5`.

### Pitfalls learned on the Axiom reference (Chalkboard Room)
- **Anchor on the open deck, not behind the roofline.** A rooftop add seated toward
  the BACK apex (`roof_pt(u, ~0.9)`) sits low and half-occluded — it reads as clutter,
  not a storey. Seat penthouses/towers in the visible RIGHT WEDGE of the deck so their
  base rests on the deck surface and they rise in clear sky.
- **Clear the hero's bounding box.** The slate hero occupies the upper-CENTER
  (x≈20..43, y≈0..24). All adds anchor `roof u ≥ 0.62` (right of the slate); the
  beacon shaft sits at x≈46 so its lantern + orbit clear the slate's right edge.
- **Fine rings don't read at 64px.** Three nested armillary ellipses became a dot-
  cloud "sparkler". Use ONE bold tilted orbital ring around a clear `E/e` core diamond
  instead — legible, still "an orrery".
- **Constellations = bright nodes loosely joined, not a solid wire.** Draw the links
  DOTTED (every other pixel) and the nodes as little `E` crosses, or the arc reads as
  a hook. Cast it from a projector beam off the tower so it never floats unmoored.
- **Re-anchor from the SAME source.** t4 and t5 both recompute the loft/beacon from
  one shared `_loft_box(hall)` — never hardcode a second guess for the tower top.

---

## Per-building plans (slug · signature feature · 4 cumulative adds · palette ramp)

For each: t2 = small functional add, t3 = structural add, t4 = major add,
t5 = crowning feature + gold flourish. All keep the prior stages. Every building's
adds are UNIQUE — no generic add is reused across buildings.

### 1. chalkboard-room — *wide low lecture hall; sig: tilted self-writing SLATE EASEL (gold proof + QED) on the roof, upper-centre* — **REFERENCE, shipped**
- **t2** small: a glowing **study SKYLIGHT prism** (cyan glass in a K curb + an `o`
  proof-glow node) on the BACK-RIGHT deck, clear of the slate.
- **t3** structural: a raised **READING-LOFT penthouse** (a 2nd-storey `Box`, `b` base
  band, lit `M`/`L`, a tall cyan clerestory study window) sitting ON the right wedge.
- **t4** major: a tall **PROOF-BEACON tower** off the loft roof — slim `b`/`M` shaft +
  mid-shaft collar carrying a glowing `E`/`e` quantum core LANTERN inside ONE bold
  tilted orbital ring (the "axiom engine").
- **t5** crowning: the beacon PROJECTS a **THEOREM CONSTELLATION** — bright `E` stellar
  nodes on dotted `g`/`G` links sweeping up-right — energized `e` orbit ring, a `q`
  gold STAR FINIAL crowning the lantern + a `q` gold PEDIMENT plaque over the door.
- **Palette ramp:** base → `o`/`c` skylight (t2) → `b` loft (t3) → `b`+`e`/`E` beacon
  (t4) → `E` constellation + `q` finial/pediment (t5).

### 2. computation-cluster — *long low server hall + back-right COOLING-TOWER cylinder; sig: shaded-right glass wall over a glowing immersion GPU blade rack with a green→gold heat-sweep*
- **t2** small: a rooftop **DUST-CYCLONE / HVAC collector** can + short ducting on the
  louvered roof deck (away from the GPU wall) + a brighter `o` PSU status LED.
- **t3** structural: a **second smaller COOLING-TOWER cylinder** abutting the first at
  the back-right (a stepped twin drum, `b` shell, a `c` fan-grille cap) — extends the
  existing tower language without touching the hero wall.
- **t4** major: a rooftop **CHILLED-WATER ARRAY** — a low `b` skid carrying two
  glowing `e` coolant manifolds + a heat-exchanger block raising the roofline, with an
  `E` coolant-glow window (the cluster now sheds serious heat).
- **t5** crowning: a glowing **DUAL-CORE COMPUTE HALO** — twin `E` torus rings of
  light hovering over the roof linked by an `e` data arc (the optimization "balanced"
  across both cores), `q` gold rack-rails along the GPU-wall sill + a `q` gold cap on
  the lead cooling tower.
- **Palette ramp:** `o` LED (t2) → `b` twin drum (t3) → `b`+`e` chillers (t4) → `E`
  halo + `q` rails (t5).

### 3. particle-physics-bench — *open-concept L/^ yard; sig: benchtop CLOUD CHAMBER (glass dome + curling cosmic-ray tracks + flash) standing in the open yard, with an "IDENTIFIED" tag*
- **t2** small: a **second detector PUCK** on a short post at the yard edge + a `c`
  dosimeter readout + one brighter `O` track-flash spark (more apparatus, no crowding).
- **t3** structural: a **radiation SHIELDING blast-wall annex** — a low thick `b`
  concrete wall block bolted to the back-RIGHT (HV) wing, with `o`/`K` hazard-stripe
  caps (shields the hot side; reuses the yard's hazard motif).
- **t4** major: an overhead **BEAM-COLLIMATOR GANTRY** straddling the yard — a `b`
  lattice arch on two legs carrying a glowing `e` beam-line aimed DOWN at the chamber
  (the bench now takes a real particle beam), fully on-canvas, clear of the dome.
- **t5** crowning: a **PARTICLE-COLLISION BURST** blooms above the chamber — a radial
  `E`/`e` spray of track-jets from a bright `E` vertex (the event the bench fires),
  `q` gold "PARTICLE BENCH" banner on the wings + `q` gold field-ring on the chamber.
- **Palette ramp:** `c`/`O` puck+spark (t2) → `b` shield wall (t3) → `b`+`e` gantry
  beam (t4) → `E` collision burst + `q` banner/ring (t5).

### 4. optics-laboratory — *low optics hall + glazed clerestory monitor ridge; sig: rooftop INTERFEROMETER (gold laser zig-zagging off mirrors into a concentric-fringe bullseye)*
- **t2** small: an extra **mirror + beam-splitter relay** added to the breadboard (one
  more `L`/`W` mirror square + a short gold `o` beam leg) + an `o` "ALIGNED" dot — the
  interferometer arm grows by one bounce.
- **t3** structural: a **LASER-PUMP annex** abutting the hall's shaded right (a slim
  `b` box with a `g` cooling-slot window + a thin conduit to the breadboard) — feeds
  the optics, distinct from the monitor ridge.
- **t4** major: a rooftop **BEAM-EXPANDER TOWER** beside the monitor — a short `b`/`M`
  barrel on a plinth with a glowing `e` laser CAVITY window + an `E` aperture eye at
  the top (a bigger, brighter source for the bench).
- **t5** crowning: the bullseye completes into a full **OPTICAL-LATTICE RING** — a
  bright `E` ring of standing-wave fringes hovering over the breadboard fed by the
  expander beam, `q` gold optical rails on the breadboard + a `q` gold cap on the
  expander barrel.
- **Palette ramp:** `o` relay (t2) → `b` pump annex (t3) → `b`+`e` expander (t4) →
  `E` lattice ring + `q` rails (t5).

### 5. quantum-simulation-lab — *tall narrow CRYOSTAT TOWER + foot annex; sig: open-top cryostat mouth with a hanging golden QUANTUM-PROCESSOR CHANDELIER + qubit core + ghost-states*
- **t2** small: an extra **frost-VENT + a qubit READOUT** on the annex (a `c` frost
  puff at the tower base + a small `g`/`O` probability mini-gauge) — more cryo, modest.
- **t3** structural: a **HELIUM-RESERVOIR sub-drum** — a short fat `cylinder` abutting
  the tower foot (a `b` tank with a `c` level window + an `o` valve), twinning the
  tower's round language at a smaller scale.
- **t4** major: a **second CRYO-LINE + MICROWAVE-HORN array** climbing the tower — a
  `b` riser pipe up the shaded curve feeding 2-3 glowing `e` control-horn cones aimed
  at the mouth (the qubits now get real control lines), clear of the chandelier.
- **t5** crowning: a glowing **SUPERPOSITION ORB-CLOUD** crowns the open mouth — a halo
  of bright `E`/`e` qubit ghost-orbs orbiting the chandelier core (the maxed quantum
  state), a `q` gold RIM RING around the cryostat mouth + `q` gold chandelier discs.
- **Palette ramp:** `c`/`O` vent+gauge (t2) → `b` He drum (t3) → `b`+`e` horns (t4) →
  `E` orb-cloud + `q` rim ring (t5).

### 6. mathematical-modeling-suite — *stepped TERRACE PAVILION (low base + setback upper); sig: hovering wireframe 3D FUNCTION-SURFACE with a descending marble finding the basin minimum*
- **t2** small: a terrace **SOLVER-MONITOR stack** on the front rail (a small `g`/`c`
  screen showing a falling cost-curve + a brighter `o` gauge needle) — the suite gains
  a live readout beside the surface.
- **t3** structural: a **THIRD TERRACE TIER** — one more narrower setback `Box` on top
  of the upper box (`b` walls, a thin cyan window), deepening the zigurat silhouette
  the building already has.
- **t4** major: a rooftop **TENSOR-ARRAY MAST** on the top tier — a `b` mast carrying a
  stacked grid of glowing `e` node-cells (a compute lattice the model runs on) topped
  by an `E` solve-light, clear of the hovering surface out front.
- **t5** crowning: the single surface blooms into a **PHASE-SPACE MULTI-SURFACE** — 2-3
  nested glowing `E`/`e` wireframe sheets hovering in parallel (an ensemble of
  solutions) with bright `E` minima, `q` gold caps on the terrace corners + a `q` gold
  rail along the front deck.
- **Palette ramp:** `o`/`c` monitor (t2) → `b` 3rd tier (t3) → `b`+`e` tensor mast
  (t4) → `E` multi-surface + `q` caps/rail (t5).

### 7. observatory-dome — *round ROTUNDA DRUM + tall silver HEMISPHERE cracked by a slit; sig: open-top TELESCOPE on a fork mount aimed up-left at a catalogued star with a spectral ID tag*
- **t2** small: a **dome CATWALK + FINDER-SCOPE** — a thin `M`/`L` access ring band
  low on the hemisphere + a small finder-scope stub beside the main barrel + a
  brighter `o` star glint (more instrument, no occlusion of the main barrel).
- **t3** structural: a **SPECTROGRAPH WING** annex abutting the drum base (a low `b`
  box with a `g`/`c` instrument window + a thin light-pipe to the dome slit) — the
  light now feeds an analysis room.
- **t4** major: a **RADIO-DISH on a mast** rising beside the dome — a `b` lattice mast
  carrying a parabolic `M`/`L` dish with a glowing `e` feed-horn aimed up-right
  (multi-wavelength observatory), fully on-canvas, clear of the optical barrel.
- **t5** crowning: a **STAR-CATALOG CONSTELLATION SWEEP** fills the sky — a wider arc of
  bright `E` catalogued stars on dotted `g` sight-lines fanning from the barrel + dish
  (the survey), a `q` gold equatorial BAND around the hemisphere + a `q` gold dome
  finial at the slit crown.
- **Palette ramp:** `o` finder glint (t2) → `b` spectrograph wing (t3) → `b`+`e` radio
  dish (t4) → `E` catalog sweep + `q` dome band (t5).

### 8. theoretical-physics-annex — *compact L-SHAPE (taller STUDY BLOCK + lower front-right READING WING); sig: hovering holographic CURVED-SPACETIME GRID funnel over the wing, with orbiting field-equation glyphs*
- **t2** small: a **sill CHALK-TABLET + readout** on the wing (a small `d`/`c` slate
  tile showing one bright `O` equation glyph + a `g` decode bar) — one more "term
  solved", modest and on-theme to the decoding hero.
- **t3** structural: a **raised STUDY-TOWER** on the main block — extend the taller
  block UP by a slim setback `b` storey with a tall warm-`o`/`g` glowing study window
  (the L gains a third storey), keeping the L silhouette.
- **t4** major: a **GRAVITY-WELL ORRERY MAST** on the reading wing — a `b` mast topped
  by a glowing `e` central mass with ONE bold tilted orbit ring + an `E` orbiting bead
  (a physical model of the warped grid), clear of the hovering hologram.
- **t5** crowning: the spacetime grid deepens into a full **CURVED LATTICE BLOOM** — a
  wider glowing `E`/`e` rubber-sheet funnel with a brilliant `E` mass at centre and a
  ring of `E` solved glyphs, a `q` gold field-equation BANNER on the wing sill + `q`
  gold trim on the orrery ring.
- **Palette ramp:** `c`/`O` tablet (t2) → `b` study tower (t3) → `b`+`e` orrery mast
  (t4) → `E` lattice bloom + `q` banner (t5).

### 9. numerical-methods-hub — *blocky TWO-BLOCK compute hall + front-left LOUVERED VENT WING; sig: hovering ADAPTIVE CONVERGENCE MESH (a recursively-subdividing grid around a glowing solution front)*
- **t2** small: an **extra LOUVER-VENT bank** added to the vent wing (one more
  `Box.louver` slat block) + a row of brighter `o` ITERATION ticks on the parapet —
  more heat-exhaust + the optimization "tell".
- **t3** structural: a **stacked COMPUTE-RACK annex** on the main block's shaded right
  (a slim `b` box of repeated `g` instrument-bay slits) — adds compute mass distinct
  from the louver wing.
- **t4** major: a rooftop **SOLVER-ARRAY TOWER** on the main block — a `b` frame
  carrying stacked glowing `e` processor cards + an `E` bus-line glow + a small dish,
  rising clear above the parapet (the iteration engine), clear of the mesh out front.
- **t5** crowning: the convergence mesh blooms into a **RECURSIVE MESH-HALO** — a
  denser glowing `E`/`e` quadtree lattice with a brilliant `E` converged front-cell
  and an `O` "0" residual landing, `q` gold parapet TRIM + a `q` gold cap on the
  solver tower.
- **Palette ramp:** `o` iter ticks (t2) → `b` rack annex (t3) → `b`+`e` solver tower
  (t4) → `E` mesh-halo + `q` parapet trim (t5).

### 10. cosmology-visualization-theater — *wide GRAND DOMED PLANETARIUM (broad shallow disc dome + open OCULUS); sig: holographic COSMIC WEB projecting up through the oculus with a predicted-expansion arrow* — **PREMIUM capstone**
- **t2** small: a **rim ANTENNA whip + a `c` DATA-RING** of light-nodes on the drum's
  curtain-glass band + one brighter `o` marquee glint — premium polish, no occlusion.
- **t3** structural: a **RINGED COLONNADE SKIRT** around the drum base — a low ring of
  short `b`/`M` columns + a stepped plinth (a grand peristyle), widening the showpiece
  footprint outward (not up), keeping the round language.
- **t4** major: a **second PROJECTOR-TURRET** on the drum shoulder — a `b` turret with
  a glowing `e` projector eye + a short `E` beam (a second cosmos feed), beside the
  oculus, clear of the cosmic-web hologram above.
- **t5** crowning: the cosmic web completes into a full **COSMIC-WEB SPHERE BLOOM** — a
  glowing `E`/`e` lattice globe of cluster-nodes on dotted `g` filaments with a bright
  `E` predicted-expansion arrow sweeping outward, ringed by `q` gold — a `q` gold
  oculus RING, a `q` gold dome meridian, and a `q` gold "COSMOS" marquee (the premium
  capstone, fully maxed).
- **Palette ramp:** `o`/`c` data ring (t2) → `b` colonnade (t3) → `b`+`e` projector
  turret (t4) → `E` cosmic-web sphere + `q` gold oculus/marquee (t5).

---

## Worked reference — Chalkboard Room (already shipped)
*Form: wide low lecture hall; sig: tilted self-writing SLATE EASEL on the roof.*
- **t2** glowing study skylight prism on the back-right deck (small functional add).
- **t3** raised reading-loft penthouse on the right deck (structural add).
- **t4** tall proof-beacon tower with a glowing quantum core lantern + orbital ring
  rising off the loft (major add — the "axiom engine").
- **t5** theorem constellation of bright stellar nodes cast from the beacon, energized
  orbit ring, gold star finial + gold door pediment (crowning + gold flourish).
- Files: `chalkboard-room_t2..t5.png` rendered + previewed; base `chalkboard-room.png`
  unchanged (BASE_IDENTICAL verified). Builder:
  `.claude/pixel-art-pipeline/builders/chalkboard-room.py`.
