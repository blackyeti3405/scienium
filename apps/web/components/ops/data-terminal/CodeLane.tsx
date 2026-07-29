'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Play, Trash2, FileDown, Loader2, AlertTriangle } from 'lucide-react'
import { figureDataUrl } from '@/lib/data-terminal/runtime/figure'
import { downloadBlob } from '@/lib/data-terminal/export'
import { MAX_SCRIPT_CODE, MAX_SCRIPTS, type CodeScriptSpec } from '@/lib/data-terminal/dataset-schema'
import { MAX_DATASET_NAME, type ColumnSpec, type DataRow } from '@/lib/data-terminal/dataset'
import { starterScript, newScriptId, pyFilename, type RuntimeColumn } from '@/lib/data-terminal/code-script'
import { useCodeRuntime, type RunResult } from './useCodeRuntime'

/**
 * Code mode (plan §4): a matplotlib editor over the shared dataset, running in
 * the Pyodide Web Worker via `useCodeRuntime`. Thin UI on top of C1's runtime.
 *
 * Scripts are editable draft state (`{ id, name, code }`), handed back to
 * `useDatasetEditor.edit()` through `onScriptsChange` — the SAME debounced
 * autosave the grid and Sheets charts use. There is deliberately no independent
 * save path (an independent save is how earlier work in this feature was lost).
 *
 * SECURITY: a figure is attacker-controlled SVG (a teammate's script runs in
 * your browser). It is rendered ONLY as `<img src={figureDataUrl(svg)}>`, which
 * loads the SVG in the browser's inert image mode — no scripts, no network.
 * NEVER `dangerouslySetInnerHTML` a figure. See lib/.../runtime/figure.ts.
 *
 * This component is dynamic-imported by DatasetDetail so the ~30 MB Pyodide
 * worker + hook only load when the Code lane is actually opened.
 */
export function CodeLane({
  columns,
  rows,
  scripts,
  onScriptsChange,
  initialScriptId,
}: {
  columns: ColumnSpec[]
  rows: DataRow[]
  scripts: CodeScriptSpec[]
  onScriptsChange: (scripts: CodeScriptSpec[]) => void
  /**
   * Phase F2 "Open in Code mode" bridge: the script to open selected on mount.
   * DatasetDetail sets it just before switching to this lane, so a freshly
   * generated script is the one shown (not `scripts[0]`). Consumed at mount only
   * — this lane remounts each time it is opened, so a stale id can't linger.
   */
  initialScriptId?: string | null
}) {
  const { status, running, run } = useCodeRuntime()
  const [selectedId, setSelectedId] = useState<string | null>(
    (initialScriptId && scripts.some((s) => s.id === initialScriptId) ? initialScriptId : scripts[0]?.id) ?? null,
  )
  const [result, setResult] = useState<RunResult | null>(null)

  // Keep the selection pointing at a script that still exists (mirror SheetsChart).
  useEffect(() => {
    if (scripts.length === 0) {
      if (selectedId !== null) setSelectedId(null)
    } else if (!scripts.some((s) => s.id === selectedId)) {
      setSelectedId(scripts[0]!.id)
    }
  }, [scripts, selectedId])

  const script = scripts.find((s) => s.id === selectedId) ?? scripts[0] ?? null

  // Local mirror of the name field: lets a student clear the box to retype
  // without EVER committing an empty/whitespace name to `scripts` — that value
  // fails ScriptSpecSchema's `.trim().min(1)` and pins the whole save queue in
  // a retry loop (useDatasetEditor's draftError), blocking every later grid
  // edit too. Resyncs only when the SELECTED script changes, not on every
  // keystroke, or a trailing space typed mid-rename would get stomped by the
  // just-committed (trimmed) value on the very next render.
  const [nameDraft, setNameDraft] = useState(script?.name ?? '')
  useEffect(() => {
    setNameDraft(script?.name ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?.id])

  // The runtime only needs name + type; recomputed when the columns change so a
  // renamed/added column shows up in the next run and the next starter script.
  const runtimeColumns = useMemo<RuntimeColumn[]>(
    () => columns.map((c) => ({ name: c.name, type: c.type })),
    [columns],
  )

  function addScript() {
    if (scripts.length >= MAX_SCRIPTS) return
    const id = newScriptId(scripts)
    const next: CodeScriptSpec = {
      id,
      name: `Script ${scripts.length + 1}`,
      code: starterScript(runtimeColumns),
    }
    onScriptsChange([...scripts, next])
    setSelectedId(id)
    setResult(null)
  }

  function deleteScript(id: string) {
    onScriptsChange(scripts.filter((s) => s.id !== id))
    setResult(null)
  }

  function updateCode(code: string) {
    if (!script) return
    onScriptsChange(scripts.map((s) => (s.id === script.id ? { ...s, code } : s)))
  }

  function rename(name: string) {
    if (!script) return
    setNameDraft(name)
    const trimmed = name.trim()
    // Guard at the source: an empty/whitespace name must never reach `scripts`
    // (see the comment on `nameDraft` above). Leaving the last committed name
    // in place here is what lets `onBlur` snap the box back to it.
    if (trimmed === '' || trimmed === script.name) return
    onScriptsChange(scripts.map((s) => (s.id === script.id ? { ...s, name: trimmed } : s)))
  }

  async function onRun() {
    if (!script) return
    const r = await run(script.code, { columns: runtimeColumns, rows })
    setResult(r)
  }

  function download() {
    if (!script) return
    downloadBlob(new Blob([script.code], { type: 'text/x-python' }), pyFilename(script.name))
  }

  if (scripts.length === 0 || !script) {
    return (
      <div className="dt-code-empty" data-testid="code-empty">
        <Play size={24} className="text-white/25" />
        <span className="font-pixel text-[8px] text-white/45">No scripts yet.</span>
        <button type="button" className="dt-btn dt-btn--primary" onClick={addScript} data-testid="code-add">
          <Plus size={12} /> New script
        </button>
      </div>
    )
  }

  const runDisabled = running || status !== 'ready'

  return (
    <div className="dt-code" data-testid="code-lane">
      <div className="dt-code__bar">
        {scripts.length > 1 && (
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={script.id}
              onChange={(e) => {
                setSelectedId(e.target.value)
                setResult(null)
              }}
              aria-label="Which script"
              data-testid="code-select"
            >
              {scripts.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Script ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          className="dt-btn"
          onClick={addScript}
          disabled={scripts.length >= MAX_SCRIPTS}
          title={scripts.length >= MAX_SCRIPTS ? `At most ${MAX_SCRIPTS} scripts per dataset.` : undefined}
          data-testid="code-add"
        >
          <Plus size={12} /> New script
        </button>

        <div className="dt-toolbar__spacer" />

        <button
          type="button"
          className="dt-btn dt-btn--primary"
          onClick={onRun}
          disabled={runDisabled}
          data-testid="code-run"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
        </button>
        <button type="button" className="dt-btn" onClick={download} data-testid="code-download">
          <FileDown size={12} /> .py
        </button>
        <button
          type="button"
          className="dt-btn dt-btn--danger"
          onClick={() => deleteScript(script.id)}
          data-testid="code-delete"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>

      {/* Runtime state — polite so a screen-reader user hears "ready"/"running"
          without it stealing focus. Distinguishes the one-time ~30 MB load. */}
      <p className="dt-code__status" role="status" aria-live="polite" data-testid="code-status">
        {status === 'loading' && (
          <>
            <Loader2 size={11} className="animate-spin" /> Loading the Python runtime (~30 MB, first
            time only)…
          </>
        )}
        {status === 'error' && (
          <>
            <AlertTriangle size={11} className="text-red-400" /> The Python runtime couldn&apos;t
            load. Reload the page to try again.
          </>
        )}
        {status === 'ready' && (running ? <>Running your script…</> : <>Runtime ready.</>)}
      </p>

      <label className="dt-field dt-code__name">
        <span className="dt-field__label">Script name</span>
        <input
          className="dt-input"
          value={nameDraft}
          maxLength={MAX_DATASET_NAME}
          onChange={(e) => rename(e.target.value)}
          onBlur={() => setNameDraft(script.name)}
          data-testid="code-name"
        />
      </label>

      <div className="dt-code__body">
        <div className="dt-code__editorwrap">
          <label className="dt-field__label" htmlFor="dt-code-editor">
            Python
          </label>
          <textarea
            id="dt-code-editor"
            className="dt-code__editor"
            value={script.code}
            spellCheck={false}
            maxLength={MAX_SCRIPT_CODE}
            onChange={(e) => updateCode(e.target.value)}
            data-testid="code-editor"
          />
        </div>

        {/* Labeled live region: the output arrives after Run with no further
            user action, so it is announced. */}
        <section
          className="dt-code__output"
          aria-label="Script output"
          aria-live="polite"
          data-testid="code-output"
        >
          {!result ? (
            <p className="dt-code__hint">Press Run to execute your script.</p>
          ) : (
            <>
              {result.error && (
                <pre className="dt-code__error" data-testid="code-error">
                  {result.error}
                </pre>
              )}
              {result.figures.map((svg, i) => (
                // SECURITY: inert <img> render only — never dangerouslySetInnerHTML.
                // A plain <img> with a data: URL is the WHOLE defense (secure
                // static image mode: no scripts, no external loads). next/image
                // would proxy/optimize this attacker-controlled SVG and defeat
                // that, so no-img-element is deliberately disabled here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  className="dt-code__figure"
                  src={figureDataUrl(svg)}
                  alt={`Figure ${i + 1}`}
                  data-testid="code-figure"
                />
              ))}
              {result.stdout && (
                <pre className="dt-code__stream" data-testid="code-stdout">
                  {result.stdout}
                </pre>
              )}
              {result.stderr && (
                <pre className="dt-code__stream dt-code__stream--err" data-testid="code-stderr">
                  {result.stderr}
                </pre>
              )}
              {!result.error &&
                result.figures.length === 0 &&
                !result.stdout &&
                !result.stderr && <p className="dt-code__hint">Ran with no output.</p>}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
