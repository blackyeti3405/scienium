# Review — terrabase / soil-analysis-lab (round 0)

**Verdict: CHANGES_REQUESTED**

Judged from the actual rendered 64px PNGs (not the generator text, and NOT the
`_contact.png` strip — that strip is STALE; it depicts an older t2 roof-tray and a
t5 gold furnace bay that do not exist in the current source/PNGs). Ground truth is a
manual RGBA pixel diff of the shipped PNGs (`ImageChops.difference().getbbox()` was
unreliable here and returned false negatives — do not trust it).

Per-stage RGBA diff vs previous stage (changed px / NEW silhouette px / region):
- base→t2: 26 / **0** / inside soil-pit (x41-47, y40-51)   → color-only, no new mass
- t2→t3:  165 / 107 / front-left (x5-19, y34-49)           → real annex ✓
- t3→t4:  171 / 139 / upper roof (x19-34, y2-24)           → real tower ✓
- t4→t5:   65 / **0** / inside soil-pit (x40-53, y45-53)   → recolor + gold rim, no new mass

## Per-stage
- **base**: BASE_IDENTICAL True (byte-identical to shipped PNG). ✓
- **t2**: FAIL. `stage2_probes` recolors 26 px entirely INSIDE the existing pit
  footprint — the probe spikes/pH flag never extend the silhouette (0 new px) and
  read as faint flecks buried in the busiest corner of the sprite. No "you unlocked
  something" read at 64px.
- **t3**: GOOD. Cold-frame / propagation annex bolted off the front-left (+107 px new
  silhouette). Clear structural add, cumulative, on-theme. Do not change.
- **t4**: GOOD. Rooftop hydroponic A-rack tower rising into open sky, apex at y=2 (on
  canvas, nothing clipped), +139 px new silhouette, left of centre so it never occludes
  the back-right sieve-shaker signature, the clerestory monitor, or the auger. Strong
  major add. Do not change.
- **t5**: FAIL (borderline). `stage5_root_canopy` glows the pit bed (E/e root grid +
  bloom) and lays a gold q rail/medallion on the EXISTING rim — visible and elite-
  reading, gold correctly t5-only, but 0 new silhouette. A crowning stage must read as
  a further build-OUT beyond t4; an in-footprint recolor of a partly-occluded bed is
  not enough on its own.

## Checklist
- [x] Cumulative (no earlier addition lost: lost=0 at every step)
- [x] 64x64, nothing clipped off 0..63 edges (edge_px=0 all stages), base footprint unchanged
- [x] Colours mature; gold/premium reserved to t5 only (25 gold px, t5 exclusive)
- [x] On-theme + unique; signature sieve-shaker never occluded
- [x] Base byte-identical
- [ ] **Every stage visibly ADDS structure (t2 and t5 are recolor-only, 0 new silhouette)**
- [ ] **Smooth ramp / t5 reads as a fully built-out version (t5 adds no mass over t4)**

## mustFix
- **t2**: addition adds ZERO new silhouette — all 26 changed px sit inside the existing
  soil-pit footprint, so the probe spikes/pH flag do not read. Make the spikes actually
  protrude ABOVE the pit's back rim into bare canvas: the back rim is y≈45 (PIT_Y0-1),
  so drive at least two K probe staffs up to ~y38-40 with bright c/h sensor heads that
  silhouette against the dark shaded wall, and fly the pH pennant on a staff whose tip
  clears the rim (top ≈ y39). Target ≥15-20 NEW (alpha) px above the existing footprint.
- **t5**: addition adds ZERO new silhouette — root-grid + gold rim recolor the existing
  bed only. Add a small NEW crowning mass that reads at 64px, e.g. a short gold-capped
  SAMPLE-VAULT obelisk / assay spire standing on the pit's near rim (foot ≈ (52,45),
  rising 6-8px to ~y38 in the clear lane right of the bins, left of/below the auger
  handle), trimmed with q gold + an E core, so t5 visibly grows past t4. Keep the root
  canopy + gold rail as dressing, but the stage must contribute new silhouette px.

Leave t3 and t4 unchanged — they already pass.
