'use client'

import { useState, useEffect } from 'react'
import { X, FlaskConical, Lock, Quote, BookOpen, Grid3x3, Brain } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { BusyButton } from '@/components/ui/BusyButton'
import { CitationsPanel } from './CitationsPanel'
import dynamic from 'next/dynamic'
import { type Paper, TOTAL_SLOTS } from './types'
import { PaperSlot } from './PaperSlot'
import { QAPanel } from './QAPanel'
import { usePapers } from './usePapers'

// Re-exported for any consumer that imported the Paper type from this module.
export type { Paper } from './types'

// Code-split: the guide bundles a ~68KB static glossary but only renders when
// the student toggles it open, so it loads on first open (featureRegistry pattern).
const ResearchGuidePanel = dynamic(
  () => import('./ResearchGuidePanel').then((m) => m.ResearchGuidePanel),
  { loading: () => <LabeledLoader label="Loading guide…" fill="panel" /> },
)

// Code-split for the same reason as ResearchGuidePanel — only loads once the
// student toggles it open.
const SynthesisPanel = dynamic(
  () => import('./SynthesisPanel').then((m) => m.SynthesisPanel),
  { loading: () => <LabeledLoader label="Loading synthesis matrix…" fill="panel" /> },
)

// Code-split for the same reason as ResearchGuidePanel — only loads once the
// student toggles it open.
const VocabPanel = dynamic(
  () => import('./VocabPanel').then((m) => m.VocabPanel),
  { loading: () => <LabeledLoader label="Loading your vocabulary deck…" fill="panel" /> },
)

export function LiteratureFeature() {
  const router = useRouter()
  const { confirm, dialog } = useConfirm()
  const [activePaper, setActivePaper] = useState<Paper | null>(null)
  const {
    papers,
    setPapers,
    papersLoaded,
    loadError,
    retryLoad,
    uploadError,
    setUploadError,
    handleUpload,
    handleDelete,
    readyCount,
    locked,
  } = usePapers({
    confirm,
    onPaperDeleted: (paperId) => {
      if (activePaper?.id === paperId) setActivePaper(null)
    },
  })
  const [topic, setTopic] = useState<string | null | undefined>(undefined) // undefined = loading
  // Distinct load-error sentinel (UX-3): a failed topic fetch must not render
  // the "set your topic first" warning — the team may well have one set.
  const [topicLoadFailed, setTopicLoadFailed] = useState(false)
  const [idea, setIdea] = useState('')
  const [ideaBusy, setIdeaBusy] = useState(false)
  const [ideaError, setIdeaError] = useState<string | null>(null)
  const [ideaResult, setIdeaResult] = useState<{ labTypeLabel: string; rationale: string } | null>(null)
  const [researchIdea, setResearchIdea] = useState<string | null>(null)
  const [labType, setLabType] = useState<LabType | null>(null)
  const [showCitations, setShowCitations] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [showVocab, setShowVocab] = useState(false)

  useEffect(() => {
    fetch('/api/discovery/topic')
      .then((r) => {
        if (!r.ok) throw new Error(`topic fetch failed (${r.status})`)
        return r.json()
      })
      .then((d) => setTopic(d.topic ?? null))
      .catch(() => {
        setTopic(null)
        setTopicLoadFailed(true)
      })
  }, [])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d: { researchIdea?: string | null; labType?: string | null }) => {
        setResearchIdea(d.researchIdea ?? null)
        setLabType((d.labType as LabType | null) ?? null)
      })
      .catch(() => {
        // degrade gracefully — leave both null and fall through to first-time path
      })
  }, [])

  async function advancePhase() {
    if (!idea.trim()) { setIdeaError('Describe your research idea first.'); return }
    setIdeaBusy(true)
    setIdeaError(null)
    try {
      const res = await fetch('/api/team/advance-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researchIdea: idea.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not advance')
      setIdeaResult({ labTypeLabel: data.labTypeLabel, rationale: data.rationale })
      setTimeout(() => router.refresh(), 2200)
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : 'Could not advance')
      setIdeaBusy(false)
    }
  }

  // Citations library — full-screen sub-view (#13)
  if (showCitations) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        <CitationsPanel onClose={() => setShowCitations(false)} />
      </div>
    )
  }

  // Research Guide — glossary + anatomy-of-a-paper reference, full-screen sub-view (F1)
  if (showGuide) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        <ResearchGuidePanel onClose={() => setShowGuide(false)} />
      </div>
    )
  }

  // Synthesis Matrix — discipline-adaptive comparison grid across 2-4 sources,
  // full-screen sub-view.
  if (showSynthesis) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        <SynthesisPanel onClose={() => setShowSynthesis(false)} labType={labType} />
      </div>
    )
  }

  // Vocabulary Builder — spaced-repetition deck of terms extracted from the
  // team's own sources, full-screen sub-view. ZERO LLM.
  if (showVocab) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        <VocabPanel onClose={() => setShowVocab(false)} />
      </div>
    )
  }

  // If a paper is open in Q&A mode, show the split view
  if (activePaper) {
    return (
      <div className="h-full bg-[#0d1b2e] text-white">
        {dialog}
        <QAPanel
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onProficiencyEarned={() => {
            setPapers((prev) =>
              prev.map((p) =>
                p.id === activePaper.id ? { ...p, proficiencyDemonstrated: true } : p,
              ),
            )
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {dialog}
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Literature Review</h2>
          {topic ? (
            <p className="font-pixel text-[7px] text-[#F5C518]/70 mt-1 max-w-[260px] truncate">
              🎯 {topic}
            </p>
          ) : (
            <p className="font-pixel text-[7px] text-white/35 mt-1">
              Upload and review 25 sources to advance your lab
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            data-testid="research-guide-open"
            onClick={() => setShowGuide(true)}
            title="Research vocabulary glossary and paper anatomy reference"
            className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/50 px-2.5 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            <BookOpen size={10} /> Research Guide
          </button>
          <button
            onClick={() => setShowCitations(true)}
            title="View your citation library"
            className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/50 px-2.5 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            <Quote size={10} /> Citations
          </button>
          <button
            data-testid="synthesis-open"
            onClick={() => setShowSynthesis(true)}
            title="Compare 2-4 sources in a discipline-adaptive synthesis matrix"
            className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/50 px-2.5 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            <Grid3x3 size={10} /> Synthesis
          </button>
          <button
            data-testid="vocab-open"
            onClick={() => setShowVocab(true)}
            title="Spaced-repetition deck of key terms from your own sources"
            className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/50 px-2.5 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
          >
            <Brain size={10} /> Vocabulary
          </button>
          <div className="text-right">
            <span className="font-pixel text-[18px] text-[#F5C518]">
              {papersLoaded ? readyCount : '—'}
            </span>
            <span className="font-pixel text-[10px] text-white/30"> / 25</span>
          </div>
        </div>
      </div>

      {/* Idea submission box — shown once all 25 sources are in */}
      {locked && (() => {
        const ideaSubmitted = !!researchIdea || !!ideaResult
        // Display text: prefer the persisted value; for just-submitted-this-session fallback to `idea`
        const ideaText = researchIdea ?? idea
        // Lab type label: prefer fresh submit result, otherwise map the persisted enum
        const labTypeLabel = ideaResult?.labTypeLabel ?? (labType ? LAB_TYPE_LABELS[labType] : null)

        return (
          <div className="mx-6 mt-4 mb-4 rounded-sm border border-[#F5C518]/35 bg-[#F5C518]/[0.06] px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={13} className="text-[#F5C518] shrink-0" />
              <span className="font-pixel text-[8px] text-[#F5C518]">
                {ideaSubmitted
                  ? 'Literature review complete — lab assigned'
                  : 'Literature review complete — describe your project in one sentence'}
              </span>
            </div>

            {ideaSubmitted ? (
              <div className="flex flex-col gap-2">
                {ideaText && (
                  <span className="font-pixel text-[8px] text-white/80 leading-relaxed">
                    {ideaText}
                  </span>
                )}
                <span className="font-pixel text-[8px] text-green-300">
                  Lab assigned: <strong>{labTypeLabel}</strong>
                  {ideaResult?.rationale ? ` — ${ideaResult.rationale}` : ''}
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !ideaBusy && advancePhase()}
                  maxLength={500}
                  disabled={ideaBusy}
                  placeholder="e.g. I'm investigating how soil pH affects plant growth rate…"
                  className="flex-1 bg-[#0a1628] border border-white/20 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#F5C518]/60 px-3 py-2 rounded-sm font-pixel text-[8px]"
                />
                <BusyButton
                  busy={ideaBusy}
                  busyLabel="Classifying…"
                  icon={<FlaskConical size={11} />}
                  spinnerTone="vega"
                  onClick={advancePhase}
                  disabled={!idea.trim()}
                  className="shrink-0 flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Submit
                </BusyButton>
              </div>
            )}

            {ideaError && (
              <span className="font-pixel text-[7px] text-red-400">{ideaError}</span>
            )}
          </div>
        )
      })()}

      {/* No-topic warning — only shown when not yet locked AND the topic fetch
          genuinely returned "no topic set" (a fetch failure must not nag) */}
      {!locked && topic === null && !topicLoadFailed && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-[#F5C518]/8 border border-[#F5C518]/25 rounded-sm flex items-start gap-2.5">
          <span className="font-pixel text-[8px] text-[#F5C518]/60 shrink-0 mt-0.5">!</span>
          <p className="font-pixel text-[7px] text-[#F5C518]/60 leading-relaxed">
            Set your final research topic in Discovery first. Once set, Vega will check that each source you upload is relevant.
          </p>
        </div>
      )}

      {/* Upload error banner */}
      {uploadError && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-red-500/15 border border-red-500/30 rounded-sm flex items-start justify-between gap-3">
          <span className="font-pixel text-[8px] text-red-300 leading-relaxed">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-200 shrink-0 mt-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Lock notice + progress bar */}
      {!papersLoaded ? (
        <div className="h-1 bg-white/8 shrink-0" />
      ) : locked ? (
        <div className="flex items-center gap-2 px-6 py-3 bg-white/[0.02] border-t border-white/8 shrink-0">
          <Lock size={10} className="text-white/25 shrink-0" />
          <span className="font-pixel text-[7px] text-green-300/70">Sources locked — 25/25</span>
          <div className="flex-1 h-1.5 rounded-full bg-green-400 ml-2" />
        </div>
      ) : (
        <div className="h-1 bg-white/8 shrink-0">
          <div
            className="h-full bg-[#F5C518] transition-all duration-500"
            style={{ width: `${(readyCount / TOTAL_SLOTS) * 100}%` }}
          />
        </div>
      )}

      {/* Slots list */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {!papersLoaded ? (
          // Misleading "0 / 25" flash fix: shimmer the 25 slots instead of
          // rendering the real empty-upload dropzones before the fetch resolves.
          Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
            <PixelSkeleton key={`slot-skel-${i}`} variant="box" h="h-[52px]" w="w-full" />
          ))
        ) : loadError ? (
          // A failed load must never render as the empty first-run state — a
          // returning team on flaky wifi would think their sources are gone
          // (and might re-upload, burning relevance checks). Offer a retry.
          <div className="border border-dashed border-red-400/25 rounded-sm py-10 text-center flex flex-col items-center gap-3">
            <p className="font-pixel text-[9px] text-red-300">
              Couldn&apos;t load your sources — check your connection.
            </p>
            <button
              onClick={retryLoad}
              className="font-pixel text-[8px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {papers.map((paper) => (
              <PaperSlot
                key={paper.id}
                paper={paper}
                isFirst={false}
                onOpenQA={setActivePaper}
                onDelete={locked ? undefined : handleDelete}
              />
            ))}

            {/* Empty upload slots only shown while not yet locked */}
            {!locked && Array.from({ length: TOTAL_SLOTS - papers.length }).map((_, i) => (
              <PaperSlot
                key={`empty-${i}`}
                isFirst={i === 0}
                onUpload={i === 0 ? handleUpload : undefined}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
