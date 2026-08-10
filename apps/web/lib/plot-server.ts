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
  /** Gateways the team has PLACED. A gateway that is merely unlocked is not
   *  here — it sits in the shop until the student puts it down. */
  gateways: PlacedGateway[]
}

/** Load a team's full plot: placed economy buildings + effective gateway positions. */
export async function loadPlotState(teamId: string): Promise<PlotState> {
  const [shop, placements] = await Promise.all([
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

  // Only PLACED gateways render. This used to map over GATEWAYS and fall back
  // to each one's hardcoded cell, which meant every gateway in the game stood on
  // every team's plot from day one — `unlockPhase` was declared but enforced
  // nowhere, so a brand-new lab opened with all seven buildings already up.
  const known = new Set<string>(GATEWAYS.map((g) => g.key))
  const gateways: PlacedGateway[] = placements
    .filter((o) => known.has(o.gatewayKey))
    .map((o) => ({ key: o.gatewayKey, gx: o.posX, gy: o.posY }))

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