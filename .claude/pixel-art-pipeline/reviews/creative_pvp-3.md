# Creative review — PvP / Battle Arena (`pvp_creative`) — Round 3

**Verdict: SHIP**

Render: `art/preview/pvp_creative.png` (64×64 ×8) · Source: `art/src/pvp_creative_generic.json` ·
Builder: `art/gateways/creative_pvp.py`. Compared against the four family creatives
(discovery, research_plan, operations_hub, literature_review) and the blueprint
`.claude/pixel-art-pipeline/blueprints/creative_pvp.md`.

## Palette — PASS (recolor-safe)
Verified the grid programmatically: only the 13 canonical chars are present
(`K W L M D d h c g G o O r` + `.` transparent). Zero off-palette. `recolor.py`-safe.

## The blocking issue from rounds 1 & 2 is fixed — the hero now reads as CROSSED SWORDS
Both prior TWEAKs were for the same reason: the emblem read as a V / wishbone / antlers,
not crossed blades. That is resolved. The hero is now an unmistakable **saltire (X)**:
- Two full teal blades cross at the center; **two pointed tips fan up-and-out** at the top
  and **two orange hilts splay down-and-out** at the bottom — all four arms of a
  crossed-swords emblem are present and legible.
- Real **sword anatomy**: pointed white-hot tips, continuous teal blades with `h` lit edges
  and `W` glints, compact orange crossguard bars, short grips, and round pommel knobs at
  the two lower corners. It reads as weapons, not spikes.
- A compact teal `g/G` **champion crest** sits behind the crossing, anchoring it as a combat
  badge without swallowing the lower blade legs (the round-1 failure).
- The `W`/`c` **clash burst sits on the cross point**, selling the clash.

## Cohesive + spectacular (on-family)
- Same recipe as the four siblings: floating glowing-teal hologram hero + projector beam
  rising from the pit + rising `W/c` spark updraft + scattered `+`/diamond sparkles +
  orange accents + grounded drop shadow. Reads as the same family at a glance.
- The base clearly reads as an **arena/coliseum**: wide low iso platform, glowing teal
  arched arcade on both front faces, double orange banner trim, a tiered bowl stepping down
  to a sunken pit with an orange emitter well, and **twin orange tournament pennants** on
  dark poles at the roof corners — the arena-specific, on-brief touch.
- Crisp iso; clean `K` outline on the solid body; the emblem carries no black so it reads as
  pure floating light like its siblings. The roof/floor dithering noise flagged in round 2
  is gone — the bowl now reads as clean concentric steps. Flag pennants are crisper too.

## Minor / optional polish (non-blocking — do NOT gate on these)
- The crossing + crest form a fairly dense teal mass in the emblem's middle, so the white
  clash-burst is a touch subdued against the teal behind it. A slightly punchier `W` core
  would make the "clash" pop more — optional.
- The chunky orange hilts give the bottom of the emblem a little extra weight vs. the
  cleaner single teal volumes of the siblings; on-brief (blueprint calls for orange hilts),
  just noting it. No change required.
