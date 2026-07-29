# Fact-check log — `fluid-dynamics-aerodynamics`

Run: `wf_bdd447ba-43f` (2026-07-28) · whole field in one invocation.

## Outcome

**`allClean: true`** — 43/43 lanes clean, **0 open HIGH findings**, 0 failed
segments, 0 surviving cross-lesson contradictions.

| Segment | Units | Lessons |
|---|---|---|
| Core | 8 | 50 |
| `external-aero-lift-drag` | 7 | 45 |
| `internal-pipe-duct-flow` | 7 | 45 |
| `boundary-layers-transition-separation` | 7 | 45 |
| `unsteady-vortex-wake-flows` | 7 | 45 |
| `hydrodynamics-open-channel-free-surface` | 7 | 45 |
| **Total** | **43** | **275** |

Depth target was Core 45–55 / branch 40–50 → hit at the top of Core's band and
mid-band on every branch. 275 lessons vs. the ~270 whole-field target.

## Fact-check rounds

76 rounds across 43 lanes, mean **1.77**.

| Rounds | Lanes |
|---|---|
| 1 (clean on first check) | 16 |
| 2 | 21 |
| 3 (round cap) | 6 |

The six lanes that ran to the cap: `fluids-core-fluids-and-forces`,
`fluids-extaero-tunnel-methods`, `fluids-extaero-curves-polars-stall`,
`fluids-vortex-landmarks-debates`, `fluids-hydro-hydrostatics-buoyancy`,
`fluids-hydro-froude-critical-flow`. All resolved — none exited with an open
HIGH, so **no Opus escalation re-author was triggered anywhere in this field**.

Consistent with the workflow header's claim that escalation rate tracks claim
density: the lanes that needed extra rounds are exactly the history/landmark and
numeric-classification units (USBR jump bands, VIV response branches, tunnel
correction factors), not the conceptual ones.

## Merge advisories (4, non-blocking — all verified false positives)

`codex:merge` flags a checkpoint stem citing a number that appears in no section
or `workedExample`. All four were inspected by hand and are self-contained:

1. `fluids-extaero-tunnel-methods-corrections-and-an-honest-error-budget` q3 —
   "1.0" is part of the arithmetic supplied in the stem (Re = 1.0×10⁵ × TF 1.5).
2. `fluids-bltrans-measuring-boundary-layers-…` q1 — "1948" is context in the
   stem; the question asks *why* a low-turbulence tunnel was needed, not the date.
3. `fluids-vortex-landmarks-debates-feng-williamson-and-the-viv-data-wars` q2 —
   "99" is from the date range "1996-99", not a quantity under test.
4. `fluids-hydro-froude-critical-flow-the-hydraulic-jump` q3 — Fr₁ = 3.0 → the
   oscillating band; every USBR band is given in the option explanations.

No content was changed for these.

## Cost

265 agents · 14.1M subagent tokens · 2,527 tool calls · 98 min wall-clock —
inside the documented ~10–15M / ~250-agent budget for a whole field.
