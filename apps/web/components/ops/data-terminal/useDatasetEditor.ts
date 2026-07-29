'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api/client'
import { createSaveQueue } from '@/lib/save-queue'
import { validateDataset, type ColumnSpec, type DataRow, type TableType } from '@/lib/data-terminal/dataset'
import {
  AnalysesSchema,
  ChartsSchema,
  LayoutsSchema,
  MAX_ANALYSES,
  MAX_LAYOUTS,
  MAX_SCRIPTS,
  ScriptsSchema,
  type AnalysisSpec,
  type CodeScriptSpec,
  type LayoutSpec,
} from '@/lib/data-terminal/dataset-schema'
import type { SheetsChartSpec } from '@/lib/data-terminal/sheets-chart'
import { getDataset, updateDataset, type DatasetFull } from './datasets-api'

/**
 * Owns one dataset's edit session: load, local state, autosave, and the two
 * failure modes that actually lose a student's work.
 *
 * **A dropped save.** Edits are coalesced through `createSaveQueue`, so a burst
 * of typing costs one request and two overlapping saves cannot commit
 * oldest-last. `unsaved` stays true until the server confirms the exact
 * snapshot it holds.
 *
 * **A teammate's save discarded.** A dataset is team-shared, so two students
 * can have the same grid open. Every write carries the `updatedAt` this session
 * loaded; the server 409s when the row moved underneath it, and that surfaces
 * as a banner rather than as one student's afternoon vanishing.
 */

export interface DatasetDraft {
  name: string
  tableType: TableType
  columns: ColumnSpec[]
  rows: DataRow[]
  /**
   * Sheets-mode chart specs. Editable state like the columns and rows, so it
   * rides the SAME autosave — never an independent save — and round-trips the
   * dataset's `charts` column so a chart survives a reload.
   */
  charts: SheetsChartSpec[]
  /**
   * Code-lane scripts (`{ id, name, code }`). Same autosave-riding, whole-array
   * round-trip as `charts` — C2's editor reads and writes this. Wired now so C2
   * is pure UI.
   */
  scripts: CodeScriptSpec[]
  /**
   * Lab-mode analysis specs (INPUTS only — `{ id, analysisId, columnIds,
   * options }`). Same whole-array round-trip. The RESULT is never stored; the
   * Lab lane re-computes it in the browser against the current data.
   */
  analyses: AnalysisSpec[]
  /**
   * Poster layouts (`{ id, name, rows, cols, panels: [{analysisId}] }`, Phase
   * F2). Same whole-array round-trip. Each composes saved analyses into one
   * multi-panel figure; the figure itself is re-rendered, never stored.
   */
  layouts: LayoutSpec[]
}

const SAVE_DEBOUNCE_MS = 700

/**
 * First blocking problem with a draft, or `null` when it is safe to send.
 *
 * Validates BOTH the dataset shape and the chart specs against the same schemas
 * the server enforces. Charts matter here because a cleared numeric input in the
 * chart builder (a `0` order, a `NaN` bound) makes `ChartsSchema` 400 — and the
 * save queue keeps retrying the rejected snapshot, so one bad chart would pin
 * "Unsaved changes" and block EVERY later save, grid edits included. Catching it
 * client-side keeps the invalid draft on screen instead of looping a 400.
 */
function draftError(d: DatasetDraft): string | null {
  const issues = validateDataset({ columns: d.columns, rows: d.rows }, d.tableType)
  if (issues.length > 0) return issues[0]!.message
  if (!ChartsSchema.safeParse(d.charts).success) {
    return 'A chart setting is out of range. Fix the chart options — your work is still here and will save once it is valid.'
  }
  // Same reasoning as charts: an invalid script must not pin the save queue in
  // a retry loop that blocks every later grid edit. Name the ACTUAL rule that
  // failed — a cleared script-name field used to report "too long" here, which
  // sent the student hunting through 20 000 characters of code for a problem
  // that was actually an empty name field.
  const scriptsResult = ScriptsSchema.safeParse(d.scripts)
  if (!scriptsResult.success) {
    const issue = scriptsResult.error.issues[0]
    if (issue?.path.length === 0) {
      return `Too many scripts (max ${MAX_SCRIPTS}).`
    }
    if (issue?.path[issue.path.length - 1] === 'name') {
      return 'A script needs a name.'
    }
    return 'A script is too long to save. Trim it — your work is still here and will save once it fits.'
  }
  // Same reasoning as charts/scripts: a bad analysis spec must not pin the save
  // queue in a 400 retry loop that blocks every later grid edit.
  if (!AnalysesSchema.safeParse(d.analyses).success) {
    return `Too many analyses (max ${MAX_ANALYSES}), or an analysis setting is out of range.`
  }
  // Same reasoning again for poster layouts: name the ACTUAL rule that failed
  // rather than a generic "too many/out of range" that sends the student
  // hunting through rows/cols/panels for a problem that's really just a
  // cleared layout-name box.
  const layoutsResult = LayoutsSchema.safeParse(d.layouts)
  if (!layoutsResult.success) {
    const issue = layoutsResult.error.issues[0]
    if (issue?.path.length === 0) {
      return `Too many layouts (max ${MAX_LAYOUTS}).`
    }
    if (issue?.path[issue.path.length - 1] === 'name') {
      return 'A poster layout needs a name.'
    }
    return 'A poster layout setting is out of range. Fix it — your work is still here and will save once it is valid.'
  }
  return null
}

export function useDatasetEditor(datasetId: string) {
  const [draft, setDraft] = useState<DatasetDraft | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  /**
   * Mirrors the queue's own `unsaved` flag as React state. The queue's getter is
   * read at render time and would never trigger one, so the "Saved" indicator
   * would sit lying about a write that had already landed.
   */
  const [dirty, setDirty] = useState(false)

  // The stamp the server last confirmed. A ref, not state: it must be readable
  // by the save closure without re-creating the queue on every write.
  const stampRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * The snapshot the debounce is holding but has NOT handed to the queue yet.
   *
   * This ref is the fix for the worst bug in this file: the pending snapshot
   * used to live only inside the `setTimeout` closure, so `clearTimeout` —
   * which both `flush()` and the unmount cleanup call — destroyed the only copy
   * of it. Typing a value and clicking "All datasets" inside 700 ms cancelled
   * the timer, drained an empty queue, reported "the server holds the latest",
   * and lost the edit.
   */
  const pendingRef = useRef<DatasetDraft | null>(null)

  const queueRef = useRef<ReturnType<typeof createSaveQueue<DatasetDraft>> | null>(null)

  /** True while anything is still unsent: a queued snapshot or a pending debounce. */
  const syncDirty = useCallback(() => {
    setDirty((queueRef.current?.unsaved ?? false) || pendingRef.current !== null)
  }, [])

  if (queueRef.current === null) {
    queueRef.current =
    createSaveQueue<DatasetDraft>(async (snapshot) => {
      setSaving(true)
      // Handed to the queue — the queue now owns retrying it, so the debounce
      // no longer holds a copy that `clearTimeout` could throw away.
      if (pendingRef.current === snapshot) pendingRef.current = null
      try {
        const { dataset } = await updateDataset(datasetId, {
          name: snapshot.name,
          tableType: snapshot.tableType,
          columns: snapshot.columns,
          rows: snapshot.rows,
          charts: snapshot.charts,
          scripts: snapshot.scripts,
          analyses: snapshot.analyses,
          layouts: snapshot.layouts,
          ...(stampRef.current ? { expectedUpdatedAt: stampRef.current } : {}),
        })
        stampRef.current = dataset.updatedAt
        setSaveError(null)
        setConflict(false)
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          // Not a retryable failure — retrying would overwrite the teammate.
          setConflict(true)
          setSaveError(err.message)
        } else {
          setSaveError(
            err instanceof ApiError ? err.message : 'Could not save. Your changes are still here — check your connection.',
          )
        }
        throw err
      } finally {
        setSaving(false)
        // NOT syncDirty() here: the queue clears its own `unsaved` only AFTER
        // this write resolves, so reading it from inside would always see the
        // snapshot still outstanding and pin the indicator to "Unsaved
        // changes" forever. The call sites sync once `save()` settles.
      }
    })
  }
  const queue = queueRef.current

  const load = useCallback(() => {
    setLoadError(false)
    // A reload is how a student recovers from a 409, so it MUST clear the flag.
    // While `conflict` is set, `edit()` refuses to queue anything — and only a
    // successful save cleared it, which could never happen. The banner stayed
    // up and every keystroke after it was silently discarded.
    setConflict(false)
    setSaveError(null)
    getDataset(datasetId)
      .then(({ dataset }: { dataset: DatasetFull }) => {
        stampRef.current = dataset.updatedAt
        setDraft({
          name: dataset.name,
          tableType: dataset.tableType,
          columns: dataset.columns as ColumnSpec[],
          rows: dataset.rows as DataRow[],
          // NULL until the first chart is built — treat as an empty array.
          charts: (dataset.charts ?? []) as SheetsChartSpec[],
          // NULL until the first script is saved — same empty-array default.
          scripts: (dataset.scripts ?? []) as CodeScriptSpec[],
          // NULL until the first analysis is saved — same empty-array default.
          analyses: (dataset.analyses ?? []) as AnalysisSpec[],
          // NULL until the first layout is saved — same empty-array default.
          layouts: (dataset.layouts ?? []) as LayoutSpec[],
        })
      })
      .catch(() => setLoadError(true))
  }, [datasetId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(
    () => () => {
      // Unmount is a navigation too — switching to a guide sub-tab unmounts this
      // whole subtree. Cancelling the timer without handing over its snapshot
      // discarded the last edit, so send it before the timer dies.
      if (timerRef.current) clearTimeout(timerRef.current)
      const pending = pendingRef.current
      if (pending) void queue.save(pending)
    },
    [queue],
  )

  /**
   * Apply an edit and schedule a save. A dataset that would not validate is
   * kept on screen but NOT sent — the student sees the problem next to the
   * grid instead of a 400 from a route they never called.
   */
  const edit = useCallback(
    (next: DatasetDraft) => {
      setDraft(next)
      if (conflict) return // a stale session must reload before it may write again

      // Held from the moment it is on screen, INCLUDING while invalid. An
      // invalid draft that was neither queued nor marked dirty read as "Saved"
      // in the toolbar, and was then dropped on the way out with no warning.
      pendingRef.current = next
      syncDirty()

      const problem = draftError(next)
      if (problem) {
        setSaveError(problem)
        return
      }
      setSaveError(null)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        // `save()` resolves once the queue has drained and updated its own
        // `unsaved`, so this is the first moment the indicator can be right.
        void queue.save(next).then(syncDirty)
      }, SAVE_DEBOUNCE_MS)
    },
    [conflict, queue, syncDirty],
  )

  /**
   * Drain before navigating away. Hands the debounce's pending snapshot to the
   * queue FIRST — cancelling the timer and then draining an empty queue was how
   * an edit made in the last 700 ms vanished while the caller was told the
   * server held it.
   *
   * Returns false when anything is still unsent, including a draft the client
   * refuses to send because it does not validate.
   */
  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const pending = pendingRef.current
    if (pending) {
      // An invalid draft (bad shape OR bad chart spec) cannot be sent at all;
      // say so rather than reporting a clean drain over work the server will
      // never receive — and never hand the queue a snapshot it will 400 on.
      if (draftError(pending)) return false
      await queue.save(pending)
    }
    const drained = await queue.flush()
    syncDirty()
    return drained
  }, [queue, syncDirty])

  return {
    draft,
    loadError,
    retryLoad: load,
    saving,
    saveError,
    conflict,
    unsaved: dirty,
    edit,
    flush,
  }
}
