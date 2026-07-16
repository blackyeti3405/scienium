'use client'

import { useState, useEffect, useCallback } from 'react'
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

function cellKey(paperId: string, columnId: string): string {
  return `${paperId}:${columnId}`
}

function slugify(label: string, taken: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'column'
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/**
 * Owns state for ONE open Synthesis Matrix: the loaded grid, per-cell text
 * drafts (saved on blur, one PATCH per changed cell — never the whole grid),
 * column edits (rename/add/remove), the check flow, and applying a suggested
 * column. Modeled on `useExplainBack`/`usePapers` — called for exactly one
 * matrix id at a time.
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

  const resetDraftsFrom = useCallback((m: SynthesisMatrixResponse) => {
    const next: Record<string, string> = {}
    for (const c of m.cells) next[cellKey(c.paperId, c.columnId)] = c.text
    setDrafts(next)
  }, [])

  useEffect(() => {
    if (!matrixId) {
      setMatrix(null)
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
        setMatrix(m)
        resetDraftsFrom(m)
        if (m.lastCheck) setLastResult({ verdict: m.lastCheck, cached: true, kpEarned: 0 })
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load this matrix')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [matrixId, resetDraftsFrom])

  function cellText(paperId: string, columnId: string): string {
    return drafts[cellKey(paperId, columnId)] ?? ''
  }

  function setCellText(paperId: string, columnId: string, text: string) {
    setDrafts((prev) => ({ ...prev, [cellKey(paperId, columnId)]: text }))
  }

  /** Save-on-blur: PATCHes only the one changed cell. */
  async function saveCell(paperId: string, columnId: string) {
    if (!matrix) return
    const text = cellText(paperId, columnId)
    try {
      const updated = await patchMatrix(matrix.id, { cells: [{ paperId, columnId, text }] })
      // Keep drafts (the student may be actively typing another cell) — only
      // refresh the server-authoritative metadata/columns/papers.
      setMatrix(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save that cell')
    }
  }

  async function addColumn(label: string, hint?: string) {
    if (!matrix) return
    const taken = new Set(matrix.columns.map((c) => c.id))
    const id = slugify(label, taken)
    const nextColumns = [...matrix.columns, { id, label, hint }]
    setBusy(true)
    setError(null)
    try {
      const updated = await patchMatrix(matrix.id, { columns: nextColumns })
      setMatrix(updated)
      resetDraftsFrom(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that column')
    } finally {
      setBusy(false)
    }
  }

  async function renameColumn(columnId: string, label: string) {
    if (!matrix) return
    const nextColumns = matrix.columns.map((c) => (c.id === columnId ? { ...c, label } : c))
    setBusy(true)
    setError(null)
    try {
      const updated = await patchMatrix(matrix.id, { columns: nextColumns })
      setMatrix(updated)
      resetDraftsFrom(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not rename that column')
    } finally {
      setBusy(false)
    }
  }

  async function removeColumn(columnId: string) {
    if (!matrix) return
    const nextColumns = matrix.columns.filter((c) => c.id !== columnId)
    if (nextColumns.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const updated = await patchMatrix(matrix.id, { columns: nextColumns })
      setMatrix(updated)
      resetDraftsFrom(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove that column')
    } finally {
      setBusy(false)
    }
  }

  /** One click accept of a check-verdict `suggestedColumns` entry. */
  async function applySuggestedColumn(label: string, hint: string) {
    await addColumn(label, hint)
  }

  const canCheck = Object.values(drafts).some((t) => t.trim().length > 0)

  async function runCheck() {
    if (!matrix || checking) return
    setChecking(true)
    setCheckError(null)
    try {
      const result = await checkMatrix(matrix.id)
      setLastResult(result)
      setMatrix((prev) =>
        prev ? { ...prev, lastCheck: result.verdict, kpAwarded: prev.kpAwarded || result.kpEarned } : prev,
      )
      if (result.kpEarned > 0) addCurrency({ kp: result.kpEarned })
    } catch (err) {
      setCheckError(err instanceof ApiError ? err.message : 'Vega could not check your synthesis — try again')
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
