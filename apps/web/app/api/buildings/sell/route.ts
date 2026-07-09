import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { shopBuilding } from '@/lib/shop'
import { sellRefund } from '@/lib/economy'
import { logActivity } from '@/lib/activity/log'

/**
 * Sell a placed economy building for a partial KP refund (90% of what was paid,
 * lib/economy.ts). The row is deleted and the refund credited atomically. Gateway
 * buildings are the navigation spine and are never sellable — there is no gateway
 * branch here, and the client never offers the action for them.
 */
const SellBody = z.object({ key: z.string().trim().min(1).max(64) }).strict()

class SellError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'buildings',
  })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, SellBody)
  if (error) return error

  const building = shopBuilding(data.key)
  if (!building) return NextResponse.json({ error: 'Unknown building' }, { status: 404 })

  try {
    // Read, delete, and refund inside the per-team plot lock. Reading the row
    // inside the lock makes a concurrent double-sell idempotent-safe: the second
    // request finds no row and returns 404 instead of a delete-not-found 500.
    const result = await db.$transaction(async (tx) => {
      await lockAggregate(tx, `team-plot:${ctx.teamId}`)

      const row = await tx.teamShopBuilding.findUnique({
        where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
        select: { costPaid: true },
      })
      if (!row) throw new SellError('Your lab does not own that building.', 404)

      const refund = sellRefund(row.costPaid)
      await tx.teamShopBuilding.delete({
        where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
      })
      const after = await tx.teamCurrency.update({
        where: { teamId: ctx.teamId },
        data: { kp: { increment: refund } },
        select: { kp: true },
      })
      return { kp: after.kp, refund }
    })

    logActivity(ctx.teamId, ctx.dbUserId, 'building_sold', {
      buildingKey: building.key,
      buildingName: building.name,
      refund: result.refund,
    }).catch(console.error)

    return NextResponse.json({ ok: true, kp: result.kp, refund: result.refund })
  } catch (err) {
    if (err instanceof SellError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
