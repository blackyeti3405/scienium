'use client'

/**
 * Field Codex — the "Read" phase (decoupled from the checkpoint, Khan-style).
 *
 * Just the lesson, as a readable article: pixel chrome (eyebrow, meta, CTA) per
 * the house rule, regular body font for the prose itself. A thin gold reading-
 * progress bar tracks scroll depth. The checkpoint is a SEPARATE phase reached
 * by the single primary CTA at the end — never stacked under the prose.
 */

import { useRef, useState } from 'react'
import { ChevronLeft, Clock, ArrowRight, CheckCircle2, Lightbulb, Gavel } from 'lucide-react'
import { CODEX_PASS_RATIO, CODEX_KP_PER_LESSON, CODEX_DAILY_LESSON_CAP } from '@/lib/ops/codex/engine'
import type { Lesson } from '@/lib/ops/codex/types'

export function LessonReader({
  lesson,
  trackLabel,
  unitLabel,
  completed,
  capReached,
  onBack,
  onStartCheckpoint,
}: {
  lesson: Lesson
  trackLabel: string
  unitLabel: string
  /** The student has already passed this lesson (KP already earned). */
  completed: boolean
  /** Daily lesson cap reached and this lesson isn't already done — practice still allowed, but no KP today. */
  capReached: boolean
  onBack: () => void
  onStartCheckpoint: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPct, setScrollPct] = useState(0)

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setScrollPct(max <= 0 ? 100 : Math.round((el.scrollTop / max) * 100))
  }

  const questionCount = lesson.checkpoint.questions.length
  const passCount = Math.ceil(CODEX_PASS_RATIO * questionCount)
  const passCopy = passCount >= questionCount ? `all ${questionCount} right` : `${passCount} of ${questionCount} right`

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Reading progress — scroll-driven, so no motion to suppress. */}
      <div className="h-[3px] w-full bg-white/[0.06] shrink-0" aria-hidden>
        <div
          className="h-full"
          style={{ width: `${scrollPct}%`, background: 'linear-gradient(90deg, #ffe566, #f5c518)' }}
        />
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="ops-tab-body">
        <div className="max-w-2xl mx-auto w-full">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronLeft size={12} /> Back to {trackLabel}
          </button>

          {/* Title block */}
          <header className="mt-5">
            <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">{unitLabel}</span>
            <h1 className="text-[22px] leading-tight text-white font-semibold mt-2">{lesson.label}</h1>
            <div className="flex items-center gap-3 mt-3 font-pixel text-[7px] uppercase tracking-widest text-white/40">
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> {lesson.readingMinutes} min read
              </span>
              <span className="text-white/40">·</span>
              <span>{lesson.sections.length} sections</span>
              {completed && (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={10} /> Completed
                </span>
              )}
            </div>
          </header>

          {/* Article */}
          <article className="mt-8 space-y-8">
            {lesson.sections.map((s, i) => (
              <section key={i}>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-pixel text-[8px] text-[#F5C518]/50 shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-[17px] leading-snug text-white/95 font-medium">{s.heading}</h2>
                </div>
                <p
                  data-testid="codex-lesson-prose"
                  className="text-[15px] leading-[1.72] text-white/75 mt-2 pl-[26px]"
                >
                  {s.body}
                </p>
              </section>
            ))}

            {/* Worked example — highlighted, gold */}
            <aside className="border border-[#F5C518]/20 bg-[#F5C518]/[0.04] rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={13} className="text-[#F5C518]" />
                <span className="font-pixel text-[7px] text-[#F5C518] uppercase tracking-widest">Worked example</span>
              </div>
              <p className="text-[15px] leading-[1.72] text-white/80">{lesson.workedExample}</p>
            </aside>

            {/* Why judges ask this — full card (never a side-stripe accent) */}
            <aside className="border border-white/[0.08] bg-white/[0.02] rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gavel size={12} className="text-white/45" />
                <span className="font-pixel text-[7px] text-white/45 uppercase tracking-widest">Why judges ask this</span>
              </div>
              <p className="text-[15px] leading-[1.72] text-white/60 italic">{lesson.judgeFraming}</p>
            </aside>
          </article>

          {/* Checkpoint CTA — the single primary action */}
          <div className="mt-10 border border-white/10 bg-[#0a1628] rounded-lg p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-pixel text-[8px] text-white/50 uppercase tracking-widest">
                  {completed ? 'Review checkpoint' : 'Checkpoint'}
                </p>
                <p className="text-sm text-white/65 mt-1.5">
                  {questionCount} question{questionCount === 1 ? '' : 's'} · get {passCopy} to pass
                  {!completed && !capReached && (
                    <>
                      {' · '}
                      <span className="text-[#F5C518]">+{CODEX_KP_PER_LESSON} KP</span>
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onStartCheckpoint}
                data-testid="codex-start-checkpoint"
                className="codex-btn-gold inline-flex items-center gap-2 font-pixel text-[9px] px-4 py-3 shrink-0"
              >
                {completed ? 'Review' : 'Start checkpoint'}
                <ArrowRight size={13} />
              </button>
            </div>
            {capReached && !completed && (
              <p className="text-xs text-white/45 mt-3 border-t border-white/[0.07] pt-3">
                You&apos;ve hit today&apos;s {CODEX_DAILY_LESSON_CAP}-lesson limit — you can still practice this checkpoint,
                but KP resumes tomorrow.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
