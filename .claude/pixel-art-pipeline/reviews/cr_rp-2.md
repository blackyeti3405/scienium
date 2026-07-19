# Creative review — Research Plan (creative) · round 2

**Render:** `art/preview/research_plan_creative.png`
**Blueprint:** `.claude/pixel-art-pipeline/blueprints/creative_research_plan.md`
**Verdict: TWEAK** (close, palette-perfect, spectacular — but the hero doesn't yet read as its gateway's identity)

## Palette — PASS (recolor-safe)
Verified against the source JSON `art/src/research_plan_creative_generic.json`:
- Rows use only `K W L M D d? (no d used) h c g G o O r` + `.` (the standard transparent marker used in every canonical JSON, not a color).
- Palette dict keys are exactly the 13 canonical chars; no stray hexes.
- **No off-palette characters.** recolor.py will handle per-skin color safely.

## What's genuinely spectacular / _t5-cohesive (keep)
- Big glowing teal hologram HERO floating above the roof — real spectacle, glowing checkerboard mesh, bright top-cap sparkle. Two-tone light-left / dark-right shading gives it 3D form.
- Projector beam rising from a teal vortex/swirl on the roof into the hologram — reads as projection, very `_t5`.
- **Two flanking drafting/blueprint screens** with orange frames + schematic tick marks — these carry the drafting identity strongly.
- Orange caliper/measurement brackets framing the hologram — a smart engineering "we're measuring the model" beat.
- `W` sparkles scattered; iso building base with lavender roof, teal glass, dashed orange roof-trim; right-side tubes; grounded drop-shadow. All cohesive with `_t5`.

## Why TWEAK — the hero reads as a crystal/gem, not a holographic blueprint
The blueprint's north star is a *rotating 3D holographic WIREFRAME / blueprint schematic* (glowing `c/h` wireframe LINES + `g` grid planes). What rendered is a **dense, near-solid dithered diamond** — it reads as a faceted crystal/gem (Discovery-adjacent) more than an engineering wireframe. The flanking screens + calipers rescue the drafting story, but the centerpiece itself — which should BE the gateway's identity — is ambiguous. Fixing this is cheap and high-impact.

## Concrete fixes (priority order)
1. **Make the hero a wireframe, not a filled gem.** Outline the octahedron's four silhouette edges and the horizontal equator with a crisp 1px bright `h` line, and *thin out* the interior: replace the dense checkerboard dither with sparse `g`/`G` grid dots so light shows through. Goal: open 3D wireframe/hologram, not an opaque dithered solid.
2. **Close the bottom vertex.** The diamond's lower point currently dissolves into the beam spray, so the shape reads as a spray rather than a clean octahedron. Bring it to a defined `c` point and keep the beam as a separate thin `h` column from the roof.
3. **Add 1–2 internal grid-plane lines** — a horizontal equator line + the vertical meridian (the seam already hints at it) in `g`/`c` — to sell "grid planes / wireframe schematic."
4. **Crisp the front glass screens.** The two front windows are blobby/melty with irregular `h` highlights (reads as ice). Square them into cleaner drafting screens with a couple of `c` schematic tick lines so the "angled drafting screens glow" beat from the blueprint lands.
5. **(Optional polish)** Give the right-side tubes a 1–2px `c` iso top-cap ellipse so they read as 3D cylinders like the `_t5` axiom tanks instead of flat 2D bars.

Fixes 1–3 are the ones that turn this from "generic glowing crystal" into unmistakably "holographic blueprint hall." 4–5 are polish.
