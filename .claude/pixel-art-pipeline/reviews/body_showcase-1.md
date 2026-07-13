# Body review — showcase_creative (round 1)

**Verdict: SHIP**

Render: `art/preview/showcase_creative.png`
Builder: `art/gateways/creative_showcase.py`
Source grid: `art/src/showcase_creative_generic.json`

## Criterion 1 — Is the body a TALL DOMED ROTUNDA, not a flat box? PASS
The body is unmistakably a round drum capped by a ribbed dome — not a box.
- **Round drum:** built from `isobuild.cylinder` (DCX=32, DR=13, DH=16). Pixel
  inspection confirms it renders as a cylinder in iso: clean vertical `K` side
  outlines at cols 19 / 46 held straight from y=38→53, with an **elliptical
  curved base** (rows 52–54 round inward at the corners: `KKK...KK` foot that
  dips in the middle and rises at the sides). A box would show a straight
  horizontal base + angled corner; this curves. Round footprint confirmed.
- **Dome:** a ribbed `isobuild.dome` sits on the drum with gold meridian ribs
  fanning from the apex and an upper-left specular crescent — a clearly rounded
  cap, capped by a bright gold cornice crescent over the springing line.
- **Tall:** tall gold-framed gallery windows (two per side, cyan glass, top-lit →
  dark sill) span most of the 16px drum height, plus a grand warm-lit arched
  entrance. Reads as a stately gallery rotunda.

## Criterion 2 — Distinct from the other 3 bodies? PASS
- operations_hub: wide, low **hexagonal command center**, flat top with a raised
  central platform + antenna. No dome.
- science_fair: pyramidal **fabric tent / pavilion** with a pennant on a square base.
- pvp: round **open tiered arena / colosseum** — open-top, central pedestal, no dome.
- showcase: round drum + **closed ribbed DOME** — the only domed silhouette in the
  batch. Even vs. the round pvp arena it is clearly distinct (closed dome + cornice
  + gallery windows vs. open stepped arena bowl).

## Criterion 3 — Floating hologram hero + beam + sparkles intact and connected? PASS
- **Star:** faceted teal 5-point gem-star floating high above (SX,SY=32,12), radial
  h→c→g→G gradient, gem facets, emissive rim, hot W core, bloom halo. Intact.
- **Beam:** continuous — sampling column x=32 from the beacon emitter tip (y=23) up
  into the star base shows an unbroken hot `h`/`W`/`c` core on every row
  (y=23 h, 22 h, 21 W, 20 h, 19 c, 18 h). Physically connects beacon → star.
- **Beacon:** small gold-ringed lantern cupola seated on the dome apex, teal emitter
  firing the beam. Connected to the dome.
- **Rings + sparkles:** three concentric broadcast signal rings (teal + one gold
  outer `o`) with W blips, four shine rays, W sparkles, and gold motes around the
  star. All present.

## Criterion 4 — Crisp iso, clean K outline, only 13 canonical chars? PASS
- **Palette:** chars used = `D G K L M O W c d g h o r` (+ `.` transparent). Zero
  off-palette characters — recolor-safe.
- **Outline:** continuous `K` on both drum walls and around the elliptical base;
  dome outline `K`. No gaps or leaks found.
- **Iso:** clean, crisp; cornice/base/window curvature all follow the drum
  foreshortening consistently.

## Optional polish (non-blocking)
- At extreme (16–20x) zoom the beacon cupola's central teal glow + gold cornice bar
  can read faintly face-like. At native 64px it reads correctly as a lantern cupola,
  and the builder already guards against this (single finial, symmetric emitter).
  Not worth a tweak cycle.
