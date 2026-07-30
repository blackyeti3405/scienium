'use client'

import { useState, useEffect } from 'react'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import type { LogEntry, LogReferenceChip, Member, SavedLogEntry } from './types'
import { deleteLogEntry, fetchProjectLog, removeLogReference } from './api'
import { appendOlderEntries, applySavedEntry, removeEntryAndRenumber } from './logListOps'

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
  // Pagination (PERF-4): total entries on the server (the loaded list may be a
  // prefix) + the cursor for the next OLDER page (null = fully loaded).
  const [total, setTotal] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removingRefId, setRemovingRefId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjectLog()
      .then((d) => {
        // Default links/backlinks to [] — defensive against older/partial
        // responses (safety per plan step 1).
        setEntries(d.entries.map((e) => ({ ...e, links: e.links ?? [], backlinks: e.backlinks ?? [] })))
        setMembers(d.members ?? [])
        setTotal(d.total)
        setNextCursor(d.nextCursor)
        if (d.labType !== undefined) setLabType(d.labType)
      })
      .catch(() => setLoadError('Could not load the project log. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  // "Load older" — fetch the next page below the oldest loaded entry and append.
  async function loadOlder() {
    if (!nextCursor || loadingOlder) return
    setLoadingOlder(true)
    try {
      const d = await fetchProjectLog(nextCursor)
      setEntries((prev) => appendOlderEntries(prev, d.entries) as LogEntry[])
      setNextCursor(d.nextCursor)
    } catch {
      await alert({ title: 'Load failed', message: 'Could not load older entries. Please try again.' })
    } finally {
      setLoadingOlder(false)
    }
  }

  function handleSaved(entry: SavedLogEntry, mode: 'create' | 'edit') {
    // POST/PATCH don't return links/backlinks (a freshly created entry has
    // none; an edited entry's existing links are preserved below).
    if (mode === 'create') {
      setEntries((prev) => applySavedEntry(prev, entry, 'create', total))
      setTotal((t) => t + 1)
    } else {
      setEntries((prev) => applySavedEntry(prev, entry, 'edit', total))
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
      setEntries((prev) => removeEntryAndRenumber(prev, target))
      setTotal((t) => Math.max(0, t - 1))
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
    total,
    hasOlder: nextCursor !== null,
    loadingOlder,
    loadOlder,
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
