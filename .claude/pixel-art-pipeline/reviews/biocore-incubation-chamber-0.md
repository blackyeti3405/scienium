# Review — biocore / incubation-chamber (round 0)

**Verdict: APPROVE**

Judged from the rendered PNGs (shipped sprites + 9x previews), not generator text.
Base is byte-identical to the shipped PNG (`BASE_IDENTICAL True`). All stages are 64x64,
fully on-canvas (0 opaque pixels on any 0..63 edge at every stage; topmost row y=17 everywhere),
footprint/base position unchanged, and the chain is strictly cumulative (0 prior opaque pixels
lost at any step: base→t2→t3→t4→t5).

Methodology note for future reviewers: `ImageChops.difference(...).getbbox()` returned a FALSE
`None` for the base→t2 and t3→t4 pairs on these images, which falsely reads as "no-op stage."
md5 hashes, brute per-pixel compare, and `getpixel` all confirm those stages DO differ. Use brute
per-pixel (or md5), NOT getbbox, to judge these sprites.

## Per-stage
- **base (L1-3):** sealed green pod + frosted humidity dome (signature, roof-center) + warm
  petri-carousel porthole on the right face (the one-of-one feature). Unchanged.
- **_t2 (L4) — small functional add — PASS:** adds a 2nd amber heater box on the back-right roof
  shoulder (clear of the dome rim, w/ a teal live-pip) + a small K-framed humidity-dial gauge on
  the lit-left wall. 43 px changed on existing footprint. Modest, on-theme climate hardware;
  signature dome + carousel untouched.
- **_t3 (L7) — structural add — PASS:** a CO2/gas-bottle lean-to annex grounds on the front-left,
  breaking past the pod silhouette as its own object (bark-green `b` cabinet + upright teal cylinder
  w/ amber regulator + thin teal feed-line into the wall). +87 newly-opaque px below-left (bbox
  12,47–22,60). Keeps t2. Reads as a separate mass, not a wall streak.
- **_t4 (L10) — major add — PASS:** a prominent 2nd humidity dome rises on the front-left roof
  beside the first, with a bio-glow `e/E` vapour core inside and a dark plinth collar. 152 px
  repainted. Sits lower/forward-left so it does NOT occlude the original dome crown or the right
  porthole carousel. Keeps t3. Clear twin-atmosphere major mass. (Populates the roof deck rather
  than extending the silhouette — acceptable and intended for this rooftop add.)
- **_t5 (L15) — crowning feature — PASS:** gold (`q`) appears for the FIRST time (15 px; 0 in
  base/t2/t3/t4) — gold dome finial on the main crown, gold gasket ring on the porthole, gold ridge
  boss — plus the petri carousel blooms into bright `E` energized culture rings. 77 px changed
  (4 newly-opaque for the finial poking above the crown, y18–21, on-canvas). Reads maxed/elite,
  still the same pod. Gold is a flourish, not a recolor.

## Checklist
- [x] Every stage visibly adds structure (no recolor-only, no no-op): t2 +heater/dial, t3 +87 opaque
      annex, t4 152px 2nd dome, t5 +gold finial/ring + E culture bloom.
- [x] Cumulative: 0 prior opaque pixels lost at every step; _t5 ⊇ _t4 ⊇ _t3 ⊇ _t2 ⊇ base.
- [x] Smooth ramp; t5 reads as the fully built-out version (two domes + gas annex + maxed carousel + gold).
- [x] Colours mature (bark-green `b` at t3+, bio-glow `e/E` at t4+); gold reserved to t5 only.
- [x] Unique + on-theme to an incubation chamber (heaters, humidity dials, CO2 supply, twin humidity
      dome, glowing cultures); signature dome + porthole carousel never occluded.
- [x] 64x64, content on-canvas (topmost row y=17 all stages; 0 edge-opaque pixels), footprint unchanged,
      readable at 64px (a few clear additions, no mush).
- [x] Base unchanged — verified byte-identical (`BASE_IDENTICAL True`).

## mustFix
None. Do not request changes to any stage.
