import 'server-only'
/**
 * Server-side shop state — owned keys, currency, clearance, and the team-size
 * cost multiplier. Shared by the buildings GET/POST and placement routes so the
 * purchase gate (lib/economy.ts `evaluatePurchase`) is fed identical inputs.
 * The atomic debit still lives in each mutation's transaction.
 */

import { db } from '@/lib/db'

export interface ShopState {
  owned: string[]
  kp: number
  lc: number
  clearanceLevel: number
  /** team-size cost multiplier (>= 1). */
  multiplier: number
  labType: string | null
}

export async function loadShopState(teamId: string): Promise<ShopState> {
  const [owned, currency, memberCount, team] = await Promise.all([
    db.teamShopBuilding.findMany({ where: { teamId }, select: { buildingKey: true } }),
    db.teamCurrency.findUnique({
      where: { teamId },
      select: { kp: true, lc: true, clearanceLevel: true },
    }),
    db.teamMember.count({ where: { teamId } }),
    db.team.findUnique({ where: { id: teamId }, select: { labType: true } }),
  ])
  return {
    owned: owned.map((o) => o.buildingKey),
    kp: currency?.kp ?? 0,
    lc: currency?.lc ?? 0,
    clearanceLevel: currency?.clearanceLevel ?? 0,
    multiplier: Math.max(1, memberCount),
    labType: team?.labType ?? null,
  }
}