# Review — 3D Printing Shop (round 0)

**VERDICT: TWEAK**

Sprite: `art/preview/buildings/volt_lab_3d-printing-shop.png`
Blueprint: `art/pixel-art-pipeline/blueprints/3d-printing-shop.md`

## Per-criterion

1. **Isometric 2:1** — PASS. Clean 2:1 box; left/right wall faces recede at the correct iso slope.
2. **3/4 top-down, roof visible** — PASS. Top deck and corrugated roof ring read clearly; dome sits on the roof.
3. **Front corner faces viewer** — PASS. Near vertical corner is centered, two wall faces splay left/right.
4. **Sharp / clean K outline** — PASS. Crisp single-pixel edges, hard black silhouette, no blur or AA; colors stay on the Volt Lab palette.
5. **Cohesive with palette + motifs** — PARTIAL FAIL. Steel-grey body, cyan glass, and the yellow roof-edge power line are on-palette and present. Missing/illegible: cyan readout/progress bar on the dome base, rivets at the dome ring, and the front-face shelf of finished print samples (front windows are plain cyan glass).
6. **One-of-one signature feature** — FAIL. The dome and a yellow interior object exist, but the additive-print story does not read. The yellow form is a solid stepped pyramid that looks like a glowing crystal / mini Christmas tree, not a half-built model of stacked horizontal print-line layers. No visible gantry post, extruder/print head, hot-end glow dot, or cyan filament spool/line. It is NOT unmistakably distinct from the Mill's subtractive cut — which is the entire point.
7. **Attractive** — PARTIAL. Good silhouette and contrast, but the dome interior is muddy/cluttered and the front faces are flat and repetitive.

## Painter-actionable tweaks

1. **Rebuild the model as legible print layers (dome interior, center).** Replace the solid yellow pyramid with a short stack of 4–6 stepped HORIZONTAL bars, each 1px tall, widest at the bottom and narrowing slightly upward (a small vase/cylinder profile, NOT a sharp triangle). Color the bottom 2–3 layers cooled `O`/`r`, the top 1–2 layers hot `o`, so the additive build reads top-down. Keep a visible 1px gap or shade line between layers so they read as discrete deposited lines.
2. **Add the vertical gantry post (dome interior, just right of the model).** A 1px-wide `D` column running from the roof deck up into the dome, with a small 2x2 `K` extruder head clamped to it partway up, positioned directly over the top print layer.
3. **Add the hot-end glow dot (under the extruder nozzle).** A single `o`/`O` pixel directly beneath the `K` extruder head, touching the topmost (hot `o`) print layer — the molten deposition point.
4. **Add the cyan filament spool + feed line (on/beside the gantry post).** A small `c` 3x3 disc spool mounted on the post, with a thin 1px `c` line running up from the spool to the extruder head. This is the cyan accent that ties it to the Volt Lab set and sells "filament."
5. **Add the cyan build-progress readout bar (dome base ring, front).** A small horizontal `g`/`G` panel (about 5x2px) on the front of the dome base — a partly-filled `c` progress segment against a `G` track. Reuses the cyan-readout-panel motif.
6. **Add rivets to the dome base ring.** A row of single `D`/`K` rivet dots spaced along the corrugated metal ring where the dome meets the roof, for the exposed-girders/rivets motif.
7. **Make the front-face sample shelf legible (right or left front window).** In one front window, draw a thin `K`-framed shelf line with a row of 3–4 tiny `o`/`c` finished-print blobs sitting on it, instead of plain cyan glass — differentiates the two front faces and reinforces the print-shop theme.
8. **Declutter the dome glass.** Reduce the busy cyan highlight streaks inside the dome so the layered model + gantry are the clear focal point; keep one simple diagonal `h` glint on the upper-left of the glass only.
