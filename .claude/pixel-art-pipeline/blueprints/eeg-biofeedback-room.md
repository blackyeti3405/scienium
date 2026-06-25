# EEG/Biofeedback Room — blueprint (bespoke form, STANDARD)

- **Name:** EEG/Biofeedback Room · **Slug:** `eeg-biofeedback-room` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** decoding · **Base:** Measure physiological response

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a CLINICAL RECORDING POD with a lower monitor annex (NOT the gateway cube)
A quiet **clinical pod**: a compact rounded-feeling recording booth (a small `Box` with a softened, shielded read) where the capped subject sits, abutted by a lower **monitor annex** where the decoder strip lives. A small, clean, medical silhouette — distinct from the round Focus pit and the long Longitudinal wing.
- **Recording pod (front):** a compact `Box` — `Box(top≈(30,15), wx≈7, wy≈7, h≈14)` — `M`/`D` walls, a soft `L` shielded trim; its shaded-RIGHT face is the hero (see opening) with a glowing `Box.window` observation pane onto the capped subject. A thin `o` accent ring trims the pod top (a calm clinical halo).
- **Monitor annex (lower, back-left):** a `Box` stepped down off the back — `Box(top≈(20,20), wx≈6, wy≈5, h≈10)` — `M`/`D`; its lit-LEFT face a `Box.window` glazed monitor room (`g`/`c` glass) showing the technician screens, and a `Box.louver` cooling vent band low (opaque) for the recording gear.
- **Roofline:** two flat `M` roofs (pod taller), thin `D` parapets; a small `c` lead-junction nub on the pod roof where the EEG leads gather; a soft `o` magenta accent strip on the pod eave.
- **Opening side: RIGHT (glowing).** The hero is the SHADED-RIGHT pod face: a glowing `Box.window` observation pane (bright `c`/`O`/`h` lit interior so it reads on the shaded side) revealing the capped subject's head and the brainwave ribbons streaming out. The lit-LEFT monitor-room face stays plainer (its glazed monitor pane + vent).

## Signature feature (one-of-one — a subject's head in a glowing EEG electrode CAP whose leads stream MULTIPLE stacked multicolored brainwave ribbons into a decoder strip, with a biofeedback ring pulsing magenta at the calm/stress level)
**Through the glowing pod window: a subject's head wears a glowing EEG electrode CAP with leads, and from those leads MULTIPLE stacked multicolored brainwave ribbons (alpha/beta/theta) stream side-by-side into a decoder strip — while a biofeedback RING pulses magenta to show the calm/stress level being decoded.** Per the collision rule this is explicitly NOT a single live-trace screen (Volt's oscilloscope CRT and TerraBase's seismograph ink-drum each own a single jagged line) — the read is a HEAD-IN-A-CAP feeding a STACK of several parallel labeled bands, plus a biofeedback ring, which nothing else has.
- **Electrode cap + head:** a small `M`/`L` head wearing a `D`/`c` cap dotted with little `o`/`O` electrode nodes, thin `K`/`c` leads fanning off the crown.
- **Stacked brainwave ribbons:** 3–4 PARALLEL horizontal wave-bands streaming from the leads, each a different palette tint and amplitude — e.g. `g` (theta), `c` (alpha), `o` (beta), `h` (gamma) — clearly multiple stacked rows, not one line, each ruled into the decoder.
- **Decoder strip:** a small `K`-framed `c`/`g` strip on the right where the bands resolve into a tiny `o`/`O` state-label (e.g. a "CALM"/"STRESS" tag) = the decoding.
- **Biofeedback ring:** a soft `o`/`O` magenta ring pulsing around the head/window (a faint inner + outer glow) tracking the level — the magenta accent doing real work.

## Motifs it must honor (MindFrame)
Soft-glow data screen / waveforms (the stacked brainwave ribbons + decoder — central), clean observation glass (the glowing pod observation pane + monitor-room glass), seating (the seated capped subject), gentle magenta accent light (`o` pod halo + biofeedback ring + state tag), the calm clinical mood.

## Target output paths
- Source JSON → `art/src/buildings/mindframe_eeg-biofeedback-room.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/eeg-biofeedback-room.png`
- Preview → `art/preview/buildings/mindframe_eeg-biofeedback-room.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **clinical EEG recording pod with a monitor annex, the capped subject glowing through the RIGHT pod window**, distinct from gateways + all MindFrame siblings, with a head in an electrode cap streaming MULTIPLE stacked multicolored brainwave ribbons into a decoder plus a pulsing magenta biofeedback ring as its hero (not a single CRT trace).
