# Field Codex — post-ship audit log

Audits of ALREADY-SHIPPED content, run after a hand sample of ecology found
defects that every authoring gate had passed. Per-field authoring logs live
alongside this file; this one tracks the audit programme across the library.

## Coverage to date

| Field | Lessons | Audited | Defects | HIGH | Rate |
|---|---|---|---|---|---|
| ecology | 275 | 186 (68%) | 22 | 11 | 11.8% |
| astronomy-astrophysics | 271 | 167 (62%) | 27 | 11 | 16.2% |
| data-science-ml-metrics | 275 | 210 (76%) | 20 | 12 | 9.5% |
| computer-science-algorithms | 275 | 145 (53%) | 14 | 11 | 9.7% |
| **audited total** | **1096** | **708 (65%)** | **83** | **45** | **11.7%** |
| acoustics-sound | 287 | 0 | — | — | — |
| chemistry | 258 | 0 | — | — | — |
| classical-mechanics-physics | 275 | 0 | — | — | — |
| clinical-medicine-pharmacology | 275 | 0 | — | — | — |
| gait-biomechanics | 274 | 0 | — | — | — |

All 83 repaired. Gates green after each repair pass.

## Two failed predictors — do not rebuild these

Two attempts to predict WHERE defects are from free structural features both
failed. Recording them so nobody spends the tokens again.

**1. Claim density (years + percentages + Name-year citations per lesson).**
Within ecology, defect rate by density tercile ran 7% / 29% / 25% on n=40 — no
monotonic signal, and the low-tier figure was a single defect in 14 lessons.

**2. Citation exposure (citations per lesson), across fields.** The prediction
was that entity-binding defects need citations to go wrong, so citation-rich
fields should be dirtier. Measured:

| Field | cites/lesson | defect rate |
|---|---|---|
| ecology | 1.42 | 9.6% |
| data-science-ml-metrics | 1.40 | 9.5% |
| computer-science-algorithms | 1.07 | 9.7% |
| astronomy-astrophysics | 0.95 | **16.2%** |

The least-exposed field had the highest rate. Correlation is nil or negative.

**Conclusion: defect rate is roughly uniform (~10-16%) across audited lessons
regardless of structural profile. Only auditing finds defects.** The deterministic
scanner's value is the two merge-time regression guards in `codex:merge`, not
triage — measured against ecology's known defects it scored 8% precision and 5%
recall.

The one location signal that did hold, within a field: landmark/history/debate
units ran 15.6% vs 7.9% elsewhere in ecology.

## The dominant defect family: ENTITY BINDING

Not invented facts — true facts attached to the wrong thing. Roughly 40% of all
findings. Sub-types, all shipped to students:

- **Confabulated given name on a real citation (9 and counting).** Surname and
  year correct every time, first name invented: "A.J." Zippin (Calvin), "Michael"
  Connor (Edward F.), "Ardie" Peet (Margriet), "David" Goldsmith (Donald W.),
  "Robert" Kron (Richard G.), plus a misspelled Komabayashi.
- **Wrong work by the right author.** A fabricated-data retraction pinned to
  Moller's legitimate barn-swallow research instead of the 1998 oak-leaf study.
- **Wrong side of a dispute, or wrong role.** Soule listed among his opponents'
  defenders; Allendorf credited as an original 50/500 framer; Chapman and Odum's
  roles swapped; Axelrod's tournaments attributed jointly to Hamilton.
- **Two different quantities framed as one.** Share-of-land vs share-of-
  biodiversity; a 27% vs 26% dark-matter figure inconsistent within one lesson.

Remainder: plain factual errors (~50%), arithmetic (~20%), internal
inconsistency (~20%).

## Known structural gap: CROSS-LESSON contradictions

Astronomy taught Hubble's proof that galaxies lie outside the Milky Way as 1929
in one lesson and 1923 in another. Nothing in either pipeline can see this: the
authoring workflow gives one agent one unit, and the audit workflow gives one
agent 5-7 lessons. It was caught only because the contradicting pair happened to
land in the same audit batch.

Cheap deterministic fix, not yet built: extract every Name+year pair per field
and flag a surname bound to conflicting years.

## Propagation is load-bearing — measured

The repair pass applied 60 findings but changed **98 text sites**: 15 of 59
lessons had a corrected fact living somewhere the finding did not cite. Without
the propagation instruction those 38 stale copies would have survived, leaving
lessons asserting the corrected fact in one place and the stale one in another —
invisible to both the student and the next checker.

## The loop

1. `audit-field.workflow.mjs` — batched fact-check of shipped content, tiered
   search budget, hunting entity bindings.
2. `repair-findings.workflow.mjs` — applies findings to extracted working copies,
   propagating each correction; rejects findings it judges wrong.
3. `scratchpad/mergeback.mjs` — validates every edited file (id unchanged, Lesson
   shape, answer-key coherence) and splices back. All-or-nothing.
4. `codex:build` + content-shape + generated-content + typecheck + lint.

Repair agents rejected 2 of 62 findings with reasons — auditor uncertainty is not
the same as a defect, and the repair prompt says so explicitly.
