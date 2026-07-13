# Discovery gateway — fidelity review (disc_densify round 1)

Reference: `art_ref/mockups/discovery.png`
Render: `art/preview/discovery_generic.png`
Source: `art/src/discovery_generic.json` (built by `art/gateways/build_discovery.py`)

**Verdict: TWEAK** — but a *near-ship* recovery. Round 0 was a regression (both roof
heroes misread as kitchenware, faces went bare); round 1 has rebuilt the dish and
the drum so they read correctly again and re-densified the faces. One prominent
glazing element from the drawing is still missing and the front massing still
splits into two blocks. Both are small, targeted fixes.

## Palette check — PASS
Grid uses only `K W L M D d h c g G o O r` (+ `.` transparent) — all 13 canonical
chars, declared palette keys all canonical. No off-palette glyphs.

## Silhouette / massing
- Chunky observatory cube, front corner to viewer, roof plane visible, dish on the
  left-back roof, sensor drum on the right roof edge — directionally faithful to the
  drawing. True 2:1 iso, crisp K box outline, no AA blur on primary forms.
- **Still reads as two blocks, not one cube.** A deep vertical dark seam plus the
  front notch splits the lit left block (ladder + entry) from the right block (big
  face + window). The drawing is a single unified volume with a *shallow* front step.
  Carried over (softened) from round 0.
- Dish sits high on a tall stem, floating a touch above the roof; the drawing seats
  it more nestled on the roofline. Minor.

## What now matches the drawing (keep — these are the round-1 wins)
1. **Satellite dish reads as a dish again.** Tilted parabolic disc with a K rim ring,
   concave interior (W highlight upper / M–D shadow lower), a straight K feed-arm
   across the face to a feed node, and a mount stem to the roof. The round-0
   spoon/paddle read is gone.
2. **Right hero reads as a horizontal sensor drum.** Banded barrel (diagonal K/orange
   rings) into a riveted domed end-cap with a W highlight, seated on the right roof
   edge. The round-0 mixing-bowl-+-stir-stick read is gone.
3. **Left greeble is now legible structure.** A vertical K ladder/truss column with
   rungs, an orange conduit line, and a teal window — reads as a busy rig, not a dark
   smudge. Left K silhouette stays crisp.
4. **Right-face window restored** as teal glass with an orange trim frame (drawing's
   striped window; teal is correct for the generic palette, recolor tints per skin).
5. **Orange trim wraps** the top roof eaves and the front + right base bands.

## Why it's still a TWEAK (fidelity gaps vs. the drawing)
1. **Roof skylight glazing is missing (primary remaining miss).** The drawing carries a
   prominent green/teal striped window panel on the roof between the dish and the drum.
   The render's roof plane there is bare lavender — only orange eave dots and a 2px teal
   fleck near the dish stem. Round 5 had this element (its "hero #3 solar panel"); the
   densify passes dropped it, leaving the roof plane emptier than the reference.
2. **Body splits into two blocks** (see massing above) — the deep front seam/notch reads
   as a detached tower rather than the drawing's one chunky stepped cube.
3. **Dish rim is slightly lumpy** on the lower-left arc — the K ellipse ring wobbles by
   1–2px so the parabola isn't perfectly crisp. Cosmetic; the feed-arm + mount already land.

## Concrete fixes (toward the drawing)
- **Add the roof skylight panel:** a teal `g`/`G` glass rectangle with a 1px K frame on
  the right roof plane between the dish stem and the drum (the drawing's green striped
  roof window). Reuse the existing roof/`wall_win` glazing helper. This is the single
  biggest remaining gap and restores the roof's density.
- **Shallow the front notch / raise the connecting roof** so the left and right masses
  read as one unified cube with a shallow step, not two towers joined at the back. Thin
  the deep central dark seam.
- **Even out the dish rim** — clean the K ellipse ring by 1–2px on the lower-left so the
  disc reads as a crisp parabola. Optionally drop the dish 1–2px to nestle it onto the
  roof instead of floating on the stem.

Bottom line: the two roof heroes and the left/right glazing are back to round-5 quality
and denser — this is one glazing element (roof skylight) plus a massing tightening away
from ship, not a rebuild.
