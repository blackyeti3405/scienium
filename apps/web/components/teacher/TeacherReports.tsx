'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { PHASE_INFO, PHASE_ORDER, type Phase } from '@/lib/phase'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'
import { PrintButton } from '@/components/showcase/PrintButton'
import { TeacherPanelState } from './TeacherPanelState'

// Code-split (PERF-10): recharts is ~100KB and only these two bar charts use it,
// so the chart module loads on demand instead of riding in the eager bundle.
const ReportBarChart = dynamic(
  () => import('./ReportBarChart').then((m) => m.ReportBarChart),
  {
    ssr: false,
    loading: () => <PixelSkeleton variant="box" h="h-[220px]" w="w-full" />,
  },
)

interface ProficiencyRow {
  teamId: string
  teamName: string
  papersMastered: number
  papersInProgress: number
  avgBestScore: number
}

interface PacingRow {
  teamId: string
  teamName: string
  phase: string
  daysInPhase: number
}

interface KpBucket {
  label: string
  count: number
}

interface ReportsResponse {
  hasClasses: boolean
  classCount: number
  studentCount: number
  teamCount: number
  phaseCounts: Record<string, number>
  kpDistribution: KpBucket[]
  proficiency: ProficiencyRow[]
  pacing: PacingRow[]
  generatedAt: string
}

const BAR_COLOR = '#F5C518'

export function TeacherReports() {
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/teacher/reports')
      .then((r) => {
        if (!r.ok) throw new Error('reports fetch failed')
        return r.json() as Promise<ReportsResponse>
      })
      .then((res) => setData(res))
      .catch(() => setLoadError('Could not load your reports. Try refreshing the page.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || loadError) {
    return <TeacherPanelState loading={loading} error={loadError} skeletonRows={4} />
  }

  if (!data || data.hasClasses === false || data.studentCount === 0) {
    return (
      <div className="max-w-6xl mx-auto tr-report">
        <div className="border border-dashed border-white/10 rounded-lg py-12 text-center">
          <p className="text-sm text-white/30">
            No class data yet — share a class code so students can join.
          </p>
        </div>
      </div>
    )
  }

  const phaseChartData = PHASE_ORDER.map((p) => ({
    phase: p,
    label: PHASE_INFO[p].label,
    count: data.phaseCounts[p] ?? 0,
  }))

  const maxAvgScore = Math.max(1, ...data.proficiency.map((p) => p.avgBestScore))
  const maxDaysInPhase = Math.max(1, ...data.pacing.map((p) => p.daysInPhase))

  return (
    <div className="max-w-6xl mx-auto space-y-8 tr-report">
      {/* Summary row — the page header (eyebrow + <h1>) lives in page.tsx, this
          is the report-specific summary line + print action underneath it. */}
      <div className="flex items-start justify-between gap-4">
        <p data-testid="report-summary" className="text-sm text-white/50">
          {data.studentCount} students · {data.teamCount} teams · {data.classCount} classes
        </p>
        <div data-print-hide>
          <PrintButton />
        </div>
      </div>

      {/* Phase distribution */}
      <section
        data-testid="report-phase-distribution"
        className="border border-white/10 bg-[#0a1628] rounded-lg p-4 space-y-3"
      >
        <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
          Phase distribution
        </h2>
        <ReportBarChart data={phaseChartData} xKey="label" barColor={BAR_COLOR} />
      </section>

      {/* Proficiency heat-map */}
      <section
        data-testid="report-proficiency-heatmap"
        className="border border-white/10 bg-[#0a1628] rounded-lg p-4 space-y-3"
      >
        <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
          Proficiency by team
        </h2>
        {data.proficiency.length === 0 ? (
          <p className="text-sm text-white/30">No proficiency data yet.</p>
        ) : (
          <table className="w-full text-sm text-white/80 border-collapse">
            <thead>
              <tr className="font-pixel text-[8px] text-white/35 uppercase">
                <th className="text-left py-1.5 px-2">Team</th>
                <th className="text-right py-1.5 px-2">Distinct papers mastered</th>
                <th className="text-right py-1.5 px-2">Distinct papers in progress</th>
                <th className="text-right py-1.5 px-2">Avg best score</th>
              </tr>
            </thead>
            <tbody>
              {data.proficiency.map((row) => {
                const intensity = maxAvgScore > 0 ? row.avgBestScore / maxAvgScore : 0
                return (
                  <tr
                    key={row.teamId}
                    data-testid="report-proficiency-row"
                    className="border-t border-white/5"
                    style={{ backgroundColor: `rgba(245, 197, 24, ${(intensity * 0.35).toFixed(2)})` }}
                  >
                    <td className="py-1.5 px-2 text-white">{row.teamName}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.papersMastered}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.papersInProgress}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.avgBestScore}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* KP distribution */}
      <section
        data-testid="report-kp-distribution"
        className="border border-white/10 bg-[#0a1628] rounded-lg p-4 space-y-3"
      >
        <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
          KP distribution
        </h2>
        <ReportBarChart data={data.kpDistribution} xKey="label" barColor="#4FD1C5" />
      </section>

      {/* Phase pacing */}
      <section
        data-testid="report-pacing"
        className="border border-white/10 bg-[#0a1628] rounded-lg p-4 space-y-3"
      >
        <h2 className="font-pixel text-[10px] text-[#F5C518] uppercase tracking-widest">
          Days in current phase
        </h2>
        {data.pacing.length === 0 ? (
          <p className="text-sm text-white/30">No teams yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.pacing.map((row) => {
              const width = maxDaysInPhase > 0 ? (row.daysInPhase / maxDaysInPhase) * 100 : 0
              const phaseInfo = PHASE_INFO[row.phase as Phase]
              return (
                <li
                  key={row.teamId}
                  data-testid="report-pacing-row"
                  className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3"
                >
                  <span className="text-sm text-white truncate">{row.teamName}</span>
                  <span className="h-4 bg-white/5 rounded-sm overflow-hidden">
                    <span
                      className="block h-full bg-[#F5C518]"
                      style={{ width: `${Math.max(width, 4)}%` }}
                    />
                  </span>
                  <span className="text-sm text-white/60 text-right tabular-nums">
                    {row.daysInPhase}d · {phaseInfo?.label ?? row.phase}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
