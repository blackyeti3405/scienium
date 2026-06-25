# Workshop — review 2

**VERDICT: SHIP**

Revision 2 holds the SHIP-quality bar from r1 and lands both optional polish nits.
Verified against the actual 64×64 source (`art/src/buildings/volt_lab_workshop.json`):
12 colors, **all on-palette, zero off-palette strays**, hard `K` outline. Zoomed the
rendered preview on the vane and front face to judge the signature and panels at pixel
scale. Nothing regressed.

## Per-criterion

1. **ISOMETRIC 2:1 — PASS.** Clean 2:1 cube projection; roof diamond and both side faces are consistently foreshortened. Floor diamond bottoms out symmetrically.
2. **ROOF VISIBLE (3/4 top-down) — PASS.** Full roof diamond with `D` corrugation ribbing reading as a metal roof; the `o` power line and `g` cyan readout sit on the roof slope.
3. **FRONT CORNER FACES VIEWER — PASS.** Vertical front edge sits center-frame; the roll-up shutter (left/lit face) and the cyan-panel face (right) splay away correctly.
4. **SHARP / clean K outline — PASS.** 64×64 source, crisp single-pixel edges, hard `K` outline, no blur/AA. Palette audit: 12 distinct colors used, **0 off-palette pixels**, all rows exactly 64 wide.
5. **COHESIVE Volt Lab palette + motifs — PASS.** Steel-grey body, corrugated roof + cupola, `K`-framed roll-up shutter on the lit face, glowing `o`/`O` power line feeding the cupola, two cyan readout panels on the front face plus a roof panel, yellow rivet/indicator dots, warning-grade yellow accents. Reads unmistakably as Volt Lab.
6. **TRUE one-of-one (signature) — PASS.** The vane is anvil-and-wrench, not crossed-tools. The **anvil** is a correct profile: wide flat `M`/`D` top face (rows 4–5), a waisted body (row 6 `KKDDDDDDKK`), and a stepped `KDDDDK` foot (rows 7–8) — squat and readable. A thin `M`/`K` **wrench** rises diagonally up-right *beside/behind* the anvil with an open `dd`-jaw head outlined in `K` (row 6 `KKddK`) — clearly a second, different tool, NOT a mirrored X (distinct from the Arena's crossed-tools). A tight `O`/`o` **spark burst** flecks off the struck top-left face. The vane is seated directly on the corrugated `K`-framed cupola box — no floating stalk gap.
7. **ATTRACTIVE — PASS.** The vane is a finished, intentional focal point; cupola, power line, and dual cyan panels balance the composition. Cohesive and appealing.

## SHIP-quality continuity from r1 — confirmed

- Anvil-vs-wrench silhouette, spark burst, vane-on-cupola seating: all intact, no regression.
- Base cube, shutter, rivets, dual cyan panels, palette: all intact.

## r1 polish nits — both landed

1. **Cupola front-face ribbing — DONE.** An explicit vertical `M` rib line now runs the cupola front face (col 31, rows 13–19), splitting `DD | M | DD-dddd` so the cupola corrugation echoes the main roof literally, not just via the light/shadow break.
2. **Wrench open-jaw `K` edge — DONE.** The jaw (`dd`, row 6 cols 40–41) now carries a `K` outline pixel on its outer edge (`KKddK`), sharpening the open-jaw read at small scale.

No new issues. Ship as-is.
