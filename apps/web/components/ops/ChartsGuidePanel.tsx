'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown, Loader2 } from 'lucide-react'
import { CHART_FIELDS, loadChartField, filterCharts } from '@/lib/data-terminal/charts-guide'
import type { ChartConcept } from '@/lib/data-terminal/charts-guide'

/**
 * Data Terminal "Charts Guide" sub-tab (Feature F13, regenerated content) —
 * a searchable, field-selected library of 250 authored chart-type reference
 * boxes spread across 29 science-fair fields. Fully static/client-side, but
 * NOT one eager module: each field's charts live in their own lazily
 * imported module (`lib/data-terminal/charts/<slug>.ts`, ~20KB of inline SVG
 * per chart), fetched on demand via `loadChartField` when the field dropdown
 * changes — otherwise all 250 charts (~5MB) would ship on every Data
 * Terminal load. Mounted by `DataTerminalTab` ABOVE the phase-gate early
 * returns so it renders in every phase — mirrors `StatsGuidePanel` (F12).
 */
export function ChartsGuidePanel() {
  const [field, setField] = useState<string>(CHART_FIELDS[0]?.slug ?? '')
  const [query, setQuery] = useState('')
  const [charts, setCharts] = useState<ChartConcept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!field) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadChartField(field)
      .then((data) => {
        if (cancelled) return
        setCharts(data)
      })
      .catch(() => {
        if (cancelled) return
        setError('Could not load this field — try another one.')
        setCharts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [field])

  const filtered = useMemo(() => filterCharts(charts, query), [charts, query])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div data-testid="charts-guide" className="flex flex-col gap-3">
      {/* Field dropdown */}
      <div className="ops-select-wrap">
        <select
          data-testid="charts-guide-field-select"
          value={field}
          onChange={(e) => {
            setField(e.target.value)
            setExpanded(new Set())
          }}
          className="ops-select"
        >
          {CHART_FIELDS.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.label} ({f.count})
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="ops-select-icon" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          data-testid="charts-guide-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chart types in this field…"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="animate-spin text-white/30" size={16} />
          <span className="font-pixel text-[8px] text-white/35">Loading field…</span>
        </div>
      ) : error ? (
        <div className="border border-dashed border-red-400/25 py-10 text-center">
          <span className="font-pixel text-[8px] text-red-400/70">{error}</span>
        </div>
      ) : (
        <>
          {/* Result count */}
          <span data-testid="charts-guide-count" className="font-pixel text-[7px] text-white/35 uppercase tracking-widest">
            Showing {filtered.length} of {charts.length}
          </span>

          {/* Boxes / empty state */}
          {filtered.length === 0 ? (
            <div data-testid="charts-guide-empty" className="border border-dashed border-white/15 py-10 text-center">
              <span className="font-pixel text-[8px] text-white/30">
                No charts match — try another term.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((chart) => (
                <ChartBox
                  key={chart.id}
                  chart={chart}
                  isExpanded={expanded.has(chart.id)}
                  onToggle={() => toggle(chart.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

// ─── Chart box ───────────────────────────────────────────────────────────────

function ChartBox({
  chart,
  isExpanded,
  onToggle,
}: {
  chart: ChartConcept
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <li data-testid={`chart-box-${chart.id}`} className="border border-white/10 bg-[#0a1628]">
      <button
        type="button"
        data-testid={`chart-box-${chart.id}-header`}
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <ChevronDown
          size={13}
          className={`shrink-0 mt-0.5 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-pixel text-[9px] text-white">{chart.title}</span>
            <span className="font-pixel text-[6px] text-[#F5C518] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] px-1.5 py-0.5">
              {chart.field}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1 leading-snug">{chart.plotType}</p>
        </div>
      </button>

      {isExpanded && (
        <div data-testid={`chart-box-${chart.id}-body`} className="px-3 pb-3.5 pl-9 flex flex-col gap-3 border-t border-white/5 pt-3">
          <div>
            <SectionLabel>What it is</SectionLabel>
            <p className="text-sm text-white/70 leading-relaxed">{chart.description}</p>
          </div>

          <div>
            <SectionLabel>Example</SectionLabel>
            <div
              data-testid={`chart-box-${chart.id}-svg`}
              className="charts-guide-svg"
              // exampleSvg is a static, build-time authored SVG string (no
              // <script>), matplotlib-rendered — trusted content, guarded by
              // charts-guide.test.ts's no-<script> invariant.
              dangerouslySetInnerHTML={{ __html: chart.exampleSvg }}
            />
          </div>

          <div>
            <SectionLabel>Data needed</SectionLabel>
            <ul data-testid={`chart-box-${chart.id}-data-needed`} className="charts-guide-data-needed">
              {chart.dataNeeded.map((d, i) => (
                <li key={i}>
                  <b>{d.name}</b> — {d.unit}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel>What it tells you</SectionLabel>
            <p className="text-sm text-white/70 leading-relaxed">{chart.whatItTellsYou}</p>
          </div>
        </div>
      )}
    </li>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-pixel text-[6px] text-white/35 uppercase tracking-widest mb-1">{children}</p>
  )
}
