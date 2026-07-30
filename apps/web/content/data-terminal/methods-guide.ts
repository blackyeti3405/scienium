/**
 * Data Terminal "Methods Guide" (Feature F3) — a static, authored reference
 * library of ~40 experimental-design concepts (hypothesis framing, IV/DV/
 * controlled-variable identification, control-group design, blinding and
 * randomization, replication and sample-size planning, confounds, and
 * instrument choice) that apply across science-fair fields. This is a typed
 * constant rendered client-side — nothing fetched, nothing persisted, no
 * LLM call, no Python execution — authored + reviewed off-pipeline. Only
 * ~40 entries, so like `stats-guide.ts` (65) and `plot-guide.ts` (45) this
 * stays one eager module; lazy per-field splitting (as in `charts-guide.ts`,
 * 250 entries) is unwarranted here.
 *
 * F3/F4 boundary: this guide covers experimental DESIGN — everything decided
 * BEFORE data exists. Post-collection data handling (significant figures,
 * measurement-uncertainty propagation, unit conversion, data cleaning,
 * outlier-removal policy, missing-data strategy) lives in F4's Data Quality
 * Guide — cross-reference only, do not duplicate that content here.
 */

import { filterGuideEntries } from '@/lib/guides/filter'
import METHODS_DATA from './methods-guide.json'

export type MethodCategory =
  | 'Hypothesis & Variables'
  | 'Controls'
  | 'Bias Control'
  | 'Replication & Sampling'
  | 'Confounds & Validity'
  | 'Instruments & Measurement'

/** Distinct method categories, sorted alphabetically — drives the category dropdown. */
export const METHOD_CATEGORIES: string[] = [
  'Bias Control',
  'Confounds & Validity',
  'Controls',
  'Hypothesis & Variables',
  'Instruments & Measurement',
  'Replication & Sampling',
]

export interface MethodConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "testable-hypothesis"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  /** One of METHOD_CATEGORIES. */
  category: string
  /** Plain-language what-it-is. */
  definition: string
  /** When a student reaches for this in their own design. */
  whenToUse: string
  /** A concrete, field-anchored worked design example. */
  workedExample: string
  /** Structured labeled-list detail (IV/DV/control tables, sample-size reasoning, etc). */
  designTable: { label: string; value: string }[]
  /** The "what would confound this / common mistake" callout. */
  pitfall: string
  /** Optional Charts Guide field slug for a "see also" cross-link (text hint only, no live nav). */
  fieldRef?: string
}

// Authored data lives in methods-guide.json (DAT-1): ~thousands of lines of
// literals moved out of tsc's parse path and out of eager client bundles. The
// existing *-guide tests still validate the shape through this wrapper.
export const METHODS = METHODS_DATA as unknown as MethodConcept[]

// ─── Filtering helper ─────────────────────────────────────────────────────

/**
 * Filters `METHODS` (or any subset) by a case-insensitive substring match on
 * title/definition, AND-ed with an optional category. A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free —
 * unit-testable and reusable by the panel component via `useMemo`. Thin
 * wrapper over `filterGuideEntries`, kept so this module's positional
 * signature — and that it searches ONLY title+definition (its entries have
 * no aliases field) — stays pinned. Mirrors `filterPlots` in `plot-guide.ts`.
 */
export function filterMethods(query: string, category: string | null): MethodConcept[] {
  return filterGuideEntries(
    METHODS,
    { query, category },
    (m) => [m.title, m.definition],
    (m) => m.category,
  )
}
