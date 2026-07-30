# Fact-check review — epidemiology-medicine

Run: `wf_8617dfaf-447` (2026-07-23/24). 264 agents · 16.4M tokens · ~1.65h · 0 agent errors.
Shipped: Core + 5 branches = **6 segments / 43 units / 275 lessons**. All gates green.

## Outcome
- 42 of 43 units came back clean on the first pass; **1 unit shipped dirty and was fixed by
  the orchestrator** before merge (below). No unit was merged with an open HIGH.
- The author → check → HIGH-only adversarial verify → fix loop caught and fixed many HIGH
  findings in-loop (see run journal).

## Orchestrator-resolved HIGH (dirty unit) — `epi-idmodel-applications`
- **Finding (F1, verified real):** in `06-vector-borne-and-elimination-modeling.json`, Ross's
  "a priori pathometry" was dated to "roughly 1908-1911." That named work is actually Ross &
  Hudson's 1916-1917 Royal Society series; 1908-1911 is Ross's earlier work (the 1908 Mauritius
  report and the 1911 appendix to *The Prevention of Malaria*). Right author + real named work,
  wrong date binding — the fabricated-binding pattern the check targets; it survived the fix pass.
- **Fix:** dropped the mis-bound term, keeping the correct ~1908-1911 dates attributed to the
  Mauritius report and 1911 appendix (Macdonald's 1957 formalization unchanged). The rest of the
  lesson (the Ross-Macdonald R0 formula, worked example, checkpoints) was correct and untouched.
- Because the workflow excludes dirty units from the returned plan, this unit was manually
  re-added to the plan (unit #7 of idmodel, "Applications and Case Studies," 6 lessons, exact
  ids read from disk) so idmodel ships complete at 7 units / 45 lessons.

## Cross-lesson contradictions (consistency phase) — both already reconciled
Two contradictions were **detected and already fixed by the reconcile agent** before the return;
verified clean in the drafts, no orchestrator action needed:
- **Whitehall I founder:** two `surveil-*` lessons had credited Michael Marmot with launching the
  1967 study; reconciled to **Donald Reid and Geoffrey Rose** (the actual designers), with Marmot
  correctly tied to the social-gradient analysis and the separate Whitehall II study (1985).
- **Whitehall I cohort size:** normalized to "roughly 17,000" across all three lessons (actual
  enrollment 17,530), removing an earlier "over 18,000" outlier.

## Advisory (non-blocking)
8 merge advisories ("stem cites N not in prose") — all verified as question stems supplying their
own scenario numbers (e.g. a Lincoln-Petersen capture-recapture calc "100 / 80 / 20", a κ of 0.98,
99% specificity). Self-contained; no action.
