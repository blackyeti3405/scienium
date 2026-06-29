# Review — biocore / microscopy-suite (round 1)

**Verdict: APPROVE**

Base is byte-identical to the shipped PNG (`BASE_IDENTICAL True`). All four upgrade
stages add real, cumulative, on-theme structure with a smooth ramp and correct gold
discipline. Nothing clipped off-canvas by the evolution.

## Per-stage
- **base (L1-3):** Unchanged. Microscope lens orb + amber specimen-illumination beam over a green specimen-drawer block. Signature feature = the floating lens orb.
- **_t2 (L4):** PASS — small functional add: ribbed cooling-fin stack on the left roof + a small circular sensor port/dish on the right wall face. Modest, on-theme (lab cooling/optics). +47 opaque px, 0 removed.
- **_t3 (L7):** PASS — structural add: a dark annex block bolted onto the right/front of the main mass with its own teal-lit slit window. Keeps t2's fins + wall dish. +111 px, 0 removed.
- **_t4 (L10):** PASS — major add: prominent ribbed cylindrical centrifuge/specimen-tank tower with a rounded teal cap rising off the annex roof. Real new vertical mass. Keeps t3 annex + t2 fins/dish. +54 px, 0 removed.
- **_t5 (L15):** PASS — crowning feature: gold banding on the centrifuge tower + a gold emitter-pip trail on the beam + a second smaller satellite specimen-glow orb upper-left ("second culture under observation"). Reads as fully maxed/elite. +69 px, 0 removed.

## Checks
- Cumulative: every transition removed_px=0 (no stage deletes an earlier addition); added_px = 47 / 111 / 54 / 69 — no no-op stage, no all-at-once jump.
- Gold discipline: goldish pixel count flat at ~30-32 from base→t4 (that's the pre-existing amber specimen beam, the lab's native energy color, NOT premium trim) and jumps +13 to 45 only at t5 — premium gold is reserved for t5 as a flourish.
- On-canvas: left/right edges have 0 opaque px on every stage; t5's satellite orb sits at x=4 (inside). Top edge has 13 opaque px identical on base and t5 — that's the base's own lens corona (inherited, not a new clip). Bottom edge is the ground-contact line. No evolution-added element is clipped.
- Footprint/base position unchanged; signature lens orb never occluded (additions grow down-right and to the rooftops, away from the orb).
- 64x64, readable — a few clear additions per stage, no mush.

## mustFix
None.
