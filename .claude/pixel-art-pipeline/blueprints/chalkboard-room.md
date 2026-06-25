# Chalkboard Room — blueprint (bespoke form, STARTER)

- **Name:** Chalkboard Room · **Slug:** `chalkboard-room` · **Lab type:** `axiom`
- **Role:** starter · **Mini-game:** decoding · **Base:** Foundational derivations and proofs

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a WIDE LOW LECTURE HALL with a flat parapet roof (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). The starter is a calm, **wide, single-storey lecture hall** — the lowest, broadest closed mass of the set, deliberately humble so the siblings can grow taller and stranger. A flat roof ringed by a thin raised parapet lip reads as an academic block, not a toy-topped cube.
- **Main hall:** a wide low `Box` — roughly `Box(top≈(28,18), wx≈14, wy≈9, h≈12)`, flat roof. Widest, lowest closed mass in the set; size clearly against the gateway cube `Box(top=(32,9), wx=11, wy=11, h=20)` (much wider, much shorter).
- **Parapet:** a thin raised lip framing the roof edge — a 2px `L`/`W` rim drawn just inside the roof diamond with a `K` outline, so the roof reads as a flat deck with a low wall, not a bare top.
- **Roofline:** flat parapet deck; one small `D` chalk-dust cowl/skylight near the back corner; the signature easel rises off the LEFT roof edge (see below). No stack, no dome.
- **Opening side: LEFT.** The hero glazing is on the LIT LEFT face — a long horizontal **clerestory window band** (a row of 3 wide `g`/`c` panes via `Box.window`, `h` sky-reflection, soft `D` mullions, NOT the gateway's two-windows-per-face), plus a `K`-framed double lecture-hall door with an `o` glow. The shaded RIGHT face stays plain: bare `M`/`D` wall with a single thin `D` cable conduit.

## Signature feature (one-of-one — a self-writing chalk derivation on a giant tilted slate easel)
**An oversized tilted slate chalkboard easel rises off the roof where a glowing gold chalk derivation writes ITSELF line-by-line down the slate and boxes the final result in a glowing QED.** No self-writing chalkboard / chalk-derivation motif exists anywhere in the catalog, and it is deliberately distinct from #8 Theoretical Physics Annex (that's a floating spacetime-curvature HOLOGRAM with no physical board) — this is a real tilted slate with chalk. Collides with nothing.
- **Easel + slate:** a large `K`/`d` slate panel tilted back, standing on a simple `D` A-frame `K`-outlined easel on the LEFT side of the roof (catching the light). A thin `M`/`L` chalk-tray runs the bottom edge with two tiny `W` chalk nubs and a `M` eraser.
- **Self-writing chalk:** 3–4 stacked rows of glowing `o`/`O` chalk "equation" glyphs (short broken `o` strokes implying symbols + an `=` and a fraction bar) marching down the slate, the bottom row brightest `O` (the line being written now), the top rows dimmer `o` (already written).
- **The QED box:** the final line is enclosed in a glowing `O` rectangle (a small `K`/`O` box) with a bright `O`/`W` glint — the proof landing. A faint `o` chalk-dust puff drifts off the active stroke.
- **Starter polish:** a soft `o` glow halo around the slate; one `o` "PROOFS" placard over the LEFT door.

## Motifs it must honor (Axiom)
Chalk equations (the literal self-writing derivation — the definitive chalkboard of the set), gold starlight glints (`o`/`O`/`W` on the chalk + QED box), navy night-sky glass (`g`/`c`/`h` clerestory band), `M`/`D` deep-navy academic walls, the calm starlight-gold accent line.

## Target output paths
- Source JSON → `art/src/buildings/axiom_chalkboard-room.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/chalkboard-room.png`
- Preview → `art/preview/buildings/axiom_chalkboard-room.png`
- Builder script → `art/pixel-art-pipeline/builders/chalkboard-room.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); any vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **wide low lecture hall with a clerestory band and the doors on the LEFT**, distinct from the gateways and all Axiom siblings, with a self-writing gold chalk derivation on a tilted slate easel as its hero.
