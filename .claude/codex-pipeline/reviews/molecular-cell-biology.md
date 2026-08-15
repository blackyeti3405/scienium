# molecular-cell-biology — fact-check log

Run `wf_1cb9e15b-836` · 269 agents · 18.20M tokens · 87 min · 0 agent errors.

**Shipped:** Core (8 units / 50 lessons) + 5 branches (7 units / 45 lessons each) = **43 units / 275 lessons**.

## Fact-check rounds

Every one of the 43 lanes exited **clean** (zero open HIGH findings at merge).
Rounds to clean: 14 lanes in 1 · 21 in 2 · 8 in 3.
No Opus escalations were required.

| Segment | Lanes | Rounds per unit | Lanes needing >1 round |
| --- | --- | --- | --- |
| core | 8 | 2, 1, 2, 3, 2, 2, 1, 3 | 6 |
| transcriptional-epigenetic-regulation | 7 | 2, 2, 2, 3, 2, 3, 3 | 7 |
| cell-signaling-metabolism | 7 | 1, 2, 1, 2, 2, 2, 2 | 5 |
| molecular-cloning-techniques | 7 | 1, 2, 2, 2, 2, 1, 1 | 4 |
| cell-culture-microscopy | 7 | 1, 1, 2, 3, 1, 2, 3 | 4 |
| molecular-toxicology-stress | 7 | 1, 2, 1, 2, 1, 1, 3 | 3 |

## Cross-lesson contradictions (consistency phase)

One survived reconciliation and was resolved by the orchestrator before merge:

1. **HEK293 origin date.** `core-cell-system/06` dated Frank Graham's adenovirus-5
   transformation of human embryonic kidney cells to 1973 (twice, unambiguously as
   the creation date), while `culture-fundamentals/05` attached the transformation
   to "described in 1977" with no mention of 1973. Both years are real and
   distinguishable — the transformation was done in 1973, the characterization
   published by Graham et al. in 1977 (J. Gen. Virol.) — but as written the two
   lessons answered "when was HEK293 created" differently. Corrected
   `culture-fundamentals/05` to "transformed ... in 1973 ... and first described in
   the literature in 1977".

## Merge advisories (non-blocking, reviewed — both benign)

- `genereg-transcription-initiation` q2: flagged as citing "Sigler-lab and
  Burley-lab 1993" without teaching the source. **False positive** — the lesson body
  does introduce it ("the 1993 crystal structure from the Sigler and Burley labs
  showed TBP inducing a severe, continuous bend of about 80 degrees"); the matcher
  searched for the hyphenated spelling used in the answer key. Fact and key are
  correct (Kim et al., Nature 1993; ~80 degree bend toward the major groove).
- `signal-reading-data-dose-response-curves` q1: cites "50" — a self-contained
  scenario value (EC50 falling from 50 nM to 5 nM at constant Emax).

## Note on labels (for future resumes)

The workflow's returned track/segment labels contain a literal ampersand
("Molecular & Cell Biology"). The task-notification rendering HTML-escapes those to
the entity form; the plan written to disk and merged was verified to carry the
unescaped character. This is also why a resume must re-send the ORIGINAL args
rather than the recovery snippet: the escaped labels would change every agent
prompt and miss the entire cache, re-running the field at full cost.

## Gates

shared-types build · `codex:build --check` (19 tracks) · typecheck · lint ·
content-shape (25 tests) · generated-content (60 tests) — all pass.
