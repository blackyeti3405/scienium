'use client'

import { BusyButton } from '@/components/ui/BusyButton'
import { shopBuilding } from '@/lib/shop'
import { sellRefund, upgradeKpCost, upgradeLcCost, MAX_BUILDING_LEVEL } from '@/lib/economy'
import type { PlacedEconomy } from '@/lib/hooks/usePlotBuildings'

/**
 * Regular-mode Sell + Upgrade menu for a placed economy building (no moving),
 * opened by clicking the building on the plot. Extracted verbatim from
 * `LabScene`.
 */
export function BuildingMenu({
  building: b,
  placing,
  sellingKey,
  upgradingKey,
  onSell,
  onUpgrade,
  onClose,
}: {
  building: PlacedEconomy
  /** True while a ghost's place/move POST is in flight (disables actions). */
  placing: boolean
  sellingKey: string | null
  upgradingKey: string | null
  onSell: (key: string) => void
  onUpgrade: (key: string) => void
  onClose: () => void
}) {
  const name = shopBuilding(b.key)?.name ?? b.key
  const maxed = b.level >= MAX_BUILDING_LEVEL
  const upKp = upgradeKpCost(shopBuilding(b.key)?.cost ?? 0, b.level + 1)
  const upLc = upgradeLcCost(b.level + 1)
  const upCostLabel = `${upKp.toLocaleString()} KP${upLc > 0 ? ` + ${upLc} LC` : ''}`
  return (
    <div className="plot-menu font-pixel">
      <span className="plot-menu__title">
        {name} · L{b.level}
      </span>
      <div className="plot-menu__actions">
        <BusyButton
          busy={sellingKey === b.key}
          busyLabel="Selling…"
          showSpinner={false}
          onClick={() => onSell(b.key)}
          disabled={placing || upgradingKey === b.key}
          className="plot-menu__sell"
        >
          Sell · +{sellRefund(b.costPaid).toLocaleString()} KP
        </BusyButton>
        {maxed ? (
          <span className="plot-menu__upgrade plot-menu__upgrade--max">Max level</span>
        ) : (
          <BusyButton
            busy={upgradingKey === b.key}
            busyLabel="Upgrading…"
            showSpinner={false}
            onClick={() => onUpgrade(b.key)}
            disabled={placing || sellingKey === b.key}
            className="plot-menu__upgrade"
          >
            Upgrade to L{b.level + 1} · {upCostLabel}
          </BusyButton>
        )}
      </div>
      <button
        type="button"
        className="plot-menu__close"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  )
}
