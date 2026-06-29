# Review — chemworks / cleanroom-synthesizer (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: PASS (`BASE_IDENTICAL True`). Canvas 64x64, footprint unchanged, nothing
clipped off the 0..63 edges (top/left/right rows clear; bottom-row touch is the existing base
legs, not a new addition). t3 and t4 are genuine, well-anchored structural adds and read cleanly
at 64px. Cumulative chain holds (no earlier addition regresses). Two stages fail the
"every stage visibly ADDS readable structure" + "smooth ramp" bars: t2 is a near-invisible no-op,
and t5 reads as gold-trim-only with no new readable mass.

## Per-stage
- **base**: PASS — byte-identical to shipped PNG.
- **_t2**: FAIL — effectively a NO-OP. Pixel-diff base->t2 = **9 changed pixels** at x[16..18]
  y[44..48]; the strip cell is indistinguishable from base. `stage2_passthrough` draws the airlock
  hatch + CLEAN panel into the lit-LEFT face wall-gap (u 0.585..0.69) in dark K/D/M tones over an
  already-dark curtain region, so the whole add disappears. No modest on-theme element reads.
- **_t3**: PASS — gowning-room annex (its own prism + roof + glass interlock door) bolted onto the
  lit-left end. Diff t2->t3 = 205px at x[2..16] y[45..57]; clear new mass, on-theme, on-canvas.
- **_t4**: PASS — laminar-flow tower rising to y=8 (base topped at y=16), good plinth on the roof,
  clear major mass. Diff t3->t4 = 158px at x[36..45] y[8..23]. Reads great at 64px.
- **_t5**: FAIL — reads as GOLD-TRIM-ONLY, no new readable structural mass. Diff t4->t5 = **81px**
  all within x[17..48] y[33..55], dominated by the gold seal-RING outline around the *existing*
  glovebox window. The intended dosing-head + glowing reaction vessel from `stage5_reactor_cell`
  are drawn INSIDE the already-busy glovebox rect and do not survive at 64px — only the gold frame
  is visible. A gold border on a pre-existing window is a flourish, not a crowning feature; t5 does
  not read as a fully-built-out maxed version beyond t4.

## mustFix
- **_t2**: Make the add actually read. Move it OFF the dark left face onto a visible surface — e.g.
  a small functional element on the lit ROOF or the lit roof-edge (a short pass-through vent stack,
  a small HEPA intake crate, or a compact transfer hatch) drawn in a tone that contrasts the
  surface it sits on. Target a clearly visible delta (~aim for a readable 3-4px-tall element, not a
  9px speck). Keep clear of the glovebox hero (right face) and the HEPA plenum.
- **_t5**: Add a real CROWNING structural feature on top of t4, not just gold trim. Options that
  read at 64px: a glowing energized-teal reactor crown / cap ON the laminar tower top (re-anchored
  from the SAME tower-top point used in stage4), or a prominent automated dosing gantry mounted on
  the ROOF above the chamber (external, so it isn't lost inside the busy glovebox window). Keep the
  gold seal-ring as the t5 flourish, but t5 must show new mass beyond t4. Re-derive any t4 anchor
  from its source point — don't hardcode a second guess.
