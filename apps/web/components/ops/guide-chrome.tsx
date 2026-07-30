'use client'

import { useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

/**
 * Shared pixel chrome for the guide panels (Stats, Charts, Plot, Methods,
 * Data Quality, Research Guide) — the search input, category select, result
 * count, dashed empty state, collapsible FAQ box, and the SectionLabel/
 * CsvTable pieces every panel had been re-declaring privately. Purely
 * presentational: markup and class strings are byte-for-byte what the panels
 * rendered before extraction, so panel testids and screenshots are
 * unaffected. Each panel keeps its own layout order, copy, and filter call.
 */

/**
 * Copy-to-clipboard state for a "Copy" button — clears the "Copied" state
 * after 1.5s.
 *
 * `navigator.clipboard.writeText` rejects on an insecure context (no
 * `Clipboard` object at all — the optional chaining below then short-circuits
 * before `.writeText` is even called) and when the user/browser denies the
 * permission (the promise itself rejects). Both used to be swallowed with no
 * caller-visible signal at all: a click that silently did nothing, with no
 * way to tell "it worked" from "it didn't". `error` surfaces that failure so
 * a caller can show it instead of leaving the student/teacher guessing.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function copy(text: string) {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setError(null)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy — copy it manually.')
    }
  }
  return { copied, copy, error }
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-pixel text-[6px] text-white/40 uppercase tracking-widest mb-1">{children}</p>
  )
}

/** The pl-9 search input with the inset magnifier icon. */
export function GuideSearchInput({
  'data-testid': testId,
  value,
  onChange,
  placeholder,
}: {
  'data-testid': string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
      <input
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0a1628] border border-white/15 text-white text-sm pl-9 pr-3 py-2.5 outline-none focus:border-[#F5C518]/60 placeholder:text-white/40"
      />
    </div>
  )
}

/**
 * The `ops-select` dropdown with its chevron. Children are the `<option>`s —
 * panels differ on whether an "All categories" blank option leads the list.
 */
export function GuideSelect({
  'data-testid': testId,
  value,
  onChange,
  children,
}: {
  'data-testid': string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="ops-select-wrap">
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ops-select"
      >
        {children}
      </select>
      <ChevronDown size={13} className="ops-select-icon" />
    </div>
  )
}

/** Result-count line; the count copy varies per panel, so it's children. */
export function GuideResultCount({
  'data-testid': testId,
  children,
}: {
  'data-testid': string
  children: React.ReactNode
}) {
  return (
    <span data-testid={testId} className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
      {children}
    </span>
  )
}

/** Dashed "no matches" placeholder shown in place of the box list. */
export function GuideEmptyState({
  'data-testid': testId,
  children,
}: {
  'data-testid': string
  children: React.ReactNode
}) {
  return (
    <div data-testid={testId} className="border border-dashed border-white/15 py-10 text-center">
      <span className="font-pixel text-[8px] text-white/40">{children}</span>
    </div>
  )
}

/**
 * One collapsible FAQ box: chevron header with title + gold category badge +
 * one-line summary, and an expand-only body. `testId` is the box's base
 * testid (e.g. `stat-box-<id>`); the header and body derive `-header` /
 * `-body` from it, matching every panel's existing convention. Children are
 * the expanded body sections and mount only while expanded — exactly the
 * `isExpanded &&` guard the panels used.
 */
export function GuideBox({
  testId,
  title,
  badge,
  summary,
  isExpanded,
  onToggle,
  children,
}: {
  testId: string
  title: React.ReactNode
  badge: React.ReactNode
  summary: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <li data-testid={testId} className="border border-white/10 bg-[#0a1628]">
      <button
        type="button"
        data-testid={`${testId}-header`}
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <ChevronDown
          size={13}
          className={`shrink-0 mt-0.5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-pixel text-[9px] text-white">{title}</span>
            <span className="font-pixel text-[6px] text-[#F5C518] uppercase tracking-widest border border-[#F5C518]/30 bg-[#F5C518]/[0.08] px-1.5 py-0.5">
              {badge}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-1 leading-snug">{summary}</p>
        </div>
      </button>

      {isExpanded && (
        <div data-testid={`${testId}-body`} className="px-3 pb-3.5 pl-9 flex flex-col gap-3 border-t border-white/5 pt-3">
          {children}
        </div>
      )}
    </li>
  )
}

// ─── CSV data table ─────────────────────────────────────────────────────────

/**
 * Renders `csv` (comma-separated, header row first — matches every
 * `datasetCsv` in `stats-guide.ts` and `data-quality-guide.ts`) as an actual
 * `<table>`, distinct from the code/output `<pre>` blocks, so the sample data
 * reads as a genuine data table rather than more monospace text. Labeled
 * "THE DATA" per the box's pixel chrome; cell contents use a regular
 * monospace body font, matching the plan's "regular font for content" rule.
 */
export function CsvTable({ csv, 'data-testid': testId }: { csv: string; 'data-testid': string }) {
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
