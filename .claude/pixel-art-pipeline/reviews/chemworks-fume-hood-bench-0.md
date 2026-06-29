# Review: chemworks / fume-hood-bench — round 0

**Verdict: APPROVE**

Base byte-identical to shipped PNG (BASE_IDENTICAL True). All stages 64x64, on-canvas
(content within 0..63), footprint/base position unchanged, gold reserved to t5 only
(gold-ish px: base/t2/t3/t4 = 0, t5 = 20). Signature hood sash + round-bottom flask
preserved (only 10 px changed in the hood region base→t5, all intentional gold rim trim —
no occlusion). Additions are chem-lab specific and cumulative.

## Per-stage
- **base**: fume hood w/ sash, flask under hood, vent stack, bubbling condensers + purple vapor. Unchanged.
- **t2**: small blue instrument dome (stirrer/sensor) added on back-left worktop. Modest, on-theme small add. PASS
- **t3**: keeps t2 dome; adds a tall glass distillation/reagent column w/ collection vessel center-bench AND a floor reagent-fridge cabinet (glowing blue front) at front-right. Two real structural masses. Cumulative. PASS
- **t4**: keeps t3 (dome + fridge); raises the central column into a capped tower with a glowing cyan/blue core at top — prominent new vertical mass. Cumulative. PASS
- **t5**: keeps t4 tower; crowns it with a glowing cyan condenser orb + 1px spire finial, plus gold flourish (front-lip piping + flask rim). Reads fully maxed/elite. Gold is t5-only flourish, not a recolor. Cumulative. PASS

## Smooth ramp
No stage jumps the whole way; t5 clearly reads as the fully built-out version of the base. PASS

## Notes (non-blocking)
- t5 crowning spire tip is a single pixel flush at y=0 (bbox top = 0, edge-touch top = True).
  It is NOT clipped — clean 1px tip, orb body fully formed at y2–7. Reads fine. Zero headroom though:
  if a future tweak adds anything above it, it would clip. Worth keeping ~1px margin if re-touched.
