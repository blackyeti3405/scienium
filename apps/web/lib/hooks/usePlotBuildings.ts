'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlacedItem, PlotGhost } from '@/components/lab/LabPlot'
import { useLabCurrency } from '@/components/lab/labCurrency'
import { shopBuilding, type ShopBuilding } from '@/lib/shop'
import { upgradeKpCost, upgradeLcCost, MAX_BUILDING_LEVEL } from '@/lib/economy'
import type { IsoPos } from '@/lib/plot'
import { useAutoDismiss } from '@/lib/hooks/useAutoDismiss'

/** An economy building placed on the plot (key = shop building key). */
export interface PlacedEconomy {
  key: string
  gx: number
  gy: number
  costPaid: number
  level: number
}

/** A gateway's effective position (per-team override or its default cell). */
export interface PlacedGateway {
  key: string
  gx: number
  gy: number
}

/** The building attached to the cursor — a placement, or a pick-up move. */
export type Ghost =
  | { mode: 'new'; building: ShopBuilding }
  | { mode: 'place-owned'; building: ShopBuilding }
  | { mode: 'move-economy'; key: string; from: IsoPos; costPaid: number; level: number }
  | { mode: 'move-gateway'; key: string; from: IsoPos }

/**
 * Plot-building state machine for the lab scene: owns the authoritative client
 * mirror of the DB plot (economy buildings, gateway positions, unplaced keys)
 * and the optimistic place/move/sell/upgrade handlers with rollback +
 * server-resync, extracted verbatim from `LabScene`. Must render inside
 * `LabCurrencyProvider` (spends/refunds go through `useLabCurrency`).
 */
export function usePlotBuildings({
  placedBuildings,
  unplacedKeys,
  gatewayPositions,
  memberCount,
}: {
  /** Economy buildings already placed on the plot (SSR seed). */
  placedBuildings: PlacedEconomy[]
  /** Economy buildings owned but not yet positioned (legacy rows). */
  unplacedKeys: string[]
  /** Effective gateway positions (SSR seed). */
  gatewayPositions: PlacedGateway[]
  /** Live team size — building costs scale by it (Feature 1c). */
  memberCount: number
}) {
  const { addCurrency, setCurrency } = useLabCurrency()

  // Plot state — authoritative client mirror of the DB, seeded from SSR props.
  const [economy, setEconomy] = useState<PlacedEconomy[]>(placedBuildings)
  const [gateways, setGateways] = useState<PlacedGateway[]>(gatewayPositions)
  const [unplaced, setUnplaced] = useState<string[]>(unplacedKeys)
  const [arrangeMode, setArrangeMode] = useState(false)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  /** A placed economy building clicked in REGULAR mode → opens its Sell/Upgrade menu. */
  const [selected, setSelected] = useState<string | null>(null)
  /** True while the current ghost's place/move POST is in flight — pulses the
   *  ghost sprite so a 1–3s round trip doesn't look unresponsive. */
  const [placing, setPlacing] = useState(false)
  /** Building key currently mid-sell or mid-upgrade (drives the menu's BusyButtons). */
  const [sellingKey, setSellingKey] = useState<string | null>(null)
  const [upgradingKey, setUpgradingKey] = useState<string | null>(null)
  /** Transient green particle burst over a just-upgraded building. */
  const [burst, setBurst] = useState<{ gx: number; gy: number; id: number } | null>(null)
  const burstSeq = useRef(0)
  const [toast, setToast] = useState<string | null>(null)

  // Auto-dismiss the toast.
  useAutoDismiss(toast, () => setToast(null), 2600)

  // Clear the upgrade particle burst after it plays (rise + small stagger).
  useAutoDismiss(burst, () => setBurst(null), 1100)

  const cancelGhost = useCallback(() => setGhost(null), [])

  // Esc closes the Sell/Upgrade menu first, then the active ghost, then arrange mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selected) setSelected(null)
      else if (ghost) setGhost(null)
      else if (arrangeMode) setArrangeMode(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ghost, arrangeMode, selected])

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
    return data
  }

  async function refreshPlotState() {
    try {
      const res = await fetch('/api/buildings')
      if (!res.ok) return
      const data = await res.json()
      setEconomy(data.economy)
      setGateways(data.gateways)
      setUnplaced(data.unplaced)
      setCurrency({ kp: data.kp, lc: data.lc, clearanceLevel: data.clearanceLevel })
    } catch {
      // Immediate rollback already restored the previous local state.
    }
  }

  // Start placing a building chosen from the shop. Owned (unplaced) buildings are
  // free to position; the rest are purchased when dropped.
  function beginPlace(building: ShopBuilding, owned: boolean) {
    setArrangeMode(false)
    setSelected(null)
    setGhost(owned ? { mode: 'place-owned', building } : { mode: 'new', building })
  }

  function onPick(kind: 'economy' | 'gateway', key: string, from: IsoPos) {
    setHoveredName(null) // the picked-up building unmounts; drop any stale hover name
    setSelected(null)
    if (kind === 'gateway') {
      setGhost({ mode: 'move-gateway', key, from })
    } else {
      const item = economy.find((e) => e.key === key)
      setGhost({ mode: 'move-economy', key, from, costPaid: item?.costPaid ?? 0, level: item?.level ?? 1 })
    }
  }

  /** Regular-mode click on a placed economy building → open its Sell/Upgrade menu. */
  function onSelectEconomy(key: string | null) {
    setHoveredName(null)
    setSelected(key)
  }

  async function onDrop(gx: number, gy: number) {
    const g = ghost
    if (!g || placing) return
    setPlacing(true)

    if (g.mode === 'new' || g.mode === 'place-owned') {
      const key = g.building.key
      const predictedCost = g.mode === 'new' ? g.building.cost * Math.max(1, memberCount) : 0
      setEconomy((prev) => [
        ...prev,
        { key, gx, gy, costPaid: predictedCost, level: 1 },
      ])
      setUnplaced((prev) => prev.filter((item) => item !== key))
      if (predictedCost > 0) addCurrency({ kp: -predictedCost })
      setGhost(null)

      try {
        const data = await post('/api/buildings/place', { key, gx, gy })
        setEconomy((prev) =>
          prev.map((item) =>
            item.key === key
              ? {
                  ...item,
                  costPaid: data.building.costPaid,
                  level: data.building.level ?? item.level,
                }
              : item,
          ),
        )
        setCurrency({ kp: data.kp })
      } catch (err) {
        setEconomy((prev) => prev.filter((item) => item.key !== key))
        if (g.mode === 'place-owned') setUnplaced((prev) => [...prev, key])
        if (predictedCost > 0) addCurrency({ kp: predictedCost })
        setToast(err instanceof Error ? err.message : 'Something went wrong')
        await refreshPlotState()
      } finally {
        setPlacing(false)
      }
      return
    }

    const previous = g.from
    if (g.mode === 'move-economy') {
      setEconomy((prev) =>
        prev.map((item) => (item.key === g.key ? { ...item, gx, gy } : item)),
      )
    } else {
      setGateways((prev) =>
        prev.map((item) => (item.key === g.key ? { ...item, gx, gy } : item)),
      )
    }
    setGhost(null)

    try {
      if (g.mode === 'move-economy') {
        await post('/api/buildings/move', { kind: 'economy', key: g.key, gx, gy })
      } else {
        await post('/api/buildings/move', { kind: 'gateway', key: g.key, gx, gy })
      }
    } catch (err) {
      if (g.mode === 'move-economy') {
        setEconomy((prev) =>
          prev.map((item) =>
            item.key === g.key ? { ...item, gx: previous.gx, gy: previous.gy } : item,
          ),
        )
      } else {
        setGateways((prev) =>
          prev.map((item) =>
            item.key === g.key ? { ...item, gx: previous.gx, gy: previous.gy } : item,
          ),
        )
      }
      setToast(err instanceof Error ? err.message : 'Something went wrong')
      await refreshPlotState()
    } finally {
      setPlacing(false)
    }
  }

  /** Remove a placed economy building (90% KP refund). Used by arrange-mode Delete
   *  and the regular-mode menu's Sell. */
  async function sellBuilding(key: string) {
    if (sellingKey) return
    setSellingKey(key)
    try {
      const data = await post('/api/buildings/sell', { key })
      setEconomy((prev) => prev.filter((e) => e.key !== key))
      setCurrency({ kp: data.kp })
      setGhost(null)
      setSelected(null)
      setToast(`Sold ${shopBuilding(key)?.name ?? 'building'} for ${data.refund} KP`)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not sell')
    } finally {
      setSellingKey(null)
    }
  }

  /** Upgrade a placed economy building one level (LC cost). Keeps it selected so the
   *  menu shows the next level/cost. */
  async function upgradeBuilding(key: string) {
    const b = economy.find((e) => e.key === key)
    if (!b || b.level >= MAX_BUILDING_LEVEL || upgradingKey) return
    const base = shopBuilding(key)?.cost ?? 0
    const kpCost = upgradeKpCost(base, b.level + 1)
    const lcCost = upgradeLcCost(b.level + 1)
    setUpgradingKey(key)
    const optimisticLevel = b.level + 1
    setEconomy((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, level: optimisticLevel, costPaid: item.costPaid + kpCost }
          : item,
      ),
    )
    addCurrency({ kp: -kpCost, lc: -lcCost })
    setBurst({ gx: b.gx, gy: b.gy, id: ++burstSeq.current })

    try {
      const data = await post('/api/buildings/upgrade', { key })
      setEconomy((prev) =>
        prev.map((e) =>
          e.key === key
            ? { ...e, level: data.level, costPaid: data.costPaid ?? e.costPaid + kpCost }
            : e,
        ),
      )
      setCurrency({ kp: data.kp, lc: data.lc })
      setToast(`Upgraded ${shopBuilding(key)?.name ?? 'building'} to L${data.level}`)
    } catch (err) {
      setEconomy((prev) =>
        prev.map((item) =>
          item.key === key
            ? { ...item, level: b.level, costPaid: b.costPaid }
            : item,
        ),
      )
      addCurrency({ kp: kpCost, lc: lcCost })
      setToast(err instanceof Error ? err.message : 'Could not upgrade')
      await refreshPlotState()
    } finally {
      setUpgradingKey(null)
    }
  }

  // What the plot renders — exclude the picked-up building so the ghost is its only
  // representation while moving.
  const movingGatewayKey = ghost && ghost.mode === 'move-gateway' ? ghost.key : null
  const movingEconomyKey = ghost && ghost.mode === 'move-economy' ? ghost.key : null
  const plotGateways: PlacedItem[] = gateways
    .filter((g) => g.key !== movingGatewayKey)
    .map(({ key, gx, gy }) => ({ key, gx, gy }))
  const plotEconomy: PlacedItem[] = economy
    .filter((e) => e.key !== movingEconomyKey)
    .map(({ key, gx, gy, level }) => ({ key, gx, gy, level }))

  const plotGhost: PlotGhost | null = ghost
    ? ghost.mode === 'move-gateway'
      ? { kind: 'gateway', key: ghost.key }
      : ghost.mode === 'move-economy'
        ? { kind: 'economy', key: ghost.key, level: ghost.level }
        : { kind: 'economy', key: ghost.building.key, level: 1 }
    : null

  const ownedSet = new Set(economy.map((e) => e.key))
  const unplacedSet = new Set(unplaced)

  return {
    economy,
    arrangeMode,
    setArrangeMode,
    ghost,
    setGhost,
    cancelGhost,
    setHoveredName,
    hoveredName,
    selected,
    setSelected,
    placing,
    sellingKey,
    upgradingKey,
    burst,
    toast,
    beginPlace,
    onPick,
    onSelectEconomy,
    onDrop,
    sellBuilding,
    upgradeBuilding,
    plotGateways,
    plotEconomy,
    plotGhost,
    ownedSet,
    unplacedSet,
  }
}
