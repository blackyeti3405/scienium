'use client'

import { useState, useEffect } from 'react'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { buildRetryAnswers, deriveFailedQuestionIds } from './quizDerive'
import type { Paper, QuizQuestionView, GradeResult, QuizPhase } from './types'

/**
 * Comprehension-quiz state machine for one paper's Q&A panel: generate → answer
 * → grade → results → targeted retry. Extracted verbatim from `QAPanel` and
 * called unconditionally there, so the `phase` machine (which also drives the
 * chat tab) stays the single source of truth exactly as before.
 */
export function usePaperQuiz(paper: Paper, onProficiencyEarned?: () => void) {
  const { addCurrency } = useLabCurrency()
  const [phase, setPhase] = useState<QuizPhase>('loading')
  const [quiz, setQuiz] = useState<{ sessionId: string; questions: QuizQuestionView[] } | null>(
    null,
  )
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<GradeResult | null>(null)
  const [hasPastResults, setHasPastResults] = useState(false)
  const [quizError, setQuizError] = useState<string | null>(null)
  // Retry (targeted re-answer) state — separate from the first-attempt `answers`
  // so the student's original (wrong) answers stay visible for reference.
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({})
  const [newQuestion, setNewQuestion] = useState<QuizQuestionView | null>(null)
  const [retryLoading, setRetryLoading] = useState(false)

  // On open: if a graded quiz already exists, show those past answers + feedback
  // (they stay accessible). A fresh quiz is generated ONLY on an explicit
  // `session: null` — a failed or non-OK read is NOT "no quiz yet" (REFACTOR2
  // P1-S4). The old catch-all fell through to `generateQuiz()`, so a transient
  // read outage silently spent an Anthropic call and could strand the existing
  // session. On failure we surface a recoverable error; the banner's retry
  // button makes generating an explicit student action.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let data: { session?: unknown; error?: string }
      try {
        const res = await fetch(`/api/papers/${paper.id}/quiz`)
        data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? 'Could not load your quiz')
      } catch (err) {
        if (cancelled) return
        setQuizError(
          err instanceof Error ? err.message : 'Could not load your quiz',
        )
        setPhase('quiz')
        return
      }

      if (data.session) {
        const s = data.session as {
          sessionId: string
          questions: QuizQuestionView[]
          answers?: Record<string, string>
          score: number
          passed: boolean
          threshold: number
          results: GradeResult['results']
        }
        setQuiz({ sessionId: s.sessionId, questions: s.questions })
        setAnswers(s.answers ?? {})
        setResults({ score: s.score, passed: s.passed, threshold: s.threshold, results: s.results })
        setHasPastResults(true)
        setPhase('results')
        return
      }
      generateQuiz()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateQuiz() {
    setPhase('loading')
    setQuizError(null)
    setResults(null)
    setAnswers({})
    try {
      const res = await fetch(`/api/papers/${paper.id}/quiz`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load quiz')
      setQuiz({ sessionId: data.sessionId, questions: data.questions })
      setPhase('quiz')
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to load quiz')
      setPhase('quiz')
    }
  }

  async function submitQuiz() {
    if (!quiz) return
    setPhase('grading')
    setQuizError(null)
    try {
      const res = await fetch(`/api/papers/${paper.id}/quiz/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: quiz.sessionId,
          answers: quiz.questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? '' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Grading failed')
      setResults(data)
      setHasPastResults(true)
      setPhase('results')
      // Reflect freshly-earned KP in the live balance so the StatusStrip animates.
      if (data.kpEarned > 0) addCurrency({ kp: data.kpEarned })
      if (data.passed) onProficiencyEarned?.()
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Grading failed')
      setPhase('quiz')
    }
  }

  /** Ids of questions scored below the pass threshold on the latest grading. */
  const failedQuestionIds = deriveFailedQuestionIds(results)

  // Enter targeted-retry mode: fetch (idempotently — generates once, server-
  // side) the one fresh extra question so the retry form can show it with its
  // own empty textarea before anything is submitted.
  async function startRetry() {
    if (!quiz) return
    setRetryAnswers({})
    setQuizError(null)
    setRetryLoading(true)
    setPhase('retry')
    try {
      // POST, not GET: preparing generates the fresh question, which costs money
      // (REFACTOR2 P2-S6). Still idempotent server-side — re-entering the retry
      // view returns the same question rather than paying again.
      const res = await fetch(`/api/papers/${paper.id}/quiz/retry/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: quiz.sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to prepare retry')
      const extra = (data.questions as QuizQuestionView[]).find((q) => q.id === data.newQuestionId)
      setNewQuestion(extra ?? null)
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Failed to prepare retry')
      setPhase('results')
    } finally {
      setRetryLoading(false)
    }
  }

  async function submitRetry() {
    if (!quiz || !results || !newQuestion) return
    setPhase('retrying')
    setQuizError(null)
    try {
      const res = await fetch(`/api/papers/${paper.id}/quiz/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: quiz.sessionId,
          answers: buildRetryAnswers(failedQuestionIds, newQuestion.id, retryAnswers),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Retry failed')
      // The retry response carries the FULL current question set (original +
      // new question), so replace both `quiz.questions` and `results` with it.
      setQuiz({ sessionId: quiz.sessionId, questions: data.questions })
      setResults({
        score: data.score,
        passed: data.passed,
        threshold: data.threshold,
        kpEarned: data.kpEarned,
        results: data.results,
      })
      setHasPastResults(true)
      setNewQuestion(null)
      setPhase('results')
      if (data.kpEarned > 0) addCurrency({ kp: data.kpEarned })
      if (data.passed) onProficiencyEarned?.()
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Retry failed')
      setPhase('retry')
    }
  }

  const allAnswered = !!quiz && quiz.questions.every((q) => (answers[q.id] ?? '').trim().length > 0)
  const failedQuestions = quiz?.questions.filter((q) => failedQuestionIds.has(q.id)) ?? []
  const allRetryAnswered =
    !!newQuestion &&
    failedQuestions.every((q) => (retryAnswers[q.id] ?? '').trim().length > 0) &&
    (retryAnswers[newQuestion.id] ?? '').trim().length > 0

  return {
    phase,
    setPhase,
    quiz,
    answers,
    setAnswers,
    results,
    hasPastResults,
    quizError,
    retryAnswers,
    setRetryAnswers,
    newQuestion,
    retryLoading,
    generateQuiz,
    submitQuiz,
    startRetry,
    submitRetry,
    allAnswered,
    failedQuestions,
    allRetryAnswered,
  }
}
