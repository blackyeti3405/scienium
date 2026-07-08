import { describe, it, expect } from 'vitest'
import {
  ABSTRACT_STRUCTURE,
  ABSTRACT_DONT_INCLUDE,
  ABSTRACT_EXAMPLES,
} from '@/lib/fairs/abstract-guide'
import { ISEF_CATEGORIES } from '@/lib/fairs/categories'
import { ABSTRACT_WORD_MAX, wordCount } from '@/lib/showcase'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the authored abstract guide
// (structure template, don't-include list, worked examples) stays
// well-formed as it's edited over time. Mirrors research-guide.test.ts.
// ---------------------------------------------------------------------------

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

function sentenceCount(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
}

describe('ABSTRACT_STRUCTURE content shape', () => {
  it('has exactly 5 entries', () => {
    expect(ABSTRACT_STRUCTURE).toHaveLength(5)
  })

  it('ids are unique and slug-safe', () => {
    const ids = ABSTRACT_STRUCTURE.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(SLUG_RE)
    }
  })

  it('ids equal the 5 role slugs in order', () => {
    expect(ABSTRACT_STRUCTURE.map((s) => s.id)).toEqual([
      'purpose',
      'problem-hypothesis',
      'procedure',
      'results',
      'significance',
    ])
  })

  it('every guidance is 2+ sentences', () => {
    for (const s of ABSTRACT_STRUCTURE) {
      expect(sentenceCount(s.guidance)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every entry has at least 2 sentenceStarters and a non-empty commonMistake', () => {
    for (const s of ABSTRACT_STRUCTURE) {
      expect(s.sentenceStarters.length).toBeGreaterThanOrEqual(2)
      for (const starter of s.sentenceStarters) {
        expect(starter.trim().length).toBeGreaterThan(0)
      }
      expect(s.commonMistake.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('ABSTRACT_DONT_INCLUDE content shape', () => {
  it('has at least 6 entries', () => {
    expect(ABSTRACT_DONT_INCLUDE.length).toBeGreaterThanOrEqual(6)
  })

  it('ids are unique and slug-safe', () => {
    const ids = ABSTRACT_DONT_INCLUDE.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(SLUG_RE)
    }
  })

  it('every rule and why is non-empty', () => {
    for (const d of ABSTRACT_DONT_INCLUDE) {
      expect(d.rule.trim().length).toBeGreaterThan(0)
      expect(d.why.trim().length).toBeGreaterThan(0)
    }
  })

  it('includes an acknowledgments rule', () => {
    expect(ABSTRACT_DONT_INCLUDE.some((d) => /acknowledg/i.test(d.rule) || /acknowledg/i.test(d.why))).toBe(true)
  })

  it('includes an external-endorsements rule', () => {
    expect(ABSTRACT_DONT_INCLUDE.some((d) => /endors/i.test(d.rule) || /endors/i.test(d.why))).toBe(true)
  })
})

describe('ABSTRACT_EXAMPLES content shape', () => {
  it('has exactly 3 entries', () => {
    expect(ABSTRACT_EXAMPLES).toHaveLength(3)
  })

  it('ids are unique and slug-safe', () => {
    const ids = ABSTRACT_EXAMPLES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(SLUG_RE)
    }
  })

  it('the 3 categoryCodes are distinct and each exists in ISEF_CATEGORIES', () => {
    const codes = ABSTRACT_EXAMPLES.map((e) => e.categoryCode)
    expect(new Set(codes).size).toBe(codes.length)
    const validCodes = new Set(ISEF_CATEGORIES.map((c) => c.code))
    for (const code of codes) {
      expect(validCodes.has(code)).toBe(true)
    }
  })

  it('each example category label matches its ISEF_CATEGORIES entry', () => {
    for (const e of ABSTRACT_EXAMPLES) {
      const match = ISEF_CATEGORIES.find((c) => c.code === e.categoryCode)
      expect(match?.name).toBe(e.category)
    }
  })

  it('the 3 quality values cover at least strong and weak', () => {
    const qualities = new Set(ABSTRACT_EXAMPLES.map((e) => e.quality))
    expect(qualities.has('strong')).toBe(true)
    expect(qualities.has('weak')).toBe(true)
  })

  it('every body is at or under ABSTRACT_WORD_MAX words', () => {
    for (const e of ABSTRACT_EXAMPLES) {
      expect(wordCount(e.body)).toBeLessThanOrEqual(ABSTRACT_WORD_MAX)
    }
  })

  it('every wordCount field equals wordCount(body)', () => {
    for (const e of ABSTRACT_EXAMPLES) {
      expect(e.wordCount).toBe(wordCount(e.body))
    }
  })

  it('every critique is 2+ sentences', () => {
    for (const e of ABSTRACT_EXAMPLES) {
      expect(sentenceCount(e.critique)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every title and body is non-empty', () => {
    for (const e of ABSTRACT_EXAMPLES) {
      expect(e.title.trim().length).toBeGreaterThan(0)
      expect(e.body.trim().length).toBeGreaterThan(0)
    }
  })
})
