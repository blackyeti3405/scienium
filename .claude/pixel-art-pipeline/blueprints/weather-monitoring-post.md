# Weather Monitoring Post — blueprint (bespoke form, STANDARD)

- **Name:** Weather Monitoring Post · **Slug:** `weather-monitoring-post` · **Lab type:** `terrabase`
- **Role:** standard · **Mini-game:** prediction · **Base:** Record and analyze atmospheric data

## Set palette (author on these chars→hex exactly)
`K #20190f` · `W #efe6cf  L #d6c8a0  M #b09a6e  D #7e6c47  d #54462c` · `h #d6f2ea  c #a4e2d4  g #34b6a2  G #1d8474` · `o #e0a850  O #ffce80  r #9a5e1e`

## BUILT FORM — a TALL STILTED FIRE-LOOKOUT TOWER with a railed observation deck + balloon-launch platform (NOT the gateway cube)
A tall, narrow **fire-lookout-on-stilts** — a small cabin perched high on four splayed timber legs, with a railed observation deck wrapping it, reached by an angled stair. The tallest, airiest, most vertical-open silhouette of the set (legs are open air, not a solid base). Distinct from the squat bunker, the cylinder farm, and the derrick.
- **Stilt legs:** four splayed `D`/`d` timber legs (1–2px) rising from a small ground footprint to the cabin floor at mid-canvas height, with 2 `d` cross-braces between them (X-bracing) — open air shows between the legs.
- **Observation cabin:** a small `Box` cabin perched on the legs — `Box(top≈(30,12), wx≈8, wy≈7, h≈9)` — `M`/`D` plank walls, a shallow hipped `L`/`M` plank roof. A railed **observation deck** (a thin `D` rail on `K` posts) wraps the cabin front edges (drawn as a 1px railing line around the deck lip).
- **Balloon-launch platform:** a small extra deck cantilevering off the cabin's front corner (a thin `D`/`M` planked shelf with `K` rail) — the launch pad for the signature balloon.
- **Access stair:** a thin angled `D`/`d` zig-zag stair-stringer climbing one leg from ground to deck (a few `K`-edged steps).
- **Roofline:** the small hipped plank cabin roof, a stubby `D` lightning-rod with a `c` tip at the apex; the balloon rises above all of it.
- **Opening side: RIGHT (glowing instrument cabin on the shaded face).** The hero is the cabin's instrument room on the SHADED RIGHT face: a wide `K`-framed glass observation window that GLOWS (warm `o`/`O` lamp-lit interior, instruments + a forecast screen visible, `h` reflection) so it reads on the shaded side. Keep the LIT LEFT cabin face plainer — plank wall with one small `c` window and the access stair.

## Signature feature (one-of-one — a tethered weather-balloon with a dangling radiosonde projecting a holographic forecast ribbon)
**A glowing tethered weather-balloon strains upward at its line above the launch platform, a radiosonde sensor pod dangling beneath it — and from the pod unfurls a holographic forecast ribbon: a left-to-right strip of sun→cloud→storm icons with a predicted weather-front arrow sweeping across it.** No weather-balloon / radiosonde / forecast-ribbon motif exists in the catalog, and it deliberately uses NO anemometer/whirligig sensor-mast (that is BioCore Field Station's owned feature) — this is a buoyant balloon + sounding instrument, a wholly different silhouette and read.
- **Balloon:** a round `W`/`L` balloon high above the deck, `h`/`c` highlight on its upper-left, straining at a thin taut `D`/`K` tether line to the platform; a soft `c` glow halo.
- **Radiosonde:** a tiny `D`/`M` instrument pod hanging just under the balloon on a short line, with a blinking `O`/`c` sensor light.
- **Forecast ribbon:** a horizontal `c`/`h` holographic strip floating beside/below the balloon showing 3 tiny weather glyphs — `O` sun → `L`/`W` cloud → `G`/`d` storm — left to right.
- **Predicted-front arrow:** a bright `g`/`O` arrow sweeping across the ribbon toward the storm glyph (the prediction); the leading glyph it points to is lit brightest `O`.

## Motifs it must honor (TerraBase)
Weatherproof instruments & antennae (the radiosonde + lightning-rod + balloon sounding rig), mineral-teal sensor glow (the forecast ribbon + balloon halo + pod light), canvas/weathered-timber field build (`D`/`d` plank lookout, hipped plank roof), expedition lookout silhouette.

## Target output paths
- Source JSON → `art/src/buildings/terrabase_weather-monitoring-post.json`
- Rendered PNG → `apps/web/public/sprites/buildings/terrabase/weather-monitoring-post.png`
- Preview → `art/preview/buildings/terrabase_weather-monitoring-post.png`

## Visual contract
Isometric 2:1, front corner faces viewer, roof visible (3/4 top-down). 64×64 source canvas. ≤16 colors (TerraBase palette only). Hard `K` outline. Crisp single-pixel edges — no blur/anti-alias/off-palette. Must read as a **tall stilted fire-lookout tower with a railed deck + balloon-launch platform**, distinct from the gateways and all TerraBase siblings, with a tethered weather-balloon + radiosonde projecting a forecast ribbon (NO anemometer) as its hero, instrument cabin glowing on the RIGHT.
