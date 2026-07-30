'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ErrorBar,
  LabelList,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Plus, Download, ImageDown, Trash2, BarChart3, Code2, ImagePlus, Check } from 'lucide-react'
import {
  attachFigureToShowcase,
  chartSvgToPngBlob,
  downloadBlob,
  downloadChartPng,
  slugify,
} from '@/lib/data-terminal/export'
import { chartToPython } from '@/lib/data-terminal/code-bridge'
import { toDatasetCsv } from '@/lib/data-terminal/csv'
import type { ColumnSpec, DataRow } from '@/lib/data-terminal/dataset'
import {
  buildChart,
  blankChart,
  clampIntInput,
  optionalNumberInput,
  finiteNumberInput,
  CHART_TYPE_LABELS,
  TRENDLINE_LABELS,
  SERIES_COLORS,
  type SheetsChartSpec,
  type SheetsChartType,
  type ErrorBarSpec,
} from '@/lib/data-terminal/sheets-chart'
import type { TrendlineKind } from '@/lib/data-terminal/trendline'

/**
 * Sheets mode's Chart surface — Excel's time-to-first-chart, over the same
 * dataset the grid edits. Zero Python, zero network: recharts (already a
 * dependency) draws it, closed-form maths in `trendline.ts` fits the trendlines.
 *
 * Every spec change goes through `onChartsChange`, which hands the whole `charts`
 * array back to `useDatasetEditor.edit()` — the SAME debounced autosave the grid
 * uses. There is deliberately no save path of its own; an independent save is
 * how earlier work in this feature got lost (see `useDatasetEditor`'s header).
 *
 * The chart is an unlabelled SVG to assistive tech, so — like `ReportBarChart` —
 * it carries a `role="img"` summary and the plotted numbers as a real `<table>`
 * behind a disclosure. recharts is loaded via `next/dynamic` at the call site so
 * it never rides in the grid's eager bundle.
 */

const AXIS_TICK = { fill: '#ffffff70', fontSize: 10 } as const
const GRID_STROKE = '#ffffff12'
const TOOLTIP_STYLE = { background: '#0d1b2e', border: '1px solid #ffffff20', fontSize: 12 } as const
const CHART_HEIGHT = 340

const TREND_KINDS: TrendlineKind[] = [
  'linear',
  'logarithmic',
  'polynomial',
  'power',
  'exponential',
  'movingAverage',
]

export function SheetsChart({
  columns,
  rows,
  charts,
  datasetName,
  onChartsChange,
  onOpenInCode,
}: {
  columns: ColumnSpec[]
  rows: DataRow[]
  charts: SheetsChartSpec[]
  datasetName: string
  onChartsChange: (charts: SheetsChartSpec[]) => void
  /** Phase F2 bridge: reproduce this chart as an editable matplotlib script. */
  onOpenInCode: (code: string, name: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(charts[0]?.id ?? null)
  const svgWrapRef = useRef<HTMLDivElement>(null)
  // Attach-to-showcase status for the current chart (Phase F showcase attachment).
  const [attach, setAttach] = useState<'idle' | 'busy' | 'done'>('idle')
  const [attachError, setAttachError] = useState<string | null>(null)

  // Keep the selection pointing at a chart that still exists.
  useEffect(() => {
    if (charts.length === 0) {
      if (selectedId !== null) setSelectedId(null)
    } else if (!charts.some((c) => c.id === selectedId)) {
      setSelectedId(charts[0]!.id)
    }
  }, [charts, selectedId])

  const chart = charts.find((c) => c.id === selectedId) ?? charts[0] ?? null

  // A fresh chart hasn't been attached — clear the "Attached ✓" state on switch.
  useEffect(() => {
    setAttach('idle')
    setAttachError(null)
  }, [chart?.id])

  const plottable = columns.filter((c) => c.role !== 'ignore' && !c.subcolumnOf)
  const yOptions = plottable.filter(
    (c) => c.id !== chart?.xColumnId && (c.role === 'y' || c.type === 'number') && c.role !== 'x',
  )

  const built = useMemo(
    () => (chart ? buildChart(chart, { columns, rows }) : null),
    [chart, columns, rows],
  )

  function addChart() {
    const next = blankChart({ columns, rows }, charts)
    onChartsChange([...charts, next])
    setSelectedId(next.id)
  }

  function deleteChart(id: string) {
    onChartsChange(charts.filter((c) => c.id !== id))
  }

  function update(patch: Partial<SheetsChartSpec>) {
    if (!chart) return
    onChartsChange(charts.map((c) => (c.id === chart.id ? { ...c, ...patch } : c)))
  }

  function toggleY(id: string) {
    if (!chart) return
    const has = chart.yColumnIds.includes(id)
    update({ yColumnIds: has ? chart.yColumnIds.filter((y) => y !== id) : [...chart.yColumnIds, id] })
  }

  function setTrend(yId: string, kind: TrendlineKind | 'none') {
    if (!chart) return
    const others = (chart.trendlines ?? []).filter((t) => t.yColumnId !== yId)
    update({
      trendlines:
        kind === 'none'
          ? others
          : [...others, { yColumnId: yId, kind, ...(kind === 'polynomial' ? { order: 2 } : {}), ...(kind === 'movingAverage' ? { window: 3 } : {}) }],
    })
  }

  function setTrendParam(yId: string, patch: { order?: number; window?: number }) {
    if (!chart) return
    update({
      trendlines: (chart.trendlines ?? []).map((t) => (t.yColumnId === yId ? { ...t, ...patch } : t)),
    })
  }

  async function exportPng() {
    const svg = svgWrapRef.current?.querySelector('svg')
    if (svg) await downloadChartPng(svg as SVGSVGElement, `${slugify(chart?.title || datasetName)}.png`)
  }

  async function attachToShowcase() {
    const svg = svgWrapRef.current?.querySelector('svg')
    if (!svg || attach === 'busy') return
    setAttach('busy')
    setAttachError(null)
    try {
      const blob = await chartSvgToPngBlob(svg as SVGSVGElement)
      await attachFigureToShowcase(blob, `${slugify(chart?.title || datasetName)}.png`)
      setAttach('done')
    } catch (err) {
      setAttach('idle')
      // e.g. "Save your showcase details first." when the team has no showcase.
      setAttachError(err instanceof Error ? err.message : 'Could not attach the figure.')
    }
  }

  function exportCsv() {
    const blob = new Blob([toDatasetCsv({ columns, rows })], { type: 'text/csv' })
    downloadBlob(blob, `${slugify(datasetName)}.csv`)
  }

  // Phase F2 bridge: turn the selected chart into an editable matplotlib script
  // (same chart type + data → the figure matches) and hand it to the Code lane.
  function openInCode() {
    if (!chart) return
    onOpenInCode(chartToPython(chart, { columns, rows }), `${chart.title || 'Chart'} (code)`)
  }

  if (charts.length === 0 || !chart) {
    return (
      <div className="dt-chart-empty" data-testid="chart-empty">
        <BarChart3 size={26} className="text-white/25" />
        <span className="font-pixel text-[8px] text-white/45">No charts yet.</span>
        <button type="button" className="dt-btn dt-btn--primary" onClick={addChart} data-testid="chart-add">
          <Plus size={12} /> New chart
        </button>
      </div>
    )
  }

  const anyReplicates = chart.yColumnIds.some((id) => columns.some((c) => c.subcolumnOf === id))
  const errorMode: ErrorBarSpec['mode'] = chart.errorBars?.mode ?? 'none'
  const trendFor = (yId: string) => (chart.trendlines ?? []).find((t) => t.yColumnId === yId)

  // Log Y only means something on a continuous line/scatter axis whose plotted
  // values are all > 0 — d3/recharts scaleLog cannot place 0 or negatives, and a
  // bar/area baseline IS 0, so a log axis there renders blank. Gate both the
  // applied scale and the control's availability on this, so a student is never
  // offered a toggle that silently no-ops.
  // ponytail: recomputed per render off `built`; a plain scan, no memo needed.
  const logAvailable =
    (chart.type === 'line' || chart.type === 'scatter') &&
    built?.ok === true &&
    built.kind === 'cartesian' &&
    built.rows.length > 0 &&
    built.rows.every((r) => built.series.every((s) => {
      const v = r[s.key]
      return typeof v !== 'number' || v > 0
    }))

  return (
    <div className="dt-chart" data-testid="sheets-chart">
      <div className="dt-chart__bar">
        {charts.length > 1 && (
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={chart.id}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Which chart"
              data-testid="chart-select"
            >
              {charts.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.title || `Chart ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="button" className="dt-btn" onClick={addChart} data-testid="chart-add">
          <Plus size={12} /> New chart
        </button>
        <div className="dt-toolbar__spacer" />
        <button type="button" className="dt-btn" onClick={exportPng} data-testid="chart-export-png">
          <ImageDown size={12} /> PNG
        </button>
        <button type="button" className="dt-btn" onClick={exportCsv} data-testid="chart-export-csv">
          <Download size={12} /> CSV
        </button>
        <button
          type="button"
          className="dt-btn"
          onClick={openInCode}
          title="Reproduce this chart as an editable matplotlib script in the Code lane"
          data-testid="chart-open-code"
        >
          <Code2 size={12} /> Open in Code mode
        </button>
        <button
          type="button"
          className="dt-btn"
          onClick={attachToShowcase}
          disabled={attach === 'busy'}
          title="Send this chart to your showcase as a data figure"
          data-testid="chart-attach-showcase"
        >
          {attach === 'done' ? (
            <>
              <Check size={12} /> Attached
            </>
          ) : (
            <>
              <ImagePlus size={12} /> {attach === 'busy' ? 'Attaching…' : 'Attach to showcase'}
            </>
          )}
        </button>
        <button
          type="button"
          className="dt-btn dt-btn--danger"
          onClick={() => deleteChart(chart.id)}
          data-testid="chart-delete"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
      {attachError && (
        <p className="dt-field__error" data-testid="chart-attach-error">
          {attachError}
        </p>
      )}

      <div className="dt-chart__body">
        <div className="dt-chart__controls">
          {/* ── Data ── */}
          <label className="dt-field">
            <span className="dt-field__label">Chart type</span>
            <div className="ops-select-wrap">
              <select
                className="ops-select"
                value={chart.type}
                onChange={(e) => update({ type: e.target.value as SheetsChartType })}
                data-testid="chart-type"
              >
                {(Object.keys(CHART_TYPE_LABELS) as SheetsChartType[]).map((t) => (
                  <option key={t} value={t}>
                    {CHART_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="dt-field">
            <span className="dt-field__label">X axis</span>
            <div className="ops-select-wrap">
              <select
                className="ops-select"
                value={chart.xColumnId}
                onChange={(e) =>
                  update({
                    xColumnId: e.target.value,
                    yColumnIds: chart.yColumnIds.filter((y) => y !== e.target.value),
                  })
                }
                data-testid="chart-x"
              >
                {plottable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <fieldset className="dt-field dt-chart__ycols">
            <legend className="dt-field__label">
              Y axis {chart.type === 'pie' ? '(pie uses the first)' : ''}
            </legend>
            {yOptions.length === 0 ? (
              <span className="dt-field__hint">No numeric columns to plot yet.</span>
            ) : (
              yOptions.map((c) => (
                <label className="dt-check" key={c.id}>
                  <input
                    type="checkbox"
                    checked={chart.yColumnIds.includes(c.id)}
                    onChange={() => toggleY(c.id)}
                    data-testid={`chart-y-${c.id}`}
                  />
                  <span>{c.name}</span>
                </label>
              ))
            )}
          </fieldset>

          {/* ── Trendlines (per selected Y) ── */}
          {chart.type !== 'pie' && chart.yColumnIds.length > 0 && (
            <div className="dt-field">
              <span className="dt-field__label">Trendlines</span>
              {chart.yColumnIds.map((yId) => {
                const yCol = columns.find((c) => c.id === yId)
                const t = trendFor(yId)
                return (
                  <div className="dt-chart__trendrow" key={yId}>
                    <span className="dt-chart__trendname">{yCol?.name ?? yId}</span>
                    <div className="ops-select-wrap">
                      <select
                        className="ops-select"
                        value={t?.kind ?? 'none'}
                        onChange={(e) => setTrend(yId, e.target.value as TrendlineKind | 'none')}
                        aria-label={`Trendline for ${yCol?.name ?? yId}`}
                        data-testid={`chart-trend-${yId}`}
                      >
                        <option value="none">None</option>
                        {TREND_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {TRENDLINE_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {t?.kind === 'polynomial' && (
                      <input
                        type="number"
                        min={2}
                        max={6}
                        className="dt-input dt-chart__num"
                        value={t.order ?? 2}
                        onChange={(e) => setTrendParam(yId, { order: clampIntInput(e.target.value, 2, 6) })}
                        aria-label={`Polynomial order for ${yCol?.name ?? yId}`}
                        data-testid={`chart-trend-order-${yId}`}
                      />
                    )}
                    {t?.kind === 'movingAverage' && (
                      <input
                        type="number"
                        min={2}
                        className="dt-input dt-chart__num"
                        value={t.window ?? 3}
                        onChange={(e) =>
                          setTrendParam(yId, { window: clampIntInput(e.target.value, 2, Math.max(2, rows.length - 1)) })
                        }
                        aria-label={`Moving-average window for ${yCol?.name ?? yId}`}
                        data-testid={`chart-trend-window-${yId}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Error bars ── */}
          {chart.type !== 'pie' && (
            <label className="dt-field">
              <span className="dt-field__label">Error bars</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={errorMode}
                  onChange={(e) => {
                    const mode = e.target.value as ErrorBarSpec['mode']
                    const spec: ErrorBarSpec =
                      mode === 'percent' || mode === 'fixed' ? { mode, value: mode === 'percent' ? 10 : 1 } : { mode }
                    update({ errorBars: spec })
                  }}
                  data-testid="chart-errorbars"
                >
                  <option value="none">None</option>
                  <option value="column">From a paired error column</option>
                  <option value="percent">± percentage</option>
                  <option value="fixed">± fixed value</option>
                  {anyReplicates && <option value="sd">± SD (from replicates)</option>}
                  {anyReplicates && <option value="sem">± SEM (from replicates)</option>}
                </select>
              </div>
              {(errorMode === 'percent' || errorMode === 'fixed') && (
                <input
                  type="number"
                  className="dt-input dt-chart__num"
                  value={(chart.errorBars as { value: number }).value}
                  onChange={(e) =>
                    update({ errorBars: { mode: errorMode, value: finiteNumberInput(e.target.value, 0) } as ErrorBarSpec })
                  }
                  aria-label={errorMode === 'percent' ? 'Error percentage' : 'Fixed error'}
                />
              )}
            </label>
          )}

          {/* ── Titles + options ── */}
          <label className="dt-field">
            <span className="dt-field__label">Title</span>
            <input
              className="dt-input"
              value={chart.title ?? ''}
              onChange={(e) => update({ title: e.target.value || undefined })}
              data-testid="chart-title"
            />
          </label>
          {chart.type !== 'pie' && (
            <div className="dt-chart__pair">
              <label className="dt-field">
                <span className="dt-field__label">X title</span>
                <input
                  className="dt-input"
                  value={chart.xTitle ?? ''}
                  onChange={(e) => update({ xTitle: e.target.value || undefined })}
                />
              </label>
              <label className="dt-field">
                <span className="dt-field__label">Y title</span>
                <input
                  className="dt-input"
                  value={chart.yTitle ?? ''}
                  onChange={(e) => update({ yTitle: e.target.value || undefined })}
                />
              </label>
            </div>
          )}

          {chart.type !== 'pie' && (
            <div className="dt-chart__pair">
              <label className="dt-field">
                <span className="dt-field__label">Y min</span>
                <input
                  type="number"
                  className="dt-input"
                  value={chart.yMin ?? ''}
                  onChange={(e) => update({ yMin: optionalNumberInput(e.target.value) })}
                />
              </label>
              <label className="dt-field">
                <span className="dt-field__label">Y max</span>
                <input
                  type="number"
                  className="dt-input"
                  value={chart.yMax ?? ''}
                  onChange={(e) => update({ yMax: optionalNumberInput(e.target.value) })}
                />
              </label>
            </div>
          )}

          <div className="dt-chart__opts">
            <label className="dt-check">
              <input type="checkbox" checked={chart.showLegend} onChange={(e) => update({ showLegend: e.target.checked })} />
              <span>Legend</span>
            </label>
            {chart.type !== 'pie' && (
              <>
                <label className="dt-check">
                  <input
                    type="checkbox"
                    checked={chart.showGridlines}
                    onChange={(e) => update({ showGridlines: e.target.checked })}
                  />
                  <span>Gridlines</span>
                </label>
                <label className="dt-check">
                  <input
                    type="checkbox"
                    checked={chart.showDataLabels ?? false}
                    onChange={(e) => update({ showDataLabels: e.target.checked || undefined })}
                  />
                  <span>Data labels</span>
                </label>
                <label
                  className="dt-check"
                  title={logAvailable ? undefined : 'Log Y needs a line or scatter chart with all-positive values.'}
                >
                  <input
                    type="checkbox"
                    checked={!!(chart.logScale && logAvailable)}
                    disabled={!logAvailable}
                    onChange={(e) => update({ logScale: e.target.checked || undefined })}
                  />
                  <span>Log Y</span>
                </label>
              </>
            )}
          </div>

          {/* ── Series colours ── */}
          {chart.yColumnIds.length > 0 && (
            <div className="dt-field">
              <span className="dt-field__label">Colours</span>
              <div className="dt-chart__swatches">
                {chart.yColumnIds.map((yId, i) => (
                  <label className="dt-chart__swatch" key={yId}>
                    <input
                      type="color"
                      value={chart.colors?.[i] ?? SERIES_COLORS[i % SERIES_COLORS.length]}
                      onChange={(e) => {
                        const colors = [...(chart.colors ?? [])]
                        while (colors.length < chart.yColumnIds.length) colors.push(SERIES_COLORS[colors.length % SERIES_COLORS.length]!)
                        colors[i] = e.target.value
                        update({ colors })
                      }}
                      aria-label={`Colour for ${columns.find((c) => c.id === yId)?.name ?? yId}`}
                    />
                    <span>{columns.find((c) => c.id === yId)?.name ?? yId}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div className="dt-chart__canvas">
          {chart.title && <p className="dt-chart__title">{chart.title}</p>}
          {!built || !built.ok ? (
            <div className="dt-chart__placeholder" data-testid="chart-placeholder">
              {built && !built.ok ? built.reason : 'Choose columns to plot.'}
            </div>
          ) : (
            <>
              <div
                ref={svgWrapRef}
                className="dt-chart__svg"
                role="img"
                aria-label={built.summary}
                data-testid="chart-svg"
                style={{ width: '100%', height: CHART_HEIGHT }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {built.kind === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={built.slices}
                        dataKey="value"
                        nameKey="name"
                        outerRadius="80%"
                        label={chart.showDataLabels ? { fill: '#ffffffcc', fontSize: 11 } : undefined}
                      >
                        {built.slices.map((s) => (
                          <Cell key={s.name} fill={s.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#ffffffaa' }} />
                      {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                    </PieChart>
                  ) : (
                    <ComposedChart data={built.rows} margin={{ top: 12, right: 16, bottom: 20, left: 6 }}>
                      {chart.showGridlines && <CartesianGrid stroke={GRID_STROKE} />}
                      <XAxis
                        dataKey="x"
                        type={built.xIsNumeric ? 'number' : 'category'}
                        tick={AXIS_TICK}
                        label={{ value: built.xTitle, position: 'insideBottom', offset: -8, fill: '#ffffff70', fontSize: 11 }}
                      />
                      <YAxis
                        tick={AXIS_TICK}
                        scale={chart.logScale && logAvailable ? 'log' : 'auto'}
                        domain={[chart.yMin ?? 'auto', chart.yMax ?? 'auto']}
                        allowDataOverflow={chart.yMin !== undefined || chart.yMax !== undefined}
                        label={{ value: built.yTitle, angle: -90, position: 'insideLeft', fill: '#ffffff70', fontSize: 11 }}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#ffffffaa' }} />
                      {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}

                      {built.series.map((s) => {
                        const eb = s.errorKey ? (
                          <ErrorBar dataKey={s.errorKey} width={4} strokeWidth={1} stroke={s.color} direction="y" />
                        ) : null
                        const labels = chart.showDataLabels ? (
                          <LabelList dataKey={s.key} position="top" fill="#ffffffb0" fontSize={10} />
                        ) : null
                        if (chart.type === 'line') {
                          return (
                            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} dot strokeWidth={2}>
                              {eb}
                              {labels}
                            </Line>
                          )
                        }
                        if (chart.type === 'area') {
                          return (
                            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.25}>
                              {eb}
                              {labels}
                            </Area>
                          )
                        }
                        if (chart.type === 'scatter') {
                          return (
                            <Scatter key={s.key} dataKey={s.key} name={s.name} fill={s.color}>
                              {eb}
                              {labels}
                            </Scatter>
                          )
                        }
                        return (
                          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]}>
                            {eb}
                            {labels}
                          </Bar>
                        )
                      })}

                      {built.trendlines
                        .filter((t) => t.ok && t.points.length > 1)
                        .map((t) => (
                          <Line
                            key={t.key}
                            data={t.points}
                            dataKey="ty"
                            name={t.name}
                            stroke={t.color}
                            strokeDasharray="6 4"
                            strokeWidth={2}
                            dot={false}
                            legendType="none"
                            isAnimationActive={false}
                          />
                        ))}
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Trendline equations + R², shown on the chart (Excel's display
                  equation / display R²). */}
              {built.kind === 'cartesian' && built.trendlines.length > 0 && (
                <ul className="dt-chart__eqs" data-testid="chart-equation">
                  {built.trendlines.map((t) => (
                    <li key={t.key} style={{ color: t.color }}>
                      {t.ok ? (
                        <>
                          <span className="dt-chart__eqname">{t.name}</span> {t.equation}
                          {t.r2 !== null ? `  ·  R² = ${t.r2.toFixed(4)}` : ''}
                        </>
                      ) : (
                        <span className="dt-chart__eqerr">{t.name}: {t.reason}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* The same numbers as a real table, for assistive tech and anyone
                  who wants the values behind the picture. */}
              <details className="dt-chart__data">
                <summary className="font-pixel text-[8px] text-white/40 uppercase tracking-widest cursor-pointer">
                  View as table
                </summary>
                <div className="dt-chart__tablewrap">
                  <table className="dt-chart__table">
                    <caption className="sr-only">{built.summary}</caption>
                    <thead>
                      <tr>
                        {built.table.header.map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {built.table.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}>{cell === null ? '' : String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
