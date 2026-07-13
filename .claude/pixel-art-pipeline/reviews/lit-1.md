# Literature Review — Image-Match Review (round 1)

**Reference:** `art_ref/mockups/literature_review.png`
**Render:** `art/preview/literature_review_generic.png`
**Verdict:** TWEAK (light — strong progress from round 0; one focused accent fix remains)

## Palette
PASS — grid uses only the 13 canonical chars (D G K L M O W c d g h o r, `.`=transparent). Verified programmatically: zero off-palette chars in the grid, and the PNG's only non-canonical color is `#d2d2da`, the preview backdrop (not part of the sprite).

## Silhouette / massing (graded first)
Two-tier stepped massing is correct — lower base block front-left, upper block set back-right — and the iso is crisp. The round-0 blocker (solid roof slab) is FIXED: the top is now an open, airy framed structure instead of a closed slab, so the top-third silhouette reads much closer to the reference.

Remaining shape nuance: the reference's roof is a flat **open rectangular tray/box** tilted up-and-back (near rim low, far rim high, with internal cross-braces). The render instead builds a symmetric **peaked A-frame tent** with a central ridge post rising to an apex. Both read as "open frame," so this is no longer a hard fail, but the geometry differs — flattening the peak toward a rectangular open tray would tighten fidelity.

## Focal features + accents
- **Open book (mid deck):** FIXED. Now reads as an open book — a central dark spine splitting two symmetric halves of horizontal page-lines. Clear improvement over round-0's teal cube. (Reference book is a more upright splayed V; render's is flatter/top-down, but "open book" is legible.)
- **Base archway:** GOOD — dark archway with orange trim at the bottom base matches.
- **Orange support posts:** GOOD — two orange posts flank the upper-front element, matching the reference's post–window–post grouping.
- **Side awnings + dangling legs:** GOOD — striped louvered awning on the left and thin orange dangling support legs on the right match the reference.
- **Upper-front window (teal):** WEAK — the round-0 note to dial back the teal is only partially addressed. It is still a bright, saturated cyan glow that reads as a glowing gem/crystal and over-reads relative to the orange. The reference window here is a **muted green/purple pencil-hatched panel**, with rust/orange as the only strong accent. The bright teal pulls the muted-grey reference toward a different feel and steals emphasis from the orange columns.

## Concrete tweaks
1. **Dial back the teal window.** Reduce its saturation and footprint (lean on `G`/`g` over `c`/`h`, and shrink the glowing core) so it reads as a quiet glass/hatched panel, keeping the orange posts the primary accent — matching the reference's muted green/purple window.
2. **(Optional, secondary) Flatten the roof** from a symmetric peaked tent toward a flat open rectangular tray/box tilted back with a visible inner floor and one or two cross-braces, to match the reference's roof geometry rather than an A-frame apex.

Keep everything else — the now-legible open book, base archway, orange posts, and side awnings/legs are all on target.
