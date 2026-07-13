# Creative review — PvP / Battle Arena (`pvp_creative`) — Round 1

**Verdict: TWEAK** (close — base + effects are ship-quality; the hero's *crossed-swords* identity does not yet read).

Render: `art/preview/pvp_creative.png` · Source: `art/src/pvp_creative_generic.json` · Builder: `art/gateways/creative_pvp.py`

## Palette — PASS (recolor-safe)
Verified the grid programmatically: only the 13 canonical chars are present
(`K W L M D d h c g G o O r` + `.`). No off-palette chars. Not a blocker.

## What works (cohesive with the family)
- **Arena body is excellent and on-family.** Wide low iso platform, glowing teal arch
  arcade on both front faces, orange banner trim, tiered coliseum bowl with a sunken pit,
  orange emitter dais, crisp `K` outline on the solid body, grounded drop shadow. This
  matches the sibling recipe (grounded body + orange trim + teal glass windows/arches).
- **Projector beam + rising sparks + scattered `+` sparkles** all present and correct —
  same visual language as discovery/research_plan/operations_hub/literature_review.
- **Twin orange tournament flags** are a strong, legible, arena-specific touch.
- Color story (teal glow + orange accents) is spot-on.

## The problem — the hero doesn't read as crossed swords
This is the identity-critical element and the reason for TWEAK. In the full render the
emblem silhouette reads as **antlers / wings / a butterfly over a crest**, not
**crossed swords**:

- The **X is only half-visible.** Above the crossing you see two clean tapered blade
  tips splaying up-and-out (a wide "V"). Below the crossing, the two descending legs of
  the X (toward the pommels) are almost entirely **swallowed by the champion shield**,
  so the eye never completes the "two full swords" read — it sees a V + a shield.
- The **shield is too big and sits too high**, centered right over the crossing zone. It
  eats the lower blade legs and the hilts instead of backing them.
- The **orange hilts read as tiny specks**, not as crossguards + pommels. Without clear
  handles at the two lower corners, "sword" never lands.
- The **crossing center is muddy** — blades, shield top, clash burst, and hilts all
  overlap in a ~12px knot of mixed `W/c/h/o/D/K`, so the cross point reads as a blob
  rather than a clean X. The clash burst gets lost against the crown sparkle above it.
- Minor: the shield carries a `K` outline + `K` device, which adds a touch of "solid
  object" heaviness that fights the "pure floating light" intent the other four holograms
  keep. Not a blocker, but relevant once the shield shrinks.

Compared to the four siblings — each anchored by one **bold glowing teal volume** — this
hero currently reads thinner/spikier and, worse, ambiguous. Fix the read and it lands.

## Concrete fixes
1. **Show the full X.** Extend both blades so each is an unmistakable continuous diagonal
   from its upper *tip* corner to its lower *pommel* corner, crossing at center. The lower
   legs must be clearly visible, not truncated.
2. **Shrink the champion shield and drop it lower** (or push it further behind) so it
   backs the crossing without covering the lower blade legs + hilts. Let the X own the
   focal point; the shield is a supporting crest, not the mass.
3. **Beef up the orange hilts.** Give each lower corner a clear crossguard bar + a round
   pommel knob so "sword handle" reads immediately at both lower tips.
4. **De-clutter the crossing.** Thin out the competing `W/c/D/K` pixels in the center band
   so the clash burst is the single bright focal spark and the X legs read cleanly through
   it.
5. **Optional:** reduce the upward splay a touch (or straighten the blades) so the top
   tips read as sword points rather than antlers/wings.
6. **Optional:** drop or lighten the shield's `K` outline once it's smaller, to keep the
   emblem reading as floating light like its four siblings.
