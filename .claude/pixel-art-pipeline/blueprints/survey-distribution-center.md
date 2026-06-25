# Survey Distribution Center — blueprint (bespoke form, STANDARD)

- **Name:** Survey Distribution Center · **Slug:** `survey-distribution-center` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** diagnosis · **Base:** Design and field surveys

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a WIDE LOW DISPATCH DEPOT with a stepped-down loading annex (NOT the gateway cube)
A logistics-shaped building: a **wide, low, horizontal dispatch depot** with a small **stepped-down loading annex** abutting the front-right — a mailroom/sorting-house silhouette, broad and squat, unlike any tower or round sibling. Reads as a busy distribution hub.
- **Main depot block:** a wide low `Box` — `Box(top≈(28,14), wx≈12, wy≈8, h≈11)` — `M`/`D` indigo walls; the lit-LEFT face carries TWO clean `Box.window` glazed sorting-room panes (spaced apart, soft mullions, `g`/`c` glass, `h` sheen) so the sorting floor reads through glass.
- **Loading annex:** a smaller, lower `Box` stepped down off the front-right corner — `Box(top≈(44,22), wx≈5, wy≈5, h≈8)` — `M`/`D`, its shaded-RIGHT face the hero (see opening), with a wide `K`-framed loading-dock bay.
- **Vents:** a `Box.louver` HVAC band low on the right annex face (opaque dark slats) — NOT glass — so the mailroom machinery reads as ventilated.
- **Roofline:** a flat `M` depot roof with a short raised `D` curb; the **rooftop rotary dispatch unit** (the hero) sits center-roof on a small `M` drum plinth; a small `o` magenta accent-light line edges the roof curb.
- **Opening side: RIGHT (glowing).** The hero working face is the SHADED RIGHT annex face: a wide `K`-framed loading-dock + a glowing `Box.window` mailroom window (bright `c`/`O` lit interior so it reads on the shaded side, with `h` reflection). The lit-LEFT depot face stays plainer with its two glass sorting panes.

## Signature feature (one-of-one — a rooftop rotary dispatch hopper flinging questionnaire darts out while response cards stream back, a climbing response-rate tally board)
**A rooftop rotary survey-dispatch hopper flings out a fan of folded questionnaire "darts" toward the field while filled response cards stream back into a sorting bin, and a magenta response-rate TALLY BOARD climbs as cards return — the diagnosis of how the field is responding.** No dispatch-hopper / questionnaire-dart-fan / response-tally-board motif exists anywhere in the catalog (Operations' radar is a rotating DISH, not a card-flinging hopper; TerraBase's soil sieve cascades SOIL into bins, not paper cards; nothing else throws or counts survey cards).
- **Rotary hopper:** a low `M`/`D` drum on the roof plinth with an `o` rim and a small `c` spinner vane (motion-blur ghost `h`/`c` pixels) — a hopper, explicitly NOT a carousel.
- **Outgoing darts:** a fan of 4–5 small `W`/`L` folded-paper "darts" arcing out one side, each with a tiny `o` question-mark/`o` corner, spreading toward the field.
- **Returning cards:** 3–4 `c`/`h` filled response cards (tiny tick-rows) streaming back in on the other side, dropping into a small `D` sorting bin with an `O` glow.
- **Tally board:** a small `K`-framed `c`/`g` board on the roof edge with a climbing `o`/`O` response-rate bar + a `%` mark rising toward a target line = the diagnosis read.

## Motifs it must honor (MindFrame)
Soft-glow data screen (the lit response-rate tally board), clean observation glass (the two sorting-room panes + glowing mailroom window), seating/booths (implied sorting desks behind the glass — keep light), gentle magenta accent light (`o` roof-curb strip + hopper rim + tally glow), data-card streams reading as soft-glow info.

## Target output paths
- Source JSON → `art/src/buildings/mindframe_survey-distribution-center.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/survey-distribution-center.png`
- Preview → `art/preview/buildings/mindframe_survey-distribution-center.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **wide low dispatch depot with a stepped loading annex glowing on the RIGHT**, distinct from gateways + all MindFrame siblings, with a rooftop rotary dispatch hopper flinging questionnaire darts, returning response cards, and a climbing response-rate tally board as its hero.
