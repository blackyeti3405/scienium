# Review — pvp_creative (body pass, round 1)

Render: `art/preview/pvp_creative.png` (native `apps/web/public/sprites/gateways/pvp_creative.png`, 64×64)
Builder: `art/gateways/creative_pvp.py` → `art/src/pvp_creative_generic.json`
Batch compared: `operations_hub_creative.png`, `science_fair_creative.png`, `showcase_creative.png`

## Verdict: SHIP

## Judgement against the four gates

**(1) Body is the intended ROUND TIERED COLISEUM, not a flat box — PASS.**
The body is unmistakably a circular amphitheatre: two concentric round drums stacked
(wide `R1=21/RY1=8` base drum + narrower `R2=14/RY2=6` upper drum), each wrapped by a
glowing arcade of foreshortening teal `g/c/h` arches with `K` frames + orange keystones,
ringed by `o/O` banner bunting, and topped by a sunken concentric arena bowl (`L→M→d`
terraces stepping down to a dark pit) with a glowing orange emitter dais at center. The
2:1 elliptical drums + curved arch arcade sell the round silhouette clearly. Zero
resemblance to a rectangular box. This is exactly the intended form.

**(2) Clearly DIFFERENT from the other three bodies — PASS.**
- science_fair = square cubic pavilion (box footprint).
- operations_hub = wide, low, angular/faceted mission-control hall (rectangular-ish plan) with rooftop dishes/racks.
- showcase = round DOMED rotunda (single volume capped by a dome).
- pvp = two-tier OPEN-TOP stepped coliseum with a sunken arena.
Only showcase is also round, but its dome-capped single volume reads distinctly from
pvp's tiered, open-arena massing. Four genuinely different silhouettes.

**(3) Floating hologram hero + beam + sparkles intact and connected — PASS.**
Hero is the crossed-swords saltire: two teal `G/h` blades fan up-and-out to white-hot
`W` tips, two orange `o/O/r` hilts splay down-and-out, a white-hot clash burst marks the
crossing, backed by a compact `g/G` champion crest. Verified by cropping the pit→emblem
corridor: a continuous dithered teal light column (bright `c/h` core) rises from the
orange emitter dais through a funnel of `W/c/h` spark motes into the emblem underside —
beam is genuinely connected, not floating detached. Twin orange tournament pennants flank
the tiers; discrete `W`-core sparkles frame the emblem gaps.

**(4) Crisp iso, clean K outline, only the 13 canonical chars — PASS.**
Scanned `pvp_creative_generic.json`: rows use only `{K W L M D d h c g G o O r}` + the
transparent `.` — zero off-palette characters, so `recolor.py` will reskin all six lab
types safely. Drums carry a clean `K` outline (`cylinder(..., outline="K")`); the emblem
is intentionally K-free so it reads as pure floating light. Pixel-crisp NEAREST render,
no blur/AA, arches read as glass (sheen band + frame) rather than black-barred panels.

## Optional polish (non-blocking, not required for SHIP)
- The mid-corridor beam thins to a mostly-single-pixel core between the pit rim and the
  emblem; a touch more `c` width there would make the projected cone read even stronger.
- Upper-drum arch arcade slightly crowds the arena parapet ring on the front rim; a 1px
  more separation would let both rings breathe. Cosmetic only.
