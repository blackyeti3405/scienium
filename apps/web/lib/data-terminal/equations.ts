/**
 * The nonlinear-regression equation library (plan §5, Phase E1), TS side.
 *
 * This is PURE metadata — id, domain, label, and the parameter NAMES in fixed
 * order — for the Analyze dialog's equation picker, the options zod enum, and
 * the unit tests. The MODELS, the data-driven INITIAL-VALUE rules (the thing
 * that actually makes curve_fit converge), and default bounds live in the
 * trusted Python registry `_EQUATIONS` in runtime/analysis-templates.mjs, which
 * is the fit engine's source of truth — the same mirror relationship
 * `analyses.ts` (TS) has with `_ANALYSES` (Python).
 *
 * The parameter ORDER here is load-bearing: the per-parameter constraint arrays
 * (`fixValues` / `boundsLow` / `boundsHigh` in the options) are indexed by
 * position, so `params[i]` on this side is `_EQUATIONS[id]['params'][i]` on the
 * Python side. `scripts/analysis-smoke.mjs` fits every equation from data it
 * generated with known parameters, which is what proves the two stay in step.
 *
 * SECURITY: an equation id is an ENUM that only KEYS this registry — never a
 * user-supplied formula. User-defined free-text equations are deliberately
 * deferred (they would be untrusted code needing a restricted-expression
 * evaluator, not `exec`); see the schema note.
 */

export type EquationDomain =
  | 'Lines'
  | 'Exponential'
  | 'Dose-response'
  | 'Enzyme kinetics'
  | 'Binding'
  | 'Growth'
  | 'Peaks'
  | 'Oscillation'
  | 'Power'

export interface EquationDef {
  domain: EquationDomain
  label: string
  /** Parameter names, in the order the model takes them. Position is the key. */
  params: string[]
  /**
   * This equation IS `nestedIn` with one parameter fixed to a specific value
   * (e.g. dr-3param = dr-4param with HillSlope fixed to 1). Mirrors the
   * Python `_NESTED` map in analysis-templates.mjs, the source of truth the
   * fit engine actually gates the extra-sum-of-squares F test on — a
   * (primary, compareModel) pair only gets an F/p when one is `nestedIn` the
   * other; otherwise the engine reports AICc only. One line per new pair.
   * (Typed as a plain string, not `EquationId`, to avoid a circular type: this
   * interface is itself used to infer `EquationId` below.)
   */
  nestedIn?: string
}

export const EQUATIONS = {
  // ── Lines ────────────────────────────────────────────────────────────────
  line: { domain: 'Lines', label: 'Straight line', params: ['Slope', 'Intercept'] },
  'line-origin': {
    domain: 'Lines',
    label: 'Line through origin',
    params: ['Slope'],
    nestedIn: 'line',
  },
  // ── Exponential ──────────────────────────────────────────────────────────
  'exp-decay-1phase': {
    domain: 'Exponential',
    label: 'One-phase decay',
    params: ['Y0', 'Plateau', 'K'],
  },
  'exp-assoc-1phase': {
    domain: 'Exponential',
    label: 'One-phase association',
    params: ['Y0', 'Plateau', 'K'],
  },
  'exp-growth': { domain: 'Exponential', label: 'Exponential growth', params: ['Y0', 'K'] },
  // ── Dose-response ────────────────────────────────────────────────────────
  'dr-3param': {
    domain: 'Dose-response',
    label: 'log(dose) vs response (3-parameter, EC50)',
    params: ['Bottom', 'Top', 'logEC50'],
    nestedIn: 'dr-4param',
  },
  'dr-4param': {
    domain: 'Dose-response',
    label: 'log(dose) vs response (variable slope, 4-parameter Hill)',
    params: ['Bottom', 'Top', 'logEC50', 'HillSlope'],
  },
  // ── Enzyme kinetics ──────────────────────────────────────────────────────
  'michaelis-menten': {
    domain: 'Enzyme kinetics',
    label: 'Michaelis-Menten',
    params: ['Vmax', 'Km'],
  },
  // ── Binding ──────────────────────────────────────────────────────────────
  'one-site-binding': {
    domain: 'Binding',
    label: 'One-site specific binding',
    params: ['Bmax', 'Kd'],
  },
  // ── Growth ───────────────────────────────────────────────────────────────
  logistic: { domain: 'Growth', label: 'Logistic growth', params: ['L', 'k', 'x0'] },
  gompertz: { domain: 'Growth', label: 'Gompertz growth', params: ['A', 'B', 'C'] },
  // ── Peaks ────────────────────────────────────────────────────────────────
  gaussian: { domain: 'Peaks', label: 'Gaussian', params: ['Amp', 'Center', 'Width'] },
  // ── Oscillation ──────────────────────────────────────────────────────────
  sine: { domain: 'Oscillation', label: 'Sine wave', params: ['Amp', 'Freq', 'Phase', 'Offset'] },
  'damped-sine': {
    domain: 'Oscillation',
    label: 'Damped sine wave',
    params: ['Amp', 'Tau', 'Freq', 'Phase', 'Offset'],
  },
  // ── Power ────────────────────────────────────────────────────────────────
  power: { domain: 'Power', label: 'Power (y = a*x^b)', params: ['a', 'b'] },
} satisfies Record<string, EquationDef>

export type EquationId = keyof typeof EQUATIONS

/** Every equation id, for the zod enum that bounds a persisted analysis spec. */
export const EQUATION_IDS = Object.keys(EQUATIONS) as [EquationId, ...EquationId[]]

/** The def for an id, or undefined for an unknown one (e.g. an old saved spec). */
export function equationDef(id: string): EquationDef | undefined {
  return (EQUATIONS as Record<string, EquationDef>)[id]
}

/** Domains in first-seen order, each with its equations — drives the picker. */
export function equationsByDomain(): {
  domain: EquationDomain
  equations: { id: EquationId; def: EquationDef }[]
}[] {
  const order: EquationDomain[] = []
  const byDomain = new Map<EquationDomain, { id: EquationId; def: EquationDef }[]>()
  for (const [id, def] of Object.entries(EQUATIONS) as [EquationId, EquationDef][]) {
    if (!byDomain.has(def.domain)) {
      byDomain.set(def.domain, [])
      order.push(def.domain)
    }
    byDomain.get(def.domain)!.push({ id, def })
  }
  return order.map((domain) => ({ domain, equations: byDomain.get(domain)! }))
}
