'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown, Copy, Check } from 'lucide-react'
import { STATS_GUIDE, STAT_CATEGORIES, filterConcepts } from '@/lib/data-terminal/stats-guide'
import type { StatCategory, StatConcept } from '@/lib/data-terminal/stats-guide'

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () => filterConcepts(STATS_GUIDE, { query, category }),
    [query, category],
  )

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div data-testid="stats-guide" className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          data-testid="stats-guide-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stats concepts…"
          className="w-full bg-[#0a1628] border border-white/15 text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/25"
        />
      </div>

      {/* Category dropdown */}
      <div className="ops-select-wrap">
        <select
          data-testid="stats-guide-category-select"
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value === '' ? null : (e.target.value as StatCategory))}
          className="ops-select"
        >
          <option value="">All categories</option>
          {STAT_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="ops-select-icon" />
      </div>

      {/* Result count */}
      <span data-testid="stats-guide-count" className="font-pixel text-[7px] text-white/35 uppercase tracking-widest">
        {filtered.length} concept{filtered.length === 1 ? '' : 's'}
      </span>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <div data-testid="stats-guide-empty" className="border border-dashed border-white/15 py-10 text-center">
          <span className="font-pixel text-[8px] text-white/30">
            No concepts match — try another term.
          </span>
        </div>
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
  const [copied, setCopied] = useState(false)

  async function copyCode(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(concept.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <li data-testid={`stat-box-${concept.id}`} className="border border-white/10 bg-[#0a1628]">
      <button
        type="button"
        data-testid={`stat-box-${concept.id}-header`}
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
            <span className="font-pixel text-[9px] text-white">{concept.title}</span>
            <span className="font-pixel text-[6px] text-[#F5C518] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] px-1.5 py-0.5">
              {CATEGORY_LABEL[concept.category]}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1 leading-snug">{concept.definition}</p>
        </div>
      </button>

      {isExpanded && (
        <div data-testid={`stat-box-${concept.id}-body`} className="px-3 pb-3.5 pl-9 flex flex-col gap-3 border-t border-white/5 pt-3">
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
                className="inline-flex items-center gap-1 font-pixel text-[6px] text-white/35 hover:text-[#F5C518] transition-colors"
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
              <span className="font-pixel text-[6px] text-white/35 uppercase tracking-widest mr-1.5">Caveat</span>
              {concept.caveat}
            </p>
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

// ─── CSV data table ─────────────────────────────────────────────────────────

/**
 * Renders `csv` (comma-separated, header row first — matches every
 * `datasetCsv` in `stats-guide.ts`) as an actual `<table>`, distinct from the
 * code/output `<pre>` blocks, so the sample data reads as a genuine data
 * table rather than more monospace text. Labeled "THE DATA" per the box's
 * pixel chrome; cell contents use a regular monospace body font, matching
 * the plan's "regular font for content" rule.
 */
function CsvTable({ csv, 'data-testid': testId }: { csv: string; 'data-testid': string }) {
  const rows = useMemo(
    () =>
      csv
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.split(',')),
    [csv],
  )
  const [header, ...body] = rows

  return (
    <div data-testid={testId} className="stats-guide-csv">
      <div className="stats-guide-csv__label font-pixel">The data</div>
      <div className="stats-guide-csv__scroll">
        <table className="stats-guide-csv__table">
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th key={i}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
