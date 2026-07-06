import { describe, it, expect } from 'vitest'
import {
  RESEARCH_GLOSSARY,
  GLOSSARY_CATEGORIES,
  filterTerms,
  PAPER_ANATOMY,
  READING_ORDER,
} from '@/lib/literature/research-guide'
import type { GlossaryCategory } from '@/lib/literature/research-guide'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the 70-item authored glossary
// and 8-section paper anatomy stay well-formed as they're edited over time.
// Mirrors lib/data-terminal/stats-guide.test.ts.
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set<GlossaryCategory>(GLOSSARY_CATEGORIES.map((c) => c.key))
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('RESEARCH_GLOSSARY content shape', () => {
  it('has exactly 70 entries', () => {
    expect(RESEARCH_GLOSSARY).toHaveLength(70)
  })

  it('every id is unique', () => {
    const ids = RESEARCH_GLOSSARY.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every id is slug-safe (lowercase, digits, single hyphens)', () => {
    for (const t of RESEARCH_GLOSSARY) {
      expect(t.id).toMatch(SLUG_RE)
    }
  })

  it('every category is one of GLOSSARY_CATEGORIES', () => {
    for (const t of RESEARCH_GLOSSARY) {
      expect(VALID_CATEGORIES.has(t.category)).toBe(true)
    }
  })

  it('each of the 6 categories is represented at least once', () => {
    for (const cat of GLOSSARY_CATEGORIES) {
      const count = RESEARCH_GLOSSARY.filter((t) => t.category === cat.key).length
      expect(count).toBeGreaterThan(0)
    }
  })

  it('every term has non-empty term, definition, example, and whyItMatters', () => {
    for (const t of RESEARCH_GLOSSARY) {
      expect(t.term.trim().length).toBeGreaterThan(0)
      expect(t.definition.trim().length).toBeGreaterThan(0)
      expect(t.example.trim().length).toBeGreaterThan(0)
      expect(t.whyItMatters.trim().length).toBeGreaterThan(0)
    }
  })

  it('every definition is genuinely detailed (2+ sentences), not a one-line tooltip', () => {
    for (const t of RESEARCH_GLOSSARY) {
      const sentenceCount = t.definition
        .split(/[.!?]+(?:\s|$)/)
        .filter((s) => s.trim().length > 0).length
      expect(sentenceCount).toBeGreaterThanOrEqual(2)
    }
  })

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
  it('has exactly 8 entries', () => {
    expect(PAPER_ANATOMY).toHaveLength(8)
  })

  it('every id is unique and slug-safe', () => {
    const ids = PAPER_ANATOMY.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(SLUG_RE)
    }
  })

  it('every section has non-empty name, purpose, whatToLookFor, readingStrategyNote, and variantNote', () => {
    for (const s of PAPER_ANATOMY) {
      expect(s.name.trim().length).toBeGreaterThan(0)
      expect(s.purpose.trim().length).toBeGreaterThan(0)
      expect(s.whatToLookFor.trim().length).toBeGreaterThan(0)
      expect(s.readingStrategyNote.trim().length).toBeGreaterThan(0)
      expect(s.variantNote.trim().length).toBeGreaterThan(0)
    }
  })

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
