# Review: Weather Monitoring Post (terrabase) — round 0

**VERDICT: TWEAK**

A genuinely tall, airy stilted lookout with a strong tethered-balloon hero and a real right-face glow — close to ship. It fails on ONE legibility criterion: the forecast ribbon's 3-glyph sun→cloud→storm sequence and the predicted-front arrow do not read; they scatter as teal/amber confetti. The painter's self-noted weak spots (busy front-right corner, faint storm/arrow) are confirmed. Fix the ribbon read and tidy the corner, and this ships.

## Per-criterion notes

1. **Iso 2:1?** PASS. Roof and deck edges run on clean 2:1 diagonals; leg splay and cross-braces hold the iso grid. No broken angles.
2. **Roof visible (3/4 top-down)?** PASS. The hipped plank roof top is clearly visible as an `L`/`M` lid over the cabin (crop: cabin top band, the lighter tan rhombus above the dark walls). Stubby lightning-rod nub reads at the apex.
3. **Front corner faces viewer?** PASS. The cabin's near vertical corner edge points at the viewer with the lit-left and shaded-right faces splaying off it; both faces are visible.
4. **Sharp / clean / in-palette / clean K outline?** MOSTLY PASS, with the front-right exception. Edges are single-pixel and crisp, palette looks in-set. BUT the front-right corner (corner crop, where the cantilevered launch shelf meets the cabin) is a dense tangle of `K`/`D`/`d` — the deck shelf, the rail posts, the ribbon root, and the window frame all collide with little breathing room, so the silhouette muddies there. This is the noted weak spot and it's real.
5. **Cohesive TerraBase palette + motifs?** PASS. Earthy ochre/slate `M`/`D`/`d` timber walls, mineral-teal `c`/`g`/`G` sensor glow on glass and ribbon, warm amber `o`/`O` lamp interior, `r` rust on the stair steps. Weathered-timber lookout + weatherproof instruments motif honored. On-brand.
6. **One-of-one signature present + legible + distinct (balloon + radiosonde + forecast, NO anemometer)?** PARTIAL. Balloon: PASS — round `W`/`L` body, `h`/`c` teal halo ring, taut tether to a small `D`/`M` radiosonde pod beneath: reads instantly and is distinct. NO anemometer present — correct. BUT the **forecast ribbon FAILS the legibility bar**: the teal `c`/`g` strip floats to upper-right, but the glyphs above/on it (ribbon crop) read as random `O`/`g` specks. There is no legible sun→cloud→storm *left-to-right sequence* and **no readable predicted-front arrow** — the prediction, the whole point of the mini-game tie-in, does not communicate. This is the gating defect.
7. **Attractive?** PASS. Strong vertical composition, the balloon crowns it nicely, good lit/shaded contrast. The confetti ribbon is the one element that currently looks like noise rather than intent.
8. **UNIQUE BUILT FORM + opening on RIGHT + glowing on shaded side?** PASS. Content bbox aspect h/w ≈ 1.5 with open-air stilts (sparse leg rows y440–600) below the cabin mass — unmistakably a TALL stilted fire-lookout, not the gateway cube and distinct from siblings. The instrument window GLOWS on the SHADED RIGHT face (corner crop: `K`-framed pane, `O`/`o` lamp interior, `c`/`h` reflection), while the LIT LEFT face is correctly plainer (`M`/`L` plank wall, small `c` windows, `r` stair). Opening-side assignment satisfied.

## Tweak list (painter-actionable)

1. **Forecast ribbon — rebuild as 3 distinct, spaced glyphs (PRIMARY FIX).** Ribbon crop, the floating strip roughly source-rows 24–28, right of the cabin. Right now it's `O`/`g` confetti. Lay a clean 1px `c` holographic baseline strip, then place THREE clearly separated glyphs left→right with `K`/background gaps between them: (a) `O` sun = a 2×2 `O` dot with a single `o` ring pixel; (b) `L`/`W` cloud = a 3-wide lumpy `L` blob; (c) `G`/`d` storm = a small `G` cloud with one `d` lightning zig under it. Spacing between glyphs matters more than detail — give each ≥1px clear gap so they read as a sequence, not a smear.
2. **Predicted-front arrow — make it an actual arrow.** Same ribbon area. Add a bright `g`/`O` arrow shaft (2–3px) sweeping left→right toward the storm glyph, with a clear 2px `O` arrowhead chevron pointing AT the storm. Light the storm glyph it points to brightest (`O`) so the "prediction" reads. Currently no arrow is distinguishable.
3. **Declutter the front-right corner.** Corner crop, where the cantilevered balloon-launch shelf meets the cabin near corner. Thin the stacked `K`/`D` here: drop 1–2 redundant `d` rail posts and pull the ribbon root 1px clear of the window frame so the glow window, the deck lip, and the ribbon don't collide. Keep the `K` outline continuous but give each element a 1px gap.
4. **(Minor) Tether/radiosonde clarity.** Balloon crop — the tether reads, but the radiosonde pod is a touch ambiguous against the leg below it. Add one blinking `O`/`c` sensor pixel on the pod and keep the tether a single consistent `D` line so the pod reads as a hanging instrument, not part of the tower.

## Optional polish (not gating)
- A 1px `c` glow halo bump on the upper-left balloon edge would sell "glowing tethered" a hair more.
- The lightning-rod apex `c` tip could be one pixel taller to separate it from the roofline.
