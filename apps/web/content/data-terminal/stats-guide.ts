/**
 * Data Terminal "Stats Guide" — a static, authored reference library of ~25
 * statistics concepts a science-fair student needs when analyzing their data.
 *
 * Content philosophy: SHOW THE PROCESS, not library invocations — and now,
 * show the CONCEPTUAL layer above the code too, not just the arithmetic.
 * Each entry teaches the same idea three times, at increasing levels of
 * detail: (1) `definition`/`whenToUse` explain WHAT the stat means and WHY
 * the calculation is shaped the way it is, in prose; (2) `formula` +
 * `formulaBreakdown` show the actual mathematical expression in clean
 * Unicode math and decode every symbol in it; (3) `code` computes the SAME
 * formula step by step from `datasetCsv`'s values — building sums,
 * deviations, sorted ranks, or confusion-matrix counts by hand and PRINTING
 * every intermediate value — and only reaches for a library call (i) as a
 * one-line cross-check at the end, or (ii) for the one genuinely
 * non-hand-computable step (e.g. an exact tail probability under a
 * distribution), which is called out explicitly in a comment. The dataset a
 * snippet uses is always shown twice: once as its own labeled CSV text
 * (`datasetCsv`) and once loaded/parsed inside `code` via `csv.DictReader`,
 * so a reader can see the two visibly correspond.
 *
 * `formula` must always describe exactly what `code` computes — if a
 * snippet applies a real-world wrinkle (e.g. chi-square's Yates' continuity
 * correction, or AUC's pair-counting definition rather than the textbook
 * "area under a curve" framing), the breakdown says so explicitly rather
 * than silently showing a formula the code doesn't actually use.
 *
 * Source of truth for this module: the author ran every snippet against its
 * own inline CSV and precomputed `output` (INCLUDING every intermediate
 * print, not just the final number) by hand — it is NOT generated at request
 * time, there is no LLM call and no Python execution in the app. Mirrors the
 * `ISEF_RUBRIC` pattern (`lib/fairs/isef-rubric.ts`): a typed constant module
 * rendered client-side, nothing fetched, nothing persisted.
 *
 * If a concept's dataset or wording ever needs to change, re-run the snippet
 * and update `output` (and `datasetCsv`) to match exactly — the three must
 * never drift apart. `code` and `output` are the empirically verified layer
 * and must never be edited casually; `formula`/`formulaBreakdown`/prose are
 * free to be refined without touching them.
 */

import { filterGuideEntries } from '@/lib/guides/filter'
import STATS_GUIDE_DATA from './stats-guide.json'

export type StatCategory =
  | 'descriptive'
  | 'comparing-groups'
  | 'relationships'
  | 'classification-metrics'
  | 'multiple-testing'
  | 'nonparametric-tests'
  | 'regression-diagnostics'
  | 'epidemiology'
  | 'bayesian'
  | 'agreement'

export const STAT_CATEGORIES: { key: StatCategory; label: string }[] = [
  { key: 'descriptive', label: 'Descriptive' },
  { key: 'comparing-groups', label: 'Comparing groups' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'classification-metrics', label: 'Classification metrics' },
  { key: 'multiple-testing', label: 'Multiple testing' },
  { key: 'nonparametric-tests', label: 'Nonparametric tests' },
  { key: 'regression-diagnostics', label: 'Regression diagnostics' },
  { key: 'epidemiology', label: 'Epidemiology' },
  { key: 'bayesian', label: 'Bayesian' },
  { key: 'agreement', label: 'Agreement' },
]

/** One symbol/term from a `formula` decoded into a plain-language meaning. */
export interface FormulaTerm {
  term: string
  meaning: string
}

export interface StatConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "p-value"). */
  id: string
  /** Human title shown in the box header (e.g. "P-value (statistical significance)"). */
  title: string
  category: StatCategory
  /** Extra search terms, optional. */
  aliases?: string[]
  /** PART 1a — 2-4 sentences: what the stat tells you, the intuition for HOW the calculation produces that meaning, and when it's the right tool. Textbook-sidebar depth, not a tooltip. */
  definition: string
  /** PART 1b — when a science-fair student reaches for it. */
  whenToUse: string
  /** PART 2a — the actual mathematical formula in clean Unicode math (Σ √ x̄ β χ² etc., no LaTeX), matching exactly what `code` computes. */
  formula: string
  /** PART 2b — every symbol/term in `formula` decoded in plain language, teaching WHY the formula is shaped the way it is (not just naming parts). */
  formulaBreakdown: FormulaTerm[]
  /** PART 3 — the sample dataset as real CSV text (header row + values), rendered as its own "THE DATA" block and loaded by `code`. */
  datasetCsv: string
  /** PART 4 — self-contained runnable Python: loads `datasetCsv`'s values, computes the concept step by step (printing intermediates), then a one-line library cross-check. EMPIRICALLY VERIFIED — do not edit without re-running and re-diffing against `output`. */
  code: string
  /** PART 5 — one prose line describing the inline sample dataset. */
  datasetNote: string
  /** PART 6 — the exact printed result for that dataset, INCLUDING every intermediate print, author-precomputed static text. EMPIRICALLY VERIFIED — must stay byte-for-byte what `code` prints. */
  output: string
  /** One gotcha / interpretation note. */
  caveat: string
}

// Authored data lives in stats-guide.json (DAT-1): ~thousands of lines of
// literals moved out of tsc's parse path and out of eager client bundles. The
// existing *-guide tests still validate the shape through this wrapper.
export const STATS_GUIDE = STATS_GUIDE_DATA as unknown as StatConcept[]

// ─── Filtering helper ─────────────────────────────────────────────────────

export interface StatFilter {
  query?: string
  category?: StatCategory | null
}

/**
 * Filters `STATS_GUIDE` (or any subset) by a case-insensitive substring match
 * on title/definition/aliases, AND-ed with an optional category. A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free —
 * unit-testable and reusable by the panel component via `useMemo`. Thin
 * wrapper over `filterGuideEntries`, kept so this module's signature and
 * search fields stay pinned.
 */
export function filterConcepts(concepts: StatConcept[], filter: StatFilter): StatConcept[] {
  return filterGuideEntries(
    concepts,
    filter,
    (c) => [c.title, c.definition, ...(c.aliases ?? [])],
    (c) => c.category,
  )
}
