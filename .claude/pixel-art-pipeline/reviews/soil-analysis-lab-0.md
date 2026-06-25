# Review: Soil Analysis Lab (terrabase) — round 0

**VERDICT: TWEAK**

## Per-criterion notes

1. **Iso 2:1?** PASS. Wall verticals and the 2:1 diagonal roof/footprint edges read as a proper isometric projection. The hipped main roof plane and the left/right face foreshortening are consistent.

2. **Roof visible 3/4 top-down (clerestory monitor)?** PARTIAL PASS. The broad `L`/`W` roof plane is clearly visible from above and dominates the silhouette (good). The clerestory monitor is present as a raised dark box on the back-right ridge with a `c`/`h` window band, but it reads as a small back-corner appendage glued to the sieve tower rather than a *central* raised lantern straddling the roof ridge as the blueprint calls for (`Box(top≈(31,12), wx≈6, wy≈4, h≈5)`, centered). Right now the center of the roof is empty and the monitor + tower are crowded into one back-right lump.

3. **Front corner faces viewer?** PASS. The near vertical edge of the hall faces the viewer with the LIT-LEFT and SHADED-RIGHT faces splaying away — correct front-corner read.

4. **Sharp/clean/in-palette/clean K outline?** PASS. Crisp single-pixel edges, no blur or anti-alias on close inspection. Hard `K` outline wraps the silhouette and the inset elements. 13 distinct chars, all from the TerraBase set (`K W L M D d h c g G o O r`) — within the ≤16 cap.

5. **Cohesive TerraBase palette + motifs?** PASS. Earthy ochre/slate walls (`M`/`D`), mineral-teal glass/glow (`c`/`g`/`G`/`h`), warm amber accents (`o`/`O`/`r`). Soil-pit horizons, sieve hardware, and the teal sensor glow all sit in-family.

6. **One-of-one signature present + legible + distinct?** PARTIAL — the weakest axis.
   - **Composition bins:** STRONG. Four `K`-framed bins read clearly on the right face — amber `o`/`r` sand, gold `O` silt, tan `M` clay, teal `g` organic — graded and distinct. This is the most legible part of the hero.
   - **Teal pie-dial:** STRONG. A clear circular `g`/`G`/`c` dial with a lit `O`/`h` dominant wedge sits on the hall front. Reads exactly as intended.
   - **Sieve-shaker tower:** WEAK. The back-right structure reads as a dark louvered/vented box, NOT as a stack of 3–4 distinctly STEPPED, finer-to-coarser `K`-rimmed sieve trays. The cascade flecks (`o`/`r`) are present down its right edge but there is no clear stepped silhouette and the screens don't separate into discrete trays. Confirms the painter's self-noted risk: the sieve-shaker does not yet read as graded screens.

7. **Attractive?** PASS, with reservations. Good color balance, strong left-face glazing, appealing teal accents. The back-right quadrant is visually crowded (monitor + tower + cable all stacked) while the roof center is empty — slightly lopsided composition.

8. **Unique built form + opening on LIT-LEFT?** PASS on uniqueness, PARTIAL on form fidelity. This is clearly a wide low hall, NOT the gateway cube, and the hero glazing + lab door + bins are on the LIT-LEFT face as assigned (matches batch balance: Soil Analysis Lab = LEFT). However the clerestory monitor is not centered on the ridge (see #2), and the soil-pit/auger on the front-right is under-resolved (see tweak list). Not a generic box — so not an automatic TWEAK on this axis — but the two signature sub-elements (sieve + pit/auger) need work to fully honor the bespoke form.

## Confirmed weak spots (painter's self-note verified)
- **Auger reads as a pole/guy-wire, not an auger.** The diagonal `D`/`M` element leaning over the front-right pit is a plain thin diagonal line — no flight/helix, no auger head. It reads as a tensioned cable or pole.
- **Soil-pit doesn't show stacked horizons.** The recessed area below the auger reads as a single `r`/`D` bin with one rust band, not 3–4 distinct `d`/`D`/`r`/`M` soil-horizon layers.
- **Sieve-shaker doesn't read as stepped graded screens** (see criterion 6).

## Tweak list (painter-actionable)

1. **Sieve-shaker tower — make the steps read.** Back-right roof, the dark vented box. Rebuild as 3–4 clearly STEPPED `K`-rimmed trays cascading down-right, each tray one row narrower/lower than the one above (a visible staircase silhouette against the roof). Rim each tray in `K`, fill the mesh with `D` (coarse, top) grading to `M` then `L` (fine, bottom). Keep one `c`/`d` ghost-offset on the frame edge to hint vibration. The discrete stepped silhouette is the priority — right now it's a solid lump.

2. **Cascade flecks — grade them finer/paler down the steps.** On/beside the sieve steps, replace the current uniform `o`/`r` flecks with a top-to-bottom gradient: `r` (coarse) at the top tray → `D` → `M` → `o`/`O` (fine, pale) at the bottom into the bins. This sells "separating by grain size."

3. **Clerestory monitor — recenter on the ridge.** Move the raised lantern from the back-right corner to straddle the CENTER of the roof ridge (per blueprint `top≈(31,12)`), as a small `M`/`D` box with a `c`/`h` clerestory window band on its long sides. This fills the empty roof center and separates the monitor from the sieve tower so each reads on its own.

4. **Hand-auger — give it a flight, not a pole.** Front-right over the pit, the diagonal `D`/`M` line. Add a short `K`/`D` auger head at the bottom (in the pit) and 3–4 small `K`/`d` helix ticks alternating along the shaft to read as an auger flight; cap the top with a small `M`/`D` `T`-handle or motor block. Thicken the shaft to 2px so it doesn't read as a guy-wire.

5. **Soil-pit — stack the horizon bands.** The `K`-rimmed recess under the auger, front-right at ground. Fill it with 3–4 horizontal bands top-to-bottom: `d` topsoil → `D` → `r` subsoil → `M` parent material, each band 1–2px, `K`-rimmed at the pit edge. This ties the pit to the strata motif and distinguishes it from a plain crate.

6. **(Optional) Rebalance the back-right crowding.** Once the monitor moves to center (tweak 3), nudge the `D` sample-cable run so it doesn't overlap the sieve steps, keeping the tower silhouette clean.

## Optional polish (not blocking)
- A 1px `o` "SOILS" placard tick over the LEFT door is hinted but faint — could be a touch brighter (`O`) for the door-read.
- The right shaded face is appropriately plainer; consider one `d` vent rectangle to match the blueprint's "one `d` vent" note if not already present.
