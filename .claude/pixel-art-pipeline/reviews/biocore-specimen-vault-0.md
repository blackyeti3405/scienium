# Review: biocore / specimen-vault — round 0

**Verdict: APPROVE**

Base is byte-identical to the shipped PNG (BASE_IDENTICAL True). All five stages are 64x64,
content stays on-canvas (no row-0 clip; cap mass starts at y=1 with the top row empty), footprint
unchanged, signature cryo-specimen window never occluded. Smooth, strictly-cumulative ramp.

## Per-stage
- **base**: two-tier vault, cryo-specimen window (teal glass + orange frame) on the lower-right face, raised back-left block, orange specimen pods on the lower roof. Unchanged. Signature feature = cryo window.
- **t2**: small functional add — capped vent/chimney stack (orange bands) on the back-left roof + a third specimen-pod cluster on the raised-tier front + small teal incubator marker on the left roof. +113 px vs base, clearly new structure, on-theme (lab venting / specimen growth).
- **t3**: structural add — low front-left annex module (real 3D box with its own top + left faces, teal incubator marker, orange hatch). Keeps all of t2. +224 px, change localized to the front-left base (bbox 8,44-26,59). Not a recolor.
- **t4**: major add — prominent stacked second-story cap mass on the raised back tier (dark-rimmed box, teal trim), anchored on the host roof. Keeps all of t3. +238 px, change at the top (bbox 26,1-45,13); reads distinctly bigger.
- **t5**: crowning flourish — premium gold trim framing the cryo-window aperture and gold accents on the cap/cores. Keeps all of t4. Total opaque px identical to t4 (1982 = 1982) so NO new mass — pure gold-trim flourish (~23 changed px, ~1.2% of the sprite). Gold appears only here, localized; not a whole-building recolor.

## Checklist
- [x] Every stage visibly adds (t2/t3/t4 add mass; t5 adds gold trim flourish — correct for the crowning stage)
- [x] Cumulative (t3 contains t2, t4 contains t3, t5 contains t4; earlier additions persist)
- [x] Smooth ramp; t5 reads as fully built-out
- [x] Colours mature; gold reserved for t5, not a recolor
- [x] Unique + on-theme (cryo vault: vent stack, specimen-pod cluster, incubator annex, cap, gold-framed cryo window); signature window not occluded
- [x] 64x64, on-canvas (no edge clip), footprint/base unchanged, readable at 64px

## mustFix
None.
