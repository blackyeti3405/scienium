import 'server-only'
/**
 * Server-side plot state — loads a team's placed buildings and computes cell
 * occupancy for the placement/move routes and the lab page SSR. Pairs with the
 * pure grid math in lib/plot.ts; this is the only piece that touches the DB.
 */

import { db } from '@/lib/db'
import { GATEWAYS } from '@/lib/gateways'
import { cellKey } from '@/lib/plot'

export interface PlacedEconomy {
  key: string
  gx: number
  gy: number
  costPaid: number
  level: number
}

export interface PlacedGateway {
  key: string
  gx: number
  gy: number
}

export interface PlotState {
  /** Economy buildings the team owns AND has positioned on the plot. */
  economy: PlacedEconomy[]
  /** Economy buildings owned but not yet positioned (legacy / pre-placement rows). */
  unplaced: string[]
  /** Effective gateway positions — a per-team override, else the hardcoded cell. */
  gateways: PlacedGateway[]
}

/** Load a team's full plot: placed economy buildings + effective gateway positions. */
export async function loadPlotState(teamId: string): Promise<PlotState> {
  const [shop, overrides] = await Promise.all([
    db.teamShopBuilding.findMany({
      where: { teamId },
      select: { buildingKey: true, posX: true, posY: true, costPaid: true, level: true },
    }),
    db.teamGatewayPlacement.findMany({
      where: { teamId },
      select: { gatewayKey: true, posX: true, posY: true },
    }),
  ])

  const economy: PlacedEconomy[] = []
  const unplaced: string[] = []
  for (const r of shop) {
    if (r.posX !== null && r.posY !== null) {
      economy.push({ key: r.buildingKey, gx: r.posX, gy: r.posY, costPaid: r.costPaid, level: r.level })
    } else {
      unplaced.push(r.buildingKey)
    }
  }

  const overrideMap = new Map(overrides.map((o) => [o.gatewayKey, { gx: o.posX, gy: o.posY }]))
  const gateways: PlacedGateway[] = GATEWAYS.map((g) => {
    const o = overrideMap.get(g.key)
    return { key: g.key, gx: o?.gx ?? g.cell.gx, gy: o?.gy ?? g.cell.gy }
  })

  return { economy, unplaced, gateways }
}

/**
 * The set of occupied cell keys for a plot, optionally excluding the building
 * currently being moved (so it can be dropped back onto its own cell).
 */
export function occupancyOf(
  state: PlotState,
  exclude?: { kind: 'economy' | 'gateway'; key: string },
): Set<string> {
  const set = new Set<string>()
  for (const e of state.economy) {
    if (exclude?.kind === 'economy' && exclude.key === e.key) continue
    set.add(cellKey(e.gx, e.gy))
  }
  for (const g of state.gateways) {
    if (exclude?.kind === 'gateway' && exclude.key === g.key) continue
    set.add(cellKey(g.gx, g.gy))
  }
  return set
}