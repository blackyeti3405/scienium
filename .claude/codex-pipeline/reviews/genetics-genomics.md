# Fact-check log — `genetics-genomics`

Run: `wf_b4fb83ab-043` (2026-07-29) · whole field in one invocation.

## Outcome

**`allClean: false`** — 42/43 lanes clean on their own, 1 lane resolved by hand
(below). 0 failed segments, 0 surviving cross-lesson contradictions.

| Segment | Units | Lessons |
|---|---|---|
| Core | 8 | 50 |
| `bioinformatics-sequence-analysis` | 7 | 45 |
| `genome-editing-genetic-engineering` | 7 | 45 |
| `human-medical-genetics` | 7 | 45 |
| `population-evolutionary-genomics` | 7 | 45 |
| `transcriptomics-gene-expression` | 7 | 45 |
| **Total** | **43** | **275** |

Depth target was Core 45–55 / branch 40–50 → Core at the top of its band, every
branch mid-band. 275 lessons vs. the ~270 whole-field target.

## Fact-check rounds

72 rounds across 43 lanes, mean **1.67**. Distribution: 20 lanes cleared in one
round, 17 took two, 6 took three. **Zero Opus escalations** — consistent with the
observed rule that escalation tracks claim density, and with the fixer's
propagate-don't-patch behaviour holding.

Cost: **251 agents · 13.4M tokens · 98 min**, inside the ~10–15M / ~250-agent
budget. The 251 agents exhausted the session's 200-call WebSearch budget, which
matters for the one contested finding below.

## The one lane that did not self-clear

`gen-edit-landmarks-debates` (Genome Editing) ran to the 3-round cap with 2 open
HIGH findings, both against
`03-the-patent-war-and-the-nobel.json`. It was correctly excluded from the
returned plan. Both were adjudicated by hand before merging:

**F1 — CRISPR patent appeal date. REJECTED as a false positive.**
The checker claimed the Federal Circuit's decision vacating the PTAB's 2022
priority award issued 6 August 2024, not the draft's 12 May 2025, and asked for
the date to be changed in four places. Its own finding text conceded it *could
not verify*: the session's WebSearch budget was already exhausted, so it was
working from recollection. Checked against CourtListener: the Federal Circuit
opinion in the Broad/UC CRISPR appeal issued **12 May 2025**. The draft was
right; no edit made. (The docket number `2022-1594` in the correction text was
the checker's own addition — the lesson never cites a docket.)

*Process note:* a checker with no search budget left will still emit HIGH
findings from memory. Findings that self-describe as unverified need
adjudication, not application — applying this one would have injected a wrong
date into four locations in an otherwise-correct lesson.

**F2 — unsupported figure in a checkpoint stem. ACCEPTED and fixed.**
Checkpoint q4 asserted Broad "had granted patents two years earlier". The lesson
establishes Broad's US 8,697,359 grant (April 2014) "while UC's application was
still in ordinary examination" but never gives a UC grant date, so the gap was
underivable from the lesson — and wrong in fact (UC's CRISPR patents began
issuing around 2018, a ~4-year gap). Rewrote the stem to rely only on what the
lesson establishes: "was first to receive a granted patent". Also softened
"settled by an interference proceeding" → "fought through", which removed a
contradiction with the lesson's own conclusion that priority is *unsettled*.

With F2 fixed and F1 rejected, the unit was restored to the plan at index 5 of
the Genome Editing branch (before the closing applications unit, matching Core's
placement), bringing the branch to its full 7 units / 45 lessons.

## Merge advisories

`codex:merge` raised 6 non-blocking advisories, all of the form "checkpoint stem
cites a number no section states" — the same detector class that caught F2. All
six inspected, all false positives: they are *hypothetical scenario* values
(a NanoDrop A260/A280 of 1.65, Cq 20 vs 21, genotyping batches from 2015/2019),
which are question inputs rather than claims. The one advisory carrying real
dates — CFTR mapped to chromosome 7 in 1985, cloned 1989, Trikafta 2019 at ~90%
of patients — was verified correct, including both the 4-year and 30-year gaps.

## Gates

All six green: shared-types build · `codex:build --check` (14 tracks) ·
typecheck · lint · content-shape (25 tests) · generated-content (45 tests).
