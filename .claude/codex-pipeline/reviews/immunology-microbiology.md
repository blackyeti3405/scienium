# immunology-microbiology — fact-check log

Run `wf_8dc59d2e-c87` · 226 agents · 15.22M tokens · 83 min · 0 agent errors.

**Shipped:** Core (8 units / 50 lessons) + 5 branches (7 units / 45 lessons each) = **43 units / 275 lessons**.

## Fact-check rounds

Every one of the 43 lanes exited **clean** (zero open HIGH findings at merge).
Rounds to clean: 25 lanes in 1 · 11 in 2 · 7 in 3.

| Segment | Lanes | Rounds per unit | Lanes needing >1 round |
| --- | --- | --- | --- |
| core | 8 | 1, 2, 1, 3, 3, 3, 1, 1 | 4 |
| adaptive-immunity | 7 | 1, 1, 3, 2, 2, 1, 1 | 3 |
| antimicrobial-resistance | 7 | 3, 1, 2, 1, 2, 2, 1 | 4 |
| applied-antimicrobial-testing | 7 | 1, 1, 2, 1, 3, 1, 1 | 2 |
| host-pathogen-infection | 7 | 1, 3, 1, 1, 2, 1, 1 | 2 |
| microbial-ecology | 7 | 2, 2, 2, 1, 1, 1, 1 | 3 |

## Cross-lesson contradictions (consistency phase)

Two survived reconciliation and were resolved by the orchestrator before merge:

1. **NDM-1 discovery date.** `amr-mechanisms/04` called 2008 the year NDM was
   "first reported", while `amr-landmark/05` and `amr-origins-spread/05` both
   dated Yong et al.'s characterization to 2009. Both events are real and
   distinguishable — the isolate was recovered in 2008, the characterization
   published in 2009. Standardized `amr-mechanisms/04` (body + one MC
   explanation) to "characterized in 2009, from a 2008 isolate".
2. **Semmelweis Second Clinic mortality.** `appabx-landmarks/01` opened with the
   First Clinic "around 18%" and the midwife-staffed Second Clinic "near 2%";
   `core-landmarks/01` said "about 11% versus about 3% in 1846". The 18% figure
   was the 1847 spike, and it contradicted the same lesson's own later
   "11.4% in 1846". Corrected to ~11% (1846) vs ~3%, which also restores the
   "roughly four times" ratio both lessons rely on.

## Merge advisories (non-blocking, reviewed — all benign)

5 checkpoint stems cite a number the prose does not restate. All five are
self-contained scenario inputs, not prose that was hedged away:
alpha=5/gamma=15 → beta=3 (Whittaker partitioning); 80% vs 10% taxon abundance
(Bray-Curtis vs Jaccard); water activity 0.90 vs *C. botulinum*'s ~0.93 minimum;
"triclosan and 18 other ingredients" in the FDA's 2016 rule (19 total).

## Gates

shared-types build · `codex:build --check` (16 tracks) · typecheck · lint ·
content-shape (25 tests) · generated-content (51 tests) — all pass.
