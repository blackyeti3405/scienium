'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { CHART_FIELDS, loadChartField, filterCharts } from '@/lib/data-terminal/charts-guide'
import type { ChartConcept } from '@/lib/data-terminal/charts-guide'
import { recipeToDataset } from '@/lib/data-terminal/recipe'
import { createDataset } from './data-terminal/datasets-api'
import { ApiError } from '@/lib/api/client'
import { BusyButton } from '@/components/ui/BusyButton'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
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
export function ChartsGuidePanel({
  onStartRecipe,
}: {
  /**
   * "Start from this recipe" — creates a dataset pre-shaped from the concept's
   * `dataNeeded` and hands its id back so the Data Terminal can open it. Absent
   * when the panel is rendered without a dataset host (it simply hides the
   * action then).
   */
  onStartRecipe?: (datasetId: string) => void
} = {}) {
  const [field, setField] = useState<string>(CHART_FIELDS[0]?.slug ?? '')
  const [query, setQuery] = useState('')
  const [charts, setCharts] = useState<ChartConcept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, toggle, collapseAll] = useToggleSet<string>()

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

  return (
    <div data-testid="charts-guide" className="flex flex-col gap-3">
      {/* Field dropdown */}
      <GuideSelect
        data-testid="charts-guide-field-select"
        value={field}
        onChange={(value) => {
          setField(value)
          collapseAll()
        }}
      >
        {CHART_FIELDS.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.label} ({f.count})
          </option>
        ))}
      </GuideSelect>

      {/* Search */}
      <GuideSearchInput
        data-testid="charts-guide-search"
        value={query}
        onChange={setQuery}
        placeholder="Search chart types in this field…"
      />

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <PixelSpinner size="md" tone="chrome" />
          <span className="font-pixel text-[8px] text-white/40">Loading field…</span>
        </div>
      ) : error ? (
        <div className="border border-dashed border-red-400/25 py-10 text-center">
          <span className="font-pixel text-[8px] text-red-400/70">{error}</span>
        </div>
      ) : (
        <>
          {/* Result count */}
          <GuideResultCount data-testid="charts-guide-count">
            Showing {filtered.length} of {charts.length}
          </GuideResultCount>

          {/* Boxes / empty state */}
          {filtered.length === 0 ? (
            <GuideEmptyState data-testid="charts-guide-empty">
              No charts match — try another term.
            </GuideEmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((chart) => (
                <ChartBox
                  key={chart.id}
                  chart={chart}
                  isExpanded={expanded.has(chart.id)}
                  onToggle={() => toggle(chart.id)}
                  onStartRecipe={onStartRecipe}
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
  onStartRecipe,
}: {
  chart: ChartConcept
  isExpanded: boolean
  onToggle: () => void
  onStartRecipe?: (datasetId: string) => void
}) {
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  async function start() {
    if (starting || !onStartRecipe) return
    setStarting(true)
    setStartError(null)
    try {
      const { dataset } = await createDataset(recipeToDataset(chart))
      onStartRecipe(dataset.id)
    } catch (err) {
      // Datasets unlock at the Working phase; a 403 there is expected, not a bug.
      setStartError(
        err instanceof ApiError && err.status === 403
          ? 'Datasets unlock at the Working phase — come back once you start collecting data.'
          : err instanceof ApiError
            ? err.message
            : 'Could not start a dataset from this recipe.',
      )
      setStarting(false)
    }
  }

  return (
    <GuideBox
      testId={`chart-box-${chart.id}`}
      title={chart.title}
      badge={chart.field}
      summary={chart.plotType}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {onStartRecipe && (
        <div>
          <BusyButton
            busy={starting}
            showSpinner={false}
            onClick={start}
            className="dt-btn dt-btn--primary"
            data-testid={`chart-box-${chart.id}-start-recipe`}
          >
            <Sparkles size={12} /> Start from this recipe
          </BusyButton>
          <p className="text-xs text-white/40 leading-relaxed mt-1.5">
            Creates a new dataset with these columns ready to fill in.
          </p>
          {startError && (
            <p
              className="text-xs text-red-400/80 leading-relaxed mt-1"
              data-testid={`chart-box-${chart.id}-start-error`}
            >
              {startError}
            </p>
          )}
        </div>
      )}

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
    </GuideBox>
  )
}
