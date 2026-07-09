'use client'

import { useMemo, useState } from 'react'
import { PLOTS, PLOT_CATEGORIES, filterPlots } from '@/content/data-terminal/plot-guide'
import type { PlotConcept } from '@/content/data-terminal/plot-guide'
import { useToggleSet } from '@/lib/hooks/useToggleSet'
import {
  SectionLabel,
  GuideSearchInput,
  GuideSelect,
  GuideResultCount,
  GuideEmptyState,
  GuideBox,
} from './guide-chrome'

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
  const [expanded, toggle] = useToggleSet<string>()

  const filtered = useMemo(() => filterPlots(query, category), [query, category])

  return (
    <div data-testid="plot-guide" className="flex flex-col gap-3">
      {/* Category dropdown */}
      <GuideSelect
        data-testid="plot-guide-category-select"
        value={category ?? ''}
        onChange={(value) => setCategory(value === '' ? null : value)}
      >
        <option value="">All categories</option>
        {PLOT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </GuideSelect>

      {/* Search */}
      <GuideSearchInput
        data-testid="plot-guide-search"
        value={query}
        onChange={setQuery}
        placeholder="Search plot types…"
      />

      {/* Result count */}
      <GuideResultCount data-testid="plot-guide-count">
        Showing {filtered.length} of {PLOTS.length}
      </GuideResultCount>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <GuideEmptyState data-testid="plot-guide-empty">
          No plots match — try another term.
        </GuideEmptyState>
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
    <GuideBox
      testId={`plot-box-${plot.id}`}
      title={plot.title}
      badge={plot.category}
      summary={plot.description}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
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
    </GuideBox>
  )
}
