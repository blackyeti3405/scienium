'use client'

import { useCallback, useEffect, useState } from 'react'
import { useFinalTopic } from '@/components/discovery/hooks/useFinalTopic'
import { TopicConfirmModals } from '@/components/discovery/TopicConfirmModals'
import { RefreshCw, Link2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PROJECT_TYPES } from '@/lib/research-plan/types'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { BusyButton } from '@/components/ui/BusyButton'
import { MyDataSection } from './MyDataSection'
import { RemindersSection } from './RemindersSection'
import { getResearchPlanSummary } from './api'

interface SettingsData {
  name: string | null
  school: string | null
  labName: string | null
  zip: string | null
  state: string | null
  isLead: boolean
  researchIdea: string | null
}

/**
 * Pixel-styled form rendered inside the Clerk "Lab & Profile" custom page.
 * Lets students edit their name/school (always) and lab name/ZIP (lead only).
 * Also lets any team member edit the research topic and research-plan doc.
 */
export function LabProfileSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<SettingsData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Local form state
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [labName, setLabName] = useState('')
  const [zip, setZip] = useState('')
  const [researchIdea, setResearchIdea] = useState('')

  // ── Research topic — the SHARED load/save/confirm-wipe flow (useFinalTopic,
  // also Discovery's). Settings ignores the KP/interest toasts, so both
  // callbacks are no-ops; the editor-open button seeds the draft itself.
  const {
    finalTopic: topic,
    topicPaperCount,
    topicLoaded,
    editingTopic: topicEditing,
    setEditingTopic: setTopicEditing,
    topicDraft,
    setTopicDraft,
    savingTopic,
    topicSaveError: topicError,
    topicConfirm,
    setTopicConfirm,
    topicRemovalConfirm,
    setTopicRemovalConfirm,
    topicWipeResult,
    setTopicWipeResult,
    saveTopic,
  } = useFinalTopic({ onKpAwarded: () => {}, onInterestConnect: () => {} })

  // ── Research plan state ─────────────────────────────────────────────────────
  const [planDocUrl, setPlanDocUrl] = useState('')
  const [planType, setPlanType] = useState<string | null>(null)
  const [planSubtype, setPlanSubtype] = useState<string | null>(null)
  const [planLastSyncedAt, setPlanLastSyncedAt] = useState<string | null>(null)
  const [planHasText, setPlanHasText] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)
  // A failed load is distinct from "loaded, no plan connected yet" — the old
  // `.catch(() => {})` (and a non-2xx body, which never even reached the catch
  // since `d.plan` just came back undefined) made a network blip look exactly
  // like a team that had never connected a doc, silently discarding whatever
  // was already synced from the form (§0.7).
  const [planLoadError, setPlanLoadError] = useState(false)

  // ── Load settings ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: SettingsData & { error?: string }) => {
        if (d.error) throw new Error(d.error)
        setData(d)
        setName(d.name ?? '')
        setSchool(d.school ?? '')
        setLabName(d.labName ?? '')
        setZip(d.zip ?? '')
        setResearchIdea(d.researchIdea ?? '')
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load settings')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Load research plan (independent of settings fetch) ──────────────────────
  const loadPlan = useCallback(() => {
    setPlanLoaded(false)
    setPlanLoadError(false)
    return getResearchPlanSummary()
      .then((d) => {
        if (d.plan) {
          setPlanDocUrl(d.plan.googleDocUrl ?? '')
          setPlanType(d.plan.projectType ?? null)
          setPlanSubtype(d.plan.projectSubtype ?? null)
          setPlanLastSyncedAt(d.plan.lastSyncedAt ?? null)
          setPlanHasText(d.plan.hasText ?? false)
        }
      })
      .catch(() => {
        setPlanLoadError(true)
      })
      .finally(() => setPlanLoaded(true))
  }, [])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  // ── Save profile / lab ───────────────────────────────────────────────────────
  async function save() {
    if (!data) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    // Only send changed fields
    const body: Record<string, string> = {}
    if (name !== (data.name ?? '')) body.name = name
    if (school !== (data.school ?? '')) body.school = school
    if (researchIdea !== (data.researchIdea ?? '')) body.researchIdea = researchIdea
    if (data.isLead) {
      if (labName !== (data.labName ?? '')) body.labName = labName
      if (zip !== (data.zip ?? '')) body.zip = zip
    }

    if (Object.keys(body).length === 0) {
      setSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      return
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d: SettingsData & { error?: string } = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not save settings')

      // Re-sync from response
      setData(d)
      setName(d.name ?? '')
      setSchool(d.school ?? '')
      setLabName(d.labName ?? '')
      setZip(d.zip ?? '')
      setResearchIdea(d.researchIdea ?? '')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  // ── Save research plan ───────────────────────────────────────────────────────
  async function savePlan() {
    setSavingPlan(true)
    setPlanError(null)
    try {
      const res = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleDocUrl: planDocUrl,
          projectType: planType,
          projectSubtype: planSubtype,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setPlanError(d.error ?? 'Could not connect the doc')
        return
      }
      if (d.plan) {
        setPlanDocUrl(d.plan.googleDocUrl ?? '')
        setPlanType(d.plan.projectType ?? null)
        setPlanSubtype(d.plan.projectSubtype ?? null)
        setPlanLastSyncedAt(d.plan.lastSyncedAt ?? null)
        setPlanHasText(d.plan.hasText ?? false)
      }
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : 'Could not connect the doc')
    } finally {
      setSavingPlan(false)
    }
  }

  const activePlanType = PROJECT_TYPES.find((t) => t.key === planType)
  const canSavePlan = planDocUrl.trim().length > 8 && !!planType && !!planSubtype && !savingPlan

  return (
    <div className="bg-[#0d1b2e] text-white p-5 flex flex-col gap-6 min-w-[300px] relative">

      {/* Topic-change / topic-removal confirm modals — shared with Discovery
          (both drive the useFinalTopic-shaped state). */}
      <TopicConfirmModals
        variant="settings"
        topicConfirm={topicConfirm}
        topicRemovalConfirm={topicRemovalConfirm}
        savingTopic={savingTopic}
        onCancelTopicChange={() => setTopicConfirm(null)}
        onConfirmTopicChange={(newTopic) => saveTopic(newTopic, true)}
        onCancelTopicRemoval={() => setTopicRemovalConfirm(null)}
        onConfirmTopicRemoval={(newTopic, paperIds, proposalToken) =>
          saveTopic(newTopic, true, paperIds, proposalToken)
        }
      />

      {/* ── Your profile section — skeletons independently while /api/settings
          is in flight, instead of gating the whole form on one fetch. ────────── */}
      {loading ? (
        <div className="flex flex-col gap-4" data-testid="settings-profile-skeleton">
          <PixelSkeleton variant="line" h="h-4" w="w-28" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
        </div>
      ) : loadError ? (
        <p className="font-pixel text-[8px] text-red-400 py-2">{loadError}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest border-b border-white/10 pb-2">
            Your profile
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              className="bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
              School
            </label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              maxLength={120}
              placeholder="High school name"
              className="bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm"
            />
          </div>
        </div>
      )}

      {/* ── Your lab section ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-4" data-testid="settings-lab-skeleton">
          <PixelSkeleton variant="line" h="h-4" w="w-20" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
        </div>
      ) : loadError ? null : (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest">
            Your lab
          </h3>
          {!data?.isLead && (
            <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest">
              Lead only
            </span>
          )}
        </div>

        {!data?.isLead && (
          <p className="font-pixel text-[7px] text-white/40 leading-loose">
            Only the lab lead can edit lab settings.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
            Lab name
          </label>
          <input
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            maxLength={80}
            placeholder="Lab name"
            disabled={!data?.isLead}
            className="bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
            ZIP code (US)
          </label>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            maxLength={10}
            placeholder="90089"
            disabled={!data?.isLead}
            className="bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {data?.state && (
            <span className="font-pixel text-[7px] text-white/40">
              Current: {data.zip} · {data.state}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
            Research idea (one sentence)
          </label>
          <input
            value={researchIdea}
            onChange={(e) => setResearchIdea(e.target.value)}
            maxLength={500}
            placeholder="e.g. I'm investigating how soil pH affects plant growth rate…"
            className="bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm"
          />
          <span className="font-pixel text-[7px] text-white/40 leading-loose">
            Editing this does not change your assigned lab type.
          </span>
        </div>
      </div>
      )}

      {/* ── Profile/lab save actions ──────────────────────────────────────────── */}
      {!loading && !loadError && (
        <div className="flex items-center gap-3 pt-1">
          <BusyButton
            busy={saving}
            busyLabel="Saving…"
            onClick={save}
            className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2"
          >
            Save changes
          </BusyButton>
          {saveSuccess && (
            <span className="font-pixel text-[7px] text-green-400">Saved!</span>
          )}
        </div>
      )}

      {saveError && (
        <p className="font-pixel text-[7px] text-red-400 leading-loose">{saveError}</p>
      )}

      {/* ── Research topic section — independent fetch, own skeleton ─────────── */}
      {!topicLoaded ? (
        <div className="flex flex-col gap-4" data-testid="settings-topic-skeleton">
          <PixelSkeleton variant="line" h="h-4" w="w-32" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
        </div>
      ) : (
      <div className="flex flex-col gap-4">
        <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest border-b border-white/10 pb-2">
          Research topic
        </h3>

        {/* Current topic display */}
        {!topicEditing && (
          <div className="flex flex-col gap-2">
            {topic ? (
              <div className="flex items-start gap-2">
                <span className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest shrink-0 pt-0.5">
                  Current
                </span>
                <span className="text-sm text-white/90 flex-1">{topic}</span>
              </div>
            ) : (
              <p className="font-pixel text-[7px] text-white/40 leading-loose">
                No topic set yet — choose your final research topic here.
              </p>
            )}
            <button
              onClick={() => {
                setTopicDraft(topic ?? '')
                setTopicEditing(true)
              }}
              className="self-start font-pixel text-[7px] text-white/40 hover:text-white/70 border border-white/15 rounded-sm px-3 py-1.5 transition-colors"
            >
              {topic ? 'Change topic' : 'Set topic'}
            </button>
          </div>
        )}

        {topicEditing && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topicDraft.trim()) saveTopic(topicDraft.trim())
                  if (e.key === 'Escape') setTopicEditing(false)
                }}
                maxLength={200}
                placeholder="State your final research topic…"
                className="flex-1 bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <BusyButton
                busy={savingTopic}
                busyLabel="Saving…"
                onClick={() => topicDraft.trim() && saveTopic(topicDraft.trim())}
                disabled={!topicDraft.trim()}
                className="font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                Save topic
              </BusyButton>
              <button
                onClick={() => setTopicEditing(false)}
                className="font-pixel text-[7px] text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {topicError && (
          <p className="font-pixel text-[7px] text-red-400 leading-loose">{topicError}</p>
        )}

        {/* Wipe result notice */}
        {topicWipeResult && (
          <div className="bg-[#0d1b2e] border border-orange-500/40 rounded-sm px-4 py-3 flex items-start gap-3">
            <span className="text-orange-400 text-base shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-[8px] text-orange-300">
                {topicWipeResult.removedCount} source{topicWipeResult.removedCount !== 1 ? 's' : ''} removed
              </p>
              {topicWipeResult.removedTitles.length > 0 && (
                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                  {topicWipeResult.removedTitles.slice(0, 3).join(', ')}
                  {topicWipeResult.removedTitles.length > 3 &&
                    ` and ${topicWipeResult.removedTitles.length - 3} more`}
                </p>
              )}
            </div>
            <button
              onClick={() => setTopicWipeResult(null)}
              className="text-white/40 hover:text-white/60 shrink-0 font-pixel text-[8px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Paper count hint when topic is set */}
        {topic && topicPaperCount > 0 && (
          <p className="font-pixel text-[7px] text-white/40 leading-loose">
            {topicPaperCount} source{topicPaperCount !== 1 ? 's' : ''} in your literature review
          </p>
        )}
      </div>
      )}

      {/* ── Research plan section — independent fetch, own skeleton ──────────── */}
      {!planLoaded ? (
        <div className="flex flex-col gap-4" data-testid="settings-plan-skeleton">
          <PixelSkeleton variant="line" h="h-4" w="w-32" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
          <PixelSkeleton variant="box" h="h-9" w="w-full" />
        </div>
      ) : planLoadError ? (
        <div className="flex flex-col gap-3" data-testid="settings-plan-load-error">
          <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest border-b border-white/10 pb-2">
            Research plan
          </h3>
          <p className="font-pixel text-[7px] text-red-400 leading-loose">
            Couldn&apos;t load your research plan — check your connection.
          </p>
          <button
            onClick={() => void loadPlan()}
            className="self-start font-pixel text-[7px] text-white/40 hover:text-white/70 border border-white/15 rounded-sm px-3 py-1.5 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="font-pixel text-[9px] text-white/90 uppercase tracking-widest">
            Research plan
          </h3>
          {planHasText && planLastSyncedAt && (
            <span className="font-pixel text-[7px] text-white/40">
              synced {formatDistanceToNow(new Date(planLastSyncedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Project type buttons */}
        <div className="flex flex-col gap-2">
          <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">
            Project type
          </label>
          <div className="flex gap-2">
            {PROJECT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setPlanType(t.key)
                  setPlanSubtype(null)
                }}
                className={`font-pixel text-[8px] px-4 py-2 border rounded-sm transition-colors ${
                  planType === t.key
                    ? 'border-[#F5C518] text-[#F5C518] bg-[#F5C518]/10'
                    : 'border-white/20 text-white/45 hover:border-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtype buttons */}
        {activePlanType && (
          <div className="grid grid-cols-2 gap-2">
            {activePlanType.subtypes.map((s) => (
              <button
                key={s.key}
                onClick={() => setPlanSubtype(s.key)}
                className={`text-left px-3 py-2 border rounded-sm transition-colors ${
                  planSubtype === s.key
                    ? 'border-[#F5C518]/60 bg-[#F5C518]/5'
                    : 'border-white/[0.12] hover:border-white/30'
                }`}
              >
                <span className="block text-[13px] text-white/85">{s.label}</span>
                <span className="block font-pixel text-[6px] text-white/40 mt-0.5">{s.blurb}</span>
              </button>
            ))}
          </div>
        )}

        {/* Google Doc URL */}
        <div className="flex flex-col gap-1.5">
          <label className="font-pixel text-[7px] text-white/50 uppercase tracking-widest flex items-center gap-1">
            <Link2 size={9} className="text-[#F5C518]" /> Google Doc URL
          </label>
          <p className="font-pixel text-[7px] text-white/40 leading-loose">
            Paste an &ldquo;Anyone with the link&rdquo; Google Doc URL.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={planDocUrl}
              onChange={(e) => setPlanDocUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/…"
              className="flex-1 bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40 rounded-sm"
            />
            <BusyButton
              busy={savingPlan}
              busyLabel="Syncing…"
              icon={planHasText ? <RefreshCw size={11} /> : <Link2 size={11} />}
              onClick={savePlan}
              disabled={!canSavePlan}
              className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {planHasText ? 'Refresh' : 'Connect & sync'}
            </BusyButton>
          </div>
          {planError && (
            <p className="font-pixel text-[7px] text-red-400 mt-1 leading-loose">{planError}</p>
          )}
        </div>
      </div>
      )}

      {/* ── Deadline reminders — per-member windows + destination (§13.7) ────── */}
      <RemindersSection />

      {/* ── Your data — export / erasure requests (REFACTOR2 P1-R9) ──────────── */}
      <MyDataSection />
    </div>
  )
}
