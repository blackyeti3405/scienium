# Soil Analysis Lab — blueprint (bespoke form, STANDARD)

- **Name:** Soil Analysis Lab · **Slug:** `soil-analysis-lab` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** identification · **Base:** Characterize soil composition

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a WIDE LOW HALL with a CLERESTORY MONITOR ROOF + an exposed AUGER/SOIL-PIT on one side (NOT the gateway cube)
A wide, low **clerestory-monitor hall** — a broad main mass with a raised central monitor (a smaller `Box` riding the roof ridge with its own clerestory windows) — flanked by an exposed open soil-pit/auger on one side. Distinct from the other low halls by its raised central clerestory lantern and the open pit; distinct from the bunker (this is wide & glassy-topped, not a parapet box).
- **Main hall:** a wide low `Box` — `Box(top≈(30,18), wx≈12, wy≈9, h≈10)` — `M`/`D` walls, an `L`/`M` low roof.
- **Clerestory monitor:** a smaller `Box` riding the center of the roof — `Box(top≈(31,12), wx≈6, wy≈4, h≈5)` — a raised lantern with a band of small `c`/`h` clerestory windows along its sides letting light into the hall (a recognizable monitor-roof read).
- **Soil pit + auger:** off the front-right of the hall, an exposed open **soil pit** at ground level — a `K`-rimmed rectangular hole showing 3–4 stacked soil-horizon bands (`d` topsoil / `D` / `r` subsoil / `M` parent) — with a small `D`/`M` hand-auger rig leaning over it (a thin `K` auger flight).
- **Roofline:** the central clerestory monitor + the signature sieve-shaker tower at the back-right roof; a `D` sample-cable run and an `o` "SOILS" placard over the door.
- **Opening side: LEFT.** The hero is a `K`-framed lab door + a wide bench window on the LIT LEFT face (`M`/`D`, `c` glass, `o` placard), composition bins visible inside. Keep the SHADED RIGHT face plainer — a long wall with one `d` vent and the soil-pit at its base.

## Signature feature (one-of-one — a rooftop vibrating sieve-shaker tower cascading soil through stepped screens into glowing composition bins, a teal pie-dial reading the mix)
**On the roof, a stack of vibrating graded sieves shakes soil down through stepped mesh screens — coarse to fine — cascading it into a row of glowing labeled composition bins (sand → silt → clay → organic), while a mineral-teal pie-dial reads out the resulting soil-mix fractions.** No sieve-shaker / graded-screen / composition-bin motif exists in the catalog, and it's deliberately distinct from #4 Geological Core Lab (that's stratigraphy of an intact rock core; this is mechanically SEPARATING loose soil by grain size into fractions for identification), so it collides with nothing.
- **Sieve-shaker tower:** a small `D`/`M` frame on the back roof holding 3–4 stacked `K`-rimmed sieve trays, each finer than the last; a faint offset `c`/`d` ghost on the frame edges hints the vibration.
- **Cascading soil:** soil grains spill down the steps as small `r`/`D`/`M`/`o` flecks, getting finer/paler as they descend through the screens.
- **Composition bins:** a row of 4 small `K`-framed bins below the sieves, each glowing a graded fill — `r` sand → `o` silt → `M` clay → `D`/`g` organic — with a tiny `W` label tick over each (the identification).
- **Teal pie-dial:** a `g`/`G`/`c` mineral-teal pie-readout on the hall front showing the mix proportions, one wedge lit `O`/`h` as the dominant fraction.

## Motifs it must honor (TerraBase)
Layered rock/soil strata (the soil-pit horizons + the graded fractions), weatherproof instruments (the sieve-shaker rig + auger), mineral-teal sensor glow (the bins + pie-dial), sample crates/field hardware, weathered field hall (`M`/`D`, clerestory).

## Target output paths
- Source JSON → `art/src/buildings/terrabase_soil-analysis-lab.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/soil-analysis-lab.png`
- Preview → `art/preview/buildings/terrabase_soil-analysis-lab.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **wide low clerestory-monitor hall with an exposed soil-pit/auger**, distinct from the gateways and all TerraBase siblings, with a rooftop vibrating sieve-shaker cascading soil into graded composition bins (teal pie-dial) as its hero, opening on the LEFT.
