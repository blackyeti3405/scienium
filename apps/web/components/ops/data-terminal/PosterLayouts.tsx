'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Download, Loader2, LayoutGrid } from 'lucide-react'
import { analysisDef } from '@/lib/data-terminal/analyses'
import { downloadFigureExport, slugify } from '@/lib/data-terminal/export'
import {
  MAX_LAYOUTS,
  MAX_LAYOUT_DIM,
  type AnalysisSpec,
  type LayoutSpec,
} from '@/lib/data-terminal/dataset-schema'
import type {
  AnalysisDataset,
  FigureExport,
  FigureExportFormat,
  LayoutPanel,
} from '@/lib/data-terminal/runtime/protocol'

/**
 * Poster layouts (Phase F2): compose several SAVED Lab analyses into ONE
 * multi-panel figure with A/B/C panel labels — a science-fair poster board is
 * the deliverable of a fair, so this is a shipping requirement (plan §5).
 *
 * A layout is `{ id, name, rows, cols, panels: [{analysisId}] }`, ordered
 * A, B, C… and filled row-major into a `rows × cols` grid. It rides the same
 * `useDatasetEditor` autosave as everything else (never an independent save).
 * Export re-runs each panel's analysis from source in the Lab worker and
 * rasterises it into a subplot at the chosen DPI — reusing F1's export bar.
 */
export function PosterLayouts({
  analyses,
  layouts,
  onLayoutsChange,
  dataset,
  exportLayout,
  runtimeReady,
  running,
}: {
  analyses: AnalysisSpec[]
  layouts: LayoutSpec[]
  onLayoutsChange: (layouts: LayoutSpec[]) => void
  dataset: AnalysisDataset
  exportLayout: (
    dataset: AnalysisDataset,
    panels: LayoutPanel[],
    rows: number,
    cols: number,
    format: FigureExportFormat,
    dpi: number,
  ) => Promise<FigureExport>
  runtimeReady: boolean
  running: boolean
}) {
  function addLayout() {
    if (layouts.length >= MAX_LAYOUTS || analyses.length === 0) return
    const taken = new Set(layouts.map((l) => l.id))
    let n = layouts.length + 1
    while (taken.has(`ly${n}`)) n++
    // Seed a 1×2 board with the first (up to two) saved analyses — the poster AC.
    const panels = analyses.slice(0, 2).map((a) => ({ analysisId: a.id }))
    onLayoutsChange([
      ...layouts,
      { id: `ly${n}`, name: `Poster ${layouts.length + 1}`, rows: 1, cols: 2, panels },
    ])
  }

  function update(id: string, next: LayoutSpec) {
    onLayoutsChange(layouts.map((l) => (l.id === id ? next : l)))
  }

  function remove(id: string) {
    onLayoutsChange(layouts.filter((l) => l.id !== id))
  }

  return (
    <section className="dt-posters" data-testid="poster-layouts" aria-label="Poster layouts">
      <div className="dt-posters__head">
        <span className="dt-analysis__title">
          <LayoutGrid size={12} /> Poster layouts
        </span>
        <button
          type="button"
          className="dt-btn"
          onClick={addLayout}
          disabled={layouts.length >= MAX_LAYOUTS || analyses.length === 0}
          title={analyses.length === 0 ? 'Run an analysis first — a poster panel is a saved analysis.' : undefined}
          data-testid="layout-add"
        >
          <Plus size={12} /> New layout
        </button>
      </div>

      {analyses.length === 0 ? (
        <p className="dt-field__hint">
          Poster layouts arrange your saved analyses into one figure. Run an analysis first.
        </p>
      ) : layouts.length === 0 ? (
        <p className="dt-field__hint" data-testid="layout-empty">
          No layouts yet — click New layout to build a multi-panel poster.
        </p>
      ) : (
        layouts.map((layout) => (
          <LayoutEditor
            key={layout.id}
            layout={layout}
            analyses={analyses}
            dataset={dataset}
            exportLayout={exportLayout}
            runtimeReady={runtimeReady}
            running={running}
            onChange={(next) => update(layout.id, next)}
            onDelete={() => remove(layout.id)}
          />
        ))
      )}
    </section>
  )
}

function LayoutEditor({
  layout,
  analyses,
  dataset,
  exportLayout,
  runtimeReady,
  running,
  onChange,
  onDelete,
}: {
  layout: LayoutSpec
  analyses: AnalysisSpec[]
  dataset: AnalysisDataset
  exportLayout: (
    dataset: AnalysisDataset,
    panels: LayoutPanel[],
    rows: number,
    cols: number,
    format: FigureExportFormat,
    dpi: number,
  ) => Promise<FigureExport>
  runtimeReady: boolean
  running: boolean
  onChange: (next: LayoutSpec) => void
  onDelete: () => void
}) {
  const [format, setFormat] = useState<FigureExportFormat>('png')
  const [dpi, setDpi] = useState(300)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Local mirror of the name field — same pattern as CodeLane.tsx's `nameDraft`
  // for a script name. `LayoutSpecSchema.name` is `.trim().min(1)`, so writing
  // the raw (possibly empty/whitespace) input value straight to `layout.name`
  // fails useDatasetEditor's draftError and pins EVERY later save — grid edits,
  // renames, chart tweaks, all of it — behind one cleared text box. Typing is
  // held here instead; only a non-empty trimmed value is ever committed, and
  // blurring an emptied box snaps it back to the last committed name.
  const [nameDraft, setNameDraft] = useState(layout.name)
  useEffect(() => {
    setNameDraft(layout.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.id])

  function renameLayout(name: string) {
    setNameDraft(name)
    const trimmed = name.trim()
    if (trimmed === '' || trimmed === layout.name) return
    onChange({ ...layout, name: trimmed })
  }

  const cells = layout.rows * layout.cols
  const panelLabel = (i: number) => String.fromCharCode(65 + i)

  function setPanel(i: number, analysisId: string) {
    const panels = layout.panels.slice()
    if (analysisId === '') panels.splice(i, 1)
    else panels[i] = { analysisId }
    onChange({ ...layout, panels })
  }

  function addPanel() {
    if (layout.panels.length >= cells) return
    onChange({ ...layout, panels: [...layout.panels, { analysisId: analyses[0]!.id }] })
  }

  async function doExport() {
    setExporting(true)
    setError(null)
    // Resolve each panel's saved-analysis reference to its template + inputs. A
    // panel pointing at a since-deleted analysis becomes a blank labelled cell
    // (empty analysisId → the worker draws no figure but keeps the letter).
    const panels: LayoutPanel[] = layout.panels.slice(0, cells).map((p) => {
      const a = analyses.find((x) => x.id === p.analysisId)
      return a
        ? { analysisId: a.analysisId, spec: { columnIds: a.columnIds, ...(a.options ? { options: a.options } : {}) } }
        : { analysisId: '', spec: { columnIds: [] } }
    })
    const result = await exportLayout(dataset, panels, layout.rows, layout.cols, format, dpi)
    if (result.error) setError(result.error)
    else if (result.base64) {
      downloadFigureExport(result.base64, result.format, `${slugify(layout.name)}-poster-${result.dpi}dpi.${result.format}`)
    }
    setExporting(false)
  }

  const busy = exporting || running || !runtimeReady

  return (
    <div className="dt-poster" data-testid={`layout-${layout.id}`}>
      <div className="dt-poster__row">
        <input
          className="dt-input"
          value={nameDraft}
          maxLength={80}
          aria-label="Layout name"
          onChange={(e) => renameLayout(e.target.value)}
          onBlur={() => setNameDraft(layout.name)}
          data-testid={`layout-name-${layout.id}`}
        />
        <button
          type="button"
          className="dt-btn dt-btn--danger"
          onClick={onDelete}
          aria-label="Delete layout"
          data-testid={`layout-delete-${layout.id}`}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div className="dt-poster__grid-controls">
        <label className="dt-field">
          <span className="dt-field__label">Rows</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={layout.rows}
              onChange={(e) => onChange({ ...layout, rows: Number(e.target.value) })}
              data-testid={`layout-rows-${layout.id}`}
            >
              {Array.from({ length: MAX_LAYOUT_DIM }, (_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="dt-field">
          <span className="dt-field__label">Cols</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={layout.cols}
              onChange={(e) => onChange({ ...layout, cols: Number(e.target.value) })}
              data-testid={`layout-cols-${layout.id}`}
            >
              {Array.from({ length: MAX_LAYOUT_DIM }, (_, i) => (
                <option key={i} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
        </label>
        <span className="dt-field__hint">
          {layout.panels.length} of {cells} cell{cells === 1 ? '' : 's'} filled (A, B, C…, row by row)
        </span>
      </div>

      <div className="dt-poster__panels">
        {layout.panels.slice(0, cells).map((p, i) => (
          <label className="dt-field dt-poster__panel" key={i}>
            <span className="dt-field__label">Panel {panelLabel(i)}</span>
            <div className="ops-select-wrap">
              <select
                className="ops-select"
                value={p.analysisId}
                onChange={(e) => setPanel(i, e.target.value)}
                data-testid={`layout-panel-${layout.id}-${i}`}
              >
                <option value="">— none —</option>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {analysisDef(a.analysisId)?.label ?? a.analysisId}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ))}
        {layout.panels.length < cells && (
          <button
            type="button"
            className="dt-btn"
            onClick={addPanel}
            data-testid={`layout-add-panel-${layout.id}`}
          >
            <Plus size={11} /> Add panel {panelLabel(layout.panels.length)}
          </button>
        )}
      </div>

      <div className="dt-analysis__export">
        <span className="dt-field__label">Export poster</span>
        <div className="ops-select-wrap">
          <select
            className="ops-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as FigureExportFormat)}
            aria-label="Export format"
            data-testid={`layout-format-${layout.id}`}
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
            data-testid={`layout-dpi-${layout.id}`}
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
          disabled={busy || layout.panels.length === 0}
          onClick={doExport}
          data-testid={`layout-export-${layout.id}`}
        >
          {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
        </button>
      </div>
      {error && (
        <p className="dt-field__hint" role="alert" data-testid={`layout-error-${layout.id}`}>
          {error}
        </p>
      )}
    </div>
  )
}
