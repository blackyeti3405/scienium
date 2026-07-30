import { describe, it, expect } from 'vitest'
import { ISEF_EDITION, ISEF_FORMS, getForm, isEditionReviewed } from '@/lib/fairs/forms'
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

describe('ISEF edition catalog', () => {
  it('every code is unique', () => {
    const codes = ISEF_FORMS.map((f) => f.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every entry has a non-empty code and official name', () => {
    for (const f of ISEF_FORMS) {
      expect(f.code.trim()).toMatch(/^Form /)
      expect(f.name.trim().length).toBeGreaterThan(0)
    }
  })

  // REFACTOR2 P0-R4: the previous catalog shipped the 2026 numbering with the
  // wrong titles (Form 1 = "Student Checklist", 1C = "Student Research Plan").
  // Pin the official ISEF 2027 titles for the codes the old mapping got wrong.
  it('carries the official 2027 titles for the previously-wrong codes', () => {
    expect(getForm('Form 1')?.name).toBe('Checklist for Adult Sponsor/Safety Assessment Form')
    expect(getForm('Form 1A')?.name).toBe('Student Checklist/Research Plan')
    expect(getForm('Form 1B')?.name).toBe('Approval Form')
    expect(getForm('Form 2B')?.name).toBe('Qualified Scientist Form')
  })

  it('drops the retired 2026-only codes', () => {
    expect(getForm('Form 1C')).toBeUndefined()
    expect(getForm('Form 2')).toBeUndefined()
  })

  it('adds the 2027 student-support / institution forms', () => {
    for (const code of ['Form 2A', 'Form 2B', 'Form 2C']) {
      expect(getForm(code)).toBeDefined()
    }
  })

  // Removed: `getForm('Form 99Z')` → undefined. That asserted that
  // `Array.prototype.find` returns undefined for an absent value; there is no
  // guard, filter or validation whose removal could flip it.
})

/**
 * The CONTENT half of §0.8. The mechanism half — that the route withholds
 * applicability copy unless the edition is signed, unedited since, and still in
 * date — is `test/forms-guidance-gate.test.ts`, which runs the real gate against
 * a synthetic edition that actually carries copy. These four record the state of
 * the SHIPPED edition: still unauthored, still unsigned, still sourced.
 */
describe('ISEF edition review state (unauthored applicability copy)', () => {
  it('is not marked reviewed', () => {
    // The derived predicate, not its literal inputs — asserting each one was
    // the same fact stated three times.
    expect(isEditionReviewed(ISEF_EDITION, new Date(ISEF_EDITION.sourcedAt))).toBe(false)
  })

  it('carries a re-source date that is after the day it was sourced', () => {
    // A catalog whose expiry precedes its own sourcing would be born expired —
    // the state is fail-closed, so that would be silent-but-safe, and silent is
    // how a pilot ends up on a permanently degraded forms tab.
    expect(Date.parse(ISEF_EDITION.expiresAt)).toBeGreaterThan(Date.parse(ISEF_EDITION.sourcedAt))
  })

  it('ships no unreviewed applicability copy', () => {
    for (const f of ISEF_FORMS) {
      expect(f.appliesTo).toBeNull()
    }
  })

  it('records official source provenance', () => {
    expect(ISEF_EDITION.season).toBe('2027')
    expect(ISEF_EDITION.formsUrl).toMatch(/^https:\/\/www\.societyforscience\.org\//)
    expect(ISEF_EDITION.rulesUrl).toMatch(/^https:\/\/www\.societyforscience\.org\//)
    expect(ISEF_EDITION.sourcedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('HAZARD_CLASSES content shape', () => {
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

  it('getHazardClass round-trips a known key', () => {
    const cls = getHazardClass('chemical')
    expect(cls).toBeDefined()
    expect(cls?.key).toBe('chemical')
    // Removed the bogus-key half: `find` returning undefined for an absent key
    // is a language guarantee, not a guard this module could regress.
  })
})
