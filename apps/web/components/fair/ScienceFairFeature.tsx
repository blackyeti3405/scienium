'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trophy,
  Award,
  AlertTriangle,
  ClipboardList,
  LayoutGrid,
  Bell,
} from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { ISEF_RUBRIC, ISEF_BOARD_GUIDANCE, ISEF_EMPHASIS } from '@/lib/fairs/isef-rubric'
import type { FairMatch, FairView } from '@/lib/fairs/match'
import { FormsChecklist } from './FormsChecklist'
import { CategoryBrowser } from './CategoryBrowser'

type Tab = 'overview' | 'forms' | 'categories'

interface MatchResponse {
  location: { zip: string | null; state: string | null }
  match: FairMatch
}

export function ScienceFairFeature() {
  const [data, setData] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/fairs/match')
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed to load fairs')
      setData(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fairs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function patchEvent(fairId: string, event: FairView['event']) {
    setData((prev) => {
      if (!prev) return prev
      const patch = (f: FairView | null) => (f && f.id === fairId ? { ...f, event } : f)
      const m = prev.match
      return {
        ...prev,
        match: {
          ...m,
          regional: patch(m.regional),
          stateFair: patch(m.stateFair),
          isef: patch(m.isef),
          otherRegionals: m.otherRegionals.map((f) => patch(f)!),
        },
      }
    })
  }

  const fairs = data?.match
  const countdown = useMemo(() => nextFairCountdown(fairs), [fairs])
  const urgentDeadlines = useMemo(() => upcomingDeadlines(fairs), [fairs])

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div>
          <h2 className="font-pixel text-[10px] text-white">Science Fair Hub</h2>
          <p className="font-pixel text-[7px] text-white/35 mt-1">
            Your competition path — regional, state, and ISEF
          </p>
        </div>
        {countdown && (
          <div className="text-right">
            <div
              className={`font-pixel text-[18px] flex items-center gap-1.5 justify-end ${
                countdown.days <= 7
                  ? 'text-red-400'
                  : countdown.days <= 14
                    ? 'text-amber-400'
                    : 'text-[#F5C518]'
              }`}
            >
              <CalendarClock size={14} />
              {countdown.days <= 0 ? 'Today!' : `${countdown.days}d`}
            </div>
            <p className="font-pixel text-[7px] text-white/35 mt-1 max-w-[200px] truncate">
              to {countdown.name}
            </p>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10 shrink-0">
        {(
          [
            { key: 'overview', label: 'Overview', icon: <CalendarClock size={10} /> },
            { key: 'forms', label: 'Forms', icon: <ClipboardList size={10} /> },
            { key: 'categories', label: 'Categories', icon: <LayoutGrid size={10} /> },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 font-pixel text-[7px] uppercase tracking-widest px-4 py-2.5 border-b-2 transition-colors ${
              tab === key
                ? 'border-[#F5C518] text-[#F5C518]'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Deadline alerts — shown on any tab when deadlines are within 30 days */}
      {urgentDeadlines.length > 0 && (
        <div className="shrink-0 flex flex-col gap-1 px-6 pt-3">
          {urgentDeadlines.map((d, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border ${
                d.days <= 7
                  ? 'bg-red-500/10 border-red-500/30'
                  : d.days <= 14
                    ? 'bg-amber-500/10 border-amber-500/25'
                    : 'bg-blue-500/8 border-blue-500/20'
              }`}
            >
              <Bell
                size={10}
                className={
                  d.days <= 7 ? 'text-red-400' : d.days <= 14 ? 'text-amber-400' : 'text-blue-400'
                }
              />
              <p
                className={`font-pixel text-[7px] leading-loose ${
                  d.days <= 7
                    ? 'text-red-300'
                    : d.days <= 14
                      ? 'text-amber-200'
                      : 'text-blue-200/80'
                }`}
              >
                {d.days <= 0 ? 'Today:' : `${d.days}d:`}{' '}
                <strong>{d.label}</strong> — {d.fairName}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white/40">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : error && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-pixel text-[8px] text-red-400">{error}</p>
        </div>
      ) : tab === 'forms' ? (
        <div className="flex-1 overflow-y-auto">
          <FormsChecklist />
        </div>
      ) : tab === 'categories' ? (
        <div className="flex-1 overflow-y-auto">
          <CategoryBrowser />
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {data.location.state ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FairCard
                fair={fairs?.regional ?? null}
                kind="Regional fair"
                emptyHint={`No affiliated regional fair on file for ${data.location.state} yet.`}
                onSynced={patchEvent}
              />
              <FairCard
                fair={fairs?.stateFair ?? null}
                kind="State fair"
                emptyHint={`No state fair on file for ${data.location.state} yet.`}
                onSynced={patchEvent}
              />
              <FairCard fair={fairs?.isef ?? null} kind="ISEF" onSynced={patchEvent} />
            </div>
          ) : (
            <div className="border border-dashed border-white/15 rounded-sm p-6 text-center">
              <p className="font-pixel text-[8px] text-white/45 leading-loose">
                Add your ZIP in your account settings (top-right avatar → Lab &amp; Profile) to find
                your regional and state fairs.
              </p>
              <div className="mt-4">
                <FairCard fair={fairs?.isef ?? null} kind="ISEF" onSynced={patchEvent} />
              </div>
            </div>
          )}

          {/* Estimated-data disclaimer */}
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-sm">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="font-pixel text-[7px] text-amber-200/80 leading-loose">
              Fair matches and dates are a starting point compiled from the affiliated-fair
              directory and are <strong>estimated</strong>. Confirm details on each fair&rsquo;s
              official site — use &ldquo;Sync from site&rdquo; to pull the latest dates.
            </p>
          </div>

          <IsefRubric />
        </div>
      ) : null}
    </div>
  )
}

// ─── Fair card ────────────────────────────────────────────────────────────────

function FairCard({
  fair,
  kind,
  emptyHint,
  onSynced,
}: {
  fair: FairView | null
  kind: string
  emptyHint?: string
  onSynced: (fairId: string, event: FairView['event']) => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const isIsef = kind === 'ISEF'

  async function sync() {
    if (!fair) return
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch(`/api/fairs/${fair.id}/sync-deadlines`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Sync failed')
      onSynced(fair.id, d.event)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (!fair) {
    return (
      <div className="border border-dashed border-white/12 rounded-sm p-4 flex flex-col gap-2">
        <span className="font-pixel text-[7px] text-white/30 uppercase tracking-widest">{kind}</span>
        <p className="text-[13px] text-white/35 leading-relaxed">{emptyHint ?? 'Not available.'}</p>
      </div>
    )
  }

  const e = fair.event
  return (
    <div
      className={`border rounded-sm p-4 flex flex-col gap-3 ${
        isIsef ? 'border-[#F5C518]/40 bg-[#F5C518]/5' : 'border-white/12 bg-white/3'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[7px] text-[#F5C518] uppercase tracking-widest flex items-center gap-1">
          {isIsef ? <Trophy size={9} /> : <Award size={9} />} {kind}
        </span>
        {fair.distanceMiles != null && (
          <span className="font-pixel text-[7px] text-white/30">~{fair.distanceMiles} mi</span>
        )}
      </div>

      <p className="text-sm text-white/85 leading-snug">{fair.name}</p>

      {/* Dates */}
      <div className="flex flex-col gap-1.5">
        <DateRow label="Fair day" value={e?.eventDate} highlight />
        <DateRow label="Registration" value={e?.registrationDeadline} />
        <DateRow label="Abstract due" value={e?.abstractDeadline} />
        {e?.venue && (
          <p className="font-pixel text-[7px] text-white/40 mt-0.5">{e.venue}</p>
        )}
        {!e && <p className="font-pixel text-[7px] text-white/30">No dates on file yet.</p>}
      </div>

      {/* Status + actions */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {e && (
          <span
            className={`font-pixel text-[6px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
              e.status === 'confirmed'
                ? 'bg-green-500/15 text-green-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {e.status}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {fair.websiteUrl && (
            <a
              href={fair.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[7px] text-white/40 hover:text-white/70 flex items-center gap-1"
            >
              <ExternalLink size={9} /> site
            </a>
          )}
          {!isIsef && (
            <button
              onClick={sync}
              disabled={syncing}
              title="Read the fair's site and update its dates"
              className="font-pixel text-[7px] border border-white/20 text-white/50 px-2 py-1 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              {syncing ? (
                <Loader2 size={9} className="animate-spin" />
              ) : (
                <RefreshCw size={9} />
              )}
              Sync from site
            </button>
          )}
        </div>
      </div>
      {syncError && <p className="font-pixel text-[6px] text-red-400">{syncError}</p>}
    </div>
  )
}

function DateRow({
  label,
  value,
  highlight,
}: {
  label: string
  value?: string | null
  highlight?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-pixel text-[7px] text-white/35 uppercase tracking-widest">{label}</span>
      <span className={`text-[13px] ${highlight ? 'text-[#F5C518]' : 'text-white/70'}`}>
        {value ? format(new Date(value), 'MMM d, yyyy') : '—'}
      </span>
    </div>
  )
}

// ─── ISEF rubric ──────────────────────────────────────────────────────────────

function IsefRubric() {
  const [track, setTrack] = useState<'science' | 'engineering'>('science')
  const active = ISEF_RUBRIC.find((t) => t.key === track)!

  return (
    <div className="border-t border-white/10 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-[9px] text-white flex items-center gap-1.5">
          <Trophy size={11} className="text-[#F5C518]" /> ISEF Judging Rubric
        </h3>
        <div className="flex items-center gap-1 border border-white/15 rounded-sm overflow-hidden">
          {ISEF_RUBRIC.map((t) => (
            <button
              key={t.key}
              onClick={() => setTrack(t.key)}
              className={`font-pixel text-[7px] px-3 py-1.5 transition-colors ${
                track === t.key
                  ? 'bg-[#F5C518] text-[#0d1b2e]'
                  : 'text-white/45 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {active.criteria.map((c) => (
          <div
            key={c.numeral}
            className="flex gap-3 px-3 py-2.5 bg-white/3 border border-white/10 rounded-sm"
          >
            <span className="font-pixel text-[9px] text-[#F5C518] shrink-0 w-6">{c.numeral}.</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-white/85">{c.title}</span>
                <span className="font-pixel text-[8px] text-white/40 shrink-0">{c.points} pts</span>
              </div>

              {/* Checklist subpoints judges score against */}
              {c.items && <CriterionItems items={c.items} />}

              {/* Section V: Poster + Interview sub-sections, each with its own items */}
              {c.subsections?.map((s) => (
                <div key={s.title} className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-pixel text-[7px] text-white/55 uppercase tracking-widest">
                      {s.title}
                    </span>
                    <span className="font-pixel text-[7px] text-white/30">{s.points} pts</span>
                  </div>
                  <CriterionItems items={s.items} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Where judges place extra emphasis */}
      <h4 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mt-5 mb-2">
        Judging emphasis
      </h4>
      <div className="flex flex-col gap-2">
        {ISEF_EMPHASIS.map((e) => (
          <div key={e.title} className="px-3 py-2 bg-[#F5C518]/5 border border-[#F5C518]/20 rounded-sm">
            <span className="font-pixel text-[7px] text-[#F5C518]/80 uppercase tracking-widest">
              {e.title}
            </span>
            <p className="text-[12px] text-white/55 leading-relaxed mt-1">{e.detail}</p>
          </div>
        ))}
      </div>

      <h4 className="font-pixel text-[8px] text-white/50 uppercase tracking-widest mt-5 mb-2">
        Project board guidance
      </h4>
      <ul className="flex flex-col gap-1.5">
        {ISEF_BOARD_GUIDANCE.map((g, i) => (
          <li key={i} className="flex gap-2 text-[13px] text-white/60 leading-relaxed">
            <span className="text-[#F5C518]/60 shrink-0">▪</span>
            {g}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CriterionItems({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1 mt-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5 text-[12px] text-white/55 leading-relaxed">
          <span className="text-green-400/60 shrink-0 mt-[1px]">✓</span>
          {it}
        </li>
      ))}
    </ul>
  )
}

// ─── Countdown + deadline alerts ──────────────────────────────────────────────

function nextFairCountdown(
  match: FairMatch | undefined,
): { name: string; days: number } | null {
  if (!match) return null
  const candidates = [match.regional, match.stateFair, match.isef].filter(
    (f): f is FairView => !!f && !!f.event?.eventDate,
  )
  const today = new Date()
  const upcoming = candidates
    .map((f) => ({ name: f.name, date: new Date(f.event!.eventDate!) }))
    .filter((c) => differenceInCalendarDays(c.date, today) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  if (!upcoming.length) return null
  return { name: upcoming[0].name, days: differenceInCalendarDays(upcoming[0].date, today) }
}

interface DeadlineAlert {
  fairName: string
  label: string
  days: number
}

function upcomingDeadlines(match: FairMatch | undefined): DeadlineAlert[] {
  if (!match) return []
  const today = new Date()
  const alerts: DeadlineAlert[] = []

  for (const fair of [match.regional, match.stateFair, match.isef]) {
    if (!fair?.event) continue
    const e = fair.event
    const checks: Array<{ label: string; date: string | null }> = [
      { label: 'Registration deadline', date: e.registrationDeadline },
      { label: 'Abstract due', date: e.abstractDeadline },
      { label: 'Fair day', date: e.eventDate },
    ]
    for (const { label, date } of checks) {
      if (!date) continue
      const days = differenceInCalendarDays(new Date(date), today)
      if (days >= 0 && days <= 30) {
        alerts.push({ fairName: fair.name, label, days })
      }
    }
  }

  return alerts.sort((a, b) => a.days - b.days)
}
