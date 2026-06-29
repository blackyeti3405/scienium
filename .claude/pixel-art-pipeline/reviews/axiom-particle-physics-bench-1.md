# Review — axiom / particle-physics-bench (round 1)

**Verdict: APPROVE**

Base is byte-identical to the shipped PNG (`BASE_IDENTICAL True`). All five stages are
64x64 with content fully on-canvas (bboxes interior — top y>=12, left x>=2, right x<=59,
bottom y<=58; nothing clipped/floating). The hero cloud-chamber dome + tracks + lit ID tag
are re-drawn LAST every stage, so no upgrade ever occludes the signature feature. Cumulative
gating in `build()` is correct and additions are unique + on-theme to a particle-physics
beamline bench (not generic). Gold (`q`) verified present ONLY inside `stage5_collision_burst`;
the amber `o` in t2 is the existing base palette key, not the premium-gold flourish.

## Per-stage
- **base** — open cloud-chamber yard, HV wings, hero dome/tracks/ID-tag. Unchanged. PASS.
- **_t2** — small functional add: a detached detector-puck instrument stand (lower-left) +
  a brighter track-flash spark on the dome. Modest, on-theme. PASS.
- **_t3** — structural add: shield-wall equipment annex (new boxy mass on the back-right HV
  wing, lower-right). Keeps the t2 puck. Real mass, not a recolor. PASS.
- **_t4** — major add: prominent overhead beam-gantry arch over the chamber with a beam-line
  dropping to the dome. Keeps t2 + t3. Reads instantly. PASS.
- **_t5** — crowning feature: gold "PARTICLE BENCH" banner between the wing crests + gold
  field-ring re-tracing the magnet coil + energized collision burst (cyan bloom) above the
  dome. Keeps everything; gold is a flourish only; reads as fully maxed/elite. PASS.

## mustFix
None.
