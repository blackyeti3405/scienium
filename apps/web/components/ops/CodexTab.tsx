'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { BookOpen, Lock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Sparkles, ArrowUpDown } from 'lucide-react'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { CODEX_TRACKS, loadTrack } from '@/lib/ops/codex/index'
import { unitUnlocked, fluencyTier, shuffleCheckpoint } from '@/lib/ops/codex/engine'
import type { CodexTrack, Lesson, Segment, CheckpointQuestion } from '@/lib/ops/codex/types'
import type { QuestionSubmission, PerQuestionResult } from '@/lib/ops/codex/engine'

// ─── Server payload shapes ──────────────────────────────────────────────────

interface ProgressRow {
  trackSlug: string
  lessonId: string
  completed: boolean
  bestScore: number
  kpAwarded: number
  completedAt: string | null
}

interface RecommendedTrackPayload {
  trackSlug: string
  branchSlugs: string[]
  rationale: string
}

interface ProgressPayload {
  progress: ProgressRow[]
  dailyCap: { limit: number; completedToday: number }
  studyPlan: { tracks: RecommendedTrackPayload[]; manualTrackSlugs: string[]; generatedAt: string } | null
}

interface CompleteResponse {
  passed: boolean
  perQuestion: PerQuestionResult[]
  ratio: number
  kpEarned: number
  capReached: boolean
}

const FLUENCY_LABEL: Record<string, string> = {
  novice: 'Novice',
  conversant: 'Conversant',
  fluent: 'Fluent',
  field_expert: 'Field Expert',
}

// ─── Home view ──────────────────────────────────────────────────────────────

function trackFluency(track: CodexTrack, completedLessonIds: Set<string>) {
  return fluencyTier(track, completedLessonIds)
}

function trackProgressPct(track: CodexTrack, completedLessonIds: Set<string>): number {
  const lessons = [track.core, ...track.branches].flatMap((s) => s.units.flatMap((u) => u.lessons))
  if (lessons.length === 0) return 0
  const done = lessons.filter((l) => completedLessonIds.has(l.id)).length
  return Math.round((done / lessons.length) * 100)
}

function findNextLesson(track: CodexTrack, completedLessonIds: Set<string>): Lesson | null {
  for (const segment of [track.core, ...track.branches]) {
    for (const unit of segment.units) {
      if (!unitUnlocked(track, segment.id, unit.id, completedLessonIds)) continue
      for (const lesson of unit.lessons) {
        if (!completedLessonIds.has(lesson.id)) return lesson
      }
    }
  }
  return null
}

function TrackCard({
  track,
  completedLessonIds,
  rationale,
  onOpen,
}: {
  track: CodexTrack
  completedLessonIds: Set<string>
  rationale?: string
  onOpen: () => void
}) {
  const tier = trackFluency(track, completedLessonIds)
  const pct = trackProgressPct(track, completedLessonIds)
  const next = findNextLesson(track, completedLessonIds)

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="codex-track-card"
      className="w-full text-left border border-white/10 bg-[#0a1628] p-3.5 hover:border-[#F5C518]/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[9px] text-white">{track.label}</span>
        <span className="font-pixel text-[6px] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] text-[#F5C518] px-1.5 py-0.5">
          {FLUENCY_LABEL[tier]}
        </span>
      </div>
      {rationale && <p className="text-sm text-white/55 mt-1.5 leading-snug">{rationale}</p>}
      <div className="mt-2.5">
        <PixelProgressBar value={pct} />
        <span className="font-pixel text-[6px] text-white/30 mt-1 block">{pct}% complete</span>
      </div>
      {next && (
        <div data-testid="codex-next-lesson" className="mt-2 font-pixel text-[7px] text-white/45">
          Next: {next.label}
        </div>
      )}
    </button>
  )
}

function CodexHome({
  progress,
  dailyCap,
  studyPlan,
  onGenerateStudyPlan,
  generatingPlan,
  planError,
  onOpenTrack,
}: {
  progress: ProgressRow[]
  dailyCap: { limit: number; completedToday: number }
  studyPlan: { tracks: RecommendedTrackPayload[]; manualTrackSlugs: string[] } | null
  onGenerateStudyPlan: () => void
  generatingPlan: boolean
  planError: string | null
  onOpenTrack: (slug: string) => void
}) {
  const [loadedTracks, setLoadedTracks] = useState<Record<string, CodexTrack>>({})
  const [browseAll, setBrowseAll] = useState(false)

  const completedLessonIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)),
    [progress],
  )

  const recommendedSlugs = studyPlan?.tracks.map((t) => t.trackSlug) ?? []
  const manualSlugs = studyPlan?.manualTrackSlugs ?? []
  const memberSlugs = Array.from(new Set([...recommendedSlugs, ...manualSlugs]))

  useEffect(() => {
    const slugsToLoad = browseAll ? CODEX_TRACKS.map((t) => t.slug) : memberSlugs
    const missing = slugsToLoad.filter((slug) => !loadedTracks[slug])
    if (missing.length === 0) return
    Promise.all(missing.map((slug) => loadTrack(slug).then((track) => [slug, track] as const))).then((entries) => {
      setLoadedTracks((prev) => {
        const next = { ...prev }
        for (const [slug, track] of entries) next[slug] = track
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browseAll, memberSlugs.join(',')])

  return (
    <div className="ops-tab-body" data-testid="codex-home">
      <div className="max-w-2xl mx-auto w-full space-y-4 py-2">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">Your Study Plan</span>
          <span className="font-pixel text-[6px] text-white/35 uppercase tracking-widest">
            {dailyCap.completedToday}/{dailyCap.limit} lessons today
          </span>
        </div>

        {memberSlugs.length === 0 ? (
          <div className="border border-dashed border-white/15 py-8 text-center">
            <Sparkles size={20} className="text-white/20 mx-auto mb-2" />
            <span className="font-pixel text-[8px] text-white/35 block mb-3">
              No study plan yet — generate one tailored to your project.
            </span>
            <BusyButton
              busy={generatingPlan}
              busyLabel="Generating…"
              icon={<Sparkles size={12} />}
              onClick={onGenerateStudyPlan}
              data-testid="codex-study-plan-generate"
              className="inline-flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all mx-auto"
            >
              Generate Study Plan
            </BusyButton>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {memberSlugs.map((slug) => {
                const track = loadedTracks[slug]
                if (!track) return <div key={slug} className="h-24 bg-white/[0.02] animate-pulse" />
                const rec = studyPlan?.tracks.find((t) => t.trackSlug === slug)
                return (
                  <TrackCard
                    key={slug}
                    track={track}
                    completedLessonIds={completedLessonIds}
                    rationale={rec?.rationale}
                    onOpen={() => onOpenTrack(slug)}
                  />
                )
              })}
            </div>
            <BusyButton
              busy={generatingPlan}
              busyLabel="Regenerating…"
              icon={<Sparkles size={11} />}
              onClick={onGenerateStudyPlan}
              data-testid="codex-study-plan-generate"
              className="inline-flex items-center gap-1.5 font-pixel text-[7px] text-white/45 hover:text-[#F5C518] transition-colors"
            >
              Regenerate
            </BusyButton>
          </>
        )}

        {planError && <p className="font-pixel text-[7px] text-red-400">{planError}</p>}

        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setBrowseAll((b) => !b)}
            className="font-pixel text-[7px] text-white/45 hover:text-[#F5C518] transition-colors uppercase tracking-widest"
            data-testid="codex-browse-library-toggle"
          >
            {browseAll ? 'Hide full library' : 'Browse full library'}
          </button>
          {browseAll && (
            <div className="space-y-2 mt-3">
              {CODEX_TRACKS.map((t) => {
                const track = loadedTracks[t.slug]
                if (!track) return <div key={t.slug} className="h-20 bg-white/[0.02] animate-pulse" />
                return (
                  <TrackCard
                    key={t.slug}
                    track={track}
                    completedLessonIds={completedLessonIds}
                    onOpen={() => onOpenTrack(t.slug)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Track view (segments, units, lessons) ─────────────────────────────────

function TrackView({
  track,
  progress,
  onBack,
  onOpenLesson,
}: {
  track: CodexTrack
  progress: ProgressRow[]
  onBack: () => void
  onOpenLesson: (lesson: Lesson) => void
}) {
  const [segmentId, setSegmentId] = useState(track.core.id)
  const completedLessonIds = useMemo(
    () => new Set(progress.filter((p) => p.completed && p.trackSlug === track.slug).map((p) => p.lessonId)),
    [progress, track.slug],
  )
  const coreComplete = trackProgressPctForSegment(track.core, completedLessonIds) === 100

  const activeSegment: Segment = segmentId === track.core.id ? track.core : (track.branches.find((b) => b.id === segmentId) ?? track.core)

  return (
    <div className="ops-tab-body">
      <div className="max-w-2xl mx-auto w-full space-y-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70"
        >
          <ChevronLeft size={12} /> Back
        </button>

        <span className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest block">{track.label}</span>

        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSegmentId(track.core.id)}
            className={`font-pixel text-[7px] px-2.5 py-1.5 border ${
              segmentId === track.core.id ? 'border-[#F5C518] text-[#F5C518]' : 'border-white/15 text-white/45'
            }`}
          >
            Core
          </button>
          {track.branches.map((b) => (
            <button
              key={b.id}
              type="button"
              disabled={!coreComplete}
              onClick={() => coreComplete && setSegmentId(b.id)}
              className={`font-pixel text-[7px] px-2.5 py-1.5 border flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                segmentId === b.id ? 'border-[#F5C518] text-[#F5C518]' : 'border-white/15 text-white/45'
              }`}
            >
              {!coreComplete && <Lock size={9} />}
              {b.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {activeSegment.units.map((unit) => {
            const unlocked = unitUnlocked(track, activeSegment.id, unit.id, completedLessonIds)
            return (
              <div key={unit.id} data-testid="codex-unit" className="border border-white/10 bg-[#0a1628]">
                <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                  <span className="font-pixel text-[8px] text-white/70">{unit.label}</span>
                  {!unlocked && <Lock size={11} className="text-white/25" />}
                </div>
                <div className="divide-y divide-white/5">
                  {unit.lessons.map((lesson, idx) => {
                    const priorLessonComplete = idx === 0 || completedLessonIds.has(unit.lessons[idx - 1].id)
                    const clickable = unlocked && priorLessonComplete
                    const done = completedLessonIds.has(lesson.id)
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onOpenLesson(lesson)}
                        data-testid={clickable ? 'codex-lesson-row' : 'codex-lesson-locked'}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="text-sm text-white/85">{lesson.label}</span>
                        {done ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        ) : clickable ? (
                          <ChevronRight size={13} className="text-white/25 shrink-0" />
                        ) : (
                          <Lock size={12} className="text-white/20 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function trackProgressPctForSegment(segment: Segment, completedLessonIds: Set<string>): number {
  const lessons = segment.units.flatMap((u) => u.lessons)
  if (lessons.length === 0) return 0
  const done = lessons.filter((l) => completedLessonIds.has(l.id)).length
  return Math.round((done / lessons.length) * 100)
}

// ─── Lesson view (prose + checkpoint) ──────────────────────────────────────

function McAnswer({ question, value, onChange }: { question: Extract<CheckpointQuestion, { kind: 'mc' }>; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      {question.options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-2 border border-white/10 px-2.5 py-2 cursor-pointer hover:border-white/25">
          <input
            type="radio"
            name={question.id}
            checked={value === opt.id}
            onChange={() => onChange(opt.id)}
            className="accent-[#F5C518]"
          />
          <span className="text-sm text-white/80">{opt.text}</span>
        </label>
      ))}
    </div>
  )
}

function OrderingAnswer({
  question,
  order,
  onChange,
}: {
  question: Extract<CheckpointQuestion, { kind: 'ordering' }>
  order: string[]
  onChange: (order: string[]) => void
}) {
  function move(idx: number, dir: -1 | 1) {
    const next = [...order]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  return (
    <div className="space-y-1.5">
      {order.map((itemId, idx) => {
        const item = question.items.find((i) => i.id === itemId)!
        return (
          <div key={itemId} className="flex items-center gap-2 border border-white/10 px-2.5 py-2">
            <span className="font-pixel text-[7px] text-white/35 w-4">{idx + 1}</span>
            <span className="text-sm text-white/80 flex-1">{item.text}</span>
            <button type="button" onClick={() => move(idx, -1)} className="text-white/30 hover:text-white/70">
              <ArrowUpDown size={12} className="rotate-180" />
            </button>
            <button type="button" onClick={() => move(idx, 1)} className="text-white/30 hover:text-white/70">
              <ArrowUpDown size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function MatchingAnswer({
  question,
  pairs,
  onChange,
}: {
  question: Extract<CheckpointQuestion, { kind: 'matching' }>
  pairs: Record<string, string>
  onChange: (pairs: Record<string, string>) => void
}) {
  return (
    <div className="space-y-1.5">
      {question.left.map((l) => (
        <div key={l.id} className="flex items-center gap-2 border border-white/10 px-2.5 py-2">
          <span className="text-sm text-white/80 flex-1">{l.text}</span>
          <select
            value={pairs[l.id] ?? ''}
            onChange={(e) => onChange({ ...pairs, [l.id]: e.target.value })}
            className="ops-select"
          >
            <option value="">— match —</option>
            {question.right.map((r) => (
              <option key={r.id} value={r.id}>
                {r.text}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

function CheckpointForm({
  questions,
  onSubmit,
  submitting,
}: {
  questions: CheckpointQuestion[]
  onSubmit: (submission: { answers: QuestionSubmission[] }) => void
  submitting: boolean
}) {
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({})
  const [orderAnswers, setOrderAnswers] = useState<Record<string, string[]>>(
    Object.fromEntries(questions.filter((q) => q.kind === 'ordering').map((q) => [q.id, q.items.map((i) => i.id)])),
  )
  const [matchAnswers, setMatchAnswers] = useState<Record<string, Record<string, string>>>({})

  function submit() {
    const answers: QuestionSubmission[] = questions.map((q) => {
      if (q.kind === 'mc') return { kind: 'mc', id: q.id, selectedOptionId: mcAnswers[q.id] ?? '' }
      if (q.kind === 'ordering') return { kind: 'ordering', id: q.id, order: orderAnswers[q.id] ?? q.items.map((i) => i.id) }
      const pairsMap = matchAnswers[q.id] ?? {}
      return { kind: 'matching', id: q.id, pairs: Object.entries(pairsMap) as [string, string][] }
    })
    onSubmit({ answers })
  }

  return (
    <div data-testid="codex-checkpoint" className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border border-white/10 bg-[#0a1628] p-3">
          <p className="font-pixel text-[6px] text-white/35 uppercase tracking-widest mb-1.5">Question {i + 1}</p>
          <p className="text-sm text-white/90 mb-2.5">{q.prompt}</p>
          {q.kind === 'mc' && <McAnswer question={q} value={mcAnswers[q.id]} onChange={(v) => setMcAnswers((p) => ({ ...p, [q.id]: v }))} />}
          {q.kind === 'ordering' && (
            <OrderingAnswer
              question={q}
              order={orderAnswers[q.id] ?? q.items.map((it) => it.id)}
              onChange={(order) => setOrderAnswers((p) => ({ ...p, [q.id]: order }))}
            />
          )}
          {q.kind === 'matching' && (
            <MatchingAnswer
              question={q}
              pairs={matchAnswers[q.id] ?? {}}
              onChange={(pairs) => setMatchAnswers((p) => ({ ...p, [q.id]: pairs }))}
            />
          )}
        </div>
      ))}
      <BusyButton
        busy={submitting}
        busyLabel="Grading…"
        onClick={submit}
        data-testid="codex-checkpoint-submit"
        className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 hover:brightness-110 disabled:opacity-40 transition-all"
      >
        Submit
      </BusyButton>
    </div>
  )
}

function LessonView({
  track,
  lesson,
  onBack,
  onCompleted,
}: {
  track: CodexTrack
  lesson: Lesson
  onBack: () => void
  onCompleted: (result: CompleteResponse) => void
}) {
  const [questions, setQuestions] = useState<CheckpointQuestion[]>(lesson.checkpoint.questions)
  const [attempt, setAttempt] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CompleteResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function submit(submission: { answers: QuestionSubmission[] }) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/ops/codex/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackSlug: track.slug, lessonId: lesson.id, submission }),
      })
      const out = (await res.json()) as CompleteResponse & { error?: string }
      if (!res.ok) throw new Error(out.error ?? 'Could not grade checkpoint')
      setResult(out)
      onCompleted(out)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function retry() {
    const nextAttempt = attempt + 1
    setAttempt(nextAttempt)
    setQuestions(shuffleCheckpoint(lesson.checkpoint.questions, nextAttempt))
    setResult(null)
  }

  return (
    <div className="ops-tab-body">
      <div className="max-w-2xl mx-auto w-full space-y-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-pixel text-[8px] text-white/40 hover:text-white/70"
        >
          <ChevronLeft size={12} /> Back to {track.label}
        </button>

        <h2 className="text-lg text-white font-medium">{lesson.label}</h2>
        <span className="font-pixel text-[7px] text-white/35">{lesson.readingMinutes} min read</span>

        {/* Regular body font for lesson prose — chrome above/below stays font-pixel. */}
        <div className="space-y-3">
          {lesson.sections.map((s, i) => (
            <div key={i}>
              <h3 className="text-base text-white/90 font-medium mb-1">{s.heading}</h3>
              <p className="text-sm text-white/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
          <div className="border-l-2 border-[#F5C518]/40 pl-3">
            <p className="font-pixel text-[6px] text-[#F5C518]/70 uppercase tracking-widest mb-1">Worked example</p>
            <p className="text-sm text-white/70 leading-relaxed">{lesson.workedExample}</p>
          </div>
          <div className="border-l-2 border-white/15 pl-3">
            <p className="font-pixel text-[6px] text-white/40 uppercase tracking-widest mb-1">Why judges ask this</p>
            <p className="text-sm text-white/60 leading-relaxed italic">{lesson.judgeFraming}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          {!result ? (
            <CheckpointForm questions={questions} onSubmit={submit} submitting={submitting} />
          ) : result.capReached ? (
            <div data-testid="codex-cap-reached" className="border border-[#F5C518]/30 bg-[#F5C518]/[0.06] p-3">
              <span className="font-pixel text-[8px] text-[#F5C518]">
                Daily limit reached — come back tomorrow for more lessons.
              </span>
            </div>
          ) : result.passed ? (
            <div data-testid="codex-checkpoint-pass" className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={14} />
                <span className="font-pixel text-[8px]">Lesson complete.</span>
              </div>
              {result.kpEarned > 0 && (
                <div data-testid="codex-kp-earned" className="font-pixel text-[9px] text-[#F5C518]">
                  +{result.kpEarned} KP earned
                </div>
              )}
            </div>
          ) : (
            <div data-testid="codex-checkpoint-fail" className="space-y-3">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle size={14} />
                <span className="font-pixel text-[8px]">Not quite — review the explanations below.</span>
              </div>
              {result.perQuestion
                .filter((q) => !q.correct && q.explanation)
                .map((q) => (
                  <p key={q.id} data-testid="codex-explanation" className="text-sm text-white/70 border border-white/10 bg-[#0a1628] p-2.5">
                    {q.explanation}
                  </p>
                ))}
              <button
                type="button"
                onClick={retry}
                data-testid="codex-retry"
                className="font-pixel text-[8px] border border-[#F5C518]/40 text-[#F5C518] px-3 py-2 hover:bg-[#F5C518]/10 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {submitError && <p className="font-pixel text-[7px] text-red-400 mt-2">{submitError}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Main tab ───────────────────────────────────────────────────────────────

type View = { kind: 'home' } | { kind: 'track'; slug: string } | { kind: 'lesson'; slug: string; lessonId: string }

export function CodexTab() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ProgressPayload | null>(null)
  const [view, setView] = useState<View>({ kind: 'home' })
  const [activeTrack, setActiveTrack] = useState<CodexTrack | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    return fetch('/api/ops/codex/progress')
      .then((r) => r.json())
      .then((d: ProgressPayload) => setPayload(d))
      .catch(() => setLoadError('Could not load the Field Codex. Please refresh.'))
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  useEffect(() => {
    if (view.kind === 'track' || view.kind === 'lesson') {
      loadTrack(view.slug).then(setActiveTrack)
    }
  }, [view])

  async function generateStudyPlan() {
    setGeneratingPlan(true)
    setPlanError(null)
    try {
      const res = await fetch('/api/ops/codex/study-plan', { method: 'POST' })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not generate a study plan')
      await refresh()
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGeneratingPlan(false)
    }
  }

  if (loading) {
    return <OpsTabSkeleton variant="terminal" />
  }

  if (loadError || !payload) {
    return (
      <div className="ops-tab-body items-center justify-center text-center">
        <BookOpen size={20} className="text-white/25 mb-2" />
        <span className="font-pixel text-[8px] text-white/40">{loadError ?? 'Could not load the Field Codex.'}</span>
      </div>
    )
  }

  if (view.kind === 'home') {
    return (
      <CodexHome
        progress={payload.progress}
        dailyCap={payload.dailyCap}
        studyPlan={payload.studyPlan}
        onGenerateStudyPlan={generateStudyPlan}
        generatingPlan={generatingPlan}
        planError={planError}
        onOpenTrack={(slug) => setView({ kind: 'track', slug })}
      />
    )
  }

  if (view.kind === 'track') {
    if (!activeTrack || activeTrack.slug !== view.slug) {
      return <LabeledLoader label="Loading track…" fill="tab" />
    }
    return (
      <TrackView
        track={activeTrack}
        progress={payload.progress}
        onBack={() => setView({ kind: 'home' })}
        onOpenLesson={(lesson) => setView({ kind: 'lesson', slug: view.slug, lessonId: lesson.id })}
      />
    )
  }

  // view.kind === 'lesson'
  if (!activeTrack || activeTrack.slug !== view.slug) {
    return <LabeledLoader label="Loading lesson…" fill="tab" />
  }
  const lesson = [activeTrack.core, ...activeTrack.branches]
    .flatMap((s) => s.units.flatMap((u) => u.lessons))
    .find((l) => l.id === view.lessonId)
  if (!lesson) {
    return <LabeledLoader label="Loading lesson…" fill="tab" />
  }
  return (
    <LessonView
      track={activeTrack}
      lesson={lesson}
      onBack={() => setView({ kind: 'track', slug: view.slug })}
      onCompleted={() => {
        refresh()
      }}
    />
  )
}
