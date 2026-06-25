# Behavioral Lab — blueprint (bespoke form, STANDARD)

- **Name:** Behavioral Lab · **Slug:** `behavioral-lab` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** prediction · **Base:** Run controlled behavioral experiments

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a TWO-PART OBSERVATION BLOCK: a glass-fronted experiment chamber abutting a lower observation room, split by a one-way mirror wall (NOT the gateway cube)
A paired-volume building: a taller **glass-fronted experiment chamber** abutting a lower **observation room**, the two separated by a shared **one-way MIRROR wall** the player can read across. A clinical split-room silhouette — two abutting boxes of different heights — distinct from the single open booth (Interview) and the round pit (Focus Group).
- **Experiment chamber (taller, front-left):** a `Box` — `Box(top≈(24,12), wx≈7, wy≈7, h≈16)` — `M`/`D` walls; its lit-LEFT face is a big single `Box.window` observation pane (`g`/`c` glass, `h` sheen, one soft mullion) showing the subject inside.
- **Observation room (lower, back-right):** a `Box` abutting the chamber's right side, stepped back — `Box(top≈(38,15), wx≈6, wy≈6, h≈12)` — `M`/`D`; the shared wall between the two boxes is the **one-way MIRROR** (a `Box.window` panel with `c` glass + heavy `h` sheen + faint `M` mullion, reading as a silvered mirror the observers watch through).
- **Vents:** a small `Box.louver` vent on the observation room's plainer face (opaque slats), keeping equipment areas non-glass.
- **Roofline:** two flat `M` roofs at different heights (the chamber taller), each with a thin `D` parapet curb; a soft `o` magenta accent strip runs the chamber roof lip; a small `c` camera nub on the mirror-wall corner peeks into the chamber.
- **Opening side: LEFT.** The hero glazing is the big lit-LEFT chamber observation pane (well-lit interior reads naturally on the lit face); the right observation-room face stays plainer (vent + one small window). The internal one-way mirror is the secret-watching layer behind it.

## Signature feature (one-of-one — a seated subject at a glowing A/B two-button choice panel with a magenta predicted-choice needle leaning before they press, plus a reaction-time readout, watched through the one-way mirror)
**Inside the lit chamber a seated subject faces a glowing two-button A/B choice panel; a magenta PREDICTED-CHOICE needle leans toward one option BEFORE they press, and a reaction-time readout ticks — all watched from behind the one-way mirror.** No A/B human-choice panel / predicted-choice needle / reaction-time readout motif exists anywhere in the catalog, and it is deliberately a HUMAN decision experiment, NOT BioCore's tracked-animal vivarium maze (no animal, no motion-path, no heat-map — a person choosing between two buttons).
- **Subject + panel:** a small seated `d`/`D` figure facing a `K`-framed panel with two lit buttons — one `c`/`h` (A), one `o`/`O` (B) — the chooseable options.
- **Predicted-choice needle:** a magenta `o`/`O` needle/arrow leaning toward button B (the model's pre-press prediction), with a faint `o` ghost-press halo on B = the prediction.
- **Reaction-time readout:** a tiny `c`/`g` readout strip beside the panel showing a climbing `o` "RT" bar / ms number.
- **Mirror watch:** through the one-way mirror panel, a faint `d` observer silhouette + a small `c`/`O` recording dot, so the "watched from behind glass" read is unmistakable.

## Motifs it must honor (MindFrame)
One-way MIRROR (the shared chamber/observation wall — central to the read), clean observation glass (the big chamber pane), soft-glow data screen (the A/B panel + reaction-time readout), seating (the seated subject), gentle magenta accent light (`o` roof strip + predicted-choice needle + button glow).

## Target output paths
- Source JSON → `art/src/buildings/mindframe_behavioral-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/behavioral-lab.png`
- Preview → `art/preview/buildings/mindframe_behavioral-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **two-part observation block (experiment chamber + observation room split by a one-way mirror), glazed on the LEFT**, distinct from gateways + all MindFrame siblings, with a seated subject at a glowing A/B choice panel, a magenta predicted-choice needle leaning pre-press, and a reaction-time readout as its hero.
