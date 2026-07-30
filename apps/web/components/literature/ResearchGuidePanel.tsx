'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, X, BookOpen, ListOrdered } from 'lucide-react'
import {
  RESEARCH_GLOSSARY,
  GLOSSARY_CATEGORIES,
  filterTerms,
  PAPER_ANATOMY,
  READING_ORDER,
} from '@/lib/literature/research-guide'
import type { GlossaryCategory, GlossaryTerm } from '@/lib/literature/research-guide'
import { useToggleSet } from '@/lib/hooks/useToggleSet'
import {
  SectionLabel,
  GuideSearchInput,
  GuideResultCount,
  GuideEmptyState,
  GuideBox,
} from '@/components/ops/guide-chrome'

const CATEGORY_LABEL: Record<GlossaryCategory, string> = Object.fromEntries(
  GLOSSARY_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<GlossaryCategory, string>

type GuideView = 'glossary' | 'anatomy'

/**
 * Literature Review "Research Guide" — a full-screen sub-view (mirroring
 * `CitationsPanel`) offering a static, authored research-literacy reference:
 * a 70-term vocabulary glossary and an 8-section "anatomy of a paper"
 * reference with a non-linear reading-order strategy. Fully static/
 * client-side — reads only from `lib/literature/research-guide.ts`, no data
 * fetching, no persistence, no LLM call.
 */
export function ResearchGuidePanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<GuideView>('glossary')

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[#F5C518]" />
          <h2 className="font-pixel text-[10px] text-white">Research Guide</h2>
        </div>
        <div className="flex items-center gap-4">
          {/* Sub-nav */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="research-guide-nav-glossary"
              onClick={() => setView('glossary')}
              className={`font-pixel text-[7px] px-2.5 py-1.5 rounded-sm transition-colors ${
                view === 'glossary'
                  ? 'bg-[#F5C518] text-[#0d1b2e]'
                  : 'text-white/45 hover:text-white/80 border border-white/15'
              }`}
            >
              Glossary
            </button>
            <button
              type="button"
              data-testid="research-guide-nav-anatomy"
              onClick={() => setView('anatomy')}
              className={`font-pixel text-[7px] px-2.5 py-1.5 rounded-sm transition-colors ${
                view === 'anatomy'
                  ? 'bg-[#F5C518] text-[#0d1b2e]'
                  : 'text-white/45 hover:text-white/80 border border-white/15'
              }`}
            >
              Anatomy of a Paper
            </button>
          </div>
          <button onClick={onClose} aria-label="Close Research Guide" className="text-white/40 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {view === 'glossary' ? <GlossaryView /> : <AnatomyView />}
      </div>
    </div>
  )
}

// ─── Glossary view ──────────────────────────────────────────────────────────

function GlossaryView() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GlossaryCategory | null>(null)
  const [expanded, toggle] = useToggleSet<string>()

  const filtered = useMemo(
    () => filterTerms(RESEARCH_GLOSSARY, { query, category }),
    [query, category],
  )

  return (
    <div data-testid="research-glossary" className="flex flex-col gap-3">
      {/* Search */}
      <GuideSearchInput
        data-testid="research-glossary-search"
        value={query}
        onChange={setQuery}
        placeholder="Search research terms…"
      />

      {/* Category dropdown — styled inline (not the ops-select chrome the
          Data Terminal guides share), so it stays local to this panel. */}
      <div className="relative flex w-full">
        <select
          data-testid="research-glossary-category-select"
          value={category ?? ''}
          onChange={(e) =>
            setCategory(e.target.value === '' ? null : (e.target.value as GlossaryCategory))
          }
          className="w-full appearance-none bg-[#0a1628] border border-white/15 text-white text-sm pl-3 pr-8 py-2.5 outline-none focus:border-[#F5C518]/60"
        >
          <option value="">All categories</option>
          {GLOSSARY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
        />
      </div>

      {/* Result count */}
      <GuideResultCount data-testid="research-glossary-count">
        {filtered.length} term{filtered.length === 1 ? '' : 's'}
      </GuideResultCount>

      {/* Boxes / empty state */}
      {filtered.length === 0 ? (
        <GuideEmptyState data-testid="research-glossary-empty">
          No terms match — try another search.
        </GuideEmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((term) => (
            <TermBox
              key={term.id}
              term={term}
              isExpanded={expanded.has(term.id)}
              onToggle={() => toggle(term.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function TermBox({
  term,
  isExpanded,
  onToggle,
}: {
  term: GlossaryTerm
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <GuideBox
      testId={`glossary-term-${term.id}`}
      title={term.term}
      badge={CATEGORY_LABEL[term.category]}
      summary={term.definition}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <SectionLabel>In context</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{term.example}</p>
      </div>
      <div>
        <SectionLabel>Why it matters</SectionLabel>
        <p className="text-sm text-white/70 leading-relaxed">{term.whyItMatters}</p>
      </div>
    </GuideBox>
  )
}

// ─── Anatomy view ───────────────────────────────────────────────────────────

function AnatomyView() {
  return (
    <div data-testid="paper-anatomy" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {PAPER_ANATOMY.map((section) => (
          <li
            key={section.id}
            data-testid={`anatomy-section-${section.id}`}
            className="border border-white/10 bg-[#0a1628] px-4 py-3.5 flex flex-col gap-2.5"
          >
            <span className="font-pixel text-[9px] text-[#F5C518]">{section.name}</span>
            <div>
              <SectionLabel>Purpose</SectionLabel>
              <p className="text-sm text-white/70 leading-relaxed">{section.purpose}</p>
            </div>
            <div>
              <SectionLabel>What to look for</SectionLabel>
              <p className="text-sm text-white/70 leading-relaxed">{section.whatToLookFor}</p>
            </div>
            <div>
              <SectionLabel>Reading strategy</SectionLabel>
              <p className="text-sm text-white/70 leading-relaxed">{section.readingStrategyNote}</p>
            </div>
            <div>
              <SectionLabel>Engineering vs. science</SectionLabel>
              <p className="text-sm text-white/70 leading-relaxed">{section.variantNote}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Reading order strategy */}
      <div className="border border-[#F5C518]/25 bg-[#F5C518]/[0.05] px-4 py-3.5">
        <div className="flex items-center gap-2 mb-3">
          <ListOrdered size={12} className="text-[#F5C518]" />
          <span className="font-pixel text-[8px] text-[#F5C518]">
            How to actually read a paper (non-linear order)
          </span>
        </div>
        <ol data-testid="reading-order" className="flex flex-col gap-2.5">
          {READING_ORDER.map((step) => {
            const section = PAPER_ANATOMY.find((s) => s.id === step.sectionId)
            return (
              <li key={step.step} className="flex items-baseline gap-2.5">
                <span className="font-pixel text-[9px] text-[#F5C518] shrink-0">{step.step}.</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-pixel text-[7px] text-white/80 uppercase tracking-widest">
                    {section?.name ?? step.sectionId}
                  </span>
                  <p className="text-sm text-white/60 leading-relaxed">{step.why}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
