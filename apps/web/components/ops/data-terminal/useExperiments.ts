'use client'

import { useCallback, useState, useEffect } from 'react'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import { ApiError } from '@/lib/api/client'
import type { Experiment } from './types'
import { deleteExperiment, listExperiments } from './api'

type ConfirmFn = ReturnType<typeof useConfirm>['confirm']
type AlertFn = ReturnType<typeof useConfirm>['alert']

/**
 * Feature-local experiments hook for the Data Terminal: owns the experiment
 * list and its load / upsert / delete lifecycle, extracted verbatim from
 * `ExperimentsView`. Delete needs the view's confirm/alert dialog and must
 * close an open detail view, so both are injected (`confirm`/`alert`,
 * `onDeleted`) rather than owned here — same shape as `usePapers`.
 */
export function useExperiments({
  confirm,
  alert,
  onDeleted,
}: {
  confirm: ConfirmFn
  alert: AlertFn
  onDeleted?: (experimentId: string) => void
}) {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Everything that is neither 403 nor success used to fall through to the
  // empty list — a team is shown "No experiments yet" and the button to create
  // their first one, next to data they have already collected (§0.9 Row C2).
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(() => {
    setLoadError(false)
    setLoading(true)
    listExperiments()
      .then((d) => setExperiments(d.experiments))
      .catch((err) => {
        // 403 = phase-locked (Data Terminal opens at `working`) — that is a
        // real state with its own screen, not a failure.
        if (err instanceof ApiError && err.status === 403) setLocked(true)
        else setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function upsertExperiment(exp: Experiment) {
    setExperiments((list) => {
      const idx = list.findIndex((e) => e.id === exp.id)
      if (idx === -1) return [exp, ...list]
      const next = [...list]
      next[idx] = exp
      return next
    })
  }

  async function removeExperiment(exp: Experiment) {
    if (deletingId) return // guard the double-click window
    if (
      !(await confirm({
        title: 'Delete experiment',
        message: `Delete "${exp.title}" and all ${exp.measurementCount} of its data points? This can't be undone.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setDeletingId(exp.id)
    try {
      await deleteExperiment(exp.id)
      setExperiments((list) => list.filter((e) => e.id !== exp.id))
      onDeleted?.(exp.id)
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete the experiment. Please try again.' })
    } finally {
      setDeletingId(null)
    }
  }

  return {
    experiments,
    loading,
    locked,
    loadError,
    retryLoad: load,
    deletingId,
    upsertExperiment,
    removeExperiment,
  }
}
