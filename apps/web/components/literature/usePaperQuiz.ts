'use client'

import { useState, useEffect } from 'react'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { buildRetryAnswers, deriveFailedQuestionIds } from './quizDerive'
import { getQuizHistory } from './api'
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
  // (they stay accessible). Otherwise land on `idle` and WAIT — generating a
  // quiz is a paid Anthropic call and must follow a student pressing the button.
  //
  // Two ways the old effect spent that money unasked: it fell through to
  // `generateQuiz()` on `session: null` with no click at all, and it read
  // `data.session` off an unvalidated body, so a malformed-but-200 response
  // reached the same branch. `getQuizHistory` parses the body, so a bad one
  // throws into the catch and becomes a retryable error instead.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { session } = await getQuizHistory(paper.id)
        if (cancelled) return
        if (!session) {
          setPhase('idle')
          return
        }
        setQuiz({ sessionId: session.sessionId, questions: session.questions })
        setAnswers(session.answers ?? {})
        setResults({
          score: session.score,
          passed: session.passed,
          threshold: session.threshold,
          results: session.results,
        })
        setHasPastResults(true)
        setPhase('results')
      } catch (err) {
        if (cancelled) return
        setQuizError(err instanceof Error ? err.message : 'Could not load your quiz')
        setPhase('idle')
      }
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
