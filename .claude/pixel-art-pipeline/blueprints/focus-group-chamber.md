# Focus Group Chamber — blueprint (bespoke form, STANDARD)

- **Name:** Focus Group Chamber · **Slug:** `focus-group-chamber` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** identification · **Base:** Run group-based qualitative studies

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — an OPEN-TOP ROUND AMPHITHEATER DISCUSSION PIT ringed by chairs behind a curved one-way mirror (NOT the gateway cube)
The round, sunken member of the set: a **circular amphitheater discussion pit** — a `cylinder` drum whose top is OPEN (an oculus) revealing a sunken ring of participant seats around a central table, the inner drum wall a **curved one-way MIRROR** band the observers watch through. A round, open-oculus silhouette unlike the Comp-Social tiered ziggurat (which is a stepped pyramid with a projection plane) and the square open booth (Interview).
- **Round drum:** a `cylinder` — e.g. `cylinder(cx≈32, top_y≈18, rx≈13, h≈14)` — `M`/`D` indigo wall; its outward-facing band carries a curved run of `Box.window`-style **one-way MIRROR** panels (a few wide `c`/`h` silvered panes with soft sheen, spaced — reading as a mirrored observation ring, not black bars).
- **Open oculus top:** the drum's top ellipse is OPEN — a `K`-rimmed oculus showing DOWN into the sunken pit: a `d`/`D` floor, a ring of small `M`/`L` participant chairs, a low central `M` table.
- **Entry stub:** a tiny low `Box` door-stub abutting the front of the drum — `Box(top≈(30,30), wx≈4, wy≈3, h≈8)` — `M`/`D`, a `K`-framed entry, anchoring the round mass on the plot.
- **Roofline:** no solid roof — the open oculus IS the top; a soft `o` magenta accent ring glows around the oculus rim, washing the pit; a thin `o` light-strip rings the drum lip.
- **Opening side: OPEN.** The signature plays in the open oculus pit (ringed by the curved one-way mirror band + `o` rim glow). Treat the lit-LEFT drum band as the brighter mirror panes and the shaded-RIGHT band as darker mirror with a faint interior `O` glow leaking up the oculus.

## Signature feature (one-of-one — speech-bubbles rising from each ringed seat and merging into a hovering magenta THEME / WORD-cloud being tagged above the table)
**From each seat around the pit, a small glowing speech-bubble rises and the bubbles MERGE upward into a single hovering magenta THEME / WORD-cloud above the central table — clustered words being tagged as the emergent themes are identified.** No rising-speech-bubbles-merging-into-a-word-cloud / theme-tagging motif exists anywhere in the catalog (the Interview Room has ONE bubble with a voiceprint between TWO people; this is MANY bubbles from a GROUP coalescing into a word-cloud — qualitatively different), and it cannot be confused with any chart, ring, or trace.
- **Rising bubbles:** 5–6 small `o`/`c` speech-bubbles, one lifting off each ringed chair, rising and converging inward/upward.
- **Theme word-cloud:** a soft hovering cluster of 4–5 short `W`/`h` word-chips at varying sizes (bigger = more frequent) bound in a faint `o`/`O` magenta cloud halo above the table — the merged themes.
- **Theme tags:** 1–2 `K`-framed `o`/`O` tag labels pinned to the biggest word-chips (a `c` checkmark) = the identification (themes named).
- **Pit read:** the ring of `d` seated silhouettes around the central `M` table, lit by the `o` oculus glow, so the "group discussion" read is immediate.

## Motifs it must honor (MindFrame)
One-way MIRROR (the curved observation band around the drum), seating/booths (the full ring of participant chairs — the group), soft-glow data screen (the glowing speech-bubbles + word-cloud as light), clean observation glass (the mirror band), gentle magenta accent light (`o` oculus rim + bubble/cloud glow).

## Target output paths
- Source JSON → `art/src/buildings/mindframe_focus-group-chamber.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/focus-group-chamber.png`
- Preview → `art/preview/buildings/mindframe_focus-group-chamber.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down — the open oculus shows the pit). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS/mirror (sheen + frame, not black-barred panels). Must read as a **round open-oculus amphitheater discussion pit ringed by chairs behind a curved one-way mirror**, distinct from gateways + all MindFrame siblings, with speech-bubbles rising from each seat and merging into a hovering magenta theme/word-cloud as its hero.
