'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    listExperiments()
      .then((d) => setExperiments(d.experiments))
      .catch((err) => {
        // 403 = phase-locked (Data Terminal opens at `working`); other
        // failures fall through to the empty list, matching the old inline
        // fetch's `.catch(() => {})`.
        if (err instanceof ApiError && err.status === 403) setLocked(true)
      })
      .finally(() => setLoading(false))
  }, [])

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
    deletingId,
    upsertExperiment,
    removeExperiment,
  }
}
