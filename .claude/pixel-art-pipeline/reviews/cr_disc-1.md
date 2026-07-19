# Creative review — Discovery gateway (`discovery_creative`) — round 1

**Verdict: TWEAK** (close; the hologram is genuinely spectacular, but the building half falls short of the `_t5` drama bar)

Render: `art/preview/discovery_creative.png` · Source: `art/src/discovery_creative_generic.json`
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_discovery.md`

## Palette compliance — PASS
Verified programmatically. The pixel `rows` use only canonical chars
(`K W L M D d h c g G o O` + `.` transparent; `/` unused, which is fine).
The `palette` dict defines exactly the 13 canonical keys, no extras. No off-palette
hex anywhere → **not an auto-fail**.

## What works (keep)
- **Galaxy hologram is the hero** and it's genuinely spectacular: a legible teal spiral
  (`h/c/g`) with a bright `W` core, scattered `W` sparkle points, and warm `o/O` planet
  dots orbiting. This is exactly the `_t5` "floating hologram + sparkles" language.
- Reads clearly as **Discovery / cosmic observatory**: curved `dome`, an emitter/telescope
  at the apex, the galaxy above, a satellite dish, glowing windows.
- Warm accent language is good: orange beam emitter ring, glowing `o` trim line around the
  base rim, and an orange door glow — a nice counterpoint to the teal.
- Crisp `K` navy outline on the base; solid iso footprint; grounded by a cast shadow.

## Why TWEAK — gaps vs the `_t5` look
1. **Walls are too pale / low-contrast.** The `_t5` economy buildings read as jewel-like
   glows against near-black massing. Here the wall mass is dominated by light `M`/`L`/`D`
   values while the darkest wall shade `d` (#6f6592) is nearly unused (23px, 1.7%). The
   building reads flat and washed-out rather than dramatic and 3D.
2. **Satellite dish is a weak blob.** It's a pale, rounded oval that doesn't clearly read as
   a parabolic dish, and its `c` signal arcs are almost invisible against the sky. In an
   observatory this should crackle.
3. **Glows lack deep-teal anchoring.** `G` (#23808b, the deepest glow-shadow) is used on
   exactly 1 pixel. The window/dish/hologram glows have nothing dark behind them, so they
   don't "pop" off the wall the way `_t5` teal cores do.
4. **Telescope object is ambiguous.** The barrel on the dome blends into the dome's diagonal
   seam ridges, so the "telescope firing the beam" narrative is muddled, and the seam lines
   read slightly noisy.

## Concrete tweaks (all achievable on the current build)
- Deepen the shaded faces: push the right/under-dome faces and the base's shadow side to
  `d`/`D` so there's a real `L→M→D→d` ramp under the `K` outline — chase the `_t5`
  dark-massing contrast.
- Rebuild the dish as a clean parabolic cup with a distinct `K` outline; make the `c/h`
  signal arcs bolder and give them a small `G` anchor so they read against the sky.
- Add a few `G` shadow pixels directly beneath the glowing windows, at the beam base, and in
  the hologram core so the teal glows separate from the walls.
- Give the telescope barrel a distinct, cleanly-outlined form and tidy the diagonal dome
  seams so the emitter→beam→galaxy line is unmistakable.
