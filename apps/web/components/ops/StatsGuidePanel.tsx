'use client'

import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { STATS_GUIDE, STAT_CATEGORIES, filterConcepts } from '@/content/data-terminal/stats-guide'
import type { StatCategory, StatConcept } from '@/content/data-terminal/stats-guide'
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

const CATEGORY_LABEL: Record<StatCategory, string> = Object.fromEntries(
  STAT_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<StatCategory, string>

/**
 * Data Terminal "Stats Guide" sub-tab (Feature F12, extended with 40
 * regenerated concepts for F13/F14) — a searchable, category-selected
 * library of 65 authored statistics FAQ boxes. Fully static/client-side:
 * reads only from `lib/data-terminal/stats-guide.ts`, no data fetching, no
 * persistence. Mounted by `DataTerminalTab` ABOVE the phase-gate early
 * returns so it renders in every phase (see that file's header comment for
 * why).
 */
export function StatsGuidePanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<StatCategory | null>(null)
  const [expanded, toggle] = useToggleSet<string>()

  const filtered = useMemo(
    () => filterConcepts(STATS_GUIDE, { query, category }),
    [query, category],
  )

  return (
    <div data-testid="stats-guide" className="flex flex-col gap-3">
      {/* Search */}
      <GuideSearchInput
        data-testid="stats-guide-search"
        value={query}
        onChange={setQuery}
        placeholder="Search stats concepts…"
      />

      {/* Category dropdown */}
      <GuideSelect
        data-testid="stats-guide-category-select"
        value={category ?? ''}
        onChange={(value) => setCategory(value === '' ? null : (value as StatCategory))}
      >
        <option value="">All categories</option>
        {STAT_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </GuideSelect>

      {/* Result count */}
      <GuideResultCount data-testid="stats-guide-count">
        {filtered.length} concept{filtered.length === 1 ? '' : 's'}
      </GuideResultCount>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <GuideEmptyState data-testid="stats-guide-empty">
          No concepts match — try another term.
        </GuideEmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((concept) => (
            <StatBox
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

function StatBox({
  concept,
  isExpanded,
  onToggle,
}: {
  concept: StatConcept
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
      testId={`stat-box-${concept.id}`}
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
          data-testid={`stat-box-${concept.id}-formula`}
          className="stats-guide-formula"
        >
          {concept.formula}
        </div>
      </div>

      <div>
        <SectionLabel>What each part means</SectionLabel>
        <dl data-testid={`stat-box-${concept.id}-breakdown`} className="stats-guide-breakdown">
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
        <CsvTable data-testid={`stat-box-${concept.id}-csv`} csv={concept.datasetCsv} />
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
          data-testid={`stat-box-${concept.id}-code`}
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
