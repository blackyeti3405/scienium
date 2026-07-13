# Creative review — showcase_creative (round 0)

**Verdict: TWEAK**

## Palette (hard gate)
PASS. `art/src/showcase_creative_generic.json` uses only the 13 canonical chars
(`K W L M D d / h c g G / o O r`) plus `.`. Verified programmatically — zero
off-palette chars, all 64 rows are exactly 64 wide. Recolor-safe.

## What works (keep it)
- **The floating star hologram is genuinely spectacular.** Clean 5-point teal star
  (`h/c/g` with `W`/`h` highlight core) reads instantly as SHOWCASE / fair identity.
  Concentric elliptical signal rings (orange `o` dashes + teal `c/g`) broadcasting
  outward, `W` sparkles scattered — exactly the family visual language of the other
  four creatives. This top half is fully cohesive and hits the "spectacular" bar.
- **Building + trim are on-family:** iso box, lavender `L/M/D` walls, teal `g/G`
  windows in gold `o` frames, gold rim trim — matches operations_hub / literature_review.
- **The two orange pennant flags** are a new element vs the other four, but they read
  as "the fair pavilion" and reinforce the showcase identity. Tasteful, keep them.

## What breaks it (why TWEAK, not SHIP)
1. **The beacon — the named hero — reads as a smiling face, not a broadcast spire.**
   The blueprint says "Hero = the broadcast beacon ... a glowing spire/antenna firing a
   light beam." Instead there's an orange rounded blob with two symmetric orange dot
   "eyes" and a lighter `O` dot "nose," sitting on a purple podium wrapped in a heavy
   black `K` U-shape. It genuinely reads as a muffin/creature face. This is the single
   most-resolved-should-be element and it's the muddiest — it undercuts the whole piece.
2. **Roof feels empty and the beacon has no real base.** The beacon floats in a big flat
   lavender expanse with only a dark outline under it. Compare operations_hub's raised
   ringed emitter platform and literature_review's stepped pyramid pedestal — those give
   the emitter presence. Here the emitter looks small and stranded.
3. **Beam is thin/segmented.** The 2px teal column between beacon tip and the rings is
   weak and slightly broken, so the "firing a beam" energy doesn't land like the streams
   in the other four.

## Concrete fixes
- Redesign the beacon to read unmistakably as a broadcast emitter, NOT a face. Remove the
  two symmetric orange "eye" dots and the central `O` "nose." Make it a tall slim vertical
  spire/antenna with a glowing teal `c/h` tip and 1–2 gold `o` bands, OR a compact emitter
  dish/coil (reuse the operations_hub orange-ring emitter idiom) with a teal glow core.
  Vertical + tall so the beam clearly originates from a tip.
- Give the beacon a small stepped pedestal: a 1–2px gold `o` / lavender `M` base ring
  sitting on the roof (like operations_hub's platform), replacing the heavy black `K`
  U-outline — fills the empty roof and grounds the emitter.
- Thicken the beam to a ~3px core (`h` center, `c/g` soft edges) and close the gap so it's
  one continuous column from beacon tip to star. Add a few `W`/`h` bloom pixels where the
  beam leaves the emitter to sell the broadcast, matching the emitter glow of the other four.
