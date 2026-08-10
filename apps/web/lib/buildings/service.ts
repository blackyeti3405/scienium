import 'server-only'
/**
 * Plot economy orchestration — the place / move / sell / upgrade business rules,
 * lifted out of the route handlers so the routes are thin (parse → context → call
 * → respond) and the rules are testable without a Next request. Every mutation
 * runs inside the same per-team `team-plot:<teamId>` advisory lock and re-checks
 * committed state inside it, so concurrent plot edits can't collide.
 *
 * Each function returns a discriminated result instead of throwing across the HTTP
 * boundary: `{ ok: true, ... }` or `{ ok: false, error, status }`. The route maps
 * that straight onto a NextResponse.
 */

import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { GATEWAYS } from '@/lib/gateways'
import { isPhaseAtLeast, type Phase } from '@/lib/phase'
import { shopBuilding } from '@/lib/shop'
import {
  evaluatePurchase,
  sellRefund,
  upgradeKpCost,
  upgradeLcCost,
  MAX_BUILDING_LEVEL,
} from '@/lib/economy'
import { loadShopState } from '@/lib/shop-server'
import { loadPlotState, occupancyOf } from '@/lib/plot-server'
import { isOnGrid, cellKey } from '@/lib/plot'
import { recordActivity } from '@/lib/activity/log'

export type PlotResult<T> = ({ ok: true } & T) | { ok: false; error: string; status: number }

/** Thrown inside a transaction to trigger rollback; caught and mapped to a result. */
class PlotTxError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status }
}

export interface PlaceInput {
  key: string
  gx: number
  gy: number
}

/**
 * Place an economy building — this IS the purchase. An unowned building debits its
 * KP cost and creates the placement atomically; an owned-but-unplaced building is
 * positioned for free. The cell must be on-grid and unoccupied (re-checked in-lock).
 */
export async function placeBuilding(
  teamId: string,
  userId: string,
  input: PlaceInput,
): Promise<PlotResult<{ kp: number; building: { key: string; gx: number; gy: number; costPaid: number; level: number } }>> {
  const building = shopBuilding(input.key)
  if (!building) return fail('Unknown building', 404)

  if (!isOnGrid(input.gx, input.gy)) return fail('That spot is off the plot.', 400)

  const [shop, plot] = await Promise.all([loadShopState(teamId), loadPlotState(teamId)])

  // Cell must be free (any gateway or placed economy building blocks it).
  if (occupancyOf(plot).has(cellKey(input.gx, input.gy))) {
    return fail('That spot is already taken.', 409)
  }
  if (plot.economy.some((e) => e.key === building.key)) {
    return fail('That building is already on your plot.', 409)
  }
  const ownedUnplaced = plot.unplaced.includes(building.key)

  try {
    const result = await db.$transaction(async (tx) => {
      await lockAggregate(tx, `team-plot:${teamId}`)

      const [occupiedBuilding, occupiedGateway] = await Promise.all([
        tx.teamShopBuilding.findFirst({
          where: { teamId, posX: input.gx, posY: input.gy },
          select: { buildingKey: true },
        }),
        tx.teamGatewayPlacement.findFirst({
          where: { teamId, posX: input.gx, posY: input.gy },
          select: { gatewayKey: true },
        }),
      ])
      if (occupiedBuilding || occupiedGateway) {
        throw new PlotTxError('That spot is already taken.', 409)
      }

      if (ownedUnplaced) {
        // Already paid for — just position it (free move from the inventory).
        const positioned = await tx.teamShopBuilding.update({
          where: { teamId_buildingKey: { teamId, buildingKey: building.key } },
          data: { posX: input.gx, posY: input.gy },
          select: { costPaid: true, level: true },
        })
        const cur = await tx.teamCurrency.findUnique({ where: { teamId }, select: { kp: true } })
        return { kp: cur?.kp ?? shop.kp, costPaid: positioned.costPaid, level: positioned.level }
      }

      // New purchase: the pre-check computes the cost; the conditional debit makes
      // it race-safe, and the unique (teamId, buildingKey) blocks a double-buy.
      const check = evaluatePurchase(shop, building)
      if (!check.ok) throw new PlotTxError(check.error, check.status)
      const { cost } = check

      const debit = await tx.teamCurrency.updateMany({
        where: { teamId, kp: { gte: cost } },
        data: { kp: { decrement: cost } },
      })
      if (debit.count === 0) throw new PlotTxError('Not enough Knowledge Points.', 402)

      await tx.teamShopBuilding.create({
        data: {
          teamId,
          buildingKey: building.key,
          purchasedByUserId: userId,
          posX: input.gx,
          posY: input.gy,
          costPaid: cost,
        },
      })
      const after = await tx.teamCurrency.findUnique({ where: { teamId }, select: { kp: true } })
      // The KP debit and the record that it happened commit together (P1-R5).
      // A purchase whose feed entry silently vanished is a teacher looking at a
      // building nobody appears to have bought.
      await recordActivity(tx, teamId, userId, 'building_purchased', {
        buildingKey: building.key,
        buildingName: building.name,
        cost,
      })
      return { kp: after?.kp ?? Math.max(0, shop.kp - cost), costPaid: cost, level: 1 }
    })

    return {
      ok: true,
      kp: result.kp,
      building: {
        key: building.key,
        gx: input.gx,
        gy: input.gy,
        costPaid: result.costPaid,
        level: result.level,
      },
    }
  } catch (err) {
    if (err instanceof PlotTxError) return fail(err.message, err.status)
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
      return fail('Your lab already owns this building.', 409)
    }
    throw err
  }
}

export interface MoveInput {
  kind: 'economy' | 'gateway'
  key: string
  gx: number
  gy: number
}

/**
 * Reposition a building already on the plot (free) — economy building or gateway.
 * The target cell must be on-grid and unoccupied by any OTHER building; the moving
 * building's own cell is excluded so a no-op drop is allowed.
 */
export async function moveBuilding(
  teamId: string,
  input: MoveInput,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isOnGrid(input.gx, input.gy)) return fail('That spot is off the plot.', 400)

  if (input.kind === 'gateway') {
    const gateway = GATEWAYS.find((g) => g.key === input.key)
    if (!gateway) return fail('Unknown gateway', 404)
    // Placing a gateway for the FIRST time is how it gets onto the plot, so this
    // path is also the unlock gate. Without it a client could place a locked
    // gateway by asking to "move" one it never had — the upsert below would
    // happily create the row.
    const team = await db.team.findUnique({ where: { id: teamId }, select: { phase: true } })
    if (!team) return fail('Team not found', 404)
    if (!isPhaseAtLeast(team.phase as Phase, gateway.unlockPhase)) {
      return fail('That building is still locked.', 403)
    }
  }

  // Fast pre-check against a snapshot (excludes the moving item's own cell). The
  // authoritative check runs inside the advisory lock below.
  const plot = await loadPlotState(teamId)
  if (occupancyOf(plot, { kind: input.kind, key: input.key }).has(cellKey(input.gx, input.gy))) {
    return fail('That spot is already taken.', 409)
  }
  if (input.kind === 'economy' && !plot.economy.some((e) => e.key === input.key)) {
    return fail('That building is not on your plot.', 404)
  }

  try {
    await db.$transaction(async (tx) => {
      await lockAggregate(tx, `team-plot:${teamId}`)

      // Authoritative occupancy re-check inside the lock — a concurrent place/move
      // that won the lock first is now committed and visible. Exclude the moving
      // item's own row so dropping it back on its current cell is a no-op.
      const [occBuilding, occGateway] = await Promise.all([
        tx.teamShopBuilding.findFirst({
          where: {
            teamId,
            posX: input.gx,
            posY: input.gy,
            ...(input.kind === 'economy' ? { NOT: { buildingKey: input.key } } : {}),
          },
          select: { buildingKey: true },
        }),
        tx.teamGatewayPlacement.findFirst({
          where: {
            teamId,
            posX: input.gx,
            posY: input.gy,
            ...(input.kind === 'gateway' ? { NOT: { gatewayKey: input.key } } : {}),
          },
          select: { gatewayKey: true },
        }),
      ])
      if (occBuilding || occGateway) {
        throw new PlotTxError('That spot is already taken.', 409)
      }

      if (input.kind === 'gateway') {
        await tx.teamGatewayPlacement.upsert({
          where: { teamId_gatewayKey: { teamId, gatewayKey: input.key } },
          create: { teamId, gatewayKey: input.key, posX: input.gx, posY: input.gy },
          update: { posX: input.gx, posY: input.gy },
        })
        return
      }

      // economy: must already be placed on this team's plot.
      const placed = await tx.teamShopBuilding.findUnique({
        where: { teamId_buildingKey: { teamId, buildingKey: input.key } },
        select: { posX: true },
      })
      if (!placed || placed.posX === null) {
        throw new PlotTxError('That building is not on your plot.', 404)
      }
      await tx.teamShopBuilding.update({
        where: { teamId_buildingKey: { teamId, buildingKey: input.key } },
        data: { posX: input.gx, posY: input.gy },
      })
    })

    return { ok: true }
  } catch (err) {
    if (err instanceof PlotTxError) return fail(err.message, err.status)
    throw err
  }
}

/**
 * Sell a placed economy building for a partial KP refund (90% of KP invested). The
 * row delete and refund credit are atomic. Reading the row inside the lock makes a
 * concurrent double-sell return 404 rather than a delete-not-found 500. Gateways
 * are never sellable (the client never offers it and there is no gateway branch).
 */
export async function sellBuilding(
  teamId: string,
  userId: string,
  key: string,
): Promise<PlotResult<{ kp: number; refund: number }>> {
  const building = shopBuilding(key)
  if (!building) return fail('Unknown building', 404)

  try {
    const result = await db.$transaction(async (tx) => {
      await lockAggregate(tx, `team-plot:${teamId}`)

      const row = await tx.teamShopBuilding.findUnique({
        where: { teamId_buildingKey: { teamId, buildingKey: key } },
        select: { costPaid: true },
      })
      if (!row) throw new PlotTxError('Your lab does not own that building.', 404)

      const refund = sellRefund(row.costPaid)
      await tx.teamShopBuilding.delete({
        where: { teamId_buildingKey: { teamId, buildingKey: key } },
      })
      const after = await tx.teamCurrency.update({
        where: { teamId },
        data: { kp: { increment: refund } },
        select: { kp: true },
      })
      await recordActivity(tx, teamId, userId, 'building_sold', {
        buildingKey: building.key,
        buildingName: building.name,
        refund,
      })
      return { kp: after.kp, refund }
    })

    return { ok: true, kp: result.kp, refund: result.refund }
  } catch (err) {
    if (err instanceof PlotTxError) return fail(err.message, err.status)
    throw err
  }
}

/**
 * Upgrade a placed economy building by one level. Every upgrade costs KP; the four
 * tier-up transitions also cost LC. The debit and level bump are atomic, guarded by
 * conditional updates so two concurrent upgrades can't skip a level. Max level = 15.
 */
export async function upgradeBuilding(
  teamId: string,
  userId: string,
  key: string,
): Promise<PlotResult<{ level: number; kpCost: number; lcCost: number; kp: number; lc: number; costPaid: number }>> {
  const building = shopBuilding(key)
  if (!building) return fail('Unknown building', 404)

  const row = await db.teamShopBuilding.findUnique({
    where: { teamId_buildingKey: { teamId, buildingKey: key } },
    select: { level: true, posX: true, posY: true, costPaid: true },
  })
  if (!row || row.posX === null || row.posY === null) {
    return fail('That building is not placed on your plot.', 404)
  }
  if (row.level >= MAX_BUILDING_LEVEL) {
    return fail('This building is already at max level.', 409)
  }

  const nextLevel = row.level + 1
  const kpCost = upgradeKpCost(building.cost, nextLevel)
  const lcCost = upgradeLcCost(nextLevel)

  try {
    const result = await db.$transaction(async (tx) => {
      // Serialize with other plot mutations on the same per-team lock; the
      // conditional updates below already make the currency/level bump race-safe.
      await lockAggregate(tx, `team-plot:${teamId}`)
      // Atomic, race-safe debit of BOTH currencies (LC only when this tier costs it)
      // — one conditional updateMany so the level can't bump unless the team can pay.
      const debit = await tx.teamCurrency.updateMany({
        where: { teamId, kp: { gte: kpCost }, lc: { gte: lcCost } },
        data: { kp: { decrement: kpCost }, lc: { decrement: lcCost } },
      })
      if (debit.count === 0) {
        // Distinguish which currency fell short for a clear message.
        const cur = await tx.teamCurrency.findUnique({
          where: { teamId },
          select: { kp: true, lc: true },
        })
        if ((cur?.lc ?? 0) < lcCost) throw new PlotTxError('Not enough Lab Credits.', 402)
        throw new PlotTxError('Not enough Knowledge Points.', 402)
      }
      // Guard the level high-water in the same tx so two concurrent upgrades can't
      // skip a level: only bump from the level we costed against. Accumulate the KP
      // spent into costPaid so the sell refund reflects TOTAL KP invested.
      const bump = await tx.teamShopBuilding.updateMany({
        where: { teamId, buildingKey: key, level: row.level },
        data: { level: { increment: 1 }, costPaid: { increment: kpCost } },
      })
      if (bump.count === 0) throw new PlotTxError('Upgrade conflicted, try again.', 409)
      const after = await tx.teamCurrency.findUnique({
        where: { teamId },
        select: { kp: true, lc: true },
      })
      await recordActivity(tx, teamId, userId, 'building_upgraded', {
        buildingKey: building.key,
        buildingName: building.name,
        level: nextLevel,
      })
      return { level: nextLevel, kp: after?.kp ?? 0, lc: after?.lc ?? 0 }
    })

    return {
      ok: true,
      level: result.level,
      kpCost,
      lcCost,
      kp: result.kp,
      lc: result.lc,
      costPaid: row.costPaid + kpCost, // total KP invested (drives the sell refund)
    }
  } catch (err) {
    if (err instanceof PlotTxError) return fail(err.message, err.status)
    throw err
  }
}