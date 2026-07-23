'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sprite } from '@/components/lab/Sprite'
import { getBuildingSprite, getGatewaySprite, type GatewaySkin, type GatewayKey } from '@/lib/sprites/manifest'
import { GATEWAYS } from '@/lib/gateways'
import { shopBuilding } from '@/lib/shop'
import {
  ALL_CELLS,
  CLUSTER_Y,
  FOOT_HALF_Y,
  cellKey,
  cellToScreen,
  depth,
  diamondPoints,
  isPlaceable,
  screenToCell,
  type IsoPos,
} from '@/lib/plot'
import type { SpriteEntry } from '@/lib/sprites/manifest'
import type { LabType } from '@/lib/phase'
import { useElementSize } from '@/lib/hooks/useElementSize'

/** Sprites render at 2× on the plot (64px source → 128px). */
const PLOT_SCALE = 2

/**
 * Where to put a sprite so its footprint anchor (ground-contact point) lands on a
 * tile's FRONT vertex — the bottom tip of the diamond — so the building's base
 * sits centred on the tile. Returns CSS left/top offsets from the cluster centre
 * (50%/50%), plus the anchor in display px for placing the label.
 */
function placeSprite(sprite: SpriteEntry, dx: number, dy: number) {
  const ax = (sprite.anchor?.ax ?? sprite.srcWidth / 2) * PLOT_SCALE
  const ay = (sprite.anchor?.ay ?? sprite.srcHeight) * PLOT_SCALE
  // Anchor by the FOOTPRINT half-height (not the tile size), so the building's
  // base centroid lands on the tile centre and stays centred when tiles grow.
  return {
    left: `calc(50% + ${dx - ax}px)`,
    top: `calc(50% + ${CLUSTER_Y + dy + FOOT_HALF_Y - ay}px)`,
    ax,
    ay,
  }
}

/** A building positioned on the plot — `key` is the shop/gateway key. */
export interface PlacedItem {
  key: string
  gx: number
  gy: number
  /** Economy building upgrade level (1 = base; ≥ 4 = tier-2 sprite). Absent for gateways. */
  level?: number
}

/** The building currently attached to the cursor (placement or move). */
export interface PlotGhost {
  kind: 'economy' | 'gateway'
  key: string
  /** Level of an economy building being moved — drives tier-2 ghost sprite. */
  level?: number
}

interface LabPlotProps {
  labType: LabType | null
  skin: GatewaySkin
  gateways: PlacedItem[]
  economy: PlacedItem[]
  /** When true, clicks pick buildings up to move instead of opening gateways. */
  arrangeMode: boolean
  /** Building attached to the cursor; the grid + footprint preview show while set. */
  ghost: PlotGhost | null
  onOpenGateway: (key: string) => void
  onPick: (kind: 'economy' | 'gateway', key: string, from: IsoPos) => void
  /** Drop the ghost on a (validated) cell. No-op caller-side if invalid. */
  onDrop: (gx: number, gy: number) => void
  /** Cancel the active ghost (Esc / right-click). */
  onCancel: () => void
  /** Report the building under the cursor (its label), or null — shown top-of-screen. */
  onHoverBuilding: (label: string | null) => void
  /** Regular-mode click on a placed economy building (opens Sell/Upgrade); null = deselect. */
  onSelectEconomy: (key: string | null) => void
}

const GATEWAY_LABEL = new Map<string, string>(GATEWAYS.map((g) => [g.key, g.label]))
const GATEWAY_HINT = new Map<string, string>(GATEWAYS.map((g) => [g.key, g.hint]))

export function LabPlot({
  labType,
  skin,
  gateways,
  economy,
  arrangeMode,
  ghost,
  onOpenGateway,
  onPick,
  onDrop,
  onCancel,
  onHoverBuilding,
  onSelectEconomy,
}: LabPlotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const suppressClickRef = useRef(false)
  const dims = useElementSize(ref)
  const [hover, setHover] = useState<IsoPos | null>(null)

  // Clear the hover preview whenever the ghost goes away.
  useEffect(() => {
    if (!ghost) setHover(null)
  }, [ghost])

  const centerX = dims.w / 2
  const centerY = dims.h / 2 + CLUSTER_Y
  const gridVisible = arrangeMode || ghost !== null

  // Cells occupied by every building currently on the plot. The picked-up building
  // is already removed from `gateways`/`economy` by the parent, so a move can drop
  // back onto its own cell.
  const occupied = useMemo(() => {
    const cells = new Set<string>()
    for (const g of gateways) cells.add(cellKey(g.gx, g.gy))
    for (const e of economy) cells.add(cellKey(e.gx, e.gy))
    return cells
  }, [economy, gateways])

  const hoverValid = hover ? isPlaceable(hover.gx, hover.gy, occupied) : false

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current
      if (!el || !ghost) return
      const rect = el.getBoundingClientRect()
      const px = clientX - rect.left - rect.width / 2
      const py = clientY - rect.top - (rect.height / 2 + CLUSTER_Y)
      const cell = screenToCell(px, py)
      setHover((prev) => (prev && prev.gx === cell.gx && prev.gy === cell.gy ? prev : cell))
    },
    [ghost],
  )

  function handleMouseMove(e: React.MouseEvent) {
    if (ghost) updateHover(e.clientX, e.clientY)
  }

  function handleClick(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!ghost) {
      // Background click in regular mode → deselect any open Sell/Upgrade menu.
      // (Building clicks stopPropagation, so this only fires on empty space.)
      if (!arrangeMode) onSelectEconomy(null)
      return
    }
    // Compute the cell directly from the click so a fast click without a prior
    // move still drops on the right tile.
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = e.clientX - rect.left - rect.width / 2
    const py = e.clientY - rect.top - (rect.height / 2 + CLUSTER_Y)
    const cell = screenToCell(px, py)
    if (isPlaceable(cell.gx, cell.gy, occupied)) onDrop(cell.gx, cell.gy)
    // Invalid click: do nothing, keep the building attached (per spec).
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (!ghost) return
    e.preventDefault()
    onCancel()
  }

  // Resolve a placed item to its sprite + label for rendering.
  const renderItem = useCallback((kind: 'economy' | 'gateway', item: PlacedItem) => {
    const { dx, dy } = cellToScreen(item.gx, item.gy)
    const interactive = !ghost
    const sprite =
      kind === 'gateway'
        ? getGatewaySprite(item.key as GatewayKey, skin)
        : labType
          ? getBuildingSprite(labType, shopBuilding(item.key)?.sprite ?? '', item.level ?? 1)
          : null
    if (!sprite) return null
    const label =
      kind === 'gateway' ? GATEWAY_LABEL.get(item.key) ?? item.key : shopBuilding(item.key)?.name ?? item.key

    const className = [
      'plot-building',
      interactive ? 'plot-building--interactive' : 'plot-building--inert',
      arrangeMode ? 'plot-building--arrange' : '',
    ]
      .filter(Boolean)
      .join(' ')

    function onClickItem(e: React.MouseEvent) {
      if (ghost) return // drops are handled by the container
      e.stopPropagation()
      if (arrangeMode) return // pointer-down picks up immediately
      else if (kind === 'gateway') onOpenGateway(item.key)
      else onSelectEconomy(item.key) // regular click on an economy building → Sell/Upgrade menu
    }

    function onPointerDownItem(e: React.PointerEvent) {
      if (!arrangeMode || ghost) return
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      onPick(kind, item.key, { gx: item.gx, gy: item.gy })
    }

    // Accessible name: arrange mode → "Move X"; normal mode a gateway opens its
    // feature ("Open X", the convention the rest of the app + E2E rely on); a
    // normal-mode economy building is inert and just labelled by name.
    const name = arrangeMode
      ? `Move ${label}`
      : kind === 'gateway'
        ? `Open ${label}`
        : label
    const tooltip = arrangeMode
      ? `Move ${label}`
      : kind === 'gateway'
        ? GATEWAY_HINT.get(item.key) ?? label
        : label

    const pos = placeSprite(sprite, dx, dy)
    return (
      <button
        key={`${kind}-${item.key}`}
        type="button"
        className={className}
        style={{
          left: pos.left,
          top: pos.top,
          zIndex: 20 + depth(item.gx, item.gy) * 2,
        }}
        onPointerDown={onPointerDownItem}
        onClick={onClickItem}
        onMouseEnter={() => onHoverBuilding(label)}
        onMouseLeave={() => onHoverBuilding(null)}
        title={tooltip}
        aria-label={name}
      >
        {/* The button box is a transparent rectangle that overlaps neighbours in
            iso; restrict the actual pointer-hit region to the sprite silhouette
            (clip-path clips hit-testing too) so a real click lands on the
            building under the cursor, not a neighbour's transparent corner. */}
        <span className="plot-building__hit">
          <span className="plot-building__art">
            <Sprite entry={sprite} scale={PLOT_SCALE} />
          </span>
        </span>
        {kind === 'economy' && (
          <span className="plot-level font-pixel">L{item.level ?? 1}</span>
        )}
      </button>
    )
  }, [
    arrangeMode,
    ghost,
    labType,
    onHoverBuilding,
    onOpenGateway,
    onPick,
    onSelectEconomy,
    skin,
  ])

  // Ghost preview sprite (attached to the cursor's snapped cell).
  const ghostSprite = ghost
    ? ghost.kind === 'gateway'
      ? getGatewaySprite(ghost.key as GatewayKey, skin)
      : labType
        ? getBuildingSprite(labType, shopBuilding(ghost.key)?.sprite ?? '', ghost.level ?? 1)
        : null
    : null

  const renderedItems = useMemo(
    () =>
      [
        ...gateways.map((item) => ({ kind: 'gateway' as const, item })),
        ...economy.map((item) => ({ kind: 'economy' as const, item })),
      ]
        .sort((a, b) => depth(a.item.gx, a.item.gy) - depth(b.item.gx, b.item.gy))
        .map(({ kind, item }) => renderItem(kind, item)),
    [economy, gateways, renderItem],
  )

  return (
    <div
      ref={ref}
      className={`lab-plot${gridVisible ? ' lab-plot--editing' : ''}`}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {gridVisible && dims.w > 0 && (
        <svg className="lab-plot__grid" width={dims.w} height={dims.h} aria-hidden="true">
          {ALL_CELLS.map(({ gx, gy }) => {
            const { dx, dy } = cellToScreen(gx, gy)
            const isHover = hover?.gx === gx && hover?.gy === gy
            const cls = isHover
              ? hoverValid
                ? 'lab-plot__cell lab-plot__cell--valid'
                : 'lab-plot__cell lab-plot__cell--invalid'
              : 'lab-plot__cell'
            return (
              <polygon key={cellKey(gx, gy)} className={cls} points={diamondPoints(centerX + dx, centerY + dy)} />
            )
          })}
        </svg>
      )}

      {renderedItems}

      {ghost && ghostSprite && hover && (() => {
        const { dx, dy } = cellToScreen(hover.gx, hover.gy)
        const pos = placeSprite(ghostSprite, dx, dy)
        return (
          <span
            className={`plot-ghost ${hoverValid ? 'plot-ghost--valid' : 'plot-ghost--invalid'}`}
            style={{
              left: pos.left,
              top: pos.top,
              zIndex: 20 + depth(hover.gx, hover.gy) * 2 + 1,
            }}
            aria-hidden="true"
          >
            <Sprite entry={ghostSprite} scale={PLOT_SCALE} />
          </span>
        )
      })()}
    </div>
  )
}
