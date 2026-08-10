/**
 * Wire schemas for the dataset routes.
 *
 * These live outside the route files because a Next route module may only
 * export the framework's own names — exporting a schema from
 * `app/api/**\/route.ts` typechecks, lints, and then fails `next build` with
 * "not a valid Route export field" (the same reason `caps.ts` exists).
 *
 * Two layers, and both are needed:
 *   - zod bounds each FIELD (types, lengths, array sizes) and rejects unknown
 *     keys, so a client cannot smuggle in attributes the handler never meant to
 *     accept (OWASP API8 mass assignment);
 *   - `datasetProblem` then checks the dataset as a WHOLE — role rules, unique
 *     names, rectangular rows, byte size — which no per-field schema can see.
 */

import { z } from 'zod'
import { ANALYSIS_IDS } from './analyses'
import { EQUATION_IDS } from './equations'
import {
  datasetByteSize,
  validateDataset,
  MAX_CELL_TEXT,
  MAX_COLUMNS_PER_DATASET,
  MAX_COLUMN_NAME,
  MAX_DATASET_BYTES,
  MAX_DATASET_NAME,
  MAX_ROWS_PER_DATASET,
  MAX_UNIT,
  type ColumnSpec,
  type DataRow,
  type TableType,
} from './dataset'

/**
 * Infrastructure ceiling for a dataset body. Above `MAX_DATASET_BYTES` on
 * purpose: that one bounds the STORED payload, this one bounds the request, and
 * a body sitting between them must reach `datasetProblem` to be refused with a
 * message about the dataset rather than an opaque 413.
 */
export const MAX_DATASET_BODY_BYTES = 3 * 1024 * 1024

export const TABLE_TYPE_VALUES = [
  'xy',
  'column',
  'grouped',
  'contingency',
  'nested',
  'parts_of_whole',
  'multiple_variables',
] as const

/** Column ids are generated (`c1`, `c2`, …); the bound is a sanity ceiling. */
const columnId = z.string().min(1).max(32)

export const ColumnSpecSchema = z
  .object({
    id: columnId,
    name: z.string().trim().min(1).max(MAX_COLUMN_NAME),
    unit: z.string().trim().max(MAX_UNIT).optional(),
    type: z.enum(['number', 'text', 'date']),
    role: z.enum(['x', 'y', 'yErr', 'xErr', 'group', 'label', 'ignore']),
    subcolumnOf: columnId.optional(),
    pairedWith: columnId.optional(),
    formula: z.string().trim().max(300).optional(),
  })
  .strict()

/** `null` is a missing observation and must survive the wire as itself. */
const CellSchema = z.union([z.string().max(MAX_CELL_TEXT), z.number().finite(), z.null()])

export const ColumnsSchema = z.array(ColumnSpecSchema).max(MAX_COLUMNS_PER_DATASET)
export const RowsSchema = z
  .array(z.array(CellSchema).max(MAX_COLUMNS_PER_DATASET))
  .max(MAX_ROWS_PER_DATASET)

export const DatasetNameSchema = z.string().trim().min(1).max(MAX_DATASET_NAME)
export const TableTypeSchema = z.enum(TABLE_TYPE_VALUES)

/**
 * Sheets-mode chart specs (Phase B). Bounded and `.strict()` for the same
 * mass-assignment reason as `ColumnSpecSchema`: only our own builder writes
 * these, so an unknown key is a client that should be refused, not tolerated.
 * The whole-dataset structural checks (`datasetProblem`) do NOT look at charts —
 * a chart referencing a since-deleted column simply renders empty, which the
 * pure builder handles, so there is nothing here for a 400 to protect.
 */
const TrendlineKindSchema = z.enum([
  'linear',
  'logarithmic',
  'polynomial',
  'power',
  'exponential',
  'movingAverage',
])

const TrendlineRefSchema = z
  .object({
    yColumnId: columnId,
    kind: TrendlineKindSchema,
    order: z.number().int().min(2).max(6).optional(),
    window: z.number().int().min(2).max(MAX_ROWS_PER_DATASET).optional(),
  })
  .strict()

const ErrorBarSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z.object({ mode: z.literal('column') }).strict(),
  z.object({ mode: z.literal('percent'), value: z.number().finite() }).strict(),
  z.object({ mode: z.literal('fixed'), value: z.number().finite() }).strict(),
  z.object({ mode: z.literal('sd') }).strict(),
  z.object({ mode: z.literal('sem') }).strict(),
])

export const ChartSpecSchema = z
  .object({
    id: z.string().min(1).max(32),
    type: z.enum(['bar', 'line', 'scatter', 'area', 'pie']),
    xColumnId: columnId,
    yColumnIds: z.array(columnId).max(MAX_COLUMNS_PER_DATASET),
    title: z.string().trim().max(MAX_DATASET_NAME).optional(),
    xTitle: z.string().trim().max(MAX_COLUMN_NAME).optional(),
    yTitle: z.string().trim().max(MAX_COLUMN_NAME).optional(),
    showLegend: z.boolean(),
    showGridlines: z.boolean(),
    colors: z.array(z.string().trim().max(24)).max(MAX_COLUMNS_PER_DATASET).optional(),
    yMin: z.number().finite().optional(),
    yMax: z.number().finite().optional(),
    logScale: z.boolean().optional(),
    showDataLabels: z.boolean().optional(),
    errorBars: ErrorBarSchema.optional(),
    trendlines: z.array(TrendlineRefSchema).max(MAX_COLUMNS_PER_DATASET).optional(),
  })
  .strict()

/** At most a handful of charts per dataset — well past any real board's needs. */
export const ChartsSchema = z.array(ChartSpecSchema).max(24)

/**
 * Code-lane scripts (Phase C). Same bounded, `.strict()` shape and same
 * mass-assignment reasoning as the chart specs: only the Code-mode editor writes
 * these. `code` is the student's Python; it runs sandboxed in a Pyodide worker,
 * never on our infrastructure, so the server only bounds its SIZE — the sandbox
 * (network-blocked, wall-clock-terminated) is the real safety layer, not a
 * server-side content check. Not part of `datasetProblem` — scripts carry no
 * rows, so there is nothing structural for a 400 to protect.
 */
export const MAX_SCRIPT_CODE = 20_000
export const ScriptSpecSchema = z
  .object({
    id: z.string().min(1).max(32),
    name: z.string().trim().min(1).max(MAX_DATASET_NAME),
    code: z.string().max(MAX_SCRIPT_CODE),
  })
  .strict()
/** Same cap the "New script" button in CodeLane.tsx disables at — single source of truth. */
export const MAX_SCRIPTS = 24
export const ScriptsSchema = z.array(ScriptSpecSchema).max(MAX_SCRIPTS)
/** `{ id, name, code }` — a saved Code-lane script. */
export type CodeScriptSpec = z.infer<typeof ScriptSpecSchema>

/**
 * Lab-mode analysis specs (Phase D). We persist ONLY the INPUTS to a run —
 * which analysis, which columns, which options — never its result: a result is
 * DERIVED and re-computed in the browser against the current data, so a client
 * could otherwise smuggle fabricated stats into a saved analysis. The recompute
 * is the trust boundary; the stored spec is just a bookmark.
 *
 * Same bounded, `.strict()` shape and mass-assignment reasoning as the chart
 * and script specs, and likewise NOT part of `datasetProblem` (an analysis
 * referencing a since-deleted column simply produces an error result the Lab
 * lane shows — there is nothing structural for a 400 to protect).
 */
/**
 * SECURITY (carried from the D1 review): analysis `options` are bounded to
 * ENUMS / NUMBERS / column-ids — deliberately NOT a free-form string record.
 * A template reads these as JSON DATA and only ever compares them to literals
 * or uses them as pandas keys, so nothing here can become a code-interpolation
 * vector; `.strict()` also rejects any option key we didn't name. Mirrors
 * `AnalysisOptions` in runtime/protocol.ts — keep the two in sync.
 */
export const AnalysisOptionsSchema = z
  .object({
    mu0: z.number().finite(),
    posthoc: z.enum(['none', 'tukey', 'dunnett']),
    correction: z.enum(['tukey', 'bonferroni', 'holm-sidak', 'fdr_bh']),
    controlColumnId: columnId,
    // `bar`/`box`/`violin` = Column group figure; `pie`/`donut`/`stacked` =
    // Parts-of-whole figure (fraction-of-total). One enum, disjoint consumers.
    graph: z.enum(['bar', 'box', 'violin', 'pie', 'donut', 'stacked']),
    whiskers: z.enum(['tukey', 'minmax', 'p10_90']),
    bars: z.enum(['interleaved', 'stacked', 'separated', 'scatter', 'heatmap']),
    // ── Phase D2c (XY + Multiple-variables) ──────────────────────────────
    /** Correlation-matrix flavour. */
    method: z.enum(['pearson', 'spearman']),
    /** Smoothing family; moving-average uses `window`. */
    smoother: z.enum(['moving-average', 'lowess']),
    /** Moving-average window (points). Bounded to the row cap. */
    window: z.number().int().min(2).max(MAX_ROWS_PER_DATASET),
    /** Multiple-regression dependent variable, by column id (one of columnIds). */
    dependentColumnId: columnId,
    // ── Phase E1 (nonlinear regression + standard-curve interpolation) ────
    /** Which equation from the library to fit (nonlinear-regression + interpolate). */
    equationId: z.enum(EQUATION_IDS),
    /** A simpler equation to compare against (extra sum-of-squares F test + AICc). */
    compareModel: z.enum(EQUATION_IDS),
    /** Per-point weighting scheme. 1/SD^2 (replicate weighting) is deferred. */
    weighting: z.enum(['none', '1/Y2', '1/Y', 'poisson']),
    /** The unknown response value to read off the standard curve. */
    interpolateY: z.number().finite(),
    // Per-parameter constraints, indexed by the equation's parameter POSITION
    // (null = free / no bound). NUMBER arrays only — no free-form string ever
    // reaches Python; a user-defined free-text equation is deliberately deferred.
    fixValues: z.array(z.union([z.number().finite(), z.null()])).max(MAX_COLUMNS_PER_DATASET),
    boundsLow: z.array(z.union([z.number().finite(), z.null()])).max(MAX_COLUMNS_PER_DATASET),
    boundsHigh: z.array(z.union([z.number().finite(), z.null()])).max(MAX_COLUMNS_PER_DATASET),
    // ── Phase E2 (global fitting) ────────────────────────────────────────
    // Per-parameter state across curves, indexed by the equation's parameter
    // POSITION: 'shared' = one value for every curve, 'separate' = its own per
    // curve, 'fixed' = held at fixValues[i] (never enters the fit). A bounded
    // ENUM array — the only three states §5.1 defines — so nothing free-form
    // reaches Python; fixValues/boundsLow/boundsHigh above carry the numbers.
    paramModes: z.array(z.enum(['shared', 'separate', 'fixed'])).max(MAX_COLUMNS_PER_DATASET),
    // Which parameter (by position) to run the shared-vs-separate F test on
    // (null/absent = no test). A NUMBER index, never a name.
    fTestParam: z.number().int().min(0).max(MAX_COLUMNS_PER_DATASET),
    // ── Phase F1 (figure craft) ──────────────────────────────────────────
    // Significance brackets on a group-comparison figure — generated FROM the
    // multiple-comparisons result, opt-in per figure. Enum only.
    brackets: z.enum(['none', 'stars', 'pvalue']),
    // Format Graph — bounded enum/number, no free-form string reaches matplotlib.
    symbol: z.enum(['circle', 'square', 'triangle', 'diamond']),
    symbolSize: z.number().finite().min(1).max(40),
    symbolFill: z.enum(['filled', 'open']),
    lineStyle: z.enum(['solid', 'dashed', 'dotted', 'none']),
    errorBarDir: z.enum(['both', 'up', 'down']),
    // Format Axes. The two titles are matplotlib TEXT (passed as data to
    // set_xlabel, never eval'd) and length-capped exactly like ChartSpec's
    // titles — the one bounded-string exception, held to the same discipline.
    xAxisTitle: z.string().trim().max(MAX_COLUMN_NAME),
    yAxisTitle: z.string().trim().max(MAX_COLUMN_NAME),
    xMin: z.number().finite(),
    xMax: z.number().finite(),
    yMin: z.number().finite(),
    yMax: z.number().finite(),
    xScale: z.enum(['linear', 'log10', 'log2', 'ln']),
    yScale: z.enum(['linear', 'log10', 'log2', 'ln']),
    xTicks: z.number().int().min(2).max(30),
    yTicks: z.number().int().min(2).max(30),
    minorTicks: z.enum(['off', 'on']),
  })
  .partial()
  .strict()

export const AnalysisSpecSchema = z
  .object({
    id: z.string().min(1).max(32),
    analysisId: z.enum(ANALYSIS_IDS),
    columnIds: z.array(columnId).max(MAX_COLUMNS_PER_DATASET),
    options: AnalysisOptionsSchema.optional(),
  })
  .strict()
/** At most a handful of saved analyses per dataset. */
export const MAX_ANALYSES = 24
export const AnalysesSchema = z.array(AnalysisSpecSchema).max(MAX_ANALYSES)
/** `{ id, analysisId, columnIds, options }` — a saved Lab analysis (inputs only). */
export type AnalysisSpec = z.infer<typeof AnalysisSpecSchema>

/**
 * Poster layouts (Phase F2). A layout composes several SAVED Lab analyses into
 * ONE multi-panel figure with A/B/C panel labels — a science-fair poster board.
 * Same bounded, `.strict()` shape and mass-assignment reasoning as every other
 * draft array: only our own builder writes these. A panel references a saved
 * analysis by id (`analysisId` = one of `analyses[].id`, the same generated id
 * format as `columnId`); a dangling reference just renders an empty panel, so —
 * like charts/scripts/analyses — layouts are NOT part of `datasetProblem`.
 * `rows`/`cols` are small ints (a poster grid, never a render bomb), and the
 * composing Lab template clamps panels to `rows*cols` regardless.
 */
export const MAX_LAYOUT_DIM = 4

/**
 * One poster CELL, in inches — mirrors `_PANEL_W` / `_PANEL_H` in
 * `runtime/analysis-templates.mjs`, which lays the exported board out as
 * `plt.subplots(rows, cols, figsize=(cols * _PANEL_W, rows * _PANEL_H))`.
 *
 * The on-screen preview shapes its cells to this same ratio so that what a
 * student arranges is what the PDF prints. Duplicating a number across the
 * JS/Python boundary is a drift risk, so `poster-geometry.test.ts` reads the
 * template source and fails if these two stop agreeing.
 */
export const POSTER_PANEL_W = 4.5
export const POSTER_PANEL_H = 3.4
/** matplotlib `wspace`/`hspace`: gap between subplots, as a fraction of a cell. */
export const POSTER_WSPACE = 0.04
export const POSTER_HSPACE = 0.06
const LayoutPanelSchema = z.object({ analysisId: columnId }).strict()
export const LayoutSpecSchema = z
  .object({
    id: z.string().min(1).max(32),
    name: z.string().trim().min(1).max(MAX_DATASET_NAME),
    rows: z.number().int().min(1).max(MAX_LAYOUT_DIM),
    cols: z.number().int().min(1).max(MAX_LAYOUT_DIM),
    panels: z.array(LayoutPanelSchema).max(MAX_LAYOUT_DIM * MAX_LAYOUT_DIM),
  })
  .strict()
/** At most a handful of poster layouts per dataset. */
export const MAX_LAYOUTS = 12
export const LayoutsSchema = z.array(LayoutSpecSchema).max(MAX_LAYOUTS)
/** `{ id, name, rows, cols, panels: [{analysisId}] }` — a saved poster layout. */
export type LayoutSpec = z.infer<typeof LayoutSpecSchema>

/**
 * Whole-dataset check. Returns the first problem in the student's words, or
 * `null` when the dataset is coherent. Routes turn a non-null into a 400.
 *
 * `allowEmpty` waives ONLY the "needs at least one column" issue, for the
 * create route where a column-less dataset is a legitimate starting point.
 *
 * It is a parameter rather than a `problem && columns.length > 0` test at the
 * call site, and that is the whole point: because this helper returns just the
 * FIRST issue, and the empty-columns issue always sorts first, a caller that
 * ignored the result on `columns.length === 0` was ignoring the byte cap and
 * the rectangular-rows check along with it — so a body with no columns and
 * three megabytes of rows passed straight through.
 */
export function datasetProblem(
  columns: ColumnSpec[],
  rows: DataRow[],
  tableType: TableType,
  allowEmpty = false,
): string | null {
  const issues = validateDataset({ columns, rows }, tableType).filter(
    (issue) => !(allowEmpty && issue.code === 'no-columns'),
  )
  if (issues.length > 0) return issues[0]!.message

  // Shape caps bound rows × columns, but 5 000 × 40 cells of 200-character text
  // is ~40 MB — legal by shape and absurd in a jsonb column. The byte check is
  // the one that actually holds.
  if (datasetByteSize({ columns, rows }) > MAX_DATASET_BYTES) {
    return `This dataset is larger than the ${Math.round(MAX_DATASET_BYTES / (1024 * 1024))} MB limit. Remove some columns or split it into two datasets.`
  }
  return null
}
