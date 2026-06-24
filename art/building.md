# NOVA Lab — Building Catalog

**The single source of truth for the `/pixel-art-pipeline`.** Every building the game
will ever draw is listed here, grouped into **sets**. The pipeline reads this file
to decide what to build next, and writes back to it to lock in each finished
building's **signature feature** (the registry that keeps every building one-of-one).

There are **67 buildings in 7 sets**:

- **6 lab-type sets** — 10 economy buildings each (60 total). A team only ever sees
  the set for its assigned lab type, so each set must feel like one family.
- **1 gateway set** — the 7 fixed navigation buildings every team sees.

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

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [ ] | Fume Hood Bench | starter | configuration | Safe baseline workspace for reactions | — |
| [ ] | Reaction Synthesis Lab | standard | prediction | Run controlled chemical syntheses | — |
| [ ] | Spectroscopy Suite | standard | identification | Identify compounds by spectral signatures | — |
| [ ] | Materials Testing Bay | standard | diagnosis | Measure mechanical and chemical properties | — |
| [ ] | Crystallography Room | standard | decoding | Determine molecular structures | — |
| [ ] | Distillation Tower | standard | optimization | Separate and purify mixtures | — |
| [ ] | Catalysis Lab | standard | optimization | Study reaction acceleration | — |
| [ ] | Polymer Workshop | standard | configuration | Synthesize and test polymers | — |
| [ ] | Computational Chemistry Hub | standard | prediction | Simulate molecules in silico | — |
| [ ] | Cleanroom Synthesizer | premium | optimization | Precision synthesis under contamination control | — |

## 🌍 TerraBase — Earth & Planetary Sciences
**Identity:** a rugged field-research outpost. **Earthy ochre/slate + mineral teal.**
**Set palette:** `K #20190f` · `W #efe6cf L #d6c8a0 M #b09a6e D #7e6c47 d #54462c` ·
`h #d6f2ea c #a4e2d4 g #34b6a2 G #1d8474` · `o #e0a850 O #ffce80 r #9a5e1e`
**Shared motifs:** layered rock strata, weatherproof instruments & antennae, drill
rigs, sample crates, mineral-teal sensor glow, canvas/tarp roofs.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [ ] | Sampling Station | starter | identification | Collect and catalog field samples | — |
| [ ] | Seismograph Array | standard | prediction | Monitor seismic activity | — |
| [ ] | Weather Monitoring Post | standard | prediction | Record and analyze atmospheric data | — |
| [ ] | Geological Core Lab | standard | identification | Analyze sediment and rock cores | — |
| [ ] | Hydrology Bay | standard | diagnosis | Study water systems and flow | — |
| [ ] | Atmospheric Sensor Array | standard | prediction | Track atmospheric chemistry | — |
| [ ] | Soil Analysis Lab | standard | identification | Characterize soil composition | — |
| [ ] | Remote Sensing Hub | standard | decoding | Interpret satellite and aerial data | — |
| [ ] | Climate Modeling Station | standard | optimization | Run simulations of Earth systems | — |
| [ ] | Deep Earth Observatory | premium | prediction | Probe planetary-scale processes | — |

## 🧠 MindFrame — Behavioral & Social Sciences
**Identity:** a calm human-studies institute. **Muted indigo/violet + soft magenta.**
**Set palette:** `K #181428` · `W #e8e2f6 L #cabfe6 M #9f90c8 D #6f5fa0 d #4a3c70` ·
`h #ecc8f4 c #d0a8ee g #a45ce0 G #6a2fb0` · `o #f08cce O #ffb8e2 r #b03a80`
**Shared motifs:** clean observation glass, soft-glow data screens & waveforms,
seating/booths, one-way mirrors, gentle magenta accent light.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [ ] | Interview Room | starter | identification | Conduct structured interviews | — |
| [ ] | Survey Distribution Center | standard | diagnosis | Design and field surveys | — |
| [ ] | Behavioral Lab | standard | prediction | Run controlled behavioral experiments | — |
| [ ] | Eye Tracking Suite | standard | decoding | Measure attention and gaze | — |
| [ ] | Statistical Analysis Hub | standard | diagnosis | Choose and run the right test | — |
| [ ] | Focus Group Chamber | standard | identification | Run group-based qualitative studies | — |
| [ ] | Longitudinal Study Wing | standard | optimization | Track participants over time | — |
| [ ] | EEG/Biofeedback Room | standard | decoding | Measure physiological response | — |
| [ ] | Data Visualization Studio | standard | configuration | Communicate findings visually | — |
| [ ] | Computational Social Science Lab | premium | optimization | Model social systems at scale | — |

## 🔭 Axiom — Physics, Math & Astronomy
**Identity:** an observatory-and-theory campus. **Deep space navy + starlight
gold/cyan.**
**Set palette:** `K #0e1124` · `W #dfe6f6 L #b4bee0 M #7c88b8 D #4e5888 d #333a60` ·
`h #d6ecff c #aad8ff g #4a9ce6 G #2060b0` · `o #ffe27a O #fff3c0 r #c89a2a`
**Shared motifs:** observatory domes & telescopes, chalk equations, particle rings,
gold starlight glints, navy night-sky glass.

| Status | Building | Role | Mini-game | Base description | Signature feature |
|---|---|---|---|---|---|
| [ ] | Chalkboard Room | starter | decoding | Foundational derivations and proofs | — |
| [ ] | Computation Cluster | standard | optimization | Numerical simulations | — |
| [ ] | Particle Physics Bench | standard | identification | Tabletop physics experiments | — |
| [ ] | Optics Laboratory | standard | configuration | Light, lenses, interference | — |
| [ ] | Quantum Simulation Lab | standard | prediction | Model quantum systems | — |
| [ ] | Mathematical Modeling Suite | standard | optimization | Build models of real phenomena | — |
| [ ] | Observatory Dome | standard | identification | Observe and classify celestial objects | — |
| [ ] | Theoretical Physics Annex | standard | decoding | Symbolic reasoning and derivations | — |
| [ ] | Numerical Methods Hub | standard | optimization | Algorithms for scientific computing | — |
| [ ] | Cosmology Visualization Theater | premium | prediction | Render large-scale structures of the universe | — |

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
