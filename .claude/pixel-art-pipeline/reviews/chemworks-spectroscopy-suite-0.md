# Review — chemworks/spectroscopy-suite (round 0)

**Verdict: CHANGES_REQUESTED**

Base is byte-identical to the shipped PNG (BASE_IDENTICAL True). Everything stays
on-canvas (bboxes within 0..63; min y = 2 at t5) and the footprint/base position is
unchanged across every stage. t4 is a genuinely good major add. But the early ramp is
broken: t2 is a no-op and t3 is a pure recolor, so the cumulative build-up reads as
base → base → base(recolored) → big-jump → big-jump.

Pixel diff (consecutive stages, on the shipped PNGs):
- base→t2: **NEW=2**, recolored=3   ← effectively a no-op
- t2→t3:  **NEW=0**, recolored=143  ← pure recolor, zero new structure
- t3→t4:  NEW=60, recolored=10      ← real major add (good)
- t4→t5:  NEW=7,  recolored=16      ← thin crowning, but reads elite w/ gold

## Per-stage
- **base** — unchanged, byte-identical. PASS.
- **t2** — FAIL (no-op). The cuvette-turret + rail + laser diode coded in
  `stage2_cuvette_turret` do not appear — only 2 new pixels render. The turret is
  seated at the cap front-left (roof_pt ~0.12–0.36, 0.92) right inside the existing
  prism/beam clutter and is being occluded / drawn over already-opaque pixels. Nothing
  reads as added at 64px.
- **t3** — FAIL (recolor only). `stage3_detector_rack` adds 0 new pixels (143 recolored).
  The annex Box lands entirely on top of the existing roof silhouette, so it only
  repaints the front-center bay dark navy — the outline is identical to t2. Not a
  structural add.
- **t4** — PASS. The diffraction-grating tower / monochromator arm is a real, prominent
  vertical mass (+60 px), clamped on-canvas (top y=3), clear of the prism. Good.
- **t5** — MARGINAL. Reads as maxed/elite and gold is correctly t5-only, but it adds
  little new mass (+7 px) on top of a broken t3. Re-judge after t2/t3 are fixed; likely
  fine once the ramp beneath it is real.

## mustFix
- **t2**: make the small add actually visible (~10+ new on-canvas pixels). Either move
  the cuvette turret/diode OFF the prism-clutter zone onto a clear, lit roof point of
  the LOWER body deck (front-left, below y~24 where the deck is empty) so its pixels are
  not occluded, or raise it ~2–3px so its K-framed top clears the existing roofline.
  Verify base→t2 NEW pixels > ~10.
- **t3**: turn the detector rack into a real structural mass that EXTENDS the silhouette —
  it must add NEW pixels above/beside the current roofline, not just recolor the bay.
  Raise the cabinet (taller h, or seat it so its lit roof sits a few px above the deck)
  and/or push it outward so part of it overhangs, so the outline visibly grows. Verify
  t2→t3 NEW pixels >> 0 (target ~30+) with the t2 turret still present.
- **t4 / t5**: keep as-is (do not change already-good stages); just confirm they remain
  cumulative once t2/t3 land.
