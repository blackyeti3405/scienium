# Review: terrabase/sampling-station — round 0

**Verdict: CHANGES_REQUESTED**

Base is byte-identical to the shipped PNG (BASE_IDENTICAL True). t3, t4, t5 are all
genuinely good. The sole blocker is **t2 is effectively a no-op recolor**.

Pixel-diff evidence (numpy, full RGBA — note `ImageChops.getbbox()` falsely reports
None for base→t2, so don't trust that shortcut here):

| transition | changed px | new opaque px | assessment |
|---|---|---|---|
| base→t2 | 24 | ~0 | recolor of existing strata steps, invisible at 64px — FAIL |
| t2→t3   | 75 | 39 | real left rock-buttress / strata extension — OK |
| t3→t4   | 192 | — | right deep-core drill tower, x-max 56 (on-canvas) — OK |
| t4→t5   | 85 | — | top sample-analysis burst + gold flecks (gold only here) — OK |

## Per stage
- **t2 (L4):** FAIL. Only 24 px change, all confined to x35–42 / y39–45, and they are
  tonal shuffles of existing sand/strata pixels (214,200,160 -> brighter sand/brown,
  one stray faint-cyan pixel). No new on-theme element; base and t2 are
  indistinguishable on the contact strip. This is the required "small functional add"
  tier and currently reads as identical-to-base.
- **t3 (L7):** PASS. 39 genuinely new opaque pixels at x8–17 / y24–42 add a real
  rock-buttress/strata mass on the left face. On the small/marginal side but a valid
  structural add.
- **t4 (L10):** PASS. Prominent cyan-lit deep-core drill tower with derrick cap on the
  right — clear major new mass, on-theme, on-canvas (x-max 56), does not touch the
  signature cyan scanner ring (opposite side).
- **t5 (L15):** PASS. Adds a glowing cyan sample-analysis burst with gold flecks at
  top, tethered down to the rig. Reads as maxed; gold correctly reserved to t5 only.
  On-canvas (y-min 2). Cumulative — drill + buttress remain.

## Other checks
- Cumulative (t3⊃t2, t4⊃t3, t5⊃t4): PASS — earlier additions persist.
- Colours mature; gold is t5-only flourish, not a recolor: PASS.
- Unique + on-theme (core drill, analysis burst): PASS. Signature scanner ring never
  occluded: PASS.
- 64x64, all content on-canvas, footprint unchanged, readable: PASS.
- Base unchanged: PASS (byte-identical).

## mustFix
- **t2:** Replace the ~24-px strata recolor with a real, visible small on-theme element
  for a sampling station — e.g. a short collection-tube/sample-canister rack or a small
  soil-corer probe bracketed onto the front-left face above the strata steps (clear of
  the cyan scanner ring at ~x16–28 and clear of the t3 left-buttress region x8–17).
  Must be visually distinguishable from base on the contact strip at 64px and must
  remain present (cumulative) in t3–t5.
