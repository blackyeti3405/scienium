# Review — axiom / theoretical-physics-annex (round 1)

**Verdict: CHANGES_REQUESTED**

Base byte-identity: **BASE_IDENTICAL True** (stage 1 untouched). No edge clipping in any stage
(checked rows/cols 0 and 63 — all clear). Cumulative chain holds: each stage keeps every prior
addition. Two stages fall short on the checklist — t5 (primary) and t4 (secondary).

## Per-stage
- **base** — unchanged, byte-identical to shipped PNG. Pass.
- **t2** — propped chalk-tablet easel on the lit wing roof deck (43 changed px, region x32-38/y25-30).
  Small, on-theme, clearly reads as new. Good.
- **t3** — slim study-tower setback storey on the study block (288 changed px, x13-32/y7-21). A real new
  Box mass that grows the tall leg up one level. Strong structural beat. Good.
- **t4** — gravity-well orrery mast on the wing's right-front roof. Genuinely a NEW distinct object and
  on-theme, BUT undersized for the "major add" beat: only ~45 changed px (smaller than t2 and far
  smaller than t3), and the orbit ring (rx=4, ry=2) is barely legible at 64px — it reads as a tiny
  flask, not a prominent new mass. Borderline; bump it.
- **t5** — FAILS as a crowning stage. Measured t4->t5 diff = 52 px, of which **30 are floating spray
  particles up in the sky (y<22)**, and the final char grid holds only **2 gold `q` pixels total**
  (both on the orrery ring; the intended gold sill BANNER renders **0** surviving `q` — its 1-row `q`
  plate is fully overpainted by its own `O` top edge + `r` underside). Net visible change reads as
  scattered, detached dots (the documented "unmoored blobs" pitfall) plus an invisible gold flourish.
  Does NOT read as a fully built-out, elite version; the premium-gold requirement is effectively unmet.

## mustFix
- **t5 — gold flourish is invisible (2 px, banner gone):** the `stage5_lattice_bloom` gold sill banner
  at `pv=10.8` is 1.1 rows tall, so the `O` top-edge line and `r` underside line overpaint the entire
  `q` plate — net 0 gold pixels survive there. Make the gold banner at least 2-3 rows of solid `q`
  (draw the `q` fill, then keep an interior `q` row that is NOT overdrawn by the `O`/`r` edge lines),
  and/or add a clearly readable gold crowning element high on the maxed structure (e.g. a `q` finial/
  pennant on the study-tower roof or a `q` collar on the orrery mast) so gold reads as an intentional
  t5 flourish, not 2 stray ring pixels. Target: a visible cluster of `q` (roughly 8+ px) that the eye
  registers as gold.
- **t5 — crowning change is scattered floating particles, not a coherent feature:** `stage5_grid_bloom`
  only writes into empty `.` cells (`if c.px[yi][xi] == "."`), so its halo ring + rim glyphs deposit
  only into the gaps of the already-dense grid and land as detached dots in the sky. Make the bloom
  read as a real deepening of the funnel: thicken/brighten the EXISTING rim edges in place (allow it to
  overpaint the current `c/g/h` grid wires with `E/e` along the rim, not just empty cells), and anchor
  the glow ON the funnel silhouette so it hugs the hero instead of scattering above it. The bloom must
  read as "the lattice fully energized," distinct and connected, not extra confetti.
- **t4 — orrery too small for the major beat:** enlarge so it clearly outweighs the t2/t3 adds — taller
  mast and a larger, more legible orbit ring (e.g. rx≈6, ry≈3 with a thicker front arc), keeping the
  left tip clear of the grid funnel mass at x≈39 and everything on-canvas. Recompute t5's orrery
  energize from the SAME `_orrery_core(w)` anchor after resizing so t5 stays consistent.

## Passing (do not change)
base, t2, t3 are good. Colour maturation (deep `b` structure in t3+, energized `e`/`E` in t4/t5) is on
the right track; only the gold (`q`) reservation needs to actually render in t5.
