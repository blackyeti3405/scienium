import { describe, it, expect } from 'vitest'
import { PLOTS, PLOT_CATEGORIES, filterPlots } from '@/content/data-terminal/plot-guide'
import { describeGuideIntegrity } from '@/test/helpers/guide-integrity'

// ---------------------------------------------------------------------------
// Content shape invariants. The assertions shared with the other six authored
// guides live in test/helpers/guide-integrity.ts; what stays below is what is
// true of the PLOT guide alone.
// ---------------------------------------------------------------------------

describeGuideIntegrity('PLOTS', PLOTS, {
  categoryField: 'category',
  categories: PLOT_CATEGORIES,
  requiredFields: ['title', 'category', 'description', 'whenToUse'],
  minEntries: 45,
})

describe('PLOTS content shape', () => {
  it('every dataNeeded is a non-empty array of { name, unit } with both non-empty', () => {
    for (const p of PLOTS) {
      expect(Array.isArray(p.dataNeeded)).toBe(true)
      expect(p.dataNeeded.length).toBeGreaterThan(0)
      for (const d of p.dataNeeded) {
        expect(d.name.trim().length).toBeGreaterThan(0)
        expect(d.unit.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every exampleSvg starts with <svg and contains no <script', () => {
    for (const p of PLOTS) {
      expect(p.exampleSvg.trim().startsWith('<svg')).toBe(true)
      expect(p.exampleSvg).not.toContain('<script')
    }
  })

  it('PLOT_CATEGORIES has no duplicates and is sorted alphabetically', () => {
    expect(new Set(PLOT_CATEGORIES).size).toBe(PLOT_CATEGORIES.length)
    const sorted = [...PLOT_CATEGORIES].sort((a, b) => a.localeCompare(b))
    expect(PLOT_CATEGORIES).toEqual(sorted)
  })
})

// ---------------------------------------------------------------------------
// filterPlots
// ---------------------------------------------------------------------------

describe('filterPlots', () => {
  it('returns all plots when query is blank and category is null', () => {
    expect(filterPlots('', null)).toHaveLength(PLOTS.length)
  })

  it('narrows by a case-insensitive title substring match', () => {
    const result = filterPlots('bar', null)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(PLOTS.length)
  })

  it('matches regardless of query case', () => {
    const lower = filterPlots('scatter', null)
    const upper = filterPlots('SCATTER', null)
    expect(upper.map((p) => p.id)).toEqual(lower.map((p) => p.id))
  })

  it('narrows by an exact category filter', () => {
    const category = PLOT_CATEGORIES[0]
    const result = filterPlots('', category)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((p) => p.category === category)).toBe(true)
  })

  it('composes query and category with AND semantics', () => {
    const category = PLOT_CATEGORIES[0]
    const withCategory = filterPlots('', category)
    const combined = filterPlots(withCategory[0].title, category)
    expect(combined.some((p) => p.id === withCategory[0].id)).toBe(true)
    expect(combined.every((p) => p.category === category)).toBe(true)
  })

  it('returns an empty list for a category with no matching query', () => {
    const result = filterPlots('zzzzznonsense', PLOT_CATEGORIES[0])
    expect(result).toHaveLength(0)
  })

  it('a blank/whitespace-only query behaves like "no query"', () => {
    const result = filterPlots('   ', null)
    expect(result).toHaveLength(PLOTS.length)
  })

  it('returns an empty list for a nonsense query', () => {
    const result = filterPlots('zzzzznonsenseterm', null)
    expect(result).toHaveLength(0)
  })
})
