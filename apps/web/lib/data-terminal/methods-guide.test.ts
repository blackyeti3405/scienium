import { describe, it, expect } from 'vitest'
import { METHODS, METHOD_CATEGORIES, filterMethods } from '@/content/data-terminal/methods-guide'
import { describeGuideIntegrity } from '@/test/helpers/guide-integrity'

// ---------------------------------------------------------------------------
// Content shape invariants. The assertions shared with the other six authored
// guides live in test/helpers/guide-integrity.ts; what stays below is what is
// true of the METHODS guide alone.
// ---------------------------------------------------------------------------

describeGuideIntegrity('METHODS', METHODS, {
  categoryField: 'category',
  categories: METHOD_CATEGORIES,
  requiredFields: ['title', 'category', 'definition', 'whenToUse', 'workedExample', 'pitfall'],
  minEntries: 45,
})

describe('METHODS content shape', () => {
  it('every designTable is a non-empty array of { label, value } with both non-empty', () => {
    for (const m of METHODS) {
      expect(Array.isArray(m.designTable)).toBe(true)
      expect(m.designTable.length).toBeGreaterThan(0)
      for (const d of m.designTable) {
        expect(d.label.trim().length).toBeGreaterThan(0)
        expect(d.value.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('fieldRef, when present, is a non-empty string', () => {
    for (const m of METHODS) {
      if (m.fieldRef !== undefined) {
        expect(typeof m.fieldRef).toBe('string')
        expect(m.fieldRef.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('METHOD_CATEGORIES has no duplicates and is sorted alphabetically', () => {
    expect(new Set(METHOD_CATEGORIES).size).toBe(METHOD_CATEGORIES.length)
    const sorted = [...METHOD_CATEGORIES].sort((a, b) => a.localeCompare(b))
    expect(METHOD_CATEGORIES).toEqual(sorted)
  })
})

// ---------------------------------------------------------------------------
// filterMethods
// ---------------------------------------------------------------------------

describe('filterMethods', () => {
  it('returns all methods when query is blank and category is null', () => {
    expect(filterMethods('', null)).toHaveLength(METHODS.length)
  })

  it('narrows by a case-insensitive title substring match', () => {
    const result = filterMethods('control', null)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(METHODS.length)
  })

  it('matches regardless of query case', () => {
    const lower = filterMethods('blind', null)
    const upper = filterMethods('BLIND', null)
    expect(upper.map((m) => m.id)).toEqual(lower.map((m) => m.id))
  })

  it('narrows by an exact category filter', () => {
    const category = METHOD_CATEGORIES[0]
    const result = filterMethods('', category)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((m) => m.category === category)).toBe(true)
  })

  it('composes query and category with AND semantics', () => {
    const category = METHOD_CATEGORIES[0]
    const withCategory = filterMethods('', category)
    const combined = filterMethods(withCategory[0].title, category)
    expect(combined.some((m) => m.id === withCategory[0].id)).toBe(true)
    expect(combined.every((m) => m.category === category)).toBe(true)
  })

  it('returns an empty list for a category with no matching query', () => {
    const result = filterMethods('zzzzznonsense', METHOD_CATEGORIES[0])
    expect(result).toHaveLength(0)
  })

  it('a blank/whitespace-only query behaves like "no query"', () => {
    const result = filterMethods('   ', null)
    expect(result).toHaveLength(METHODS.length)
  })

  it('returns an empty list for a nonsense query', () => {
    const result = filterMethods('zzzzznonsenseterm', null)
    expect(result).toHaveLength(0)
  })
})
