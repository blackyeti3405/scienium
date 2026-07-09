import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { upgradeBuilding } from '@/lib/buildings/service'

/**
 * Upgrade a placed economy building by one level. Thin wrapper — the currency debit,
 * level guard, and per-team lock live in lib/buildings/service.
 */
const UpgradeBody = z.object({ key: z.string().trim().min(1).max(64) }).strict()

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'buildings',
  })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, UpgradeBody)
  if (error) return error

  const result = await upgradeBuilding(ctx.teamId, ctx.dbUserId, data.key)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    ok: true,
    level: result.level,
    kpCost: result.kpCost,
    lcCost: result.lcCost,
    kp: result.kp,
    lc: result.lc,
    costPaid: result.costPaid,
  })
}
