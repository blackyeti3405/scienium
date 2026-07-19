# Creative review — PvP / Battle Arena (round 2)

**Verdict: TWEAK**

Render: `art/preview/pvp_creative.png` (64×64 ×8). Compared against the four family
creatives (discovery, research_plan, operations_hub, literature_review) and the
blueprint `.claude/pixel-art-pipeline/blueprints/creative_pvp.md`.

## Palette — PASS
JSON `art/src/pvp_creative_generic.json` uses only `K W L M D d h c g G o O r`
(+ `.` transparent). All 13 canonical chars, zero off-palette. Recolor-safe.

## What works (cohesive with the family)
- Same visual language as the other four: glowing teal `h/c` hologram hero floating
  over the building, orange `o/O/r` accents, `W`/`c` sparkle crosses scattered, a
  teal projector beam rising from the roof. Reads as the same family at a glance.
- The base clearly reads as an **arena/coliseum**: iso square platform, teal-glowing
  arched windows along the front faces (matches the glowing-window rows of the other
  four), orange trim, clean K outline on the roof diamond, family shadow blob.
- Twin orange tournament flags on dark `d` poles at the back roof corners — on-brief.
- Genuinely spectacular glow; crisp iso overall.

## Why TWEAK — the hero misreads
The single identity-defining element (crossed swords / battle emblem) does not read
as crossed swords. As drawn, the two blades **converge at the bottom and fan upward
into a V** — there is no crossing/overlap point. First-glance reads are "wishbone /
antlers / rocket exhaust / sprout," not "crossed blades." The other four heroes are
instantly legible (crystal, wireframe diamond, gem+ring, open book); this one is the
outlier. Contributing causes:
- **No actual X.** The blades meet at a single base instead of overlapping in a
  saltire, so all four arms of a crossed-swords emblem aren't present.
- **No `g` shield/crest** behind the blades (the blueprint calls for one). Nothing
  anchors the emblem as a combat badge.
- **No sword anatomy** — the blades are tapered spikes with no crossguards, hilts, or
  pommels, so they don't read as weapons.
- The orange clash sparks sit at the beam base above the roof, not at a cross point,
  so they don't sell "blades clashing."

## Concrete fixes
1. Redraw the hero as a true **X / saltire of two crossed swords**: overlap them in
   the center so two pointed tips fan up-and-out and two hilts/pommels splay
   down-and-out, with a clear crossing point in the middle. Kill the current
   bottom-convergence V.
2. Add a small teal `g` **shield/crest behind** the crossed blades (per blueprint) to
   anchor it as a battle emblem.
3. Give each blade **sword anatomy** — a narrow pointed tip, a short crossguard bar,
   and a hilt/pommel — so it reads as a weapon, not a spike.
4. Move the `W`/`c` clash-spark burst to the **cross point** (center of the X) to sell
   the clash; keep the projector beam feeding the emblem from below.

## Minor / optional
- The arena-floor roof surface has noisy alternating gray/purple dithering that reads
  a touch muddy vs. the cleaner tops of the other four — consider simplifying.
- Flag pennants are slightly blobby; a crisper `o` triangle would sharpen them.
