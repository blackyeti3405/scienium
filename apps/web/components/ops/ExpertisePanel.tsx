'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Loader2,
  Send,
  ShieldCheck,
  Award,
  Lock,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react'
import { useLabCurrency } from '@/lib/labCurrency'

// ─── Types (mirror the /api/expertise responses) ─────────────────────────────

interface LevelInfo {
  level: number
  title: string
  theme: string
  blurb: string
  kpBonus: number
  cleared: boolean
}
interface HistoryItem {
  id: string
  targetLevel: number
  score: number
  passed: boolean
  gradedAt: string
  by: string
}
interface Question {
  id: string
  prompt: string
  focus: string
}
interface StartResponse {
  examId: string
  targetLevel: number
  level: { title: string; theme: string; blurb: string; kpBonus: number }
  questions: Question[]
  /** Previously-saved answers (resume) — {} for a fresh exam. */
  answers: Record<string, string>
  /** Index of the question to resume on — 0 for a fresh exam. */
  progressIndex: number
}
interface Status {
  clearanceLevel: number
  maxClearance: number
  threshold: number
  nextLevel: { level: number; title: string; theme: string; blurb: string; kpBonus: number } | null
  /** The current user's in-progress exam, if any (for resume). */
  activeExam: StartResponse | null
  levels: LevelInfo[]
  history: HistoryItem[]
}
interface GradeResult {
  score: number
  passed: boolean
  threshold: number
  targetLevel: number
  raised: boolean
  newClearance: number
  kpEarned: number
  results: { questionId: string; score: number; rationale: string }[]
}

type Mode = 'loading' | 'idle' | 'exam' | 'grading' | 'result'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Clearance ladder ─────────────────────────────────────────────────────────

function ClearanceLadder({ levels, current }: { levels: LevelInfo[]; current: number }) {
  return (
    <div className="clr-ladder">
      {levels.map((l) => {
        const state = l.cleared ? 'done' : l.level === current + 1 ? 'next' : 'todo'
        return (
          <div key={l.level} className={`clr-rung clr-rung--${state}`} title={`Level ${l.level} — ${l.title}`}>
            <span className="clr-rung__pip font-pixel">{l.cleared ? <Check size={11} /> : l.level}</span>
            <span className="clr-rung__theme font-pixel">{l.theme}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function ExpertisePanel() {
  const { addCurrency } = useLabCurrency()
  const [mode, setMode] = useState<Mode>('loading')
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Active exam state
  const [exam, setExam] = useState<StartResponse | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [novaTyping, setNovaTyping] = useState(false)
  const [result, setResult] = useState<GradeResult | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  async function loadStatus() {
    try {
      const res = await fetch('/api/expertise')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setStatus(data)
      setMode('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setMode('idle')
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // Keep the chat scrolled to the newest turn.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [index, novaTyping, mode])

  /** Load an exam (fresh or resumed) into the chat, restoring any saved progress. */
  function enterExam(data: StartResponse) {
    setExam(data)
    setAnswers(data.answers ?? {})
    setIndex(Math.min(data.progressIndex ?? 0, Math.max(0, data.questions.length - 1)))
    setDraft('')
    setResult(null)
    setMode('exam')
  }

  async function beginExam() {
    if (!status?.nextLevel) return
    setError(null)
    setExam(null) // clear any prior exam so the "preparing" spinner shows
    setMode('grading') // reuse spinner overlay while generating
    setNovaTyping(false)
    try {
      const res = await fetch('/api/expertise', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start exam')
      enterExam(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start exam')
      setMode('idle')
    }
  }

  /** Resume the in-progress exam returned by GET — no regeneration. */
  function resumeExam() {
    if (status?.activeExam) {
      setError(null)
      setNovaTyping(false)
      enterExam(status.activeExam)
    }
  }

  /** Persist progress so the exam can be picked up after closing the panel. */
  function saveProgress(examId: string, nextAnswers: Record<string, string>, progressIndex: number) {
    fetch('/api/expertise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, answers: nextAnswers, progressIndex }),
    }).catch(() => {})
  }

  function submitAnswer() {
    if (!exam) return
    const q = exam.questions[index]
    const text = draft.trim()
    if (!text) return
    const nextAnswers = { ...answers, [q.id]: text }
    setAnswers(nextAnswers)
    setDraft('')

    const isLast = index + 1 >= exam.questions.length
    // Save where we are (index advances to the next unanswered question).
    saveProgress(exam.examId, nextAnswers, isLast ? exam.questions.length : index + 1)

    if (!isLast) {
      // Advance with a brief "Nova is thinking" beat for a conversational feel.
      setNovaTyping(true)
      setTimeout(() => {
        setNovaTyping(false)
        setIndex((i) => i + 1)
      }, 650)
    } else {
      gradeExam(nextAnswers)
    }
  }

  async function gradeExam(finalAnswers: Record<string, string>) {
    if (!exam) return
    setMode('grading')
    setError(null)
    try {
      const res = await fetch('/api/expertise/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.examId,
          answers: exam.questions.map((q) => ({ questionId: q.id, response: finalAnswers[q.id] ?? '' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to grade exam')
      setResult(data)
      if (data.raised) {
        // Live StatusStrip update: clearance rises, bonus KP lands.
        const prevClearance = status?.clearanceLevel ?? data.newClearance - 1
        addCurrency({ clearanceLevel: data.newClearance - prevClearance, kp: data.kpEarned })
      }
      setMode('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grade exam')
      setMode('exam')
    }
  }

  function finishResult() {
    setExam(null)
    setResult(null)
    setMode('loading')
    loadStatus()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (mode === 'loading') {
    return (
      <div className="ops-tab-body items-center justify-center">
        <Loader2 size={18} className="animate-spin text-white/25" />
      </div>
    )
  }

  if (mode === 'grading' && !exam) {
    // Generating a fresh exam.
    return (
      <div className="ops-tab-body items-center justify-center">
        <div className="clr-thinking">
          <Sparkles size={20} className="text-[#7ff2e3] animate-pulse" />
          <span className="font-pixel text-[9px] text-white/55">Nova is preparing your exam…</span>
        </div>
      </div>
    )
  }

  if (mode === 'grading' && exam) {
    return (
      <div className="ops-tab-body items-center justify-center">
        <div className="clr-thinking">
          <ShieldCheck size={20} className="text-[#7ff2e3] animate-pulse" />
          <span className="font-pixel text-[9px] text-white/55">Nova is reviewing your answers…</span>
        </div>
      </div>
    )
  }

  if (mode === 'result' && result) {
    return <ResultView result={result} onDone={finishResult} />
  }

  if (mode === 'exam' && exam) {
    const answeredCount = Object.keys(answers).length
    const total = exam.questions.length
    return (
      <div className="ops-tab-body clr-exam">
        <div className="clr-exam__head">
          <button
            className="clr-exam__back"
            onClick={() => { setMode('loading'); loadStatus() }}
            title="Save & exit — resume anytime"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="clr-exam__badge font-pixel">LVL {exam.targetLevel}</span>
          <div className="flex flex-col min-w-0">
            <span className="font-pixel text-[9px] text-white">{exam.level.theme} clearance exam</span>
            <span className="font-pixel text-[6px] text-white/40 mt-0.5">
              Question {Math.min(index + 1, total)} of {total}
            </span>
          </div>
          <div className="clr-exam__progress">
            {exam.questions.map((q, i) => (
              <span
                key={q.id}
                className={`clr-exam__dot${i < answeredCount ? ' clr-exam__dot--done' : i === index ? ' clr-exam__dot--cur' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="clr-chat" ref={scrollRef}>
          <div className="clr-msg clr-msg--nova">
            <span className="clr-msg__avatar font-pixel">N</span>
            <div className="clr-msg__bubble">
              Welcome to your <strong>Level {exam.targetLevel}</strong> clearance exam. I&apos;ll ask you {total}{' '}
              {total === 1 ? 'question' : 'questions'} about your project. Answer in your own words — I&apos;m
              checking that you truly understand your work.
            </div>
          </div>

          {exam.questions.map((q, i) => {
            if (i > index) return null
            const ans = answers[q.id]
            return (
              <div key={q.id}>
                <div className="clr-msg clr-msg--nova">
                  <span className="clr-msg__avatar font-pixel">N</span>
                  <div className="clr-msg__bubble">
                    <span className="clr-msg__focus font-pixel">{q.focus}</span>
                    {q.prompt}
                  </div>
                </div>
                {ans && (
                  <div className="clr-msg clr-msg--me">
                    <div className="clr-msg__bubble clr-msg__bubble--me">{ans}</div>
                  </div>
                )}
              </div>
            )
          })}

          {novaTyping && (
            <div className="clr-msg clr-msg--nova">
              <span className="clr-msg__avatar font-pixel">N</span>
              <div className="clr-msg__bubble clr-msg__typing">
                <span /> <span /> <span />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="ops-error mx-3">
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-pixel text-[7px]">{error}</span>
          </div>
        )}

        {!novaTyping && (
          <div className="clr-composer">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  submitAnswer()
                }
              }}
              rows={3}
              placeholder="Type your answer… (⌘/Ctrl + Enter to send)"
              className="ops-textarea clr-composer__input"
              autoFocus
            />
            <button onClick={submitAnswer} disabled={!draft.trim()} className="ops-submit-btn clr-composer__send">
              {index + 1 < total ? <Send size={11} /> : <ShieldCheck size={11} />}
              {index + 1 < total ? 'Send' : 'Submit exam'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Idle: ladder + begin + history ──────────────────────────────────────────
  if (!status) {
    return (
      <div className="ops-tab-body items-center justify-center">
        <div className="clr-thinking">
          <AlertTriangle size={20} className="text-white/30" />
          <span className="font-pixel text-[8px] text-white/45 text-center max-w-[280px]">
            {error ?? 'Could not load clearance status.'}
          </span>
          <button onClick={() => { setError(null); setMode('loading'); loadStatus() }} className="ops-submit-btn">
            Retry
          </button>
        </div>
      </div>
    )
  }
  const s = status
  const atMax = s.clearanceLevel >= s.maxClearance
  const currentTitle = s.levels.find((l) => l.level === s.clearanceLevel)?.title ?? 'Trainee'

  return (
    <div className="ops-tab-body">
      <div className="clr-hero">
        <div className="clr-hero__crest">
          <ShieldCheck size={26} />
          <span className="clr-hero__level font-pixel">{s.clearanceLevel}</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">Lab clearance</span>
          <span className="font-pixel text-[12px] text-white mt-1">
            Level {s.clearanceLevel} · {s.clearanceLevel === 0 ? 'Trainee' : currentTitle}
          </span>
          <span className="text-[11px] text-white/45 mt-1.5 leading-relaxed">
            Clearance is your lab&apos;s mastery rank. Pass clearance exams to raise it and unlock the lab&apos;s
            premium buildings.
          </span>
        </div>
      </div>

      <ClearanceLadder levels={s.levels} current={s.clearanceLevel} />

      {error && (
        <div className="ops-error">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="font-pixel text-[7px]">{error}</span>
        </div>
      )}

      {atMax ? (
        <div className="clr-next clr-next--max">
          <Award size={22} className="text-[#F5C518]" />
          <div className="flex flex-col">
            <span className="font-pixel text-[10px] text-[#F5C518]">Top clearance achieved</span>
            <span className="text-[11px] text-white/55 mt-1">
              Your lab holds the highest clearance. Every building in the shop is within reach.
            </span>
          </div>
        </div>
      ) : s.activeExam ? (
        <div className="clr-next clr-next--resume">
          <div className="clr-next__head">
            <span className="clr-next__tag clr-next__tag--resume font-pixel">In progress · Level {s.activeExam.targetLevel}</span>
            <span className="font-pixel text-[10px] text-white">{s.activeExam.level.title}</span>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed mt-2">
            You have a clearance exam underway —{' '}
            {Object.keys(s.activeExam.answers ?? {}).length} of {s.activeExam.questions.length} answered. Pick up
            where you left off.
          </p>
          <button onClick={resumeExam} className="ops-submit-btn clr-begin">
            <ShieldCheck size={12} /> Resume Level {s.activeExam.targetLevel} exam
          </button>
        </div>
      ) : (
        s.nextLevel && (
          <div className="clr-next">
            <div className="clr-next__head">
              <span className="clr-next__tag font-pixel">Next · Level {s.nextLevel.level}</span>
              <span className="font-pixel text-[10px] text-white">{s.nextLevel.title}</span>
              <span className="clr-next__bonus font-pixel" title="Bonus KP on passing">
                +{s.nextLevel.kpBonus.toLocaleString()} KP
              </span>
            </div>
            <p className="text-[11px] text-white/55 leading-relaxed mt-2">{s.nextLevel.blurb}</p>
            <p className="font-pixel text-[6px] text-white/35 mt-2">
              Pass mark {s.threshold}% · a conversational exam about your own project
            </p>
            <button onClick={beginExam} className="ops-submit-btn clr-begin">
              <ShieldCheck size={12} /> Begin Level {s.nextLevel.level} exam
            </button>
          </div>
        )
      )}

      {s.history.length > 0 && (
        <div className="clr-history">
          <button
            className="clr-history__toggle font-pixel"
            onClick={() => setShowHistory((v) => !v)}
          >
            <ChevronDown
              size={12}
              style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
            />
            Exam history ({s.history.length})
          </button>
          {showHistory && (
            <div className="clr-history__list">
              {s.history.map((h) => (
                <div key={h.id} className="clr-history__row">
                  <span className={`clr-history__icon${h.passed ? ' clr-history__icon--pass' : ' clr-history__icon--fail'}`}>
                    {h.passed ? <Check size={11} /> : <X size={11} />}
                  </span>
                  <span className="font-pixel text-[7px] text-white/70">Level {h.targetLevel}</span>
                  <span className="font-pixel text-[7px] text-white/40">{h.score}%</span>
                  <span className="text-[10px] text-white/35 truncate ml-auto">
                    {h.by} · {timeAgo(h.gradedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Result view ────────────────────────────────────────────────────────────

function ResultView({ result, onDone }: { result: GradeResult; onDone: () => void }) {
  return (
    <div className="ops-tab-body">
      <div className={`clr-result__banner${result.passed ? ' clr-result__banner--pass' : ' clr-result__banner--fail'}`}>
        {result.passed ? <ShieldCheck size={30} /> : <Lock size={28} />}
        <div className="flex flex-col">
          <span className="font-pixel text-[12px]">
            {result.passed ? 'Clearance granted' : 'Not cleared — yet'}
          </span>
          <span className="font-pixel text-[8px] opacity-80 mt-1">
            Scored {result.score}% · pass mark {result.threshold}%
          </span>
        </div>
        <span className="clr-result__score font-pixel">{result.score}</span>
      </div>

      {result.passed && result.raised && (
        <div className="clr-result__reward">
          <Sparkles size={14} className="text-[#F5C518]" />
          <span className="font-pixel text-[8px] text-white">
            Clearance raised to Level {result.newClearance}
          </span>
          {result.kpEarned > 0 && (
            <span className="clr-result__kp font-pixel">+{result.kpEarned.toLocaleString()} KP</span>
          )}
        </div>
      )}
      {result.passed && !result.raised && (
        <p className="font-pixel text-[7px] text-white/40 text-center">
          Your lab had already reached this clearance — no change.
        </p>
      )}
      {!result.passed && (
        <p className="text-[11px] text-white/50 leading-relaxed">
          Review the feedback below, shore up the weak spots, and take the exam again when you&apos;re ready.
        </p>
      )}

      <div className="clr-feedback">
        {result.results.map((r, i) => (
          <div key={r.questionId} className="clr-feedback__item">
            <div className="clr-feedback__top">
              <span className="font-pixel text-[7px] text-white/55">Q{i + 1}</span>
              <span
                className={`clr-feedback__score font-pixel${r.score >= 70 ? ' clr-feedback__score--ok' : r.score >= 50 ? ' clr-feedback__score--mid' : ' clr-feedback__score--low'}`}
              >
                {r.score}%
              </span>
            </div>
            <p className="text-[11px] text-white/65 leading-relaxed mt-1">{r.rationale}</p>
          </div>
        ))}
      </div>

      <button onClick={onDone} className="ops-submit-btn clr-begin">
        <Check size={12} /> Back to clearance
      </button>
    </div>
  )
}
