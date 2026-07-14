'use client'

import { useState, useEffect } from 'react'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import type { FailureEntry, SavedFailureEntry } from './types'
import { deleteFailureEntry, fetchFailureLog } from './api'

type ConfirmFn = ReturnType<typeof useConfirm>['confirm']
type AlertFn = ReturnType<typeof useConfirm>['alert']

/**
 * Feature-local hook for the Failure Log tab: owns the entry list and its
 * load / save / delete / follow-up lifecycle, extracted verbatim from the old
 * inlined `FailureLogTab`. Delete needs the tab's confirm/alert dialog, so
 * both are injected rather than owned here (same shape as `usePapers`).
 */
export function useFailureLog({ confirm, alert }: { confirm: ConfirmFn; alert: AlertFn }) {
  const [entries, setEntries] = useState<FailureEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchFailureLog()
      .then((d) => setEntries(d.entries))
      .catch(() => setLoadError('Could not load the failure log. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(entry: SavedFailureEntry, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setEntries((prev) => [{ ...entry, followup: entry.followup ?? null }, ...prev])
    } else {
      // Preserve the existing followup — the edit PATCH route doesn't return it.
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...entry, followup: e.followup } : e)),
      )
      setEditingId(null)
    }
  }

  function handleFollowupUpdated(updated: FailureEntry) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  async function handleDelete(target: FailureEntry) {
    if (!(await confirm({ title: 'Delete entry', message: "Delete this failure entry? This can't be undone.", confirmLabel: 'Delete', tone: 'danger' }))) return
    setDeletingId(target.id)
    try {
      await deleteFailureEntry(target.id)
      setEntries((prev) => prev.filter((e) => e.id !== target.id))
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete the entry. Please try again.' })
    } finally {
      setDeletingId(null)
    }
  }

  return {
    entries,
    loading,
    loadError,
    editingId,
    setEditingId,
    deletingId,
    handleSaved,
    handleFollowupUpdated,
    handleDelete,
  }
}
