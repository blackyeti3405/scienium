'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Currency } from '@/components/lab/StatusStrip'

/**
 * Live currency state for the lab shell.
 *
 * The DB is the source of truth (currency is server-rendered into the scene),
 * but features award currency mid-session — e.g. a proficient literature-review
 * quiz grants KP. This context lets those features bump the balance optimistically
 * so the StatusStrip can animate the gain (tick-up + green balloon) without a
 * reload. Outside a provider it no-ops, so features remain safe to mount anywhere.
 */
interface LabCurrencyContextValue {
  currency: Currency
  /** Add a delta to one or more currencies (e.g. `{ kp: 80 }`). */
  addCurrency: (delta: Partial<Currency>) => void
  /** Reconcile one or more balances to server-authoritative absolute values. */
  setCurrency: (next: Partial<Currency>) => void
}

const ZERO: Currency = { kp: 0, clearanceLevel: 0, lc: 0 }

const LabCurrencyContext = createContext<LabCurrencyContextValue>({
  currency: ZERO,
  addCurrency: () => {},
  setCurrency: () => {},
})

export function LabCurrencyProvider({
  initial,
  children,
}: {
  initial: Currency
  children: (currency: Currency) => ReactNode
}) {
  const [currency, setCurrency] = useState<Currency>(initial)

  const addCurrency = useCallback((delta: Partial<Currency>) => {
    setCurrency((c) => ({
      kp: c.kp + (delta.kp ?? 0),
      clearanceLevel: c.clearanceLevel + (delta.clearanceLevel ?? 0),
      lc: c.lc + (delta.lc ?? 0),
    }))
  }, [])

  const setCurrencyValues = useCallback((next: Partial<Currency>) => {
    setCurrency((current) => ({ ...current, ...next }))
  }, [])

  return (
    <LabCurrencyContext.Provider
      value={{ currency, addCurrency, setCurrency: setCurrencyValues }}
    >
      {children(currency)}
    </LabCurrencyContext.Provider>
  )
}

export function useLabCurrency(): LabCurrencyContextValue {
  return useContext(LabCurrencyContext)
}
