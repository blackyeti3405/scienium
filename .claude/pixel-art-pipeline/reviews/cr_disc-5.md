# Creative review — Discovery (gateway) · CREATIVE / _t5 · Round cr_disc-5

**Verdict: TWEAK**

Render: `art/preview/discovery_creative.png` (64×64, ×8 preview)
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_discovery.md`

## Palette check — PASS
Source `art/src/discovery_creative_generic.json` uses only: `D G K M L O W c d g h` (+ `.` transparency). All within the 13 canonical chars — recolor-safe, no off-palette hexes. No auto-fail.

## What works (cohesive with _t5)
- Real glowing-hologram-hero + beam + sparkle language — reads unmistakably as a clearance-5 building.
- Domed observatory on a bold iso base, telescope on the roof, satellite dish on an arm — good dramatic massing.
- Teal glass (`h/c/g/G`) energy + orange (`o/O`) trim/door + `W` sparkles against `L/M/D` walls — palette used exactly as the blueprint intends.
- Crisp iso base with clean `K` outline throughout; orange base-trim and lit orange door read great; ground shadow grounds it.

## Why TWEAK (not SHIP)
1. **Hero motif fights the building's story.** The floating hologram reads as a glowing **lightbulb** (eureka/idea), not the **swirling galaxy spiral** the blueprint calls for. On its own a "discovery = bright idea" bulb is a fine read, but the props below (telescope + satellite dish + observatory dome) all say *astronomy/sky*, so the bulb clashes with its own framing. The centerpiece needs to commit to one story.
2. **Particle field is lopsided left.** `W` sparkles and warm `o/O` dots cluster on the left third; the right sky is comparatively empty. _t5 references (axiom cosmology) spread particles broadly across the whole sky — the imbalance reads slightly unfinished.
3. **Dish plume reads as a splash, not signal.** The little teal spray above the satellite dish looks like a stray liquid blob rather than the intended crackling `c` signal arcs, and it competes with the main hologram.
4. **Beam is muddy at the source.** Where the grey telescope tube meets the teal hologram base the beam is short and blends into grey — no crisp bright column like terrabase_t5's clean light shaft.
5. **Lower-right base window is a blob.** The teal window cluster on the right base face is scattered/irregular versus the clean framed dome window upper-left.

## Concrete tweaks
- Commit the hero to ONE story. Preferred (matches blueprint + astronomy props): reshape the hologram into a clear **galaxy spiral** — 2 curved arms of `h/c` stars sweeping off a bright `W/h` core, plus 2–3 orbiting `O` planet dots. (Alt: keep the bulb but swap telescope+dish for non-astronomy discovery props so the theme is coherent — not recommended.)
- Rebalance particles: scatter more `W` sparkles + `o/O` warm dots across the RIGHT half of the sky so the hologram is haloed roughly symmetrically, à la axiom_t5.
- Convert the dish plume into 2–3 clean `c` arc strokes radiating from the dish rim so it reads as signal/energy, not a smudge.
- Give the telescope→hologram beam a crisp 1–2px bright `W/h` core running cleanly from the tube up into the hologram base (terrabase_t5-style shaft).
- Tighten the lower-right base window into a clean `K`-outlined framed pane (`h/c` fill), matching the crisp dome window.
