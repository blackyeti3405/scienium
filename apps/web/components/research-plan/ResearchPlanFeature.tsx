'use client'

import {
  FileText,
  Link2,
  RefreshCw,
  ClipboardCheck,
  ClipboardPaste,
  Globe,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PROJECT_TYPES } from '@/lib/research-plan/types'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { EMPTY_REVIEW, PlanReviewView } from './PlanReviewView'
import { IdeaActivity, IdeaCheckView } from './IdeaCheckView'
import { MAX_PLAN_TEXT, useResearchPlan } from './useResearchPlan'

export function ResearchPlanFeature() {
  const {
    loading,
    plan,
    quota,
    type,
    setType,
    subtype,
    setSubtype,
    docUrl,
    setDocUrl,
    syncing,
    syncError,
    mode,
    setMode,
    planText,
    setPlanText,
    savingText,
    textError,
    review,
    reviewStreaming,
    reviewError,
    checking,
    activity,
    idea,
    ideaError,
    sync,
    saveText,
    runReview,
    runIdeaCheck,
    activeType,
    canSync,
    canSaveText,
    synced,
    isPasteSource,
    textLen,
    overCap,
  } = useResearchPlan()

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#0d1b2e] text-white" data-testid="research-plan-skeleton">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex flex-col gap-2">
            <PixelSkeleton variant="line" h="h-4" w="w-36" />
            <PixelSkeleton variant="line" h="h-3" w="w-64" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="flex gap-2">
            <PixelSkeleton variant="pill" h="h-8" w="w-28" />
            <PixelSkeleton variant="pill" h="h-8" w="w-28" />
          </div>
          <PixelSkeleton variant="box" h="h-24" w="w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PixelSkeleton variant="box" h="h-12" w="w-full" />
            <PixelSkeleton variant="box" h="h-12" w="w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Research Plan</h2>
          <p className="font-pixel text-[7px] text-white/40 mt-1">
            Connect your plan, get a type-specific review, and check originality
          </p>
        </div>
        {synced && plan?.lastSyncedAt && (
          <span className="font-pixel text-[7px] text-white/40">
            synced {formatDistanceToNow(new Date(plan.lastSyncedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* ── Project type ── */}
        <section>
          <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mb-2">
            Project type
          </h3>
          <div className="flex gap-2 mb-3">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setType(t.key)
                  setSubtype(null)
                }}
                className={`font-pixel text-[8px] px-4 py-2 border rounded-sm transition-colors ${
                  type === t.key
                    ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                    : 'border-white/20 text-white/45 hover:border-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeType && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {activeType.subtypes.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSubtype(s.key)}
                  className={`text-left px-3 py-2 border rounded-sm transition-colors ${
                    subtype === s.key
                      ? 'border-[#F5C518]/60 bg-[#F5C518]/5'
                      : 'border-white/12 hover:border-white/30'
                  }`}
                >
                  <span className="block text-[13px] text-white/85">{s.label}</span>
                  <span className="block font-pixel text-[6px] text-white/40 mt-0.5">{s.blurb}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Plan source (Google Doc or pasted text) ── */}
        <section>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h3 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest flex items-center gap-1.5">
              {mode === 'doc' ? (
                <Link2 size={11} className="text-[#F5C518]" />
              ) : (
                <ClipboardPaste size={11} className="text-[#F5C518]" />
              )}
              Plan source
            </h3>
            {synced && plan?.activeSource && (
              <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest px-2 py-1 border border-white/15 rounded-sm">
                source: {plan.activeSource === 'paste' ? 'pasted text' : 'google doc'}
              </span>
            )}
          </div>

          {/* Segmented toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode('doc')}
              className={`font-pixel text-[8px] px-4 py-2 border rounded-sm transition-colors flex items-center gap-1.5 ${
                mode === 'doc'
                  ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                  : 'border-white/20 text-white/45 hover:border-white/40 hover:text-white/70'
              }`}
            >
              <Link2 size={10} /> Connect a doc
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`font-pixel text-[8px] px-4 py-2 border rounded-sm transition-colors flex items-center gap-1.5 ${
                mode === 'paste'
                  ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                  : 'border-white/20 text-white/45 hover:border-white/40 hover:text-white/70'
              }`}
            >
              <ClipboardPaste size={10} /> Paste text
            </button>
          </div>

          {mode === 'doc' ? (
            <>
              <p className="font-pixel text-[7px] text-white/40 leading-loose mb-2">
                Paste an &ldquo;Anyone with the link&rdquo; Google Doc URL. We read its latest text
                on sync (no account connection needed yet).
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/…"
                  className="flex-1 bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40"
                />
                <BusyButton
                  busy={syncing}
                  busyLabel="Syncing…"
                  icon={synced && !isPasteSource ? <RefreshCw size={11} /> : <Link2 size={11} />}
                  onClick={sync}
                  disabled={!canSync}
                  className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {synced && !isPasteSource ? 'Refresh' : 'Connect & sync'}
                </BusyButton>
              </div>
              {syncError && <p className="font-pixel text-[7px] text-red-400 mt-2">{syncError}</p>}
            </>
          ) : (
            <>
              <p className="font-pixel text-[7px] text-white/40 leading-loose mb-2">
                Paste or type your plan text — the review and idea check read it directly.
              </p>
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="Paste your research plan here…"
                rows={10}
                className="w-full bg-[#0a1628] border border-white/20 text-white/90 text-[13px] leading-relaxed px-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 resize-y"
              />
              <div className="flex items-center justify-between mt-2 gap-2">
                <span className={`font-pixel text-[7px] ${overCap ? 'text-red-400' : 'text-white/40'}`}>
                  {textLen.toLocaleString()} / {MAX_PLAN_TEXT.toLocaleString()}
                </span>
                <BusyButton
                  busy={savingText}
                  busyLabel="Saving…"
                  icon={<ClipboardPaste size={11} />}
                  onClick={saveText}
                  disabled={!canSaveText}
                  className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {isPasteSource ? 'Update text' : 'Save text'}
                </BusyButton>
              </div>
              {textError && <p className="font-pixel text-[7px] text-red-400 mt-2">{textError}</p>}
            </>
          )}

          {synced && plan?.textPreview && (
            <div className="mt-3 px-3 py-2 bg-white/3 border border-white/10 rounded-sm">
              <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest flex items-center gap-1 mb-1">
                <FileText size={9} /> synced preview
              </span>
              <p className="text-[12px] text-white/55 leading-relaxed line-clamp-3">
                {plan.textPreview}…
              </p>
            </div>
          )}
        </section>

        {/* ── Actions ── */}
        {synced && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BusyButton
              busy={reviewStreaming}
              busyLabel="Reviewing…"
              icon={<ClipboardCheck size={12} />}
              spinnerTone="vega"
              onClick={runReview}
              disabled={!type || !subtype}
              className="flex items-center justify-center gap-2 font-pixel text-[8px] border border-[#F5C518]/40 text-[#F5C518] py-3 rounded-sm hover:bg-[#F5C518]/10 disabled:opacity-40 transition-colors"
            >
              Review my plan
            </BusyButton>
            <BusyButton
              busy={checking}
              busyLabel="Checking…"
              icon={<Globe size={12} />}
              spinnerTone="vega"
              onClick={runIdeaCheck}
              disabled={quota.remaining <= 0}
              title={quota.remaining <= 0 ? 'Daily limit reached' : undefined}
              className="flex items-center justify-center gap-2 font-pixel text-[8px] border border-white/25 text-white/70 py-3 rounded-sm hover:border-white/45 hover:text-white/90 disabled:opacity-40 transition-colors"
            >
              Has this been done? · {quota.remaining}/{quota.limit} left
            </BusyButton>
          </section>
        )}

        {/* ── Plan review (structured, fills in live) ── */}
        {reviewError && <p className="font-pixel text-[8px] text-red-400">{reviewError}</p>}
        {(reviewStreaming || review) && (
          <>
            {/* REFACTOR2 P2-S7 — the review below graded text this plan no
                longer contains. Same shape as the synthesis check's stale note. */}
            {plan?.lastReviewStale && !reviewStreaming && (
              <p data-testid="plan-review-stale" className="font-pixel text-[8px] text-orange-300/90">
                your plan has changed since this review — run it again for the current text
              </p>
            )}
            <PlanReviewView review={review ?? EMPTY_REVIEW} variant="student" streaming={reviewStreaming} />
          </>
        )}

        {/* ── Idea check (live activity, then verdict) ── */}
        {ideaError && <p className="font-pixel text-[8px] text-red-400">{ideaError}</p>}
        {checking && <IdeaActivity activity={activity} />}
        {idea && !checking && (
          <>
            {plan?.lastIdeaCheckStale && (
              <p data-testid="idea-check-stale" className="font-pixel text-[8px] text-orange-300/90">
                your plan has changed since this check — run it again for the current text
              </p>
            )}
            <IdeaCheckView idea={idea} variant="student" />
          </>
        )}
      </div>
    </div>
  )
}
