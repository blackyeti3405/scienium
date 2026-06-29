# Review — biocore / bioinformatics-suite (round 1)

**Verdict: APPROVE**

Judged from the CURRENT rendered PNGs (contact strip + per-stage previews + base),
cross-checked with pixel diffs of the live sprites in
`apps/web/public/sprites/buildings/biocore/`. (Note: the deltas/geometry below reflect
the sprites as rendered now; they differ from an earlier draft of this file, so the PNGs
were regenerated since.)

Base byte-identity: `BASE_IDENTICAL True`. All five stages 64x64, identical footprint
(bbox x8-60 y2-63 every stage). No addition overshoots the canvas — top/left/right edges
have zero opaque pixels; only the existing base footprint touches the bottom row (7px,
unchanged from base). The hovering genome/DNA orbital ring (signature) is drawn last and
is unoccluded in every stage.

## Per-stage (NEW-opaque px vs previous stage, from live PNGs)
- **base**: unchanged shipped pavilion + hovering Circos/DNA orbital ring. Byte-identical.
- **_t2** (small, +6px @ x18-20 y23-27): slim sensor/probe MAST with a pale node rising
  off the upper-left deck. Tiny, but it raises the deck silhouette by 4-5px into pixels
  that were transparent in base — a real add, not a recolor, and legible at 64px because
  it breaks the outline. Weakest stage by mass but passes.
- **_t3** (structural, +91px @ x45-58 y24-38): a secondary ANNEX/compute mass bolted onto
  the right shoulder of the upper tier, stepping the right silhouette out into previously
  empty canvas. Strong, on-theme.
- **_t4** (major, +101px @ x12-25 y19-31): a prominent new MODULE/block mass on the left.
  Greens deepen to darker olive here — colour maturation reads. Clears the ring's left lobe.
- **_t5** (crowning, +77px @ x8-39 y3-20): the orbital ring DOUBLES — a second smaller
  ring blooms upper-left, overlapping/linked to the main ring (anchored, not floating),
  plus a GOLD emission burst. Gold `q` is painted ONLY in t5 (21px; zero painted `q` in
  base/t2/t3/t4 — verified in source). Reads as fully maxed/elite, same pavilion.

## Notes (non-blocking)
- Cumulative confirmed by pixel test: t2 probe (15px), t3 annex (157px), t4 module (157px)
  regions all remain opaque in t5.
- Ramp 6 → 91 → 101 → 77 new px; each consecutive diff lands in a NEW region (t2 left deck,
  t3 right, t4 left, t5 upper-left) — smooth, no no-op or overwriting stage.
- Gold discipline correct: orange/amber particles in earlier stages are the base's own
  `o`/`O`/`r` accent family, NOT the premium gold `q`, which is reserved entirely to t5.
- t2 is the weakest stage by mass; it genuinely grows the silhouette so it passes, but a
  slightly chunkier vent/dish would strengthen it if a round 2 happens for another reason —
  not worth a revision on its own.
