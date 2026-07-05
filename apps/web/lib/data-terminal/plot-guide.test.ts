import { describe, it, expect } from 'vitest'
import { PLOTS, PLOT_CATEGORIES, filterPlots } from '@/lib/data-terminal/plot-guide'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the assembled 45-item plot
// guide stays well-formed as it's edited over time. Mirrors stats-guide.test.ts.
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set(PLOT_CATEGORIES)
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('PLOTS content shape', () => {
  it('has exactly 45 entries', () => {
    expect(PLOTS).toHaveLength(45)
  })

  it('every id is unique', () => {
    const ids = PLOTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const p of PLOTS) {
      expect(p.id).toMatch(SLUG_RE)
    }
  })

  it('every category is one of PLOT_CATEGORIES', () => {
    for (const p of PLOTS) {
      expect(VALID_CATEGORIES.has(p.category)).toBe(true)
    }
  })

  it('every entry has non-empty title, category, description, and whenToUse', () => {
    for (const p of PLOTS) {
      expect(p.title.trim().length).toBeGreaterThan(0)
      expect(p.category.trim().length).toBeGreaterThan(0)
      expect(p.description.trim().length).toBeGreaterThan(0)
      expect(p.whenToUse.trim().length).toBeGreaterThan(0)
    }
  })

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

  it('every category that appears in PLOTS is represented in PLOT_CATEGORIES and vice versa', () => {
    const categoriesInData = new Set(PLOTS.map((p) => p.category))
    expect(categoriesInData.size).toBe(PLOT_CATEGORIES.length)
    for (const c of PLOT_CATEGORIES) {
      expect(categoriesInData.has(c)).toBe(true)
    }
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
