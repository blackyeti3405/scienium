# Creative review — Operations Hub (gateway), round 1

**Verdict: TWEAK**

Render: `art/preview/operations_hub_creative.png` (64×64 ×8)
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_operations_hub.md`

## Palette check — PASS
Source `art/src/operations_hub_creative_generic.json` uses ONLY the 13 canonical
chars (`D G K L M O W c d g h o r`) + `.` transparent. Zero off-palette. Recolor-safe.

## What works (genuinely spectacular)
- **Hologram hero delivers.** The floating teal radar globe is big, glowing, and
  dithered with energy sparkle. The orbiting orange rings read correctly as an orbit
  — bright cream/`O` in front, dark at the back where they pass behind the sphere.
  `W` blip sparkles scattered inside sell the radar read. This is the spectacular
  centerpiece the brief asked for.
- **Projector collar + beam is the crispest part of the base.** Clean orange (`o/O`)
  ring with a solid K outline, teal energy column rising, sparkles climbing into the
  globe. Excellent junction — connects base to hero convincingly.
- **Identity reads.** Wide command center + floating radar globe + orange
  console/hazard trim = unmistakably "mission control / Operations Hub."
- **Cohesive palette/vibe with `_t5`** — teal glass + orange/gold trim + sparkles,
  navy K silhouette, drop shadow. Same family as robotics-bay / deep-earth.

## What holds it back (why TWEAK, not SHIP)
1. **Front-face control screens are mushy blobs.** The teal `c/h/g` screens on the
   dark front walls read as irregular clumps, not framed monitors. They lack the
   crisp rectangular K borders that make `_t5` panels legible (cf. the framed glowing
   windows on volt-lab robotics-bay). At final 64px sprite size these will smear into
   a dark speckled smudge — the single biggest legibility risk and the blueprint's
   stated "bank of glowing control screens" doesn't land crisply.
2. **Wall orange trim reads as noise, not deliberate detail.** The scattered single
   orange pixels peppering the dark front faces feel like speckle rather than an
   intentional console-button row or hazard stripe. `_t5` surfaces are cleaner and
   more deliberate; this base is comparatively busy/muddy.
3. **Radar "sweep beam" is not legible.** Blueprint calls for a sweeping radar beam
   across the globe; only the orbiting rings clearly read. A distinct sweep wedge
   would strengthen the radar identity.

The hero + projector are near-shippable; the base front face falls short of the
crisp `_t5` bar. Fixes are concrete and bounded.

## Concrete fixes
- Give each front screen a crisp rectangular frame: 1px K border, `g` glass fill,
  a `c`/`W` highlight line inside — 2–3 clean monitors per face instead of organic
  teal blobs. Align them to the iso grid so verticals/horizontals stay clean.
- Convert the scattered wall orange pixels into one deliberate element: either a
  single continuous `o` hazard stripe following the wall-base iso edge, or an evenly
  spaced row of `O` console lights under the screens. Kill the random speckle.
- Add a legible radar sweep: a lighter `c`/`W` wedge from globe center out to the
  rim (one orbit position) so it reads as an active radar dish, not just orbit rings.
- Optional: tighten the globe's left rim where the glow feathers into the sky by
  one pixel so the silhouette reads a touch cleaner (soft glow is fine — just the
  far-left edge is slightly fuzzy).
