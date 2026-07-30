import { describe, expect, it } from 'vitest'
import {
  EXPLAIN_KP_AWARD,
  EXPLAIN_PASS_ACCURACY,
  EXPLAIN_PASS_COMPLETENESS,
  ExplainVerdictSchema,
  computeExplainOutcome,
  e2eFixtureVerdict,
  normalizeVerdict,
} from './explain'

/**
 * Explain-it-back scoring core. The two rules a regression would silently
 * break: BOTH bars must clear to pass (a fluent-but-wrong explanation must
 * never pass on completeness alone), and KP is once-ever (kpEligible only
 * while priorKp is 0). `normalizeVerdict` is the only thing between raw model
 * output and the DB/client, so its clamps and caps get pinned too.
 */

describe('computeExplainOutcome — the both-bars pass rule', () => {
  it('passes only when accuracy AND completeness clear their bars', () => {
    const at = computeExplainOutcome({
      accuracy: EXPLAIN_PASS_ACCURACY,
      completeness: EXPLAIN_PASS_COMPLETENESS,
      priorBest: 0,
      priorKp: 0,
    })
    expect(at.passed).toBe(true)
  })

  it('high completeness cannot carry failing accuracy', () => {
    const out = computeExplainOutcome({
      accuracy: EXPLAIN_PASS_ACCURACY - 1,
      completeness: 100,
      priorBest: 0,
      priorKp: 0,
    })
    expect(out.passed).toBe(false)
    expect(out.kpEligible).toBe(false)
  })

  it('high accuracy cannot carry failing completeness', () => {
    const out = computeExplainOutcome({
      accuracy: 100,
      completeness: EXPLAIN_PASS_COMPLETENESS - 1,
      priorBest: 0,
      priorKp: 0,
    })
    expect(out.passed).toBe(false)
  })

  it('kpEligible only on a pass with NO prior KP (once-ever award)', () => {
    const first = computeExplainOutcome({ accuracy: 90, completeness: 90, priorBest: 0, priorKp: 0 })
    expect(first.kpEligible).toBe(true)

    const again = computeExplainOutcome({
      accuracy: 95,
      completeness: 95,
      priorBest: 90,
      priorKp: EXPLAIN_KP_AWARD,
    })
    expect(again.passed).toBe(true)
    expect(again.kpEligible).toBe(false) // better score, but the KP was already paid
  })

  it('overall is the rounded mean; newBestScore is a high-water mark', () => {
    const out = computeExplainOutcome({ accuracy: 71, completeness: 70, priorBest: 80, priorKp: 0 })
    expect(out.overall).toBe(71) // round(70.5)
    expect(out.newBestScore).toBe(80) // prior best stands

    const better = computeExplainOutcome({ accuracy: 90, completeness: 90, priorBest: 80, priorKp: 0 })
    expect(better.newBestScore).toBe(90)
  })
})

describe('normalizeVerdict — server-authoritative shape', () => {
  const base = {
    accuracy: 80,
    completeness: 75,
    correctPoints: [],
    missedPoints: [],
    misconceptions: [],
    followUpQuestion: 'Q?',
  }

  it('clamps out-of-range and non-integer scores', () => {
    const out = normalizeVerdict({ ...base, accuracy: 250, completeness: -10 })
    expect(out.accuracy).toBe(100)
    expect(out.completeness).toBe(0)
    // Fractional model output rounds, never truncates or passes through raw.
    expect(normalizeVerdict({ ...base, accuracy: 82.6 }).accuracy).toBe(83)
  })

  it('caps lists at 5 items and items at 300 chars', () => {
    const out = normalizeVerdict({
      ...base,
      missedPoints: Array.from({ length: 12 }, (_, i) => `point ${i} ` + 'x'.repeat(400)),
    })
    expect(out.missedPoints).toHaveLength(5)
    for (const p of out.missedPoints) expect(p.length).toBeLessThanOrEqual(300)
  })

  it('truncates an oversized followUpQuestion', () => {
    const out = normalizeVerdict({ ...base, followUpQuestion: 'q'.repeat(1_000) })
    expect(out.followUpQuestion.length).toBe(300)
  })

  it('schema coerces numeric strings and defaults missing lists (chatty models)', () => {
    const parsed = ExplainVerdictSchema.parse({ accuracy: '82', completeness: '77' })
    expect(parsed.accuracy).toBe(82)
    expect(parsed.correctPoints).toEqual([])
  })
})

describe('e2eFixtureVerdict stays in sync with the real pass rule', () => {
  it('first attempt fails, revision passes, under the SAME bars the route applies', () => {
    const first = e2eFixtureVerdict(0)
    const retry = e2eFixtureVerdict(1)
    expect(
      computeExplainOutcome({ ...first, priorBest: 0, priorKp: 0 }).passed,
    ).toBe(false)
    expect(
      computeExplainOutcome({ ...retry, priorBest: 0, priorKp: 0 }).passed,
    ).toBe(true)
  })
})
