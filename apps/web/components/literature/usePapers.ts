'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CredibilityTier } from '@prisma/client'
import type { useConfirm } from '@/components/ui/ConfirmDialog'
import { uploadWithProgress } from '@/lib/uploadWithProgress'
import { type Paper, TOTAL_SLOTS } from './types'
import { deletePaper, getPaper, listPapers } from './api'

type ConfirmFn = ReturnType<typeof useConfirm>['confirm']

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
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
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
              doi: p.doi,
            })),
        )
      })
      .catch((err) => console.error('[papers] failed to load:', err))
      .finally(() => setPapersLoaded(true))
  }, [])

  const pollStatus = useCallback((paperId: string) => {
    const interval = setInterval(async () => {
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
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 3000)
  }, [])

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
    const prev = papers
    // Optimistic removal; close the Q&A view if it was open on this paper
    setPapers((cur) => cur.filter((p) => p.id !== paper.id))
    onPaperDeleted?.(paper.id)
    try {
      await deletePaper(paper.id)
    } catch (err) {
      console.error('[papers] delete failed:', err)
      setPapers(prev) // roll back
      setUploadError('Could not delete the source. Please try again.')
    }
  }

  const readyCount = papers.filter((p) => p.status === 'ready').length
  const locked = readyCount >= TOTAL_SLOTS

  return {
    papers,
    setPapers,
    papersLoaded,
    uploadError,
    setUploadError,
    handleUpload,
    handleDelete,
    readyCount,
    locked,
  }
}
