'use client'

import { useState, useEffect } from 'react'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import type { LogEntry, LogReferenceChip, Member, SavedLogEntry } from './types'
import { deleteLogEntry, fetchProjectLog, removeLogReference } from './api'

type ConfirmFn = ReturnType<typeof useConfirm>['confirm']
type AlertFn = ReturnType<typeof useConfirm>['alert']

/**
 * Feature-local hook for the Project Log tab: owns the entry list and its
 * load / save / link / delete lifecycle, extracted verbatim from the old
 * inlined `ProjectLogTab`. Delete and link-removal need the tab's confirm/
 * alert dialog, so both are injected rather than owned here (same shape as
 * `usePapers`).
 */
export function useProjectLog({ confirm, alert }: { confirm: ConfirmFn; alert: AlertFn }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labType, setLabType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removingRefId, setRemovingRefId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectLog()
      .then((d) => {
        // Default links/backlinks to [] — defensive against older/partial
        // responses (safety per plan step 1).
        setEntries(d.entries.map((e) => ({ ...e, links: e.links ?? [], backlinks: e.backlinks ?? [] })))
        setMembers(d.members)
        if (d.labType !== undefined) setLabType(d.labType)
      })
      .catch(() => setLoadError('Could not load the project log. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(entry: SavedLogEntry, mode: 'create' | 'edit') {
    // POST/PATCH don't return links/backlinks (a freshly created entry has
    // none; an edited entry's existing links are preserved below).
    if (mode === 'create') {
      setEntries((prev) => [
        { ...entry, entryNumber: entry.entryNumber ?? prev.length + 1, links: [], backlinks: [] },
        ...prev,
      ])
    } else {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...entry, entryNumber: e.entryNumber, links: e.links, backlinks: e.backlinks }
            : e,
        ),
      )
      setEditingId(null)
    }
  }

  // Add/remove a reference locally (immutable update of the owning entry's
  // `links`). `backlinks` on the OTHER entry are derived server-side and only
  // refresh on next full load — acceptable for v1 per plan step 5.
  function handleAddReference(fromId: string, reference: LogReferenceChip) {
    setEntries((prev) =>
      prev.map((e) => (e.id === fromId ? { ...e, links: [...e.links, reference] } : e)),
    )
  }

  async function handleRemoveReference(fromId: string, targetId: string) {
    if (removingRefId) return // guard the double-click window — one remove in flight at a time
    setRemovingRefId(targetId)
    try {
      await removeLogReference(fromId, targetId)
      setEntries((prev) =>
        prev.map((e) => (e.id === fromId ? { ...e, links: e.links.filter((l) => l.id !== targetId) } : e)),
      )
    } catch {
      await alert({ title: 'Remove link failed', message: 'Could not remove the link. Please try again.' })
    } finally {
      setRemovingRefId(null)
    }
  }

  async function handleDelete(target: LogEntry) {
    if (!(await confirm({ title: 'Delete entry', message: `Delete entry #${target.entryNumber}? This can't be undone.`, confirmLabel: 'Delete', tone: 'danger' }))) return
    setDeletingId(target.id)
    try {
      await deleteLogEntry(target.id)
      setEntries((prev) =>
        prev
          .filter((e) => e.id !== target.id)
          .map((e) => (e.entryNumber > target.entryNumber ? { ...e, entryNumber: e.entryNumber - 1 } : e)),
      )
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete the entry. Please try again.' })
    } finally {
      setDeletingId(null)
    }
  }

  return {
    entries,
    members,
    labType,
    loading,
    loadError,
    editingId,
    setEditingId,
    deletingId,
    removingRefId,
    handleSaved,
    handleAddReference,
    handleRemoveReference,
    handleDelete,
  }
}
