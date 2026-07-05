'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Link2,
  RefreshCw,
  Loader2,
  ClipboardCheck,
  ClipboardPaste,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Search,
  Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PROJECT_TYPES } from '@/lib/research-plan/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewSection {
  title: string
  score: number
  max: number
  assessment: string
}
interface Review {
  overall: { readiness: string; score: number; summary: string } | null
  sections: ReviewSection[]
  strengths: string[]
  gaps: string[]
  recommendations: string[]
}
const EMPTY_REVIEW: Review = {
  overall: null,
  sections: [],
  strengths: [],
  gaps: [],
  recommendations: [],
}

// Mirrors MAX_STORED_TEXT in app/api/research-plan/route.ts — the server truncates
// at the same cap, so the client-side counter matches what actually gets saved.
const MAX_PLAN_TEXT = 100_000

interface IdeaFindings {
  summary: string
  priorWork: { title?: string; url?: string; note?: string }[]
  differentiation: string
  recommendation: string
  citations: { title: string; url: string }[]
}
interface IdeaResult {
  verdict: 'novel' | 'refine' | 'reject'
  findings: IdeaFindings
}
interface PlanData {
  googleDocUrl: string | null
  projectType: string | null
  projectSubtype: string | null
  lastSyncedAt: string | null
  hasText: boolean
  textPreview: string | null
  // F3 paste-text fallback — which input last populated the synced text, and
  // (only for paste rows) the full text so the textarea can edit-in-place.
  activeSource: 'google_doc' | 'paste' | null
  planTextFull: string | null
  lastReview: Review | null
  lastReviewedAt: string | null
  lastIdeaCheck: IdeaResult | null
  lastIdeaCheckAt: string | null
}

// Read a newline-delimited-JSON stream, dispatching each parsed object.
async function readNdjson(body: ReadableStream<Uint8Array>, onEvent: (e: any) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (line) {
        try {
          onEvent(JSON.parse(line))
        } catch {
          /* ignore partial */
        }
      }
    }
  }
  if (buf.trim()) {
    try {
      onEvent(JSON.parse(buf.trim()))
    } catch {
      /* ignore */
    }
  }
}

export function ResearchPlanFeature() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [quota, setQuota] = useState({ usedToday: 0, limit: 3, remaining: 3 })

  const [type, setType] = useState<string | null>(null)
  const [subtype, setSubtype] = useState<string | null>(null)
  const [docUrl, setDocUrl] = useState('')

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // F3 paste-text fallback — a toggle beside the doc-link input; 'paste' seeds
  // from the DB on load when that's the team's currently-active source.
  const [mode, setMode] = useState<'doc' | 'paste'>('doc')
  const [planText, setPlanText] = useState('')
  const [savingText, setSavingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  // Review (structured, fills in progressively as events stream)
  const [review, setReview] = useState<Review | null>(null)
  const [reviewStreaming, setReviewStreaming] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Idea check (streamed activity + final structured verdict)
  const [checking, setChecking] = useState(false)
  const [activity, setActivity] = useState<{
    status: string
    searches: string[]
    sources: { title: string; url: string }[]
  }>({ status: '', searches: [], sources: [] })
  const [idea, setIdea] = useState<IdeaResult | null>(null)
  const [ideaError, setIdeaError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/research-plan')
      .then((r) => r.json())
      .then((d) => {
        if (d.plan) {
          setPlan(d.plan)
          setType(d.plan.projectType)
          setSubtype(d.plan.projectSubtype)
          setDocUrl(d.plan.googleDocUrl ?? '')
          if (d.plan.activeSource === 'paste') {
            setMode('paste')
            setPlanText(d.plan.planTextFull ?? '')
          }
          setReview(d.plan.lastReview ?? null)
          setIdea(d.plan.lastIdeaCheck ?? null)
        }
        if (d.ideaCheck) setQuota(d.ideaCheck)
      })
      .finally(() => setLoading(false))
  }, [])

  async function sync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDocUrl: docUrl, projectType: type, projectSubtype: subtype }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not connect the doc')
      setPlan(d.plan)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Could not connect the doc')
    } finally {
      setSyncing(false)
    }
  }

  // F3 paste-text fallback — same POST endpoint as sync(), just the other input.
  async function saveText() {
    setSavingText(true)
    setTextError(null)
    try {
      const res = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planText, projectType: type, projectSubtype: subtype }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not save the text')
      setPlan(d.plan)
    } catch (err) {
      setTextError(err instanceof Error ? err.message : 'Could not save the text')
    } finally {
      setSavingText(false)
    }
  }

  async function runReview() {
    setReviewStreaming(true)
    setReviewError(null)
    setReview(EMPTY_REVIEW)
    try {
      const res = await fetch('/api/research-plan/review', { method: 'POST' })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Review failed')
      }
      await readNdjson(res.body, (e) => {
        if (e.type === 'error') {
          setReviewError(e.error)
          return
        }
        setReview((r) => {
          const cur = r ?? EMPTY_REVIEW
          switch (e.type) {
            case 'overall':
              return { ...cur, overall: { readiness: e.readiness, score: e.score, summary: e.summary } }
            case 'section':
              return {
                ...cur,
                sections: [
                  ...cur.sections,
                  { title: e.title, score: e.score, max: e.max, assessment: e.assessment },
                ],
              }
            case 'strength':
              return { ...cur, strengths: [...cur.strengths, e.text] }
            case 'gap':
              return { ...cur, gaps: [...cur.gaps, e.text] }
            case 'recommendation':
              return { ...cur, recommendations: [...cur.recommendations, e.text] }
            default:
              return cur
          }
        })
      })
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setReviewStreaming(false)
    }
  }

  async function runIdeaCheck() {
    setChecking(true)
    setIdeaError(null)
    setIdea(null)
    setActivity({ status: 'Starting…', searches: [], sources: [] })
    try {
      const res = await fetch('/api/research-plan/idea-check', { method: 'POST' })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Idea check failed')
      }
      await readNdjson(res.body, (e) => {
        if (e.type === 'status') setActivity((a) => ({ ...a, status: e.message }))
        else if (e.type === 'search')
          setActivity((a) => ({ ...a, status: 'Searching…', searches: [...a.searches, e.query] }))
        else if (e.type === 'sources')
          setActivity((a) => ({ ...a, sources: [...a.sources, ...e.items] }))
        else if (e.type === 'done') {
          setIdea({ verdict: e.verdict, findings: e.findings })
          setQuota({ usedToday: e.usedToday, limit: e.limit, remaining: e.remaining })
        } else if (e.type === 'error') setIdeaError(e.error)
      })
    } catch (err) {
      setIdeaError(err instanceof Error ? err.message : 'Idea check failed')
    } finally {
      setChecking(false)
    }
  }

  const activeType = PROJECT_TYPES.find((t) => t.key === type)
  const canSync = docUrl.trim().length > 8 && !!type && !!subtype
  // Per plan: Save is disabled only on empty text — unlike the doc sync button,
  // it does not additionally require a project type/subtype selection.
  const canSaveText = planText.trim().length > 0
  const synced = plan?.hasText
  const isPasteSource = plan?.activeSource === 'paste'
  const textLen = planText.length
  const overCap = textLen >= MAX_PLAN_TEXT

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1b2e] text-white/40">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Research Plan</h2>
          <p className="font-pixel text-[7px] text-white/35 mt-1">
            Connect your plan, get a type-specific review, and check originality
          </p>
        </div>
        {synced && plan?.lastSyncedAt && (
          <span className="font-pixel text-[7px] text-white/30">
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
                  <span className="block font-pixel text-[6px] text-white/35 mt-0.5">{s.blurb}</span>
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
              <p className="font-pixel text-[7px] text-white/30 leading-loose mb-2">
                Paste an &ldquo;Anyone with the link&rdquo; Google Doc URL. We read its latest text
                on sync (no account connection needed yet).
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/…"
                  className="flex-1 bg-[#0a1628] border border-white/20 text-white text-sm px-3 py-2 outline-none focus:border-[#F5C518]/60 placeholder:text-white/30"
                />
                <button
                  onClick={sync}
                  disabled={!canSync || syncing}
                  className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {syncing ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : synced && !isPasteSource ? (
                    <RefreshCw size={11} />
                  ) : (
                    <Link2 size={11} />
                  )}
                  {synced && !isPasteSource ? 'Refresh' : 'Connect & sync'}
                </button>
              </div>
              {syncError && <p className="font-pixel text-[7px] text-red-400 mt-2">{syncError}</p>}
            </>
          ) : (
            <>
              <p className="font-pixel text-[7px] text-white/30 leading-loose mb-2">
                Paste or type your plan text — the review and idea check read it directly.
              </p>
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="Paste your research plan here…"
                rows={10}
                className="w-full bg-[#0a1628] border border-white/20 text-white/90 text-[13px] leading-relaxed px-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/30 resize-y"
              />
              <div className="flex items-center justify-between mt-2 gap-2">
                <span className={`font-pixel text-[7px] ${overCap ? 'text-red-400' : 'text-white/30'}`}>
                  {textLen.toLocaleString()} / {MAX_PLAN_TEXT.toLocaleString()}
                </span>
                <button
                  onClick={saveText}
                  disabled={!canSaveText || savingText}
                  className="shrink-0 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  {savingText ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <ClipboardPaste size={11} />
                  )}
                  {isPasteSource ? 'Update text' : 'Save text'}
                </button>
              </div>
              {textError && <p className="font-pixel text-[7px] text-red-400 mt-2">{textError}</p>}
            </>
          )}

          {synced && plan?.textPreview && (
            <div className="mt-3 px-3 py-2 bg-white/3 border border-white/10 rounded-sm">
              <span className="font-pixel text-[6px] text-white/30 uppercase tracking-widest flex items-center gap-1 mb-1">
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
            <button
              onClick={runReview}
              disabled={reviewStreaming || !type || !subtype}
              className="flex items-center justify-center gap-2 font-pixel text-[8px] border border-[#F5C518]/40 text-[#F5C518] py-3 rounded-sm hover:bg-[#F5C518]/10 disabled:opacity-40 transition-colors"
            >
              {reviewStreaming ? <Loader2 size={12} className="animate-spin" /> : <ClipboardCheck size={12} />}
              Review my plan
            </button>
            <button
              onClick={runIdeaCheck}
              disabled={checking || quota.remaining <= 0}
              title={quota.remaining <= 0 ? 'Daily limit reached' : undefined}
              className="flex items-center justify-center gap-2 font-pixel text-[8px] border border-white/25 text-white/70 py-3 rounded-sm hover:border-white/45 hover:text-white/90 disabled:opacity-40 transition-colors"
            >
              {checking ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
              Has this been done? · {quota.remaining}/{quota.limit} left
            </button>
          </section>
        )}

        {/* ── Plan review (structured, fills in live) ── */}
        {reviewError && <p className="font-pixel text-[8px] text-red-400">{reviewError}</p>}
        {(reviewStreaming || review) && (
          <ReviewPanel review={review ?? EMPTY_REVIEW} streaming={reviewStreaming} />
        )}

        {/* ── Idea check (live activity, then verdict) ── */}
        {ideaError && <p className="font-pixel text-[8px] text-red-400">{ideaError}</p>}
        {checking && <IdeaActivity activity={activity} />}
        {idea && !checking && <IdeaPanel idea={idea} />}
      </div>
    </div>
  )
}

// ─── Review panel (structured; populates progressively) ───────────────────────

function ReviewPanel({ review, streaming }: { review: Review; streaming: boolean }) {
  const readiness = review.overall?.readiness ?? 'early'
  const tone =
    readiness === 'strong'
      ? 'text-green-300 border-green-500/30 bg-green-500/10'
      : readiness === 'promising'
        ? 'text-[#F5C518] border-[#F5C518]/30 bg-[#F5C518]/10'
        : 'text-orange-300 border-orange-500/30 bg-orange-500/10'

  return (
    <section className="border-t border-white/10 pt-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={12} className="text-[#F5C518]" />
        <h3 className="font-pixel text-[9px] text-white">Plan review</h3>
        {streaming && (
          <span className="font-pixel text-[7px] text-white/35 flex items-center gap-1 ml-auto">
            <Loader2 size={9} className="animate-spin" /> grading…
          </span>
        )}
      </div>

      {streaming && (
        <div className="h-0.5 bg-white/8 -mt-2 overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-[#F5C518]/70 animate-[indeterminate_1.2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Overall */}
      {review.overall ? (
        <div className={`px-4 py-3 rounded-sm border flex items-center gap-3 ${tone}`}>
          <Sparkles size={18} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-pixel text-[9px] uppercase tracking-widest">{readiness}</span>
            <p className="text-[13px] text-white/75 leading-relaxed mt-1">{review.overall.summary}</p>
          </div>
          <span className="font-pixel text-[16px] shrink-0">{review.overall.score}</span>
        </div>
      ) : (
        streaming && <SkeletonBar height="h-14" />
      )}

      {/* Section-by-section — rows append as each is graded */}
      <div className="flex flex-col gap-2">
        {review.sections.map((s, i) => (
          <SectionRow key={i} section={s} />
        ))}
        {streaming && review.sections.length < 5 && <SkeletonBar height="h-12" />}
      </div>

      {/* Three columns — fill in as bullets arrive */}
      {(review.strengths.length > 0 ||
        review.gaps.length > 0 ||
        review.recommendations.length > 0 ||
        streaming) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BulletColumn title="Strengths" items={review.strengths} color="text-green-400" streaming={streaming} />
          <BulletColumn title="Gaps" items={review.gaps} color="text-orange-400" streaming={streaming} />
          <BulletColumn
            title="Next steps"
            items={review.recommendations}
            color="text-[#F5C518]"
            streaming={streaming}
          />
        </div>
      )}
    </section>
  )
}

function SectionRow({ section }: { section: ReviewSection }) {
  const pct = section.max ? Math.min(100, (section.score / section.max) * 100) : 0
  // Animate the bar from 0 → score so it "fills" when the row appears.
  const [w, setW] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div className="px-3 py-2.5 bg-white/3 border border-white/10 rounded-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-white/85">{section.title}</span>
        <span className="font-pixel text-[8px] text-white/40 shrink-0">
          {section.score}/{section.max}
        </span>
      </div>
      <div className="h-1 bg-white/8 rounded-full my-1.5 overflow-hidden">
        <div
          className="h-full bg-[#F5C518] rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${w}%` }}
        />
      </div>
      <p className="text-[12px] text-white/50 leading-relaxed">{section.assessment}</p>
    </div>
  )
}

function BulletColumn({
  title,
  items,
  color,
  streaming,
}: {
  title: string
  items: string[]
  color: string
  streaming: boolean
}) {
  return (
    <div>
      <h4 className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-1.5">{title}</h4>
      <ul className="flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] text-white/65 leading-relaxed">
            <span className={`shrink-0 ${color}`}>▪</span>
            {it}
          </li>
        ))}
        {items.length === 0 && streaming && (
          <li className="font-pixel text-[7px] text-white/25">…</li>
        )}
      </ul>
    </div>
  )
}

function SkeletonBar({ height }: { height: string }) {
  return <div className={`${height} bg-white/5 border border-white/10 rounded-sm animate-pulse`} />
}

// ─── Idea-check live activity ─────────────────────────────────────────────────

function IdeaActivity({
  activity,
}: {
  activity: { status: string; searches: string[]; sources: { title: string; url: string }[] }
}) {
  return (
    <section className="border-t border-white/10 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <Loader2 size={12} className="animate-spin text-[#F5C518]" />
        <h3 className="font-pixel text-[9px] text-white">Checking the web…</h3>
        <span className="font-pixel text-[7px] text-white/35">{activity.status}</span>
      </div>

      {activity.searches.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-3">
          {activity.searches.map((q, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px] text-white/75">
              <Search size={11} className="text-blue-300 shrink-0" />
              <span className="truncate">{q}</span>
            </li>
          ))}
        </ul>
      )}

      {activity.sources.length > 0 && (
        <div>
          <span className="font-pixel text-[6px] text-white/30 uppercase tracking-widest">
            {activity.sources.length} sources found
          </span>
          <ul className="flex flex-col gap-1 mt-1.5">
            {activity.sources.slice(-8).map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-white/45 hover:text-white/70 truncate flex items-center gap-1"
                >
                  <ExternalLink size={8} className="shrink-0" /> {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ─── Idea-check verdict ───────────────────────────────────────────────────────

function IdeaPanel({ idea }: { idea: IdeaResult }) {
  const v = idea.verdict
  const meta =
    v === 'novel'
      ? { icon: <CheckCircle2 size={18} />, label: 'Looks novel', tone: 'text-green-300 border-green-500/30 bg-green-500/10' }
      : v === 'reject'
        ? { icon: <XCircle size={18} />, label: 'Likely done — consider pivoting', tone: 'text-red-300 border-red-500/30 bg-red-500/10' }
        : { icon: <AlertTriangle size={18} />, label: 'Refine your angle', tone: 'text-amber-300 border-amber-500/30 bg-amber-500/10' }

  return (
    <section className="border-t border-white/10 pt-5 flex flex-col gap-4">
      <div className={`px-4 py-3 rounded-sm border flex items-center gap-3 ${meta.tone}`}>
        <span className="shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-pixel text-[9px] uppercase tracking-widest">{meta.label}</span>
          <p className="text-[13px] text-white/75 leading-relaxed mt-1">{idea.findings.summary}</p>
        </div>
      </div>

      {idea.findings.priorWork?.length > 0 && (
        <div>
          <h4 className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-2">
            Prior work
          </h4>
          <ul className="flex flex-col gap-2">
            {idea.findings.priorWork.map((p, i) => (
              <li key={i} className="px-3 py-2 bg-white/3 border border-white/10 rounded-sm">
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
                  >
                    {p.title ?? p.url} <ExternalLink size={9} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-[13px] text-white/80">{p.title}</span>
                )}
                {p.note && <p className="text-[12px] text-white/45 leading-relaxed mt-0.5">{p.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {idea.findings.differentiation && (
        <div>
          <h4 className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-1.5">
            How you could differ
          </h4>
          <p className="text-[13px] text-white/65 leading-relaxed">{idea.findings.differentiation}</p>
        </div>
      )}

      {idea.findings.recommendation && (
        <div className="px-3 py-2.5 bg-[#F5C518]/5 border border-[#F5C518]/25 rounded-sm">
          <h4 className="font-pixel text-[7px] text-[#F5C518]/70 uppercase tracking-widest mb-1">
            Recommendation
          </h4>
          <p className="text-[13px] text-white/75 leading-relaxed">{idea.findings.recommendation}</p>
        </div>
      )}

      {idea.findings.citations?.length > 0 && (
        <div>
          <h4 className="font-pixel text-[7px] text-white/40 uppercase tracking-widest mb-1.5">
            Sources
          </h4>
          <div className="flex flex-col gap-1">
            {idea.findings.citations.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-white/40 hover:text-white/70 truncate flex items-center gap-1"
              >
                <ExternalLink size={8} className="shrink-0" /> {c.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
