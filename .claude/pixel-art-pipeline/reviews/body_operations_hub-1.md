# Review — operations_hub_creative (body pass, round 1)

**Render:** `art/preview/operations_hub_creative.png` (native `apps/web/public/sprites/gateways/operations_hub_creative.png`)
**Builder:** `art/gateways/creative_operations_hub.py`
**Source:** `art/src/operations_hub_creative_generic.json`
**Batch compared:** operations_hub / science_fair / pvp / showcase creative renders.

## Verdict: SHIP

## Judgement against the four gates

### (1) Is the body a WIDE, LOW HEXAGONAL command bunker — NOT a flat rectangular box? PASS
- Body is authored as `poly_prism(hex_uv(11, 7), top=(32,39), h=9)` — a genuine 6-corner
  elongated hexagon (pointy front/back, flat vertical L/R sides), 44px wide vs 9px walls.
- The render reads exactly that: a low, wide, faceted bunker with a **pointy front tip** at
  center where the two large angled window-bank faces meet, the lit front-left face (L/M)
  brighter than the shaded front-right face (D), and a short vertical hex side edge-on at
  each far corner. In the char grid the body holds a **constant full width (cols 10–52) for
  ~16 rows** — far more than the 9px wall height — which is the hexagon's flat sides, not a
  diamond box that would narrow continuously. This is unmistakably a wide-low bunker, not a
  flat rectangular box.
- Topped by a smaller **raised hexagonal control deck** (second `poly_prism`) carrying the
  emitter drum + antenna mast + steerable dish — reinforcing the mission-control read.

### (2) Clearly DIFFERENT from the other 3 bodies? PASS
- operations_hub = **wide, low horizontal hex bunker** (ringed teal window slots, control deck).
- science_fair = **tall pointed gem/crystal cube** (vertical, peaked).
- pvp = **round tiered arena / coliseum drum** (circular, stepped).
- showcase = **domed rotunda** (rounded dome roof).
- Four visibly distinct silhouettes and massings; no shared flat box.

### (3) Floating hologram hero + beam + sparkles intact and connected? PASS
- Hero = glowing teal **radar globe** (lat/long grid, swept radar wedge, hot core) — clearly
  the focal point above the roof.
- Connected: a **teal light-cone beam** rises from the rooftop emitter drum on the control
  deck up into the globe, plus dithered teal **data streams** flanking it — the hologram is
  physically tied to the body, not floating detached.
- Two crossing orange orbit rings (different tilts) + a legible satellite blip + multiple
  W/c **sparkles** ring the globe. All present and intact.

### (4) Crisp iso, clean K outline, only the 13 canonical chars? PASS
- Exactly **13 distinct opaque colors, all on the canonical palette** (K W L M D d h c g G o O r);
  **zero off-palette colors**; alpha is binary (255 / transparent) — **no anti-aliasing/blur**.
- True 2:1 isometric, 3/4 top-down with roof visible, front corner (the hex front tip) facing
  the viewer. Clean continuous dark-K silhouette outline.
- Window slots read as **glass**: teal `g` fill + bright `c` top highlight + `W` scan blip inside
  a crisp `K` bezel — not a flat panel chopped by black bars. Shaded right-face windows glow
  against the dark wall as intended.

## Minor (non-blocking) notes
- The globe's upper edge reads slightly blocky rather than perfectly spherical, and the deck /
  data-stream zone is a touch busy — cosmetic only; does not affect the body-distinctness goal.

No tweaks required for the stated goal.
