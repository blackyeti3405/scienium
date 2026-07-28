'use client'

import { Award, RotateCcw, MessageSquare } from 'lucide-react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { BusyButton } from '@/components/ui/BusyButton'
import { DEFAULT_PASS_THRESHOLD } from './quizDerive'
import type { usePaperQuiz } from './usePaperQuiz'

/**
 * Quiz column of the Q&A panel — the loading / quiz / grading / results /
 * retry views. Presentational: all state + actions come from `usePaperQuiz`
 * (owned by `QAPanel`). The chat phase is rendered by `PaperChat`, not here.
 */

/** Vega's rationale + strong-answer teaching note — shared by the results and retry views. */
function QAExplain({ rationale, strongAnswer }: { rationale?: string; strongAnswer?: string }) {
  return (
    <>
      {rationale && (
        <p className="text-[13px] text-white/45 leading-relaxed pl-5 italic">
          <span className="font-pixel text-[6px] text-[#F5C518]/40 uppercase tracking-widest block mb-0.5 not-italic">
            Vega
          </span>
          {rationale}
        </p>
      )}
      {strongAnswer && (
        <p className="text-[13px] text-white/60 leading-relaxed pl-5">
          <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest block mb-0.5">
            What a strong answer covers
          </span>
          {strongAnswer}
        </p>
      )}
    </>
  )
}

export function QuizPanel({
  phase,
  setPhase,
  quiz,
  answers,
  setAnswers,
  results,
  quizError,
  retryAnswers,
  setRetryAnswers,
  newQuestion,
  retryLoading,
  generateQuiz,
  submitQuiz,
  startRetry,
  submitRetry,
  failedQuestions,
  allAnswered,
  allRetryAnswered,
}: ReturnType<typeof usePaperQuiz>) {
  return (
    <>
      {/* Idle — no graded quiz yet (or the history read failed). Writing one is
          a paid Vega call, so it waits for the student to ask; the panel used to
          fire it on mount. */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {quizError ? (
            <div className="w-full px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm">
              <span className="font-pixel text-[7px] text-red-300 leading-loose">{quizError}</span>
            </div>
          ) : (
            <>
              <Award size={22} className="text-[#F5C518]/60" />
              <p className="font-pixel text-[8px] text-white/60 leading-loose">
                Ready when you are
              </p>
              <p className="text-[13px] text-white/50 leading-relaxed max-w-[260px]">
                Read the paper first. Vega will write a short comprehension quiz on it — answer
                in your own words to earn proficiency for this source.
              </p>
            </>
          )}
          <button
            onClick={generateQuiz}
            className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-5 py-2.5 rounded-sm hover:brightness-110 transition-all"
          >
            {quizError ? 'Try again' : 'Start the quiz'}
          </button>
        </div>
      )}

      {/* Loading — quiz generation (long LLM wait, no form to preserve yet) */}
      {phase === 'loading' && (
        <LabeledLoader label="Vega is writing your quiz…" tone="vega" fill="flex-1" />
      )}

      {/* Quiz + Grading — grading keeps the answered form visible (dimmed)
          instead of unmounting it, so the student's answers stay on screen
          while Vega grades them. */}
      {(phase === 'quiz' || phase === 'grading') && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {quizError && (
            <div className="m-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm flex items-center justify-between gap-2">
              <span className="font-pixel text-[7px] text-red-300">{quizError}</span>
              <button
                onClick={generateQuiz}
                className="font-pixel text-[7px] text-red-200 underline shrink-0"
              >
                retry
              </button>
            </div>
          )}
          <div
            className={`flex-1 overflow-y-auto p-4 flex flex-col gap-5 transition-opacity ${phase === 'grading' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <p className="font-pixel text-[7px] text-white/40 leading-loose">
              Answer in your own words to demonstrate you understood this paper. Pass mark:{' '}
              {results?.threshold ?? DEFAULT_PASS_THRESHOLD}%.
            </p>
            {quiz?.questions.map((q, i) => (
              <div key={q.id} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-pixel text-[8px] text-[#F5C518] shrink-0">{i + 1}.</span>
                  <p className="text-sm text-white/85 leading-relaxed">{q.prompt}</p>
                </div>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  placeholder="Your answer…"
                  readOnly={phase === 'grading'}
                  className="bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm resize-y"
                />
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 p-3 shrink-0">
            <BusyButton
              busy={phase === 'grading'}
              busyLabel={
                <span className="flex items-center gap-2">
                  <PixelSpinner size="xs" tone="vega" /> Grading your answers…
                </span>
              }
              showSpinner={false}
              onClick={submitQuiz}
              disabled={!allAnswered}
              className="w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {allAnswered ? 'Submit for grading' : 'Answer all questions to submit'}
            </BusyButton>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'results' && results && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className={`m-3 px-4 py-3 rounded-sm border flex items-center gap-3 ${
              results.passed
                ? 'bg-green-500/15 border-green-500/30'
                : 'bg-orange-500/15 border-orange-500/30'
            }`}
          >
            {results.passed ? (
              <Award size={20} className="text-green-400 shrink-0" />
            ) : (
              <RotateCcw size={18} className="text-orange-400 shrink-0" />
            )}
            <div className="flex flex-col">
              <span
                className={`font-pixel text-[9px] ${results.passed ? 'text-green-300' : 'text-orange-300'}`}
              >
                {results.passed ? 'Proficiency demonstrated!' : 'Not quite — try again'}
              </span>
              <span className="font-pixel text-[7px] text-white/40 mt-1">
                Score {results.score}% · pass {results.threshold}%
              </span>
            </div>
            {results.passed && (results.kpEarned ?? 0) > 0 && (
              <span
                className="ml-auto font-pixel text-[9px] text-[#F5C518] shrink-0 flex items-center gap-1"
                title="Knowledge Points earned for this source"
              >
                +{results.kpEarned} KP
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
            {quiz?.questions.map((q, i) => {
              const r = results.results.find((x) => x.questionId === q.id)
              return (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-white/70 leading-snug flex-1">
                      <span className="text-[#F5C518] font-pixel text-[8px] mr-1.5">
                        {i + 1}.
                      </span>
                      {q.prompt}
                    </p>
                    <span
                      className={`font-pixel text-[8px] shrink-0 ${
                        (r?.score ?? 0) >= (results.threshold ?? DEFAULT_PASS_THRESHOLD)
                          ? 'text-green-400'
                          : (r?.score ?? 0) >= 40
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {r?.score ?? 0}
                    </span>
                  </div>
                  {answers[q.id] && (
                    <p className="text-[13px] text-white/70 leading-relaxed pl-5 border-l border-white/10 ml-1">
                      <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest block mb-0.5">
                        Your answer
                      </span>
                      {answers[q.id]}
                    </p>
                  )}
                  <QAExplain rationale={r?.rationale} strongAnswer={r?.strongAnswer} />
                </div>
              )
            })}
          </div>
          <div className="border-t border-white/10 p-3 shrink-0 flex gap-2">
            {!results.passed && (
              <button
                onClick={startRetry}
                className="flex-1 font-pixel text-[8px] border border-white/20 text-white/60 py-2.5 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={11} /> Fix my misses
              </button>
            )}
            <button
              onClick={() => setPhase('chat')}
              className="flex-1 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare size={11} /> Discuss this paper
            </button>
          </div>
        </div>
      )}

      {/* Retry — targeted re-answer of only the missed questions + one fresh
          extra question. `retrying` keeps the form visible (dimmed) instead of
          unmounting it, matching the quiz/grading pattern. */}
      {(phase === 'retry' || phase === 'retrying') && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {quizError && (
            <div className="m-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm flex items-center justify-between gap-2">
              <span className="font-pixel text-[7px] text-red-300">{quizError}</span>
            </div>
          )}
          {retryLoading ? (
            <LabeledLoader label="Vega is writing your extra question…" tone="vega" fill="flex-1" />
          ) : (
            <>
              <div
                className={`flex-1 overflow-y-auto p-4 flex flex-col gap-5 transition-opacity ${phase === 'retrying' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <p className="font-pixel text-[7px] text-white/40 leading-loose">
                  Fix your missed questions, plus one new question. Pass mark: {results?.threshold ?? 70}%.
                </p>
                {failedQuestions.map((q, i) => {
                  const r = results?.results.find((x) => x.questionId === q.id)
                  return (
                    <div key={q.id} className="flex flex-col gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-pixel text-[8px] text-[#F5C518] shrink-0">{i + 1}.</span>
                        <p className="text-sm text-white/85 leading-relaxed">{q.prompt}</p>
                      </div>
                      {answers[q.id] && (
                        <p className="text-[13px] text-white/50 leading-relaxed pl-5 border-l border-white/10 ml-1">
                          <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest block mb-0.5">
                            Your previous answer
                          </span>
                          {answers[q.id]}
                        </p>
                      )}
                      <QAExplain rationale={r?.rationale} strongAnswer={r?.strongAnswer} />
                      <textarea
                        value={retryAnswers[q.id] ?? ''}
                        onChange={(e) =>
                          setRetryAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        rows={3}
                        placeholder="Your new answer…"
                        readOnly={phase === 'retrying'}
                        className="bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm resize-y"
                      />
                    </div>
                  )
                })}
                {newQuestion && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="font-pixel text-[8px] text-[#F5C518] shrink-0">
                        {failedQuestions.length + 1}.
                      </span>
                      <p className="text-sm text-white/85 leading-relaxed">{newQuestion.prompt}</p>
                      <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest shrink-0">
                        New
                      </span>
                    </div>
                    <textarea
                      value={retryAnswers[newQuestion.id] ?? ''}
                      onChange={(e) =>
                        setRetryAnswers((prev) => ({ ...prev, [newQuestion.id]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Your answer…"
                      readOnly={phase === 'retrying'}
                      className="bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm resize-y"
                    />
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 p-3 shrink-0">
                <BusyButton
                  busy={phase === 'retrying'}
                  busyLabel={
                    <span className="flex items-center gap-2">
                      <PixelSpinner size="xs" tone="vega" /> Grading your answers…
                    </span>
                  }
                  showSpinner={false}
                  onClick={submitRetry}
                  disabled={!allRetryAnswered}
                  className="w-full font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] py-2.5 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {allRetryAnswered ? 'Submit retry for grading' : 'Answer all questions to submit'}
                </BusyButton>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
