# Review — 3D Printing Shop (round 2)

**VERDICT: SHIP**

Sprite: `art/preview/buildings/volt_lab_3d-printing-shop.png`
Source: `art/src/buildings/volt_lab_3d-printing-shop.json`
Blueprint: `art/pixel-art-pipeline/blueprints/3d-printing-shop.md`
Prior: `art/pixel-art-pipeline/reviews/3d-printing-shop-1.md` (SHIP + 2 optional nits)

## Per-criterion

1. **True isometric (2:1)** — PASS. Clean 2:1 box; both visible wall faces recede on the correct iso slope, vertical near-corner centered.
2. **Roof visible (3/4 top-down)** — PASS. Corrugated metal roof apron and top deck read clearly; the glass print-chamber dome sits on the deck with the roof ring around it.
3. **Front corner faces viewer** — PASS. Near vertical corner is centered; left and right wall faces splay symmetrically.
4. **Sharp / clean K outline** — PASS. Hard `K` silhouette, crisp single-pixel edges, no blur/AA/strays, palette-on. (The only soft pixels are 10× preview-raster upscale seams, not source AA.)
5. **Cohesive with palette + motifs** — PASS. Steel-grey body, cyan glass dome, electric-yellow power line from roof edge to printer base, cyan glass front windows on both faces. Corrugated roof ring, power line, and `c`/`M` filament/cable runs into the extruder all present.
6. **One-of-one signature feature** — PASS. The model reads unmistakably as a half-built part in **stacked horizontal print-line layers** — hot pale top band cooling through gold to amber lower bands — under a `K`/`D` gantry + extruder head, glass-domed so you see through to the print. Clearly **additive** and distinct from the Mill's subtractive cut. This is the focal point.
7. **Attractive** — PASS. Strong silhouette and contrast; the warm layered model under the cyan dome is an immediate, readable focal point against the cool steel body.

## r1 nit audit (both were "optional, do not block ship")

1. **Progress-bar readout** — NOT LANDED. The dome base ring shows cyan banding but still no discrete `c`-filled segment against a `G` track that reads as a build-progress bar. Cosmetic only.
2. **Spool disc + rivet ring** — NOT LANDED. No distinct round `c` spool disc on the gantry, no legible `D`/`K` rivet row on the corrugated ring. Cosmetic only.

## Regression check

Nothing regressed from the SHIP-quality r1. The signature additive-print stack, gantry/extruder, clean iso box, K outline, palette, and dual-face windows are all intact. The silhouette and focal hierarchy are unchanged.

## Why SHIP

r1 was already SHIP; both outstanding items were explicitly flagged optional and non-blocking. They remain unaddressed in r2 but are pure motif-completeness polish at sub-gameplay scale — neither is missed at play size and neither degrades any of the 7 criteria. With zero regressions and all 7 criteria passing, this ships as-is.
