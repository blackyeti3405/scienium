'use client'

import { useEffect, useRef } from 'react'
import { ModalBackdrop } from '@/components/ui/ModalBackdrop'
import { Lock } from 'lucide-react'
import { shopBuildingsForLabType, type ShopBuilding } from '@/lib/shop'
import { clearanceTitle } from '@/lib/clearance/expertise'
import { Sprite } from '@/components/lab/Sprite'
import { getBuildingSprite, getGatewaySprite, type GatewaySkin, type SpriteEntry } from '@/lib/sprites/manifest'
import { GATEWAYS } from '@/lib/gateways'
import type { LabType } from '@/lib/phase'
import type { Currency } from '@/components/lab/StatusStrip'

/**
 * The Buildings shop — a rectangular overlay that opens from the bottom-right
 * shop button (spec §"buildings"). A single horizontally scrolling shelf of cards
 * with the team's three currencies pinned along the bottom. Matches the lab's
 * pixel-frame chrome (chunky border, pixel-font labels, gold accents).
 *
 * Picking an economy building here doesn't buy it outright — it hands the building
 * to the plot as a cursor ghost (`onPlace`); the KP is debited when it's dropped
 * (POST /api/buildings/place). The 7 gateway buildings are shown greyed-out as
 * "Already placed" since they're the navigation spine, not purchasable.
 *
 * Two gates apply (mirrored on the server in lib/economy.ts):
 *   • KP — `baseCost × memberCount` (Feature 1c): a bigger lab pays proportionally.
 *   • Clearance — the team's Clearance Level (raised by Proof of Expertise) must
 *     meet the building's tier. This is the ceiling the shop pushes against.
 */
export function ShopPanel({
  currency,
  memberCount,
  labType,
  ownedKeys,
  unplacedKeys,
  onPlace,
  onClose,
}: {
  currency: Currency
  memberCount: number
  /** The team's lab type — gates lab-type-specific buildings (e.g. Volt Lab). */
  labType: LabType | null
  /** Economy keys already placed on the plot. */
  ownedKeys: ReadonlySet<string>
  /** Economy keys owned but not yet positioned (free to place). */
  unplacedKeys: ReadonlySet<string>
  /** Begin placing a building on the plot; `owned` = already paid for (free). */
  onPlace: (building: ShopBuilding, owned: boolean) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const multiplier = Math.max(1, memberCount)
  const buildings = shopBuildingsForLabType(labType)
  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  return (
    <ModalBackdrop
      label="Buildings shop"
      onClose={onClose}
      initialFocusRef={closeRef}
      className="shop-panel__backdrop"
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

        <div className="shop-panel__shelf">
          <div className="shop-panel__grid">
            {buildings.map((b) => {
              const cost = b.cost * multiplier
              return (
                <ShopCard
                  key={b.key}
                  building={b}
                  labType={labType}
                  cost={cost}
                  placed={ownedKeys.has(b.key)}
                  unplaced={unplacedKeys.has(b.key)}
                  clearance={currency.clearanceLevel}
                  affordable={currency.kp >= cost}
                  onPlace={onPlace}
                />
              )
            })}
            {GATEWAYS.map((g) => (
              <GatewayCard key={g.key} label={g.label} sprite={getGatewaySprite(g.key, skin)} />
            ))}
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
    </ModalBackdrop>
  )
}

function ShopCard({
  building,
  labType,
  cost,
  placed,
  unplaced,
  clearance,
  affordable,
  onPlace,
}: {
  building: ShopBuilding
  labType: LabType | null
  cost: number
  placed: boolean
  unplaced: boolean
  clearance: number
  affordable: boolean
  onPlace: (building: ShopBuilding, owned: boolean) => void
}) {
  const locked = clearance < building.minClearance
  const sprite = labType && building.sprite ? getBuildingSprite(labType, building.sprite) : null

  return (
    <div
      className={`shop-card${placed ? ' shop-card--owned' : ''}${locked && !placed && !unplaced ? ' shop-card--locked' : ''}`}
    >
      <div className="shop-card__image" aria-hidden="true">
        {sprite ? (
          <Sprite entry={sprite} scale={3} />
        ) : (
          <span className="font-pixel shop-card__placeholder">{building.name}</span>
        )}
        {locked && !placed && !unplaced && (
          <span className="shop-card__lock" title={`Requires Clearance Level ${building.minClearance}`}>
            <Lock size={13} />
            <span className="font-pixel">CLR {building.minClearance}</span>
          </span>
        )}
      </div>
      <span className="shop-card__name font-pixel">{building.name}</span>

      {placed ? (
        <span className="shop-card__status shop-card__status--owned font-pixel">In your lab</span>
      ) : unplaced ? (
        <button
          type="button"
          className="shop-card__buy font-pixel"
          onClick={() => onPlace(building, true)}
          title="Place this building (already owned)"
        >
          Place
        </button>
      ) : locked ? (
        <span className="shop-card__status shop-card__status--locked font-pixel">
          Clearance {building.minClearance} required
        </span>
      ) : (
        <button
          type="button"
          className={`shop-card__buy font-pixel${affordable ? '' : ' shop-card__buy--short'}`}
          onClick={() => onPlace(building, false)}
          disabled={!affordable}
          title={affordable ? 'Place on your plot' : 'Not enough Knowledge Points'}
        >
          <span className="shop-card__coin" aria-hidden="true" />
          {cost.toLocaleString()}
        </button>
      )}

      <span className="shop-card__desc">{building.description}</span>
    </div>
  )
}

/**
 * A gateway building card — the 7 navigation buildings (lib/gateways.ts) shown in
 * the shop greyed-out and marked "Already placed". They are the lab's permanent
 * navigation spine, not purchasable, so the card is non-interactive and exists
 * only to show the full roster of structures on the plot.
 */
function GatewayCard({ label, sprite }: { label: string; sprite: SpriteEntry }) {
  return (
    <div className="shop-card shop-card--placed" aria-hidden="true">
      <div className="shop-card__image">
        <Sprite entry={sprite} scale={3} />
      </div>
      <span className="shop-card__name font-pixel">{label}</span>
      <span className="shop-card__status shop-card__status--placed font-pixel">Already placed</span>
      <span className="shop-card__desc">Gateway building — part of your lab&apos;s navigation.</span>
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
