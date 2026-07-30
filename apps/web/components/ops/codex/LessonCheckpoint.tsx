'use client'

/**
 * Field Codex — the checkpoint phase, redesigned Khan-style: ONE question at a
 * time, distraction-free, with immediate per-question feedback.
 *
 * Flow per question: pick → Check (locks + reveals correct/incorrect and an
 * explanation, colouring the choices) → Continue. On the last question, "See
 * results" posts the whole locked batch to the server, which stays the sole
 * authority for pass / KP / gating (this component's instant feedback reuses
 * the same `gradeCheckpoint` engine, so the two never disagree).
 *
 * A pip row doubles as the "how many questions" affordance and the "did I get
 * it first try" record — each pip fills green/red as its question is checked.
 *
 * State fully resets when the parent bumps `key={attempt}` on retry.
 */

import { useMemo, useState } from 'react'
import { ChevronLeft, Check, CheckCircle2, XCircle } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { McAnswer, OrderingAnswer, MatchingAnswer, checkAnswer, type AnswerReveal } from './answers'
import type { CheckpointQuestion } from '@/lib/ops/codex/types'
import type { QuestionSubmission } from '@/lib/ops/codex/engine'

interface Locked {
  answer: QuestionSubmission
  reveal: AnswerReveal
}

export function LessonCheckpoint({
  questions,
  submitting,
  submitError,
  onSubmit,
  onExit,
}: {
  questions: CheckpointQuestion[]
  submitting: boolean
  submitError: string | null
  onSubmit: (submission: { answers: QuestionSubmission[] }) => void
  onExit: () => void
}) {
  const [index, setIndex] = useState(0)
  const [locked, setLocked] = useState<Record<string, Locked>>({})
  const [mc, setMc] = useState<Record<string, string>>({})
  const [order, setOrder] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(questions.filter((q) => q.kind === 'ordering').map((q) => [q.id, q.items.map((it) => it.id)])),
  )
  const [match, setMatch] = useState<Record<string, Record<string, string>>>({})

  const total = questions.length
  const current = questions[index]
  const currentLock = locked[current.id]
  const isLast = index === total - 1

  function draftFor(q: CheckpointQuestion): QuestionSubmission {
    if (q.kind === 'mc') return { kind: 'mc', id: q.id, selectedOptionId: mc[q.id] ?? '' }
    if (q.kind === 'ordering') return { kind: 'ordering', id: q.id, order: order[q.id] ?? q.items.map((it) => it.id) }
    const pairs = Object.entries(match[q.id] ?? {}).filter(([, r]) => r) as [string, string][]
    return { kind: 'matching', id: q.id, pairs }
  }

  const canCheck = useMemo(() => {
    if (current.kind === 'mc') return !!mc[current.id]
    if (current.kind === 'ordering') return true
    return current.left.every((l) => match[current.id]?.[l.id])
  }, [current, mc, order, match]) // eslint-disable-line react-hooks/exhaustive-deps

  function check() {
    const answer = draftFor(current)
    setLocked((prev) => ({ ...prev, [current.id]: { answer, reveal: checkAnswer(current, answer) } }))
  }

  function advance() {
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    onSubmit({ answers: questions.map((q) => locked[q.id]?.answer ?? draftFor(q)) })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="ops-tab-body">
        <div className="max-w-xl mx-auto w-full" data-testid="codex-checkpoint">
          {/* Header: exit + counter + pips */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLeft size={12} /> Reading
            </button>
            <span className="font-pixel text-[8px] text-white/45 uppercase tracking-widest">
              Question {index + 1} of {total}
            </span>
          </div>

          <div className="flex gap-1.5 mt-3" aria-hidden>
            {questions.map((q, j) => {
              const lk = locked[q.id]
              const tone = lk
                ? lk.reveal.correct
                  ? 'bg-emerald-400/90 border-emerald-400/90'
                  : 'bg-red-400/70 border-red-400/70'
                : j === index
                  ? 'border-[#F5C518] bg-[#F5C518]/25'
                  : 'border-white/12 bg-white/[0.02]'
              return <span key={q.id} className={`h-2 flex-1 rounded-sm border transition-colors duration-300 ${tone}`} />
            })}
          </div>

          {/* Question — remounts (crossfade) on index change */}
          <div key={current.id} className="codex-q-enter mt-7">
            <p className="text-[17px] leading-snug text-white font-medium">{current.prompt}</p>
            {current.kind === 'mc' && (
              <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mt-2 mb-3">Choose 1 answer</p>
            )}
            <div className={current.kind === 'mc' ? '' : 'mt-4'}>
              {current.kind === 'mc' && (
                <McAnswer
                  question={current}
                  value={mc[current.id]}
                  onChange={(v) => setMc((p) => ({ ...p, [current.id]: v }))}
                  reveal={currentLock?.reveal}
                />
              )}
              {current.kind === 'ordering' && (
                <OrderingAnswer
                  question={current}
                  order={order[current.id] ?? current.items.map((it) => it.id)}
                  onChange={(o) => setOrder((p) => ({ ...p, [current.id]: o }))}
                  reveal={currentLock?.reveal}
                />
              )}
              {current.kind === 'matching' && (
                <MatchingAnswer
                  question={current}
                  pairs={match[current.id] ?? {}}
                  onChange={(pairs) => setMatch((p) => ({ ...p, [current.id]: pairs }))}
                  reveal={currentLock?.reveal}
                />
              )}
            </div>

            {/* Immediate feedback */}
            {currentLock && (
              <div
                role="status"
                aria-live="polite"
                className={`codex-reveal-enter mt-4 rounded-md border p-3.5 ${
                  currentLock.reveal.correct
                    ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
                    : 'border-red-400/30 bg-red-400/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {currentLock.reveal.correct ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="font-pixel text-[8px] text-emerald-400 uppercase tracking-widest">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} className="text-red-400" />
                      <span className="font-pixel text-[8px] text-red-400 uppercase tracking-widest">Not quite</span>
                    </>
                  )}
                </div>
                {currentLock.reveal.explanation && (
                  <p data-testid="codex-explanation" className="text-sm text-white/75 leading-relaxed">
                    {currentLock.reveal.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Controls — one primary action, changes by state */}
          <div className="mt-6">
            {!currentLock ? (
              <BusyButton
                busy={false}
                disabled={!canCheck}
                onClick={check}
                data-testid="codex-check"
                className="codex-btn-gold w-full font-pixel text-[9px] px-4 py-3.5"
              >
                Check
              </BusyButton>
            ) : isLast ? (
              <BusyButton
                busy={submitting}
                busyLabel="Grading…"
                onClick={advance}
                data-testid="codex-checkpoint-submit"
                className="codex-btn-gold w-full inline-flex items-center justify-center gap-2 font-pixel text-[9px] px-4 py-3.5"
              >
                See results
              </BusyButton>
            ) : (
              <button
                type="button"
                onClick={advance}
                data-testid="codex-continue"
                className="codex-btn-gold w-full flex items-center justify-center gap-2 font-pixel text-[9px] px-4 py-3.5"
              >
                Continue
                <Check size={13} strokeWidth={3} />
              </button>
            )}
            {submitError && <p className="font-pixel text-[7px] text-red-400 mt-2 text-center">{submitError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
