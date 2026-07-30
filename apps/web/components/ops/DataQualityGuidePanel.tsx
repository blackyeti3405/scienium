'use client'

import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  DATA_QUALITY_GUIDE,
  DQ_CATEGORIES,
  filterDataQualityConcepts,
} from '@/content/data-terminal/data-quality-guide'
import type { DataQualityCategory, DataQualityConcept } from '@/content/data-terminal/data-quality-guide'
import { useToggleSet } from '@/lib/hooks/useToggleSet'
import {
  SectionLabel,
  CsvTable,
  GuideSearchInput,
  GuideSelect,
  GuideResultCount,
  GuideEmptyState,
  GuideBox,
  useCopyToClipboard,
} from './guide-chrome'

const CATEGORY_LABEL: Record<DataQualityCategory, string> = Object.fromEntries(
  DQ_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<DataQualityCategory, string>

/**
 * Data Terminal "Data Quality" sub-tab (Feature F4) — a searchable,
 * category-selected library of 36 authored concepts covering everything
 * AFTER data is collected: measurement uncertainty & error propagation, sig
 * figs & unit discipline, data cleaning, and methodology pitfalls. Fully
 * static/client-side: reads only from `lib/data-terminal/data-quality-guide.ts`,
 * no data fetching, no persistence. Mounted by `DataTerminalTab` ABOVE the
 * phase-gate early returns so it renders in every phase (see that file's
 * header comment for why). Mirrors `StatsGuidePanel` box-for-box, reusing
 * the same `stats-guide-*` pixel-chrome CSS classes.
 */
export function DataQualityGuidePanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DataQualityCategory | null>(null)
  const [expanded, toggle] = useToggleSet<string>()

  const filtered = useMemo(
    () => filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query, category }),
    [query, category],
  )

  return (
    <div data-testid="data-quality-guide" className="flex flex-col gap-3">
      {/* Search */}
      <GuideSearchInput
        data-testid="data-quality-guide-search"
        value={query}
        onChange={setQuery}
        placeholder="Search data quality concepts…"
      />

      {/* Category dropdown */}
      <GuideSelect
        data-testid="data-quality-guide-category-select"
        value={category ?? ''}
        onChange={(value) => setCategory(value === '' ? null : (value as DataQualityCategory))}
      >
        <option value="">All categories</option>
        {DQ_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </GuideSelect>

      {/* Result count */}
      <GuideResultCount data-testid="data-quality-guide-count">
        {filtered.length} concept{filtered.length === 1 ? '' : 's'}
      </GuideResultCount>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <GuideEmptyState data-testid="data-quality-guide-empty">
          No concepts match — try another term.
        </GuideEmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((concept) => (
            <DqBox
              key={concept.id}
              concept={concept}
              isExpanded={expanded.has(concept.id)}
              onToggle={() => toggle(concept.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── FAQ box ─────────────────────────────────────────────────────────────────

function DqBox({
  concept,
  isExpanded,
  onToggle,
}: {
  concept: DataQualityConcept
  isExpanded: boolean
  onToggle: () => void
}) {
  const { copied, copy } = useCopyToClipboard()

  async function copyCode(e: React.MouseEvent) {
    e.stopPropagation()
    await copy(concept.code)
  }

  return (
    <GuideBox
      testId={`dq-box-${concept.id}`}
      title={concept.title}
      badge={CATEGORY_LABEL[concept.category]}
      summary={concept.definition}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <SectionLabel>When to use it</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{concept.whenToUse}</p>
      </div>

      <div>
        <SectionLabel>The formula</SectionLabel>
        <div
          data-testid={`dq-box-${concept.id}-formula`}
          className="stats-guide-formula"
        >
          {concept.formula}
        </div>
      </div>

      <div>
        <SectionLabel>What each part means</SectionLabel>
        <dl data-testid={`dq-box-${concept.id}-breakdown`} className="stats-guide-breakdown">
          {concept.formulaBreakdown.map((term, i) => (
            <div key={i} className="stats-guide-breakdown__row">
              <dt className="stats-guide-breakdown__term">{term.term}</dt>
              <dd className="stats-guide-breakdown__meaning">{term.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="text-sm text-white/70 leading-relaxed mb-1.5">{concept.datasetNote}</p>
        <CsvTable data-testid={`dq-box-${concept.id}-csv`} csv={concept.datasetCsv} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Python — computed step by step</SectionLabel>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 font-pixel text-[6px] text-white/40 hover:text-[#F5C518] transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre
          data-testid={`dq-box-${concept.id}-code`}
          className="stats-guide-code text-[12px] text-[#c8e6ff] leading-relaxed"
        >
          <code>{concept.code}</code>
        </pre>
      </div>

      <div>
        <SectionLabel>Result (including every intermediate step)</SectionLabel>
        <pre className="stats-guide-code stats-guide-code--output text-[12px] text-[#9AE6B4] leading-relaxed">
          <code>{concept.output}</code>
        </pre>
        <p className="text-sm text-white/60 leading-relaxed mt-2">
          <span className="font-pixel text-[6px] text-white/40 uppercase tracking-widest mr-1.5">Caveat</span>
          {concept.caveat}
        </p>
      </div>
    </GuideBox>
  )
}
