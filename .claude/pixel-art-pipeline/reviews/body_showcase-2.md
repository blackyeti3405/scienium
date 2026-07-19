# Body review — showcase_creative (round 2)

**Verdict: SHIP**

Render: `art/preview/showcase_creative.png`
Builder: `art/gateways/creative_showcase.py`
Sprite: `apps/web/public/sprites/gateways/showcase_creative.png`
Batch peers: `art/preview/{operations_hub,science_fair,pvp}_creative.png`

## Judgment against the four gates

### (1) Body = TALL DOMED ROTUNDA, not a flat box — PASS
The previous flat-box problem is fixed. The body is now built from
`isobuild.cylinder` (round gallery drum) capped by `isobuild.dome`, and it reads
that way: a ribbed grey-purple dome with a teal oculus at the apex sits on a
round drum ringed by four tall gold-framed gallery windows (foreshortened toward
the edges so the wall reads as curved) plus a warm-lit central arched entrance,
with a gold cornice band at the springing line and a curved dark base. The
silhouette has an unmistakable domed crown — it is NOT a rectangular box. No
automatic tweak.

### (2) Distinct from the other 3 bodies — PASS
Side-by-side the four bodies are clearly different forms:
- showcase — tall domed rotunda (round drum + ribbed dome + oculus)
- operations_hub — wide, low hexagonal command bunker, flat top + raised dais
- science_fair — pointed pyramidal tent/pavilion
- pvp — round tiered open arena / colosseum with a central pit
No two share a body. Showcase's dome is unique in the set.

### (3) Floating hologram hero + beam + sparkles intact & connected — PASS
The faceted teal AWARD STAR floats high with shine rays and concentric broadcast
signal rings (teal + one gold). A continuous teal broadcast beam fires up from the
rooftop lantern-cupola emitter tip on the dome apex into the star's lower point;
rising motes flank it and 4-point W sparkles ring the star. The emitter tip
(y~22) meets the star's lower point (y~21) so there is no visible break — hero,
beam, and sparkles are all present and connected.

### (4) Crisp iso, clean K outline, only the 13 canonical chars — PASS
Programmatic scan of the rendered sprite against CANON: **0 off-palette colors**
(same for all three batch peers). Forms use the shared iso primitives so the
projection is consistent; the drum + dome carry a clean dark `K` silhouette
outline and a `K/d` curved base line.

## Optional polish (non-blocking, not required to ship)
- The drum wall reads quite orange/gold-heavy: the gold window pilasters, lintels
  and cornice nearly cover the neutral `L/M/D` masonry, so the front can read a
  touch like a flat gold storefront. Exposing a little more neutral drum wall
  between windows would strengthen the round-masonry read.
- Proportion is roughly square (drum ~16px + dome ~9px vs ~26px wide). A slightly
  taller drum would sell "TALL" a bit harder, though the dome already makes the
  rotunda read clearly.
