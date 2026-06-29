# Review — terrabase/hydrology-bay (round 0)

**Verdict: APPROVE**

Base byte-identical to shipped PNG (`BASE_IDENTICAL True`). All five stages 64x64,
zero edge-touch (nothing clipped off 0..63), footprint/base position unchanged.
Smooth cumulative ramp; gold reserved for t5 only; signature top tank never occluded.

Note: `ImageChops.difference().getbbox()` gave false "0 changed" readings on base→t2
and t4→t5 (it dropped channels). The authoritative numpy per-pixel diff (incl. alpha)
confirms every stage adds real visible structure — see per-stage counts below.

## Per-stage
- **base**: unchanged. Top water tank + window + pier + rock channel. ✓ byte-identical.
- **t2** (+29px, region y26–42): small water **intake/outflow fittings** inside the bay
  mouth — amber-lit nozzles + water spilling from the dark opening. Modest, on-theme. ✓
- **t3** (+170px, region y41–54): **settling-pond / outflow channel** built out in front —
  larger teal water mass + bank. Structural add, retains t2 intake. ✓
- **t4** (+201px, top_y 6→2): **elevated water tower** raised on legs above the roof
  (prominent new mass), front channel deepened. Retains t2+t3. ✓
- **t5** (+65px, region y5–57): **gold crowning trim** on the tower rim (premium flourish,
  t5-only, tight-gold px 20→29) + energized brighter cyan channel flowing down-front
  (bright-teal px 94→118). Reads as fully maxed. Retains everything. ✓

## mustFix
None.
