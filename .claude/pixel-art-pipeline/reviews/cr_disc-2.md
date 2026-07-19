# Creative review — Discovery gateway (_t5 spectacular) — round 2

**Verdict: TWEAK**

Render: `art/preview/discovery_creative.png` · Source: `art/gateways/creative_discovery.py`

## Palette — PASS
Verified `art/src/discovery_creative_generic.json`: only the 13 canonical chars are
used (`D G K L M O W c d g h o`; `r` defined-but-unused, which is fine) plus the
transparent blank. No off-palette hex. 64×64. Recolor-safe.

## What already works (keep it)
- **Observatory massing is crisp and cohesive with _t5.** The dome has a real
  L→M→D→d ramp under a clean K silhouette, lit-left/shaded-right reads instantly.
  Best part of the sprite.
- **Warm accents land** — glowing arched door, gold dome-foot rim, orange muzzle
  lens. Good teal-glass clerestory windows with the G shadow beneath so they pop.
- **Telescope reads** as an angled K-outlined tube with a gold lens aperture — on a
  zoom it clearly is a telescope firing upward. Better than it looks at 1×.
- Identity is legible: dome + scope + dish = observatory = Discovery. Good.

## Why it's TWEAK — the hero and two FX don't clear the "spectacular" bar

1. **The galaxy reads as a noisy dust-cloud, not a spiral (biggest issue).** On a
   zoom the spiral arms have broken into scattered, disconnected teal pixels and
   dashes with a few orange specks — it looks like static/confetti around the core
   bloom, exactly what the blueprint warns against ("sparse — not confetti"). The
   log-spiral grows too fast (`2.6 * exp(0.330*th)`) so the sampled line segments
   dot out into isolated pixels instead of continuous curved bands. The _t5 heroes
   are crisp and solid; this hero is the least crisp thing on the sprite. The core
   *bloom* itself (W→h→c oval) is lovely — it's the arms that read as noise.

2. **The beam is thin and broken — scope and galaxy don't connect.** Between the
   muzzle (y~22) and the core bloom there's a dark gap and the shaft reads as a
   faint dashed teal line, not the "bold glowing column" the code intends. The
   random `if f>0.55 rnd<0.5` spread + drift dashes it out. A _t5 building sells the
   effect with one unbroken bright shaft; here it's the visual weak link tying the
   two halves together.

3. **The dish is a pale grey-purple blob, and the signal arcs don't crackle.** The
   cup is shaded only L/M/D so it reads as a lavender spoon/mirror, not an energy
   dish — no teal-glass facing at all. The h/c/g signal arcs render as a few
   disconnected teal pixels up-right of the horn, not legible crackling arcs. The
   dish also floats a touch loose from the roof at 1×.

4. **Minor:** the galaxy is unbalanced (denser upper-right) and its core sits a hair
   left of the beam axis (x=32), so the shaft doesn't drive dead-center into the
   bloom. A few peripheral sparkles add noise rather than sparkle.

## Concrete fixes (targeted, round-2)
- **Galaxy → real spiral.** Lower the growth rate (e.g. `~0.20–0.24` exponent) so
  arms stay on-canvas as continuous curves; thicken each arm to ~2px near the core
  (plot a parallel offset stroke) so they read as solid bands, not dotted lines.
  Drop to 2 bold arms (or keep 3 but denser `th` step so no gaps), and delete the
  stray isolated knots/sparkles between arms — trim the confetti.
- **Beam → one bold shaft.** Make the central `W`+`h`+`c` column continuous with no
  random breaks from muzzle up into the core bloom; keep it on the x=32 axis (or
  align the core to the muzzle) so it visibly spears the galaxy. Fill the dark gap
  just under the bloom.
- **Dish → teal energy dish.** Face the cup with `c`/`g` (teal glass) with a `W`/`h`
  bright rim and `G` shaded interior instead of only L/M/D, so it reads as an
  antenna, not a mirror. Make the signal arcs bold double-struck continuous arcs
  (as intended) so they crackle. Tighten the mast so the dish plainly attaches to
  the roof shoulder.
- **Center the hero:** put the core bloom on x=32 and balance arm density around it.

Fix 1 and 2 are the ones that move this from "good" to "spectacular"; 3 and 4 are
polish. Re-render and it should SHIP.
