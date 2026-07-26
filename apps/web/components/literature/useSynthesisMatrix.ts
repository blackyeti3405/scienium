'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { findTemplate } from '@/content/literature/synthesis-templates'
import { ApiError } from '@/lib/api/client'
import {
  getMatrix,
  patchMatrix,
  checkMatrix,
  type SynthesisMatrixResponse,
  type SynthesisCheckResult,
} from './synthesisApi'

import { cellKey, slugifyColumnLabel as slugify } from './synthesisSlug'

/**
 * Owns state for ONE open Synthesis Matrix: the loaded grid, per-cell text
 * drafts (saved on blur, one PATCH per changed cell — never the whole grid),
 * column edits (rename/add/remove), the check flow, and applying a suggested
 * column. Modeled on `useExplainBack`/`usePapers` — called for exactly one
 * matrix id at a time.
 *
 * ## The check is bound to a snapshot (REFACTOR2 P1-R13)
 *
 * Cells save asynchronously on blur, and the click that starts a check blurs
 * the textarea in the same gesture. `runCheck` used to fire immediately, so the
 * paid server check could read the PREVIOUS database value — returning and
 * caching a verdict for work the student could not see, and awarding KP for it.
 *
 * Three things fix that here, and one on the server:
 *  - Saves are SERIALIZED through `saveChain`, so responses cannot land out of
 *    order and make an unsaved cell look saved.
 *  - `runCheck` awaits that chain, then FLUSHES whatever is still dirty in one
 *    PATCH, and refuses to spend if the flush failed.
 *  - It sends the server-issued `inputHash` of the grid it just confirmed, and
 *    the server refuses (409) to grade anything else.
 */
export function useSynthesisMatrix(matrixId: string | null) {
  const { addCurrency } = useLabCurrency()
  const [matrix, setMatrix] = useState<SynthesisMatrixResponse | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<SynthesisCheckResult | null>(null)

  /**
   * The latest matrix, readable AFTER an await. React state read through a
   * closure is frozen at render time, and `runCheck` awaits twice before it
   * needs the current `inputHash` — reading a stale one would 409 every check
   * that followed a successful blur-save.
   */
  const matrixRef = useRef<SynthesisMatrixResponse | null>(null)
  const applyMatrix = useCallback((m: SynthesisMatrixResponse | null) => {
    matrixRef.current = m
    setMatrix(m)
  }, [])

  const resetDraftsFrom = useCallback((m: SynthesisMatrixResponse) => {
    const next: Record<string, string> = {}
    for (const c of m.cells) next[cellKey(c.paperId, c.columnId)] = c.text
    setDrafts(next)
  }, [])

  useEffect(() => {
    if (!matrixId) {
      applyMatrix(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setLastResult(null)
    ;(async () => {
      try {
        const m = await getMatrix(matrixId)
        if (cancelled) return
        applyMatrix(m)
        resetDraftsFrom(m)
        if (m.lastCheck) setLastResult({ verdict: m.lastCheck, cached: true, kpEarned: 0, stale: false })
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load this matrix')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [matrixId, applyMatrix, resetDraftsFrom])

  function cellText(paperId: string, columnId: string): string {
    return drafts[cellKey(paperId, columnId)] ?? ''
  }

  function setCellText(paperId: string, columnId: string, text: string) {
    setDrafts((prev) => ({ ...prev, [cellKey(paperId, columnId)]: text }))
  }

  /**
   * Cells whose draft differs from what the server last confirmed.
   *
   * DERIVED from `matrix.cells`, not a hand-maintained registry: every
   * successful PATCH response refreshes those cells, so a saved cell leaves this
   * set on its own and a save that FAILED stays in it. A registry would be one
   * more thing to clear correctly, and clearing it wrongly means paying to grade
   * text the server never received.
   */
  function dirtyCells(): { paperId: string; columnId: string; text: string }[] {
    const current = matrixRef.current
    if (!current) return []
    const saved = new Map(current.cells.map((c) => [cellKey(c.paperId, c.columnId), c.text]))
    return Object.entries(drafts)
      .filter(([key, text]) => text !== (saved.get(key) ?? ''))
      .map(([key, text]) => {
        const [paperId = '', columnId = ''] = key.split(':')
        return { paperId, columnId, text }
      })
  }

  /**
   * Serializes cell PATCHes. Two overlapping saves could otherwise resolve out
   * of order and let an older response's matrix overwrite a newer one — which
   * would make an unsaved cell look saved.
   */
  const saveChain = useRef<Promise<void>>(Promise.resolve())

  /** Save-on-blur: PATCHes only the one changed cell. */
  function saveCell(paperId: string, columnId: string): Promise<void> {
    if (!matrix) return Promise.resolve()
    const matrixId = matrix.id
    const text = cellText(paperId, columnId)
    saveChain.current = saveChain.current.then(async () => {
      try {
        const updated = await patchMatrix(matrixId, { cells: [{ paperId, columnId, text }] })
        // Keep drafts (the student may be actively typing another cell) — only
        // refresh the server-authoritative metadata/columns/papers.
        applyMatrix(updated)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not save that cell')
      }
    })
    return saveChain.current
  }

  /**
   * Apply a column edit, carrying every unsaved cell draft with it.
   *
   * A column PATCH's response resets the drafts (the column set changed, so the
   * old draft keys may no longer be valid), which used to silently discard
   * whatever the student had typed but not yet blurred. Sending the dirty cells
   * in the SAME request means the response already contains them, so the reset
   * is lossless — and it is one write, not two.
   *
   * Cells belonging to a column being REMOVED are dropped rather than sent: the
   * server validates cells against the post-edit grid and would reject the whole
   * request, losing the column edit as well as the text.
   */
  async function patchColumns(
    nextColumns: { id: string; label: string; hint?: string }[],
    failure: string,
  ) {
    if (!matrix) return
    const matrixId = matrix.id
    setBusy(true)
    setError(null)
    try {
      // Let any blur-triggered save land first, so it cannot resolve after this
      // write and reinstate a pre-edit column set.
      await saveChain.current
      const surviving = new Set(nextColumns.map((c) => c.id))
      const pending = dirtyCells().filter((c) => surviving.has(c.columnId))
      const updated = await patchMatrix(matrixId, {
        columns: nextColumns,
        ...(pending.length > 0 ? { cells: pending } : {}),
      })
      applyMatrix(updated)
      resetDraftsFrom(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure)
    } finally {
      setBusy(false)
    }
  }

  async function addColumn(label: string, hint?: string) {
    if (!matrix) return
    const taken = new Set(matrix.columns.map((c) => c.id))
    const id = slugify(label, taken)
    await patchColumns([...matrix.columns, { id, label, hint }], 'Could not add that column')
  }

  async function renameColumn(columnId: string, label: string) {
    if (!matrix) return
    const nextColumns = matrix.columns.map((c) => (c.id === columnId ? { ...c, label } : c))
    await patchColumns(nextColumns, 'Could not rename that column')
  }

  async function removeColumn(columnId: string) {
    if (!matrix) return
    const nextColumns = matrix.columns.filter((c) => c.id !== columnId)
    if (nextColumns.length === 0) return
    await patchColumns(nextColumns, 'Could not remove that column')
  }

  /** One click accept of a check-verdict `suggestedColumns` entry. */
  async function applySuggestedColumn(label: string, hint: string) {
    await addColumn(label, hint)
  }

  const canCheck = Object.values(drafts).some((t) => t.trim().length > 0) && !busy

  /**
   * Flush every unsaved cell, then check the grid the server confirms it holds.
   *
   * Returns the confirmed hash, or throws if anything is still unsaved — a
   * failed save must stop the paid call, not be graded around.
   */
  async function flushBeforeCheck(): Promise<string> {
    // The click that started this blurred a textarea, so a save is almost
    // always already in flight. Let it land before deciding what is dirty.
    await saveChain.current

    const pending = dirtyCells()
    if (pending.length > 0) {
      // ONE PATCH for the whole backlog, not one per cell.
      const updated = await patchMatrix(matrixRef.current!.id, { cells: pending })
      applyMatrix(updated)
    }

    const current = matrixRef.current
    if (!current) throw new ApiError('This matrix is no longer open', 409)
    if (dirtyCells().length > 0) {
      throw new ApiError('Some cells could not be saved — fix that before checking', 409)
    }
    return current.inputHash
  }

  async function runCheck() {
    if (!matrix || checking) return
    const id = matrix.id
    setChecking(true)
    setCheckError(null)
    try {
      const expectedHash = await flushBeforeCheck()
      const result = await checkMatrix(id, expectedHash)
      setLastResult(result)
      // A stale verdict was NOT stored server-side; do not present it as the
      // matrix's standing check either.
      if (!result.stale) {
        const current = matrixRef.current
        if (current) {
          applyMatrix({
            ...current,
            lastCheck: result.verdict,
            kpAwarded: current.kpAwarded || result.kpEarned,
          })
        }
      }
      if (result.kpEarned > 0) addCurrency({ kp: result.kpEarned })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The grid moved (a teammate's edit, or a save that never landed).
        // Reload it so the next click carries a hash the server agrees with.
        setCheckError(err.message)
        try {
          const fresh = await getMatrix(id)
          applyMatrix(fresh)
          resetDraftsFrom(fresh)
        } catch {
          // Leave the message standing; the student can reopen the matrix.
        }
      } else {
        setCheckError(err instanceof ApiError ? err.message : 'Vega could not check your synthesis — try again')
      }
    } finally {
      setChecking(false)
    }
  }

  const optionalColumns = matrix ? findTemplate(matrix.templateId)?.optionalColumns ?? [] : []

  return {
    matrix,
    loading,
    error,
    busy,
    cellText,
    setCellText,
    saveCell,
    addColumn,
    renameColumn,
    removeColumn,
    applySuggestedColumn,
    optionalColumns,
    canCheck,
    checking,
    checkError,
    lastResult,
    runCheck,
  }
}
