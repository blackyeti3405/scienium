# Creative review — Science Fair gateway (round 2)

**Verdict: TWEAK** (close to SHIP — one execution issue around the hero)

Render reviewed: `art/preview/science_fair_creative.png`
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_science_fair.md`
Family reference: discovery / research_plan / operations_hub / literature_review creatives.

## Palette
PASS. Scanned `art/src/science_fair_creative_generic.json`: rows use only
`D G K L M O W c d g h o r` (+ transparent `.`). Zero off-palette chars. Recolor-safe.

## What's working (cohesive + spectacular)
- **Reads instantly as its identity** — a floating holographic winner's TROPHY = awards /
  science-fair pavilion. Unmistakable, and a genuinely strong hero.
- **Family visual language is all present**: glowing teal hologram hero, a projector
  beam/light-cone rising from a clean orange emitter dish (matches operations_hub's tidy
  emitter), rising `W` sparkles + orange/teal confetti, grounded `K` drop shadow.
- **The pavilion base is family-grade** — crisp iso box, clean `K` outline, teal exhibit
  windows with `h` top-highlight + `K` bezels on both faces, orange rim-piping with `O`
  corner bolts. Sits comfortably next to operations_hub / literature_review.
- Festive tells land: the roof-corner **pennant flag-pole** and the front-ridge **bunting**
  swag both read.
- Trophy shading (bright upper-left `h/c` → dim `g/G` lower-right) + the dithered `c` bloom
  halo make it read as pure floating light with no black — correct for the family.

## Why TWEAK (the one thing holding it back)
The area **around the trophy bowl is noisy** in a way the four siblings are not. The two
orbiting orange ribbon rings (`ribbon_ring`, tilt −13 and +20) plus the teal C-handles
(`trophy_handles`) all cross the same band beside the cup, and stray `o` ribbon pixels
scatter into the `c` bloom halo. The net effect is a scratchy orange tangle rather than the
clean, deliberate orbit that operations_hub achieves with its single legible ring. At the
"spectacular" bar, next to four polished heroes, that scattered look is the tell that keeps
it from a clean SHIP. Everything else is ship-ready.

## Concrete fixes
1. **Calm the orbiting rings.** Drop to ONE continuous elliptical ribbon ring (or keep two
   but make each a solid unbroken arc), and clamp ribbon pixels so none land inside the
   bloom-halo radius — right now `o` flecks in the halo read as noise, not orbit. Target
   operations_hub's clean single-ring legibility.
2. **Separate the handles from the rings.** The two C-handles currently fight the ribbons
   and don't read as cup handles. Either nudge the ring tilt/phase so the rings don't cross
   the handle band, or push the handles a pixel further off the (already narrower) bowl so
   each loop reads as a distinct handle.
3. **(Minor) Pop the winner's star.** The `W` star emblem on the bowl is nearly invisible
   against the teal fill — give it one more frame of contrast so the "trophy" cue is
   instant at 64px.

None of these touch the base or palette — all live in `ribbon_ring` / `trophy_handles` /
the star block of `hologram_trophy` in `art/gateways/creative_science_fair.py`.
