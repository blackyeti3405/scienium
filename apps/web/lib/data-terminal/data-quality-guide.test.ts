import { describe, it, expect } from 'vitest'
import {
  DATA_QUALITY_GUIDE,
  DQ_CATEGORIES,
  filterDataQualityConcepts,
} from '@/content/data-terminal/data-quality-guide'
import { describeGuideIntegrity } from '@/test/helpers/guide-integrity'

// ---------------------------------------------------------------------------
// Content shape invariants. The assertions shared with the other six authored
// guides live in test/helpers/guide-integrity.ts; what stays below is what is
// true of the DATA QUALITY guide alone.
// ---------------------------------------------------------------------------

describeGuideIntegrity('DATA_QUALITY_GUIDE', DATA_QUALITY_GUIDE, {
  categoryField: 'category',
  categories: DQ_CATEGORIES.map((c) => c.key),
  requiredFields: [
    'title', 'whenToUse', 'definition', 'formula',
    'datasetCsv', 'code', 'datasetNote', 'output', 'caveat',
  ],
  proseFields: ['definition'],
  minEntries: 36,
})

describe('DATA_QUALITY_GUIDE content shape', () => {
  it('every entry has a formulaBreakdown with at least 2 decoded terms, each with non-empty term + meaning', () => {
    for (const c of DATA_QUALITY_GUIDE) {
      expect(c.formulaBreakdown.length).toBeGreaterThanOrEqual(2)
      for (const { term, meaning } of c.formulaBreakdown) {
        expect(term.trim().length).toBeGreaterThan(0)
        expect(meaning.trim().length).toBeGreaterThan(0)
      }
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
