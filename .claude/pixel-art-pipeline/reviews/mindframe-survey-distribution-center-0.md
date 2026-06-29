# Review — mindframe/survey-distribution-center (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identical: **True** (`BASE_IDENTICAL True`). No edge clipping on any stage. Gold present only in t5 (10px). t2/t3 signal + t3 coupler verified byte-present in all later stages (cumulative holds). t3, t4, t5 are all strong. The only blocker is t2.

## Per-stage
- **base** — unchanged, byte-identical to shipped PNG. OK.
- **_t2** — WEAK / effectively a no-op structural add. The only change (33px, bbox 8,9–32,16) is that the two leftmost emitted survey-"ping" clusters in the floating signal trail were fattened with a few lavender body pixels. It does not add a functional element ON the building mass — it just makes existing floating decoration slightly chunkier, and at 64px it barely reads as different from base. Fails the "modest on-theme functional add (vent/antenna/crate/short pipe/small dish)" bar.
- **_t3** — GOOD. New pink/magenta coupler/intake module bolted to the lower-front-left face of the box (bbox 27,46–37,52). Real new geometry, on-theme (survey-sample intake/coupler), cumulative, does not occlude the pink survey hopper. OK.
- **_t4** — GOOD. Tall survey-data mast/tower rises from the back-right roof: dark column + climbing cyan illuminated data-readout strip + crowned antenna head with T-bar prongs (bbox 37,5–43,24). Prominent new vertical mass with energized glow, anchored on the roof, does not occlude the signature hopper (which sits left). OK.
- **_t5** — GOOD. Tower head opens into a wide radial broadcast-dish/transmitter array (pale-cyan/lavender wings) with a gold-capped apex emitter; small gold trim accent on the front coupler. Reads as fully maxed/elite. Gold is a flourish only (10px), not a recolor; building keeps its lavender palette. Wings stay on-canvas. OK.

## mustFix
- **_t2**: current add is only an enlargement of the floating signal-ping decoration (~33px in the upper-left trail) and does not read as a new element on the structure. Replace with a real modest functional add mounted ON the building mass and unique to a survey/distribution depot — e.g. a small roof-mounted survey antenna/whip or a low intake vent on the box top, or a short outflow pipe/short stub stack on the main roof near the hopper (without touching the pink hopper). Keep it small but clearly a NEW structural element, and keep it cumulatively present in t3–t5.
