# Body review — operations_hub (round 0)

**Verdict: SHIP**

Render: `art/preview/operations_hub_creative.png` (native `apps/web/public/sprites/gateways/operations_hub_creative.png`)
Builder: `art/gateways/creative_operations_hub.py`
Source grid: `art/src/operations_hub_creative_generic.json`

## Judged against the 4 gates

**(1) Is the body the intended WIDE, LOW HEXAGONAL command bunker — and NOT a flat box? PASS.**
The footprint is a 6-corner iso hexagon (`hex_uv(11, 7)`, `poly_prism`, 44px wide, 14px deep,
9px walls). The silhouette shows the two angled front faces meeting at a downward center-front
tip, with vertical left/right sides — the base plinth forms a shallow V pointing down at
center-front, and the two teal window banks sit on the two angled faces rather than one flat
plane. This is unmistakably a wide, low, pointy-front bunker, not a rectangular box. A box would
show one flat front face with a straight horizontal bottom edge; this does not.

**(2) Clearly DIFFERENT from the other 3 bodies? PASS.**
Side-by-side (scratchpad/four_bodies.png): science_fair = tall iso rectangular box; pvp = round
tiered colosseum/arena; showcase = round drum. operations_hub's wide-low pointy-front hexagon is
distinct from all three.

**(3) Floating hologram hero + beam + sparkles intact and connected? PASS.**
The teal radar globe floats above the roof as the clear hero — glow body, lat/long grid, a wide
swept radar sector, hot core, orbiting orange data rings (front/back split) and a legible
satellite blip. A dithered teal light-cone rises continuously from the rooftop emitter drum up
into the globe's lower rim (verified in the beam crop — no gap), flanked by two rising data
streams. W/h sparkles present around the globe.

**(4) Crisp iso, clean K outline, ONLY the 13 canonical chars? PASS.**
Grid uses only `K W L M D d h c g G o O r` (verified programmatically against the source JSON —
zero off-canon chars; palette recolor-safe). Window slots have crisp 1px K bezels; the base
plinth and silhouette carry a clean dark outline.

## Optional polish (non-blocking, not required to ship)
- The right-roof comms dish (`dish_antenna` at ~46,41) reads as a soft light-purple blob rather
  than a crisp steerable dish; sharpening its rim would read cleaner.
- The globe interior is slightly marbled/lumpy in a few spots, but still clearly a radar sphere.

All four hard gates pass cleanly, so this ships as-is.
