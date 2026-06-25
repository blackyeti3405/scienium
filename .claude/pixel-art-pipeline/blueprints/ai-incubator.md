# AI Incubator — blueprint (bespoke form, PREMIUM)

- **Name:** AI Incubator · **Slug:** `ai-incubator` · **Lab type:** `volt_lab`
- **Role:** premium · **Mini-game:** optimization · **Base:** Develop ML-driven engineering systems

## Set palette (author on these chars→hex exactly)
`K #15181d` · `W #eef2f6  L #cdd6dd  M #9aa3ad  D #6c7682  d #49515b` · `h #d6f9ff  c #aef0fb  g #38cfe2  G #1f8ba0` · `o #ffe85a  O #fff7a8  r #c89a14`

## BUILT FORM — a SLEEK PREMIUM DRUM PAVILION (NOT the gateway cube)
This is the premium capstone — it should look richer and rounder than the angular sheds. A **cylinder-dominant pavilion**: a big polished round drum is the body (using `cylinder`), flanked by a low rectilinear entry podium — a silhouette unlike any made Volt form (none is drum-dominant; the 3D-Print tower was a square Box with a dome, this is a true round drum).
- **Main drum (round, dominant):** a wide low `cylinder` as the body — roughly `cylinder(cx≈30, top_y≈18, rx≈13, h≈16)`, polished `L`/`M`/`D` shading with a bright `W` top-rim glint. A continuous `c` cyan ribbon-window band wraps the upper drum (the premium curtain-glass ring — small `g`/`c` panes following the curve), and a glowing `o` accent ring runs the base.
- **Entry podium (low, rectilinear):** a low flat `Box` abutting the FRONT-RIGHT of the drum — roughly `Box(top≈(40,30), wx≈6, wy≈5, h≈8)` — a clean `K`-framed glass entrance (one wide `g`/`h` lobby window + a `K` door). Drawn AFTER the drum so it sits in front-right. This puts the **main opening on the RIGHT**.
- **Roofline:** a shallow `W`/`L` domed/disc cap over the drum (a low flat-topped lens, NOT the 3D-Print full hemisphere — keep it sleek/low), rimmed in `K`, with the signature orb floating just above its center. Premium = clean, few seams, lots of `W`/`h` highlights.

## Signature feature (one-of-one — a hovering neural-network constellation orb)
**A glowing neural-network "constellation" orb hovers in a glass cradle above the drum cap — a sphere of bright nodes wired by cyan synapse arcs, with a pulse of light traveling along the connections (the model thinking).** No neural-net/constellation/node-graph motif exists anywhere in the catalog.
- A faint `c`/`h` **glass cradle** (a low ring of 3 thin `K`/`c` struts) holds the orb clear above the cap.
- The **orb**: a cluster of ≈6–8 bright **nodes** (`O`/`o` glowing dots, each with a `K` pip) arranged in a loose sphere/3-layer graph, joined by thin `g`/`c` **synapse arcs** (single-pixel cyan lines) — a small network graph reading clearly as nodes+edges.
- A traveling **pulse**: one edge lit brighter `W`/`h` with an `O` blip mid-arc (the activation moving through the net).
- A soft `c` glow halo + a couple of `h` sparkle glints sell the premium hover. A thin `o` power feed rises from the drum into the cradle.

## Motifs it must honor (Volt Lab)
Steel-grey polished drum (no off-palette), `o` glowing accent rings (power lines, curved), cyan ribbon readout glazing, a small `o`/`K` chevron accent at the podium sill, rivet seam on the drum — premium-clean but unmistakably Volt.

## Target output paths
- Source JSON → `art/src/buildings/volt_lab_ai-incubator.json`
- Rendered PNG → `apps/web/public/sprites/buildings/volt_lab/ai-incubator.png`
- Preview → `art/preview/buildings/volt_lab_ai-incubator.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (Volt palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **sleek round drum pavilion** clearly different from the gateways, from the 3D-Print tower, and from its other Volt siblings, with the **entry/opening on the RIGHT** and a hovering neural-net orb up top.
