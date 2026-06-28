import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
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

  const row = await db.teamShopBuilding.findUnique({
    where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
    select: { costPaid: true },
  })
  if (!row) return NextResponse.json({ error: 'Your lab does not own that building.' }, { status: 404 })

  const refund = sellRefund(row.costPaid)

  const kp = await db.$transaction(async (tx) => {
    await tx.teamShopBuilding.delete({
      where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
    })
    const after = await tx.teamCurrency.update({
      where: { teamId: ctx.teamId },
      data: { kp: { increment: refund } },
      select: { kp: true },
    })
    return after.kp
  })

  logActivity(ctx.teamId, ctx.dbUserId, 'building_sold', {
    buildingKey: building.key,
    buildingName: building.name,
    refund,
  }).catch(console.error)

  return NextResponse.json({ ok: true, kp, refund })
}
