'use client'

import { useMemo, useState } from 'react'
import { METHODS, METHOD_CATEGORIES, filterMethods } from '@/content/data-terminal/methods-guide'
import type { MethodConcept } from '@/content/data-terminal/methods-guide'
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
 * Data Terminal "Methods Guide" sub-tab (Feature F3) — a searchable,
 * category-selected library of ~40 authored experimental-design reference
 * boxes (hypothesis framing, IV/DV/controls, blinding/randomization,
 * replication/sample-size planning, confounds, instrument choice). Fully
 * static/client-side: reads only from `lib/data-terminal/methods-guide.ts`,
 * no data fetching, no persistence. One eager module, same as Stats Guide
 * (F12) and Plot Guide (F14) — the category dropdown here is a pure
 * client-side filter, not a lazy load. Mounted by `DataTerminalTab` ABOVE the
 * phase-gate early returns so it renders in every phase — mirrors
 * `PlotGuidePanel` (F14).
 */
export function MethodsGuidePanel() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [expanded, toggle] = useToggleSet<string>()

  const filtered = useMemo(() => filterMethods(query, category), [query, category])

  return (
    <div data-testid="methods-guide" className="flex flex-col gap-3">
      {/* Category dropdown */}
      <GuideSelect
        data-testid="methods-guide-category-select"
        value={category ?? ''}
        onChange={(value) => setCategory(value === '' ? null : value)}
      >
        <option value="">All categories</option>
        {METHOD_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </GuideSelect>

      {/* Search */}
      <GuideSearchInput
        data-testid="methods-guide-search"
        value={query}
        onChange={setQuery}
        placeholder="Search methods…"
      />

      {/* Result count */}
      <GuideResultCount data-testid="methods-guide-count">
        Showing {filtered.length} of {METHODS.length}
      </GuideResultCount>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <GuideEmptyState data-testid="methods-guide-empty">
          No methods match — try another term.
        </GuideEmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((method) => (
            <MethodBox
              key={method.id}
              method={method}
              isExpanded={expanded.has(method.id)}
              onToggle={() => toggle(method.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Method box ──────────────────────────────────────────────────────────────

function MethodBox({
  method,
  isExpanded,
  onToggle,
}: {
  method: MethodConcept
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <GuideBox
      testId={`method-box-${method.id}`}
      title={method.title}
      badge={method.category}
      summary={method.definition}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <SectionLabel>When to use it</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{method.whenToUse}</p>
      </div>

      <div>
        <SectionLabel>Worked example</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{method.workedExample}</p>
      </div>

      <div>
        <SectionLabel>Design table</SectionLabel>
        <ul data-testid={`method-box-${method.id}-design-table`} className="plot-guide-data-needed">
          {method.designTable.map((d, i) => (
            <li key={i}>
              <b>{d.label}</b> — {d.value}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <SectionLabel>Watch out for</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{method.pitfall}</p>
      </div>

      {method.fieldRef && (
        <p className="font-pixel text-[6px] text-white/40 uppercase tracking-widest">
          See also: Charts Guide → {method.fieldRef}
        </p>
      )}
    </GuideBox>
  )
}
