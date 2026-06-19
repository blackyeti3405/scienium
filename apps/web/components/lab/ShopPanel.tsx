'use client'

import { useEffect, useRef } from 'react'
import { SHOP_BUILDINGS, type ShopBuilding } from '@/lib/shop'
import type { Currency } from '@/components/lab/StatusStrip'

/**
 * The Buildings shop — a rectangular overlay that opens from the bottom-right
 * shop button (spec §"buildings"). Buildings only, no tabs: a single horizontally
 * scrolling shelf laid out as two rows of square cards, with the team's three
 * currencies pinned along the bottom. Matches the lab's pixel-frame chrome
 * (chunky border, pixel-font labels, gold accents). Escape / backdrop closes.
 *
 * Costs scale with the live team size (Feature 1c): a building costs
 * `baseCost × memberCount`, so a bigger lab — which earns proportionally more KP
 * across its members — pays proportionally more to build. The multiplier is shown
 * up front when the team has more than one member.
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
  const multiplier = Math.max(1, memberCount)

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

        {/* Two-row, horizontally scrolling shelf of building cards. */}
        <div className="shop-panel__shelf">
          <div className="shop-panel__grid">
            {SHOP_BUILDINGS.map((b) => {
              const cost = b.cost * multiplier
              return (
                <ShopCard
                  key={b.key}
                  building={b}
                  cost={cost}
                  affordable={currency.kp >= cost}
                />
              )
            })}
          </div>
        </div>

        {/* Currencies pinned along the bottom (reference layout). */}
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
  affordable,
}: {
  building: ShopBuilding
  cost: number
  affordable: boolean
}) {
  return (
    <div className="shop-card">
      <div className="shop-card__image" aria-hidden="true">
        <span className="font-pixel shop-card__placeholder">{building.name}</span>
      </div>
      <span className="shop-card__name font-pixel">{building.name}</span>
      <span
        className={`shop-card__cost font-pixel${affordable ? '' : ' shop-card__cost--short'}`}
        title="Knowledge Points"
      >
        <span className="shop-card__coin" aria-hidden="true" />
        {cost.toLocaleString()}
      </span>
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
