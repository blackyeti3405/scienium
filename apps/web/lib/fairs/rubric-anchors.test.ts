import { describe, it, expect } from 'vitest'
import { RUBRIC_ANCHORS, anchorFor } from '@/lib/fairs/rubric-anchors'
import { rubricCriteriaFor } from '@/lib/fairs/rubric-scoring'

// ---------------------------------------------------------------------------
// Content shape invariants — cheap guard that the authored anchor/talking-point
// content stays well-formed as it's edited over time (mirrors forms.test.ts's
// pattern for ISEF_FORMS/ISEF_FORM_GUIDES).
// ---------------------------------------------------------------------------

describe('RUBRIC_ANCHORS content shape', () => {
  it('has exactly 10 entries (5 criteria x 2 tracks)', () => {
    expect(RUBRIC_ANCHORS).toHaveLength(10)
  })

  it('every rubricCriteriaFor("science") criterion key has a matching anchor', () => {
    for (const c of rubricCriteriaFor('science')) {
      const anchor = anchorFor('science', c.key)
      expect(anchor, `missing anchor for ${c.key}`).toBeDefined()
      expect(anchor!.numeral).toBe(c.numeral)
      expect(anchor!.title).toBe(c.title)
    }
  })

  it('every rubricCriteriaFor("engineering") criterion key has a matching anchor', () => {
    for (const c of rubricCriteriaFor('engineering')) {
      const anchor = anchorFor('engineering', c.key)
      expect(anchor, `missing anchor for ${c.key}`).toBeDefined()
      expect(anchor!.numeral).toBe(c.numeral)
      expect(anchor!.title).toBe(c.title)
    }
  })

  it('every entry has exactly 3 anchors with tiers low/mid/high in order, each with a non-empty description and scoreBand', () => {
    for (const entry of RUBRIC_ANCHORS) {
      expect(entry.anchors).toHaveLength(3)
      expect(entry.anchors.map((a) => a.tier)).toEqual(['low', 'mid', 'high'])
      for (const anchor of entry.anchors) {
        expect(anchor.description.trim().length).toBeGreaterThan(0)
        expect(anchor.scoreBand.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('every entry has at least one non-empty talking point', () => {
    for (const entry of RUBRIC_ANCHORS) {
      expect(entry.talkingPoints.length).toBeGreaterThanOrEqual(1)
      for (const tp of entry.talkingPoints) {
        expect(tp.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('criterionKey is always "${track}:${numeral}"', () => {
    for (const entry of RUBRIC_ANCHORS) {
      expect(entry.criterionKey).toBe(`${entry.track}:${entry.numeral}`)
    }
  })

  it('anchorFor returns undefined for an unknown criterionKey', () => {
    expect(anchorFor('science', 'science:VI')).toBeUndefined()
  })
})
