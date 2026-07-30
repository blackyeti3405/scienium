import { describe, it, expect } from 'vitest'
import {
  ABSTRACT_STRUCTURE,
  ABSTRACT_DONT_INCLUDE,
  ABSTRACT_EXAMPLES,
} from '@/lib/fairs/abstract-guide'
import { ISEF_CATEGORIES } from '@/lib/fairs/categories'
import { ABSTRACT_WORD_MAX, wordCount } from '@/lib/showcase'
import { describeGuideIntegrity } from '@/test/helpers/guide-integrity'

// ---------------------------------------------------------------------------
// Content shape invariants. The assertions shared with the other six authored
// guides live in test/helpers/guide-integrity.ts; what stays below is what is
// true of the ABSTRACT guide alone.
// ---------------------------------------------------------------------------

describeGuideIntegrity('ABSTRACT_STRUCTURE', ABSTRACT_STRUCTURE, {
  requiredFields: ['guidance', 'commonMistake'],
  proseFields: ['guidance'],
  minEntries: 5,
})

describeGuideIntegrity('ABSTRACT_DONT_INCLUDE', ABSTRACT_DONT_INCLUDE, {
  requiredFields: ['rule', 'why'],
  minEntries: 6,
})

describeGuideIntegrity('ABSTRACT_EXAMPLES', ABSTRACT_EXAMPLES, {
  requiredFields: ['title', 'body', 'critique'],
  proseFields: ['critique'],
  minEntries: 3,
})

describe('ABSTRACT_STRUCTURE content shape', () => {
  it('ids equal the 5 role slugs in order', () => {
    expect(ABSTRACT_STRUCTURE.map((s) => s.id)).toEqual([
      'purpose',
      'problem-hypothesis',
      'procedure',
      'results',
      'significance',
    ])
  })

  it('every entry has at least 2 non-empty sentenceStarters', () => {
    for (const s of ABSTRACT_STRUCTURE) {
      expect(s.sentenceStarters.length).toBeGreaterThanOrEqual(2)
      for (const starter of s.sentenceStarters) {
        expect(starter.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('ABSTRACT_DONT_INCLUDE content shape', () => {
  it('includes an acknowledgments rule', () => {
    expect(ABSTRACT_DONT_INCLUDE.some((d) => /acknowledg/i.test(d.rule) || /acknowledg/i.test(d.why))).toBe(true)
  })

  it('includes an external-endorsements rule', () => {
    expect(ABSTRACT_DONT_INCLUDE.some((d) => /endors/i.test(d.rule) || /endors/i.test(d.why))).toBe(true)
  })
})

describe('ABSTRACT_EXAMPLES content shape', () => {
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

})
