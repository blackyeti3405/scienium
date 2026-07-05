'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { PLOTS, PLOT_CATEGORIES, filterPlots } from '@/lib/data-terminal/plot-guide'
import type { PlotConcept } from '@/lib/data-terminal/plot-guide'

/**
 * Data Terminal "Plot Guide" sub-tab (Feature F14, regenerated content) — a
 * searchable, category-selected library of 45 authored general
 * statistical-plot reference boxes. Fully static/client-side: reads only
 * from `lib/data-terminal/plot-guide.ts`, no data fetching, no persistence.
 * Only 45 entries, so unlike the Charts Guide this stays one eager module —
 * the category dropdown here is a pure client-side filter, not a lazy load.
 * Mounted by `DataTerminalTab` ABOVE the phase-gate early returns so it
 * renders in every phase — mirrors `StatsGuidePanel` (F12) and
 * `ChartsGuidePanel` (F13).
 */
export function PlotGuidePanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => filterPlots(query, category), [query, category])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div data-testid="plot-guide" className="flex flex-col gap-3">
      {/* Category dropdown */}
      <div className="ops-select-wrap">
        <select
          data-testid="plot-guide-category-select"
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value === '' ? null : e.target.value)}
          className="ops-select"
        >
          <option value="">All categories</option>
          {PLOT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="ops-select-icon" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          data-testid="plot-guide-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plot types…"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
      </div>

      {/* Result count */}
      <span data-testid="plot-guide-count" className="font-pixel text-[7px] text-white/35 uppercase tracking-widest">
        Showing {filtered.length} of {PLOTS.length}
      </span>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <div data-testid="plot-guide-empty" className="border border-dashed border-white/15 py-10 text-center">
          <span className="font-pixel text-[8px] text-white/30">
            No plots match — try another term.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((plot) => (
            <PlotBox
              key={plot.id}
              plot={plot}
              isExpanded={expanded.has(plot.id)}
              onToggle={() => toggle(plot.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Plot box ────────────────────────────────────────────────────────────────

function PlotBox({
  plot,
  isExpanded,
  onToggle,
}: {
  plot: PlotConcept
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <li data-testid={`plot-box-${plot.id}`} className="border border-white/10 bg-[#0a1628]">
      <button
        type="button"
        data-testid={`plot-box-${plot.id}-header`}
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
            <span className="font-pixel text-[9px] text-white">{plot.title}</span>
            <span className="font-pixel text-[6px] text-[#F5C518] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] px-1.5 py-0.5">
              {plot.category}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1 leading-snug">{plot.description}</p>
        </div>
      </button>

      {isExpanded && (
        <div data-testid={`plot-box-${plot.id}-body`} className="px-3 pb-3.5 pl-9 flex flex-col gap-3 border-t border-white/5 pt-3">
          <div>
            <SectionLabel>Example</SectionLabel>
            <div
              data-testid={`plot-box-${plot.id}-svg`}
              className="plot-guide-svg"
              // exampleSvg is a static, build-time authored SVG string (no
              // <script>), matplotlib-rendered — trusted content, guarded by
              // plot-guide.test.ts's no-<script> invariant.
              dangerouslySetInnerHTML={{ __html: plot.exampleSvg }}
            />
          </div>

          <div>
            <SectionLabel>When to use it</SectionLabel>
            <p className="text-sm text-white/70 leading-relaxed">{plot.whenToUse}</p>
          </div>

          <div>
            <SectionLabel>Data needed</SectionLabel>
            <ul data-testid={`plot-box-${plot.id}-data-needed`} className="plot-guide-data-needed">
              {plot.dataNeeded.map((d, i) => (
                <li key={i}>
                  <b>{d.name}</b> — {d.unit}
                </li>
              ))}
            </ul>
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
