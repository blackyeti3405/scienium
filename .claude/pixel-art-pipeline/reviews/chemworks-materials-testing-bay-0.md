# Review — chemworks / materials-testing-bay (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: PASS (`BASE_IDENTICAL True`). All stages 64x64, nothing clipped off the
0..63 edges (top clears at y=1 on t5, bottom at y=61 on t4, right never touched), footprint/base
position unchanged. Stages 3/4/5 are genuine, cumulative, on-theme and read well — gold correctly
reserved for t5 only. The one blocker is t2.

## Per-stage

- **base:** Two-mass lab — main block + left annex, signature glass test-rack with specimen vials on
  the right face, small window on the annex. Unchanged. OK.
- **_t2 (L4): FAIL — no-op stage.** The rendered PNG is **byte-identical to the base**
  (`difference(base, t2).getbbox() == None`; added_px = 0). The stage2 helper *does* write to the
  JSON (hashes differ) but only repaints a thin 1px vertical seam-line along the roof ridge (cols
  ~39–43) using palette chars already in use (`c/o/O/G`) — it adds zero new silhouette pixels and is
  not perceptible in the strip. The L4 unlock therefore shows no change. Must add a small, visibly
  distinct functional element.
- **_t3 (L7):** Open-frame gantry/inspection rack bolted onto the right end, rising above the roofline
  (diff bbox 46,10–58,22). Real structural add, cumulative. OK.
- **_t4 (L10):** Teal coolant conduit routed across the roof + a new floor-standing sample-prep
  apparatus cube in front-left (diff bbox 16,48–31,61). Prominent new mass; energized teal glow
  introduced here. Cumulative (gantry retained). OK.
- **_t5 (L15):** Tall tower extension on the gantry topped by an illuminated test chamber with gold
  top/bottom rails (diff bbox 46,1–57,15). Crowning elite feature, gold flourish reserved to t5,
  one pixel of headroom above. Cumulative. Reads as fully maxed. OK.

## mustFix

- **_t2:** Stage is a no-op — the PNG is byte-identical to the base and the only JSON change is an
  invisible 1px recolor seam on the roof ridge. Replace the stage2 helper with a real, small,
  on-theme functional add that **extends the silhouette** (new opaque pixels outside the base form)
  the way t3–t5 do — e.g. a short exhaust/extraction vent or a small reagent-fume stack on the main
  roof, or a compact sample-intake hopper poking off the right face near the test rack. Use a NEW
  evolved-accent char (not `c/o/O/G`, which are already in the base palette) so it's legible, keep it
  clear of / not occluding the right-face test rack, and clamp inside 0..63. Target: `added_px > 0`
  vs base and a visible delta in the contact strip.
