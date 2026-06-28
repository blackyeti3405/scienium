import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { shopBuilding } from '@/lib/shop'
import { upgradeKpCost, upgradeLcCost, MAX_BUILDING_LEVEL } from '@/lib/economy'
import { logActivity } from '@/lib/activity/log'

/**
 * Upgrade a placed economy building by one level. Every upgrade costs KP
 * (round(base × 0.25 × (L−1))); the four tier-up transitions (→4/→7/→10/→15) also
 * cost LC. The debit and the level bump are atomic in one transaction; a
 * conditional updateMany guards the level so two concurrent requests can't skip a
 * level. Max level = 15 (MAX_BUILDING_LEVEL).
 */
const UpgradeBody = z.object({ key: z.string().trim().min(1).max(64) }).strict()

class UpgradeError extends Error {
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

  const { data, error } = await parseJson(req, UpgradeBody)
  if (error) return error

  const building = shopBuilding(data.key)
  if (!building) return NextResponse.json({ error: 'Unknown building' }, { status: 404 })

  const row = await db.teamShopBuilding.findUnique({
    where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
    select: { level: true, posX: true, posY: true, costPaid: true },
  })
  if (!row || row.posX === null || row.posY === null)
    return NextResponse.json({ error: 'That building is not placed on your plot.' }, { status: 404 })
  if (row.level >= MAX_BUILDING_LEVEL)
    return NextResponse.json({ error: 'This building is already at max level.' }, { status: 409 })

  const nextLevel = row.level + 1
  const kpCost = upgradeKpCost(building.cost, nextLevel)
  const lcCost = upgradeLcCost(nextLevel)

  try {
    const result = await db.$transaction(async (tx) => {
      // Atomic, race-safe debit of BOTH currencies (LC only when this tier costs it)
      // — one conditional updateMany so the level can't bump unless the team can pay.
      const debit = await tx.teamCurrency.updateMany({
        where: { teamId: ctx.teamId, kp: { gte: kpCost }, lc: { gte: lcCost } },
        data: { kp: { decrement: kpCost }, lc: { decrement: lcCost } },
      })
      if (debit.count === 0) {
        // Distinguish which currency fell short for a clear message.
        const cur = await tx.teamCurrency.findUnique({
          where: { teamId: ctx.teamId },
          select: { kp: true, lc: true },
        })
        if ((cur?.lc ?? 0) < lcCost) throw new UpgradeError('Not enough Lab Credits.', 402)
        throw new UpgradeError('Not enough Knowledge Points.', 402)
      }
      // Guard the level high-water in the same tx so two concurrent upgrades can't
      // skip a level: only bump from the level we costed against. Also accumulate the
      // KP spent into costPaid so the sell refund reflects TOTAL KP invested.
      const bump = await tx.teamShopBuilding.updateMany({
        where: { teamId: ctx.teamId, buildingKey: data.key, level: row.level },
        data: { level: { increment: 1 }, costPaid: { increment: kpCost } },
      })
      if (bump.count === 0) throw new UpgradeError('Upgrade conflicted, try again.', 409)
      const after = await tx.teamCurrency.findUnique({
        where: { teamId: ctx.teamId },
        select: { kp: true, lc: true },
      })
      return { level: nextLevel, kp: after?.kp ?? 0, lc: after?.lc ?? 0 }
    })

    logActivity(ctx.teamId, ctx.dbUserId, 'building_upgraded', {
      buildingKey: building.key,
      buildingName: building.name,
      level: result.level,
    }).catch(console.error)

    return NextResponse.json({
      ok: true,
      level: result.level,
      kpCost,
      lcCost,
      kp: result.kp,
      lc: result.lc,
      costPaid: row.costPaid + kpCost, // total KP invested (drives the sell refund)
    })
  } catch (err) {
    if (err instanceof UpgradeError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
