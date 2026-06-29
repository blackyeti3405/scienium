# Review — terrabase/geological-core-lab (round 0)

**Verdict: APPROVE**

Base is byte-identical to the shipped PNG (BASE_IDENTICAL True). Strict cumulative
chain verified on the rendered PNGs: base⊂t2⊂t3⊂t4⊂t5 with 0 opaque pixels ever
removed between stages (+33 / +62 / +45 / +36 new opaque px per step — a smooth ramp,
no no-op/recolor-only stage, no single stage jumping the whole way). All five PNGs are
64x64 with 0 opaque pixels on any edge; footprint/base anchor unchanged (left=2,
bottom=48 throughout), growth is up (top 14→14→14→13→12) and right (right 48→48→60).
Palette gating is correct: basalt `b` first appears at t3, glow `e/E` at t4, and gold
`q` ONLY at t5 (0 in base–t4) — gold is a flourish, not a recolor. The front-left
glass drill-core + teal scanner-collar signature is never occluded; every add is
anchored to a real base part (rack geo / shed roof / shaded-right foot).

## Per-stage
- **base** — unchanged, byte-identical. Long low core shed dug into a banded strata berm; hero = inclined glass drill-core on an apron-seated rack with a teal ID scanner. PASS.
- **t2** — small functional add: a distinct labelled CORE TRAY (lit pale top board, rust/ochre core chips, amber label-tag flag) + a teal hand-lens loupe glint, laid in the previously-empty front-left ground below the rack. Reads as its own object at 64px, clear of the scanner collar. On-theme (one more catalogued core). PASS.
- **t3** — structural add: a covered basalt CORE-STORE lean-to (mono-pitch roof + 2 posts + 3 stacked core boxes + plank skirt) abutting the shaded-right shed foot and extending into the empty right foreground. Real new mass, introduces the matured `b` tone. PASS.
- **t4** — major add: a rooftop SPLIT-CORE SCAN GANTRY — basalt bridge beam on two roof-seated rail posts lowering a glowing `e/E` scan-head that lights the roof beneath it. Prominent overhead mass, fully on-canvas (highest px row 13). Distinct from the sampling-station drill derrick. PASS.
- **t5** — crowning feature: a tall glowing STRATIGRAPHIC-COLUMN hologram rising over the rack (E walls, e/g mineral-zone bands, K contacts, depth ticks, E peak marker) + gold `q` rack rails and a gold TYPE-SECTION plaque. Reads as a fully maxed, elite strat-logging facility, still clearly the same shed. Hologram sits left of the t4 gantry so both read as separate maxed features; highest px row 12, no clipping. Gold confined here. PASS.

No mustFix.
