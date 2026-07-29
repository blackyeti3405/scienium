import { describe, expect, it } from 'vitest'
import { fitLinear, fitPolynomial, fitTrendline } from './trendline'

/**
 * The Phase B acceptance criterion for the trendline math: the linear and
 * polynomial equations and R² match HAND-COMPUTED values. Everything else here
 * guards the domain rules (log/power/exp) and the moving-average window.
 */

describe('fitLinear — equation and R² vs hand computation', () => {
  it('recovers an exact line y = 2x + 1 with R² = 1', () => {
    const fit = fitLinear([1, 2, 3, 4], [3, 5, 7, 9])
    expect(fit.b).toBeCloseTo(2, 10)
    expect(fit.a).toBeCloseTo(1, 10)
    expect(fit.r2).toBeCloseTo(1, 10)
    expect(fit.equation).toBe('y = 2x + 1')
  })

  it('matches a hand-computed imperfect fit (slope 0.5, intercept 2/3, R² 0.75)', () => {
    // x=[1,2,3], y=[1,2,2]: Sxy=1, Sxx=2 → b=0.5, a=ȳ−b·x̄=5/3−1=2/3.
    // SSres=0.16667, SStot=0.66667 → R²=1−0.25=0.75.
    const fit = fitLinear([1, 2, 3], [1, 2, 2])
    expect(fit.b).toBeCloseTo(0.5, 10)
    expect(fit.a).toBeCloseTo(0.6666667, 6)
    expect(fit.r2).toBeCloseTo(0.75, 10)
  })
})

describe('fitPolynomial — coefficients, equation and R² vs hand computation', () => {
  it('recovers y = x² + 2x + 3 exactly (R² = 1)', () => {
    const x = [-2, -1, 0, 1, 2, 3]
    const y = x.map((v) => v * v + 2 * v + 3)
    const fit = fitPolynomial(x, y, 2)
    if (!fit.ok) throw new Error('expected a fit')
    expect(fit.coeffs[0]).toBeCloseTo(3, 8) // c0
    expect(fit.coeffs[1]).toBeCloseTo(2, 8) // c1
    expect(fit.coeffs[2]).toBeCloseTo(1, 8) // c2
    expect(fit.r2).toBeCloseTo(1, 10)
    expect(fit.equation).toBe('y = 1x^2 + 2x + 3')
  })

  it('stays accurate on large-magnitude x thanks to centring/scaling', () => {
    // 0.5x² − 3x + 2 at x=10..50 — a raw Vandermonde would lose precision here.
    const x = [10, 20, 30, 40, 50]
    const y = x.map((v) => 0.5 * v * v - 3 * v + 2)
    const fit = fitPolynomial(x, y, 2)
    if (!fit.ok) throw new Error('expected a fit')
    expect(fit.coeffs[0]).toBeCloseTo(2, 4)
    expect(fit.coeffs[1]).toBeCloseTo(-3, 5)
    expect(fit.coeffs[2]).toBeCloseTo(0.5, 6)
    expect(fit.r2).toBeCloseTo(1, 8)
  })

  it('suppresses float-noise terms so y = x² prints cleanly', () => {
    // Centring/scaling leaves the x and constant terms at ~1e-15; they must not
    // surface as "+ 1e-15x" in the displayed equation.
    const x = [1, 2, 3, 4]
    const fit = fitPolynomial(x, x.map((v) => v * v), 2)
    if (!fit.ok) throw new Error('expected a fit')
    expect(fit.equation).toBe('y = 1x^2')
    expect(fit.r2).toBeCloseTo(1, 10)
  })

  it('clamps the order into 2–6', () => {
    // Order 9 requested → treated as 6; a cubic still fits within a degree-6 space.
    const x = [-3, -2, -1, 0, 1, 2, 3]
    const y = x.map((v) => v ** 3 - 2 * v)
    const fit = fitPolynomial(x, y, 9)
    if (!fit.ok) throw new Error('expected a fit')
    expect(fit.coeffs.length).toBe(7)
    expect(fit.r2).toBeCloseTo(1, 6)
  })

  it('refuses an underdetermined fit instead of returning a bogus y = 0', () => {
    // 3 points cannot determine an order-6 polynomial (7 coefficients). The old
    // code fell back to all-zero coeffs → predict≡0, "y = 0", negative R², ok:true.
    const fit = fitPolynomial([1, 2, 3], [2, 5, 10], 6)
    expect(fit.ok).toBe(false)
    if (fit.ok) throw new Error('expected a refusal')
    expect(fit.reason).toMatch(/at least 7 points/)
  })

  it('refuses a 2-point series at order 2 (order+1 = 3 points needed)', () => {
    const fit = fitPolynomial([1, 2], [3, 5], 2)
    expect(fit.ok).toBe(false)
  })

  it('fitTrendline surfaces the polynomial refusal as ok:false with a reason', () => {
    const t = fitTrendline([1, 2, 3], [2, 5, 10], { kind: 'polynomial', order: 6 })
    expect(t.ok).toBe(false)
    expect(t.r2).toBeNull()
    expect(t.reason).toMatch(/points/)
  })
})

describe('fitTrendline — perfect fits reach R² = 1', () => {
  it('exponential y = 3·e^{0.5x}', () => {
    const x = [0, 1, 2, 3, 4]
    const y = x.map((v) => 3 * Math.exp(0.5 * v))
    const t = fitTrendline(x, y, { kind: 'exponential' })
    expect(t.ok).toBe(true)
    expect(t.r2).toBeCloseTo(1, 8)
    expect(t.equation).toBe('y = 3e^0.5x')
  })

  it('power y = 2·x^3', () => {
    const x = [1, 2, 3, 4]
    const y = x.map((v) => 2 * v ** 3)
    const t = fitTrendline(x, y, { kind: 'power' })
    expect(t.ok).toBe(true)
    expect(t.r2).toBeCloseTo(1, 8)
    expect(t.equation).toBe('y = 2x^3')
  })

  it('logarithmic y = 1 + 2·ln(x)', () => {
    const x = [1, Math.E, Math.E ** 2]
    const y = x.map((v) => 1 + 2 * Math.log(v))
    const t = fitTrendline(x, y, { kind: 'logarithmic' })
    expect(t.ok).toBe(true)
    expect(t.r2).toBeCloseTo(1, 8)
    expect(t.equation).toBe('y = 2ln(x) + 1')
  })
})

describe('fitTrendline — domain guards never emit NaN', () => {
  it('drops non-positive x from a logarithmic fit but still fits the rest', () => {
    // x=0 is invalid for ln; it is dropped, the two positive points remain.
    const t = fitTrendline([0, 1, Math.E], [99, 1, 3], { kind: 'logarithmic' })
    expect(t.ok).toBe(true)
    expect(t.equation).toBe('y = 2ln(x) + 1')
    expect(t.points.every((p) => Number.isFinite(p.y))).toBe(true)
  })

  it('refuses a logarithmic fit with too few positive-x points', () => {
    const t = fitTrendline([0, -1, -5], [1, 2, 3], { kind: 'logarithmic' })
    expect(t.ok).toBe(false)
    expect(t.reason).toMatch(/greater than 0/)
    expect(t.r2).toBeNull()
  })

  it('refuses a power fit when x or y is not strictly positive', () => {
    const t = fitTrendline([1, 2], [0, -3], { kind: 'power' })
    expect(t.ok).toBe(false)
    expect(t.reason).toMatch(/greater than 0/)
  })

  it('refuses an exponential fit when y is not strictly positive', () => {
    const t = fitTrendline([1, 2, 3], [0, -1, -2], { kind: 'exponential' })
    expect(t.ok).toBe(false)
    expect(t.reason).toMatch(/greater than 0/)
  })
})

describe('fitTrendline — moving average', () => {
  it('averages each window of k, starting at the k-th point, no equation or R²', () => {
    const t = fitTrendline([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], { kind: 'movingAverage', window: 3 })
    expect(t.ok).toBe(true)
    expect(t.equation).toBe('')
    expect(t.r2).toBeNull()
    expect(t.points).toEqual([
      { x: 3, y: 2 },
      { x: 4, y: 3 },
      { x: 5, y: 4 },
    ])
  })

  it('sorts by x before windowing so out-of-order data still averages correctly', () => {
    const t = fitTrendline([3, 1, 2], [3, 1, 2], { kind: 'movingAverage', window: 2 })
    expect(t.points).toEqual([
      { x: 2, y: 1.5 },
      { x: 3, y: 2.5 },
    ])
  })

  it('refuses when there are fewer points than the window', () => {
    const t = fitTrendline([1, 2], [1, 2], { kind: 'movingAverage', window: 3 })
    expect(t.ok).toBe(false)
    expect(t.reason).toMatch(/at least 3/)
  })
})
