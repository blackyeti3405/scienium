# Review: Seismograph Array (terrabase) — round 1

**VERDICT: SHIP**

Both round-0 blockers are genuinely fixed: the ink drum is now a real rounded rotating cylinder (no longer a flat CRT-like placard) with the teal trace hugging its curved wrap, and the lit-left face now carries a legible K-framed armored door + placard + glazing. The bunker mass, strata base, and shock-ripple all hold up, with no regressions. Ships.

## Per-criterion notes

1. **Iso 2:1?** PASS. Clean 2:1 isometric projection; wall and roof edges follow the correct 26.57° slopes (JSON rows 24–51), no skew. The near-vertical corner splits lit-left / shaded-right at ~col 30–32.

2. **Roof visible 3/4 top-down?** PASS. The flat parapet deck is fully visible top-down (JSON rows 24–35) and carries both signature props with room to spare. A 2px raised `K`-edged `L`/`M` parapet lip reads around the deck perimeter, so it's a walled deck, not just a flat top.

3. **Front corner faces viewer?** PASS. The bright LIT-LEFT / SHADED-RIGHT vertical seam (~col 30) points at the viewer correctly; both side faces recede away from it.

4. **Sharp/clean/in-palette/clean K outline/no strays?** PASS. Single-pixel hard `K` outline throughout, no blur/anti-alias, all colors are the 13 set chars. The round-0 front-foot noise is cleaned up — the lower silhouette and cast shadow now read as one crisp grounded shape (JSON rows 46–55), and I found no floating stray `K` on the front-left apron.

5. **Cohesive TerraBase palette + motifs (strata base)?** PASS — and the strongest strata read in the set. The lower third is drawn as layered rock strata in stepped rust/slate bands (`r`/`D`/`d`, JSON rows 38–51) that visibly rise against the base, so the bunker now reads as half-sunk into rising bedrock rather than a striped freestanding box (the round-0 weak spot). Earthy `M`/`D` hardened concrete + mineral-teal sensor glow are squarely TerraBase.

6. **One-of-one signature present + legible + distinct (NOT a CRT)?** PASS.
   - **Ink drum — FIXED.** Now an upright rounded paper cylinder: curved/elliptical `K`-rimmed top cap (JSON rows 17–18, `WW LLL` arc), vertical wrap shading `W` (lit-left) → `L` (mid) → `M`/`D` (shaded-right) down the body (rows 19–22), and a faint `d` rotation seam. Reads unmistakably as a round drum, not a placard.
   - **Trace — FIXED.** The jagged `g`/`G` teal seismic trace now runs as a horizontal band hugging the drum's mid-wrap and bending with the curve (rows 23–26), with a brighter `c`/`h` live tip. It reads as a pen scrawling on rotating paper, NOT a waveform-on-a-screen — clearly distinct from Volt's CRT oscilloscope. A thin `D`/`K` stylus arm hangs over the drum (cols ~33–35).
   - **Shock-ripple — still excellent.** 3 concentric `c`/`g` rings around an `O`/`r` epicenter marker on the deck (rows 28–35), outer predicted ring lit brighter `O`. Eye-catching and unique.

7. **Attractive?** PASS. Strong grounded weight, pleasing earthy/teal palette, two legible hero props (drum + ripple), clean silhouette. The most polished TerraBase bunker so far.

8. **UNIQUE BUILT FORM + opening on LIT-LEFT?** PASS.
   - Built form: a low, heavy, ground-hugging blockhouse half-sunk in strata with a flat parapet deck — emphatically NOT the gateway cube, and the lowest/heaviest mass in the set.
   - Opening — FIXED. The lit-left face now carries a legible `K`-framed armored door (tall `M`/`D` slab, JSON rows 36–43, cols ~11–18), the `o`/`O` "EPICENTER" placard plate (rows 41–43), and `c`/`h` glazing with an `o` handle. The door is the dominant element on that face; the loose sensor dots are pulled back.

## Optional polish (non-blocking — do not hold the ship for these)

1. **Tighten the ribbon window into a cleaner horizontal strip.** The lit-left glazing (the `c`/`h` pixels at JSON rows 36–40, cols ~19–22) currently reads slightly as scattered sensor dots rather than one crisp ribbon. Aligning them into a single 1px-tall horizontal `c` band with `K` framing above/below would sharpen the "ribbon window" read. Minor.

2. **One extra magnitude-reading pixel.** The `o`/`O` magnitude placard at the drum base (rows 28–33) is present but small; a single brighter `O` digit-tick would make the "climbing reading" intent read at a glance. Purely optional.
