# Literature Review — Image-Match Review (round 5)

**Reference:** `art_ref/mockups/literature_review.png`
**Render:** `art/preview/literature_review_generic.png`
**Source grid:** `art/src/literature_review_generic.json` (64×64)

## Verdict: TWEAK (near-miss)

Close, feature-complete, and clean iso — one dominant-silhouette element (the open-crate
roof) is off-shape, plus two minor blemishes. Everything else matches well.

## Palette check — PASS
Grid uses only `D K L M O W d o r` (+ `.` transparent). All within the 13 canonical chars.
Palette dict defines exactly the canonical set (`D G K L M O W c d g h o r`). No off-palette chars.

## Fidelity grading

### Silhouette / massing / footprint — mostly matches
The tall 2-tier stack reads correctly top→bottom: open top → upper box with posts →
open book straddling the mid platform → lower box with side awnings/stilts → arched base.
Footprint and proportions track the reference. The one real deviation is the **top**:
the reference is a crisp **rectangular open crate/frame** with a thin rim that **overhangs**
the back and sides (angular parallelogram opening, hatched interior) — it's the dominant
silhouette element. The render instead shows a smaller **rounded/oval sunken basin** with
almost no overhanging lip, so the signature roof loses its angular, overhanging read.

### Focal features — strong
- **Hero open book (center):** excellent. Light pages, horizontal "text" ruling, and a
  center spine — the single best-matched element, and clearly centered as the focal point.
- **Two orange posts (upper tier):** present and vertical. ✓
- **Right awning on orange stilts:** platform juts right with two dangling orange legs. ✓
- **Bottom arch/tunnel:** dark opening with orange outline, bottom-center. ✓
- **Left awning:** present but reads as messy stepped hatching rather than the reference's
  clean diagonal canopy — the two side awnings don't read as a matched pair.

### Blemishes
- A lone thin **antenna spike** pokes up at the top-left with no counterpart in the reference
  (the sketch's top-back is the crate's far rim, not a single mast) — reads as an artifact.
- A **full-height dark vertical seam** runs from the upper post down through the book and into
  the arch; where it crosses the book face it reads as a crack rather than a book spine.

## Tweaks
1. Rebuild the top as a **crisp rectangular open frame/crate** — straight iso edges, a visible
   rim that **overhangs** the back and sides, dark (optionally hatched) interior. It's the
   dominant feature and should be angular + overhanging, not a rounded sunken basin.
2. Remove the stray **antenna spike** at top-left (or fold it into the crate's far rim).
3. Redo the **left awning** as a clean diagonal canopy to mirror the right stilted awning, so
   the two side awnings read as a matched pair.
4. Break/soften the **vertical dark seam** where it crosses the book face so the spine stops at
   the book and it reads as a discrete object on the platform, not a crack through the wall.
