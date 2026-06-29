# Review — biocore / wet-lab (round 1)

**Verdict: APPROVE**

Independent review of the rendered PNGs (not the generator's summary). All checklist
boxes pass. Base is byte-identical to the shipped PNG; the four upgrade stages add real
on-canvas structure with a clean cumulative ramp, mature palette, and gold reserved
correctly for t5. The signature backlit assay-tube rack is never occluded.

## Per-stage

- **base**: unchanged. Stage-1 JSON re-renders byte-identical to `wet-lab.png`
  (`BASE_IDENTICAL True`).
- **_t2 (small)**: PASS — slim exhaust vent stack + reagent carboy standing on the open
  front-left roof deck (diff bbox (19,14)-(23,21), 71 px). The vent cap pokes above the
  local roofline into clear sky, so base→t2 genuinely changes the silhouette. On-theme
  (fume exhaust + reagent supply). No gold / glow / bark yet — correct.
- **_t3 (structural)**: PASS — stepped autoclave/fume side-annex bolted onto the
  shaded-right wall with a connecting bark-green skirt gusset, round glass port + roof
  vent pipe (diff (42,44)-(59,61), 204 px). A real new mass abutting the hall, not a
  recolor. Introduces matured bark-green `b` (and only `b`) — correct first maturation.
- **_t4 (major)**: PASS — taller second clerestory monitor bay raising the ridge
  behind-right of the original daylight scoop, glazing glowing bio-luminescent `e/E` on a
  `b` chassis (diff (29,11)-(48,22), 261 px). Prominent new mass; does NOT occlude the
  original scoop (stays front-left). `e/E` introduced here, persists into t5 — correct.
- **_t5 (crowning)**: PASS — reads as fully maxed/elite. Three additive reads: (1) the
  signature rack blooms into an automated assay WALL — a glowing `E` tube comb + overhead
  pipette rail extending UP off the original rack; (2) a gold `q`/`O` bench RAIL caps the
  lit-left sill; (3) a crowning bio-luminescent bloom-spire built as REAL new geometry
  rising off the t4 bay cap into clear sky, gold-finialed. The original 6-tube rack +
  pipette arm stay fully readable.

## Checks performed
- **Base byte-identity**: PASS (`BASE_IDENTICAL True`).
- **On-canvas**: all stages 64×64, content inset from edges — non-transparent bbox stays
  within x 10..58; t5 spans y 2..60 (top pixel y=2, on-canvas with margin). Nothing
  clipped or floating off 0..63.
- **Cumulative + ramp**: stage-vs-previous pixel diffs all non-empty and well-placed
  (71 / 204 / 261 / 122 px); small → structural → major → crowning, none jumps the whole
  way. Earlier additions persist at every higher stage.
- **Palette maturation / gold discipline** (verified in source JSON across all 5 stages):
  bark `b` from t3, bio-glow `e/E` from t4, gold `q` in **t5 ONLY** (0 occurrences in
  base–t4). Gold is a flourish (bench rail + summit finial), not a whole-building recolor.
- **Crowning-feature anchoring** (the volt-lab pitfall): t5 spire anchors on the t4 bay
  `r_top`=(35,11), which is solid in t4 (alpha 255); the spire then rises y10→y2 into
  pixels that were transparent in t4 — a true upward silhouette step, recomputed from the
  same source point the bay was drawn from. Plinth seats it on the cap, not detached.
- **Signature not occluded**: t5 lit-left edits are additive (gold rail + assay-wall foot,
  y 25..40); the base assay-tube rack body is preserved.

mustFix: none.
