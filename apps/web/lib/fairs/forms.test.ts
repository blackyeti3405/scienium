import { describe, it, expect } from 'vitest'
import { ISEF_FORMS, ISEF_FORM_GUIDES, getFormGuide } from '@/lib/fairs/forms'
import { HAZARD_CLASSES, getHazardClass } from '@/lib/fairs/safety'
import type { HazardClassKey } from '@/lib/fairs/safety'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the authored forms/guides/
// safety content stays well-formed as it's edited over time (mirrors
// stats-guide.test.ts's pattern for the Data Terminal guides).
// ---------------------------------------------------------------------------

function sentenceCount(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length
}

describe('ISEF_FORMS content shape', () => {
  it('has exactly 12 entries', () => {
    expect(ISEF_FORMS).toHaveLength(12)
  })

  it('every code is unique', () => {
    const codes = ISEF_FORMS.map((f) => f.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every entry has a non-empty name, description, and a non-empty requiredFor array', () => {
    for (const f of ISEF_FORMS) {
      expect(f.name.trim().length).toBeGreaterThan(0)
      expect(f.description.trim().length).toBeGreaterThan(0)
      expect(f.requiredFor.length).toBeGreaterThan(0)
    }
  })
})

describe('ISEF_FORM_GUIDES content shape', () => {
  it('has exactly 12 entries', () => {
    expect(ISEF_FORM_GUIDES).toHaveLength(12)
  })

  it('every code is unique', () => {
    const codes = ISEF_FORM_GUIDES.map((g) => g.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every guide code maps 1:1 to an ISEF_FORMS code and vice-versa', () => {
    const formCodes = new Set(ISEF_FORMS.map((f) => f.code))
    const guideCodes = new Set(ISEF_FORM_GUIDES.map((g) => g.code))
    expect(guideCodes.size).toBe(formCodes.size)
    for (const code of formCodes) {
      expect(guideCodes.has(code)).toBe(true)
    }
    for (const code of guideCodes) {
      expect(formCodes.has(code)).toBe(true)
    }
  })

  it('every whatItIs is genuinely detailed (2+ sentences)', () => {
    for (const g of ISEF_FORM_GUIDES) {
      expect(sentenceCount(g.whatItIs)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every whyItTriggers is genuinely detailed (2+ sentences)', () => {
    for (const g of ISEF_FORM_GUIDES) {
      expect(sentenceCount(g.whyItTriggers)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every whatGoesIn has at least 2 non-empty bullets', () => {
    for (const g of ISEF_FORM_GUIDES) {
      expect(g.whatGoesIn.length).toBeGreaterThanOrEqual(2)
      for (const bullet of g.whatGoesIn) {
        expect(bullet.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every hazardClasses entry is a valid HazardClassKey', () => {
    const validKeys = new Set(HAZARD_CLASSES.map((h) => h.key))
    for (const g of ISEF_FORM_GUIDES) {
      for (const key of g.hazardClasses) {
        expect(validKeys.has(key)).toBe(true)
      }
    }
  })

  it('getFormGuide returns the right entry for a known code and undefined for a bogus code', () => {
    const guide = getFormGuide('Form 1C')
    expect(guide).toBeDefined()
    expect(guide?.whatItIs).toMatch(/Student Research Plan/)
    expect(getFormGuide('Form 99Z')).toBeUndefined()
  })

  it('Form 1C guide describes the Student Research Plan', () => {
    const guide = getFormGuide('Form 1C')
    expect(guide?.whatItIs.toLowerCase()).toContain('student research plan')
  })

  it('Form 3 guide lists naming each hazard, mitigation, and disposal', () => {
    const guide = getFormGuide('Form 3')
    expect(guide).toBeDefined()
    const joined = guide!.whatGoesIn.join(' ').toLowerCase()
    expect(joined).toContain('hazard')
    expect(joined).toMatch(/mitigation/)
    expect(joined).toMatch(/disposal/)
  })

  it('Form 4 guide references human-subjects / informed-consent rationale', () => {
    const guide = getFormGuide('Form 4')
    expect(guide).toBeDefined()
    expect(guide!.whyItTriggers.toLowerCase()).toMatch(/informed consent|human subjects|irb/)
    expect(guide!.hazardClasses).toContain('human-subjects')
  })

  it('Form 5A guide references animal-welfare (species/housing/supervision)', () => {
    const guide = getFormGuide('Form 5A')
    expect(guide).toBeDefined()
    const joined = guide!.whatGoesIn.join(' ').toLowerCase()
    expect(joined).toMatch(/species/)
    expect(joined).toMatch(/housing/)
  })

  it('Form 6A guide references biosafety agent categories (microorganisms/rDNA/tissue)', () => {
    const guide = getFormGuide('Form 6A')
    expect(guide).toBeDefined()
    const joined = guide!.whatGoesIn.join(' ').toLowerCase()
    expect(joined).toMatch(/microorganism/)
    expect(joined).toMatch(/recombinant/)
  })
})

describe('HAZARD_CLASSES content shape', () => {
  it('has exactly 4 entries', () => {
    expect(HAZARD_CLASSES).toHaveLength(4)
  })

  it('keys are exactly chemical, biological, sharp-mechanical, human-subjects with no dupes', () => {
    const keys = HAZARD_CLASSES.map((h) => h.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(keys)).toEqual(
      new Set<HazardClassKey>(['chemical', 'biological', 'sharp-mechanical', 'human-subjects']),
    )
  })

  it('every class has a non-empty label and summary', () => {
    for (const h of HAZARD_CLASSES) {
      expect(h.label.trim().length).toBeGreaterThan(0)
      expect(h.summary.trim().length).toBeGreaterThan(0)
    }
  })

  it('every summary is 2+ sentences', () => {
    for (const h of HAZARD_CLASSES) {
      expect(sentenceCount(h.summary)).toBeGreaterThanOrEqual(2)
    }
  })

  it('every class has at least 2 non-empty bullets in each of ppe/handling/disposal', () => {
    for (const h of HAZARD_CLASSES) {
      for (const list of [h.ppe, h.handling, h.disposal]) {
        expect(list.length).toBeGreaterThanOrEqual(2)
        for (const bullet of list) {
          expect(bullet.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('getHazardClass round-trips a known key and returns undefined for a bogus key', () => {
    const cls = getHazardClass('chemical')
    expect(cls).toBeDefined()
    expect(cls?.key).toBe('chemical')
    expect(getHazardClass('not-a-real-key' as HazardClassKey)).toBeUndefined()
  })
})

describe('cross-module integrity', () => {
  it('every HazardClassKey referenced by any ISEF_FORM_GUIDES[*].hazardClasses exists in HAZARD_CLASSES', () => {
    const validKeys = new Set(HAZARD_CLASSES.map((h) => h.key))
    for (const g of ISEF_FORM_GUIDES) {
      for (const key of g.hazardClasses) {
        expect(validKeys.has(key)).toBe(true)
      }
    }
  })
})
