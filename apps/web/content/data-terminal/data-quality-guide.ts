/**
 * Data Terminal "Data Quality" guide — a static, authored reference library
 * of 36 concepts covering everything AFTER data is collected: measurement
 * uncertainty & error propagation, significant figures & unit discipline,
 * data cleaning (missing values, deduplication, censored readings), and
 * methodology pitfalls (outlier-removal ethics, pseudoreplication,
 * correlation-vs-causation, HARKing, and related traps).
 *
 * Content philosophy mirrors the Stats Guide (`stats-guide.ts`): SHOW THE
 * PROCESS, not library invocations. Each entry teaches the same idea at
 * increasing levels of detail: (1) `definition`/`whenToUse` explain WHAT the
 * concept means and WHY it matters, in prose; (2) `formula` + `formulaBreakdown`
 * show the actual expression in clean Unicode math and decode every symbol;
 * (3) `code` computes the SAME thing step by step from `datasetCsv`'s values,
 * printing every intermediate value. The dataset a snippet uses is always
 * shown twice: once as its own labeled CSV text (`datasetCsv`) and once
 * loaded/parsed inside `code` via `csv.DictReader`, so a reader can see the
 * two visibly correspond.
 *
 * This module intentionally does NOT re-derive the Stats Guide's `iqr-outliers`
 * computation (Q1/Q3, IQR, 1.5×IQR fences) — several methodology-pitfalls
 * entries here cross-reference that entry in prose while deepening the
 * POLICY/ETHICS layer on top of it (legitimate exclusion vs p-hacking,
 * pre-declared criteria). This module also does not cover experimental
 * design or sample-size/power planning — that is the Methods Guide's
 * territory (`methods-guide.ts`); any mention here is a one-line
 * cross-reference only.
 *
 * Source of truth for this module: the author ran every snippet against its
 * own inline CSV and precomputed `output` (INCLUDING every intermediate
 * print, not just the final number) by hand — it is NOT generated at request
 * time, there is no LLM call and no Python execution in the app. Mirrors the
 * `STATS_GUIDE` pattern (`lib/data-terminal/stats-guide.ts`): a typed
 * constant module rendered client-side, nothing fetched, nothing persisted.
 *
 * If a concept's dataset or wording ever needs to change, re-run the snippet
 * and update `output` (and `datasetCsv`) to match exactly — the three must
 * never drift apart. `code` and `output` are the empirically verified layer
 * and must never be edited casually; `formula`/`formulaBreakdown`/prose are
 * free to be refined without touching them.
 */

import { filterGuideEntries } from '@/lib/guides/filter'
import DATA_QUALITY_GUIDE_DATA from './data-quality-guide.json'

export type DataQualityCategory =
  | 'measurement-uncertainty'
  | 'data-cleaning'
  | 'units-sigfigs'
  | 'methodology-pitfalls'

export const DQ_CATEGORIES: { key: DataQualityCategory; label: string }[] = [
  { key: 'measurement-uncertainty', label: 'Measurement & uncertainty' },
  { key: 'data-cleaning', label: 'Data cleaning' },
  { key: 'units-sigfigs', label: 'Units & sig figs' },
  { key: 'methodology-pitfalls', label: 'Methodology pitfalls' },
]

/** One symbol/term from a `formula` decoded into a plain-language meaning. */
export interface FormulaTerm {
  term: string
  meaning: string
}

export interface DataQualityConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "absolute-relative-uncertainty"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  category: DataQualityCategory
  /** Extra search terms, optional. */
  aliases?: string[]
  /** PART 1a — 2+ sentences: what the concept means, the intuition behind it, and when it applies. */
  definition: string
  /** PART 1b — when a science-fair student reaches for it. */
  whenToUse: string
  /** PART 2a — the actual expression in clean Unicode math, matching exactly what `code` computes. */
  formula: string
  /** PART 2b — every symbol/term in `formula` decoded in plain language. */
  formulaBreakdown: FormulaTerm[]
  /** PART 3 — the sample dataset as real CSV text (header row + values), rendered as its own "THE DATA" block and loaded by `code`. */
  datasetCsv: string
  /** PART 4 — self-contained runnable Python: loads `datasetCsv`'s values, computes the concept step by step (printing intermediates). EMPIRICALLY VERIFIED — do not edit without re-running and re-diffing against `output`. */
  code: string
  /** PART 5 — one prose line describing the inline sample dataset. */
  datasetNote: string
  /** PART 6 — the exact printed result for that dataset, INCLUDING every intermediate print, author-precomputed static text. EMPIRICALLY VERIFIED — must stay byte-for-byte what `code` prints. */
  output: string
  /** One gotcha / interpretation note. */
  caveat: string
}

// Authored data lives in data-quality-guide.json (DAT-1): ~thousands of lines of
// literals moved out of tsc's parse path and out of eager client bundles. The
// existing *-guide tests still validate the shape through this wrapper.
export const DATA_QUALITY_GUIDE = DATA_QUALITY_GUIDE_DATA as unknown as DataQualityConcept[]

// ─── Filtering helper ─────────────────────────────────────────────────────

export interface DataQualityFilter {
  query?: string
  category?: DataQualityCategory | null
}

/**
 * Filters `DATA_QUALITY_GUIDE` (or any subset) by a case-insensitive
 * substring match on title/definition/aliases, AND-ed with an optional
 * category. A blank or whitespace-only query behaves like "no query." Pure
 * and side-effect free — unit-testable and reusable by the panel component
 * via `useMemo`. Thin wrapper over `filterGuideEntries`, kept so this
 * module's signature and search fields stay pinned.
 */
export function filterDataQualityConcepts(
  concepts: DataQualityConcept[],
  filter: DataQualityFilter,
): DataQualityConcept[] {
  return filterGuideEntries(
    concepts,
    filter,
    (c) => [c.title, c.definition, ...(c.aliases ?? [])],
    (c) => c.category,
  )
}
