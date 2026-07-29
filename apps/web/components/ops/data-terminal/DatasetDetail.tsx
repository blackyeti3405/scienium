'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronLeft, Plus, Download, Upload, Check, Loader2, AlertTriangle } from 'lucide-react'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { LoadRetry } from '@/components/ui/LoadRetry'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { downloadBlob, slugify } from '@/lib/data-terminal/export'
import { parseDatasetTable, toDatasetCsv } from '@/lib/data-terminal/csv'
import { recomputeFormulaColumns } from '@/lib/data-terminal/formula'
import { newScriptId } from '@/lib/data-terminal/code-script'
import { MAX_SCRIPT_CODE, MAX_SCRIPTS, type CodeScriptSpec } from '@/lib/data-terminal/dataset-schema'
import {
  newColumnId,
  tableTypeSpec,
  TABLE_TYPES,
  MAX_COLUMNS_PER_DATASET,
  MAX_DATASET_NAME,
  type ColumnSpec,
  type DataRow,
  type TableType,
} from '@/lib/data-terminal/dataset'
import { DataGrid } from './DataGrid'
import { ColumnEditor } from './ColumnEditor'
import { useDatasetEditor, type DatasetDraft } from './useDatasetEditor'
import type { LabResultCache } from './LabLane'

// recharts is ~100KB and only the Chart view needs it, so it loads on demand
// (PERF-10) — the grid never pays for it. Same pattern as the teacher reports.
const SheetsChart = dynamic(() => import('./SheetsChart').then((m) => m.SheetsChart), {
  ssr: false,
  loading: () => <LabeledLoader fill="inline" label="Loading chart…" className="items-start py-6" />,
})

// Code mode pulls the Pyodide worker + hook (~30 MB on first run). Loaded only
// when the Code lane is opened, so the Sheets/grid eager path never touches it.
const CodeLane = dynamic(() => import('./CodeLane').then((m) => m.CodeLane), {
  ssr: false,
  loading: () => <LabeledLoader fill="inline" label="Loading Code mode…" className="items-start py-6" />,
})

// Lab mode pulls the Pyodide worker with the full stats set (~65 MB on first
// run). Same on-demand load as Code mode — only when the Lab lane is opened.
const LabLane = dynamic(() => import('./LabLane').then((m) => m.LabLane), {
  ssr: false,
  loading: () => <LabeledLoader fill="inline" label="Loading Lab mode…" className="items-start py-6" />,
})

/**
 * One dataset, open for editing — the grid plus everything that acts on the
 * whole table (name, table type, import, export).
 *
 * The table-type selector sits at the top rather than buried in settings
 * because it is the most consequential choice on the screen: it decides which
 * column roles exist, and later which analyses and chart families the dataset
 * can be handed at all.
 */
export function DatasetDetail({
  datasetId,
  onBack,
  onRenamed,
}: {
  datasetId: string
  onBack: () => void
  onRenamed: (id: string, name: string, rowCount: number) => void
}) {
  const { draft, loadError, retryLoad, saving, saveError, conflict, unsaved, edit, flush } =
    useDatasetEditor(datasetId)
  const { confirm, dialog } = useConfirm()
  // Three lanes over the one dataset (plan §3–5): Sheets (grid + chart, zero
  // Python), Lab (gated analyses in a Pyodide worker with scipy/statsmodels),
  // and Code (matplotlib in a Pyodide worker). Per-lane state is local; all
  // three lanes share the one useDatasetEditor draft/session.
  const [lane, setLane] = useState<'sheets' | 'lab' | 'code'>('sheets')
  // Phase F2 "Open in Code mode": the script the bridge just generated, so the
  // Code lane opens with it selected. Cleared on a manual lane switch so it
  // never stickily re-selects an old script.
  const [codeScriptId, setCodeScriptId] = useState<string | null>(null)
  // Belt for FIX 1 (root cause is code-bridge-core.mjs no longer embedding
  // rows): if a generated script somehow still exceeds MAX_SCRIPT_CODE, it
  // must NEVER reach `draft.scripts` — an over-cap script fails ScriptsSchema
  // in useDatasetEditor's draftError, which pins the WHOLE save queue (every
  // later grid edit, rename, chart tweak) in an unsendable retry loop. Shown
  // instead of silently dropping the attempt.
  const [codeBridgeError, setCodeBridgeError] = useState<string | null>(null)
  // Lab result cache lives here, not in LabLane, so a cached analysis result
  // survives switching to the grid to edit data — that switch unmounts LabLane,
  // and losing the cache would break the stale/re-run chain (plan §7 risk 5).
  const [labResults, setLabResults] = useState<LabResultCache>({})
  // Grid and Chart are two views of the SAME Sheets lane (plan §3).
  const [view, setView] = useState<'grid' | 'chart'>('grid')
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importNote, setImportNote] = useState<string | null>(null)
  // The text of the last import, kept so the header toggle can re-read it. A
  // student who imports an all-text table (where no heuristic can tell titles
  // from data) needs a way to say which it was; without this the toggle the
  // parser documents did not exist anywhere in the UI.
  const [importedSource, setImportedSource] = useState<string | null>(null)
  const [headerOverride, setHeaderOverride] = useState<boolean | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  async function goBack() {
    // `flush` reports whether the server actually holds the latest. Ignoring it
    // let a student walk away from failed or unsendable work with no warning
    // and no copy of it anywhere.
    if (!(await flush())) {
      const leave = await confirm({
        title: 'Unsaved changes',
        message:
          'Some of your changes have not been saved yet. If you leave now they will be lost.',
        confirmLabel: 'Leave anyway',
        tone: 'danger',
      })
      if (!leave) return
    }
    onBack()
  }

  if (loadError) {
    return (
      <div className="dt-pane">
        <LoadRetry
          message="Couldn't load this dataset — check your connection."
          onRetry={retryLoad}
          testId="dataset-retry"
        />
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="dt-pane">
        <LabeledLoader fill="inline" label="Loading dataset…" className="items-start py-6" />
      </div>
    )
  }

  const spec = tableTypeSpec(draft.tableType)
  const activeColumn = draft.columns.find((c) => c.id === activeColumnId) ?? null

  function addColumn() {
    if (!draft) return
    if (draft.columns.length >= MAX_COLUMNS_PER_DATASET) return
    // A new column takes the table type's first role, so it is immediately
    // valid — never a column the student must fix before anything will save.
    const role = draft.columns.some((c) => c.role === 'x') ? 'y' : spec.roles[0]!
    const column: ColumnSpec = {
      id: newColumnId(draft.columns),
      name: `Column ${draft.columns.length + 1}`,
      type: 'number',
      role: role === 'x' && draft.columns.some((c) => c.role === 'x') ? 'y' : role,
    }
    edit({
      ...draft,
      columns: [...draft.columns, column],
      rows: draft.rows.map((r) => [...r, null]),
    })
    setActiveColumnId(column.id)
  }

  /**
   * One update for a column edit and any cells it recomputed. Splitting these
   * into two calls meant two updates built from the same captured draft in one
   * tick, and the second discarded the first.
   */
  function applyColumn(next: ColumnSpec, rows?: DataRow[]) {
    if (!draft) return
    edit({
      ...draft,
      columns: draft.columns.map((c) => (c.id === next.id ? next : c)),
      ...(rows ? { rows } : {}),
    })
  }

  function deleteColumn(id: string) {
    if (!draft) return
    const index = draft.columns.findIndex((c) => c.id === id)
    if (index === -1) return
    edit({
      ...draft,
      // Any column pointing AT the deleted one loses its reference too, or the
      // dataset keeps a dangling link that only fails later, at save time.
      columns: draft.columns
        .filter((c) => c.id !== id)
        .map((c) => {
          const next = { ...c }
          if (next.subcolumnOf === id) delete next.subcolumnOf
          if (next.pairedWith === id) delete next.pairedWith
          return next
        }),
      rows: draft.rows.map((r) => r.filter((_, i) => i !== index)),
    })
    setActiveColumnId(null)
  }

  /**
   * Rows changed — recompute every formula column before the edit is stored.
   *
   * This is the recalculation chain. Without it a computed column kept the
   * numbers it had when the button was pressed, and autosaved them, so editing
   * a Mass cell left Density stale AND wrong in the database.
   */
  function editRows(next: DatasetDraft) {
    const { rows } = recomputeFormulaColumns(next.columns, next.rows)
    edit({ ...next, rows })
  }

  function applyImport(text: string, filename?: string, hasHeader?: boolean) {
    if (!draft || !text.trim()) return
    const parsed = parseDatasetTable(text, draft.tableType, hasHeader)
    if (parsed.columns.length === 0) {
      setImportNote('Nothing readable in that — check it has rows of values.')
      return
    }
    setImportedSource(text)
    setHeaderOverride(parsed.usedHeader)
    edit({ ...draft, columns: parsed.columns, rows: parsed.rows })
    const dropped: string[] = []
    if (parsed.droppedRows > 0) dropped.push(`${parsed.droppedRows} rows past the limit`)
    if (parsed.droppedColumns > 0) dropped.push(`${parsed.droppedColumns} columns past the limit`)
    setImportNote(
      `Imported ${parsed.rows.length} rows × ${parsed.columns.length} columns${
        parsed.usedHeader ? ' (first row used as titles)' : ''
      }${dropped.length ? ` — dropped ${dropped.join(' and ')}` : ''}.`,
    )
    setImportText('')
    setActiveColumnId(null)
    if (filename) setImportOpen(false)
  }

  function exportCsv() {
    if (!draft) return
    const blob = new Blob([toDatasetCsv({ columns: draft.columns, rows: draft.rows })], {
      type: 'text/csv',
    })
    downloadBlob(blob, `${slugify(draft.name)}.csv`)
  }

  // Clearing the bridge selection here means a manual Code-tab click opens the
  // student's own last script, not whatever the bridge last generated.
  function switchLane(next: 'sheets' | 'lab' | 'code') {
    setCodeScriptId(null)
    setCodeBridgeError(null)
    setLane(next)
  }

  /**
   * Phase F2 "Open in Code mode" bridge: save the generated matplotlib as a new
   * Code-lane script (through the same autosave `edit()`), then switch to the
   * Code lane with it selected. One-directional — the GUI never re-parses code.
   *
   * Belt: a script over `MAX_SCRIPT_CODE` must never be added to `draft.scripts`
   * — ScriptsSchema would reject it and useDatasetEditor's draftError refuses to
   * send the draft AT ALL, so the bad script would sit in state blocking every
   * later save. The root-cause fix is code-bridge-core.mjs referencing the
   * injected `df` instead of embedding rows, which should keep every generated
   * script far under the cap; this is the safety net if it somehow doesn't.
   */
  function openInCode(code: string, name: string) {
    if (!draft) return
    if (code.length > MAX_SCRIPT_CODE) {
      setCodeBridgeError(
        'That chart or analysis produced too much code to save as a script. Try a smaller selection.',
      )
      setLane('code')
      return
    }
    setCodeBridgeError(null)
    if (draft.scripts.length < MAX_SCRIPTS) {
      const id = newScriptId(draft.scripts)
      const script: CodeScriptSpec = { id, name: name.slice(0, MAX_DATASET_NAME) || 'From GUI', code }
      edit({ ...draft, scripts: [...draft.scripts, script] })
      setCodeScriptId(id)
    }
    setLane('code')
  }

  return (
    <div className="dt-pane">
      {dialog}
      <div className="dt-toolbar">
        <button type="button" onClick={goBack} className="dt-back" data-testid="dataset-back">
          <ChevronLeft size={13} /> All datasets
        </button>

        <div className="dt-toolbar__spacer" />

        {/* Polite live region: the save state changes without any user action,
            so a screen-reader user is otherwise never told their work landed. */}
        <span className="dt-savestate" role="status" aria-live="polite" data-testid="save-state">
          {conflict ? (
            <>
              <AlertTriangle size={11} className="text-red-400" /> Not saved
            </>
          ) : saving ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Saving…
            </>
          ) : unsaved ? (
            <>Unsaved changes</>
          ) : (
            <>
              <Check size={11} /> Saved
            </>
          )}
        </span>
      </div>

      <div className="dt-titlebar">
        <input
          className="dt-title-input"
          value={draft.name}
          maxLength={MAX_DATASET_NAME}
          aria-label="Dataset name"
          onChange={(e) => {
            edit({ ...draft, name: e.target.value })
            onRenamed(datasetId, e.target.value, draft.rows.length)
          }}
          data-testid="dataset-name"
        />
        <div className="dt-tabletype">
          <label className="dt-field__label" htmlFor="dt-table-type">
            Table type
          </label>
          <div className="ops-select-wrap">
            <select
              id="dt-table-type"
              className="ops-select"
              value={draft.tableType}
              onChange={(e) => edit({ ...draft, tableType: e.target.value as TableType })}
              data-testid="table-type"
            >
              {TABLE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <p className="dt-tabletype__blurb">{spec.blurb}</p>

      {conflict && (
        <div className="dt-banner dt-banner--danger" role="alert" data-testid="conflict-banner">
          <AlertTriangle size={13} />
          <span>
            Someone on your team saved this dataset while you were editing. Reload to see
            their version — your changes on screen have not been sent.
          </span>
          <button type="button" className="dt-btn dt-btn--ghost" onClick={retryLoad}>
            Reload
          </button>
        </div>
      )}
      {!conflict && saveError && (
        <div className="dt-banner" role="status" data-testid="save-error">
          <AlertTriangle size={13} /> {saveError}
        </div>
      )}
      {codeBridgeError && (
        <div className="dt-banner" role="alert" data-testid="code-bridge-error">
          <AlertTriangle size={13} /> {codeBridgeError}
        </div>
      )}

      <div className="dt-lanes" role="tablist" aria-label="Lane">
        <button
          type="button"
          role="tab"
          aria-selected={lane === 'sheets'}
          className={`dt-lanes__btn ${lane === 'sheets' ? 'is-active' : ''}`}
          onClick={() => switchLane('sheets')}
          data-testid="lane-sheets"
        >
          Sheets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={lane === 'lab'}
          className={`dt-lanes__btn ${lane === 'lab' ? 'is-active' : ''}`}
          onClick={() => switchLane('lab')}
          data-testid="lane-lab"
        >
          Lab
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={lane === 'code'}
          className={`dt-lanes__btn ${lane === 'code' ? 'is-active' : ''}`}
          onClick={() => switchLane('code')}
          data-testid="lane-code"
        >
          Code
        </button>
      </div>

      {lane === 'sheets' ? (
        <>
      <div className="dt-actions">
        <button
          type="button"
          className="dt-btn"
          onClick={addColumn}
          disabled={draft.columns.length >= MAX_COLUMNS_PER_DATASET}
          data-testid="add-column"
        >
          <Plus size={12} /> Column
        </button>
        <button
          type="button"
          className="dt-btn"
          onClick={() => setImportOpen((o) => !o)}
          data-testid="import-toggle"
        >
          <Upload size={12} /> Import
        </button>
        <button
          type="button"
          className="dt-btn"
          onClick={exportCsv}
          disabled={draft.columns.length === 0}
          data-testid="export-csv"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {importOpen && (
        <div className="dt-import" data-testid="import-panel">
          <p className="dt-field__hint">
            Paste from a spreadsheet, or choose a CSV file. This <strong>replaces</strong> the
            table below.
          </p>
          <textarea
            className="dt-input dt-input--mono"
            rows={5}
            value={importText}
            placeholder={'Time\tMass\n1\t10\n2\t20'}
            onChange={(e) => setImportText(e.target.value)}
            aria-label="Paste data to import"
            data-testid="import-text"
          />
          <div className="dt-actions">
            <button
              type="button"
              className="dt-btn dt-btn--primary"
              onClick={() => applyImport(importText)}
              disabled={!importText.trim()}
              data-testid="import-apply"
            >
              Import pasted data
            </button>
            <button type="button" className="dt-btn" onClick={() => fileRef.current?.click()}>
              Choose CSV file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              className="sr-only"
              data-testid="import-file"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                applyImport(await file.text(), file.name)
                e.target.value = ''
              }}
            />
          </div>
          {importNote && (
            <p className="dt-field__ok" data-testid="import-note">
              {importNote}
            </p>
          )}
          {importedSource && (
            // The parser's heuristic needs text-over-numbers evidence, which an
            // all-categorical table cannot give it. This is the override it
            // documents — offered after the import so the student decides from
            // the result rather than guessing beforehand.
            <label className="dt-check">
              <input
                type="checkbox"
                checked={headerOverride ?? false}
                onChange={(e) => applyImport(importedSource, undefined, e.target.checked)}
                data-testid="header-toggle"
              />
              <span>First row is column titles</span>
            </label>
          )}
        </div>
      )}

      <div className="dt-viewtoggle" role="tablist" aria-label="Sheets view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'grid'}
          className={`dt-viewtoggle__btn ${view === 'grid' ? 'is-active' : ''}`}
          onClick={() => setView('grid')}
          data-testid="view-grid"
        >
          Grid
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'chart'}
          className={`dt-viewtoggle__btn ${view === 'chart' ? 'is-active' : ''}`}
          onClick={() => setView('chart')}
          data-testid="view-chart"
        >
          Chart
        </button>
      </div>

      {view === 'grid' ? (
        <div className="dt-workspace">
          <DataGrid
            columns={draft.columns}
            rows={draft.rows}
            onRowsChange={(rows) => editRows({ ...draft, rows })}
            onHeaderClick={(id) => setActiveColumnId((cur) => (cur === id ? null : id))}
            activeColumnId={activeColumnId}
          />
          {activeColumn && (
            <ColumnEditor
              key={activeColumn.id}
              column={activeColumn}
              columns={draft.columns}
              rows={draft.rows}
              tableType={draft.tableType}
              onApply={applyColumn}
              onDelete={() => deleteColumn(activeColumn.id)}
              onClose={() => setActiveColumnId(null)}
            />
          )}
        </div>
      ) : (
        <SheetsChart
          columns={draft.columns}
          rows={draft.rows}
          charts={draft.charts}
          datasetName={draft.name}
          onChartsChange={(charts) => edit({ ...draft, charts })}
          onOpenInCode={openInCode}
        />
      )}
        </>
      ) : lane === 'lab' ? (
        <LabLane
          columns={draft.columns}
          rows={draft.rows}
          tableType={draft.tableType}
          analyses={draft.analyses}
          onAnalysesChange={(analyses) => edit({ ...draft, analyses })}
          layouts={draft.layouts}
          onLayoutsChange={(layouts) => edit({ ...draft, layouts })}
          onOpenInCode={openInCode}
          results={labResults}
          onResultsChange={setLabResults}
        />
      ) : (
        <CodeLane
          columns={draft.columns}
          rows={draft.rows}
          scripts={draft.scripts}
          onScriptsChange={(scripts) => edit({ ...draft, scripts })}
          initialScriptId={codeScriptId}
        />
      )}

      <p className="dt-rowcount">
        {draft.rows.length} row{draft.rows.length === 1 ? '' : 's'} ×{' '}
        {draft.columns.length} column{draft.columns.length === 1 ? '' : 's'}
      </p>
    </div>
  )
}
