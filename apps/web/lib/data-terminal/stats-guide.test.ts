import { describe, it, expect } from 'vitest'
import { STATS_GUIDE, STAT_CATEGORIES, filterConcepts } from '@/lib/data-terminal/stats-guide'
import type { StatCategory } from '@/lib/data-terminal/stats-guide'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the 25-item authored guide
// stays well-formed as it's edited over time.
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set<StatCategory>(STAT_CATEGORIES.map((c) => c.key))
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('STATS_GUIDE content shape', () => {
  it('has exactly 65 entries', () => {
    expect(STATS_GUIDE).toHaveLength(65)
  })

  it('every id is unique', () => {
    const ids = STATS_GUIDE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const c of STATS_GUIDE) {
      expect(c.id).toMatch(SLUG_RE)
    }
  })

  it('every category is one of STAT_CATEGORIES', () => {
    for (const c of STATS_GUIDE) {
      expect(VALID_CATEGORIES.has(c.category)).toBe(true)
    }
  })

  it('every entry has non-empty definition, formula, datasetCsv, code, datasetNote, output, and caveat', () => {
    for (const c of STATS_GUIDE) {
      expect(c.definition.trim().length).toBeGreaterThan(0)
      expect(c.formula.trim().length).toBeGreaterThan(0)
      expect(c.datasetCsv.trim().length).toBeGreaterThan(0)
      expect(c.code.trim().length).toBeGreaterThan(0)
      expect(c.datasetNote.trim().length).toBeGreaterThan(0)
      expect(c.output.trim().length).toBeGreaterThan(0)
      expect(c.caveat.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a formulaBreakdown with at least 2 decoded terms, each with non-empty term + meaning', () => {
    for (const c of STATS_GUIDE) {
      expect(c.formulaBreakdown.length).toBeGreaterThanOrEqual(2)
      for (const { term, meaning } of c.formulaBreakdown) {
        expect(term.trim().length).toBeGreaterThan(0)
        expect(meaning.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every definition is genuinely detailed (2+ sentences), not a one-line tooltip', () => {
    for (const c of STATS_GUIDE) {
      // Split on sentence-ending punctuation followed by a space/end — a crude
      // but effective guard that `definition` grew into real prose, not a
      // single terse sentence.
      const sentenceCount = c.definition.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
      expect(sentenceCount).toBeGreaterThanOrEqual(2)
    }
  })

  it('every datasetCsv has a header row plus at least one data row', () => {
    for (const c of STATS_GUIDE) {
      const lines = c.datasetCsv.split('\n').map((l) => l.trim()).filter(Boolean)
      expect(lines.length).toBeGreaterThanOrEqual(2)
      // header row and every data row use the same comma-separated column count
      const columnCount = lines[0].split(',').length
      for (const line of lines) {
        expect(line.split(',').length).toBe(columnCount)
      }
    }
  })

  it('every code snippet embeds its own datasetCsv verbatim (the shown data and the loaded data visibly correspond)', () => {
    for (const c of STATS_GUIDE) {
      expect(c.code).toContain(c.datasetCsv)
    }
  })

  it('every output shows more than just a final number — it includes intermediate computation', () => {
    for (const c of STATS_GUIDE) {
      // A step-by-step walkthrough prints multiple lines; a bare final-answer
      // print would be a single line. This is the "process, not just the
      // result" invariant.
      const lines = c.output.split('\n').filter((l) => l.trim().length > 0)
      expect(lines.length).toBeGreaterThan(1)
    }
  })

  it('every entry has a non-empty title and whenToUse', () => {
    for (const c of STATS_GUIDE) {
      expect(c.title.trim().length).toBeGreaterThan(0)
      expect(c.whenToUse.trim().length).toBeGreaterThan(0)
    }
  })

  it('every code snippet contains at least one import and one print(', () => {
    for (const c of STATS_GUIDE) {
      expect(c.code).toContain('import')
      expect(c.code).toContain('print(')
    }
  })

  it('each of the 10 categories is represented at least once', () => {
    for (const cat of STAT_CATEGORIES) {
      const count = STATS_GUIDE.filter((c) => c.category === cat.key).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('includes all five user-named concepts (p-value, AUC, F1, q-values, beta values)', () => {
    const ids = new Set(STATS_GUIDE.map((c) => c.id))
    expect(ids.has('p-value')).toBe(true)
    expect(ids.has('auc-roc')).toBe(true)
    expect(ids.has('f1-score')).toBe(true)
    expect(ids.has('q-value-fdr')).toBe(true)
    expect(ids.has('beta-coefficients')).toBe(true)
  })

  it('includes the new categories introduced by the F13/F14 content regeneration', () => {
    const keys = new Set(STAT_CATEGORIES.map((c) => c.key))
    for (const key of ['nonparametric-tests', 'regression-diagnostics', 'epidemiology', 'bayesian', 'agreement']) {
      expect(keys.has(key as (typeof STAT_CATEGORIES)[number]['key'])).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// filterConcepts
// ---------------------------------------------------------------------------

describe('filterConcepts', () => {
  it('returns all concepts when no query or category is given', () => {
    expect(filterConcepts(STATS_GUIDE, {})).toHaveLength(STATS_GUIDE.length)
  })

  it('narrows by a case-insensitive title substring match', () => {
    const result = filterConcepts(STATS_GUIDE, { query: 'auc' })
    expect(result.some((c) => c.id === 'auc-roc')).toBe(true)
    expect(result.length).toBeLessThan(STATS_GUIDE.length)
  })

  it('matches regardless of query case', () => {
    const lower = filterConcepts(STATS_GUIDE, { query: 'p-value' })
    const upper = filterConcepts(STATS_GUIDE, { query: 'P-VALUE' })
    expect(upper.map((c) => c.id)).toEqual(lower.map((c) => c.id))
  })

  it('matches against aliases, not just the title', () => {
    const result = filterConcepts(STATS_GUIDE, { query: 'benjamini' })
    expect(result.some((c) => c.id === 'q-value-fdr')).toBe(true)
  })

  it('narrows by category', () => {
    const result = filterConcepts(STATS_GUIDE, { category: 'classification-metrics' })
    expect(result).toHaveLength(7)
    expect(result.every((c) => c.category === 'classification-metrics')).toBe(true)
  })

  it('composes query and category with AND semantics', () => {
    // "f1_score" (the alias, underscored) is unique to the f1-score entry —
    // unlike the bare substring "f1", which now also appears in other
    // entries' prose (e.g. Matthews correlation coefficient, harmonic mean).
    const result = filterConcepts(STATS_GUIDE, { query: 'f1_score', category: 'classification-metrics' })
    expect(result.map((c) => c.id)).toEqual(['f1-score'])
  })

  it('returns an empty list for a category that has no matching query', () => {
    const result = filterConcepts(STATS_GUIDE, { query: 'f1_score', category: 'descriptive' })
    expect(result).toHaveLength(0)
  })

  it('a null category behaves like "no category filter"', () => {
    const result = filterConcepts(STATS_GUIDE, { category: null })
    expect(result).toHaveLength(STATS_GUIDE.length)
  })

  it('a blank/whitespace-only query behaves like "no query"', () => {
    const result = filterConcepts(STATS_GUIDE, { query: '   ' })
    expect(result).toHaveLength(STATS_GUIDE.length)
  })

  it('returns an empty list for a nonsense query', () => {
    const result = filterConcepts(STATS_GUIDE, { query: 'zzzzz' })
    expect(result).toHaveLength(0)
  })
})
