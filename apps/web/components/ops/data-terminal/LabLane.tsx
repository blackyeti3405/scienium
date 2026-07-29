'use client'

import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import { Plus, Play, Trash2, Loader2, AlertTriangle, Check, X, BookOpen, RefreshCw, Download, Code2 } from 'lucide-react'
import { figureDataUrl } from '@/lib/data-terminal/runtime/figure'
import { formatNumber, type ColumnSpec, type DataRow, type TableType } from '@/lib/data-terminal/dataset'
import type { AnalysisResult, FigureExport, FigureExportFormat } from '@/lib/data-terminal/runtime/protocol'
import type { AnalysisSpec, LayoutSpec } from '@/lib/data-terminal/dataset-schema'
import { analysisToPython } from '@/lib/data-terminal/code-bridge'
import { downloadFigureExport, slugify } from '@/lib/data-terminal/export'
import { analysesForTableType, analysisDef } from '@/lib/data-terminal/analyses'
import { PosterLayouts } from './PosterLayouts'
import { type EquationId, equationDef, equationsByDomain } from '@/lib/data-terminal/equations'
import {
  analysisSelectionError,
  datasetSignature,
  selectableColumns,
} from '@/lib/data-terminal/lab-analysis'
import { STATS_GUIDE } from '@/content/data-terminal/stats-guide'
import { DATA_QUALITY_GUIDE } from '@/content/data-terminal/data-quality-guide'
import { useLabRuntime } from './useLabRuntime'

/**
 * Lab mode (plan §5): the third lane over the shared dataset. A gated Analyze
 * dialog (table type decides which analyses appear — §2), a trusted Python
 * template runs the chosen analysis in the Pyodide worker (scipy + statsmodels),
 * and the result opens as a live-linked results sheet with the assumptions
 * checklist evaluated against THIS data and the matching Stats Guide entry.
 *
 * The recalculation chain (§7 risk 5): a result is DERIVED, so a cached one is
 * marked STALE the moment the dataset's columns/rows change (a signature
 * mismatch) and a re-run affordance replaces it — a result is never silently
 * shown against data it wasn't computed from.
 *
 * SECURITY: a figure is inline SVG rendered ONLY as `<img src={figureDataUrl}>`
 * (inert image mode) — same contract as the Code lane. Never innerHTML.
 *
 * Dynamic-imported by DatasetDetail so the ~65 MB Lab worker only loads when the
 * Lab lane is actually opened.
 */

/**
 * Cached last result per saved analysis — NEVER persisted (results are
 * re-computed). Each carries the dataset signature it was run against, so a
 * later data edit can mark it stale. Held by DatasetDetail, not by this lane,
 * so it survives the Lab lane unmounting when a student switches to the grid to
 * edit data — otherwise the stale/re-run chain could never see the edit.
 */
export type LabResultCache = Record<string, { result: AnalysisResult; signature: string }>

export function LabLane({
  columns,
  rows,
  tableType,
  analyses,
  onAnalysesChange,
  layouts,
  onLayoutsChange,
  onOpenInCode,
  results,
  onResultsChange,
}: {
  columns: ColumnSpec[]
  rows: DataRow[]
  tableType: TableType
  analyses: AnalysisSpec[]
  onAnalysesChange: (analyses: AnalysisSpec[]) => void
  layouts: LayoutSpec[]
  onLayoutsChange: (layouts: LayoutSpec[]) => void
  /** Phase F2 bridge: hand generated matplotlib to the Code lane and switch to it. */
  onOpenInCode: (code: string, name: string) => void
  results: LabResultCache
  onResultsChange: Dispatch<SetStateAction<LabResultCache>>
}) {
  const { status, running, analyze, exportFigure, exportLayout } = useLabRuntime()
  const [dialogOpen, setDialogOpen] = useState(false)
  // Which analysis id is currently in flight, for a per-card spinner.
  const [runningId, setRunningId] = useState<string | null>(null)

  const signature = useMemo(() => datasetSignature(columns, rows), [columns, rows])
  const dataset = useMemo(
    // `role` rides along: the Grouped/Nested analyses read their factor / subject
    // structure from column roles, not from the checkbox selection (see
    // AnalysisDataset in protocol.ts).
    () => ({
      columns: columns.map((c) => ({ id: c.id, name: c.name, type: c.type, role: c.role })),
      rows,
    }),
    [columns, rows],
  )

  async function runAnalysis(spec: AnalysisSpec) {
    setRunningId(spec.id)
    const result = await analyze(spec.analysisId, dataset, {
      columnIds: spec.columnIds,
      ...(spec.options ? { options: spec.options } : {}),
    })
    onResultsChange((r) => ({ ...r, [spec.id]: { result, signature } }))
    setRunningId(null)
  }

  async function addAnalysis(
    analysisId: string,
    columnIds: string[],
    options?: AnalysisSpec['options'],
  ) {
    const id = newAnalysisId(analyses)
    const spec: AnalysisSpec = {
      id,
      analysisId: analysisId as AnalysisSpec['analysisId'],
      columnIds,
      ...(options && Object.keys(options).length ? { options } : {}),
    }
    onAnalysesChange([...analyses, spec])
    setDialogOpen(false)
    await runAnalysis(spec)
  }

  function deleteAnalysis(id: string) {
    onAnalysesChange(analyses.filter((a) => a.id !== id))
    onResultsChange((r) => {
      const next = { ...r }
      delete next[id]
      return next
    })
  }

  // Phase F1: apply new figure-format / bracket options to a saved analysis and
  // re-run it — the "Format" control on the results sheet re-renders the figure.
  async function applyFormat(spec: AnalysisSpec, options: AnalysisSpec['options']) {
    const merged: AnalysisSpec =
      options && Object.keys(options).length
        ? { ...spec, options }
        : { id: spec.id, analysisId: spec.analysisId, columnIds: spec.columnIds }
    onAnalysesChange(analyses.map((a) => (a.id === spec.id ? merged : a)))
    await runAnalysis(merged)
  }

  // Phase F1: re-render one figure at a chosen format + DPI (matplotlib savefig
  // in the worker) and download the bytes.
  async function exportFig(
    spec: AnalysisSpec,
    figureIndex: number,
    format: FigureExportFormat,
    dpi: number,
  ): Promise<FigureExport> {
    const result = await exportFigure(
      spec.analysisId,
      dataset,
      { columnIds: spec.columnIds, ...(spec.options ? { options: spec.options } : {}) },
      figureIndex,
      format,
      dpi,
    )
    if (!result.error && result.base64) {
      const def = analysisDef(spec.analysisId)
      downloadFigureExport(
        result.base64,
        result.format,
        `${slugify(def?.label ?? spec.analysisId)}-${result.dpi}dpi.${result.format}`,
      )
    }
    return result
  }

  // Phase F2 bridge: reproduce this analysis's figure as an editable, self-
  // contained matplotlib script and open it in the Code lane (same plotting on
  // the same data → the figure matches the GUI figure).
  function openInCode(spec: AnalysisSpec) {
    const def = analysisDef(spec.analysisId)
    const code = analysisToPython(spec, { columns, rows })
    onOpenInCode(code, `${def?.label ?? spec.analysisId} (code)`)
  }

  const runtimeReady = status === 'ready'

  return (
    <div className="dt-lab" data-testid="lab-lane">
      <div className="dt-lab__bar">
        <button
          type="button"
          className="dt-btn dt-btn--primary"
          onClick={() => setDialogOpen((o) => !o)}
          data-testid="lab-analyze"
        >
          <Plus size={12} /> Analyze
        </button>
        <div className="dt-toolbar__spacer" />
        <p className="dt-code__status" role="status" aria-live="polite" data-testid="lab-status">
          {status === 'loading' && (
            <>
              <Loader2 size={11} className="animate-spin" /> Loading the analysis runtime (~65 MB,
              first time only)…
            </>
          )}
          {status === 'error' && (
            <>
              <AlertTriangle size={11} className="text-red-400" /> The analysis runtime couldn&apos;t
              load. Reload the page to try again.
            </>
          )}
          {runtimeReady && (running ? <>Running…</> : <>Runtime ready.</>)}
        </p>
      </div>

      {dialogOpen && (
        <AnalyzeDialog
          columns={columns}
          tableType={tableType}
          runtimeReady={runtimeReady}
          onCancel={() => setDialogOpen(false)}
          onRun={addAnalysis}
        />
      )}

      {analyses.length === 0 && !dialogOpen ? (
        <div className="dt-lab__empty" data-testid="lab-empty">
          <Play size={22} className="text-white/25" />
          <span className="font-pixel text-[8px] text-white/45">
            No analyses yet — click Analyze to run one.
          </span>
        </div>
      ) : (
        <div className="dt-lab__results">
          {analyses.map((spec) => (
            <AnalysisCard
              key={spec.id}
              spec={spec}
              cached={results[spec.id]}
              currentSignature={signature}
              running={runningId === spec.id}
              runtimeReady={runtimeReady}
              onRun={() => runAnalysis(spec)}
              onDelete={() => deleteAnalysis(spec.id)}
              onFormat={(options) => applyFormat(spec, options)}
              onExport={(figureIndex, format, dpi) => exportFig(spec, figureIndex, format, dpi)}
              onOpenInCode={() => openInCode(spec)}
            />
          ))}
        </div>
      )}

      {analyses.length > 0 && (
        <PosterLayouts
          analyses={analyses}
          layouts={layouts}
          onLayoutsChange={onLayoutsChange}
          dataset={dataset}
          exportLayout={exportLayout}
          runtimeReady={runtimeReady}
          running={running}
        />
      )}
    </div>
  )
}

/** Analyses whose figure is the shared group plot, so a graph family applies. */
const GROUP_FIG_ANALYSES = new Set([
  'descriptive',
  'one-sample-t',
  'unpaired-t',
  'mann-whitney',
  'one-way-anova',
  'kruskal-wallis',
])

/**
 * Phase F1 capability sets.
 *  - BRACKET: figures whose multiple-comparisons result can draw significance
 *    brackets (Column t-test / ANOVA+Tukey/Dunnett / Kruskal-Wallis+Dunn).
 *  - XY_FORMAT: XY scatter figures wired for Format Graph + Format Axes.
 * A figure is "formattable" iff it is a group figure OR an XY-format figure —
 * the two families where the format helpers are threaded through the template.
 */
const BRACKET_ANALYSES = new Set(['one-way-anova', 'kruskal-wallis', 'unpaired-t', 'mann-whitney'])
const XY_FORMAT_ANALYSES = new Set(['correlation', 'linear-regression', 'nonlinear-regression'])

type LabOptions = NonNullable<AnalysisSpec['options']>

/** The gated pick-an-analysis-then-columns panel (Prism's Analyze dialog). */
function AnalyzeDialog({
  columns,
  tableType,
  runtimeReady,
  onCancel,
  onRun,
}: {
  columns: ColumnSpec[]
  tableType: TableType
  runtimeReady: boolean
  onCancel: () => void
  onRun: (analysisId: string, columnIds: string[], options?: LabOptions) => void
}) {
  const offered = useMemo(() => analysesForTableType(tableType), [tableType])
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [options, setOptions] = useState<LabOptions>({})

  const def = analysisId ? analysisDef(analysisId) : undefined
  const pickable = def ? selectableColumns(columns, def) : []
  const selectionError = def ? analysisSelectionError(def, selected) : 'Pick an analysis first.'

  const showGraph = analysisId ? GROUP_FIG_ANALYSES.has(analysisId) : false
  const showMu0 = analysisId === 'one-sample-t'
  const showPosthoc = analysisId === 'one-way-anova'
  const showBars = analysisId === 'two-way-anova'
  // Phase D2c options.
  const showSmoothing = analysisId === 'smoothing'
  const showPartsGraph = analysisId === 'fraction-of-total'
  const showCorrMethod = analysisId === 'correlation-matrix'
  const showDependent = analysisId === 'multiple-regression'
  // Phase E1 options: both fit analyses pick an equation; nonlinear regression
  // also gets weighting, a compare-model, and per-parameter constraints; the
  // standard curve gets the unknown response to interpolate.
  const showGlobalFit = analysisId === 'global-fit'
  const showEquation =
    analysisId === 'nonlinear-regression' ||
    analysisId === 'interpolate-standard-curve' ||
    showGlobalFit
  const showFitControls = analysisId === 'nonlinear-regression'
  const showInterpolateY = analysisId === 'interpolate-standard-curve'
  const hasOptions =
    showGraph ||
    showMu0 ||
    showPosthoc ||
    showBars ||
    showSmoothing ||
    showPartsGraph ||
    showCorrMethod ||
    showDependent ||
    showEquation

  const equationMissing = showEquation && !options.equationId
  const interpMissing =
    showInterpolateY &&
    (options.interpolateY === undefined || Number.isNaN(options.interpolateY as number))
  const canRun =
    runtimeReady && def?.implemented && !selectionError && !equationMissing && !interpMissing

  function pickAnalysis(id: string) {
    setAnalysisId(id)
    // Reset the column selection AND options; a different analysis may draw from
    // a different role, a different group count, and a different option set.
    setSelected([])
    setOptions({})
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function setOpt<K extends keyof LabOptions>(key: K, value: LabOptions[K] | undefined) {
    setOptions((o) => {
      const next = { ...o }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  // Pick an equation: the parameter COUNT changes, so any per-parameter
  // constraints (indexed by position) are dropped rather than left misaligned.
  function setEquation(id: string | undefined) {
    setOptions((o) => {
      const next = { ...o }
      delete next.fixValues
      delete next.boundsLow
      delete next.boundsHigh
      delete next.compareModel
      // E2 per-parameter share/separate/fixed state is also position-indexed.
      delete next.paramModes
      delete next.fTestParam
      if (id) next.equationId = id as EquationId
      else delete next.equationId
      return next
    })
  }

  // Global-fit three-state selector: shared / separate / fixed for parameter i.
  // 'fixed' seeds a value in fixValues[i] (numbers only); the others clear it.
  function setShareMode(i: number, mode: 'shared' | 'separate' | 'fixed', len: number) {
    setOptions((o) => {
      const modes = [...(o.paramModes ?? Array<'shared' | 'separate' | 'fixed'>(len).fill('shared'))]
      while (modes.length < len) modes.push('shared')
      modes[i] = mode
      const next = { ...o, paramModes: modes }
      if (mode === 'fixed') {
        const fv: (number | null)[] = [...(next.fixValues ?? Array<number | null>(len).fill(null))]
        while (fv.length < len) fv.push(null)
        if (fv[i] === null) fv[i] = 0
        next.fixValues = fv
      } else if (next.fixValues) {
        const fv = [...next.fixValues]
        fv[i] = null
        if (fv.every((v) => v === null)) delete next.fixValues
        else next.fixValues = fv
      }
      return next
    })
  }

  type ConstraintKey = 'fixValues' | 'boundsLow' | 'boundsHigh'

  // Set one per-parameter constraint by position; drop the whole array once it
  // is all-null so the persisted spec stays clean (numbers only, no free string).
  function updateArr(key: ConstraintKey, i: number, value: number | null, len: number) {
    setOptions((o) => {
      const arr: (number | null)[] = [...(o[key] ?? Array<number | null>(len).fill(null))]
      while (arr.length < len) arr.push(null)
      arr[i] = value
      const next = { ...o }
      if (arr.every((v) => v === null)) delete next[key]
      else next[key] = arr
      return next
    })
  }

  // Switch a parameter between fit / fix-to-value / bounds. Clears the other
  // modes for that parameter so exactly one constraint kind is ever active.
  function setParamMode(i: number, mode: string, len: number) {
    setOptions((o) => {
      const clearAt = (arr?: (number | null)[]): (number | null)[] | undefined => {
        if (!arr) return undefined
        const c = [...arr]
        c[i] = null
        return c.every((v) => v === null) ? undefined : c
      }
      const next = { ...o }
      const setOrDrop = (key: ConstraintKey, v?: (number | null)[]) => {
        if (v) next[key] = v
        else delete next[key]
      }
      setOrDrop('fixValues', clearAt(next.fixValues))
      setOrDrop('boundsLow', clearAt(next.boundsLow))
      setOrDrop('boundsHigh', clearAt(next.boundsHigh))
      if (mode === 'fix') {
        const arr: (number | null)[] = [
          ...(next.fixValues ?? Array<number | null>(len).fill(null)),
        ]
        while (arr.length < len) arr.push(null)
        arr[i] = 0
        next.fixValues = arr
      }
      return next
    })
  }

  return (
    <div className="dt-analyze" data-testid="lab-analyze-dialog">
      <div className="dt-analyze__section">
        <p className="dt-field__label">Which analysis?</p>
        <div className="dt-analyze__list">
          {offered.map(({ id, def: d }) => (
            <button
              key={id}
              type="button"
              className={`dt-analyze__opt ${analysisId === id ? 'is-selected' : ''} ${
                d.implemented ? '' : 'is-disabled'
              }`}
              aria-pressed={analysisId === id}
              disabled={!d.implemented}
              onClick={() => pickAnalysis(id)}
              data-testid={`lab-analysis-${id}`}
            >
              <span className="dt-analyze__opt-label">
                {d.label}
                {d.implemented ? '' : <span className="dt-analyze__soon">coming soon</span>}
              </span>
              <span className="dt-analyze__opt-desc">{d.describe}</span>
            </button>
          ))}
        </div>
      </div>

      {def?.implemented && (
        <div className="dt-analyze__section">
          <p className="dt-field__label">Which columns? (each is one group)</p>
          {pickable.length === 0 ? (
            <p className="dt-field__hint">
              This dataset has no {def.select.numeric ? 'numeric ' : ''}
              {def.select.role.toUpperCase()} columns to analyze. Add some in the grid first.
            </p>
          ) : (
            <div className="dt-analyze__cols">
              {pickable.map((c) => (
                <label key={c.id} className="dt-check" data-testid={`lab-col-${c.id}`}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span>
                    {c.name}
                    {c.unit ? <span className="dt-analyze__unit"> ({c.unit})</span> : null}
                  </span>
                </label>
              ))}
            </div>
          )}
          {selectionError && <p className="dt-field__hint">{selectionError}</p>}
        </div>
      )}

      {def?.implemented && hasOptions && (
        <div className="dt-analyze__section" data-testid="lab-options">
          <p className="dt-field__label">Options</p>

          {showMu0 && (
            <label className="dt-analyze__opt-row">
              <span>Hypothesized mean</span>
              <input
                type="number"
                className="dt-input"
                value={options.mu0 ?? 0}
                onChange={(e) =>
                  setOpt('mu0', e.target.value === '' ? undefined : Number(e.target.value))
                }
                data-testid="lab-opt-mu0"
              />
            </label>
          )}

          {showPosthoc && (
            <>
              <label className="dt-analyze__opt-row">
                <span>Multiple comparisons</span>
                <div className="ops-select-wrap">
                  <select
                    className="ops-select"
                    value={options.posthoc ?? 'none'}
                    onChange={(e) => {
                      const v = e.target.value as LabOptions['posthoc']
                      setOpt('posthoc', v === 'none' ? undefined : v)
                      // vs-control needs a control; default it to the first picked column.
                      if (v === 'dunnett' && !options.controlColumnId && selected[0])
                        setOpt('controlColumnId', selected[0])
                    }}
                    data-testid="lab-opt-posthoc"
                  >
                    <option value="none">None</option>
                    <option value="tukey">All pairs</option>
                    <option value="dunnett">vs a control</option>
                  </select>
                </div>
              </label>

              {options.posthoc === 'tukey' && (
                <label className="dt-analyze__opt-row">
                  <span>Correction</span>
                  <div className="ops-select-wrap">
                    <select
                      className="ops-select"
                      value={options.correction ?? 'tukey'}
                      onChange={(e) =>
                        setOpt('correction', e.target.value as LabOptions['correction'])
                      }
                      data-testid="lab-opt-correction"
                    >
                      <option value="tukey">Tukey HSD</option>
                      <option value="bonferroni">Bonferroni</option>
                      <option value="holm-sidak">Holm-Sidak</option>
                      <option value="fdr_bh">FDR (Benjamini-Hochberg)</option>
                    </select>
                  </div>
                </label>
              )}

              {options.posthoc === 'dunnett' && (
                <label className="dt-analyze__opt-row">
                  <span>Control group</span>
                  <div className="ops-select-wrap">
                    <select
                      className="ops-select"
                      value={options.controlColumnId ?? ''}
                      onChange={(e) => setOpt('controlColumnId', e.target.value || undefined)}
                      data-testid="lab-opt-control"
                    >
                      <option value="">Choose a control…</option>
                      {selected.map((id) => (
                        <option key={id} value={id}>
                          {columns.find((c) => c.id === id)?.name ?? id}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              )}
            </>
          )}

          {showGraph && (
            <>
              <label className="dt-analyze__opt-row">
                <span>Graph</span>
                <div className="ops-select-wrap">
                  <select
                    className="ops-select"
                    value={options.graph ?? 'bar'}
                    onChange={(e) => {
                      const v = e.target.value as LabOptions['graph']
                      setOpt('graph', v === 'bar' ? undefined : v)
                    }}
                    data-testid="lab-opt-graph"
                  >
                    <option value="bar">Bar + SD, points</option>
                    <option value="box">Box-whisker</option>
                    <option value="violin">Violin</option>
                  </select>
                </div>
              </label>

              {options.graph === 'box' && (
                <label className="dt-analyze__opt-row">
                  <span>Whiskers</span>
                  <div className="ops-select-wrap">
                    <select
                      className="ops-select"
                      value={options.whiskers ?? 'tukey'}
                      onChange={(e) =>
                        setOpt('whiskers', e.target.value as LabOptions['whiskers'])
                      }
                      data-testid="lab-opt-whiskers"
                    >
                      <option value="tukey">Tukey (1.5 x IQR)</option>
                      <option value="minmax">Min to max</option>
                      <option value="p10_90">10th-90th percentile</option>
                    </select>
                  </div>
                </label>
              )}
            </>
          )}

          {showBars && (
            <label className="dt-analyze__opt-row">
              <span>Graph</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.bars ?? 'interleaved'}
                  onChange={(e) => {
                    const v = e.target.value as LabOptions['bars']
                    setOpt('bars', v === 'interleaved' ? undefined : v)
                  }}
                  data-testid="lab-opt-bars"
                >
                  <option value="interleaved">Interleaved bars</option>
                  <option value="stacked">Stacked bars</option>
                  <option value="separated">Separated bars</option>
                  <option value="scatter">Grouped scatter</option>
                  <option value="heatmap">Heatmap</option>
                </select>
              </div>
            </label>
          )}

          {showSmoothing && (
            <>
              <label className="dt-analyze__opt-row">
                <span>Smoother</span>
                <div className="ops-select-wrap">
                  <select
                    className="ops-select"
                    value={options.smoother ?? 'moving-average'}
                    onChange={(e) => {
                      const v = e.target.value as LabOptions['smoother']
                      setOpt('smoother', v === 'moving-average' ? undefined : v)
                    }}
                    data-testid="lab-opt-smoother"
                  >
                    <option value="moving-average">Moving average</option>
                    <option value="lowess">LOWESS</option>
                  </select>
                </div>
              </label>

              {(options.smoother ?? 'moving-average') === 'moving-average' && (
                <label className="dt-analyze__opt-row">
                  <span>Window (points)</span>
                  <input
                    type="number"
                    className="dt-input"
                    min={2}
                    step={1}
                    value={options.window ?? 3}
                    onChange={(e) => {
                      const n = Math.round(Number(e.target.value))
                      setOpt('window', Number.isFinite(n) && n >= 2 ? n : undefined)
                    }}
                    data-testid="lab-opt-window"
                  />
                </label>
              )}
            </>
          )}

          {showPartsGraph && (
            <label className="dt-analyze__opt-row">
              <span>Graph</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.graph ?? 'pie'}
                  onChange={(e) => {
                    const v = e.target.value as LabOptions['graph']
                    setOpt('graph', v === 'pie' ? undefined : v)
                  }}
                  data-testid="lab-opt-parts-graph"
                >
                  <option value="pie">Pie</option>
                  <option value="donut">Donut</option>
                  <option value="stacked">Stacked bar</option>
                </select>
              </div>
            </label>
          )}

          {showCorrMethod && (
            <label className="dt-analyze__opt-row">
              <span>Method</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.method ?? 'pearson'}
                  onChange={(e) => {
                    const v = e.target.value as LabOptions['method']
                    setOpt('method', v === 'pearson' ? undefined : v)
                  }}
                  data-testid="lab-opt-method"
                >
                  <option value="pearson">Pearson (linear)</option>
                  <option value="spearman">Spearman (rank)</option>
                </select>
              </div>
            </label>
          )}

          {showDependent && (
            <label className="dt-analyze__opt-row">
              <span>Predict (dependent)</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.dependentColumnId ?? selected[0] ?? ''}
                  onChange={(e) => setOpt('dependentColumnId', e.target.value || undefined)}
                  data-testid="lab-opt-dependent"
                >
                  {selected.length === 0 && <option value="">Pick columns first…</option>}
                  {selected.map((id) => (
                    <option key={id} value={id}>
                      {columns.find((c) => c.id === id)?.name ?? id}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}

          {/* Phase E1: the equation picker, organized by domain (plan §5). */}
          {showEquation && (
            <label className="dt-analyze__opt-row">
              <span>Equation</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.equationId ?? ''}
                  onChange={(e) => setEquation(e.target.value || undefined)}
                  data-testid="lab-opt-equation"
                >
                  <option value="">Choose an equation…</option>
                  {equationsByDomain().map(({ domain, equations }) => (
                    <optgroup key={domain} label={domain}>
                      {equations.map(({ id, def: eqDef }) => (
                        <option key={id} value={id}>
                          {eqDef.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </label>
          )}

          {showInterpolateY && (
            <label className="dt-analyze__opt-row">
              <span>Interpolate response (Y)</span>
              <input
                type="number"
                className="dt-input"
                value={options.interpolateY ?? ''}
                onChange={(e) =>
                  setOpt('interpolateY', e.target.value === '' ? undefined : Number(e.target.value))
                }
                data-testid="lab-opt-interp-y"
              />
            </label>
          )}

          {showFitControls && (
            <label className="dt-analyze__opt-row">
              <span>Weighting</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.weighting ?? 'none'}
                  onChange={(e) => {
                    const v = e.target.value as LabOptions['weighting']
                    setOpt('weighting', v === 'none' ? undefined : v)
                  }}
                  data-testid="lab-opt-weighting"
                >
                  <option value="none">None (equal)</option>
                  <option value="1/Y2">1 / Y²</option>
                  <option value="1/Y">1 / Y</option>
                  <option value="poisson">Poisson</option>
                </select>
              </div>
            </label>
          )}

          {showFitControls && options.equationId && (
            <label className="dt-analyze__opt-row">
              <span>Compare with (F test)</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.compareModel ?? ''}
                  onChange={(e) =>
                    setOpt(
                      'compareModel',
                      (e.target.value || undefined) as LabOptions['compareModel'],
                    )
                  }
                  data-testid="lab-opt-compare"
                >
                  <option value="">None</option>
                  {equationsByDomain().map(({ domain, equations }) => (
                    <optgroup key={domain} label={domain}>
                      {equations
                        .filter(({ id }) => id !== options.equationId)
                        .map(({ id, def: eqDef }) => (
                          <option key={id} value={id}>
                            {eqDef.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </label>
          )}

          {/* Per-parameter constraint: fit / fix-to-value / bounds — numbers only. */}
          {showFitControls && options.equationId && (
            <div data-testid="lab-opt-constraints">
              <p className="dt-field__hint">Parameter constraints (optional):</p>
              {(equationDef(options.equationId)?.params ?? []).map((pname, i, params) => {
                const len = params.length
                const fix = options.fixValues?.[i] ?? null
                const lo = options.boundsLow?.[i] ?? null
                const hi = options.boundsHigh?.[i] ?? null
                const mode = fix !== null ? 'fix' : lo !== null || hi !== null ? 'bounds' : 'fit'
                return (
                  <div key={pname} className="dt-analyze__opt-row" data-testid={`lab-param-${i}`}>
                    <span>{pname}</span>
                    <div className="ops-select-wrap">
                      <select
                        className="ops-select"
                        value={mode}
                        onChange={(e) => setParamMode(i, e.target.value, len)}
                        data-testid={`lab-param-mode-${i}`}
                      >
                        <option value="fit">Fit</option>
                        <option value="fix">Fix to…</option>
                        <option value="bounds">Bounds…</option>
                      </select>
                    </div>
                    {mode === 'fix' && (
                      <input
                        type="number"
                        className="dt-input"
                        value={fix ?? 0}
                        onChange={(e) =>
                          updateArr(
                            'fixValues',
                            i,
                            e.target.value === '' ? null : Number(e.target.value),
                            len,
                          )
                        }
                        data-testid={`lab-param-fix-${i}`}
                      />
                    )}
                    {mode === 'bounds' && (
                      <>
                        <input
                          type="number"
                          className="dt-input"
                          placeholder="min"
                          value={lo ?? ''}
                          onChange={(e) =>
                            updateArr(
                              'boundsLow',
                              i,
                              e.target.value === '' ? null : Number(e.target.value),
                              len,
                            )
                          }
                          data-testid={`lab-param-lo-${i}`}
                        />
                        <input
                          type="number"
                          className="dt-input"
                          placeholder="max"
                          value={hi ?? ''}
                          onChange={(e) =>
                            updateArr(
                              'boundsHigh',
                              i,
                              e.target.value === '' ? null : Number(e.target.value),
                              len,
                            )
                          }
                          data-testid={`lab-param-hi-${i}`}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Phase E2 (global fitting): weighting + the three-state parameter
              table (shared across curves / separate for each / fixed) + an
              optional shared-vs-separate F test. Numbers/enums only. */}
          {showGlobalFit && (
            <label className="dt-analyze__opt-row">
              <span>Weighting</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.weighting ?? 'none'}
                  onChange={(e) => {
                    const v = e.target.value as LabOptions['weighting']
                    setOpt('weighting', v === 'none' ? undefined : v)
                  }}
                  data-testid="lab-gf-weighting"
                >
                  <option value="none">None (equal)</option>
                  <option value="1/Y2">1 / Y²</option>
                  <option value="1/Y">1 / Y</option>
                  <option value="poisson">Poisson</option>
                </select>
              </div>
            </label>
          )}

          {showGlobalFit && options.equationId && (
            <div data-testid="lab-gf-params">
              <p className="dt-field__hint">
                Each parameter across the curves: shared, separate, or fixed (optional bounds):
              </p>
              {(equationDef(options.equationId)?.params ?? []).map((pname, i, params) => {
                const len = params.length
                const mode = options.paramModes?.[i] ?? 'shared'
                const fix = options.fixValues?.[i] ?? null
                const lo = options.boundsLow?.[i] ?? null
                const hi = options.boundsHigh?.[i] ?? null
                return (
                  <div key={pname} className="dt-analyze__opt-row" data-testid={`lab-gf-param-${i}`}>
                    <span>{pname}</span>
                    <div className="ops-select-wrap">
                      <select
                        className="ops-select"
                        value={mode}
                        onChange={(e) =>
                          setShareMode(i, e.target.value as 'shared' | 'separate' | 'fixed', len)
                        }
                        data-testid={`lab-share-mode-${i}`}
                      >
                        <option value="shared">Shared across curves</option>
                        <option value="separate">Separate for each</option>
                        <option value="fixed">Fixed to…</option>
                      </select>
                    </div>
                    {mode === 'fixed' ? (
                      <input
                        type="number"
                        className="dt-input"
                        value={fix ?? 0}
                        onChange={(e) =>
                          updateArr(
                            'fixValues',
                            i,
                            e.target.value === '' ? null : Number(e.target.value),
                            len,
                          )
                        }
                        data-testid={`lab-gf-fix-${i}`}
                      />
                    ) : (
                      <>
                        <input
                          type="number"
                          className="dt-input"
                          placeholder="min"
                          value={lo ?? ''}
                          onChange={(e) =>
                            updateArr(
                              'boundsLow',
                              i,
                              e.target.value === '' ? null : Number(e.target.value),
                              len,
                            )
                          }
                          data-testid={`lab-gf-lo-${i}`}
                        />
                        <input
                          type="number"
                          className="dt-input"
                          placeholder="max"
                          value={hi ?? ''}
                          onChange={(e) =>
                            updateArr(
                              'boundsHigh',
                              i,
                              e.target.value === '' ? null : Number(e.target.value),
                              len,
                            )
                          }
                          data-testid={`lab-gf-hi-${i}`}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {showGlobalFit && options.equationId && (
            <label className="dt-analyze__opt-row">
              <span>Test if a parameter differs (F test)</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={options.fTestParam ?? ''}
                  onChange={(e) =>
                    setOpt('fTestParam', e.target.value === '' ? undefined : Number(e.target.value))
                  }
                  data-testid="lab-gf-ftest"
                >
                  <option value="">None</option>
                  {(equationDef(options.equationId)?.params ?? []).map((pname, i) => (
                    <option key={pname} value={i}>
                      {pname} (shared vs separate)
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
        </div>
      )}

      <div className="dt-actions">
        <button
          type="button"
          className="dt-btn dt-btn--primary"
          disabled={!canRun}
          onClick={() => def && onRun(analysisId!, selected, options)}
          title={
            !runtimeReady
              ? 'The analysis runtime is still loading.'
              : equationMissing
                ? 'Choose an equation to fit.'
                : interpMissing
                  ? 'Enter the response value to interpolate.'
                  : undefined
          }
          data-testid="lab-run"
        >
          <Play size={12} /> Run
        </button>
        <button type="button" className="dt-btn" onClick={onCancel} data-testid="lab-cancel">
          Cancel
        </button>
      </div>
    </div>
  )
}

/** One saved analysis: its result sheet, assumptions, guide entry, figure. */
function AnalysisCard({
  spec,
  cached,
  currentSignature,
  running,
  runtimeReady,
  onRun,
  onDelete,
  onFormat,
  onExport,
  onOpenInCode,
}: {
  spec: AnalysisSpec
  cached?: { result: AnalysisResult; signature: string }
  currentSignature: string
  running: boolean
  runtimeReady: boolean
  onRun: () => void
  onDelete: () => void
  onFormat: (options: AnalysisSpec['options']) => void | Promise<void>
  onExport: (figureIndex: number, format: FigureExportFormat, dpi: number) => Promise<FigureExport>
  onOpenInCode: () => void
}) {
  const def = analysisDef(spec.analysisId)
  const stale = cached ? cached.signature !== currentSignature : false
  const result = cached?.result

  return (
    <section className="dt-analysis" data-testid={`lab-result-${spec.id}`} aria-label={def?.label}>
      <header className="dt-analysis__head">
        <span className="dt-analysis__title">{def?.label ?? spec.analysisId}</span>
        <div className="dt-analysis__actions">
          <button
            type="button"
            className="dt-btn"
            disabled={running || !runtimeReady}
            onClick={onRun}
            data-testid={`lab-rerun-${spec.id}`}
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}{' '}
            {result ? 'Re-run' : 'Run'}
          </button>
          <button
            type="button"
            className="dt-btn"
            onClick={onOpenInCode}
            title="Reproduce this figure as an editable matplotlib script in the Code lane"
            data-testid={`lab-open-code-${spec.id}`}
          >
            <Code2 size={11} /> Open in Code mode
          </button>
          <button
            type="button"
            className="dt-btn dt-btn--danger"
            onClick={onDelete}
            aria-label={`Delete ${def?.label ?? 'analysis'}`}
            data-testid={`lab-delete-${spec.id}`}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </header>

      {stale && (
        <div className="dt-banner dt-banner--danger" role="status" data-testid={`lab-stale-${spec.id}`}>
          <AlertTriangle size={12} /> The data changed since this ran — re-run to refresh the result.
        </div>
      )}

      {!result ? (
        <p className="dt-analysis__hint" role="status">
          {running ? 'Computing…' : 'Not computed yet — press Run.'}
        </p>
      ) : result.error ? (
        <>
          {/* LOUD failure banner: a refused/non-converged run never shows values. */}
          <div
            className="dt-banner dt-banner--danger"
            role="alert"
            data-testid={`lab-error-banner-${spec.id}`}
          >
            <AlertTriangle size={12} /> This run did not produce a result — no best-fit values are
            shown.
          </div>
          <pre className="dt-code__error" data-testid={`lab-error-${spec.id}`}>{result.error}</pre>
        </>
      ) : (
        <div className={`dt-analysis__body ${stale ? 'is-stale' : ''}`}>
          <StatBlock stats={result.stats} />
          {(result.tables ?? []).map((t, i) => (
            <ResultTable key={i} table={t} />
          ))}
          {result.assumptions && result.assumptions.length > 0 && (
            <AssumptionsChecklist assumptions={result.assumptions} />
          )}
          {result.figures.map((svg, i) => (
            // SECURITY: inert <img> render only — never dangerouslySetInnerHTML.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="dt-analysis__figure"
              src={figureDataUrl(svg)}
              alt={`${def?.label ?? 'Analysis'} figure ${i + 1}`}
              data-testid={`lab-figure-${spec.id}`}
            />
          ))}
          {result.figures.length > 0 && (
            <FigureTools
              spec={spec}
              figureCount={result.figures.length}
              running={running}
              runtimeReady={runtimeReady}
              stale={stale}
              onFormat={onFormat}
              onExport={onExport}
            />
          )}
          {def && <GuideEntry guideId={def.guideId} specId={spec.id} />}
        </div>
      )}
    </section>
  )
}

/**
 * Phase F1 per-figure tools on the results sheet: a "Format figure" panel
 * (bounded Format Graph / Format Axes / significance-bracket options that
 * re-run the analysis) and an export bar (format + DPI → matplotlib savefig,
 * downloaded as bytes).
 */
function FigureTools({
  spec,
  figureCount,
  running,
  runtimeReady,
  stale,
  onFormat,
  onExport,
}: {
  spec: AnalysisSpec
  figureCount: number
  running: boolean
  runtimeReady: boolean
  stale: boolean
  onFormat: (options: AnalysisSpec['options']) => void | Promise<void>
  onExport: (figureIndex: number, format: FigureExportFormat, dpi: number) => Promise<FigureExport>
}) {
  const [format, setFormat] = useState<FigureExportFormat>('png')
  const [dpi, setDpi] = useState(300)
  const [figIndex, setFigIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const formattable =
    GROUP_FIG_ANALYSES.has(spec.analysisId) || XY_FORMAT_ANALYSES.has(spec.analysisId)
  // Export re-renders from the CURRENT dataset, but a stale result's on-screen
  // figure is still the OLD one -- exporting now would ship bytes that don't
  // match the display. Block it until a re-run brings the two back in sync.
  const busy = exporting || running || !runtimeReady || stale

  async function doExport() {
    if (stale) return
    setExporting(true)
    setExportError(null)
    const result = await onExport(Math.min(figIndex, Math.max(0, figureCount - 1)), format, dpi)
    if (result.error) setExportError(result.error)
    setExporting(false)
  }

  return (
    <div className="dt-analysis__figtools" data-testid={`lab-figtools-${spec.id}`}>
      {formattable && (
        <FormatPanel spec={spec} disabled={running || !runtimeReady} onApply={onFormat} />
      )}
      <div className="dt-analysis__export">
        <span className="dt-field__label">Export figure</span>
        {figureCount > 1 && (
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={figIndex}
              onChange={(e) => setFigIndex(Number(e.target.value))}
              aria-label="Which figure to export"
              data-testid={`lab-export-figure-${spec.id}`}
            >
              {Array.from({ length: figureCount }, (_, i) => (
                <option key={i} value={i}>
                  Figure {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="ops-select-wrap">
          <select
            className="ops-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as FigureExportFormat)}
            aria-label="Export format"
            data-testid={`lab-export-format-${spec.id}`}
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <div className="ops-select-wrap">
          <select
            className="ops-select"
            value={dpi}
            onChange={(e) => setDpi(Number(e.target.value))}
            aria-label="Export resolution (DPI)"
            data-testid={`lab-export-dpi-${spec.id}`}
          >
            <option value={72}>72 dpi</option>
            <option value={150}>150 dpi</option>
            <option value={300}>300 dpi (print)</option>
            <option value={600}>600 dpi</option>
          </select>
        </div>
        <button
          type="button"
          className="dt-btn"
          disabled={busy}
          onClick={doExport}
          title={stale ? 'Re-run this analysis to refresh the figure before exporting.' : undefined}
          data-testid={`lab-export-${spec.id}`}
        >
          {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
        </button>
      </div>
      {stale && (
        <p className="dt-field__hint" data-testid={`lab-export-stale-${spec.id}`}>
          Export is disabled until you re-run — the displayed figure is out of date.
        </p>
      )}
      {exportError && (
        <p className="dt-field__hint" role="alert" data-testid={`lab-export-error-${spec.id}`}>
          {exportError}
        </p>
      )}
    </div>
  )
}

/** The bounded Format Graph / Format Axes / brackets editor (re-runs on Apply). */
function FormatPanel({
  spec,
  disabled,
  onApply,
}: {
  spec: AnalysisSpec
  disabled: boolean
  onApply: (options: AnalysisSpec['options']) => void | Promise<void>
}) {
  // Seed the draft from the saved options so non-format options (posthoc, the
  // fitted equation, …) ride through Apply untouched — this panel only edits the
  // figure-craft keys and hands the WHOLE options object back.
  const [draft, setDraft] = useState<LabOptions>(spec.options ?? {})

  const canBracket = BRACKET_ANALYSES.has(spec.analysisId)
  const isGroup = GROUP_FIG_ANALYSES.has(spec.analysisId)
  const isXY = XY_FORMAT_ANALYSES.has(spec.analysisId)

  function set<K extends keyof LabOptions>(key: K, value: LabOptions[K] | undefined) {
    setDraft((o) => {
      const next = { ...o }
      // An empty / default value drops the key so the persisted spec stays clean
      // (default = absent, which the template reads as "unchanged").
      if (value === undefined || value === '') delete next[key]
      else next[key] = value
      return next
    })
  }
  // Clamps to `bounds` when given, so an out-of-range entry is coerced into
  // what AnalysisOptionsSchema accepts instead of silently failing to persist
  // (the HTML min/max on the <input> is only a soft hint -- typing past it,
  // or pasting, bypasses it entirely).
  const num = (v: string, bounds?: { min: number; max: number }): number | undefined => {
    if (v === '') return undefined
    const n = Number(v)
    if (!Number.isFinite(n)) return undefined
    return bounds ? Math.min(bounds.max, Math.max(bounds.min, n)) : n
  }
  // Mirrors AnalysisOptionsSchema's symbolSize bounds (lib/data-terminal/
  // dataset-schema.ts) -- keep the two in sync if that schema ever changes.
  const SYMBOL_SIZE_BOUNDS = { min: 1, max: 40 }
  const scaleOptions = (
    <>
      <option value="linear">Linear</option>
      <option value="log10">Log10</option>
      <option value="log2">Log2</option>
      <option value="ln">Ln</option>
    </>
  )

  return (
    <details className="dt-analysis__format" data-testid={`lab-format-${spec.id}`}>
      <summary className="dt-analysis__format-summary">Format figure</summary>
      <div className="dt-analysis__format-body">
        {canBracket && (
          <label className="dt-analyze__opt-row">
            <span>Significance brackets</span>
            <div className="ops-select-wrap">
              <select
                className="ops-select"
                value={draft.brackets ?? 'none'}
                onChange={(e) =>
                  set(
                    'brackets',
                    e.target.value === 'none'
                      ? undefined
                      : (e.target.value as LabOptions['brackets']),
                  )
                }
                data-testid={`lab-fmt-brackets-${spec.id}`}
              >
                <option value="none">None</option>
                <option value="stars">Stars (* / ** / ***)</option>
                <option value="pvalue">Adjusted p-value</option>
              </select>
            </div>
          </label>
        )}

        <label className="dt-analyze__opt-row">
          <span>Symbol</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={draft.symbol ?? 'circle'}
              onChange={(e) =>
                set('symbol', e.target.value === 'circle' ? undefined : (e.target.value as LabOptions['symbol']))
              }
              data-testid={`lab-fmt-symbol-${spec.id}`}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="diamond">Diamond</option>
            </select>
          </div>
        </label>

        <label className="dt-analyze__opt-row">
          <span>Symbol size</span>
          <input
            type="number"
            className="dt-input"
            min={1}
            max={40}
            placeholder="default"
            value={draft.symbolSize ?? ''}
            onChange={(e) => set('symbolSize', num(e.target.value, SYMBOL_SIZE_BOUNDS))}
            data-testid={`lab-fmt-size-${spec.id}`}
          />
        </label>

        <label className="dt-analyze__opt-row">
          <span>Fill</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={draft.symbolFill ?? 'filled'}
              onChange={(e) => set('symbolFill', e.target.value === 'filled' ? undefined : 'open')}
              data-testid={`lab-fmt-fill-${spec.id}`}
            >
              <option value="filled">Filled</option>
              <option value="open">Open</option>
            </select>
          </div>
        </label>

        {isGroup && (
          <label className="dt-analyze__opt-row">
            <span>Error bars</span>
            <div className="ops-select-wrap">
              <select
                className="ops-select"
                value={draft.errorBarDir ?? 'both'}
                onChange={(e) =>
                  set(
                    'errorBarDir',
                    e.target.value === 'both' ? undefined : (e.target.value as LabOptions['errorBarDir']),
                  )
                }
                data-testid={`lab-fmt-errdir-${spec.id}`}
              >
                <option value="both">Both</option>
                <option value="up">Up only</option>
                <option value="down">Down only</option>
              </select>
            </div>
          </label>
        )}

        <label className="dt-analyze__opt-row">
          <span>X axis title</span>
          <input
            type="text"
            className="dt-input"
            maxLength={80}
            placeholder="default"
            value={draft.xAxisTitle ?? ''}
            onChange={(e) => set('xAxisTitle', e.target.value || undefined)}
            data-testid={`lab-fmt-xtitle-${spec.id}`}
          />
        </label>
        <label className="dt-analyze__opt-row">
          <span>Y axis title</span>
          <input
            type="text"
            className="dt-input"
            maxLength={80}
            placeholder="default"
            value={draft.yAxisTitle ?? ''}
            onChange={(e) => set('yAxisTitle', e.target.value || undefined)}
            data-testid={`lab-fmt-ytitle-${spec.id}`}
          />
        </label>

        <label className="dt-analyze__opt-row">
          <span>Y scale</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={draft.yScale ?? 'linear'}
              onChange={(e) =>
                set('yScale', e.target.value === 'linear' ? undefined : (e.target.value as LabOptions['yScale']))
              }
              data-testid={`lab-fmt-yscale-${spec.id}`}
            >
              {scaleOptions}
            </select>
          </div>
        </label>
        <label className="dt-analyze__opt-row">
          <span>Y min / max</span>
          <input
            type="number"
            className="dt-input"
            placeholder="min"
            value={draft.yMin ?? ''}
            onChange={(e) => set('yMin', num(e.target.value))}
            data-testid={`lab-fmt-ymin-${spec.id}`}
          />
          <input
            type="number"
            className="dt-input"
            placeholder="max"
            value={draft.yMax ?? ''}
            onChange={(e) => set('yMax', num(e.target.value))}
            data-testid={`lab-fmt-ymax-${spec.id}`}
          />
        </label>

        {isXY && (
          <>
            <label className="dt-analyze__opt-row">
              <span>X scale</span>
              <div className="ops-select-wrap">
                <select
                  className="ops-select"
                  value={draft.xScale ?? 'linear'}
                  onChange={(e) =>
                    set('xScale', e.target.value === 'linear' ? undefined : (e.target.value as LabOptions['xScale']))
                  }
                  data-testid={`lab-fmt-xscale-${spec.id}`}
                >
                  {scaleOptions}
                </select>
              </div>
            </label>
            <label className="dt-analyze__opt-row">
              <span>X min / max</span>
              <input
                type="number"
                className="dt-input"
                placeholder="min"
                value={draft.xMin ?? ''}
                onChange={(e) => set('xMin', num(e.target.value))}
                data-testid={`lab-fmt-xmin-${spec.id}`}
              />
              <input
                type="number"
                className="dt-input"
                placeholder="max"
                value={draft.xMax ?? ''}
                onChange={(e) => set('xMax', num(e.target.value))}
                data-testid={`lab-fmt-xmax-${spec.id}`}
              />
            </label>
          </>
        )}

        <label className="dt-analyze__opt-row">
          <span>Minor ticks</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={draft.minorTicks ?? 'off'}
              onChange={(e) => set('minorTicks', e.target.value === 'off' ? undefined : 'on')}
              data-testid={`lab-fmt-minor-${spec.id}`}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </div>
        </label>

        <button
          type="button"
          className="dt-btn dt-btn--primary"
          disabled={disabled}
          onClick={() => onApply(Object.keys(draft).length ? draft : undefined)}
          data-testid={`lab-format-apply-${spec.id}`}
        >
          Apply format
        </button>
      </div>
    </details>
  )
}

/** The headline scalars as a compact key/value grid. */
function StatBlock({ stats }: { stats: AnalysisResult['stats'] }) {
  const entries = Object.entries(stats)
  if (entries.length === 0) return null
  return (
    <dl className="dt-analysis__stats" data-testid="lab-stats">
      {entries.map(([k, v]) => (
        <div key={k} className="dt-analysis__stat">
          <dt>{k}</dt>
          <dd>{typeof v === 'number' ? formatNumber(v) : (v ?? '—')}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A per-group breakdown table (e.g. descriptive stats). */
function ResultTable({ table }: { table: NonNullable<AnalysisResult['tables']>[number] }) {
  return (
    <div className="dt-analysis__tablewrap">
      <p className="dt-analysis__tabletitle">{table.title}</p>
      <table className="dt-analysis__table">
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{typeof cell === 'number' ? formatNumber(cell) : (cell ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The assumptions checklist, evaluated against the actual n/normality/variance. */
function AssumptionsChecklist({
  assumptions,
}: {
  assumptions: NonNullable<AnalysisResult['assumptions']>
}) {
  return (
    <ul className="dt-analysis__assumptions" data-testid="lab-assumptions">
      {assumptions.map((a, i) => (
        <li key={i} className={a.passed ? 'is-pass' : 'is-fail'}>
          {a.passed ? <Check size={12} /> : <X size={12} />}
          <span className="dt-analysis__assumption-label">{a.label}</span>
          <span className="dt-analysis__assumption-detail">{a.detail}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The matching guide entry, opened inline — the feature Prism can't match
 * (plan §5, "Where scienium is better"). Zero LLM cost: the concept is authored
 * content, looked up by id. Resolved against the Stats Guide first, then the
 * Data Quality guide — the nested analyses link its `pseudoreplication` entry,
 * which is a data-quality concept, not a stats one. Both guides share the
 * `{ id, title, definition, whenToUse }` shape the render needs.
 */
function GuideEntry({ guideId, specId }: { guideId: string; specId: string }) {
  const concept =
    STATS_GUIDE.find((c) => c.id === guideId) ??
    DATA_QUALITY_GUIDE.find((c) => c.id === guideId)
  if (!concept) return null
  return (
    <details className="dt-analysis__guide" data-testid={`lab-guide-${specId}`}>
      <summary>
        <BookOpen size={12} /> Guide: {concept.title}
      </summary>
      <p className="dt-analysis__guide-body">{concept.definition}</p>
      {concept.whenToUse && <p className="dt-analysis__guide-body">{concept.whenToUse}</p>}
    </details>
  )
}

/** Deterministic analysis id (`a1`, `a2`, …), unique within the array. */
function newAnalysisId(existing: AnalysisSpec[]): string {
  let n = existing.length + 1
  const taken = new Set(existing.map((a) => a.id))
  while (taken.has(`a${n}`)) n++
  return `a${n}`
}
