# Review — chemworks/cleanroom-synthesizer (round 1)

**Verdict: CHANGES_REQUESTED** (one minor t5 fix; t2/t3/t4 are good — do not touch them)

Base byte-identity: **BASE_IDENTICAL True**. All stages 64×64, footprint/base anchor unchanged.
Cumulative check (opaque-pixel delta vs previous stage): base→t2 **+29 / −0**, t2→t3 **+77 / −0**,
t3→t4 **+98 / −0**, t4→t5 **+59 / −0**. Strictly additive — no stage erases a prior addition,
no recolor-only stage, no no-op. Smooth small→structural→major→crowning ramp; t5 reads as fully maxed.

## Per-stage
- **base** — shipped PNG, identical. ✅
- **_t2** — small rooftop vent/cluster on the back-left roof (diff y21–27). Correct "small functional add." ✅
- **_t3** — genuine new annex mass on the lower-left: own dark front face + cryo-cylinder ports + stepped base
  (diff y45–57). Real structure, not a recolor. ✅
- **_t4** — tall banded process tower rising off the right roof (diff x36–45, up to y8). Prominent new mass,
  on-theme. Does not occlude the signature glowing synthesis window. ✅
- **_t5** — domed observation cupola crowning the tower + premium GOLD viewport frame (x37–48,y33–45) and a small
  gold conduit run (y53–55). Gold reserved to t5, used as a flourish (not a whole-building recolor); the gold frame
  highlights rather than hides the signature window. Mostly excellent — but two blemishes below.

## mustFix
- **_t5: stray gold pixel at (11,21)** — a lone warm-gold (240,198,74) speck marooned on the dark upper-left
  rooftop, ~26px from the nearest gold trim, attached to no gold feature. Reads as an accidental fleck, and it
  puts gold somewhere other than the deliberate trim. Fix: recolor that pixel to the local rooftop tone (it is
  inside the t2 vent cluster region) or remove it — keep gold only on the window frame + conduit.

## notes (not blocking)
- **_t5: dome finial pressed to the top edge** — the crowning antenna terminates at y=0 (pixel x40,y0); the dome
  cap itself closes at y≈2–3, so nothing is truncated and it passes the on-canvas rule, but there is zero headroom.
  Optional safety: drop the whole tower+dome ~1px so the finial tip sits at y=1.
