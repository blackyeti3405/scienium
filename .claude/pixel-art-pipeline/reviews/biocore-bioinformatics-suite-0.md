# Review — biocore / bioinformatics-suite (round 0)

**Verdict: CHANGES_REQUESTED** (one targeted fix on _t2 only; _t3/_t4/_t5 are good — do not touch)

Judged on the actual rendered PNGs (contact strip + per-stage full renders + 64px source pixels + opaque-footprint measurement), not any text summary. NOTE: an earlier copy of this review file claimed t3/t4 were recolor-only (+0 new px) — that was written against a PRIOR generation. The CURRENT on-disk PNGs have been regenerated and t3/t4/t5 now add real new structure (measured below). Only t2 still falls short.

## Opaque-footprint growth (alpha>0, current on-disk PNGs)
| transition | new opaque px | lost px | reads as |
|---|---|---|---|
| base → t2 | **0** | 0 | in-place recolor crest only — no new geometry |
| t2 → t3 | 91 | 0 | server/compute annex bolted out right ✓ |
| t3 → t4 | 107 | 0 | fourth green-roof terrace tier raised up-left ✓ |
| t4 → t5 | 77 | 0 | twin Circos ring + gold trim ✓ |
| base → t5 | 275 net | 0 | fully built-out ✓ |

Cumulative is clean: 0 lost pixels at every step (each stage is a strict superset). Gold `q` appears ONLY at t5 (21 px trim, not a recolor). Base is byte-identical (BASE_IDENTICAL True). Nothing clipped off-canvas — no addition touches x=0/x=63/y=0 (only edge pixels are the base's own front-bottom row, identical across all stages). Genome-ring signature drawn last, never occluded.

## Per-stage
- **base**: byte-identical to shipped PNG. Unchanged.
- **_t2 — FAIL (recolor, 0 new structure):** the only change is 26 in-place repaints of the lit mid-terrace front parapet into a teal `c` data-rail + `h` nodes + `O/o` planter blooms + one atrium light pip. It is visible and on-theme, but it adds ZERO new opaque pixels — it recolors pixels already present in the base. The checklist requires "adds structure vs the previous, not a recolor." Easy fix below.
- **_t3 — PASS:** louvered `b` bark-green SERVER/COMPUTE annex bolted onto the right face, stepping the silhouette out into the empty upper-right triangle (+91 px); louver vent bank, `g` waste-heat, `c` LEDs, `o/r` exhaust riser. Introduces matured bark-green. Good.
- **_t4 — PASS:** a fourth green-roof terrace tier raised up-left of the atrium on the pavilion shoulder (+107 px); planted parapet garden + glowing `e` grow-lit clerestory on a `b` plinth. Breaks the profile up. Good.
- **_t5 — PASS:** genome ring doubles into a dual-Circos cluster (smaller second ring in the upper-left sky, linked by chord arcs + travelling `O` blip) + `q` gold trim ring on the atrium cap + gold mid-terrace cresting + intensified gold projector stream (+77 px). Reads as elite/maxed. Good.

## mustFix
- **_t2:** add a few genuinely NEW opaque pixels (a small on-theme element that pokes proud of the base silhouette), not just an in-place recolor. Keep the existing data-rail/planter dressing, but ALSO bolt on one modest structural element anchored on a roof point — e.g. a short sequencer/uplink antenna or a single small vent stub rising ~3–5 px off the mid-terrace or atrium-penthouse roof, ~6–15 new opaque px, clamped on-canvas and clear of the floating genome ring (keep y ≥ 17 so it never touches the ring bbox). After the fix, base→t2 should show a small positive opaque-footprint delta. Do NOT change _t3/_t4/_t5.
