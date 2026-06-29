# Review — terrabase / climate-modeling-station (round 0)

**Verdict: CHANGES_REQUESTED** — t2 only. base, t3, t4, t5 are good; do not touch them.

## Checks
- Base byte-identical to shipped PNG: **PASS** (`BASE_IDENTICAL True`).
- Cumulative (no earlier addition removed at higher stages): **PASS** — 0 pixels go transparent across every consecutive pair.
- On-canvas / 64x64 / footprint unchanged: **PASS** — all stages 64x64, zero edge-touch, bbox inside 0..63 (left edge only grows 14→12 for the t4 silo).
- Gold reserved to t5: **FAIL at t2** — a gold pixel leaks in at (35,28)/(35,29) `(255,206,128)/(224,168,80)`.
- Every stage visibly ADDS structure (not a recolor): **FAIL at t2** (see below).
- Unique + on-theme, signature overhead sensor array not occluded: **PASS**.

## Per-stage
- **base**: server-block + roof data-pool + side window banks + overhead orbital sensor/dish stack and cloud glyph (signature). Unchanged. OK.
- **t2**: **NO-OP-ish recolor.** Incremental diff is only 27 px in bbox (25,21)-(46,26); nearly all of it overwrites the EXISTING emission disc from mid-teal `(29,132,116)` to bright glow `(164,226,212)` plus a few sparkle flecks and one stray gold dot. No new geometry — no vent/antenna/crate/pipe/dish. Indistinguishable from base at a glance in the contact strip. FAIL.
- **t3**: real structural add — diamond-window instrument bay / annex bolted onto the lower-right face (138 px, bbox (47,49)-(57,56)). Clear, on-theme. OK.
- **t4**: real major mass — brown stacked coolant/sample silo tower with teal vapor crown, upper-left (166 px, bbox (12,10)-(28,39)). Prominent, on-theme. OK.
- **t5**: crowning gold-rimmed atmospheric canopy/dome at the top (73 px, bbox (27,4)-(44,11)). Gold correctly reserved to t5, reads as maxed/elite. OK.

## mustFix
1. **_t2**: replace the glow-recolor of the existing emission disc with a real modest on-theme element — e.g. a short roof vent/exhaust stub or a small secondary sensor dish/probe on a 2-3px plinth, anchored ON the roof slab near (33-40, 26-30) without occluding the overhead orbital stack. Add genuine geometry (outline + fill), not just brighter teal.
2. **_t2**: remove the stray gold pixels at (35,28)/(35,29) — gold is a t5-only flourish; t2 must use only the lab's base + evolved-teal keys.
