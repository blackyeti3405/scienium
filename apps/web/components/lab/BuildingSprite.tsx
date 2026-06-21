'use client'

import { Sprite } from '@/components/lab/Sprite'
import { getGatewaySprite, UI_SPRITES, type GatewaySkin } from '@/lib/sprites/manifest'
import type { Gateway } from '@/lib/gateways'

/**
 * A single isometric gateway building in the lab cluster. Positioned by a pixel
 * offset (`dx`,`dy`) from the cluster centre and stacked by `zIndex` (iso depth).
 * Clicking an unlocked building opens its feature overlay; a locked building
 * shows a pixel padlock and is non-interactive (mirrors the server phase gate —
 * never the sole gate). zIndex stays well below the overlay panel.
 */
export function BuildingSprite({
  gateway,
  skin,
  dx,
  dy,
  zIndex,
  locked,
  lockedReason,
  scale = 2,
  onOpen,
}: {
  gateway: Gateway
  skin: GatewaySkin
  dx: number
  dy: number
  zIndex: number
  locked: boolean
  lockedReason?: string
  scale?: number
  onOpen: (gateway: Gateway) => void
}) {
  const sprite = getGatewaySprite(gateway.key, skin)
  const padlock = UI_SPRITES.padlock_closed

  const label = <span className="building-sprite__label font-pixel">{gateway.label}</span>

  const art = (
    <span className="building-sprite__art">
      <Sprite entry={sprite} scale={scale} />
      {locked && (
        <span className="building-sprite__padlock">
          <Sprite entry={padlock} scale={2} />
        </span>
      )}
    </span>
  )

  // Centre of the cluster is the viewport centre; offset each building from it.
  const style: React.CSSProperties = {
    left: `calc(50% + ${dx}px)`,
    top: `calc(50% + ${dy}px)`,
    zIndex,
  }

  if (locked) {
    return (
      <div
        className="building-sprite building-sprite--locked"
        style={style}
        title={lockedReason ?? 'Locked'}
        aria-disabled="true"
      >
        {art}
        {label}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="building-sprite building-sprite--open"
      style={style}
      onClick={() => onOpen(gateway)}
      title={gateway.hint}
      aria-label={`Open ${gateway.label}`}
    >
      {art}
      {label}
    </button>
  )
}
