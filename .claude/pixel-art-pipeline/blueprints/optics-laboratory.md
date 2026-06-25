# Optics Laboratory — blueprint (bespoke form, STANDARD)

- **Name:** Optics Laboratory · **Slug:** `optics-laboratory` · **Lab type:** `axiom`
- **Role:** standard · **Mini-game:** configuration · **Base:** Light, lenses, interference

## Set palette (author on these chars→hex exactly)
`K #0e1124` · `W #dfe6f6  L #b4bee0  M #7c88b8  D #4e5888  d #333a60` · `h #d6ecff  c #aad8ff  g #4a9ce6  G #2060b0` · `o #ffe27a  O #fff3c0  r #c89a2a`

## BUILT FORM — a LOW OPTICS HALL with a raised clerestory MONITOR ridge (NOT the gateway cube)
Compose from `art/isobuild.py` (`Box`). A precision **optics hall** kept dark and stable inside, with a long raised **clerestory monitor band** running its ridge (a light-slot roof). Horizontal and calm — but with a distinct stepped-up roof monitor it can't be confused with the wide flat lecture hall.
- **Main hall:** a low `Box` — e.g. `Box(top≈(26,17), wx≈13, wy≈9, h≈12)`, flat roof. Low and stable.
- **Clerestory monitor:** a long narrow raised `Box` along the roof ridge — e.g. `Box(top≈(30,12), wx≈9, wy≈3, h≈4)` — its long sides glazed in a `c`/`g` ribbon of light-slots via `Box.window` with soft mullions, a `W`/`L` flat cap. This raised glazed ridge is the form's signature roofline.
- **Roofline:** flat roof + the raised clerestory monitor; the rooftop optical bench sits on the deck beside the monitor (see signature). No dome, no stack.
- **Opening side: LEFT.** The hero glazing is on the LIT LEFT face — a wide `K`-framed **dark-room loading bay** (one big `g`/`h` glass roll-shutter pane via `Box.window` with `h` reflections + an `o` ready-light) and a `K`-framed door. The shaded RIGHT face stays plain: bare `M`/`D` wall + one thin `D` cable conduit + a small `Box.louver` vent.

## Signature feature (one-of-one — a rooftop interferometer: a gold laser zig-zagging through mirrors into a ring of interference fringes)
**On the roof an optical bench runs a gold laser beam zig-zagging between mirrors and through lenses until it recombines into a glowing ring of concentric interference fringes.** No interferometer / laser-mirror-bounce / interference-fringe-ring motif exists anywhere in the catalog, and it is deliberately distinct from ChemWorks Spectroscopy Suite (a glass PRISM splitting white light into a spectral RAINBOW) — this is a single laser bouncing between mirrors making circular fringes, not a refracted spectrum. Collides with nothing.
- **Optical bench:** a small `D`/`M` `K`-outlined breadboard slab on the roof deck holding the components, with tiny `K` post-mounts.
- **Laser + mirror path:** a bright `o`/`O` beam emitted from a small `r`/`o` laser head, making 2–3 sharp 90° turns off little `L`/`W` mirror squares (`K`-edged) and passing through a `c`/`h` lens disc — a clean zig-zag, not a tangle.
- **The fringe ring:** where the split beams recombine, a glowing **ring of concentric interference fringes** — 3–4 nested `O`/`o`/`c` rings (alternating bright gold and dark) on a small `K`/`d` screen, the bullseye the lab "configures". The center fringe brightest `O`/`W`.
- **Configuration tell:** a small `c`/`o` alignment knob/dial beside the screen with an `o` "ALIGNED" dot lighting when the fringes are centered; a soft `o` glow halo along the beam.

## Motifs it must honor (Axiom)
Gold starlight glints (the `o`/`O` laser beam + fringe ring — gold light is the hero), navy night-sky glass (`g`/`c`/`h` clerestory + lens + loading bay), particle-ring echo in the concentric fringes, `M`/`D` deep-navy walls, the calm precision-instrument feel.

## Target output paths
- Source JSON → `art/src/buildings/axiom_optics-laboratory.json`
- Rendered PNG → `apps/web/public/sprites/buildings/axiom/optics-laboratory.png`
- Preview → `art/preview/buildings/axiom_optics-laboratory.png`
- Builder script → `art/pixel-art-pipeline/builders/optics-laboratory.py`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Axiom palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glass via `Box.window` (reflection gradient + shine + soft mullions, never a black-barred grid); vents via `Box.louver`. Bespoke form composed from `isobuild.py` — NEVER `iso.draw_cube`/`base_windows`. Must read as a **low optics hall with a glazed clerestory monitor ridge and the loading bay on the LEFT**, distinct from the gateways and all Axiom siblings, with a rooftop laser-interferometer zig-zag recombining into an interference-fringe ring as its hero.
