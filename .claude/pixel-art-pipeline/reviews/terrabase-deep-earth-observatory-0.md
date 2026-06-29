# Review — terrabase / deep-earth-observatory (round 0)

**Verdict: CHANGES_REQUESTED**

Signature feature = the glowing molten drill-core at the base front + the tall derrick/mast lattice. Base is byte-identical to the shipped PNG (BASE_IDENTICAL True). All stages are 64x64; new content stays on-canvas (left annex reaches x=4, right max x=55). The base mast already touches y=0 and the shadow y=63 — that TOP/BOTTOM edge contact is inherited from the shipped base, NOT introduced by upgrades, so it is fine.

Two stages fail the "must visibly ADD structure, not a recolor" gate, and the ramp is back-loaded.

## Per-stage
- **base** — unchanged, byte-identical. OK.
- **_t2 — FAIL (recolor no-op).** Net new footprint vs base = **1 opaque pixel**; t2 introduces **zero new palette colors**. The "diagonal strut" is painted by recoloring existing derrick-lattice pixels (dark `(32,25,15)` over `(84,70,44)`/`(214,200,160)`), not by adding a member. In the contact strip t2 is indistinguishable from base. No real "small functional add."
- **_t3 — GOOD.** Genuine left-side sample-core annex (+170 new-area px, bbox x=4..18, y=40..60) with its own teal core. Reads clearly, on-theme (deep-earth sample storage), does not occlude the drill-core or mast. Keep.
- **_t4 — FAIL (too small for "major add"; sits on signature).** t3→t4 adds only **21 new-area px** confined to x=27..41, y=20..30 — an energized teal recess *inside* the existing derrick silhouette. This is a recolor-plus-detail on the signature mast lattice, not a prominent NEW mass (no second story / tower / tank / gantry / external core cluster). The jump from t3 to t4 barely reads.
- **_t5 — GOOD (acceptable flourish).** Bright vertical extraction beam up the derrick spine + premium gold `(243,198,58)` flecks at the mast tip (gold correctly first appears here). Reads as maxed/elite. Keep. (Beam is mostly a glow channel, which is fine for a t5 crowning flourish since t3+t4 should carry the structural mass — but they currently don't, see above.)

## Ramp problem
Net new-area pixels: t2 **+1**, t3 **+170**, t4 **+21**, t5 **+13**. Effectively ALL structural growth is in t3, with t2 and t4 near-no-ops. The ladder must grow each rung.

## mustFix
- **_t2:** Add a REAL small functional element with its own footprint (not a recolored lattice line). On-theme options: a short bolted-on **seismograph/sensor mast or a small intake vent box** on the base deck beside the drill-core (e.g. a 3–5px-wide Box on the right deck around x=44..50, y=46..54), or a small **spoil/tailings crate**. Target a clearly visible add of ~15+ new opaque pixels, distinct from base in the strip. Do NOT use gold here.
- **_t4:** Replace the inside-the-tower glow patch with an actual PROMINENT new mass that reads as a separate volume. On-theme: a **bolt-on core-sample silo / drill-spoil tank** rising beside the derrick (anchored on a deck point, plinth visible), or an external **gantry/winch arm** off the derrick — something with a real silhouette change of ~40+ new-area px that does NOT overwrite the derrick-lattice signature. The energized inner core can stay as secondary detail, but t4 needs new structure outside the existing outline.
- **Keep t3 and t5 as-is** (they pass); just make sure t4's new mass remains present in t5 (cumulative) and the t5 beam still anchors on the drill-core/spine.
