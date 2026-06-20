import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { shopBuilding } from '@/lib/shop'
import { evaluatePurchase } from '@/lib/economy'
import { logActivity } from '@/lib/activity/log'

/** Shared shop state: owned keys, clearance, and the team-size cost multiplier. */
async function loadShopState(teamId: string) {
  const [owned, currency, memberCount] = await Promise.all([
    db.teamShopBuilding.findMany({ where: { teamId }, select: { buildingKey: true } }),
    db.teamCurrency.findUnique({
      where: { teamId },
      select: { kp: true, clearanceLevel: true },
    }),
    db.teamMember.count({ where: { teamId } }),
  ])
  return {
    owned: owned.map((o) => o.buildingKey),
    kp: currency?.kp ?? 0,
    clearanceLevel: currency?.clearanceLevel ?? 0,
    multiplier: Math.max(1, memberCount),
  }
}

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'buildings' })
  if (error) return error

  return NextResponse.json(await loadShopState(ctx.teamId))
}

const PurchaseBody = z.object({ key: z.string().trim().min(1).max(64) }).strict()

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'buildings',
  })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, PurchaseBody)
  if (error) return error

  const building = shopBuilding(data.key)
  if (!building) return NextResponse.json({ error: 'Unknown building' }, { status: 404 })

  const state = await loadShopState(ctx.teamId)
  const check = evaluatePurchase(state, building)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })
  const { cost } = check

  // Atomic + race-safe: the conditional KP debit (count of rows updated) and the
  // unique (teamId, buildingKey) constraint together prevent double-spend / double-buy.
  try {
    const result = await db.$transaction(async (tx) => {
      const debit = await tx.teamCurrency.updateMany({
        where: { teamId: ctx.teamId, kp: { gte: cost } },
        data: { kp: { decrement: cost } },
      })
      if (debit.count === 0) {
        throw new PurchaseError('Not enough Knowledge Points.', 402)
      }
      await tx.teamShopBuilding.create({
        data: { teamId: ctx.teamId, buildingKey: building.key, purchasedByUserId: ctx.dbUserId },
      })
      const after = await tx.teamCurrency.findUnique({
        where: { teamId: ctx.teamId },
        select: { kp: true },
      })
      return after?.kp ?? Math.max(0, state.kp - cost)
    })

    logActivity(ctx.teamId, ctx.dbUserId, 'building_purchased', {
      buildingKey: building.key,
      buildingName: building.name,
      cost,
    }).catch(console.error)

    return NextResponse.json({ ok: true, key: building.key, cost, kp: result })
  } catch (err) {
    if (err instanceof PurchaseError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    // Unique-constraint violation → already owned (concurrent buy).
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Your lab already owns this building.' }, { status: 409 })
    }
    throw err
  }
}

class PurchaseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}
