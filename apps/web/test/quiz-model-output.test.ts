import { describe, expect, it } from 'vitest'
import {
  aggregateOverQuestions,
  parseGeneratedQuestions,
  QUIZ_PASS_THRESHOLD,
  QUIZ_QUESTION_COUNT,
  type GradedAnswer,
} from '@/lib/literature/quiz'
import { clampScore } from '@/lib/economy'

/**
 * Malformed model output must not mint proficiency or KP (REFACTOR2 P1-S3).
 *
 * Two separate holes, both reachable without touching the UI:
 *
 *   1. Generation accepted ANY non-empty array, so a model returning one element
 *      produced a one-question "5-question" exam worth the same reward.
 *   2. Grading divided by `graded.length` — the rows the model returned — so a
 *      single `{questionId:"q1",score:100}` passed a five-question session
 *      outright, and a foreign or duplicated id could inflate the same sum.
 *
 * The provider is treated as hostile here: these are the shapes a compromised,
 * truncated, or prompt-injected response actually produces.
 */

function q(prompt: string, key = 'grading notes', focus = 'findings') {
  return { prompt, focus, key }
}

const FIVE = Array.from({ length: 5 }, (_, i) => q(`Question ${i + 1}?`))

describe('parseGeneratedQuestions — exact cardinality', () => {
  it('accepts exactly the requested count and assigns canonical ids', () => {
    const out = parseGeneratedQuestions(FIVE, 5)

    expect(out).toHaveLength(5)
    expect(out!.map((x) => x.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5'])
    expect(out![0]!.prompt).toBe('Question 1?')
  })

  it('defaults to the shared question count', () => {
    expect(parseGeneratedQuestions(FIVE)).toHaveLength(QUIZ_QUESTION_COUNT)
    expect(QUIZ_QUESTION_COUNT).toBe(5)
  })

  // The exact defect: a one-element array used to become a whole quiz.
  it('rejects a short array rather than shipping an easier exam', () => {
    expect(parseGeneratedQuestions([q('Only one?')], 5)).toBeNull()
    expect(parseGeneratedQuestions(FIVE.slice(0, 3), 5)).toBeNull()
  })

  it('rejects an over-long array', () => {
    expect(parseGeneratedQuestions([...FIVE, q('Bonus?')], 5)).toBeNull()
  })

  it('rejects an empty array or a non-array', () => {
    for (const raw of [[], null, undefined, 'nope', 42, { prompt: 'x' }]) {
      expect(parseGeneratedQuestions(raw, 5)).toBeNull()
    }
  })

  it('rejects a blank or non-string prompt — that is not a question', () => {
    for (const bad of ['', '   ', 42, null, undefined]) {
      const raw = [...FIVE.slice(0, 4), { prompt: bad, focus: 'x', key: 'k' }]
      expect(parseGeneratedQuestions(raw, 5)).toBeNull()
    }
  })

  // A blank key leaves the grader nothing to grade against, which is how a
  // "grade it however you like" question would slip through.
  it('rejects a blank or missing grading key', () => {
    for (const bad of ['', '  ', undefined, null, 7]) {
      const raw = [...FIVE.slice(0, 4), { prompt: 'Real question?', focus: 'x', key: bad }]
      expect(parseGeneratedQuestions(raw, 5)).toBeNull()
    }
  })

  it('rejects a null or primitive element', () => {
    expect(parseGeneratedQuestions([...FIVE.slice(0, 4), null], 5)).toBeNull()
    expect(parseGeneratedQuestions([...FIVE.slice(0, 4), 'question'], 5)).toBeNull()
  })

  it('defaults a missing focus rather than failing — it is cosmetic', () => {
    const raw = [...FIVE.slice(0, 4), { prompt: 'Real question?', key: 'k' }]
    expect(parseGeneratedQuestions(raw, 5)![4]!.focus).toBe('general')
  })

  it('trims whitespace out of the stored question', () => {
    const raw = [...FIVE.slice(0, 4), { prompt: '  Padded?  ', focus: ' f ', key: ' k ' }]
    const out = parseGeneratedQuestions(raw, 5)![4]!
    expect(out.prompt).toBe('Padded?')
    expect(out.key).toBe('k')
  })
})

describe('aggregateOverQuestions — canonical denominator', () => {
  const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'].map((id) => ({ id }))
  const grade = (questionId: string, score: number): GradedAnswer => ({
    questionId,
    score,
    rationale: '',
  })

  // THE defect: one perfect row used to pass a five-question session.
  it('a single perfect row does not pass a five-question quiz', () => {
    const aggregate = aggregateOverQuestions(QUESTIONS, [grade('q1', 100)], clampScore)

    expect(aggregate).toBe(20) // 100/5, not 100/1
    expect(aggregate).toBeLessThan(QUIZ_PASS_THRESHOLD)
  })

  it('counts an ungraded question as zero, not as absent', () => {
    const graded = [grade('q1', 100), grade('q2', 100), grade('q3', 100)]

    expect(aggregateOverQuestions(QUESTIONS, graded, clampScore)).toBe(60)
  })

  it('ignores a grade for a question we never asked', () => {
    const graded = [grade('q1', 50), grade('q99', 100), grade('injected', 100)]

    expect(aggregateOverQuestions(QUESTIONS, graded, clampScore)).toBe(10) // 50/5
  })

  it('counts a duplicated id once — the first occurrence', () => {
    const graded = [grade('q1', 40), grade('q1', 100), grade('q1', 100)]

    expect(aggregateOverQuestions(QUESTIONS, graded, clampScore)).toBe(8) // 40/5
  })

  it('clamps an out-of-range score instead of trusting it', () => {
    const graded = QUESTIONS.map((x) => grade(x.id, 10_000))

    expect(aggregateOverQuestions(QUESTIONS, graded, clampScore)).toBe(100)
    expect(aggregateOverQuestions(QUESTIONS, [grade('q1', -500)], clampScore)).toBe(0)
  })

  it('scores a genuinely complete pass correctly', () => {
    const graded = QUESTIONS.map((x) => grade(x.id, 80))

    const aggregate = aggregateOverQuestions(QUESTIONS, graded, clampScore)
    expect(aggregate).toBe(80)
    expect(aggregate).toBeGreaterThanOrEqual(QUIZ_PASS_THRESHOLD)
  })

  it('returns 0 for an empty canonical set rather than dividing by zero', () => {
    expect(aggregateOverQuestions([], [grade('q1', 100)], clampScore)).toBe(0)
  })

  it('is unaffected by the ORDER the model returns rows in', () => {
    const forward = QUESTIONS.map((x, i) => grade(x.id, 50 + i * 10))
    const reversed = [...forward].reverse()

    expect(aggregateOverQuestions(QUESTIONS, reversed, clampScore)).toBe(
      aggregateOverQuestions(QUESTIONS, forward, clampScore),
    )
  })
})
