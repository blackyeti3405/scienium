/**
 * Excel's trendline set, closed-form least squares, zero Python.
 *
 * Six kinds, matching what Excel's "Add Trendline" offers: linear,
 * logarithmic, polynomial (order 2–6), power, exponential, and moving average.
 * Each returns a *display equation* and a *display R²* exactly as Excel shows
 * them — the point of the feature is that a student sees the same numbers they
 * would in the paid tool.
 *
 * **R² conventions match Excel, which is not always "the honest one":**
 *   - linear / polynomial / logarithmic — R² on the RAW data (1 − SSres/SStot),
 *     the ordinary coefficient of determination.
 *   - power / exponential — Excel fits these by linearising (log both sides,
 *     ordinary least squares on the logs) and reports the R² of THAT linear fit,
 *     i.e. in log space, not on the raw residuals. We reproduce that so the
 *     numbers agree with Excel rather than being "more correct" and confusing.
 *
 * Invalid domains never produce a silent NaN: log/power need x>0, power/exp
 * need y>0. Points violating the domain are dropped and, if too few remain, the
 * fit is refused with a plain-language reason.
 */

export type TrendlineKind =
  | 'linear'
  | 'logarithmic'
  | 'polynomial'
  | 'power'
  | 'exponential'
  | 'movingAverage'

export interface TrendlineSpec {
  kind: TrendlineKind
  /** Polynomial order, 2–6. Ignored for other kinds. */
  order?: number
  /** Moving-average window, ≥2. Ignored for other kinds. */
  window?: number
}

/** A fitted trendline, ready to display and to plot. */
export interface Trendline {
  kind: TrendlineKind
  ok: boolean
  /** Why the fit could not run (domain guard, too few points). */
  reason?: string
  /** Display equation, e.g. `y = 2x + 1`. Empty for a moving average. */
  equation: string
  /** Display R². `null` for a moving average (Excel shows none). */
  r2: number | null
  /**
   * Overlay points in AXIS coordinates, x-sorted — plot as a line. For the
   * continuous fits this is a smooth sample across the x-range; for a moving
   * average it is one point per data point from the window-th onward.
   */
  points: { x: number; y: number }[]
  /**
   * Evaluate the fitted curve at an arbitrary x. Present for the continuous
   * fits; `undefined` for a moving average (which is defined only at data
   * points). Lets a category-axis chart place the trend at each category.
   */
  predict?: (x: number) => number
}

// ─── Number formatting for displayed equations ───────────────────────────────

/** A coefficient as Excel would show it: trimmed, ~5 significant figures. */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  // Scientific only at the extremes, like a spreadsheet's default trendline label.
  if (abs >= 1e6 || abs < 1e-4) return n.toExponential(2)
  return String(Number(n.toPrecision(5)))
}

/**
 * Join ascending polynomial coefficients `[c0, c1, c2, …]` into `y = … + c1x + c0`,
 * highest power first, with real minus signs and no `+ -`. Shared by the linear
 * and polynomial fits so their formatting can never drift apart.
 */
function polynomialEquation(coeffsAscending: number[]): string {
  // Drop terms that are only float noise relative to the largest coefficient —
  // a perfect y = x² fit leaves the x and constant terms at ~1e-15, and printing
  // "+ 1.0e-15x" would be noise, not information.
  const maxAbs = Math.max(...coeffsAscending.map((c) => Math.abs(c)), 0)
  const negligible = maxAbs * 1e-10
  const parts: string[] = []
  for (let power = coeffsAscending.length - 1; power >= 0; power--) {
    const c = coeffsAscending[power]!
    if (Math.abs(c) <= negligible && coeffsAscending.length > 1) continue
    const mag = fmt(Math.abs(c))
    const sign = c < 0 ? '−' : '+'
    const body = power === 0 ? mag : power === 1 ? `${mag}x` : `${mag}x^${power}`
    parts.push(parts.length === 0 ? (c < 0 ? `−${body}` : body) : ` ${sign} ${body}`)
  }
  return `y = ${parts.length ? parts.join('') : '0'}`
}

// ─── Shared least-squares helpers ────────────────────────────────────────────

function mean(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / v.length
}

/** R² on raw data: 1 − SSres/SStot. Returns 1 for a flat y that is perfectly hit. */
function rSquared(y: number[], predicted: number[]): number {
  const ybar = mean(y)
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < y.length; i++) {
    ssRes += (y[i]! - predicted[i]!) ** 2
    ssTot += (y[i]! - ybar) ** 2
  }
  if (ssTot === 0) return ssRes === 0 ? 1 : 0
  return 1 - ssRes / ssTot
}

/** Ordinary linear regression y = a + bx. Assumes ≥2 points. */
function linearRegression(x: number[], y: number[]): { a: number; b: number } {
  const n = x.length
  const xbar = mean(x)
  const ybar = mean(y)
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i]! - xbar) * (y[i]! - ybar)
    sxx += (x[i]! - xbar) ** 2
  }
  const b = sxx === 0 ? 0 : sxy / sxx
  return { a: ybar - b * xbar, b }
}

/**
 * Solve a symmetric linear system by Gaussian elimination with partial pivoting.
 * Only used on the (order+1)×(order+1) normal-equation matrix, ≤7×7.
 */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]!])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r
    }
    if (Math.abs(M[pivot]![col]!) < 1e-12) return null // singular
    ;[M[col], M[pivot]] = [M[pivot]!, M[col]!]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = M[r]![col]! / M[col]![col]!
      for (let k = col; k <= n; k++) M[r]![k]! -= factor * M[col]![k]!
    }
  }
  return M.map((row, i) => row[n]! / row[i]!)
}

/** Multiply two polynomials given as ascending-coefficient arrays. */
function polyMul(p: number[], q: number[]): number[] {
  const out = new Array<number>(p.length + q.length - 1).fill(0)
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) out[i + j]! += p[i]! * q[j]!
  }
  return out
}

// ─── The individual fits (exported for direct unit testing) ──────────────────

export interface LinearFit {
  a: number
  b: number
  r2: number
  equation: string
  predict: (x: number) => number
}

/** Linear `y = a + bx`. */
export function fitLinear(x: number[], y: number[]): LinearFit {
  const { a, b } = linearRegression(x, y)
  const predict = (xi: number) => a + b * xi
  return { a, b, r2: rSquared(y, x.map(predict)), equation: polynomialEquation([a, b]), predict }
}

export type PolynomialFit =
  | {
      ok: true
      /** Ascending coefficients in the ORIGINAL x, `[c0, c1, …, cOrder]`. */
      coeffs: number[]
      r2: number
      equation: string
      predict: (x: number) => number
    }
  | { ok: false; reason: string }

/**
 * Polynomial `y = c0 + c1x + … + cOrder·x^order`, order 2–6.
 *
 * Fit is done on centred-and-scaled x (`u = (x − mean)/scale`) so the
 * normal-equation matrix stays well conditioned — a raw Vandermonde over, say,
 * calendar years loses all precision by order 4. The coefficients are then
 * mapped back into the original x basis by substituting `u(x)` and re-expanding,
 * so the displayed equation and predictions are in x, matching a hand fit.
 *
 * ponytail: normal equations + Gaussian elimination is the classroom-scale
 * choice. Conditioning ceiling ~order 6 on a moderate x-range even after
 * centring/scaling; if higher orders or pathological x ever matter, swap the
 * solver for a QR/orthogonal-polynomial fit — not before.
 */
export function fitPolynomial(x: number[], y: number[], order: number): PolynomialFit {
  const deg = Math.max(2, Math.min(6, Math.floor(order)))
  // An order-`deg` polynomial has deg+1 coefficients; with ≤ deg points the
  // normal-equation matrix is singular and `solve()` would return null. Refuse
  // with a plain reason rather than falling back to an all-zero "y = 0" fit that
  // reports ok:true with a negative R².
  if (x.length <= deg) {
    return { ok: false, reason: `A polynomial of order ${deg} needs at least ${deg + 1} points.` }
  }
  const xbar = mean(x)
  const spread = Math.max(...x.map((xi) => Math.abs(xi - xbar)))
  const scale = spread === 0 ? 1 : spread
  const u = x.map((xi) => (xi - xbar) / scale)

  // Normal equations A·c = rhs for the design matrix of powers of u.
  const A: number[][] = []
  const rhs: number[] = []
  for (let i = 0; i <= deg; i++) {
    A.push(new Array<number>(deg + 1).fill(0))
    for (let j = 0; j <= deg; j++) {
      A[i]![j] = u.reduce((acc, ui) => acc + ui ** (i + j), 0)
    }
    rhs.push(u.reduce((acc, ui, k) => acc + ui ** i * y[k]!, 0))
  }
  const cu = solve(A, rhs)
  // Still singular despite enough points (e.g. duplicate x values) — refuse
  // rather than invent a zero-coefficient fit.
  if (!cu) return { ok: false, reason: `A polynomial of order ${deg} could not be fit to these points.` }

  // Map coefficients in u back to x: u(x) = (x − xbar)/scale is a linear poly,
  // so p(u) = Σ cu_k · u^k re-expands into powers of x by accumulating cu_k·u^k.
  const uLinear = [-xbar / scale, 1 / scale] // ascending: const, then ·x
  let uPow = [1] // u^0
  const coeffs = new Array<number>(deg + 1).fill(0)
  for (let k = 0; k <= deg; k++) {
    for (let p = 0; p < uPow.length; p++) coeffs[p]! += cu[k]! * uPow[p]!
    if (k < deg) uPow = polyMul(uPow, uLinear)
  }

  const predict = (xi: number) => coeffs.reduce((acc, c, p) => acc + c * xi ** p, 0)
  return { ok: true, coeffs, r2: rSquared(y, x.map(predict)), equation: polynomialEquation(coeffs), predict }
}

// ─── Public entry point ──────────────────────────────────────────────────────

const SAMPLES = 64

/** Filter a paired x/y series to points meeting a per-point predicate. */
function keep(
  x: number[],
  y: number[],
  ok: (xi: number, yi: number) => boolean,
): { x: number[]; y: number[] } {
  const fx: number[] = []
  const fy: number[] = []
  for (let i = 0; i < x.length; i++) {
    if (ok(x[i]!, y[i]!)) {
      fx.push(x[i]!)
      fy.push(y[i]!)
    }
  }
  return { x: fx, y: fy }
}

/** Sample a fitted curve across the x-range for a smooth overlay line. */
function sampleCurve(x: number[], predict: (x: number) => number): { x: number; y: number }[] {
  const lo = Math.min(...x)
  const hi = Math.max(...x)
  if (lo === hi) return [{ x: lo, y: predict(lo) }]
  const out: { x: number; y: number }[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const xi = lo + ((hi - lo) * i) / SAMPLES
    const yi = predict(xi)
    if (Number.isFinite(yi)) out.push({ x: xi, y: yi })
  }
  return out
}

function fail(kind: TrendlineKind, reason: string): Trendline {
  return { kind, ok: false, reason, equation: '', r2: null, points: [] }
}

/**
 * Fit a trendline to a paired numeric x/y series. `x`/`y` must already be the
 * plotted numeric values (nulls dropped by the caller). Returns a ready-to-plot
 * result; never throws, never emits NaN.
 */
export function fitTrendline(x: number[], y: number[], spec: TrendlineSpec): Trendline {
  const { kind } = spec

  if (kind === 'movingAverage') {
    const k = Math.max(2, Math.floor(spec.window ?? 2))
    if (x.length < k) return fail(kind, `Need at least ${k} points for a ${k}-point moving average.`)
    // Excel plots one averaged point per data point from the k-th onward, at the
    // data's own x. Requires the data in x order to be meaningful.
    const order = x.map((xi, i) => [xi, y[i]!] as const).sort((a, b) => a[0] - b[0])
    const points: { x: number; y: number }[] = []
    for (let i = k - 1; i < order.length; i++) {
      let sum = 0
      for (let j = i - k + 1; j <= i; j++) sum += order[j]![1]
      points.push({ x: order[i]![0], y: sum / k })
    }
    return { kind, ok: true, equation: '', r2: null, points }
  }

  if (x.length < 2) return fail(kind, 'Need at least two points to fit a trendline.')

  switch (kind) {
    case 'linear': {
      const fit = fitLinear(x, y)
      return { kind, ok: true, equation: fit.equation, r2: fit.r2, points: sampleCurve(x, fit.predict), predict: fit.predict }
    }
    case 'polynomial': {
      const fit = fitPolynomial(x, y, spec.order ?? 2)
      if (!fit.ok) return fail(kind, fit.reason)
      return { kind, ok: true, equation: fit.equation, r2: fit.r2, points: sampleCurve(x, fit.predict), predict: fit.predict }
    }
    case 'logarithmic': {
      // y = a + b·ln(x), x>0. Regress y on ln(x); R² on raw y.
      const f = keep(x, y, (xi) => xi > 0)
      if (f.x.length < 2) return fail(kind, 'A logarithmic trend needs at least two points with x greater than 0.')
      const { a, b } = linearRegression(f.x.map(Math.log), f.y)
      const predict = (xi: number) => a + b * Math.log(xi)
      const r2 = rSquared(f.y, f.x.map(predict))
      const eq = `y = ${fmt(b)}ln(x) ${a < 0 ? '−' : '+'} ${fmt(Math.abs(a))}`
      return { kind, ok: true, equation: eq, r2, points: sampleCurve(f.x, predict), predict }
    }
    case 'power': {
      // y = a·x^b, x>0 & y>0. Fit ln(y) = ln(a) + b·ln(x); Excel reports the
      // log-space R² (see file header), which we reproduce.
      const f = keep(x, y, (xi, yi) => xi > 0 && yi > 0)
      if (f.x.length < 2) return fail(kind, 'A power trend needs at least two points with x and y both greater than 0.')
      const lx = f.x.map(Math.log)
      const ly = f.y.map(Math.log)
      const { a: lnA, b } = linearRegression(lx, ly)
      const a = Math.exp(lnA)
      const r2 = rSquared(ly, lx.map((v) => lnA + b * v))
      const predict = (xi: number) => a * xi ** b
      return { kind, ok: true, equation: `y = ${fmt(a)}x^${fmt(b)}`, r2, points: sampleCurve(f.x, predict), predict }
    }
    case 'exponential': {
      // y = a·e^{bx}, y>0. Fit ln(y) = ln(a) + b·x; Excel reports log-space R².
      const f = keep(x, y, (_xi, yi) => yi > 0)
      if (f.x.length < 2) return fail(kind, 'An exponential trend needs at least two points with y greater than 0.')
      const ly = f.y.map(Math.log)
      const { a: lnA, b } = linearRegression(f.x, ly)
      const a = Math.exp(lnA)
      const r2 = rSquared(ly, f.x.map((v) => lnA + b * v))
      const predict = (xi: number) => a * Math.exp(b * xi)
      return { kind, ok: true, equation: `y = ${fmt(a)}e^${fmt(b)}x`, r2, points: sampleCurve(f.x, predict), predict }
    }
  }
}
