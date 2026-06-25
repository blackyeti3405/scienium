# Seismograph Array — blueprint (bespoke form, STANDARD)

- **Name:** Seismograph Array · **Slug:** `seismograph-array` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** prediction · **Base:** Monitor seismic activity

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a LOW BUNKERED BLOCKHOUSE half-sunk into layered rock strata (NOT the gateway cube)
A squat, heavy, ground-hugging **bunker** — the lowest, most grounded mass of the set, dug into the earth so its base shows exposed rock strata, with a thick flat **parapet roof** (not a peaked or tarp roof). Reads as a hardened seismic monitoring station bolted to bedrock — distinct from every taller/lighter sibling.
- **Main bunker:** a low wide `Box` — `Box(top≈(30,18), wx≈11, wy≈10, h≈11)` — `M`/`D` concrete walls, its lower third drawn as **layered rock strata** (horizontal `d`/`D`/`r` bands stepping the base, as if half-buried). A thick `L`/`M` flat **parapet** caps the roof (a 2px raised `K`-edged lip around a flat `L` roof deck), NOT a pitched roof.
- **Strata berm:** the bunker sits in a low `d`/`r` strata-banded berm — the ground rises against its back-left base in 2–3 ochre/rust rock layers (`r`/`D`/`d`), so the building looks half-sunk.
- **Sensor wells:** 2–3 small `K`-rimmed circular sensor caps set flush into the front roof deck (the buried-geophone array), each with a faint `c` glow dot.
- **Roofline:** flat parapet deck carrying the signature ink-drum; a stubby `D` antenna post with a `c` blink at the back-right corner.
- **Opening side: LEFT.** The hero entrance is a heavy `K`-framed armored door + a narrow ribbon window on the LIT LEFT face (`M`/`D` concrete, `c` glass, an `o` "EPICENTER" placard plate). Keep the SHADED RIGHT face plainer — a blank concrete wall with one `d` vent grille and a strata band.

## Signature feature (one-of-one — a rotating ink-drum seismograph scrawling a trace beside a glowing shock-ripple with the predicted next jolt)
**On the flat parapet roof, a rotating paper drum seismograph scrawls a jagged mineral-teal seismic trace with a swinging stylus arm — and beside it a glowing set of concentric shock-ripples spreads outward from a marked epicenter, with the predicted next jolt highlighted as a brighter ring.** No mechanical ink-drum / ground-ripple motif exists in the catalog (Volt's Electronics Bench is a CRT oscilloscope showing an electronic waveform — this is a physical rotating ink-drum chart recorder plus a radiating ground ripple; entirely different prop and read).
- **Ink drum:** a small `cylinder` lying as an upright paper drum on the roof — `W`/`L` paper wrap with `K` mounting frame — slowly rotating (a faint `d` seam line shows rotation).
- **Stylus + trace:** a thin `D`/`K` stylus arm hanging over the drum, drawing a jagged `g`/`G` zig-zag **seismic trace** wrapping the paper; the live tip glows `c`/`h`.
- **Shock-ripple:** beside the drum on the roof deck, 3 concentric `c`/`g` rings radiate from a small `O`/`r` epicenter marker, fading outward; the outermost predicted ring is lit brighter `O` (the prediction — next jolt).
- **Read:** a tiny `o`/`O` magnitude reading climbing on a `K` placard at the drum base; the whole roof has a soft `c` seismic underglow.

## Motifs it must honor (TerraBase)
Layered rock strata (the half-sunk strata base + berm — the strongest strata read in the set), weatherproof instruments & antennae (the drum recorder + antenna post), mineral-teal sensor glow (the trace, ripple, sensor wells), hardened field-station concrete (`M`/`D`).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_seismograph-array.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/seismograph-array.png`
- Preview → `art/preview/buildings/terrabase_seismograph-array.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **low bunkered blockhouse half-sunk in rock strata with a flat parapet roof**, distinct from the gateways and all TerraBase siblings, with a rotating ink-drum seismograph + glowing shock-ripple (predicted next jolt) as its hero, opening on the LEFT.
