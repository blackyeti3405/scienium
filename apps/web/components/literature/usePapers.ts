'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { CredibilityTier } from '@prisma/client'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import { uploadWithProgress } from '@/lib/uploadWithProgress'
import { type Paper, TOTAL_SLOTS } from './types'
import { deletePaper, getPaper, listPapers } from './api'

type ConfirmFn = ReturnType<typeof useConfirm>['confirm']

/** Poll cadence + cap for a processing paper (UX-2): ~20 polls at 3s ≈ 1 min,
 *  after which the paper flips to an actionable error instead of spinning forever. */
const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20

/**
 * Feature-local papers hook for the Literature Review: owns the source list and
 * its load / upload / poll / delete lifecycle, extracted verbatim from
 * `LiteratureFeature`. Delete needs the shell's confirm dialog and must close an
 * open Q&A view, so both are injected (`confirm`, `onPaperDeleted`) rather than
 * owned here.
 */
export function usePapers({
  confirm,
  onPaperDeleted,
}: {
  confirm: ConfirmFn
  onPaperDeleted?: (paperId: string) => void
}) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [papersLoaded, setPapersLoaded] = useState(false)
  // A failed list load is tracked separately from "loaded with zero papers" —
  // on flaky wifi a returning team must see a retry banner, never the empty
  // first-run slots implying their work is gone (BLK-7).
  const [loadError, setLoadError] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Live status polls, tracked so unmount clears every in-flight interval —
  // a poll must never keep ticking (and setting state) past the feature (UX-2).
  const pollIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())
  // Which paper ids already have a poll running. Without it, resuming polls on
  // every load (below) would stack a second interval on the same paper each
  // time the student hits Try again.
  const pollingIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const intervals = pollIntervalsRef.current
    const ids = pollingIdsRef.current
    return () => {
      intervals.forEach(clearInterval)
      intervals.clear()
      ids.clear()
    }
  }, [])

  const pollStatus = useCallback((paperId: string) => {
    if (pollingIdsRef.current.has(paperId)) return
    pollingIdsRef.current.add(paperId)
    let polls = 0
    const interval = setInterval(async () => {
      const stop = () => {
        clearInterval(interval)
        pollIntervalsRef.current.delete(interval)
        pollingIdsRef.current.delete(paperId)
      }
      // Capped (UX-2): after MAX_POLLS the paper flips to an actionable error
      // state instead of showing "processing" forever. The backend job keeps
      // its own retry/terminal lifecycle; a reload re-syncs the real status.
      if (++polls > MAX_POLLS) {
        stop()
        setPapers((prev) =>
          prev.map((p) => (p.id === paperId ? { ...p, status: 'error' as const } : p)),
        )
        setUploadError(
          'A source is taking too long to process — it has been marked failed here. Reload to re-check, or delete and re-upload it.',
        )
        return
      }
      try {
        const data = await getPaper(paperId)
        if (data.status === 'ready' || data.status === 'error') {
          setPapers((prev) =>
            prev.map((p) =>
              p.id === paperId
                ? {
                    ...p,
                    status: data.status,
                    title: data.title ?? p.title,
                    authors: data.authors ?? p.authors,
                  }
                : p,
            ),
          )
          stop()
        }
      } catch {
        // Transient fetch failure — count it against the cap and keep polling
        // rather than silently abandoning the paper in "processing".
      }
    }, POLL_INTERVAL_MS)
    pollIntervalsRef.current.add(interval)
  }, [])

  const loadPapers = useCallback(() => {
    setLoadError(false)
    setPapersLoaded(false)
    listPapers()
      .then((data) => {
        setPapers(
          data.papers.map((p) => ({
              id: p.id,
              title: p.title,
              authors: p.authors,
              status: p.status,
              proficiencyDemonstrated: Boolean(p.proficiencyDemonstrated),
              fileUrl: p.fileUrl ?? undefined,
              createdAt: p.createdAt,
              credibilityTier: (p.credibilityTier as CredibilityTier | null) ?? null,
            })),
        )
        // Resume polling anything the server still reports as processing.
        // `pollStatus` used to be reachable only from the upload path, so a
        // reload during ingestion stranded the row on "processing" until the
        // student reloaded again and got lucky with the timing.
        data.papers
          .filter((p) => p.status === 'processing')
          .forEach((p) => pollStatus(p.id))
      })
      .catch((err) => {
        console.error('[papers] failed to load:', err)
        setLoadError(true)
      })
      .finally(() => setPapersLoaded(true))
  }, [pollStatus])

  useEffect(() => {
    loadPapers()
  }, [loadPapers])

  async function handleUpload(file: File) {
    setUploadError(null)
    const tempId = `temp-${Date.now()}`
    const placeholder: Paper = {
      id: tempId,
      title: file.name.replace(/\.pdf$/i, ''),
      authors: [],
      status: 'uploading',
      proficiencyDemonstrated: false,
      createdAt: new Date().toISOString(),
      uploadProgress: 0,
    }
    setPapers((prev) => [...prev, placeholder])

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await uploadWithProgress('/api/papers', form, (fraction) =>
        setPapers((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, uploadProgress: Math.round(fraction * 100) } : p)),
        ),
      )
      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) throw new Error((data.error as string) ?? `Upload failed (${res.status})`)

      setPapers((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? {
                id: data.id as string,
                title: (data.title as string) ?? file.name.replace(/\.pdf$/i, ''),
                authors: (data.authors as string[]) ?? [],
                status: 'processing',
                proficiencyDemonstrated: false,
                fileUrl: data.fileUrl as string | undefined,
                createdAt: data.createdAt as string,
              }
            : p,
        ),
      )

      pollStatus(data.id as string)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      console.error('[upload] error:', msg)
      setUploadError(msg)
      setPapers((prev) =>
        prev.map((p) => (p.id === tempId ? { ...p, status: 'error' as const } : p)),
      )
    }
  }

  async function handleDelete(paper: Paper) {
    if (!(await confirm({ title: 'Delete source', message: `Delete "${paper.title}"? This removes the source and any quiz progress.`, confirmLabel: 'Delete', tone: 'danger' }))) return

    // A failed upload leaves a placeholder that exists only on this screen.
    // Sending its `temp-…` id to the API 404s, and the rollback below then
    // resurrected the dead row plus an error the student can do nothing about.
    if (paper.id.startsWith('temp-')) {
      setPapers((cur) => cur.filter((p) => p.id !== paper.id))
      onPaperDeleted?.(paper.id)
      return
    }

    // Optimistic removal; close the Q&A view if it was open on this paper
    setPapers((cur) => cur.filter((p) => p.id !== paper.id))
    onPaperDeleted?.(paper.id)
    try {
      await deletePaper(paper.id)
    } catch (err) {
      console.error('[papers] delete failed:', err)
      // Keyed re-insert, not a whole-list snapshot: an upload started during
      // the DELETE would be wiped by restoring the pre-delete array.
      setPapers((cur) => (cur.some((p) => p.id === paper.id) ? cur : [...cur, paper]))
      setUploadError('Could not delete the source. Please try again.')
    }
  }

  const readyCount = papers.filter((p) => p.status === 'ready').length
  const locked = readyCount >= TOTAL_SLOTS

  return {
    papers,
    setPapers,
    papersLoaded,
    loadError,
    retryLoad: loadPapers,
    uploadError,
    setUploadError,
    handleUpload,
    handleDelete,
    readyCount,
    locked,
  }
}
