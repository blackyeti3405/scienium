'use client'

import { useEffect, useRef, useState } from 'react'
import { Lock, Check, Loader2 } from 'lucide-react'
import { SHOP_BUILDINGS, type ShopBuilding } from '@/lib/shop'
import { clearanceTitle } from '@/lib/clearance/expertise'
import { useLabCurrency } from '@/lib/labCurrency'
import type { Currency } from '@/components/lab/StatusStrip'

/**
 * The Buildings shop — a rectangular overlay that opens from the bottom-right
 * shop button (spec §"buildings"). A single horizontally scrolling shelf of cards
 * with the team's three currencies pinned along the bottom. Matches the lab's
 * pixel-frame chrome (chunky border, pixel-font labels, gold accents).
 *
 * Two gates apply (mirrored from POST /api/buildings):
 *   • KP — `baseCost × memberCount` (Feature 1c): a bigger lab pays proportionally.
 *   • Clearance — the team's Clearance Level (raised by Proof of Expertise) must
 *     meet the building's tier. This is the ceiling the shop pushes against: the
 *     best structures can't be grinded into without proving expertise.
 */
export function ShopPanel({
  currency,
  memberCount,
  onClose,
}: {
  currency: Currency
  memberCount: number
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { addCurrency } = useLabCurrency()
  const multiplier = Math.max(1, memberCount)

  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [buyingKey, setBuyingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/buildings')
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.owned)) setOwned(new Set(d.owned))
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  async function purchase(b: ShopBuilding, cost: number) {
    setError(null)
    setBuyingKey(b.key)
    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: b.key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Purchase failed')
      setOwned((prev) => new Set(prev).add(b.key))
      addCurrency({ kp: -cost }) // optimistic StatusStrip update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setBuyingKey(null)
    }
  }

  return (
    <div
      className="shop-panel__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Buildings shop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="shop-panel">
        <header className="shop-panel__bar">
          <span className="shop-panel__title font-pixel">⚒ Buildings</span>
          <span className="shop-panel__clearance font-pixel" title="Clearance Level — raised by Proof of Expertise">
            CLR {currency.clearanceLevel} · {clearanceTitle(currency.clearanceLevel)}
          </span>
          {multiplier > 1 && (
            <span className="shop-panel__scale font-pixel" title="Costs scale with your lab size">
              ×{multiplier} · {multiplier}-student lab
            </span>
          )}
          <button
            ref={closeRef}
            type="button"
            className="shop-panel__close font-pixel"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {error && <p className="shop-panel__error font-pixel">{error}</p>}

        <div className="shop-panel__shelf">
          <div className="shop-panel__grid">
            {SHOP_BUILDINGS.map((b) => {
              const cost = b.cost * multiplier
              return (
                <ShopCard
                  key={b.key}
                  building={b}
                  cost={cost}
                  owned={owned.has(b.key)}
                  clearance={currency.clearanceLevel}
                  affordable={currency.kp >= cost}
                  busy={buyingKey === b.key}
                  disabled={loading || buyingKey !== null}
                  onBuy={() => purchase(b, cost)}
                />
              )
            })}
          </div>
        </div>

        <footer className="shop-panel__currencies">
          <CurrencyChip label="KP" value={currency.kp} title="Knowledge Points" color="#ffe566" />
          <CurrencyChip
            label="CLR"
            value={currency.clearanceLevel}
            title="Clearance Level"
            color="#7ff2e3"
          />
          <CurrencyChip label="LC" value={currency.lc} title="Lab Credits" color="#ffb24d" />
        </footer>
      </div>
    </div>
  )
}

function ShopCard({
  building,
  cost,
  owned,
  clearance,
  affordable,
  busy,
  disabled,
  onBuy,
}: {
  building: ShopBuilding
  cost: number
  owned: boolean
  clearance: number
  affordable: boolean
  busy: boolean
  disabled: boolean
  onBuy: () => void
}) {
  const locked = clearance < building.minClearance
  const buyable = !owned && !locked && affordable && !disabled

  return (
    <div className={`shop-card${owned ? ' shop-card--owned' : ''}${locked ? ' shop-card--locked' : ''}`}>
      <div className="shop-card__image" aria-hidden="true">
        <span className="font-pixel shop-card__placeholder">{building.name}</span>
        {owned && (
          <span className="shop-card__owned-badge font-pixel">
            <Check size={9} /> OWNED
          </span>
        )}
        {locked && !owned && (
          <span className="shop-card__lock" title={`Requires Clearance Level ${building.minClearance}`}>
            <Lock size={13} />
            <span className="font-pixel">CLR {building.minClearance}</span>
          </span>
        )}
      </div>
      <span className="shop-card__name font-pixel">{building.name}</span>

      {owned ? (
        <span className="shop-card__status shop-card__status--owned font-pixel">In your lab</span>
      ) : locked ? (
        <span className="shop-card__status shop-card__status--locked font-pixel">
          Clearance {building.minClearance} required
        </span>
      ) : (
        <button
          type="button"
          className={`shop-card__buy font-pixel${affordable ? '' : ' shop-card__buy--short'}`}
          onClick={onBuy}
          disabled={!buyable}
          title={affordable ? 'Purchase' : 'Not enough Knowledge Points'}
        >
          {busy ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <>
              <span className="shop-card__coin" aria-hidden="true" />
              {cost.toLocaleString()}
            </>
          )}
        </button>
      )}

      <span className="shop-card__desc">{building.description}</span>
    </div>
  )
}

function CurrencyChip({
  label,
  value,
  title,
  color,
}: {
  label: string
  value: number
  title: string
  color: string
}) {
  return (
    <span className="font-pixel shop-panel__currency" title={title}>
      <span style={{ color }}>{label}</span>
      <span className="shop-panel__currency-value">{value.toLocaleString()}</span>
    </span>
  )
}
