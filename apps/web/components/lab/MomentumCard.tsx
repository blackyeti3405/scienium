'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, X } from 'lucide-react'

interface MomentumStats {
  windowDays: number
  kpEarned: number
  sourcesReviewed: number
  logsWritten: number
  datasetsAdded: number
  pointsAdded: number
  daysToNextFair: number | null
  nextFairName: string | null
}

/** "today" / "tomorrow" / "in N days" — mirrors lib/notifications/compute.ts. */
function fairWhen(daysUntil: number): string {
  if (daysUntil === 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  return `${daysUntil}d`
}

interface MomentumCardProps {
  onDismiss: () => void
}

/**
 * Dismissible pixel recap card pinned to the lab viewport, showing the team's
 * last-7-days momentum (KP, sources, logs, datasets, data points, days to
 * next fair). Self-fetches GET /api/team/momentum on mount — no SSR props, no
 * localStorage access here (dismissal persistence is owned by LabScene so this
 * stays presentational and testable). Renders nothing while loading, on error,
 * or when the window is entirely quiet (nothing to celebrate).
 */
export function MomentumCard({ onDismiss }: MomentumCardProps) {
  const [stats, setStats] = useState<MomentumStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/team/momentum')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MomentumStats | null) => {
        if (!cancelled && data) setStats(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return null

  const quiet =
    stats.kpEarned === 0 &&
    stats.sourcesReviewed === 0 &&
    stats.logsWritten === 0 &&
    stats.datasetsAdded === 0 &&
    stats.pointsAdded === 0 &&
    stats.daysToNextFair === null
  if (quiet) return null

  return (
    <div
      data-testid="momentum-card"
      className="momentum-card w-[min(260px,80vw)] bg-[#0d1b2e] text-white border-[3px] border-[#2a3048] rounded-[4px] shadow-[0_0_0_3px_#10131f,0_10px_28px_rgba(0,0,0,0.5)] overflow-hidden"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b-[3px] border-[#2a3048] bg-[#0f1320]">
        <span className="font-pixel text-[9px] text-[#F5C518] flex items-center gap-1.5">
          <TrendingUp size={11} className="text-[#F5C518]" />
          THIS WEEK
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          data-testid="momentum-card-dismiss"
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={12} />
        </button>
      </header>

      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <StatRow label="KP EARNED" value={stats.kpEarned.toLocaleString()} accent />
        <StatRow label="SOURCES" value={stats.sourcesReviewed} />
        <StatRow label="LOGS" value={stats.logsWritten} />
        <StatRow label="DATASETS" value={stats.datasetsAdded} />
        <StatRow label="DATA POINTS" value={stats.pointsAdded} />
        {stats.daysToNextFair != null && stats.nextFairName != null && (
          <StatRow
            label="NEXT FAIR"
            value={`${fairWhen(stats.daysToNextFair)} · ${stats.nextFairName}`}
          />
        )}
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-pixel text-[7px] text-[#7ff2e3] whitespace-nowrap">{label}</span>
      <span
        className={`font-pixel text-[9px] text-right truncate ${accent ? 'text-[#F5C518]' : 'text-white'}`}
      >
        {value}
      </span>
    </div>
  )
}
