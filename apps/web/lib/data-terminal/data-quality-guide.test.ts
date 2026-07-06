import { describe, it, expect } from 'vitest'
import {
  DATA_QUALITY_GUIDE,
  DQ_CATEGORIES,
  filterDataQualityConcepts,
} from '@/lib/data-terminal/data-quality-guide'
import type { DataQualityCategory } from '@/lib/data-terminal/data-quality-guide'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the 36-item authored guide
// stays well-formed as it's edited over time. Mirrors stats-guide.test.ts.
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set<DataQualityCategory>(DQ_CATEGORIES.map((c) => c.key))
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('DATA_QUALITY_GUIDE content shape', () => {
  it('has exactly 36 entries', () => {
    expect(DATA_QUALITY_GUIDE).toHaveLength(36)
  })

  it('every id is unique', () => {
    const ids = DATA_QUALITY_GUIDE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.id).toMatch(SLUG_RE)
    }
  })

  it('every category is one of DQ_CATEGORIES', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(VALID_CATEGORIES.has(c.category)).toBe(true)
    }
  })

  it('each of the 4 categories is represented at least once', () => {
    for (const cat of DQ_CATEGORIES) {
      const count = DATA_QUALITY_GUIDE.filter((c) => c.category === cat.key).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('has exactly 4 categories', () => {
    expect(DQ_CATEGORIES).toHaveLength(4)
  })

  it('every entry has non-empty definition, formula, datasetCsv, code, datasetNote, output, and caveat', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.definition.trim().length).toBeGreaterThan(0)
      expect(c.formula.trim().length).toBeGreaterThan(0)
      expect(c.datasetCsv.trim().length).toBeGreaterThan(0)
      expect(c.code.trim().length).toBeGreaterThan(0)
      expect(c.datasetNote.trim().length).toBeGreaterThan(0)
      expect(c.output.trim().length).toBeGreaterThan(0)
      expect(c.caveat.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a non-empty title and whenToUse', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.title.trim().length).toBeGreaterThan(0)
      expect(c.whenToUse.trim().length).toBeGreaterThan(0)
    }
  })

  it('every entry has a formulaBreakdown with at least 2 decoded terms, each with non-empty term + meaning', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.formulaBreakdown.length).toBeGreaterThanOrEqual(2)
      for (const { term, meaning } of c.formulaBreakdown) {
        expect(term.trim().length).toBeGreaterThan(0)
        expect(meaning.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every definition is genuinely detailed (2+ sentences), not a one-line tooltip', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      const sentenceCount = c.definition.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
      expect(sentenceCount).toBeGreaterThanOrEqual(2)
    }
  })

  it('every datasetCsv has a header row plus at least one data row, with a consistent column count', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      const lines = c.datasetCsv.split('\n').map((l) => l.trim()).filter(Boolean)
      expect(lines.length).toBeGreaterThanOrEqual(2)
      const columnCount = lines[0].split(',').length
      for (const line of lines) {
        expect(line.split(',').length).toBe(columnCount)
      }
    }
  })

  it('every code snippet embeds its own datasetCsv verbatim (the shown data and the loaded data visibly correspond)', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.code).toContain(c.datasetCsv)
    }
  })

  it('every code snippet contains at least one import and one print(', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.code).toContain('import')
      expect(c.code).toContain('print(')
    }
  })

  it('every output shows more than just a final number — it includes intermediate computation', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      const lines = c.output.split('\n').filter((l) => l.trim().length > 0)
      expect(lines.length).toBeGreaterThan(1)
    }
  })

  it('every methodology-pitfalls outlier concept cross-references the Stats Guide instead of re-deriving the IQR fence math', () => {
    const outlierPolicy = DATA_QUALITY_GUIDE.find((c) => c.id === 'outlier-removal-policy-ethics')
    expect(outlierPolicy).toBeDefined()
    expect(outlierPolicy!.definition + outlierPolicy!.caveat).toMatch(/IQR/i)
    // Must not re-derive the fence computation itself (quartiles/percentile
    // math lives only in stats-guide.ts's iqr-outliers entry) — a prose
    // mention of the 1.5xIQR convention in a comment is fine, computing Q1/Q3
    // here is not.
    expect(outlierPolicy!.code).not.toContain('percentile')
    expect(outlierPolicy!.code).not.toContain('q1')
    expect(outlierPolicy!.code).not.toContain('q3')
  })

  it('the multiple-comparisons-fishing entry cross-references the Stats Guide q-value-fdr entry by name', () => {
    const fishing = DATA_QUALITY_GUIDE.find((c) => c.id === 'multiple-comparisons-fishing')
    expect(fishing).toBeDefined()
    expect(fishing!.definition + fishing!.output).toMatch(/Benjamini/i)
  })

  it('does not stray into F3 Methods Guide territory (no dedicated sample-size/power concept)', () => {
    const ids = new Set(DATA_QUALITY_GUIDE.map((c) => c.id))
    expect(ids.has('sample-size')).toBe(false)
    expect(ids.has('statistical-power')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// filterDataQualityConcepts
// ---------------------------------------------------------------------------

describe('filterDataQualityConcepts', () => {
  it('returns all concepts when no query or category is given', () => {
    expect(filterDataQualityConcepts(DATA_QUALITY_GUIDE, {})).toHaveLength(DATA_QUALITY_GUIDE.length)
  })

  it('narrows by a case-insensitive title substring match', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: 'propagation' })
    expect(result.some((c) => c.id === 'propagation-add-subtract')).toBe(true)
    expect(result.length).toBeLessThan(DATA_QUALITY_GUIDE.length)
  })

  it('matches regardless of query case', () => {
    const lower = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: 'sig fig' })
    const upper = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: 'SIG FIG' })
    expect(upper.map((c) => c.id)).toEqual(lower.map((c) => c.id))
  })

  it('matches against aliases, not just the title', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: 'p-hacking' })
    expect(result.some((c) => c.id === 'outlier-removal-policy-ethics')).toBe(true)
  })

  it('narrows by category', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { category: 'methodology-pitfalls' })
    expect(result).toHaveLength(9)
    expect(result.every((c) => c.category === 'methodology-pitfalls')).toBe(true)
  })

  it('composes query and category with AND semantics', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, {
      query: 'harking',
      category: 'methodology-pitfalls',
    })
    expect(result.map((c) => c.id)).toEqual(['harking'])
  })

  it('returns an empty list for a category that has no matching query', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, {
      query: 'harking',
      category: 'units-sigfigs',
    })
    expect(result).toHaveLength(0)
  })

  it('a null category behaves like "no category filter"', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { category: null })
    expect(result).toHaveLength(DATA_QUALITY_GUIDE.length)
  })

  it('a blank/whitespace-only query behaves like "no query"', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: '   ' })
    expect(result).toHaveLength(DATA_QUALITY_GUIDE.length)
  })

  it('returns an empty list for a nonsense query', () => {
    const result = filterDataQualityConcepts(DATA_QUALITY_GUIDE, { query: 'zzzzz' })
    expect(result).toHaveLength(0)
  })
})
