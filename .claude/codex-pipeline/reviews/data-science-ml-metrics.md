# Fact-check log — data-science-ml-metrics (whole field)

Second whole-field run. First live exercise of **scoped re-checks**, the
**WebSearch budget**, and the **400–500 word band**.

**Result: `allClean: true` — 43/43 units, 275/275 lessons, zero open HIGH findings.**
All six segments: Core 8u/50L; classification-eval, regression-forecasting-eval,
unsupervised-clustering-eval, model-interpretability, fairness-robustness 7u/45L each.

245 agents · **14.78M tokens** · ~91 min. Gates: all six ✓, 90 tests.

## Did the cost fixes work? YES — the checker halved

| per agent | csalgo | dsml | |
|---|---:|---:|---|
| checker turns | 30.4 | **18.4** | −39% |
| checker WebSearch | 8.1 | **2.8** | −65% |
| checker Reads | 6.7 | **4.9** | −27% |
| checker cost | 2.08M | **1.03M** | **−50%** |
| checkers spawned | 89 | **70** | −21% |
| **check phase** | **185M (53%)** | **72M (24%)** | **−61%** |

Rounds per lane also improved sharply: **21 clean in 1 round / 17 in 2 / 5 in 3**
(csalgo: 13/14/16). Mean 1.63 rounds vs 2.07. Opus escalations fell 16 → **5**.

## But the word-band instruction ate most of the gain

| per agent | csalgo | dsml | |
|---|---:|---:|---|
| author turns | 22.3 | **55.7** | **+150%** |
| author Bash calls | 4.7 | **12.7** | **+170%** |
| author Edit calls | 0.4 | **8.7** | **+2000%** |
| author cost | ~1.97M | **4.16M** | **+111%** |
| **author phase** | **92M (26%)** | **183M (60%)** | |

Cause: the rule **"Count the words of your section prose before you write each
file."** Authors turned it into a write → `Bash` wordcount → `Edit` trim → recount
loop, per lesson. The check fix alone would have landed the field near **~10M**;
the counting mandate added back ~5M.

**The band itself is worth keeping — the counting mandate is not.** Move
enforcement to the checker's existing out-of-band MED + the fixer (9% of spend)
instead of the author (60%).

## The band landed, and depth IMPROVED

| | prose~ | min | max | in 400–500 | yr/lesson | names/lesson | <300w |
|---|---:|---:|---:|---:|---:|---:|---:|
| csalgo | 542 | 369 | 879 | — | 3.0 | 14.4 | 0 |
| **dsml** | **425** | **384** | **523** | **97%** | 2.8 | **16.1** | **0** |

97% of lessons inside 400–500; only 6 under, 3 over. Crucially the depth proxies
did **not** regress — **16.1 named entities per lesson is the highest in the
library** (csalgo 14.4, astronomy 14.0), dated claims essentially flat at 2.8 vs
3.0. Tighter prose, denser content. Zero broken answer keys.

**Open question for the next run:** escalations fell 16 → 5 and rounds improved a
lot. Some is real (dsml converged better), but part could be the search budget
finding fewer verifiable errors. Density says the content is comparably claim-rich,
so a weaker gate can't be ruled out from metrics alone — watch escalation rate on
the next field.

## Bugs / notes

- **One author died** (`clust/distance`, `API Error: Server error mid-response`) —
  1 of 245 agents, ordinary flakiness, not the old 65KB-write failure (4/21). **The
  retry fired and recovered the unit**; the lane shipped clean with all 6 lessons.
  The retry was simply queued behind the concurrency cap, which is why it looked
  dead for ~11 minutes. It works as designed.
- The `slugify` truncate-then-trim fix held: merged first try, no id rejects.

## Sampled reads (independent, orchestrator)

`fairness-robustness` landmark unit — the field's highest-risk content. Unit is
structured **"COMPAS: ProPublica's Case"** then **"COMPAS: Northpointe's Rebuttal
and the Verdict"**, plus *"More Landmark Failures — and One Exoneration"*: it
teaches the controversy rather than picking a side. Every figure verified: ProPublica
published 2016-05-23 (Angwin, Larson, Mattu, Kirchner); Northpointe → equivant;
~7,000 Broward County defendants 2013–14; FPR **44.9% Black vs 23.5% white**; FNR
**47.7% white vs 28.0% Black**; ~61–65% accuracy parity. Raji & Buolamwini
"Actionable Auditing" (AAAI/AIES 2019), Microsoft darker-female error 20.8% → 1.52%.
All correct.

STATUS: **8/29 fields · 48/174 segments.** Next no-arg run auto-picks **ecology**.
