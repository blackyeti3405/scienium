# Prompt: upgrade-evolution sprites for the other 5 lab types

Paste this into a fresh session to generate the 4-stage upgrade-evolution sprites for the
economy buildings of **biocore, chemworks, terrabase, mindframe, axiom** (Volt Lab is
already done — it's the reference/quality bar). 10 buildings × 4 stages × 5 labs = 200
sprites. **Do one lab type at a time** (montage → human sign-off → next).

---

## What to make
For every economy building, 4 cumulative upgrade-stage sprites that the player unlocks at
the Lab-Credit tier-ups — each stage **physically adds structure** to the previous one
(NOT a recolor), so the building grows from its base into a fully built-out form by L15.

- base `{slug}.png` (L1–3, UNCHANGED) → `_t2` (L4, small functional add) → `_t3` (L7,
  structural add) → `_t4` (L10, major add) → `_t5` (L15, crowning feature = fully evolved).
- Cumulative (each stage keeps prior additions + adds more); colours mature; gold/premium
  trim only as the L15 flourish; unique + on-theme per building; 64×64; footprint/base
  unchanged (the plot anchor is reused, so stages share the base anchor — no anchor regen).

## Read first (already in the repo)
- Rules + stage "evolution language": `.claude/pixel-art-pipeline/UPGRADE_EVOLUTION.md`
- Reference per-stage builder: `.claude/pixel-art-pipeline/builders/workshop.py`
  (`build(stage=1)` composes the base then layers cumulative geometry for stages 2–5).
- Volt Lab planning example: `.claude/pixel-art-pipeline/evolution-plan.md`
- DONE quality bar: `apps/web/public/sprites/buildings/volt_lab/{slug}_t2..t5.png`
- Toolkit: `art/isobuild.py`, `art/render_pixel_art.py`. Base builders: `.claude/pixel-art-pipeline/builders/{slug}.py`.

## Generalizations vs the Volt Lab brief
- Output to `apps/web/public/sprites/buildings/{labType}/{slug}_t{2..5}.png`; use EACH
  builder's OWN lab-type palette (defined at the top of that builder), NOT VOLT — add only
  a few new evolved-accent/glow/gold shades.
- The renderer is ALREADY generic + multi-stage (`lib/sprites/manifest.ts`
  `buildingStageSuffix` + `getBuildingSprite` map level→stage for any lab). DO NOT change
  app code — just produce the PNGs and they render at L4/7/10/15.

## Per-building contract
1. Refactor `{slug}.py`: `build()` → `build(stage=1)`; `if stage>=2/3/4/5` add cumulative
   geometry (follow workshop.py exactly).
2. Render each stage 2–5:
   `python3 art/render_pixel_art.py <stage.json> -o apps/web/public/sprites/buildings/{labType}/{slug}_t<stage>.png --preview art/preview/{labType}_{slug}_t<stage>.png`
3. Do NOT overwrite the base `{slug}.png` (verify stage 1 stays byte-identical).

## PIPELINE — generator → reviewer loop (REQUIRED; do not skip the review)
Run a workflow **per lab type**:

1. **Reference pass** (1 agent): design the lab's evolution language, fully implement ONE
   building as the code pattern (build + render + self-inspect), and write a per-building
   plan for the other 9.
2. **Generator → Reviewer loop per building** (pipeline, parallel across the 9; each
   building independent):
   - **Generator** (painter): implement `build(stage)`, render `_t2.._t5` + previews,
     self-inspect once.
   - **Reviewer** (a SEPARATE agent — independent eyes): `Read` the building's base +
     `_t2.._t5` previews (and a 5-up contact sheet), score against the checklist below,
     and return a verdict `APPROVE | CHANGES_REQUESTED` with specific per-stage notes.
     The reviewer MUST look at the actual rendered PNGs — never trust the generator's
     text summary.
   - If `CHANGES_REQUESTED` and iteration < 3: feed the review back to the generator to
     fix the flagged stages, re-render, re-review. Accept on APPROVE; after 3 rounds
     still not approved, stop and flag that building for human review.
3. **Final montage** per lab (base→t2→t3→t4→t5 contact sheet) for human sign-off before
   committing.

### Reviewer verdict checklist (per building)
- [ ] Every stage visibly ADDS structure vs the previous (not a recolor, not identical).
- [ ] Cumulative: `_t3 ⊇ _t2`, `_t4 ⊇ _t3`, `_t5 ⊇ _t4` (earlier additions remain).
- [ ] Smooth ramp: no stage is a no-op; none jumps the whole way at once; `_t5` clearly
      reads as a fully built-out version of the base.
- [ ] Colours mature across stages; gold/premium reserved for `_t5`, not a whole-building recolor.
- [ ] Unique + on-theme to THIS building (not a generic add reused across buildings).
- [ ] 64×64, content on-canvas, footprint/base position unchanged, readable at 64px (not mush).
- [ ] Base `{slug}.png` byte-identical to the shipped base (PIL `ImageChops.difference(...).getbbox()` is `None`).

## Buildings (slugs) per lab
- **biocore**: greenhouse, specimen-vault, microscopy-suite, incubation-chamber, wet-lab,
  field-station, aquatic-habitat, genetics-sequencing-lab, behavioral-observation-room,
  bioinformatics-suite
- **chemworks**: fume-hood-bench, reaction-synthesis-lab, spectroscopy-suite,
  materials-testing-bay, crystallography-room, distillation-tower, catalysis-lab,
  polymer-workshop, computational-chemistry-hub, cleanroom-synthesizer
- **terrabase**: sampling-station, seismograph-array, weather-monitoring-post,
  geological-core-lab, hydrology-bay, atmospheric-sensor-array, soil-analysis-lab,
  remote-sensing-hub, climate-modeling-station, deep-earth-observatory
- **mindframe**: interview-room, survey-distribution-center, behavioral-lab,
  eye-tracking-suite, statistical-analysis-hub, focus-group-chamber,
  longitudinal-study-wing, eeg-biofeedback-room, data-visualization-studio,
  computational-social-science-lab
- **axiom**: chalkboard-room, computation-cluster, particle-physics-bench, optics-laboratory,
  quantum-simulation-lab, mathematical-modeling-suite, observatory-dome,
  theoretical-physics-annex, numerical-methods-hub, cosmology-visualization-theater

## Verify before committing (per lab type)
`pnpm --filter @scienium/shared-types build`, `pnpm --filter web typecheck`,
`pnpm --filter web lint`, `pnpm --filter web build`, `pnpm --filter web test`
(the `manifest.test.ts` stage-mapping tests). No schema/migration changes. Then commit +
add a CHANGELOG entry. (E2E runs serially: `pnpm --filter web test:e2e`, dev DB up.)
