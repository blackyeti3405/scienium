# Fact-check log — Geology / Seismology

One `/codex-pipeline` run (auto-picked from STATUS), 2026-07-29. Workflow run
`wf_0d87b0bf-9f4`: 321 agents, 15.8M subagent tokens, 3001 tool uses, 1h45m
wall-clock, 0 agent errors.

Authored: 6 segments / 43 units / **275 lessons** — Core 8u/50L, and 7u/45L for each of
`seismology-earthquake-science`, `sedimentology-stratigraphy`, `mineralogy-petrology`,
`structural-geology-geophysics`, `geotechnical-engineering-geology`. Exactly on the
depth targets.

## Loop statistics

| | |
|---|---|
| Lanes | 43 |
| Mean rounds/unit | 2.07 |
| Cleared in 1 round | 10 |
| Cleared in 2 rounds | 20 |
| Ran to the round cap (3) | 13 |
| Opus escalation re-authors | 13 |
| Clean at exit | 42 / 43 |
| Cross-lesson contradictions | 2 raised, 2 survived reconciliation |

Escalation rate (13/43 ≈ 30%) is far above genetics-genomics (0/43) and tracks **claim
density**, not model weakness — geology lessons are thick with dated landmark events,
named classifications, and numeric thresholds (magnitudes, tidal ranges, Atterberg
limits, epicentral distances), so the checker finds more that is genuinely checkable.

## Adjudicated by hand before merge

The workflow correctly refused to put the one dirty unit in the plan. All four items
below were fixed by assertion-checked edits to the drafts (every replacement declared
its expected hit count; the script fails loudly on a miss), then re-validated by
`codex:merge --dry-run`.

### Open HIGH — `geo-sedstrat-environments` (ran to cap, 2 findings, both real)

1. **F1 — confabulated given name on a real citation.**
   `02-rivers-braided-meandering-and-the-continuum.json` credited the classic 1980
   anastomosing-river paper (Bow River valley, Banff, Alberta) to "Norman Smith and
   **Douglas** Smith". The surname+year was right; the given name was invented — the
   exact failure mode the author prompt warns about. Fixed to initials-only,
   **"N.D. Smith and D.G. Smith"**. The same sentence's "Gerald Nanson and A. David
   Knighton" was normalised to **"G.C. Nanson and A.D. Knighton"** for the same reason
   (unflagged, but the same latent risk).

2. **F2 — a real feature bound to the wrong bucket.**
   `04-shorefaces-barriers-and-tidal-flats.json` placed "drumstick-shaped barrier
   segments" in the **macrotidal** (>4 m) class of Hayes' 1979 tidal-range
   classification. Drumstick barriers are the signature of **mesotidal / mixed-energy**
   coasts, produced by wave refraction around flood-tidal deltas. Rewritten: drumsticks
   moved into the mesotidal clause (with Kiawah Island as the example), and macrotidal
   correctly described as barriers going discontinuous or absent, giving way to
   funnel-shaped tidal channels, tidal sand ridges, and extensive tidal flats.
   No checkpoint depended on either term, so the fix was confined to one section body.

### Cross-lesson contradictions (the whole-field consistency phase earned its keep)

3. **1985 Michoacán distance to Mexico City — 350 km vs 400 km**, asserted in three
   independently-written lessons (`seis-ground-motion/04` said 400; `geotech-practice/03`
   and `core-surface/05` said 350, the latter three times including a checkpoint stem
   and an explanation calling it "well documented").
   Resolved to **~400 km** — *against* the reconciler's majority-vote recommendation of
   350. Great-circle distance from the published epicentre (≈18.19°N, 102.53°W) to
   Mexico City (≈19.43°N, 99.13°W) is ≈384 km, which rounds to 400 at one significant
   figure; 350 km is the ~9% understatement. (350 km is widely quoted in the
   literature, most likely as distance to the *nearest rupture* rather than the
   epicentre — the rupture zone extended ~170 km along the coast. Both lessons now say
   "from the epicenter".) 4 replacements across 2 files.

4. **2011 Tōhoku seismic moment — 3.9×10²² vs 5×10²² N·m** (`core-seismic/07` vs
   `seis-magnitude/03`). Both worked examples are arithmetically self-consistent
   (3.9e22 → Mw 9.0; 5e22 → Mw 9.1) and both values are individually defensible, so the
   defect was presenting either as *the* value. Rather than force a single number, the
   Core lesson now states the published spread explicitly — "**estimates span roughly
   3.9 to 5.3 × 10²² N·m depending on the inversion and data used, which is why Tōhoku
   is quoted as both Mw 9.0 and Mw 9.1**" — which removes the contradiction *and*
   teaches that moment is model-dependent. 1 replacement, no arithmetic touched.

**Verification caveat:** the session's WebSearch budget (200 calls) was exhausted by the
321 workflow agents before adjudication, so items 3 and 4 were resolved from the drafts'
own internal arithmetic and from a distance computed off published coordinates — not
from fresh sources. Items 1 and 2 are structural/nomenclature corrections that do not
depend on a lookup. Worth a spot-check on the next pass.

## Advisory warnings (15, non-blocking) — all false positives

`codex:merge` flagged 15 checkpoint stems citing a number absent from the prose. Spot-checked
across four segments; every one is benign:

- self-contained computation stems that supply their own data — *"A clay has LL = 45% and
  PI = 22 … PI_A = 0.73*(45−20) = 18.25"*, *"A grain has a Rouse number P = 4.0"*;
- a date read as a number — *"pinned to 26 January 1700"*;
- a string mismatch — the stem says `+95 mGal`, the prose says `95 mGal`.

No content change made. The heuristic is doing its job; the signal-to-noise on
computation-heavy fields is just low.

## Gates

All six pass: `shared-types build` · `codex:build --check` (15 tracks) · `typecheck` ·
`lint` (0 warnings) · `content-shape.test.ts` (25) · `generated-content.test.ts` (48).

Registries (`index.ts`, both test module maps, wrappers, `.checksums.json`) were
regenerated by `codex:merge`, never hand-edited. 275 consumed drafts deleted.

**Pre-existing, unrelated:** `typecheck` first failed on
`app/api/project-log/route.ts` → `@/lib/logs/project-log-service`. That file is 257 lines
of real source that has **never been committed** — `.gitignore:2` has a bare `logs`
pattern which swallows `apps/web/lib/logs/`. Latent since v0.31.0 (350fe82) added the
importing route; any fresh clone or worktree fails typecheck. Not fixed here (out of
scope, and the file is the owner's untracked working copy) — flagged for a separate fix.
