# Review — operations_hub_creative (body pass, round 2)

Render: `art/preview/operations_hub_creative.png`
Builder: `art/gateways/creative_operations_hub.py`
Batch peers: `art/preview/{science_fair,pvp,showcase}_creative.png`

## Verdict: SHIP

## Judged criteria

### 1. Is the body the intended WIDE, LOW HEXAGONAL command bunker — NOT a flat box? YES
- Built from `poly_prism(hex_uv(11, 7), ...)` — a true 6-corner hex footprint (pointy
  front/back, vertical left/right sides), not a `Box`.
- Silhouette measured from the source JSON: body walls span rows ~38–53, 45px wide by
  ~15px tall → a ~3:1 wide-low proportion. Left/right silhouette columns are dead
  straight (L=10, R=54 constant across every wall row) = the hexagon's vertical sides.
- The front is unmistakably peaked/chamfered: two angled front faces meet at a center
  front tip. Confirmed by the eave trim (orange `o` lit-left / `r` shaded-right lines
  sloping down from the center peak to the corners) and by the two banks of three teal
  window slots sitting on two distinct angled planes. This is a chamfered hex bunker,
  not a single-plane flat box front.

### 2. Clearly DIFFERENT from the other 3 bodies? YES
- operations_hub → wide low angular **hexagon** (poly_prism).
- science_fair → tall peaked/gabled **tent** (Box hall + fill_poly slopes).
- pvp → round two-tier **coliseum** (stacked cylinders).
- showcase → round **domed rotunda** (cylinder drum + dome).
- operations_hub is the only wide-low angular form in the batch; no shared flat box.

### 3. Floating hologram hero + beam + sparkles intact and connected? YES
- Hero teal radar globe floats above the roof: radial-glow orb, lat/long grid, a bright
  swept radar wedge, hot `W` core, and a soft bloom halo — reads as a radar display.
- Two orange orbiting data rings at opposing tilts cross the globe, with a legible
  satellite blip riding the right arc where it clears the sphere.
- The teal light-cone/beam rises continuously from the rooftop emitter drum (orange rim,
  on the raised hex control deck) up into the globe — emitter → beam → globe is one
  connected chain, no gap. Dithered data streams also rise from the deck-flanking roof.
- Sparkles present around the globe (one big, two small) + the beam-base data blips.

### 4. Crisp iso, clean K outline, ONLY the 13 canonical chars? YES
- Char audit of `src/operations_hub_creative_generic.json`: uses exactly
  {K W L M D d / c h g G / o O r}. Zero off-palette chars — recolor-safe.
- Clean K outline around the hex silhouette; iso reads cleanly at native 64px.

## Notes / minor (non-blocking, no tweak required)
- The right-roof zone (dish antenna + satellite + rising data-stream pixels) is the
  busiest corner of the sprite; it still reads correctly but is the first place to
  simplify if a future pass wants more calm. Not a defect.
