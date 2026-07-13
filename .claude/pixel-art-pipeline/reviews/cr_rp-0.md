# Creative Review — Research Plan (gateway) · round 0

**Verdict: TWEAK**

Render: `art/preview/research_plan_creative.png` (64×64, ×8 preview)
Source: `art/src/research_plan_creative_generic.json`
Blueprint: `.claude/pixel-art-pipeline/blueprints/creative_research_plan.md`

## Palette — PASS (recolor-safe)
Verified every row programmatically. Only canonical chars appear: `. D G K L M O W c g h o r` — a subset of the 13 (`d` and `/` unused, which is fine). No off-palette hexes. 64 rows × 64 cols, declared 64×64. `art/recolor.py` will work.

## What's working (cohesive with _t5)
- All the required _t5 ingredients are present: floating hologram hero, a central `h` projector beam descending to a roof emitter, `W` four-point sparkles, glowing teal windows on the base, orange (`o/O/r`) measurement ticks + caliper bracket.
- Concept reads correctly as its gateway identity: a floating holographic blueprint being drafted = a *research plan*. Good conceptual fit.
- Iso base is solid: clean K silhouette outline, lavender `L/M` top, orange rim trim (the _t5 gold-trim analogue), clean dark drop-shadow ellipse. This part is genuinely _t5-grade.
- The right-side teal pillar tanks and the orange C-bracket "caliper" are nice engineering-shop touches.

## Why TWEAK (not yet spectacular)
The blueprint names the floating wireframe as THE hero — and right now it's the *weakest*, noisiest part of the sprite, which is backwards from the _t5 references where the hologram is the crisp showpiece.

1. **Hologram lower half reads as noise.** The top of the wireframe resolves cleanly (hex rim + two vertical `h` edges + apex beam), but below center it collapses into a scattered symmetric burst of dark-teal `G`/`g` pixels that does NOT resolve into legible wireframe edges — it looks like the hologram is glitching/dissolving. Compare the _t5 mindframe chart: instantly legible. **Fix:** redraw the lower volume with clean, continuous 1px `h/c` edge lines that mirror the top hex rim (give the prism a real bottom rim + 3 converging lower edges). Use `G` only sparingly as far-edge depth shading, not as a fill scatter.
2. **Hero shape isn't fully legible as a 3D solid.** Because the bottom rim is missing, the form reads as "half a gem + sparks" rather than a closed rotating blueprint volume. Closing the bottom rim (fix #1) will make it read as an actual 3D schematic.
3. **The two flanking panels are stylistically inconsistent.** Left = dotted grid (reads calendar/spreadsheet-ish); right = dense checkerboard mesh. Neither strongly says "drafting." **Fix:** unify both into matching blueprint-grid readouts (thin `c` grid + one `h` diagram line/curve each), so they read as engineering schematics, not a calendar + a net.
4. **Front-face windows are blobby.** The `g/c/h` glow clusters on the base's two front faces are irregular/melty vs the crisp rectangular screens in _t5. **Fix:** tighten each into a cleaner rectangle with a straight `h` top-highlight and even K border.

## Nice-to-have (not blocking)
- The orange caliper bracket sits only on the hologram's right; a small mirrored measurement tick on the left would balance the composition.

Ingredients and palette are right — this is a legibility/crispness pass on the hero, not a redo.
