'use client'

/**
 * Field Codex checkpoint — answer inputs (redesigned for the one-question-at-a-
 * time, immediate-feedback checkpoint) plus `checkAnswer`, the client-side
 * per-question grader.
 *
 * `checkAnswer` reuses the SAME pure engine (`gradeCheckpoint`) the server runs
 * so instant feedback can never disagree with the authoritative grade posted at
 * the end — the client already holds the answer key (content is a static
 * client-loaded bundle); the server re-grades only to make KP/gating tamper-
 * proof, so surfacing correctness here leaks nothing that isn't already present.
 *
 * Each input takes an optional `reveal` — once a question is checked it is
 * LOCKED and coloured: the correct choice goes green (Khan-style, shown even if
 * missed), the wrong pick goes red, the rest dim.
 */

import { Check, X, ArrowUp, ArrowDown } from 'lucide-react'
import { gradeCheckpoint, type QuestionSubmission } from '@/lib/ops/codex/engine'
import type { CheckpointQuestion } from '@/lib/ops/codex/types'

// ─── Per-question grading (reuses the server engine) ────────────────────────

export interface AnswerReveal {
  correct: boolean
  /** Prose to show below the question after checking (affirming or corrective). */
  explanation?: string
  /** Correct option id (MC) — used to colour the reveal. */
  mcCorrectId?: string
  /** Correct item id at each position (ordering) — used to colour each row. */
  orderingCorrect?: string[]
  /** Correct right-item id for each left id (matching) — used to colour rows. */
  matchingCorrectByLeft?: Record<string, string>
}

/**
 * Grade one submitted answer against its question. Correctness + the corrective
 * explanation come straight from `gradeCheckpoint` (single source of truth);
 * MC additionally surfaces the affirming note for a correct pick (the engine
 * only returns text on a miss, but the content authors an explanation for every
 * option, so a right answer gets a "Correct — …" line too).
 */
export function checkAnswer(question: CheckpointQuestion, answer: QuestionSubmission): AnswerReveal {
  const { perQuestion } = gradeCheckpoint([question], { answers: [answer] })
  const graded = perQuestion[0]

  if (question.kind === 'mc') {
    return {
      correct: graded.correct,
      explanation: graded.correct ? question.explanations[question.answerId] : graded.explanation,
      mcCorrectId: question.answerId,
    }
  }
  if (question.kind === 'ordering') {
    return { correct: graded.correct, explanation: graded.explanation, orderingCorrect: question.correctOrder }
  }
  return {
    correct: graded.correct,
    explanation: graded.explanation,
    matchingCorrectByLeft: Object.fromEntries(question.correctPairs),
  }
}

// ─── Shared row shell ───────────────────────────────────────────────────────

type RowTone = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim'

// Rounded + soft-tinted rows; state colours kept low-opacity so the reveal reads
// as a gentle wash, not a harsh block. Every row carries `codex-row` (smooth
// transition on the properties that change between tones — see globals.css).
const ROW_TONE: Record<RowTone, string> = {
  idle: 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]',
  selected: 'border-[#F5C518]/70 bg-[#F5C518]/[0.06]',
  correct: 'border-emerald-400/45 bg-emerald-400/[0.08]',
  wrong: 'border-red-400/45 bg-red-400/[0.07]',
  dim: 'border-white/[0.07] bg-white/[0.015] opacity-60',
}

const BADGE_TONE: Record<RowTone, string> = {
  idle: 'border-white/20 text-white/50',
  selected: 'border-[#F5C518] bg-[#F5C518] text-[#0d1b2e]',
  correct: 'border-emerald-400 bg-emerald-400 text-[#0d1b2e]',
  wrong: 'border-red-400 bg-red-400 text-[#0d1b2e]',
  dim: 'border-white/12 text-white/40',
}

const ROW_BASE =
  'group relative flex items-center gap-3 border rounded-md px-4 py-3 min-h-[52px] codex-row'
const BADGE_BASE = 'grid place-items-center w-6 h-6 shrink-0 border rounded-sm codex-row'

const LETTERS = 'ABCDEFGH'

// ─── Multiple choice ────────────────────────────────────────────────────────

export function McAnswer({
  question,
  value,
  onChange,
  reveal,
}: {
  question: Extract<CheckpointQuestion, { kind: 'mc' }>
  value?: string
  onChange: (v: string) => void
  reveal?: AnswerReveal
}) {
  const locked = !!reveal
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
      {question.options.map((opt, i) => {
        let tone: RowTone = value === opt.id ? 'selected' : 'idle'
        if (reveal) {
          if (opt.id === reveal.mcCorrectId) tone = 'correct'
          else if (opt.id === value) tone = 'wrong'
          else tone = 'dim'
        }
        const badge =
          tone === 'correct' ? <Check size={13} strokeWidth={3} /> : tone === 'wrong' ? <X size={13} strokeWidth={3} /> : LETTERS[i]
        return (
          <label
            key={opt.id}
            className={`${ROW_BASE} ${locked ? 'cursor-default' : 'cursor-pointer'} ${ROW_TONE[tone]}`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              disabled={locked}
              className="peer sr-only"
            />
            {/* Keyboard-only focus ring (does not fire on mouse click). */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:shadow-[0_0_0_2px_#F5C518]"
              aria-hidden
            />
            <span className={`${BADGE_BASE} font-pixel text-[8px] ${BADGE_TONE[tone]}`}>{badge}</span>
            <span className={`text-[15px] leading-snug ${tone === 'dim' ? 'text-white/55' : 'text-white/90'}`}>{opt.text}</span>
          </label>
        )
      })}
    </div>
  )
}

// ─── Ordering ───────────────────────────────────────────────────────────────

export function OrderingAnswer({
  question,
  order,
  onChange,
  reveal,
}: {
  question: Extract<CheckpointQuestion, { kind: 'ordering' }>
  order: string[]
  onChange: (order: string[]) => void
  reveal?: AnswerReveal
}) {
  const locked = !!reveal
  function move(idx: number, dir: -1 | 1) {
    const next = [...order]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">Put these in order</p>
      {order.map((itemId, idx) => {
        const item = question.items.find((it) => it.id === itemId)!
        let tone: RowTone = 'idle'
        if (reveal?.orderingCorrect) tone = reveal.orderingCorrect[idx] === itemId ? 'correct' : 'wrong'
        return (
          <div key={itemId} className={`${ROW_BASE} ${ROW_TONE[tone]}`}>
            <span className={`${BADGE_BASE} font-pixel text-[8px] ${BADGE_TONE[tone]}`}>
              {tone === 'correct' ? <Check size={13} strokeWidth={3} /> : tone === 'wrong' ? <X size={13} strokeWidth={3} /> : idx + 1}
            </span>
            <span className="text-[15px] leading-snug text-white/90 flex-1">{item.text}</span>
            {!locked && (
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Move "${item.text}" up`}
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="grid place-items-center w-7 h-6 rounded-sm border border-white/15 text-white/45 hover:text-white hover:border-white/40 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Move "${item.text}" down`}
                  onClick={() => move(idx, 1)}
                  disabled={idx === order.length - 1}
                  className="grid place-items-center w-7 h-6 rounded-sm border border-white/15 text-white/45 hover:text-white hover:border-white/40 disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Matching ───────────────────────────────────────────────────────────────

export function MatchingAnswer({
  question,
  pairs,
  onChange,
  reveal,
}: {
  question: Extract<CheckpointQuestion, { kind: 'matching' }>
  pairs: Record<string, string>
  onChange: (pairs: Record<string, string>) => void
  reveal?: AnswerReveal
}) {
  const locked = !!reveal
  return (
    <div className="space-y-2">
      <p className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">Match each pair</p>
      {question.left.map((l) => {
        let tone: RowTone = 'idle'
        if (reveal?.matchingCorrectByLeft) tone = pairs[l.id] && pairs[l.id] === reveal.matchingCorrectByLeft[l.id] ? 'correct' : 'wrong'
        return (
          <div key={l.id} className={`${ROW_BASE} ${ROW_TONE[tone]}`}>
            {reveal && (
              <span className={`${BADGE_BASE} ${BADGE_TONE[tone]}`}>
                {tone === 'correct' ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
              </span>
            )}
            <span className="text-[15px] leading-snug text-white/90 flex-1">{l.text}</span>
            <select
              aria-label={`Match for "${l.text}"`}
              value={pairs[l.id] ?? ''}
              disabled={locked}
              onChange={(e) => onChange({ ...pairs, [l.id]: e.target.value })}
              className="ops-select min-h-[44px] rounded-sm disabled:opacity-70"
            >
              <option value="">— match —</option>
              {question.right.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.text}
                </option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
