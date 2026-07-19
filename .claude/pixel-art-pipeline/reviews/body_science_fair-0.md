# Body review — science_fair (round 0)

Render: `art/preview/science_fair_creative.png`
Builder: `art/gateways/creative_science_fair.py`
Batch peers: `art/preview/{operations_hub,science_fair,pvp,showcase}_creative.png`

## Verdict: SHIP

## Criterion 1 — Body is a PEAKED / GABLED exhibition PAVILION, not a flat box — PASS
Cropped the body region (native 64px, x10) to judge the silhouette without the hologram
distracting. It is unmistakably a peaked tent, NOT a flat-top box:
- A bright raised APEX at top-center (the `W` hip highlight + peak emitter) that sits
  ABOVE where a flat box lid's top corner would be.
- Two folded slope planes fold down from the apex — lit `L` left slope, shaded `M`/`D`
  right slope — with a tonal ramp (`M`/`D` band) sinking the lower third for canvas curve.
- A raised front RIDGE crease runs apex → front corner, and the roof bottoms out in a
  crisp front-eave `V`. Panel seams fan from the peak.
- Festival PENNANT bunting is swagged down both ridge lines, which reads instantly as
  "fair tent." The walls are deliberately short (just the teal exhibit windows + base
  band under the eaves), so the peaked roof owns the silhouette. `tent_roof()` draws the
  slopes OVER and fully occludes the box's flat lid — no flat rhombus lid survives.

## Criterion 2 — Distinct from the other 3 bodies — PASS
Four clearly different building forms across the batch:
- operations_hub — round drum / rotunda with a colonnade of teal windows + rooftop rig.
- pvp — round TIERED amphitheater (two stacked circular tiers, open arena floor).
- showcase — rounded hall with a smooth CURVED/domed roof + orange lower walls.
- science_fair — angular PEAKED / gabled tent pavilion.
No shared flat box. The nearest neighbor (showcase, also a "pavilion") is a curved dome;
science_fair is a sharp angular gable — the two do not read alike.

## Criterion 3 — Floating hologram hero + beam + sparkles intact and connected — PASS
The teal holo-trophy (radial-shaded cup, two C-handles, embossed winner's star, stem,
stepped pedestal, soft bloom halo) floats above the roof and remains the clear hero. A
single clean orange prize-ribbon orbit (with a tidy rosette medallion) rings the bowl and
is clamped out of the teal halo band, so no orange speckles the glow. The projector beam
springs from the peak-apex emitter and the dithered light cone + twin data streams carry
up into the trophy pedestal — connected (translucent by design, not floating free).
Confetti flecks + `W`/`h` sparkles surround the hero. Hologram carries NO `K`, so it
reads as pure floating light.

## Criterion 4 — Crisp iso, clean K outline, only 13 canonical chars — PASS
Programmatic scan of `art/src/science_fair_creative_generic.json`: characters used are
exactly {D,G,K,L,M,O,W,c,d,g,h,o,r} plus `.` transparent — the 13 canonical chars, ZERO
off-palette. `K` (459px) lives entirely in the building outline/bezels; the hologram is
K-free. Iso edges are crisp: peaked ridge edges, front-eave V, and window bezels all get
a 1px `K` silhouette.

## Optional polish (non-blocking, not required to ship)
- The beam between the trophy pedestal and the roof peak is fairly airy/dithered; a few
  more core `h`/`c` pixels down the center column would firm up the connected read.
- The gable is a shallow peak; raising the apex ~1px would sharpen the pavilion read even
  further. Current form already passes.
