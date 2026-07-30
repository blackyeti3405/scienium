import { describe, expect, it } from 'vitest'
import {
  criterionMaxScore,
  sumReadiness,
  totalMaxFor,
  parseScoreInput,
  clampScore,
} from './rubric-scoring'

/**
 * Rubric score-cap lookup — authoritative for PUT validation. The cross-track
 * case is the anti-forgery boundary: a client sending a science score against
 * an engineering key (or an invented key) must resolve to null, not a cap.
 */

describe('criterionMaxScore', () => {
  it('resolves a real key to its exact ISEF cap', () => {
    // Criterion I (Research Question) is 10 points on the ISEF rubric — the
    // exact value matters because PUT validation clamps against it.
    expect(criterionMaxScore('science', 'science:I')).toBe(10)
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

/**
 * REFACTOR2 §0.7 — `components/teacher/TeacherRubricScoring.tsx`.
 *
 * REPRODUCED against the pre-fix card: the score box did `Number(e.target.value)`
 * on every keystroke, so selecting a stored 15 and deleting it set the local
 * score to a real 0; 0 differed from 15, so the blur autosave PUT `{ score: 0 }`
 * and "Last scored by <teacher>" then vouched for it. On a teacher-facing
 * grading surface that is a wrong mark, not a UI wobble.
 */
describe('parseScoreInput — an empty box is NOT a zero', () => {
  it('an empty or whitespace box parses to null, never 0', () => {
    expect(parseScoreInput('')).toBeNull()
    expect(parseScoreInput('   ')).toBeNull()
  })

  it('a real zero still parses to zero', () => {
    expect(parseScoreInput('0')).toBe(0)
  })

  it('parses ordinary scores', () => {
    expect(parseScoreInput('7')).toBe(7)
    expect(parseScoreInput(' 15 ')).toBe(15)
  })

  it('non-numeric text parses to null rather than NaN or 0', () => {
    expect(parseScoreInput('abc')).toBeNull()
    expect(parseScoreInput('-')).toBeNull()
  })

  it('does NOT clamp — dirtiness is decided on what was typed', () => {
    // Clamping here would make a typed 99 equal a stored 10, and the save that
    // corrects it back down would never fire (E2E F10 AC7 depends on it doing so).
    expect(parseScoreInput('99')).toBe(99)
    expect(parseScoreInput('-4')).toBe(-4)
  })
})

describe('clampScore — applied at send time only', () => {
  it('clamps above the cap and below zero', () => {
    expect(clampScore(99, 10)).toBe(10)
    expect(clampScore(-4, 10)).toBe(0)
  })

  it('passes an in-range score through, and rounds a fractional one', () => {
    expect(clampScore(7, 10)).toBe(7)
    expect(clampScore(7.6, 10)).toBe(8)
  })
})
