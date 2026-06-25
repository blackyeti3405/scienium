# Longitudinal Study Wing — blueprint (bespoke form, STANDARD)

- **Name:** Longitudinal Study Wing · **Slug:** `longitudinal-study-wing` · **Lab type:** `mindframe`
- **Role:** standard · **Mini-game:** optimization · **Base:** Track participants over time

## Set palette (author on these chars→hex exactly)
`K #181428` · `W #e8e2f6  L #cabfe6  M #9f90c8  D #6f5fa0  d #4a3c70` · `h #ecc8f4  c #d0a8ee  g #a45ce0  G #6a2fb0` · `o #f08cce  O #ffb8e2  r #b03a80`

## BUILT FORM — a LONG LOW HORIZONTAL WING with a rooftop ridge timeline (NOT the gateway cube)
The longest, lowest, most horizontal building in the set — a true **"wing"**: a single long low `Box` running deep along the right axis, ribboned with a row of evenly-spaced glass bays (the cohort offices), crowned by a rooftop RIDGE that carries the timeline. A stretched-out silhouette, deliberately unlike any tower, drum, or stepped block.
- **Long wing block:** one long low `Box` — `Box(top≈(20,16), wx≈15, wy≈6, h≈11)` — `M`/`D` walls; its lit-LEFT face carries a regular RHYTHM of 4 evenly-spaced `Box.window` bays (small matching `g`/`c` glazed offices, soft sheen, spaced with wall between) reading as a repeating corridor of study rooms over the years.
- **End annex:** a slightly taller `Box` cap on the far-back end — `Box(top≈(46,9), wx≈4, wy≈5, h≈14)` — `M`/`D`, the records/archive end, with a `Box.louver` vent band (opaque) and one small `Box.window`.
- **Roofline:** a flat low `M` roof carrying a raised `D` **ridge beam** down its spine — this ridge is the timeline track (the hero sits on it); a thin `o` magenta accent strip runs the eave; small `c` rooflights dot between bays.
- **Opening side: LEFT.** The hero glazing is the lit-LEFT rhythmic row of cohort-office bays (the repeating windows of the long corridor) — well-lit on the lit face; the shaded-RIGHT face stays plainer (long blank wall + the end-annex vent). The rooftop ridge timeline reads above the lit corridor.

## Signature feature (one-of-one — a rooftop TIMELINE ridge marked Year 1→5 with cohort portrait-medallions at each waypoint, a climbing magenta retention trend-line, and a participant token advancing along the track)
**Along the rooftop ridge runs a TIMELINE marked Year 1→5; at each waypoint sits a small cohort PORTRAIT-MEDALLION, a glowing magenta retention TREND-LINE climbs across the waypoints, and a participant TOKEN advances along the track — optimizing how many participants are retained over time.** No timeline-ridge / year-waypoints / cohort-medallions / retention-trend-with-advancing-token motif exists anywhere in the catalog (TerraBase's climate stack is exploded Earth LAYERS with a fork; Longitudinal's is a horizontal TIME track with portraits and a retention curve — wholly different), and the retention curve is a rising trend-line, not a bell-curve, pie, or fork.
- **Timeline ridge:** a `D`/`M` rail along the roof spine with 5 small `K` waypoint ticks labeled `o` Y1…Y5 (tiny tally marks).
- **Cohort medallions:** a small `M`/`L` circular portrait-medallion at each waypoint (a simple `d` head silhouette), a couple dimming/fading toward later years (attrition), the retained ones glowing `O`.
- **Retention trend-line:** a glowing `o`/`O` magenta line connecting the waypoint heights, sloping to show retention; a small `c` axis hint = the optimization signal.
- **Advancing token:** a bright `O`/`h` participant token mid-track with a faint motion trail moving toward Y5, and a tiny `o`/`c` "retention %" readout climbing on the end annex.

## Motifs it must honor (MindFrame)
Clean observation glass (the long rhythmic row of cohort-office bays), seating/booths (study-room desks implied behind the repeated bays — keep subtle), soft-glow data screen (the glowing retention trend-line + readout), gentle magenta accent light (`o` eave strip + trend-line + advancing token), the calm institutional feel of a long study corridor.

## Target output paths
- Source JSON → `art/src/buildings/mindframe_longitudinal-study-wing.json`
- Rendered PNG → `apps/web/public/sprites/buildings/mindframe/longitudinal-study-wing.png`
- Preview → `art/preview/buildings/mindframe_longitudinal-study-wing.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (MindFrame palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Glazing reads as GLASS (sheen + frame, not black-barred panels). Must read as a **long low horizontal study wing with a rhythmic row of cohort-office bays glazed on the LEFT**, distinct from gateways + all MindFrame siblings, with a rooftop Year 1→5 timeline ridge (cohort medallions + climbing retention trend-line + advancing participant token) as its hero.
