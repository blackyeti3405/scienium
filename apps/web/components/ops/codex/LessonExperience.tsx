'use client'

/**
 * Field Codex — lesson orchestrator. Owns the read → checkpoint → results state
 * machine and the single authoritative POST to `/api/ops/codex/complete`
 * (server stays the sole authority for pass / KP / gating). Replaces the old
 * `LessonView` in CodexTab; parent keys it by `lesson.id` so opening a new
 * lesson starts fresh in the read phase.
 */

import { useState } from 'react'
import { shuffleCheckpoint } from '@/lib/ops/codex/engine'
import type { QuestionSubmission } from '@/lib/ops/codex/engine'
import type { CheckpointQuestion, Lesson } from '@/lib/ops/codex/types'
import { LessonReader } from './LessonReader'
import { LessonCheckpoint } from './LessonCheckpoint'
import { CheckpointResults, type CheckpointResult } from './CheckpointResults'

type Phase = 'read' | 'checkpoint' | 'results'

export function LessonExperience({
  trackSlug,
  trackLabel,
  lesson,
  unitLabel,
  completed,
  capReached,
  nextLesson,
  onBackToTrack,
  onOpenLesson,
  onCompleted,
}: {
  trackSlug: string
  trackLabel: string
  lesson: Lesson
  unitLabel: string
  completed: boolean
  capReached: boolean
  /** Next unlocked, not-yet-complete lesson in track order (for "Next lesson"). */
  nextLesson: Lesson | null
  onBackToTrack: () => void
  onOpenLesson: (lesson: Lesson) => void
  onCompleted: () => void
}) {
  const [phase, setPhase] = useState<Phase>('read')
  const [questions, setQuestions] = useState<CheckpointQuestion[]>(lesson.checkpoint.questions)
  const [attempt, setAttempt] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckpointResult | null>(null)

  async function submit(submission: { answers: QuestionSubmission[] }) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/ops/codex/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackSlug, lessonId: lesson.id, submission }),
      })
      const out = (await res.json()) as CheckpointResult & { error?: string }
      if (!res.ok) throw new Error(out.error ?? 'Could not grade checkpoint')
      setResult(out)
      setPhase('results')
      onCompleted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function retry() {
    const next = attempt + 1
    setAttempt(next)
    setQuestions(shuffleCheckpoint(lesson.checkpoint.questions, next))
    setResult(null)
    setPhase('checkpoint')
  }

  if (phase === 'read') {
    return (
      <LessonReader
        lesson={lesson}
        trackLabel={trackLabel}
        unitLabel={unitLabel}
        completed={completed}
        capReached={capReached}
        onBack={onBackToTrack}
        onStartCheckpoint={() => setPhase('checkpoint')}
      />
    )
  }

  if (phase === 'checkpoint') {
    return (
      <LessonCheckpoint
        key={attempt}
        questions={questions}
        submitting={submitting}
        submitError={submitError}
        onSubmit={submit}
        onExit={() => setPhase('read')}
      />
    )
  }

  return (
    <CheckpointResults
      result={result!}
      questions={questions}
      onRetry={retry}
      onBackToTrack={onBackToTrack}
      onNext={result!.passed && !result!.capReached && nextLesson ? () => onOpenLesson(nextLesson) : undefined}
      nextLabel={nextLesson?.label}
    />
  )
}
