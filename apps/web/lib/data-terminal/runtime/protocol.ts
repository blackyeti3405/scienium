/**
 * The typed message protocol between the Code-lane client hook (main thread) and
 * the Pyodide Web Worker. Kept in its own module so both sides — and C2's UI —
 * import one contract, and neither imports the other's heavy code.
 */

import type { ColumnRole } from '../dataset'

/** The dataset shape injected into the Python globals before a run. */
export interface RuntimeDataset {
  /** Column names + types, in grid order. Names match the grid exactly. */
  columns: { name: string; type: 'number' | 'text' | 'date' }[]
  /** Row-major cells aligned to `columns`; `null` is a missing observation. */
  rows: (string | number | null)[][]
}

/** main → worker: run this code against this dataset. */
export interface RunMessage {
  type: 'run'
  code: string
  dataset: RuntimeDataset
}

/**
 * main → worker (FIRST message after spawn): which wheels to load before
 * neutralizing the network. The Code lane sends the lean set
 * `['numpy','matplotlib','pandas']`; the Lab lane adds `scipy`+`statsmodels`.
 * A package a Lab analysis needs MUST be loaded here — network is dead after.
 */
export interface InitMessage {
  type: 'init'
  packages: string[]
}

/**
 * The dataset a Lab analysis reads. Unlike `RuntimeDataset` it carries column
 * `id`s, because an analysis spec selects columns by id (a name-keyed pick
 * would break the moment a student renames a column).
 *
 * It also carries each column's `role`, because the table-type analyses read
 * STRUCTURE from roles rather than from the checkbox selection: a Grouped
 * two-way ANOVA finds its row factor in the `label`/`group` column, and a
 * Nested analysis finds its treatment (`group`) and subject (`label`) columns,
 * while the student only checks the value column(s). Role is a fixed enum the
 * template compares to string literals — never interpolated into code.
 */
export interface AnalysisDataset {
  columns: { id: string; name: string; type: 'number' | 'text' | 'date'; role?: ColumnRole }[]
  rows: (string | number | null)[][]
}

/**
 * The bounded options an analysis template accepts. SECURITY (carried from the
 * D1 review): every value is an ENUM, a NUMBER, or a COLUMN-ID — never a
 * free-form string. Options cross into Python as JSON DATA (via `py.globals`)
 * and are only ever compared to string literals or used as pandas keys; nothing
 * here is interpolated into Python source, and this closed shape is what keeps
 * it that way. `AnalysisOptionsSchema` in dataset-schema.ts is the runtime guard
 * that enforces this exact shape at the wire boundary.
 */
export interface AnalysisOptions {
  /** One-sample t: the hypothesized mean to test against. */
  mu0?: number
  /** One-way ANOVA post-hoc: which comparisons (none / all pairs / vs control). */
  posthoc?: 'none' | 'tukey' | 'dunnett'
  /** The correction family for the all-pairs / Dunn's comparisons. */
  correction?: 'tukey' | 'bonferroni' | 'holm-sidak' | 'fdr_bh'
  /** Dunnett's control group, by column id (must be one of `columnIds`). */
  controlColumnId?: string
  /**
   * Figure family. `bar`/`box`/`violin` = Column group figure; `pie`/`donut`/
   * `stacked` = Parts-of-whole figure (fraction-of-total). Disjoint consumers,
   * one bounded enum. Same closed-enum guarantee as every option here.
   */
  graph?: 'bar' | 'box' | 'violin' | 'pie' | 'donut' | 'stacked'
  /** Box-whisker whisker style. */
  whiskers?: 'tukey' | 'minmax' | 'p10_90'
  /**
   * Grouped (two-way ANOVA) figure family. The first three are bar renderings
   * (plan's "interleaved / stacked / separated bars"); `scatter` and `heatmap`
   * are the other two grouped graph families. Bounded enum, same as `graph`.
   */
  bars?: 'interleaved' | 'stacked' | 'separated' | 'scatter' | 'heatmap'
  // ── Phase D2c (XY + Multiple-variables) ────────────────────────────────
  /** Correlation-matrix flavour (Pearson default). */
  method?: 'pearson' | 'spearman'
  /** Smoothing family; moving-average uses `window`. */
  smoother?: 'moving-average' | 'lowess'
  /** Moving-average window in points. */
  window?: number
  /** Multiple-regression dependent variable, by column id (one of columnIds). */
  dependentColumnId?: string
  // ── Phase E1 (nonlinear regression + standard-curve interpolation) ────────
  /** Which equation from the library to fit. Keyed enum, never a formula. */
  equationId?: string
  /** A simpler equation to compare against (extra sum-of-squares F test + AICc). */
  compareModel?: string
  /** Per-point weighting scheme (1/SD^2 replicate weighting is deferred). */
  weighting?: 'none' | '1/Y2' | '1/Y' | 'poisson'
  /** The unknown response value to interpolate off the standard curve. */
  interpolateY?: number
  /** Per-parameter fix value (null = fit it), indexed by parameter position. */
  fixValues?: (number | null)[]
  /** Per-parameter lower bound (null = none), indexed by parameter position. */
  boundsLow?: (number | null)[]
  /** Per-parameter upper bound (null = none), indexed by parameter position. */
  boundsHigh?: (number | null)[]
  // ── Phase E2 (global fitting) ──────────────────────────────────────────────
  /**
   * Global-fit per-parameter state across curves, indexed by parameter position:
   * shared (one value for every curve) / separate (its own per curve) / fixed
   * (held at `fixValues[i]`, never enters the fit). Bounded enum, never a name.
   */
  paramModes?: ('shared' | 'separate' | 'fixed')[]
  /** Global-fit: parameter position to run the shared-vs-separate F test on. */
  fTestParam?: number
  // ── Phase F1 (figure craft) ────────────────────────────────────────────────
  // Significance brackets on a group-comparison figure, generated FROM the
  // multiple-comparisons result already computed (never recomputed). Opt-in.
  brackets?: 'none' | 'stars' | 'pvalue'
  // Format Graph (per plotted series where applicable). All bounded enums/number.
  symbol?: 'circle' | 'square' | 'triangle' | 'diamond'
  symbolSize?: number
  symbolFill?: 'filled' | 'open'
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  errorBarDir?: 'both' | 'up' | 'down'
  // Format Axes. Titles are matplotlib TEXT (passed as data via set_xlabel,
  // never eval'd) — the one place a bounded string is allowed, like ChartSpec.
  xAxisTitle?: string
  yAxisTitle?: string
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  xScale?: 'linear' | 'log10' | 'log2' | 'ln'
  yScale?: 'linear' | 'log10' | 'log2' | 'ln'
  /** Target number of MAJOR ticks (MaxNLocator). */
  xTicks?: number
  yTicks?: number
  minorTicks?: 'off' | 'on'
}

/** The INPUTS to one analysis run — never its result (results are recomputed). */
export interface AnalysisSpecInput {
  columnIds: string[]
  options?: AnalysisOptions
}

/**
 * main → worker: run a TRUSTED, canned analysis template (OUR code, keyed by
 * `analysisId`) against `dataset`, parameterized by `spec`. Not free-form user
 * code — see analysis-templates.mjs.
 */
export interface AnalyzeMessage {
  type: 'analyze'
  analysisId: string
  dataset: AnalysisDataset
  spec: AnalysisSpecInput
}

/**
 * main → worker (Phase F1): re-render one figure of a trusted analysis at a
 * chosen format + DPI and return its bytes. Re-runs the SAME template as the
 * on-screen render (so the exported figure is the same spec), then `savefig`s
 * the chosen `figureIndex` at `dpi` — see `_export` in analysis-templates.mjs.
 */
export interface ExportFigureMessage {
  type: 'export-figure'
  analysisId: string
  dataset: AnalysisDataset
  spec: AnalysisSpecInput
  figureIndex: number
  format: FigureExportFormat
  dpi: number
}

export type FigureExportFormat = 'png' | 'svg' | 'pdf'

/**
 * One panel of a poster layout: a TEMPLATE analysisId (e.g. 'one-way-anova')
 * plus the run inputs. The client resolves a layout's saved-analysis reference
 * to this shape (`analyses[].analysisId` + `{columnIds, options}`) before
 * sending — the worker re-runs each panel's template from source, so no cached
 * result is trusted, exactly like `_export`.
 */
export interface LayoutPanel {
  analysisId: string
  spec: AnalysisSpecInput
}

/**
 * main → worker (Phase F2): compose several analyses into ONE `rows × cols`
 * multi-panel figure with A/B/C panel labels, exported at a chosen format + DPI.
 * Each panel's template is re-run (its FIRST figure rasterised into a subplot);
 * see `_export_layout` in analysis-templates.mjs. Returns bytes via the SAME
 * `export-result` message as a single-figure export.
 */
export interface ExportLayoutMessage {
  type: 'export-layout'
  dataset: AnalysisDataset
  panels: LayoutPanel[]
  rows: number
  cols: number
  format: FigureExportFormat
  dpi: number
}

export type MainToWorker =
  | RunMessage
  | InitMessage
  | AnalyzeMessage
  | ExportFigureMessage
  | ExportLayoutMessage

/** worker → main: the runtime finished loading and is ready to accept a run. */
export interface ReadyMessage {
  type: 'ready'
}

/** worker → main: a run finished (or failed). Figures are inline-ready SVG. */
export interface ResultMessage {
  type: 'result'
  /**
   * Attacker-controlled figure SVG (FIX 2). Belt-stripped at the worker
   * boundary, but the PRIMARY defense is the render: C2 MUST use
   * `<img src={figureDataUrl(fig)}>` (lib/data-terminal/runtime/figure.ts).
   * NEVER `dangerouslySetInnerHTML` a figure.
   */
  figures: string[]
  stdout: string
  stderr: string
  /** Present when the run raised; the value is the Python traceback text. */
  error?: string
}

/** worker → main: the runtime failed to load at all (bad proxy, offline). */
export interface LoadErrorMessage {
  type: 'load-error'
  error: string
}

/**
 * The structured result of one Lab analysis. `stats` is the headline scalars,
 * `tables` any per-group breakdown, `assumptions` the checklist evaluated
 * against THIS data, `figures` inline-ready SVG (rendered ONLY via
 * `<img src={figureDataUrl()}>`, same contract as Code-lane figures).
 */
export interface AnalysisResult {
  stats: Record<string, number | string | null>
  tables?: { title: string; columns: string[]; rows: (number | string | null)[][] }[]
  figures: string[]
  assumptions?: { label: string; passed: boolean; detail: string }[]
  /** Present when the template refused or raised — never show stats alongside it. */
  error?: string
}

/** worker → main: a Lab analysis finished (or failed). */
export interface AnalysisResultMessage {
  type: 'analysis-result'
  result: AnalysisResult
}

/**
 * The bytes of one figure rendered at a chosen format + DPI (Phase F1).
 * `base64` is empty when `error` is set. The MIME + extension follow `format`.
 */
export interface FigureExport {
  format: FigureExportFormat
  dpi: number
  /** base64 of the rendered figure bytes (PNG/SVG/PDF); empty on error. */
  base64: string
  /** Present when the export refused/raised — never download an errored blob. */
  error?: string
}

/** worker → main: a figure export finished (or failed). */
export interface ExportResultMessage {
  type: 'export-result'
  result: FigureExport
}

export type WorkerToMain =
  | ReadyMessage
  | ResultMessage
  | LoadErrorMessage
  | AnalysisResultMessage
  | ExportResultMessage

// ─── Runtime caps (shared so the worker enforces and the UI can explain) ──────

/** Wall-clock ceiling for one run, enforced by the MAIN thread via terminate(). */
export const RUN_TIMEOUT_MS = 15_000
/** Most figures returned from one run; extras past this are dropped. */
export const MAX_FIGURES = 8
/** Total SVG bytes returned from one run; figures past this are dropped. */
export const MAX_FIGURE_BYTES = 4 * 1024 * 1024
/** Per-stream stdout/stderr cap; the stream is truncated with a notice. */
export const MAX_STREAM_BYTES = 64 * 1024
