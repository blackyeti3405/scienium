import { describe, it, expect } from 'vitest'
import { applyCurrencyDelta, applyCurrencyValues } from './currency-math'

const START = { kp: 100, clearanceLevel: 2, lc: 5 }

describe('lab currency arithmetic', () => {
  it('adds a normal delta', () => {
    expect(applyCurrencyDelta(START, { kp: 80 })).toEqual({ kp: 180, clearanceLevel: 2, lc: 5 })
  })

  it('spends', () => {
    expect(applyCurrencyDelta(START, { kp: -30, lc: -1 })).toEqual({
      kp: 70,
      clearanceLevel: 2,
      lc: 4,
    })
  })

  /**
   * The attack: a grade response missing `newClearance` used to reach the
   * arithmetic as `undefined`, and `c.kp + undefined` is NaN. NaN is absorbing —
   * every later award keeps it — so the balance reads NaN until a reload. The
   * balance must survive a broken field, not be poisoned by it.
   */
  it('ignores a NaN component instead of poisoning the balance', () => {
    const after = applyCurrencyDelta(START, { kp: NaN })
    expect(after.kp).toBe(100)
    expect(Number.isNaN(after.kp)).toBe(false)
    // and the next legitimate award still lands
    expect(applyCurrencyDelta(after, { kp: 25 }).kp).toBe(125)
  })

  it('ignores undefined and Infinity the same way', () => {
    expect(applyCurrencyDelta(START, { kp: undefined }).kp).toBe(100)
    expect(applyCurrencyDelta(START, { lc: Infinity }).lc).toBe(5)
  })

  it('reconciles absolute values from the server', () => {
    expect(applyCurrencyValues(START, { kp: 999 })).toEqual({ kp: 999, clearanceLevel: 2, lc: 5 })
  })

  /**
   * A reconcile carrying a broken field must KEEP the good value, not clear it.
   * `{ ...current, ...next }` overwrote with the broken one.
   */
  it('keeps the current value when a reconcile field is not a finite number', () => {
    expect(applyCurrencyValues(START, { kp: NaN, lc: 9 })).toEqual({
      kp: 100,
      clearanceLevel: 2,
      lc: 9,
    })
  })
})
