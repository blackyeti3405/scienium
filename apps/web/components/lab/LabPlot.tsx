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
  STEP_X,
  STEP_Y,
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
  const cursorRef = useRef<HTMLButtonElement>(null)
  const suppressClickRef = useRef(false)
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dims = useElementSize(ref)
  const [hover, setHover] = useState<IsoPos | null>(null)

  // Clear the suppress-click timer on unmount so a pending 0ms reset never fires
  // after the plot (and its refs) are gone.
  useEffect(() => () => clearTimeout(suppressClickTimerRef.current), [])

  // Identifies the active ghost by what it IS (kind + key), not by the `ghost`
  // object reference — a new plain object is built on every parent render
  // whether or not the ghost actually changed, and keying off that would
  // re-focus/reset the keyboard cursor on unrelated re-renders (a toast, a
  // burst animation, ...).
  const ghostId = ghost ? `${ghost.kind}:${ghost.key}` : null

  // Seed (or clear) the hover cell when a ghost starts (or ends). A pick-up
  // already seeds `hover` to the building's own cell (see onPointerDownItem /
  // the keyboard branch of onClickItem below); this only supplies a default
  // for a brand-new placement, which has no existing cell to start from.
  useEffect(() => {
    setHover((prev) => (ghostId ? prev ?? { gx: 0, gy: 0 } : null))
  }, [ghostId])

  // Move keyboard focus onto the placement cursor as soon as a ghost is
  // attached — otherwise it is a new focusable element a keyboard user would
  // have no way to discover. Symmetrically, once a ghost that WAS active goes
  // away (a commit, Escape, or a right-click cancel — every exit is a `ghost`
  // → null transition, wherever it originates), focus returns to the plot
  // itself rather than being dropped to <body>. `prevGhostId` guards the
  // initial mount (ghostId starts null; nothing should steal focus then).
  const prevGhostId = useRef<string | null>(null)
  useEffect(() => {
    if (ghostId) cursorRef.current?.focus()
    else if (prevGhostId.current) ref.current?.focus()
    prevGhostId.current = ghostId
  }, [ghostId])

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
      if (arrangeMode) {
        // A pointer click's pick-up already ran on pointerdown below. A
        // KEYBOARD activation (Enter/Space on this real <button>) has no
        // pointerdown of its own and fires a click with `detail === 0` — the
        // only path a keyboard user has into arrange-mode pick-up.
        if (e.detail === 0) {
          setHover({ gx: item.gx, gy: item.gy })
          onPick(kind, item.key, { gx: item.gx, gy: item.gy })
        }
        return
      }
      if (kind === 'gateway') onOpenGateway(item.key)
      else onSelectEconomy(item.key) // regular click on an economy building → Sell/Upgrade menu
    }

    function onPointerDownItem(e: React.PointerEvent) {
      if (!arrangeMode || ghost) return
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = true
      clearTimeout(suppressClickTimerRef.current)
      suppressClickTimerRef.current = setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      setHover({ gx: item.gx, gy: item.gy })
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
  const ghostLabel = ghost
    ? ghost.kind === 'gateway'
      ? GATEWAY_LABEL.get(ghost.key) ?? ghost.key
      : shopBuilding(ghost.key)?.name ?? ghost.key
    : null

  /**
   * Keyboard placement — the accessible path onto the same grid a pointer drop
   * uses. Arrow keys move the (already-existing) `hover` cell one step along
   * each grid axis; Enter/Space commits through the SAME `onDrop` callback and
   * the SAME `isPlaceable`/`occupied` check a pointer click uses below, so a
   * cell can never be legal by one input method and not the other. Escape is
   * NOT handled here — the ghost is already cancelled from anywhere by the
   * document-level Escape listener in usePlotBuildings.
   */
  function onCursorKeyDown(e: React.KeyboardEvent) {
    if (!hover) return
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setHover({ gx: hover.gx, gy: hover.gy - 1 })
        break
      case 'ArrowDown':
        e.preventDefault()
        setHover({ gx: hover.gx, gy: hover.gy + 1 })
        break
      case 'ArrowLeft':
        e.preventDefault()
        setHover({ gx: hover.gx - 1, gy: hover.gy })
        break
      case 'ArrowRight':
        e.preventDefault()
        setHover({ gx: hover.gx + 1, gy: hover.gy })
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        // Invalid cell: do nothing, same as an invalid pointer click (per spec).
        // Focus return to the plot on commit is handled by the ghostId effect
        // above (the same path Escape/right-click cancel already use).
        if (isPlaceable(hover.gx, hover.gy, occupied)) onDrop(hover.gx, hover.gy)
        break
      default:
        break
    }
  }

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
      tabIndex={-1}
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

      {/* Keyboard placement target: a single real <button> moved across cells by
          arrow keys (roving cursor, not one focusable element per cell — the
          grid is 7×7 and a 49-stop tab sequence would be its own accessibility
          problem). Its accessible name states the destination in the terms the
          verdict asked for; its visible focus ring comes free from the app-wide
          `:focus-visible` rule (globals.css) since it's a real button. */}
      {ghost && hover && (
        (() => {
          const { dx, dy } = cellToScreen(hover.gx, hover.gy)
          const cx = centerX + dx
          const cy = centerY + dy
          return (
            <button
              ref={cursorRef}
              type="button"
              className="plot-cursor"
              style={{
                left: cx - STEP_X,
                top: cy - STEP_Y,
                width: STEP_X * 2,
                height: STEP_Y * 2,
                zIndex: 20 + depth(hover.gx, hover.gy) * 2 + 2,
              }}
              onKeyDown={onCursorKeyDown}
              aria-label={`Place ${ghostLabel} at column ${hover.gx}, row ${hover.gy}${
                hoverValid ? '' : ' — occupied, choose another cell'
              }`}
            />
          )
        })()
      )}

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
