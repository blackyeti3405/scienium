# Review: Geological Core Lab (terrabase) — round 3

**VERDICT: SHIP**

The load-bearing failure is finally fixed. The targeted reproportion landed: the
tall left strata block is gone, the roofline is one continuous low mono-pitch
slope, and the strata is now a low bank behind the shed rather than a tower lid.
Objectively the tallest building column is **28px (≤30)** and the silhouette is
**53w × 34h** — clearly wider than tall (ratio 1.56). It now genuinely reads as a
long low hillside core shed, NOT the gateway cube. The signature inclined banded
core with sliding teal scanner + per-layer label survived the reproportion and
still reads, and the lit-left door/placard is intact. No regressions. SHIP.

## Objective form check (rendered PNG, 64×64)

- **Tallest column:** 28px at cols 15–17 (back-left ridge). ALL building columns
  ≤28px ≤30 target. PASS.
- **Bbox:** 53w × 34h → ratio **1.56 wider-than-tall**. PASS.
- **Per-column roofline** (top opaque row): col 10 = row 17 → col 17 = row 14
  (back-left high edge) → descends monotonically to col 43 = row 24 → col 54 =
  row 30 (front-right low edge). One clean continuous mono-pitch plane, NO tall
  sub-block, NO flat lid. The round-1/round-2 "tall block + low tail" profile is
  gone — left mass top moved from row 8 (r2) down to row 14, exactly as claimed.
- **Strata bank:** now a short low band at cols 7–9 (rows 29–32) behind the
  shed's back-left, sitting at/below ridge height — a cut bank the shed butts
  into, not a tower it leans on.
- **Palette:** 13 distinct opaque colors, all in-palette, zero off-palette, zero
  anti-alias/stray pixels. Hard `K` silhouette.

## Per-criterion

1. **Iso 2:1?** PASS. The long shed roof diamond and the side/front wall planes
   hold a consistent 2:1 slope; edges are clean isometric.

2. **Roof visible (3/4 top-down)?** PASS. The whole roof is now ONE tilted
   mono-pitch corrugated plane (high back-left → low front-right) with `d`
   corrugation seam lines running down-slope across the full length. The flat
   left lid from rounds 1–2 is gone.

3. **Front corner faces viewer?** PASS. The near vertical front corner (~col 44,
   front-right) points at the viewer; the lit-left front face and the shaded
   right side both read as distinct planes.

4. **Sharp/clean/in-palette/clean K outline/no strays?** PASS. 13 in-palette
   colors, ZERO off-palette, zero anti-alias, hard `K` outline, no strays.

5. **Cohesive TerraBase palette + motifs (strata hillside)?** PASS. The low
   strata bank (back-left, `r`/`D`/`d`/`M`/`L` layers), the banded core, the
   weathered `M`/`D` corrugated shed, mineral-teal `g`/`G`/`c` scanner glow, and
   the `o` capped core tubes by the door are all present and cohesive. Crucially
   the strata now reads as a CUT BANK the shed is dug into, not a stacked second
   box — the round-2 "two boxes" complaint is resolved.

6. **One-of-one signature present + legible + distinct?** PASS. On the front-left
   apron: a long INCLINED glass-cased drill-core with ruled bands, a bright
   `g`/`G` teal scanner collar over a glowing `O`/`h` lit band, a `c` light-bar,
   and a connected `W`/`L` label card with a `K` tick + `o` dot. Clearly a
   HORIZONTAL/inclined banded core being scanned for identification — distinct
   from the vertical sight-glasses in ChemWorks Distillation / BioCore Aquatic
   and from #10's borehole shaft. Anchored to the structure, not floating. Reads.

7. **Attractive?** PASS. With the reproportion, the silhouette is no longer
   top-heavy/lopsided — it's one clean long low shed with a handsome corrugated
   roof, the strata cut tucked behind, and the glowing core as a focal hero on
   the lit face. Reads well at thumbnail.

8. **UNIQUE BUILT FORM (long low shed, NOT the cube) + opening LIT-LEFT?** PASS —
   the load-bearing criterion is finally met. Tallest column 28px, bbox 53×34
   (ratio 1.56), continuous low mono-pitch roof, no tall sub-block. This reads as
   a long low hillside core shed, clearly NOT the gateway cube and distinct from
   the squat bunker siblings. **Opening:** correct — the `K`-framed door with
   `o`/`O` placard and `c` glass is on the LIT LEFT front face (~cols 13–18), the
   inclined core rack just outside/under the lean-to.

## Round-3 fix verification

1. **Reproportion to a long low shed (≤30px, wider than tall):** RESOLVED. Peak
   28px (was 39px in r2); bbox 53×34 ratio 1.56.
2. **Strata moved to a low bank behind the shed (not a lid/tower):** RESOLVED.
   Strata is now a short low bank at the back-left, at/below ridge height.
3. **Continuous mono-pitch roof:** RESOLVED. One tilted corrugated plane the full
   length, seam lines running down-slope.
4. **Signature + lit-left door preserved through the reproportion:** RESOLVED.
   Both read; no regression.

## Polish notes (non-blocking — do NOT gate ship on these)

- Up close the teal label trail + scanner cluster is slightly busy, but it reads
  at thumbnail and is one-of-one; leave as-is unless a future pass touches it.
- The strata bank is read-correct but subtle; a future building could push the
  rust `r` band one pixel brighter, but it is sufficient now.

No blocking issues. SHIP.
