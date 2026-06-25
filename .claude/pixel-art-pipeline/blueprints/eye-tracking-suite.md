# Eye Tracking Suite — blueprint (bespoke form, STANDARD)

- **Name:** Eye Tracking Suite · **Slug:** `eye-tracking-suite` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** decoding · **Base:** Measure attention and gaze

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a COMPACT VIEWING BOOTH facing a big angled stimulus display on a cantilevered arm (NOT the gateway cube)
A small focused **viewing booth**: a compact `Box` cabin holding a headrest/seat, fronted by a **big ANGLED stimulus DISPLAY** that cantilevers out over the booth on a short arm, with an eye-tracking camera bar slung beneath it. The angled-screen-on-an-arm silhouette (a viewing carrel) is unlike any flat-faced or towered sibling.
- **Booth cabin:** a compact `Box` — `Box(top≈(30,16), wx≈7, wy≈7, h≈13)` — `M`/`D` walls; the lit-LEFT face has one small `Box.window` pane (the booth side-light) and the headrest/seat sits inside facing right toward the display.
- **Angled stimulus display:** a thin tilted slab cantilevered off the front-right on a short `M`/`D` arm — built as a low shallow `Box` raked toward the viewer (a flattened prism, e.g. `Box(top≈(40,12), wx≈8, wy≈1, h≈9)` tipped) — its big face a single `Box.window`-style glowing screen (`g`/`c` with bright `h`/`O` content) angled at the headrest. This big angled glass screen is the hero canvas.
- **Camera bar:** a slim `D` bar slung under the display lip carrying two small `c` lenses (the eye-trackers), throwing magenta IR glints.
- **Roofline:** a small flat `M` booth roof with a thin `D` curb + a soft `o` magenta accent strip; the cantilevered display rises above the roofline as the dominant mass.
- **Opening side: RIGHT (glowing).** The hero is the SHADED-RIGHT-facing angled display + the booth's right face: the screen GLOWS bright (`c`/`O`/`h` content) so it reads on the shaded side, and the headrest sits in its lit wash. The lit-LEFT booth face stays plainer (one small side window + plain wall).

## Signature feature (one-of-one — a glowing gaze HEATMAP plus a connected numbered SCAN-PATH of fixation dots over a stimulus image, with two IR cameras glinting at the viewer headrest)
**On the angled display, a glowing gaze HEATMAP (warm magenta hot-spots over cooler areas) is overlaid by a connected, NUMBERED SCAN-PATH of fixation dots tracing where the eye jumped across a stimulus image — and two eye-tracking cameras throw magenta IR glints at the viewer's headrest, decoding attention.** No gaze-heatmap / numbered-scan-path / IR-eye-tracker motif exists anywhere in the catalog, and per the collision rule this is explicitly NOT a giant eyeball/eyepiece (BioCore owns that) — the read is the gaze PATTERN on a screen, with the eye only implied by the cameras and headrest.
- **Heatmap:** soft blobs grading `g`→`o`→`O` (cool→hot) pooled over a faint `c`/`M` stimulus image (a simple framed picture) on the screen.
- **Scan-path:** 5–6 small `h`/`W` fixation dots connected by thin `o` saccade lines, each dot tagged with a tiny `O` number (1→6) showing viewing order = the decoding.
- **IR cameras + glints:** two small `c` lenses on the under-bar, each casting a thin `o`/`O` magenta IR beam toward the `M`/`L` headrest where a small `d` viewer head sits; a faint `o` glint on the eyes.
- **Glow:** the whole screen casts a soft `o` magenta wash into the booth so the shaded-right read pops.

## Motifs it must honor (MindFrame)
Soft-glow data screen (the big glowing stimulus display — central), clean observation glass (the screen face + booth side window), seating (the headrest/viewer seat), gentle magenta accent light (`o` roof strip + IR glints + heatmap hot-spots), focused observation feel.

## Target output paths
- Source JSON → `art/src/buildings/mindframe_eye-tracking-suite.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/eye-tracking-suite.png`
- Preview → `art/preview/buildings/mindframe_eye-tracking-suite.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **compact viewing booth facing a big angled stimulus display glowing on the RIGHT**, distinct from gateways + all MindFrame siblings, with a gaze heatmap + numbered scan-path over a stimulus image and IR cameras glinting at the headrest as its hero (no giant eyeball).
