# Interview Room — blueprint (bespoke form, STARTER)

- **Name:** Interview Room · **Slug:** `interview-room` · **Lab type:** `mindframe`
- **Role:** starter · **Mini-game:** identification · **Base:** Conduct structured interviews

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — an OPEN ONE-ON-ONE BOOTH PAVILION around a small mirror-walled interview nook (NOT the gateway cube)
The starter is the smallest, most intimate, **open-concept** member of the set: a single low pavilion with one tall **one-way mirror wall** at the back and an **open front** that exposes two facing booth seats across a small table, ringed by a low glass privacy screen. Tiny, calm, human-scale — distinct from every enclosed sibling and from the bigger Focus Group amphitheater (which is round + sunken; this is a square open booth).
- **Mirror-wall back block:** one low `Box` along the back — `Box(top≈(30,16), wx≈9, wy≈4, h≈14)` — `M`/`D` indigo walls; its tall lit-LEFT inner face is almost entirely a single **one-way MIRROR panel** via `Box.window(face='left', …, glass='c', hi='h', shade='G')` (a big silvered pane with a soft `h` sheen + a faint `M` mullion or two, reading as a mirror, not a black-barred window).
- **Open booth floor:** the front-corner area is an open ground platform — a `D`/`d` floor inset with a ring of low `o`/`K` privacy-screen striping (glass screen posts), holding the two booth seats + table.
- **Side fin:** a short low `Box` fin on the right — `Box(top≈(40,19), wx≈4, wy≈3, h≈11)` — `M`/`D`, anchoring the open corner and carrying a small `c` reception window via `Box.window`.
- **Roofline:** a thin flat `M` canopy slab over the mirror-wall block only (the booth front stays open to sky); a single soft `o` magenta accent-light strip runs along the canopy lip, casting a gentle glow into the open booth.
- **Opening side: OPEN.** The hero plays out in the open front booth (ringed by `o`/`K` striping), framed/backed by the one-way mirror wall. The lit-LEFT face carries the mirror pane; the right fin stays plainer with one small window.

## Signature feature (one-of-one — two seated silhouettes facing across a table with a hovering voiceprint speech-bubble and a popped ID tag)
**Inside the open booth, two seated silhouette figures (interviewer + subject) face each other across a small table; a glowing magenta speech-bubble carrying a tiny voiceprint waveform hovers between them, and a popped-up ID/clipboard tag identifies the subject (name-line + checkmark).** No two-figures-in-conversation / voiceprint-bubble / subject-ID-tag motif exists anywhere in the catalog (Volt's CRT and TerraBase's ink-drum show machine traces, not a speech-bubble between people; nothing else seats two figures in dialogue).
- **Two figures:** two small seated `d`/`D` silhouettes on `M` booth chairs, one each side of a low `M` table, facing — heads as simple `d` ovals, one subtly backlit `o` from the accent strip.
- **Speech-bubble + voiceprint:** a rounded `o`/`O` magenta speech-bubble floats between the heads, holding a tiny `h`/`c` voiceprint — a short cluster of stacked sound-wave bars (NOT a single scope line) — the spoken answer being captured.
- **ID tag:** a small popped-up `W`/`L` clipboard/ID card above the subject's head with an `o` name-line and a `c`/`O` checkmark = the identification (subject identified).
- **Mirror tell:** the back one-way mirror catches a faint `h` reflection of the booth so it reads as observation glass, with a soft `o` magenta glow washing the nook.

## Motifs it must honor (MindFrame)
One-way MIRROR (the hero back wall), seating/booths (the two facing booth chairs + table), soft-glow data screen (the voiceprint inside the speech-bubble), clean observation glass (the privacy screen + reception window), gentle magenta accent light (the canopy strip + bubble glow).

## Target output paths
- Source JSON → `art/src/buildings/mindframe_interview-room.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/interview-room.png`
- Preview → `art/preview/buildings/mindframe_interview-room.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **small open one-on-one interview booth backed by a one-way mirror wall**, distinct from gateways + all MindFrame siblings, with two seated silhouettes, a hovering voiceprint speech-bubble, and a popped subject ID tag as its hero.
