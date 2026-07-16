'use client'

import { Award, RotateCcw } from 'lucide-react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { BusyButton } from '@/components/ui/BusyButton'
import { EXPLAIN_MAX_CHARS } from '@/lib/literature/explain'
import type { useExplainBack } from './useExplainBack'

/**
 * "Explain it back" (Feynman mode) column of the Q&A panel. Presentational:
 * all state + actions come from `useExplainBack` (owned by `QAPanel`), mirrors
 * `QuizPanel`'s shape. The verdict (when present) renders ABOVE the textarea
 * so the student revises against Vega's pushback with their own last text
 * still in the box — revision is editing, not retyping from zero.
 */
export function ExplainPanel({
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
  onBack,
}: ReturnType<typeof useExplainBack> & { onBack: () => void }) {
  if (loading) {
    return <LabeledLoader label="Loading your explanation…" tone="vega" fill="flex-1" />
  }

  const verdict = state?.verdict
  const threshold = state?.threshold
  const attemptCount = state?.attemptCount ?? 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="m-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm">
          <span className="font-pixel text-[7px] text-red-300">{error}</span>
        </div>
      )}
      <div
        className={`flex-1 overflow-y-auto p-4 flex flex-col gap-4 transition-opacity ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {verdict && threshold && state && (
          <div className="flex flex-col gap-3 pb-3 border-b border-white/10">
            <div
              data-testid="explain-verdict"
              className={`px-4 py-3 rounded-sm border flex items-center gap-3 ${
                state.passed
                  ? 'bg-green-500/15 border-green-500/30'
                  : 'bg-orange-500/15 border-orange-500/30'
              }`}
            >
              {state.passed ? (
                <Award size={20} className="text-green-400 shrink-0" />
              ) : (
                <RotateCcw size={18} className="text-orange-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span
                  className={`font-pixel text-[9px] ${state.passed ? 'text-green-300' : 'text-orange-300'}`}
                >
                  {state.passed ? 'Explanation accepted' : 'Not yet — Vega pushed back'}
                </span>
                <span className="font-pixel text-[7px] text-white/40 mt-1">
                  Accuracy {verdict.accuracy}% · Completeness {verdict.completeness}% · pass{' '}
                  {threshold.accuracy}% each
                </span>
              </div>
              {state.passed && (lastResult?.kpEarned ?? 0) > 0 && (
                <span
                  className="ml-auto font-pixel text-[9px] text-[#F5C518] shrink-0"
                  title="Knowledge Points earned for this source"
                >
                  +{lastResult?.kpEarned} KP
                </span>
              )}
            </div>

            <span className="font-pixel text-[7px] text-white/40">Attempt {attemptCount}</span>

            <p className="text-[13px] text-white/70 leading-relaxed pl-3 border-l border-white/10 italic whitespace-pre-wrap">
              <span className="font-pixel text-[6px] text-white/30 uppercase tracking-widest block mb-1 not-italic">
                Your last explanation
              </span>
              {state.latestText}
            </p>

            {verdict.misconceptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-[6px] text-red-400/70 uppercase tracking-widest">
                  What you got wrong
                </span>
                <ul className="list-disc list-inside text-[13px] text-red-200/80 leading-relaxed flex flex-col gap-1">
                  {verdict.misconceptions.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {verdict.missedPoints.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-[6px] text-orange-400/70 uppercase tracking-widest">
                  What you left out
                </span>
                <ul className="list-disc list-inside text-[13px] text-orange-200/80 leading-relaxed flex flex-col gap-1">
                  {verdict.missedPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {verdict.correctPoints.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-[6px] text-green-400/70 uppercase tracking-widest">
                  What you got right
                </span>
                <ul className="list-disc list-inside text-[13px] text-green-200/80 leading-relaxed flex flex-col gap-1">
                  {verdict.correctPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {verdict.followUpQuestion && (
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-[6px] text-[#F5C518]/70 uppercase tracking-widest">
                  Vega asks
                </span>
                <p className="text-[13px] text-white/80 leading-relaxed">{verdict.followUpQuestion}</p>
              </div>
            )}
          </div>
        )}

        <p className="font-pixel text-[7px] text-white/35 leading-loose">
          In your own words — no jargon, no copying: what did this paper find, and why does it matter?
        </p>
        <textarea
          data-testid="explain-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder="Explain it back in your own words…"
          readOnly={submitting}
          className="flex-1 min-h-[140px] bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm resize-y"
        />
        <span className="font-pixel text-[6px] text-white/30 self-end">
          {draftLength} / {EXPLAIN_MAX_CHARS}
        </span>
      </div>
      <div className="border-t border-white/10 p-3 shrink-0 flex flex-col gap-2">
        <BusyButton
          busy={submitting}
          busyLabel={
            <span className="flex items-center gap-2">
              <PixelSpinner size="xs" tone="vega" /> Vega is checking your explanation…
            </span>
          }
          showSpinner={false}
          onClick={submit}
          disabled={!canSubmit}
          className="w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {canSubmit
            ? attemptCount >= 1
              ? 'Revise and re-submit'
              : 'Submit explanation'
            : 'Write a little more to submit'}
        </BusyButton>
        <button
          onClick={onBack}
          className="w-full font-pixel text-[7px] border border-white/20 text-white/50 py-2 rounded-sm hover:border-white/40 hover:text-white/70 transition-colors"
        >
          Back to quiz
        </button>
      </div>
    </div>
  )
}
