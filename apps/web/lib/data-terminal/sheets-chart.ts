/**
 * Sheets-mode chart specs and the pure builder that turns one into
 * recharts-ready data. No React, no recharts import here — this is the layer the
 * `SheetsChart` component draws and the layer the tests exercise.
 *
 * A spec references columns by id (never by name or index), so renaming or
 * reordering a column in the grid cannot silently break a saved chart — the
 * same rule `ColumnSpec.id` exists for.
 *
 * Error bars are DERIVED, not typed in (Prism's principle, carried into Sheets
 * mode): ±SD / ±SEM come from a Y column's replicate subcolumns and are offered
 * ONLY when those exist. A per-point SD invented from a single reading would be
 * a lie, so the builder returns `undefined` error rather than faking one.
 */

import { fitTrendline, type TrendlineKind } from './trendline'
import {
  formatNumber,
  numericCell,
  type ColumnSpec,
  type DatasetShape,
} from './dataset'

// ─── The reusable series palette ─────────────────────────────────────────────

/** Gold, teal, pink, blue, grey, green — the Data Terminal's series colours. */
export const SERIES_COLORS = ['#F5C518', '#4FD1C5', '#F687B3', '#90CDF4', '#A0AEC0', '#9AE6B4']

// ─── Spec ────────────────────────────────────────────────────────────────────

export type SheetsChartType = 'bar' | 'line' | 'scatter' | 'area' | 'pie'

/**
 * How error bars are obtained for the plotted Y values.
 *  - `none`     no error bars.
 *  - `column`   the pre-computed error column paired to each Y (its `yErr`).
 *  - `percent`  ±value% of each point.
 *  - `fixed`    ±value, the same on every point.
 *  - `sd`/`sem` derived from a Y's replicate subcolumns — offered only when the
 *               Y actually has replicates, never faked from a single reading.
 */
export type ErrorBarSpec =
  | { mode: 'none' }
  | { mode: 'column' }
  | { mode: 'percent'; value: number }
  | { mode: 'fixed'; value: number }
  | { mode: 'sd' }
  | { mode: 'sem' }

export interface TrendlineRef {
  yColumnId: string
  kind: TrendlineKind
  order?: number
  window?: number
}

export interface SheetsChartSpec {
  id: string
  type: SheetsChartType
  xColumnId: string
  yColumnIds: string[]
  title?: string
  xTitle?: string
  yTitle?: string
  showLegend: boolean
  showGridlines: boolean
  /** Per-series overrides; falls back to `SERIES_COLORS` by position. */
  colors?: string[]
  yMin?: number
  yMax?: number
  logScale?: boolean
  showDataLabels?: boolean
  errorBars?: ErrorBarSpec
  trendlines?: TrendlineRef[]
}

export const CHART_TYPE_LABELS: Record<SheetsChartType, string> = {
  bar: 'Column / bar',
  line: 'Line',
  scatter: 'Scatter',
  area: 'Area',
  pie: 'Pie',
}

export const TRENDLINE_LABELS: Record<TrendlineKind, string> = {
  linear: 'Linear',
  logarithmic: 'Logarithmic',
  polynomial: 'Polynomial',
  power: 'Power',
  exponential: 'Exponential',
  movingAverage: 'Moving average',
}

// ─── UI-layer id + defaults (pure, deterministic — no Math.random) ───────────

/**
 * Clamp a user-typed integer into `[lo, hi]`; empty/NaN falls back to `lo`.
 * Keeps builder spec inputs (polynomial order, MA window) inside what
 * `ChartsSchema` and the fitters accept, so a cleared field never yields a `0`
 * that 400s every subsequent autosave.
 */
export function clampIntInput(raw: string, lo: number, hi: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

/** A user-typed optional number: empty or NaN → `undefined` (never store NaN). */
export function optionalNumberInput(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/** A required finite number field: empty/NaN → the given fallback. */
export function finiteNumberInput(raw: string, fallback: number): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/** A short opaque id unique among the existing charts. */
export function newChartId(existing: SheetsChartSpec[]): string {
  const taken = new Set(existing.map((c) => c.id))
  let n = existing.length + 1
  while (taken.has(`ch${n}`)) n++
  return `ch${n}`
}

/**
 * A sensible starting chart for a dataset: the first X (or first column) against
 * the first Y that is not the X. Immediately renders something rather than an
 * empty config the student must assemble before seeing anything.
 */
export function blankChart(shape: DatasetShape, existing: SheetsChartSpec[]): SheetsChartSpec {
  const plottable = shape.columns.filter((c) => c.role !== 'ignore' && !c.subcolumnOf)
  const x = plottable.find((c) => c.role === 'x') ?? plottable[0]
  const y = plottable.find((c) => c.role === 'y' && c.id !== x?.id) ?? plottable.find((c) => c.id !== x?.id)
  return {
    id: newChartId(existing),
    type: 'bar',
    xColumnId: x?.id ?? '',
    yColumnIds: y ? [y.id] : [],
    showLegend: true,
    showGridlines: true,
  }
}

// ─── Built (recharts-ready) result ───────────────────────────────────────────

export interface ChartSeries {
  /** recharts `dataKey` — the Y column's id. */
  key: string
  name: string
  color: string
  /** Field on each row carrying the ± error, when this series has error bars. */
  errorKey?: string
}

export interface BuiltTrendline {
  /** React key / legend id, unique per overlay. */
  key: string
  name: string
  color: string
  ok: boolean
  reason?: string
  equation: string
  r2: number | null
  /** Own-data line points; `x` matches the axis, `ty` is the value. */
  points: { x: number | string; ty: number }[]
}

interface TableView {
  header: string[]
  rows: (string | number | null)[][]
}

export type BuiltChart =
  | { ok: false; reason: string }
  | {
      ok: true
      kind: 'cartesian'
      type: Exclude<SheetsChartType, 'pie'>
      xIsNumeric: boolean
      xTitle: string
      yTitle: string
      rows: Record<string, number | string | null>[]
      series: ChartSeries[]
      trendlines: BuiltTrendline[]
      summary: string
      table: TableView
    }
  | {
      ok: true
      kind: 'pie'
      type: 'pie'
      slices: { name: string; value: number; color: string }[]
      summary: string
      table: TableView
    }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFor(col: ColumnSpec): string {
  return col.unit ? `${col.name} (${col.unit})` : col.name
}

function colorAt(spec: SheetsChartSpec, i: number): string {
  return spec.colors?.[i] ?? SERIES_COLORS[i % SERIES_COLORS.length]!
}

/** Column indices whose values form a Y's replicate group: the Y plus its subcolumns. */
function replicateGroup(columns: ColumnSpec[], yId: string): number[] {
  const out: number[] = []
  columns.forEach((c, i) => {
    if (c.id === yId || c.subcolumnOf === yId) out.push(i)
  })
  return out
}

function sampleStats(values: number[]): { mean: number; sd: number; sem: number; n: number } {
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  // Sample SD (n−1). With n<2 there is no spread to speak of — SD is 0.
  const variance = n < 2 ? 0 : values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)
  const sd = Math.sqrt(variance)
  return { mean, sd, sem: n < 2 ? 0 : sd / Math.sqrt(n), n }
}

// ─── The builder ─────────────────────────────────────────────────────────────

/** Turn a chart spec + dataset into recharts-ready data. Pure; never throws. */
export function buildChart(spec: SheetsChartSpec, shape: DatasetShape): BuiltChart {
  const { columns, rows } = shape
  const byId = new Map(columns.map((c) => [c.id, c]))
  const indexOf = new Map(columns.map((c, i) => [c.id, i]))

  const xCol = byId.get(spec.xColumnId)
  if (!xCol) return { ok: false, reason: 'Pick a column for the X axis.' }
  const xIndex = indexOf.get(spec.xColumnId)!

  const yCols = spec.yColumnIds
    .map((id) => byId.get(id))
    .filter((c): c is ColumnSpec => Boolean(c) && c!.id !== spec.xColumnId)
  if (yCols.length === 0) return { ok: false, reason: 'Pick at least one column for the Y axis.' }

  const errorMode = spec.errorBars?.mode ?? 'none'

  // ── Pie: one Y split into slices by the X label. ──
  if (spec.type === 'pie') {
    const yCol = yCols[0]!
    const yIndex = indexOf.get(yCol.id)!
    const slices: { name: string; value: number; color: string }[] = []
    rows.forEach((row, r) => {
      const value = numericCell(row[yIndex] ?? null)
      if (value === null || value <= 0) return // a slice needs a positive share
      const rawLabel = row[xIndex]
      slices.push({
        name: rawLabel === null || rawLabel === undefined ? `Row ${r + 1}` : String(rawLabel),
        value,
        color: colorAt(spec, slices.length),
      })
    })
    const summary =
      slices.length === 0
        ? `Pie chart of ${labelFor(yCol)} — no positive values to plot.`
        : `Pie chart of ${labelFor(yCol)} by ${labelFor(xCol)}. ${slices.length} slices: ${slices
            .map((s) => `${s.name} ${formatNumber(s.value)}`)
            .join(', ')}.`
    return {
      ok: true,
      kind: 'pie',
      type: 'pie',
      slices,
      summary,
      table: {
        header: [labelFor(xCol), labelFor(yCol)],
        rows: slices.map((s) => [s.name, s.value]),
      },
    }
  }

  // ── Cartesian: bar / line / area / scatter. ──
  // Scatter is always a numeric axis; line/area follow the X column's type; a
  // bar/column chart is categorical by nature.
  const xIsNumeric = spec.type === 'scatter' || (spec.type !== 'bar' && xCol.type === 'number')

  const series: ChartSeries[] = yCols.map((c, i) => ({
    key: c.id,
    name: labelFor(c),
    color: colorAt(spec, i),
    errorKey: errorMode === 'none' ? undefined : `${c.id}__e`,
  }))

  // One row per data row, carrying the x value and every series' plotted value
  // (mean of replicates when a Y has them) plus its derived ± error.
  const dataRows: Record<string, number | string | null>[] = []
  for (const row of rows) {
    const xRaw = row[xIndex] ?? null
    const x = xIsNumeric ? numericCell(xRaw) : xRaw === null ? null : String(xRaw)
    if (x === null) continue // a point with no x cannot be placed

    const entry: Record<string, number | string | null> = { x }
    for (const yCol of yCols) {
      const group = replicateGroup(columns, yCol.id)
      const vals = group.map((gi) => numericCell(row[gi] ?? null)).filter((v): v is number => v !== null)
      const hasReplicates = group.length > 1
      const value = hasReplicates ? (vals.length ? sampleStats(vals).mean : null) : numericCell(row[indexOf.get(yCol.id)!] ?? null)
      entry[yCol.id] = value

      const errKey = `${yCol.id}__e`
      if (errorMode === 'sd' || errorMode === 'sem') {
        // Only real when the Y has replicates; otherwise there is no per-point
        // spread to report and the bar is simply omitted.
        if (hasReplicates && vals.length >= 2) {
          const s = sampleStats(vals)
          entry[errKey] = errorMode === 'sd' ? s.sd : s.sem
        }
      } else if (errorMode === 'percent' && value !== null) {
        entry[errKey] = Math.abs(value) * ((spec.errorBars as { value: number }).value / 100)
      } else if (errorMode === 'fixed' && value !== null) {
        entry[errKey] = Math.abs((spec.errorBars as { value: number }).value)
      } else if (errorMode === 'column') {
        const errCol = columns.find((c) => c.role === 'yErr' && c.pairedWith === yCol.id)
        if (errCol) {
          const e = numericCell(row[indexOf.get(errCol.id)!] ?? null)
          if (e !== null) entry[errKey] = Math.abs(e)
        }
      }
    }
    dataRows.push(entry)
  }

  // Trendlines: fit against numeric x (or the row index on a category axis) and
  // return an own-data overlay line plus its display equation and R².
  const trendlines: BuiltTrendline[] = []
  for (const [ti, ref] of (spec.trendlines ?? []).entries()) {
    const s = series.find((se) => se.key === ref.yColumnId)
    if (!s) continue
    const fx: number[] = []
    const fy: number[] = []
    dataRows.forEach((row, i) => {
      const yv = row[ref.yColumnId]
      if (typeof yv !== 'number') return
      fx.push(xIsNumeric ? (row.x as number) : i)
      fy.push(yv)
    })
    const t = fitTrendline(fx, fy, { kind: ref.kind, order: ref.order, window: ref.window })
    let points: { x: number | string; ty: number }[] = []
    if (t.ok) {
      if (xIsNumeric) {
        points = t.points.map((p) => ({ x: p.x, ty: p.y }))
      } else if (t.predict) {
        points = dataRows.map((row, i) => ({ x: row.x as string, ty: t.predict!(i) }))
      } else {
        // Moving average on a category axis: its points are at integer indices.
        points = t.points.map((p) => ({ x: dataRows[Math.round(p.x)]?.x as string, ty: p.y }))
      }
    }
    // A log fit at index 0 (category axis) is a + b·ln(0) = −Infinity; a power
    // fit with a negative exponent is a·0^b = +Infinity. Such points blank the
    // recharts Y-axis, so drop every non-finite overlay point; if too few remain
    // to draw a line, refuse the trend so no equation or line renders.
    points = points.filter(
      (p) => Number.isFinite(p.ty) && (typeof p.x === 'number' ? Number.isFinite(p.x) : p.x != null),
    )
    const ok = t.ok && points.length > 1
    trendlines.push({
      key: `${ref.yColumnId}__t${ti}`,
      name: `${s.name} · ${TRENDLINE_LABELS[ref.kind].toLowerCase()}`,
      color: s.color,
      ok,
      reason: ok ? t.reason : (t.reason ?? 'Not enough finite points to plot this trend on these categories.'),
      equation: t.equation,
      r2: t.r2,
      points,
    })
  }

  const xTitle = spec.xTitle || labelFor(xCol)
  const yTitle = spec.yTitle || (yCols.length === 1 ? labelFor(yCols[0]!) : 'Value')

  const trendSummary = trendlines
    .filter((t) => t.ok && t.equation)
    .map((t) => `${t.name}: ${t.equation}${t.r2 !== null ? `, R² ${t.r2.toFixed(3)}` : ''}`)
    .join('; ')
  const summary =
    `${CHART_TYPE_LABELS[spec.type]} chart of ${yCols.map(labelFor).join(', ')} by ${labelFor(xCol)}. ` +
    `${dataRows.length} point${dataRows.length === 1 ? '' : 's'}.` +
    (trendSummary ? ` Trendlines — ${trendSummary}.` : '')

  return {
    ok: true,
    kind: 'cartesian',
    type: spec.type,
    xIsNumeric,
    xTitle,
    yTitle,
    rows: dataRows,
    series,
    trendlines,
    summary,
    table: {
      header: [labelFor(xCol), ...yCols.map(labelFor)],
      rows: dataRows.map((row) => [row.x ?? null, ...yCols.map((c) => (row[c.id] ?? null) as number | null)]),
    },
  }
}
