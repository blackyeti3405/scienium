'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { BookOpen, Lock, ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { CODEX_TRACKS, loadTrack } from '@/lib/ops/codex/index'
import { unitUnlocked, fluencyTier } from '@/lib/ops/codex/engine'
import type { CodexTrack, Lesson, Segment } from '@/lib/ops/codex/types'
import { LessonExperience } from './codex/LessonExperience'

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
  const allLessons = [activeTrack.core, ...activeTrack.branches].flatMap((s) => s.units.flatMap((u) => u.lessons))
  const lesson = allLessons.find((l) => l.id === view.lessonId)
  if (!lesson) {
    return <LabeledLoader label="Loading lesson…" fill="tab" />
  }

  // Progress-derived context for the lesson experience (all local compute).
  const completedLessonIds = new Set(
    payload.progress.filter((p) => p.completed && p.trackSlug === activeTrack.slug).map((p) => p.lessonId),
  )
  const completed = completedLessonIds.has(lesson.id)
  const capReached = payload.dailyCap.completedToday >= payload.dailyCap.limit && !completed
  let unitLabel = ''
  for (const seg of [activeTrack.core, ...activeTrack.branches]) {
    const owning = seg.units.find((u) => u.lessons.some((l) => l.id === lesson.id))
    if (owning) {
      unitLabel = owning.label
      break
    }
  }
  // The next lesson in track order the student hasn't finished — the target for
  // "Next lesson" after a pass (structural, so it's correct even before the
  // just-passed lesson's completion has refreshed in).
  const lessonIdx = allLessons.findIndex((l) => l.id === lesson.id)
  const nextLesson =
    lessonIdx >= 0 ? (allLessons.slice(lessonIdx + 1).find((l) => !completedLessonIds.has(l.id)) ?? null) : null

  return (
    <LessonExperience
      key={lesson.id}
      trackSlug={activeTrack.slug}
      trackLabel={activeTrack.label}
      lesson={lesson}
      unitLabel={unitLabel}
      completed={completed}
      capReached={capReached}
      nextLesson={nextLesson}
      onBackToTrack={() => setView({ kind: 'track', slug: view.slug })}
      onOpenLesson={(l) => setView({ kind: 'lesson', slug: view.slug, lessonId: l.id })}
      onCompleted={() => {
        refresh()
      }}
    />
  )
}
