# Ecology — fact-check log

Run: wf_da47a86f-1f3 · 2026-07-20 · 278 agents · 16.48M tokens · 76 min

43 lanes, all clean (allClean: true), 0 open HIGH findings.

## Rounds per unit

- 1 round(s): 16 unit(s)
- 2 round(s): 19 unit(s)
- 3 round(s): 8 unit(s)

## Per-lane

- core / ecol-core-foundations — 3 round(s), clean
- core / ecol-core-sampling — 1 round(s), clean
- core / ecol-core-estimation — 2 round(s), clean
- core / ecol-core-diversity — 3 round(s), clean
- core / ecol-core-populations — 3 round(s), clean
- core / ecol-core-interactions — 2 round(s), clean
- core / ecol-core-landmarks — 2 round(s), clean
- core / ecol-core-evidence — 2 round(s), clean
- population-ecology / ecol-popecol-foundations — 2 round(s), clean
- population-ecology / ecol-popecol-life-tables — 1 round(s), clean
- population-ecology / ecol-popecol-field-estimation — 1 round(s), clean
- population-ecology / ecol-popecol-time-series — 2 round(s), clean
- population-ecology / ecol-popecol-landmarks — 2 round(s), clean
- population-ecology / ecol-popecol-matrix-models — 1 round(s), clean
- population-ecology / ecol-popecol-applications — 1 round(s), clean
- community-ecology / ecol-commecol-foundations — 2 round(s), clean
- community-ecology / ecol-commecol-methods — 2 round(s), clean
- community-ecology / ecol-commecol-reading-data — 2 round(s), clean
- community-ecology / ecol-commecol-landmarks — 2 round(s), clean
- community-ecology / ecol-commecol-coexistence — 2 round(s), clean
- community-ecology / ecol-commecol-succession — 2 round(s), clean
- community-ecology / ecol-commecol-practice — 1 round(s), clean
- behavioral-ecology / ecol-behecol-foundations — 3 round(s), clean
- behavioral-ecology / ecol-behecol-foraging-risk — 3 round(s), clean
- behavioral-ecology / ecol-behecol-field-methods — 1 round(s), clean
- behavioral-ecology / ecol-behecol-analysis — 1 round(s), clean
- behavioral-ecology / ecol-behecol-landmarks — 3 round(s), clean
- behavioral-ecology / ecol-behecol-social-sexual — 2 round(s), clean
- behavioral-ecology / ecol-behecol-applied — 3 round(s), clean
- conservation-restoration-ecology / ecol-consrest-foundations — 1 round(s), clean
- conservation-restoration-ecology / ecol-consrest-fragmentation — 1 round(s), clean
- conservation-restoration-ecology / ecol-consrest-monitoring — 1 round(s), clean
- conservation-restoration-ecology / ecol-consrest-evidence — 2 round(s), clean
- conservation-restoration-ecology / ecol-consrest-landmarks — 2 round(s), clean
- conservation-restoration-ecology / ecol-consrest-reserve-design — 1 round(s), clean
- conservation-restoration-ecology / ecol-consrest-restoration — 2 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-city-as-ecosystem — 2 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-measuring-the-urban-environment — 1 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-reading-urban-data — 3 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-landmarks-and-debates — 1 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-sensory-and-physiological — 1 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-movement-and-assemblages — 2 round(s), clean
- urban-human-impact-ecology / ecol-urbeco-applications-and-projects — 1 round(s), clean

## Incidents

- One audit-lens agent (audit:core/interactions#1) died on an API usage-policy error in round 1. The lane ran a second round and closed with zero open HIGH; the surviving lens plus the round-2 check covered it.
- 11 agents returned empty results (fixers with no findings to apply).
- Late fixers reported the session WebSearch budget exhausted; those corrections were resolved by hedging unverifiable figures rather than by citation lookup.

---

## Post-ship audit — 2026-07-20 (run wf_0ce7f12e-300)

Ran AFTER the field shipped and passed every authoring gate, because a 40-lesson
hand sample found defects the pipeline had missed.

**Coverage:** 186 of 275 lessons checked (68%) — 40 by hand sample, 146 by the
density>=5 sweep. The 89 lessons at claim-density <5 were NOT audited.

**Found and repaired: 22 defects in 22 lessons.**

| Pass | Lessons | HIGH | MED | Rate |
|---|---|---|---|---|
| Hand sample | 40 | 5 | 3 | 20% |
| Density>=5 sweep | 146 | 6 | 8 | 9.5% |
| Combined | 186 | 11 | 11 | 11.8% |

The two rates disagree, and the sweep is the less sensitive of the two: its mid
tier gave each lesson ~0.43 WebSearches against the hand sample's ~1.1, and 7
lessons per agent against 5. Treat 9.5% as a floor, not an estimate.

### Where the errors were

- **Landmark/history/debate units: 15.6% defect rate vs 7.9% elsewhere** (2x).
  The one location signal that held up.
- **Continuous claim density did NOT predict within the swept range**
  (density>=9: 7.5%, density 5-8: 8.6%) — but the comparison is confounded, since
  high-density lessons got 3x the per-lesson search budget. No clean evidence.

### What the errors were — one dominant family

Of 22 defects, 9 are ENTITY-BINDING errors: a true fact attached to the wrong
thing. All sub-types below shipped to students.

- **Confabulated given name on a real citation (3):** "A.J. Zippin" (Calvin),
  "Michael Connor" (Edward F.), "Ardie Peet" (Margriet). Surname and year were
  correct every time; only the given name was invented.
- **Wrong work by the right author (1):** a retraction over fabricated data was
  pinned to Moller's barn-swallow research; the actual paper was the 1998 Oikos
  oak-leaf study.
- **Wrong side of a dispute, or wrong role (4):** Soule listed among his
  opponents' defenders; Allendorf credited as an original 50/500 framer; Chapman
  and Odum's roles swapped; Axelrod's tournaments attributed jointly to Hamilton.
- **Two different quantities framed as one (1):** share-of-land vs
  share-of-biodiversity presented as rigorous-vs-loose versions of one statistic.

Remaining 13: 6 plain factual errors (including the SE-bar overlap rule stated
backwards — a real science error, not a citation slip), 4 arithmetic, 3 internal
inconsistencies.

### Harness changes made in response

1. Fixer propagates each correction across the whole lesson; effort low -> medium.
2. Checker gained an explicit entity-binding section: right work / right side /
   same quantity / invented given name / derivable premise.
3. Author told to cite surname+year and never invent a first name or initial.
4. Search budget tiered on a new `claimHeavy` brief flag — 8 for claim-heavy
   units, 3 otherwise (was a flat 4).
5. `codex:merge` gained two free deterministic warnings: orphan numeric premise,
   and orphan citation in an answer key.

### Known gap

89 low-density lessons unaudited. Claim density is provably blind to at least one
HIGH class: the Moller defect contains no year or percentage in the offending
phrase, and its lesson scored a middling 5.
