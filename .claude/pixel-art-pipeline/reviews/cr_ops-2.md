# Creative review — Operations Hub (round 2)

**Render:** `art/preview/operations_hub_creative.png`
**Blueprint:** `.claude/pixel-art-pipeline/blueprints/creative_operations_hub.md`
**Verdict: TWEAK** (close — polish-level fixes on the hero)

## Palette — PASS (recolor-safe)
`rows` in `art/src/operations_hub_creative_generic.json` use ONLY canonical chars:
`. D G K L M O W c d g h o r`. No off-palette hexes. (The `/` mid-gray simply
isn't used — a subset of the 13 is fine.) Recolor-safe. ✅

## What lands
- **Strong hero gestalt.** Floating teal hologram sphere + orange orbital ring +
  a teal data stream rising from an orange rooftop emitter + `W` sparkles. Big,
  glowing, clear focal point above the deck — spectacle is there.
- **Reads as its identity.** Radar globe + a bank of glowing teal control screens +
  orange hazard/console trim = unmistakably a mission-control / operations hub.
- **`_t5`-cohesive.** Glowing teal hologram + orange gold-substitute accents +
  4-point sparkles matches the `_t5` energy-beam / trim / sparkle language.
  Correctly NO black K outline on the hologram (it glows) — same as the t5 beams.
- **Crisp iso base.** Clean K outline on the box, legible `c/g` screens with a `W`
  scan-blip each, dashed orange hazard trim following both top edges. Emitter basin
  and rising data column have clean K + read well.

## Tweaks (all target the hero globe — the blueprint's whole north star)
1. **Globe interior reads as marbled-planet noise, not a radar wireframe.** The
   lat/long grid (`hologram_globe`, lines 179-189: 3° steps + per-pixel
   auto-contrast flip in `grid_set`) produces salt-and-pepper `c/G` speckle at
   64px instead of legible lines. Thin it: keep the equator + one parallel and
   2-3 meridians only, and draw them as clean continuous `c` arcs on the lit side
   (drop the per-pixel `c`↔`G` flip that creates the speckle). Goal: it should
   read as a wireframe radar display, not a textured orb.
2. **The radar SWEEP is getting lost.** The swept sector (lines 199-210, sa0=-84→
   sa1=-46) is a narrow ~38° wedge that disappears into the interior speckle.
   Once the grid is quieted (fix 1), widen the fan a little and keep the bright
   `h` sector + `W` leading edge + rim ping so the "active sweep" is unmistakable
   as the hero gesture.
3. **Blueprint says orbiting data RINGS (plural); only one is present** (build
   lines 416-419 draw a single ellipse + one satellite). Add a second thinner
   `o/O` ring at a different tilt (back+front arcs for depth) to boost spectacle
   and better sell "orbiting data rings." The existing `sat_at` satellite blip is
   barely legible at 150° — nudge it brighter or to a clearer angle.

## Optional (minor)
- Far right-back roof quadrant is plainer than `_t5` density. `roof_greeble` is
  defined (line 315) but not called in `build` — one small vent/panel cluster
  there would match the t5 busyness. Not blocking.
