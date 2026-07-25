# Fact-check review — environmental-earth-science

Run: `wf_d82d4395-f57` (2026-07-23). 296 agents · 18.1M tokens · ~1.68h.
Shipped: Core + 5 branches = **6 segments / 43 units / 275 lessons**. All gates green.

## Outcome
- **0 units left with an open HIGH finding** — every lane came back clean after the
  author → check → HIGH-only adversarial verify → fix loop.
- HIGH findings caught and fixed in-loop included: a GWP-20 figure bound to the wrong IPCC
  report (80 = AR6, not AR5's 84) in the greenhouse-gas lesson; a soil-texture hydrometer
  worked example whose arithmetic didn't match its own method; an EPICA "two more glacial
  cycles" that should be four; a biomagnification exponent inconsistent with its own ppb/ppm
  numbers; a lake-loading worked example contradicting its own threshold formula; a PFOA
  worked-example limit; and a climate-feedback sum. (See the run journal for the full list.)

## Cross-lesson contradiction (consistency phase) — resolved by orchestrator
One contradiction surfaced and was flagged "unresolved — needs a fact-check against the
primary paper":
- **Bragg, Prince, Harner & Atlas (1994, Nature)** Exxon Valdez biostimulation magnitude,
  cited in three lessons (`core-applications/04`, `pollute-landmarks/03`, `pollute-bio/02`).
- Ground truth in the drafts: `core-applications/04` and `pollute-landmarks/03` both stated
  "roughly two to five times... depending on shoreline nitrogen concentration"; `pollute-bio/02`
  stated the same "two to five times." The detector's problem-statement misquoted the first
  two as "~2× / double." A web fact-check could not access the primary Nature figures
  (paywalled); the nitrogen-dependent range is the defensible, sourced-in-spirit reading and
  the value two of three lessons already carried.
- **Resolution:** aligned all three to "two to five times, effect scaling with shoreline
  nitrogen." (An initial mis-aligned edit down to "~2×" in `pollute-bio/02` was reverted once
  the true majority value was confirmed.)

## Lanes of note
- One **check** agent died mid-response (`check:pollute/physchem#2`, lesson 4/6) — a checker,
  not an author, so the unit was authored and merged normally; it simply received one fewer
  scrutiny pass. No open HIGH resulted.
- 11 advisory merge warnings ("stem cites N not found in prose") were all verified as
  question stems supplying their own scenario numbers (e.g. "conductivity spikes from 200 to
  1800 µS/cm") — self-contained, no action.
