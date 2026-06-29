# Review — axiom/observatory-dome (round 0)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: BASE_IDENTICAL True. Canvas 64x64 all stages, zero edge-touch on all
four borders, bboxes on-canvas (t5 max x=62). Footprint unchanged. Cumulative chain holds
(t3⊃t2, t4⊃t3, t5⊃t4 — earlier adds remain). Gold reserved to t5. Signature feature
(slit + telescope barrel + catalogued star) never occluded.

Per-stage pixel deltas (consecutive diffs):
- base→t2: **29 px**, bbox (6,5–27,20) — scattered glints on barrel/star, no discrete element.
- t2→t3: 244 px, bbox (40,42–57,61) — side spectrograph console block + gold rail. Good.
- t3→t4: 172 px, bbox (41,8–55,37) — radio-uplink sphere on a tall stalk. Reads, but stalk is spindly.
- t4→t5: 76 px — only 27 attached (gold trim band), **49 floating** dots in empty space.

## Per-stage
- **t2 — FAIL (effectively a no-op).** Intended catwalk band + finder-scope stub, but renders as
  only 29 scattered pixels; the catwalk is lost in the dome shading and the finder stub merges into
  the existing barrel. The t2 panel is indistinguishable from base at 64px. Needs a real, readable
  discrete element.
- **t3 — PASS.** Clear new mass (spectrograph console, bottom-right) with gold rail. On-theme.
- **t4 — PASS (borderline).** Uplink sphere is a genuine prominent new mass, but the 1px-wide ~28px
  stalk looks too thin/spindly for the heavy pod. Thicken/brace it.
- **t5 — FAIL (crowning feature is unmoored particles).** 64% of t5's added pixels float free as a
  scattered dot constellation across the top — the documented "detached/unmoored" pitfall at scale.
  An elite max-tier should read as more *built*, not surrounded by loose sparkles.

## mustFix
1. **t2:** Make the addition a single READABLE on-canvas element (~15–25 solid px). Either draw the
   finder-scope stub as a short solid 2px M/L tube + L objective clearly OFFSET from the main barrel
   (not overlapping it), or render the catwalk as a solid 2px tread ring that overwrites the dome
   shell with a dark M underside line so it reads as a band — not glints lost in shading. It must be
   obviously different from base in the contact strip.
2. **t4:** Thicken the uplink-sphere stalk to 2px and/or add a small base plinth/brace where it meets
   the dome, so the heavy pod doesn't sit on a spindly 1px mast. Recompute the sphere anchor from the
   same stalk-top source so t5 stays consistent.
3. **t5:** Replace most of the free-floating dot scatter with real built structure for the crowning
   feature (e.g. a small gold-trimmed cupola/finial on the dome apex, or gold antenna ribs radiating
   from the uplink pod that are physically CONNECTED to it). Keep at most a thin, sparse halo of glints
   directly hugging the star/optics — no large arcs of unmoored dots in empty sky.
