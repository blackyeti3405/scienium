import { describe, it, expect } from 'vitest'
import {
  RESEARCH_GLOSSARY,
  GLOSSARY_CATEGORIES,
  filterTerms,
  PAPER_ANATOMY,
  READING_ORDER,
} from '@/lib/literature/research-guide'
import { describeGuideIntegrity } from '@/test/helpers/guide-integrity'

// ---------------------------------------------------------------------------
// Content shape invariants. The assertions shared with the other six authored
// guides live in test/helpers/guide-integrity.ts; what stays below is what is
// true of the RESEARCH glossary / paper anatomy alone.
// ---------------------------------------------------------------------------

describeGuideIntegrity('RESEARCH_GLOSSARY', RESEARCH_GLOSSARY, {
  categoryField: 'category',
  categories: GLOSSARY_CATEGORIES.map((c) => c.key),
  requiredFields: ['term', 'definition', 'example', 'whyItMatters'],
  proseFields: ['definition'],
  minEntries: 70,
})

describeGuideIntegrity('PAPER_ANATOMY', PAPER_ANATOMY, {
  requiredFields: ['name', 'purpose', 'whatToLookFor', 'readingStrategyNote', 'variantNote'],
  minEntries: 8,
})

describe('RESEARCH_GLOSSARY content shape', () => {
  it('includes all named required terms from the brief', () => {
    const ids = new Set(RESEARCH_GLOSSARY.map((t) => t.id))
    const required = [
      'p-value',
      'control-group',
      'confound',
      'replication',
      'peer-review',
      'preprint',
      'primary-source',
      'secondary-source',
      'meta-analysis',
      'effect-size',
      'correlation-vs-causation',
      'hypothesis-vs-theory',
      'doi',
      'citation-vs-reference',
      'sample-size',
      'blinding',
      'statistical-significance',
      'randomization',
    ]
    for (const id of required) {
      expect(ids.has(id)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// PAPER_ANATOMY + READING_ORDER
// ---------------------------------------------------------------------------

describe('PAPER_ANATOMY content shape', () => {
  it('includes the expected 8 IMRaD-style section names', () => {
    const names = new Set(PAPER_ANATOMY.map((s) => s.name))
    for (const name of [
      'Abstract',
      'Introduction',
      'Methods / Materials',
      'Results',
      'Discussion',
      'Limitations',
      'Conclusion',
      'References',
    ]) {
      expect(names.has(name)).toBe(true)
    }
  })

  it('every READING_ORDER.sectionId references a real PAPER_ANATOMY id', () => {
    const validIds = new Set(PAPER_ANATOMY.map((s) => s.id))
    for (const step of READING_ORDER) {
      expect(validIds.has(step.sectionId)).toBe(true)
    }
  })

  it('READING_ORDER is a non-linear strategy (not simply top-to-bottom anatomy order)', () => {
    const anatomyOrder = PAPER_ANATOMY.map((s) => s.id)
    const readingOrderIds = READING_ORDER.map((s) => s.sectionId)
    expect(readingOrderIds).not.toEqual(anatomyOrder)
  })

  it('every READING_ORDER step has a non-empty why and increasing step numbers', () => {
    READING_ORDER.forEach((step, i) => {
      expect(step.why.trim().length).toBeGreaterThan(0)
      expect(step.step).toBe(i + 1)
    })
  })
})

// ---------------------------------------------------------------------------
// filterTerms
// ---------------------------------------------------------------------------

describe('filterTerms', () => {
  it('returns all terms when no query or category is given', () => {
    expect(filterTerms(RESEARCH_GLOSSARY, {})).toHaveLength(RESEARCH_GLOSSARY.length)
  })

  it('narrows by a case-insensitive term substring match', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: 'p-value' })
    expect(result.some((t) => t.id === 'p-value')).toBe(true)
    expect(result.length).toBeLessThan(RESEARCH_GLOSSARY.length)
  })

  it('matches regardless of query case', () => {
    const lower = filterTerms(RESEARCH_GLOSSARY, { query: 'p-value' })
    const upper = filterTerms(RESEARCH_GLOSSARY, { query: 'P-VALUE' })
    expect(upper.map((t) => t.id)).toEqual(lower.map((t) => t.id))
  })

  it('matches against aliases, not just the term name', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: 'h0' })
    expect(result.some((t) => t.id === 'null-hypothesis')).toBe(true)
  })

  it('narrows by category', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { category: 'citation' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((t) => t.category === 'citation')).toBe(true)
  })

  it('composes query and category with AND semantics', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: 'doi', category: 'citation' })
    expect(result.map((t) => t.id)).toEqual(['doi'])
  })

  it('returns an empty list for a category that has no matching query', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: 'doi', category: 'study-design' })
    expect(result).toHaveLength(0)
  })

  it('a null category behaves like "no category filter"', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { category: null })
    expect(result).toHaveLength(RESEARCH_GLOSSARY.length)
  })

  it('a blank/whitespace-only query behaves like "no query"', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: '   ' })
    expect(result).toHaveLength(RESEARCH_GLOSSARY.length)
  })

  it('returns an empty list for a nonsense query', () => {
    const result = filterTerms(RESEARCH_GLOSSARY, { query: 'zzzzzzz' })
    expect(result).toHaveLength(0)
  })
})
