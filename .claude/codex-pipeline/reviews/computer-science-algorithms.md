# Fact-check log — computer-science-algorithms (whole field)

First whole-field run on the rebuilt pipeline (`author-field.workflow.mjs` +
`codex:merge`). One invocation authored all 6 segments.

**Result: `allClean: true` — 43/43 units, 275/275 lessons, zero open HIGH findings.**

| Segment | Units | Lessons |
|---|---:|---:|
| Core | 8 | 50 |
| sorting-searching-selection | 7 | 45 |
| graph-algorithms | 7 | 45 |
| data-structures-design | 7 | 45 |
| complexity-computability | 7 | 45 |
| randomized-heuristic-algorithms | 7 | 45 |
| **total** | **43** | **275** |

## Fact-check

Rounds per lane: **13 units clean in 1 round · 14 in 2 · 16 in 3.**

**16 Opus escalations (37% of units)** — HIGH errors that survived a Sonnet fix
round and were re-authored by Opus: `graph/traversal`, `graph/shortest-paths`,
`graph/modeling`, `graph/landmarks`, `graph/benchmarking`, `core/paradigms`,
`core/landmark`, `cmplx/classes`, `cmplx/computability`, `cmplx/landmarks`,
`cmplx/evidence`, `ds/amortized`, `rand/metaheuristics`, `rand/toolkit`,
`sort/landmarks`, `sort/applications`. Graph and complexity were the hardest
segments — 5 and 4 escalations respectively. The escalation path is load-bearing:
without it those 16 units would have shipped with open HIGH findings.

This is direct evidence against the worry that the HIGH-only loop exit weakened
the gate. The gate fired on 30 of 43 units (any lane needing ≥2 rounds), and
every one converged.

## Cost

325 agents · **19.6M tokens** · ~97 min wall-clock (concurrency capped at 9 on an
11-core box). That is ~4× my pre-run estimate of ~4M — see the note in
[[scienium-codex-pipeline]]; the driver is that 43 lanes × 2–5 sequential agents
is ~130 agent-runs, most carrying a ~10KB draft read plus high-effort thinking.
Still cheaper per lesson than the ~6 separate runs it replaces (chemistry alone
was ~3M tokens per branch × 6), but the estimate was wrong and the wall-clock is
one long block rather than six short ones.

## Bugs this run surfaced (both fixed)

1. **Whole-unit writes drop the connection.** Authors originally wrote each
   6-lesson unit as ONE ~65KB `Write` (~17K tokens of tool input in a single
   response). **4 of 21 authors died** with `API Error: Connection closed
   mid-response`. Fixed by one `Write` per LESSON (~10KB each) with deterministic
   paths + a single retry. Second run: **0 author deaths across 43 units.**
2. **`slugify` trimmed then truncated.** Cutting a long title at 60 chars could
   land on a hyphen, leaving a trailing `-` that fails slug-safety. 3 of 275
   lesson ids hit it. `codex:merge` rejected the whole merge by name and wrote
   nothing — the validator doing exactly its job. Fixed by truncating before
   trimming; the 3 ids were normalized in place (content untouched).

## Quality vs. the shipped baseline

Structural metrics (median per lesson) against the 6 previously-shipped fields:

| | prose~ | shortest | <300w | yr/lesson | names/lesson | q/lesson |
|---|---:|---:|---:|---:|---:|---:|
| acoustics-sound (Opus authors) | 466 | 348 | 0 | 1.4 | 6.8 | 4.0 |
| astronomy-astrophysics (Opus) | 444 | 321 | 0 | 2.9 | 14.0 | 4.0 |
| gait-biomechanics (Opus) | 442 | 315 | 0 | 1.6 | 9.0 | 4.1 |
| chemistry (Sonnet authors) | 417 | 279 | 6 | 2.0 | 7.0 | 3.8 |
| clinical-medicine-pharmacology (Sonnet) | 401 | 258 | 7 | 1.2 | 4.8 | 3.9 |
| classical-mechanics-physics (Sonnet) | 391 | 238 | **16** | 0.8 | 4.1 | 3.8 |
| **computer-science-algorithms (this run)** | **542** | **369** | **0** | **3.0** | **14.4** | **4.2** |

The v0.22.0 cost refactor (2026-07-10) swapped authors all-Opus → Sonnet and cost
~11% median prose (451 → 403) and introduced **29 thin lessons where there had
been zero**. The A/B at the time sampled only 3 units and concluded "on par, not
worse" — it was underpowered to see this.

This run **reverses that regression and beats the all-Opus baseline** on every
depth proxy, with Sonnet authors. The levers that did it: Opus·xhigh briefs
(better coverage lines give authors more to write about), an explicit anti-skimp
instruction, and a checker that flags sub-350-word prose as MED.

Zero broken answer keys, zero sub-50-word judgeFramings, zero duplicate labels
across all 275 lessons.

**Mild overshoot:** median prose 542 vs the stated ~400–500 target (max 879).
`readingMinutes` is unaffected — the whole library implies ~96–112 wpm, and this
field's 112 is the most conservative of the seven.

**Sampled reads** (independent, orchestrator): `core-landmark/01` (Knuth) — every
checkable claim correct: 1962 Addison-Wesley contract at 24, 3,000 pages by 1965,
Vols 1/2/3 in 1968/69/73, Vol 4 fascicles from 2005, Bachmann 1894, Landau 1909,
the 1976 SIGACT News notation paper, and the *full* premature-optimization quote
with the 97%/3% clause. `core-landmark/06` (Live Debates) — Harvey–van der Hoeven
2019/2021, ω<2.372, Klee–Minty 1972, Khachiyan 1979, Spielman–Teng smoothed
analysis + 2008 Gödel Prize, Frigo et al. 1999, and the exact Fig. 1 max-flow
sequence from Leiserson 2020 all correct. Notably it *refutes* the common
overclaim about that paper (algorithms only *rivaled* Moore's Law — four orders
of magnitude vs just under five, so hardware marginally won) and the judgeFraming
teaches the student to hold that nuance. That is the judge-Q&A goal hit better
than any baseline field sampled.

## Gates

`shared-types build` ✓ · `codex:build --check` ✓ (7 tracks) · `typecheck` ✓ ·
`lint` ✓ · `content-shape` ✓ · `generated-content` ✓ — 87 tests.

STATUS: **7/29 fields · 42/174 segments.** Next no-arg run auto-picks
**data-science-ml-metrics → whole field.**
