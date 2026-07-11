import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { sellBuilding } from '@/lib/buildings/service'

/**
 * Sell a placed economy building for a partial KP refund. Thin wrapper — the
 * delete + refund + per-team lock live in lib/buildings/service.
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

  const result = await sellBuilding(ctx.teamId, ctx.dbUserId, data.key)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, kp: result.kp, refund: result.refund })
}
