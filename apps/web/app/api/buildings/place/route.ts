import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { shopBuilding } from '@/lib/shop'
import { evaluatePurchase } from '@/lib/economy'
import { loadShopState } from '@/lib/shop-server'
import { loadPlotState, occupancyOf } from '@/lib/plot-server'
import { isOnGrid, cellKey, PLOT_RADIUS } from '@/lib/plot'
import { logActivity } from '@/lib/activity/log'

/**
 * Place an economy building on the plot. This IS the purchase: dropping an unowned
 * building debits its KP cost (team-size-adjusted) and creates the placement row
 * atomically; placing a building the team already owns but hasn't positioned
 * (legacy row) is free and just sets its cell. Either way the target cell must be
 * on the grid and unoccupied — validated server-side, never trusting the client.
 */
const PlaceBody = z
  .object({
    key: z.string().trim().min(1).max(64),
    gx: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
    gy: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
  })
  .strict()

class PlaceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'buildings',
  })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, PlaceBody)
  if (error) return error

  const building = shopBuilding(data.key)
  if (!building) return NextResponse.json({ error: 'Unknown building' }, { status: 404 })

  if (!isOnGrid(data.gx, data.gy)) {
    return NextResponse.json({ error: 'That spot is off the plot.' }, { status: 400 })
  }

  const [shop, plot] = await Promise.all([loadShopState(ctx.teamId), loadPlotState(ctx.teamId)])

  // Cell must be free (any gateway or placed economy building blocks it).
  if (occupancyOf(plot).has(cellKey(data.gx, data.gy))) {
    return NextResponse.json({ error: 'That spot is already taken.' }, { status: 409 })
  }

  const alreadyPlaced = plot.economy.some((e) => e.key === building.key)
  if (alreadyPlaced) {
    return NextResponse.json({ error: 'That building is already on your plot.' }, { status: 409 })
  }
  const ownedUnplaced = plot.unplaced.includes(building.key)

  try {
    const result = await db.$transaction(async (tx) => {
      if (ownedUnplaced) {
        // Already paid for — just position it (free move from the inventory).
        await tx.teamShopBuilding.update({
          where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: building.key } },
          data: { posX: data.gx, posY: data.gy },
        })
        const cur = await tx.teamCurrency.findUnique({
          where: { teamId: ctx.teamId },
          select: { kp: true },
        })
        return { kp: cur?.kp ?? shop.kp, costPaid: 0 }
      }

      // New purchase: the pre-check computes the cost; the conditional debit makes
      // it race-safe, and the unique (teamId, buildingKey) blocks a double-buy.
      const check = evaluatePurchase(shop, building)
      if (!check.ok) throw new PlaceError(check.error, check.status)
      const { cost } = check

      const debit = await tx.teamCurrency.updateMany({
        where: { teamId: ctx.teamId, kp: { gte: cost } },
        data: { kp: { decrement: cost } },
      })
      if (debit.count === 0) throw new PlaceError('Not enough Knowledge Points.', 402)

      await tx.teamShopBuilding.create({
        data: {
          teamId: ctx.teamId,
          buildingKey: building.key,
          purchasedByUserId: ctx.dbUserId,
          posX: data.gx,
          posY: data.gy,
          costPaid: cost,
        },
      })
      const after = await tx.teamCurrency.findUnique({
        where: { teamId: ctx.teamId },
        select: { kp: true },
      })
      return { kp: after?.kp ?? Math.max(0, shop.kp - cost), costPaid: cost }
    })

    if (!ownedUnplaced) {
      logActivity(ctx.teamId, ctx.dbUserId, 'building_purchased', {
        buildingKey: building.key,
        buildingName: building.name,
        cost: result.costPaid,
      }).catch(console.error)
    }

    return NextResponse.json({
      ok: true,
      kp: result.kp,
      building: { key: building.key, gx: data.gx, gy: data.gy, costPaid: result.costPaid },
    })
  } catch (err) {
    if (err instanceof PlaceError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Your lab already owns this building.' }, { status: 409 })
    }
    throw err
  }
}
