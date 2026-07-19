# Creative review — Discovery gateway (round 0)

**Verdict: TWEAK**

## Palette check
PASS. `art/src/discovery_creative_generic.json` uses only the 13 canonical chars
(`K W L M D d h c g G o O r`) plus `.` for empty. No off-palette hexes; 64×64. Recolor-safe.

## Judgment vs the `_t5` north star
Not there yet. The two designated heroes — the "swirling galaxy hologram" and the
"telescope firing a light beam" — both underdeliver, and the building reads as a cute
creature face rather than a cosmic observatory. Compared to
`axiom_cosmology-visualization-theater_t5` (structured swirling nebula, bold glowing core,
prominent beam) and `terrabase_deep-earth-observatory_t5` (crisp iso massing, bright energy
column), this render feels flat and diffuse.

### What's wrong
1. **Hologram is not a galaxy.** The hero is a solid horizontal teal *lens/eye* outlined in
   `G`, ringed by a random confetti scatter of `h/c` squares and a few `o` dots. There is no
   spiral, no arms, no orbital rings, no bright core. It reads as a floating gem with
   sparkle-dust, not a swirling galaxy. This is the biggest miss — the specced hero.
2. **No glowing core.** The `_t5` look is anchored by a bright `W`/near-white bloom. The
   hologram center is only mid-teal `c`, so nothing luminates. It doesn't glow.
3. **Beam is a 1px dashed thread.** From the little orange emitter box up to the hologram
   there's only a faint dotted teal line. The `_t5` refs use a bold glowing column that ties
   base to sky. Building and hologram currently feel disconnected.
4. **The building reads as a face.** Two symmetric teal side-windows ("eyes") + a big central
   teal window + an orange dotted arc across the bottom ("mouth") produce strong pareidolia —
   it looks like a cute monster/potato-bag character, not Discovery/observatory.
5. **Weak iso / lumpy silhouette.** The body is a flat, front-facing, symmetric blob with no
   distinct isometric top/left/right faces and no dome read. Outline `K` is mostly clean but
   the footprint is potato-shaped with blobby feet — not crisp architecture like the refs.
6. **No telescope.** The specced hero prop (telescope firing the beam) is absent; there's only
   a tiny orange chimney box at the apex. The satellite dish is present but static (no `c`
   signal arcs "crackling" off it).

## Concrete tweaks
1. **Rebuild the hologram as a real spiral galaxy:** a bright `W` (2–3px) glowing core, 2–3
   curved arms of `h→c→g` tapering outward, `O/o` warm highlight stars strung along the arms,
   and a few isolated `c` planet dots orbiting. Kill the solid-lens outline and the random
   confetti scatter.
2. **Add a bright core bloom:** `W` center fading to `h` then `c`, so the galaxy actually
   luminates as the hero.
3. **Make the beam a bold column:** 3–4px wide, `W/h` core flanked by `c`, running from the
   telescope straight into the galaxy core — not a dashed thread.
4. **Add a recognizable telescope** (angled `cylinder` barrel on the dome, aimed up toward the
   galaxy) as the beam source, replacing the orange chimney nub.
5. **Break the "face."** Turn the symmetric window trio + bottom orange arc into architecture:
   drop or relocate the bottom orange "mouth" dotting, and make the central element a clear
   telescope aperture / observatory slit rather than a third eye.
6. **Give it crisp iso massing.** Use `isobuild.dome` for a proper domed roof with a lit
   top-left and shaded lower-right, on a base with distinct left/right wall faces (`M` vs
   `D/d`) and a lit top rim — so it reads as a building, not a bag. Tighten the lumpy `K`
   footprint.
7. **(Minor) Make the dish crackle:** add a couple of `c` signal arcs radiating off the
   satellite dish, per the blueprint.
