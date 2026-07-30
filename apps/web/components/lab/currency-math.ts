import type { Currency } from '@/components/lab/StatusStrip'

/**
 * The arithmetic behind `LabCurrencyProvider`, in a `.ts` so it can be tested —
 * nothing in a `.tsx` is, here (vitest has no JSX transform in this repo).
 *
 * `?? 0` guards a missing field but not a present-and-broken one. A response
 * body that omits `newClearance` produces `undefined`, arithmetic on it produces
 * `NaN`, and `NaN` is absorbing: once it lands in the balance every later delta
 * keeps it, so the StatusStrip reads "NaN KP" until the student reloads. This
 * layer is optimistic display over a server-authoritative balance, so the right
 * answer to a value that is not a finite number is to ignore it and let the next
 * server read reconcile — never to render arithmetic nobody can undo.
 */
const finite = (n: number | undefined): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

/** Add a delta to the current balance, ignoring any non-finite component. */
export function applyCurrencyDelta(current: Currency, delta: Partial<Currency>): Currency {
  return {
    kp: current.kp + finite(delta.kp),
    clearanceLevel: current.clearanceLevel + finite(delta.clearanceLevel),
    lc: current.lc + finite(delta.lc),
  }
}

/**
 * Reconcile to server-authoritative absolute values. A non-finite field keeps
 * the value it had rather than overwriting a good balance with a broken one.
 */
export function applyCurrencyValues(current: Currency, next: Partial<Currency>): Currency {
  const keep = (key: keyof Currency): number => {
    const v = next[key]
    return typeof v === 'number' && Number.isFinite(v) ? v : current[key]
  }
  return { kp: keep('kp'), clearanceLevel: keep('clearanceLevel'), lc: keep('lc') }
}
