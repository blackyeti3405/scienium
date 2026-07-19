import { describe, expect, it } from 'vitest'
import { criterionMaxScore, sumReadiness, totalMaxFor } from './rubric-scoring'

/**
 * Rubric score-cap lookup — authoritative for PUT validation. The cross-track
 * case is the anti-forgery boundary: a client sending a science score against
 * an engineering key (or an invented key) must resolve to null, not a cap.
 */

describe('criterionMaxScore', () => {
  it('resolves a real key to its cap', () => {
    expect(criterionMaxScore('science', 'science:I')).toBeGreaterThan(0)
  })

  it('a cross-track key resolves to null (forged input)', () => {
    expect(criterionMaxScore('science', 'engineering:III')).toBeNull()
  })

  it('an invented key resolves to null', () => {
    expect(criterionMaxScore('science', 'science:XCVII')).toBeNull()
    expect(criterionMaxScore('engineering', '')).toBeNull()
  })
})

describe('track totals', () => {
  it('both tracks total exactly 100 (computed, never drifting from the literal)', () => {
    expect(totalMaxFor('science')).toBe(100)
    expect(totalMaxFor('engineering')).toBe(100)
  })

  it('sumReadiness is a plain sum, 0 for no scores', () => {
    expect(sumReadiness([])).toBe(0)
    expect(sumReadiness([{ score: 10 }, { score: 25 }])).toBe(35)
  })
})
