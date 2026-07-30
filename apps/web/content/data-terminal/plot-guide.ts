/**
 * Data Terminal "Plot Guide" (Feature F14) — a static, authored reference
 * library of 45 general statistical-plot concepts (bar charts,
 * box plots, scatter plots, etc.) that apply across science-fair fields.
 * Assembled from generator+reviewer verified JSON content; this module is
 * itself the source of truth from here on — content is a typed constant
 * rendered client-side, nothing fetched, nothing persisted. Only 45
 * entries, so unlike `charts-guide.ts` (F13, lazy per-field) this stays one
 * eager module. Mirrors the `stats-guide.ts` pattern (Feature F12).
 *
 * Every entry's `exampleSvg` is a static, build-time authored inline SVG
 * string (matplotlib-rendered, viewBox-sized) with no <script> content — see
 * plot-guide.test.ts for the invariant that guards this before it is ever
 * rendered via dangerouslySetInnerHTML.
 */

import { filterGuideEntries } from '@/lib/guides/filter'
import PLOTS_DATA from './plot-guide.json'

export interface PlotDataNeeded {
  name: string
  unit: string
}

export interface PlotConcept {
  /** Stable, slug-safe, unique id — drives the data-testid (e.g. "bar-chart"). */
  id: string
  /** Human title shown in the box header. */
  title: string
  /** Broad plot category (e.g. "Comparison", "Distribution"). */
  category: string
  /** What the plot is and how to read it. */
  description: string
  /** When to reach for this plot type. */
  whenToUse: string
  /** What raw data you need to collect to build this plot, as structured (name, unit) pairs. */
  dataNeeded: PlotDataNeeded[]
  /** Inline SVG markup for a static example render of the plot. */
  exampleSvg: string
}

// Authored data lives in plot-guide.json (DAT-1): ~880 lines / ~750 KB of
// matplotlib-rendered SVG literals moved out of tsc's parse path. Deferral to
// panel-open is handled by DataTerminalTab's dynamic() import of the panel;
// plot-guide.test.ts still validates the shape (incl. the no-<script> SVG
// invariant) through this wrapper.
export const PLOTS = PLOTS_DATA as unknown as PlotConcept[]

/** Distinct plot categories, sorted alphabetically — drives the category dropdown. */
export const PLOT_CATEGORIES: string[] = [
  "Comparison",
  "Composition",
  "Distribution",
  "Relationship",
  "Specialized",
  "Trend"
]

// ─── Filtering helper ─────────────────────────────────────────────────────

/**
 * Filters `PLOTS` (or any subset) by a case-insensitive substring match on
 * title/description, AND-ed with an optional category. A blank or
 * whitespace-only query behaves like "no query." Pure and side-effect free —
 * unit-testable and reusable by the panel component via `useMemo`. Thin
 * wrapper over `filterGuideEntries`, kept so this module's positional
 * signature and search fields stay pinned.
 */
export function filterPlots(query: string, category: string | null): PlotConcept[] {
  return filterGuideEntries(
    PLOTS,
    { query, category },
    (p) => [p.title, p.description],
    (p) => p.category,
  )
}
