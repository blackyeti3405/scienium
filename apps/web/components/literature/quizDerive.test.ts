import { describe, expect, it } from 'vitest'
import { buildRetryAnswers, deriveFailedQuestionIds } from './quizDerive'

/**
 * The client-side derivation of WHICH answers a retry submits. A wrong set
 * here submits a student's answer against the wrong question or resubmits a
 * passed one — grade corruption with no visible error.
 */

describe('deriveFailedQuestionIds', () => {
  it('collects exactly the below-threshold ids using the server threshold', () => {
    const failed = deriveFailedQuestionIds({
      threshold: 70,
      results: [
        { questionId: 'q1', score: 69 },
        { questionId: 'q2', score: 70 }, // at threshold = passed
        { questionId: 'q3', score: 0 },
      ],
    })
    expect([...failed].sort()).toEqual(['q1', 'q3'])
  })

  it('falls back to the default threshold when the server omits it', () => {
    const failed = deriveFailedQuestionIds({ results: [{ questionId: 'q1', score: 69 }] })
    expect(failed.has('q1')).toBe(true)
  })

  it('no results yet → empty set (nothing to retry)', () => {
    expect(deriveFailedQuestionIds(null).size).toBe(0)
  })
})

describe('buildRetryAnswers', () => {
  it('pairs each failed id with ITS OWN typed answer, plus the new question', () => {
    const payload = buildRetryAnswers(new Set(['q1', 'q3']), 'q6', {
      q1: 'answer one',
      q3: 'answer three',
      q6: 'new answer',
    })
    expect(payload).toContainEqual({ questionId: 'q1', response: 'answer one' })
    expect(payload).toContainEqual({ questionId: 'q3', response: 'answer three' })
    expect(payload).toContainEqual({ questionId: 'q6', response: 'new answer' })
    expect(payload).toHaveLength(3)
  })

  it('an unanswered failed question submits an EMPTY string, never drops out', () => {
    // Dropping it would let the old failing score silently stand as "answered".
    const payload = buildRetryAnswers(new Set(['q1']), 'q6', { q6: 'x' })
    expect(payload).toContainEqual({ questionId: 'q1', response: '' })
  })

  it('answers typed for non-failed questions never leak into the payload', () => {
    const payload = buildRetryAnswers(new Set(['q1']), 'q6', {
      q1: 'a',
      q2: 'stale text for a passed question',
      q6: 'b',
    })
    expect(payload.map((p) => p.questionId).sort()).toEqual(['q1', 'q6'])
  })
})
