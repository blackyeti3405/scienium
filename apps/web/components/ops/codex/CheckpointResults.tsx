'use client'

/**
 * Field Codex — checkpoint results, driven entirely by the SERVER's
 * authoritative grade (`/api/ops/codex/complete`). Three outcomes:
 *   - cap reached  → kind daily-limit notice (checked first)
 *   - passed       → celebration + first-try score + KP
 *   - failed       → focused review of the misses + Try again (reshuffles)
 */

import { Trophy, RotateCcw, ArrowRight, Moon } from 'lucide-react'
import { CODEX_PASS_RATIO, CODEX_DAILY_LESSON_CAP } from '@/lib/ops/codex/engine'
import type { CheckpointQuestion } from '@/lib/ops/codex/types'
import { Confetti } from './Confetti'

export interface CheckpointResult {
  passed: boolean
  perQuestion: { id: string; correct: boolean; explanation?: string }[]
  ratio: number
  kpEarned: number
  capReached: boolean
}

export function CheckpointResults({
  result,
  questions,
  onRetry,
  onBackToTrack,
  onNext,
  nextLabel,
}: {
  result: CheckpointResult
  questions: CheckpointQuestion[]
  onRetry: () => void
  onBackToTrack: () => void
  /** Present only on a pass with a further unlocked lesson to advance to. */
  onNext?: () => void
  nextLabel?: string
}) {
  const total = result.perQuestion.length
  const correctCount = result.perQuestion.filter((q) => q.correct).length
  const passCount = Math.ceil(CODEX_PASS_RATIO * total)
  const promptById = new Map(questions.map((q) => [q.id, q.prompt]))

  const primaryBtn = 'codex-btn-gold inline-flex items-center justify-center gap-2 font-pixel text-[9px] px-4 py-3'
  const ghostBtn = 'codex-btn-ghost inline-flex items-center justify-center gap-2 font-pixel text-[8px] px-4 py-3'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="ops-tab-body">
        <div className="max-w-xl mx-auto w-full">
          {result.capReached ? (
            <div data-testid="codex-cap-reached" className="codex-pop text-center py-6">
              <div className="grid place-items-center w-14 h-14 mx-auto rounded-lg border border-[#F5C518]/30 bg-[#F5C518]/[0.07]">
                <Moon size={22} className="text-[#F5C518]" />
              </div>
              <h2 className="font-pixel text-[11px] text-white mt-4">Daily limit reached</h2>
              <p className="text-sm text-white/60 mt-2 leading-relaxed max-w-sm mx-auto">
                Nice work — you nailed the checkpoint. But you&apos;ve already completed today&apos;s{' '}
                {CODEX_DAILY_LESSON_CAP} lessons, so this one won&apos;t count until tomorrow.
              </p>
              <button type="button" onClick={onBackToTrack} className={`${primaryBtn} mt-6`}>
                Back to track
              </button>
            </div>
          ) : result.passed ? (
            <div data-testid="codex-checkpoint-pass" className="codex-pop relative text-center py-6">
              <Confetti />
              <div className="relative grid place-items-center w-14 h-14 mx-auto rounded-lg border border-[#F5C518]/40 bg-[#F5C518]/[0.09]">
                <Trophy size={22} className="text-[#F5C518]" />
              </div>
              <h2 className="font-pixel text-[11px] text-emerald-400 mt-4">Lesson complete!</h2>
              <p className="text-sm text-white/70 mt-2">
                You got <span className="text-white font-semibold">{correctCount}</span> of {total} right on the first try.
              </p>
              {result.kpEarned > 0 ? (
                <div
                  data-testid="codex-kp-earned"
                  className="inline-flex items-center gap-1.5 font-pixel text-[10px] text-[#F5C518] border border-[#F5C518]/40 bg-[#F5C518]/[0.08] rounded-md px-3 py-2 mt-4"
                >
                  +{result.kpEarned} KP earned
                </div>
              ) : (
                <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mt-4">
                  Already earned — no new KP
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                {onNext ? (
                  <>
                    <button type="button" onClick={onNext} className={primaryBtn}>
                      Next lesson
                      <ArrowRight size={13} />
                    </button>
                    <button type="button" onClick={onBackToTrack} className={ghostBtn}>
                      Back to track
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={onBackToTrack} className={primaryBtn}>
                    Back to track
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
              {onNext && nextLabel && (
                <p className="font-pixel text-[7px] text-white/40 mt-3">Up next: {nextLabel}</p>
              )}
            </div>
          ) : (
            <div data-testid="codex-checkpoint-fail" className="codex-pop">
              <div className="text-center py-2">
                <h2 className="font-pixel text-[11px] text-white mt-1">Not quite yet</h2>
                <p className="text-sm text-white/65 mt-2">
                  You got <span className="text-white font-semibold">{correctCount}</span> of {total} — you need{' '}
                  {passCount === total ? `all ${total}` : `${passCount} of ${total}`} to pass.
                </p>
              </div>

              <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mt-6 mb-2">Review your misses</p>
              <div className="space-y-2.5">
                {result.perQuestion
                  .filter((q) => !q.correct && q.explanation)
                  .map((q) => (
                    <div key={q.id} className="border border-white/10 bg-[#0a1628] rounded-md p-3.5">
                      {promptById.get(q.id) && (
                        <p className="text-sm text-white/85 font-medium mb-1.5">{promptById.get(q.id)}</p>
                      )}
                      <p data-testid="codex-explanation" className="text-sm text-white/65 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-7 flex-wrap">
                <button type="button" onClick={onRetry} data-testid="codex-retry" className={primaryBtn}>
                  <RotateCcw size={13} />
                  Try again
                </button>
                <button type="button" onClick={onBackToTrack} className={ghostBtn}>
                  Back to track
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
