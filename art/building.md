# NOVA Lab — Building Catalog

**The single source of truth for the `/pixel-art-pipeline`.** Every building the game
will ever draw is listed here, grouped into **sets**. The pipeline reads this file
to decide what to build next, and writes back to it to lock in each finished
building's **signature feature** (the registry that keeps every building one-of-one).

There are **67 buildings in 7 sets**:

- **6 lab-type sets** — 10 economy buildings each (60 total). A team only ever sees
  the set for its assigned lab type, so each set must feel like one family.
- **1 gateway set** — the 7 fixed navigation buildings every team sees.

**Status — fully realized (2026-06-24):** all **67/67** buildings are made (`[x]`).
Every lab-type set — Volt Lab, BioCore, ChemWorks, TerraBase, MindFrame, Axiom — is
complete, each building a one-of-one signature feature on its own bespoke iso form, and
the 7 gateways have shipped sprites. There is nothing left for the generation pipeline
to pick up; this catalog is now the historical registry of every signature feature.

---

## The two rules every building must satisfy

### 1. Cohesive *within* its set
All buildings in a set must read as **one collection** — same world, same studio.
Cohesion is enforced through:
- **A shared palette.** Each set has a fixed ~16-color palette (below). Don't invent
  colors outside it. Reskins in the live app are pure palette swaps, so staying on
  palette is mandatory, not stylistic.
- **A shared silhouette language & motif kit.** Each set has a recurring structural
  vocabulary (roof shape, trim, props). A new building should obviously belong to
  the same street as its siblings.
- **A shared scale & footprint.** All economy buildings sit on the same 64×64 iso
  cube footprint as the gateways so they compose on the same plot.

### 2. Unique *across the whole catalog* — no two buildings share a feature
Every building gets exactly one **signature feature**: the single memorable thing
that makes it a one-of-one (the example the user gave: the Literature Review building
is a *library with a hologram of a book floating above it*). **No signature feature
may repeat anywhere in this file** — not within a set, not across sets, not against a
gateway. Before assigning a feature, scan the whole **Signature feature** column;
if it's taken (or too close), pick another. This is what makes the lab special to the
player: every structure they unlock is something they have never seen before.

Playful > generic. "Greenhouse with a slowly-rotating holographic terrarium globe on
the roof" beats "greenhouse with plants." Fun, readable, and distinct.

---

## Visual contract (matches `art/README.md` + the pixel-art-generator skill)

Every sprite is **generated from code** (char-grid JSON → `render_pixel_art.py`),
never hand-drawn and never from an image model. Each one must be:

- **Isometric** — 2:1 projection, a **corner faces the viewer**, the **roof is
  visible** (a 3/4 top-down read). Same iso cube the gateways use so the lab can
  expand in every direction.
- **64×64 source — every single building, no exceptions.** All 60 economy buildings
  *and* all 7 gateways are authored on the same 64×64 canvas (matching the existing
  gateway sprites). ~16 colors max, displayed upscaled with `image-rendering:
  pixelated`. Crisp single-pixel edges — **no blur, no anti-aliasing, no undefined
  mush, no off-palette stray pixels.**
- **Hard black-ish outline** (`K`) on the silhouette so it pops on the grass tiles.

### Palette chars (shared keying across all sets)
`K` outline · `W/L/M/D/d` wall (light→dark) · `h/c/g/G` glass (light→dark) ·
`o/O/r` accent (mid/light/dark). A "set palette" below is just these chars mapped to
that set's hex values (lifted from `LAB_PALETTES` in `art/recolor.py`).

### Where files land (economy buildings)
- Source char-grid → `art/src/buildings/{labType}_{slug}.json`
- Rendered PNG → `apps/web/public/sprites/buildings/{labType}/{slug}.png`
- Inspection preview → `art/preview/buildings/{labType}_{slug}.png`
- `slug` = kebab-case of the name (`CNC Mill Shop` → `cnc-mill-shop`,
  `EEG/Biofeedback Room` → `eeg-biofeedback-room`).

### "Made" vs "not made"
A building is **made** only when its **Status** box is checked *and* its rendered PNG
exists *and* its **Signature feature** cell is filled. The pipeline picks the next
batch from rows that are **not made**, and fills the feature cell when it finishes.

---

# Lab-type sets

> Order below is intentional: **Volt Lab first** (the classifier's default lab type),
> then the remaining five lab types, each as its own cohesive set.

## ⚡ Volt Lab — Engineering & Fabrication
**Identity:** an industrial maker-yard. Steel-grey structures with **electric
yellow + cyan** energy.
**Set palette:** `K #15181d` · `W #eef2f6 L #cdd6dd M #9aa3ad D #6c7682 d #49515b` ·
`h #d6f9ff c #aef0fb g #38cfe2 G #1f8ba0` · `o #ffe85a O #fff7a8 r #c89a14`
**Shared motifs:** exposed girders & rivets, corrugated metal roofs, conduit/cable
runs, glowing yellow power lines, cyan readout panels, warning chevrons.

| Status | Building | Role | Mini-game | Base description | Form | Opens | Signature feature |
|---|---|---|---|---|---|---|---|
| [x] | Workshop | starter | configuration | Default workbench for general builds | Open-concept L/^ work-yard | open | Spinning anvil-and-wrench weathervane cupola throwing yellow sparks |
| [x] | CNC Mill Shop | standard | configuration | Precision subtractive fabrication | Wide low factory hall (clerestory + dust cyclone) | left | Glass-boxed rooftop 3-axis cutting gantry carving a clamped workpiece with coolant mist + swarf |
| [x] | 3D Printing Shop | standard | optimization | Additive prototyping | Tall slender glass-domed tower | right | Glass-domed extruder tower printing a glowing part up in visible stacked layers |
| [x] | PCB Fab | standard | configuration | Design and produce circuit boards | Low flat clean-room block | right | Roof is a live circuit board — cyan traces, gold pads, raised DIP-chip cupola, yellow current pulse |
| [x] | Robotics Bay | standard | configuration | Integrate sensors, actuators, control | Tall open hangar + control annex | left | Open roll-up bay with an articulated robot arm reaching out and waving, cyan camera-eye |
| [x] | Electronics Bench | standard | diagnosis | Build and debug analog/digital circuits | Stepped two-step block | right | Stepped block crowned by a working oscilloscope CRT showing a live cyan waveform |
| [x] | Mechanical Testing Rig | standard | prediction | Stress, fatigue, and load testing | Open structural load-frame | left | Open load-frame crushing a glowing specimen in a glass chamber, gauge needle at redline |
| [x] | Welding & Fabrication | standard | configuration | Metalwork and structural assembly | Open-air L fab yard + gantry crane | right | Open fab yard with a gantry crane arc-welding an I-beam in a cyan-white spark fountain |
| [x] | Embedded Systems Lab | standard | configuration | Microcontroller-based projects | Long sawtooth-roof shed | left | Sawtooth shed with a rooftop breadboard garden — jumper-wire trellis + glowing MCU seedlings |
| [x] | AI Incubator | premium | optimization | Develop ML-driven engineering systems | Sleek round drum pavilion | right | Drum pavilion crowned by a hovering neural-network constellation orb with a traveling pulse |

## 🧬 BioCore — Life & Environmental Sciences
**Identity:** a living greenhouse campus. **Greens + organic teal** with warm amber.
**Set palette:** `K #1a2417` · `W #e8f2d8 L #c4dba6 M #9fc07e D #6f9456 d #4a6e3a` ·
`h #d2f7ec c #9fefcf g #36cc9e G #1d8f70` · `o #f0b24d O #ffd488 r #b9701e`
**Shared motifs:** glass terrariums & greenhouse glazing, leaf/vine trim, soil beds,
water troughs, wood framing, soft amber grow-lights.

| Status | Building | Role | Mini-game | Base description | Form | Opens | Signature feature |
|---|---|---|---|---|---|---|---|
| [x] | Greenhouse | starter | identification | Cultivate and observe plant specimens | Steep glazed twin-pitch gable glasshouse | left | Slowly-rotating holographic terrarium globe (mini living biome) above the steep glazed gable ridge |
| [x] | Specimen Vault | standard | identification | Curate and classify biological samples | Two-tier stacked archive block | right | Floor-to-ceiling backlit shelf wall of glowing curated specimen jars |
| [x] | Microscopy Suite | standard | identification | Visualize cells and microorganisms | Domed optics-turret pavilion | left | Giant eyepiece turret projecting a huge magnified live cell hologram (nucleus/organelles, dividing) |
| [x] | Incubation Chamber | standard | prediction | Grow cultures under controlled conditions | Sealed pod + frosted humidity dome | right | Warm-glowing carousel rack of petri dishes with colonies blooming under heat lamps |
| [x] | Wet Lab | standard | configuration | Conduct biological assays | Wide low hall + clerestory monitor | left | Backlit rack of bubbling assay test-tubes (graded teal→green) with a dispensing pipette arm |
| [x] | Field Station | standard | prediction | Collect ecological data from the field | Open-concept L plank cabin + courtyard | right | Guyed eco-sensor mast: spinning cup-anemometer + swiveling trail-camera + data-pennant over an open courtyard |
| [x] | Aquatic Habitat | standard | diagnosis | Study aquatic ecosystems | Glass water-cylinder rotunda + annex | left | Living kelp-and-fish reef ecosystem swirling inside a glass water-column tank (jellyfish + bubble streams) |
| [x] | Genetics Sequencing Lab | standard | decoding | Sequence and align DNA samples | Narrow stepped two-story tower | right | Tall rotating DNA double-helix of color-coded base-pair rungs, one rung lit as it reads bottom-to-top |
| [x] | Behavioral Observation Room | standard | prediction | Track and analyze animal behavior | Wide hipped-roof vivarium hall | left | Naturalistic vivarium enclosure with a tracked animal trailing a glowing motion-path + heat-map + predicted-step ghost |
| [x] | Bioinformatics Suite | premium | optimization | Analyze genomic data at scale | Stepped green-roof terrace pavilion | right | Hovering rotating holographic genome ring (Circos plot) — banded chromosome ring with chord arcs leaping across, above a green-roof atrium |

## ⚗️ ChemWorks — Chemistry & Materials
**Identity:** a glassware-and-pipework plant. **Glassware blues + reactive violet.**
**Set palette:** `K #161a2e` · `W #e6ecfb L #c2cdee M #9aa8d8 D #6f7cb0 d #4b5688` ·
`h #d6ecff c #a8d4ff g #4aa0e6 G #2166b0` · `o #c89cf0 O #e0c2ff r #6a34a8`
**Shared motifs:** condenser coils & pipes, bubbling flasks/tanks, drifting vapor,
violet reaction glow, polished lab glass.

| Status | Building | Role | Mini-game | Base description | Form | Opens | Signature feature |
|---|---|---|---|---|---|---|---|
| [x] | Fume Hood Bench | starter | configuration | Safe baseline workspace for reactions | Lean-to bench shed (mono-pitch) | left | Bubbling reaction flask on a ring-stand over a violet burner flame (open bench) |
| [x] | Reaction Synthesis Lab | standard | prediction | Run controlled chemical syntheses | Pipework reactor hall + reactor drum | right | Coiled glass Liebig condenser dripping distilled product into a receiving flask |
| [x] | Spectroscopy Suite | standard | identification | Identify compounds by spectral signatures | Low wide optics hall + clerestory monitor | left | Glass prism splitting a white beam into a banded spectral rainbow |
| [x] | Materials Testing Bay | standard | diagnosis | Measure mechanical and chemical properties | Open portal testing bay + instrument annex | right | Clamped coupon corroding/dissolving in a glass corrosion tank, gauge dropping to red |
| [x] | Crystallography Room | standard | decoding | Determine molecular structures | Faceted gem-cut prism pavilion | left | Floating faceted crystal with a symmetric X-ray diffraction-spot pattern around it |
| [x] | Distillation Tower | standard | optimization | Separate and purify mixtures | Tall slender fractionating column | right | Column sight-glass separating into stacked colored fractions + a rising vapor plume |
| [x] | Catalysis Lab | standard | optimization | Study reaction acceleration | Glass-domed round reactor pavilion | left | Glowing catalyst pellet bed turning two slow streams into one fast bright product stream |
| [x] | Polymer Workshop | standard | configuration | Synthesize and test polymers | Sawtooth extrusion shed + spool annex | right | Screw extruder drawing a molten polymer strand onto a slowly-winding take-up reel |
| [x] | Computational Chemistry Hub | standard | prediction | Simulate molecules in silico | Stepped two-block data-center + vent wing | left | Hovering ball-and-stick molecule with a predicted-pose ghost conformation |
| [x] | Cleanroom Synthesizer | premium | optimization | Precision synthesis under contamination control | Sealed cleanroom + curved curtain wall + airlock | right | Glovebox robotic arm placing a single glowing atom under a laminar clean-air shimmer |

## 🌍 TerraBase — Earth & Planetary Sciences
**Identity:** a rugged field-research outpost. **Earthy ochre/slate + mineral teal.**
**Set palette:** `K #20190f` · `W #efe6cf L #d6c8a0 M #b09a6e D #7e6c47 d #54462c` ·
`h #d6f2ea c #a4e2d4 g #34b6a2 G #1d8474` · `o #e0a850 O #ffce80 r #9a5e1e`
**Shared motifs:** layered rock strata, weatherproof instruments & antennae, drill
rigs, sample crates, mineral-teal sensor glow, canvas/tarp roofs.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [x] | Sampling Station | starter | identification | Collect and catalog field samples | Open tarp-depot work-yard with a field sample rotating in a mineral-teal scanner ring, fanning out holographic mineral-name + grid-coordinate ID tags |
| [x] | Seismograph Array | standard | prediction | Monitor seismic activity | Rooftop rotating ink-drum seismograph scrawling a jagged teal trace beside a glowing concentric shock-ripple with the predicted next jolt lit brighter |
| [x] | Weather Monitoring Post | standard | prediction | Record and analyze atmospheric data | Tethered weather-balloon with a dangling radiosonde projecting a holographic sun→cloud→storm forecast ribbon and a predicted weather-front arrow (no anemometer) |
| [x] | Geological Core Lab | standard | identification | Analyze sediment and rock cores | Inclined glass-cased drill-core on a rack, lit band-by-band by a sliding teal scanner that pops a mineral label for each rock layer |
| [x] | Hydrology Bay | standard | diagnosis | Study water systems and flow | Open-yard terraced watershed flume with a teal dye-trace plume stalling at a leak/blockage fault, flow gauges reading the diagnosis |
| [x] | Atmospheric Sensor Array | standard | prediction | Track atmospheric chemistry | Crown of upward intake horns inhaling drifting amber & teal gas wisps into a glowing bell-jar analyzer with a predicted-concentration needle climbing |
| [x] | Soil Analysis Lab | standard | identification | Characterize soil composition | Rooftop vibrating sieve-shaker cascading soil through graded screens into glowing sand→silt→clay→organic composition bins, a teal pie-dial reading the mix |
| [x] | Remote Sensing Hub | standard | decoding | Interpret satellite and aerial data | Orbital ground-track ring with a circling satellite beaming false-color raster tiles onto a tilted roof screen where they resolve into a terrain map (no dish) |
| [x] | Climate Modeling Station | standard | optimization | Run simulations of Earth systems | Hovering exploded stack of Earth-system layers (ocean/land/atmosphere/ice) over a roof oculus, an optimization fork lighting the best-outcome future-Earth scenario green |
| [x] | Deep Earth Observatory | premium | prediction | Probe planetary-scale processes | Lattice drill-rig derrick over a cutaway glowing shaft through the planet's concentric crust/mantle/core layers, a probe descending and a predicted reading rising |

## 🧠 MindFrame — Behavioral & Social Sciences
**Identity:** a calm human-studies institute. **Muted indigo/violet + soft magenta.**
**Set palette:** `K #181428` · `W #e8e2f6 L #cabfe6 M #9f90c8 D #6f5fa0 d #4a3c70` ·
`h #ecc8f4 c #d0a8ee g #a45ce0 G #6a2fb0` · `o #f08cce O #ffb8e2 r #b03a80`
**Shared motifs:** clean observation glass, soft-glow data screens & waveforms,
seating/booths, one-way mirrors, gentle magenta accent light.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [x] | Interview Room | starter | identification | Conduct structured interviews | Open one-way-mirror booth where two seated silhouettes face across a table with a hovering magenta voiceprint speech-bubble and a popped subject ID tag |
| [x] | Survey Distribution Center | standard | diagnosis | Design and field surveys | Rooftop rotary dispatch hopper flinging out a fan of questionnaire darts while response cards stream back into a bin, a climbing magenta response-rate tally board |
| [x] | Behavioral Lab | standard | prediction | Run controlled behavioral experiments | Seated subject at a glowing A/B two-button choice panel with a magenta predicted-choice needle leaning pre-press + reaction-time readout, watched through a one-way mirror |
| [x] | Eye Tracking Suite | standard | decoding | Measure attention and gaze | Angled stimulus display showing a glowing gaze heatmap + connected numbered scan-path over an image, two IR cameras glinting magenta at the viewer headrest |
| [x] | Statistical Analysis Hub | standard | diagnosis | Choose and run the right test | Rooftop holographic bell-curve with magenta-shaded tails, a significance-threshold line, and a p-value needle dropping past it to light a SIGNIFICANT stamp |
| [x] | Focus Group Chamber | standard | identification | Run group-based qualitative studies | Open-oculus round amphitheater pit where speech-bubbles rise from each ringed seat and merge into a hovering magenta theme/word-cloud being tagged |
| [x] | Longitudinal Study Wing | standard | optimization | Track participants over time | Rooftop Year 1→5 timeline ridge with cohort portrait-medallions at each waypoint, a climbing magenta retention trend-line and a participant token advancing along the track |
| [x] | EEG/Biofeedback Room | standard | decoding | Measure physiological response | Capped subject's head streaming multiple stacked multicolored brainwave ribbons (alpha/beta/theta) into a decoder strip, a magenta biofeedback ring pulsing the calm/stress level |
| [x] | Data Visualization Studio | standard | configuration | Communicate findings visually | Rooftop hovering 3D bar-chart skyline + sweeping line-graph ribbon composed onto a dashboard, magenta scatter-dots streaming in with a color legend |
| [x] | Computational Social Science Lab | premium | optimization | Model social systems at scale | Hovering flat horizontal society-simulation plane swarming with citizen-dots flocking into clusters on a faint city-grid, social-tie threads rippling, an optimization dial steering to the best outcome |

## 🔭 Axiom — Physics, Math & Astronomy
**Identity:** an observatory-and-theory campus. **Deep space navy + starlight
gold/cyan.**
**Set palette:** `K #0e1124` · `W #dfe6f6 L #b4bee0 M #7c88b8 D #4e5888 d #333a60` ·
`h #d6ecff c #aad8ff g #4a9ce6 G #2060b0` · `o #ffe27a O #fff3c0 r #c89a2a`
**Shared motifs:** observatory domes & telescopes, chalk equations, particle rings,
gold starlight glints, navy night-sky glass.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [x] | Chalkboard Room | starter | decoding | Foundational derivations and proofs | Tilted slate easel where a glowing gold chalk derivation writes itself line-by-line and boxes a final QED |
| [x] | Computation Cluster | standard | optimization | Numerical simulations | Transparent immersion-cooled GPU blade rack glowing cyan with a bright optimization heat-sweep band as it balances load |
| [x] | Particle Physics Bench | standard | identification | Tabletop physics experiments | Open benchtop cloud chamber where curling cosmic-ray particle tracks spiral and a detected particle lights up its ID tag |
| [x] | Optics Laboratory | standard | configuration | Light, lenses, interference | Rooftop laser interferometer — a gold beam zig-zags through lenses & mirrors and recombines into a ring of glowing interference fringes |
| [x] | Quantum Simulation Lab | standard | prediction | Model quantum systems | Suspended golden quantum-processor chandelier (tiered dilution-fridge coils) with a glowing qubit core and flickering superposition ghost-states |
| [x] | Mathematical Modeling Suite | standard | optimization | Build models of real phenomena | Hovering 3D function-surface bowl where a glowing marble rolls down the gradient and comes to rest in the lit minimum basin |
| [x] | Observatory Dome | standard | identification | Observe and classify celestial objects | Silver dome cracked open along its slit with a telescope barrel aimed at a catalogued star that pops a spectral-class ID tag |
| [x] | Theoretical Physics Annex | standard | decoding | Symbolic reasoning and derivations | Hovering holographic curved-spacetime grid dimpled by a glowing mass, field-equation symbols orbiting with one term decoding |
| [x] | Numerical Methods Hub | standard | optimization | Algorithms for scientific computing | Hovering adaptive convergence mesh that recursively subdivides into finer cells around a glowing solution front, residual gauge dropping to zero |
| [x] | Cosmology Visualization Theater | premium | prediction | Render large-scale structures of the universe | Open-oculus planetarium dome projecting a rotating holographic cosmic-web of galaxy filaments & voids with a predicted-expansion arrow |

---

# Gateway set — the 7 navigation buildings

**Identity:** the shared civic core every team sees, authored in the **canonical /
generic palette** (`art/canon.py`): lavender-grey walls, cyan-teal glass, warm orange
trim. Reskins to each lab type are palette swaps (`art/recolor.py`).

**Status note:** base sprites already exist (`apps/web/public/sprites/gateways/*`,
rooftop-differentiated on a shared cube). They are checked below as *made (base)*. The
signature features listed are the **aspirational one-of-one identities** — the pipeline
should only re-enter these to *elevate* a gateway to the catalog standard when the user
explicitly asks; new runs draw from the unmade economy buildings first. Their features
are still reserved here so nothing else in the catalog reuses them.

| Status | Building | Feature in app | Signature feature (reserved) |
|---|---|---|---|
| [x] | Discovery | Topic / Wikipedia deep dives | Canonical hub — the imported reference building at plot center |
| [x] | Literature Review | Papers, library & citation graph | Library with a hologram of an open book floating above the roof |
| [x] | Research Plan | Hypothesis & study design | Drafting hall with a glowing blueprint/study-design schematic projected over it |
| [x] | Operations Hub | Field Dispatch, Proof of Expertise, logs | Central command post crowned by a rotating radar/dispatch dish |
| [x] | Science Fair | Fair dates, rubric, categories, forms | Pavilion with a pennant-flag banner ridge and prize-ribbon marquee |
| [x] | Showcase | Publish research to the world | Grand gallery topped by a beaming broadcast spire |
| [x] | Battle Arena (PvP) | PvP combat | Coliseum with a crossed-tools emblem and twin tournament flags |

---

## Pipeline bookkeeping (how `/pixel-art-pipeline` edits this file)
1. **Pick:** walk this file strictly top-to-bottom and take the **first 5 rows still
   unmade (`[ ]`)** — first by file position, not "best". (Volt Lab → … → Axiom; gateways
   are already made, so they're skipped unless told otherwise.)
2. **Reserve:** while a row is in flight, set its feature cell to `⏳ <proposed feature>`
   so a concurrent run can't claim the same idea.
3. **Finish:** on delivery, set Status to `[x]` and replace the cell with the final
   signature feature (drop the ⏳). That feature is now permanently reserved.
