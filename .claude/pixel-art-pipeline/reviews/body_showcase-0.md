# Body review — showcase_creative (round 0)

**Verdict: SHIP**

Render: `art/preview/showcase_creative.png`
Builder: `art/gateways/creative_showcase.py`
Source grid: `art/src/showcase_creative_generic.json`

## Judged criteria

1. **Intended form = TALL DOMED ROTUNDA, not a flat box? — PASS.**
   The body is unmistakably a round drum (`isobuild.cylinder`, DR=13, DH=12, ry=3)
   capped by a ribbed dome (`isobuild.dome`, DOME_RY=9). Silhouette is round +
   domed, never rectangular. The drum wall curves (foreshortened top/bottom
   ellipses via `drum_edge`), carries tall gold-framed teal gallery windows that
   wrap the curved wall, a warm-lit arched central entrance with a keystone glow,
   a gold cornice band at the springing line, and a curved gold base trim. The
   dome reads as a lit sphere — upper-left W/L specular crescent + gold meridian
   ribs fanning from the apex. Not a box.

2. **Distinct from the other 3 bodies? — PASS.**
   - operations_hub: wide, low, multi-tier flat-topped industrial hub w/ equipment
     blocks + antenna — angular/flat.
   - science_fair: rotated faceted crystal/gem pavilion (pyramidal) — angular gem.
   - pvp: round *open* tiered arena/colosseum bowl with a sunken center.
   - showcase: *closed* domed rotunda drum.
   Even against pvp (also round), the closed bulging dome vs. pvp's open sunken
   bowl gives a clearly different silhouette.

3. **Hologram hero + beam + sparkles intact and connected? — PASS.**
   Floating faceted teal award-star (nested star_poly gradient h→c→g→G, gem facets,
   emissive rim, W core), bloom halo, three expanding concentric signal rings (teal
   x2 + gold outer) with W blips, four shine rays. The broadcast beam is one
   continuous teal column firing from the apex lantern-beacon emitter tip straight
   up into the star (drawn before the star so the star caps it) — connection is
   solid in the crop, no break. Rising c/h/W motes + gold motes flank the beam and
   ring the star.

4. **Crisp iso, clean K outline, only 13 canonical chars? — PASS.**
   Clean dark-K outline on drum + dome + base; iso foreshortening correct.
   JSON grid uses only {K W L M D d h c g G o O r} (+ `.` transparent) — verified
   programmatically, zero off-palette chars, so recolor.py stays safe.

## Optional polish (non-blocking)
- The apex lantern cupola (orange cornice ring + teal glow) is small but its
  down-curved gold ring + inner teal marks can, at a squint, flirt with a face
  read. The beam firing up from it keeps the primary read as "emitter/lantern," so
  this is fine as-is; only worth a nudge if a later pass touches the beacon.
- Left-side dome meridian ribs are partly hidden under the specular highlight;
  a touch more rib definition on the lit side would sharpen the "ribbed dome" read.
  Cosmetic only.
