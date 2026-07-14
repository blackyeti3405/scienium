'use client'

import { useState, useEffect } from 'react'
import type { Overview } from './types'

/**
 * Fetch container for the teacher's per-student overview, extracted verbatim
 * from `StudentDetail` (CMP-1). The 404-vs-error split drives distinct UI
 * states (not-in-your-classes vs retry), so the raw fetch stays here.
 */
export function useStudentOverview(studentId: string) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Stale-response guard: without it, a slow response for a previous
    // studentId would overwrite the student currently on screen.
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setLoadError(null)
    fetch(`/api/teacher/student/${studentId}/overview`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true)
          return null
        }
        if (!r.ok) {
          throw new Error(`overview fetch failed: ${r.status}`)
        }
        return r.json() as Promise<Overview>
      })
      .then((d) => {
        if (d && !cancelled) setOverview(d)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this student. Try refreshing the page.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  return { overview, loading, notFound, loadError }
}
