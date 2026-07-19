# Review — Operations Hub (generic) · round 0

**Verdict: TWEAK**

Reference: `art_ref/mockups/operations_hub.png`
Render: `art/preview/operations_hub_generic.png`
Build: `art/gateways/build_operations_hub.py`

## Base gates — PASS
- True 2:1 iso, front corner to the viewer, roof plane visible. ✔
- Crisp pixels, no blur/AA/mush, clean K outline. ✔
- On the generic palette (only the 13 chars). ✔
- Glass reads as glass — teal hero screen + teal lower window + teal roof vent all read as glass. ✔

## Silhouette — acceptable
Two-story, wider-than-tall control block: a bigger upper control room over a lower base story, front corner forward. Matches the drawing's two-volume stack. The upper block is a touch set-back/inset vs the drawing (where the upper block is more dominant and roughly full-width), but this reads as the same building, not a different one.

## Fidelity misses (why it's a TWEAK)
The concept is right and every named feature is *drawn*, but several do **not read** as what the drawing shows — the rooftop reads as noisy/on-fire rather than "mission control."

1. **HERO tilted control screen — messy, not clean.** It's present (orange frame + teal glass, front-left roof) but the top-left of the orange frame is a jumbled spray of orange + K pixels that leaks outside the bezel. It reads as a blob catching fire, not a crisp orange-framed drafting screen. The frame needs even thickness on all four sides with no stray pixels outside the K bezel.
2. **Cursor arrow unreadable.** The mark inside the glass reads as a dark blob, not a clear ↗ arrow. Competing highlight pixels drown it. It should be one clean bright (W/h) arrow on a solid teal field.
3. **Periscopes read as sparks, not antennae.** The two `periscope()` loops poking above the screen merge with the noisy frame and look like orange sparks/flames spraying off the screen top. They need clean K stems with small o loops standing clearly ABOVE/BEHIND the screen against the plain lavender roof, not overlapping the hero frame — so they read as "9"/lollipop periscopes.
4. **Operator figure reads as a decorative sparkle.** On the upper-right (shaded) face the `operator()` mark reads as a 4-point orange star + a stray vertical line, not a person / camera-on-tripod. It needs to be a bigger, legible orange stick-figure (round 2×2 head, body, two arms, two splayed legs) with enough K contrast on the shaded face. Also remove the extra stray sparkle pixels (the 4-point star, and the lone orange dot down by the door) — those aren't in the drawing and add noise.
5. **Hazard band lost its slashes.** The mid band reads as a solid chunky orange chevron/bar. The diagonal r caution slashes don't read. Raise the contrast of the r/K slashes so it reads as caution striping, not a solid orange bar.

## Matches (keep)
- Green/teal striped roof vent on the right roof — reads well. ✔
- Lower front-left teal window + framed right-face doorway — present. ✔
- Two-story control silhouette + orange trim + teal accent ("0=teal") — on-theme. ✔

## Concrete fixes (toward the drawing)
- `tilted_screen()`: tighten the orange frame to even thickness on all four sides; delete any o/K pixels sitting outside the K bezel; simplify the glass fill so the ↗ cursor reads as one clean bright arrow.
- `periscope()` + its two call sites (lines ~254–256): draw the loops as clear K-stem + small o-loop standing on the plain roof above/behind the screen, not overlapping the hero frame.
- `operator()` (line ~247): enlarge and clarify into a recognizable K-outlined stick-figure; drop the abstract sparkle/star pixels and the stray dot near the door.
- `hazard_band()`: increase slash contrast (alternating r/K over o) so caution striping reads instead of a solid bar.
- Optional: enlarge/center the `hatch()` slightly on the upper front face so it reads as a framed access hatch.
