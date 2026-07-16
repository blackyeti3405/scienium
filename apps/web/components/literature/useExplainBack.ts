'use client'

import { useState, useEffect } from 'react'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { getExplanation, submitExplanation } from './api'
import { ApiError } from '@/lib/api/client'
import { EXPLAIN_MAX_CHARS } from '@/lib/literature/explain'
import type { Paper, ExplainState } from './types'

/** A one-liner is not an explanation. */
const EXPLAIN_MIN_CHARS = 40

/**
 * "Explain it back" (Feynman mode) state machine for one paper's Q&A panel:
 * load past state → write/revise → submit → verdict, unlimited attempts.
 * Modeled on `usePaperQuiz` — same shape, same `useLabCurrency` usage — and
 * called unconditionally by `QAPanel` so its state survives tab switches.
 */
export function useExplainBack(paper: Paper) {
  const { addCurrency } = useLabCurrency()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<ExplainState | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The just-returned verdict, kept separately so the UI can animate/flag
  // "+25 KP" for exactly the submission that earned it.
  const [lastResult, setLastResult] = useState<{ kpEarned: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { explanation } = await getExplanation(paper.id)
        if (cancelled) return
        if (explanation) {
          setState(explanation)
          // Revision is editing, not retyping from zero.
          setDraft(explanation.latestText)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your explanation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper.id])

  async function submit() {
    const trimmed = draft.trim()
    if (trimmed.length < EXPLAIN_MIN_CHARS || trimmed.length > EXPLAIN_MAX_CHARS) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitExplanation(paper.id, draft)
      setState((prev) => ({
        attemptCount: result.attemptNo,
        bestScore: Math.max(prev?.bestScore ?? 0, result.overall),
        passed: result.passed || (prev?.passed ?? false),
        latestText: draft,
        verdict: result.verdict,
        threshold: result.threshold,
        attempts: [
          ...(prev?.attempts ?? []),
          {
            attemptNo: result.attemptNo,
            text: draft,
            accuracy: result.accuracy,
            completeness: result.completeness,
            overall: result.overall,
            passed: result.passed,
            verdict: result.verdict,
          },
        ],
      }))
      setLastResult({ kpEarned: result.kpEarned })
      if (result.kpEarned > 0) addCurrency({ kp: result.kpEarned })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to grade your explanation')
      // Leave the draft intact so the student can resubmit.
    } finally {
      setSubmitting(false)
    }
  }

  const draftLength = draft.trim().length
  const canSubmit = draftLength >= EXPLAIN_MIN_CHARS && draftLength <= EXPLAIN_MAX_CHARS && !submitting

  return {
    loading,
    state,
    draft,
    setDraft,
    submitting,
    error,
    lastResult,
    submit,
    canSubmit,
    draftLength,
  }
}
