# Review: axiom / observatory-dome — round 1

**Verdict: APPROVE**

Base byte-identical to shipped PNG (`BASE_IDENTICAL True`). All 5 stages are 64x64,
content fully on-canvas (max bbox (57,61), nothing clipped at 0..63 edges), footprint/base
position unchanged. Cumulative verified pixel-wise: `lost_earlier_additions = 0` at every
stage; added-px-vs-base climbs monotonically 36 → 280 → 468 → 520 (smooth ramp, no restart,
no stage jumps to fully-built).

## Per-stage
- **base** — domed observatory: dome with horizontal slit/shutter band, upward main telescope
  barrel, star/sighting marker + readout screen top-left. Unchanged.
- **_t2** — small add: short secondary star-tracker antenna/boom extending up-right off the dome
  with a small sensor tip. +25 opaque px of real geometry (not a recolor). Reads at 64px; does
  not touch the signature dome slit or main barrel. Modest and on-theme. PASS.
- **_t3** — structural add: crystal-topped instrument annex box bolted to the lower-right footprint.
  Keeps t2. Clear secondary mass. PASS.
- **_t4** — major add: raised gantry arm carrying a large sensor pod/tank mass top-right. Keeps t2+t3.
  Prominent new silhouette. PASS.
- **_t5** — crowning: gold trim band across the dome + gold antenna spike tips, reads as maxed/elite.
  Keeps everything. PASS.

## Gold discipline
Gold confined to t5: 0 new gold px in t2/t3/t4's added regions, all 30 new gold px appear only at
t5 (2.9% of opaque pixels). No whole-building recolor — building stays slate-blue across all stages.
(The yellow on t3/t4 annex crystals is the lab's pre-existing palette tone, not new trim.)

## Theme / occlusion
All additions are observatory-specific (star-tracker antenna, sensor pod, crystal instrument annexes)
— not generic reused parts. Signature dome slit and main telescope barrel never occluded.

mustFix: none.
