# Creative review — Science Fair gateway (round 0)

**Verdict: TWEAK** (close to SHIP — polish, not rework)

Render: `art/preview/science_fair_creative.png` (64×64, ×8 preview)
Sprite: `apps/web/public/sprites/gateways/science_fair_creative.png`

## Palette — PASS (recolor-safe)
Verified the shipped PNG's pixels: 14 unique colors = transparent + the 13 canonical
chars, zero off-palette. All 13 chars are actually used (K W L M D d / h c g G / o O r).
recolor.py will swap cleanly. No auto-fail.

## What's spectacular / cohesive (keep)
- **Hero trophy hologram is excellent and fully in-family.** A recognizable teal cup on a
  stem+base (h/c/g/G glow), orbited by orange ribbon rings (echoes operations_hub's orbiting
  ring), W confetti sparkles scattered around, dotted teal beam rising from the roof. Reads
  unmistakably as a prize/awards/science-fair identity — the strongest, clearest gateway read
  of the five.
- Crisp iso body: clean K outline, correct top + two shaded side faces, orange edge trim,
  teal glass windows on both front faces, grounded navy drop shadow. All matches the family.

## Why TWEAK (the festive "fair" signal is under-delivered)
1. **Pennant flags don't line the ridge (blueprint's named signature element).** The blueprint
   calls for "Pennant flags along the roof ridge." Delivery is only TWO flags on tall poles
   floating mid-air flanking the beam — they read ambiguously (almost like antennae) and sit
   above the roof rather than on it. A proper **bunting line of alternating o/O pennant
   triangles strung across the front-top roof ridge** would (a) satisfy the blueprint and
   (b) sell the "fair" festivity that distinguishes this from a generic building. This is the
   single highest-impact fix.
2. **Base is the plainest of the five.** vs operations_hub (orange piping wrapping every edge),
   literature_review (tall arched windows + textured top), research_plan (side canisters +
   bracket), discovery (dome) — the science-fair base is a plain low box. It's clean but lacks
   one signature flourish. The top-face striations read slightly flat. Add one family-grade
   detail (e.g. corner bolts / a fuller orange edge-piping wrap, or a small marquee band) so
   the base carries equal weight to the hero.
3. **Roof beam emitter is a muddy o/O/r/g blob.** The other creatives use a cleaner emitter
   dish/nozzle (operations_hub's neat orange ring). Tighten the emitter where the beam meets
   the roof.

## Tweaks (concrete)
- Replace the two floating pole-flags with a bunting line of ~5–7 alternating `o`/`O` pennant
  triangles strung along the front-top roof ridge (small `K`-outlined triangles hanging from a
  thin line). Optionally keep one small pole-flag at a back corner.
- Add one signature base flourish to match family richness: fuller orange (`o`/`r`) edge-piping
  wrapping the top rim + `O` corner bolts, or a thin marquee band above the windows.
- Clean up the roof emitter into a tidy orange ring/dish (`o` rim, `r` shade, `c` glow center)
  so the beam origin reads deliberate, not blobby.
- Keep the trophy hero, orbiting ribbon rings, sparkles, beam, palette exactly as-is.
