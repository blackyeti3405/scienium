# Literature Review — Image-Match Review (round 2)

**Reference:** `art_ref/mockups/literature_review.png`
**Render:** `art/preview/literature_review_generic.png`
**Source grid:** `art/src/literature_review_generic.json`
**Verdict:** TWEAK (light — one silhouette fix + one stray-accent cleanup)

## Palette
PASS — grid uses only the 13 canonical chars. Verified programmatically: `OFF-PALETTE: []`
(grid chars = D G K L M O W d g o r). The PNG's only non-canonical opaque color is
`#d2d2da` (210,210,218), the preview backdrop — not part of the sprite. All 12 sprite
colors map to the JSON palette.

## Silhouette / massing (graded FIRST)
The two-tier stepped massing is correct and matches the reference — larger base block
front-left, upper block set back-right — and the iso is crisp.

BLOCKER (roof geometry): the top structure is still a **peaked A-frame tent with a
central vertical ridge post rising to an apex point** (clearly visible in the zoomed
roof crop). The reference's top is its most distinctive feature: a **flat, open
rectangular tray/box tilted up-and-back** (near rim low, far rim high) with internal
cross-braces — no central peak. This is the same note round 1 flagged and it went
unchanged. Because the rubric grades silhouette FIRST, a pointed-tent top vs a
flat-open-tray top is a real, immediately-visible fidelity gap in the top third, so it
holds the verdict at TWEAK.

## Focal features + accents
- **Teal window (upper front, between orange posts):** FIXED from round 1. The bright
  saturated cyan (`h`/`c`) is fully removed — only muted `g`/`G` remain, and the
  footprint is small. Orange is now clearly the dominant accent (94 orange cells vs 17
  teal). This resolves round 1's primary blocker.
- **Open book (mid deck):** GOOD — central dark spine splitting two symmetric halves of
  page-lines; reads as an open book.
- **Base archway + orange trim:** GOOD — matches.
- **Orange support posts:** GOOD — two posts flank the upper-front window, matching the
  reference's post–window–post grouping.
- **Left awning slats + right dangling legs:** GOOD — striped louvered awning on the
  left, thin orange dangling legs on the right.
- **Stray teal panels on lower-left base face:** OFF-REFERENCE. The zoomed lower-left
  crop shows two teal (`g`/`G`) blocks on the front-left base wall (grid rows ~45–52,
  x~10–14). In the reference that wall is plain grey (the striping is the awning hanging
  above it), so these read as extra teal windows/gems that aren't in the source. Minor,
  but they reinforce the leftover teal over-read.

## Concrete tweaks
1. **Flatten the roof (primary).** Remove the central vertical ridge post / A-frame apex
   at top-center and rebuild the top as a flat open rectangular tray tilted up-and-back:
   near rim low, far rim high, open interior, with one or two internal cross-braces —
   matching the reference's signature flat open box-top instead of a tent.
2. **Remove the two stray teal panels on the front-left base face** (grid rows ~45–52,
   x~10–14; the `GG`/`GGG`/`G` clusters). Return that wall to plain grey (`M`/`L`/`D`).
   Keep teal only as the muted hatched panel in the upper window between the orange posts.

Everything else — the open book, base archway, orange posts, left awning, right dangling
legs, and the now-balanced orange-dominant accents — is on target. Keep it.
