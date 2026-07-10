import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { placeBuilding } from '@/lib/buildings/service'
import { PLOT_RADIUS } from '@/lib/plot'

/**
 * Place an economy building on the plot (this IS the purchase). Thin wrapper — the
 * cost check, debit, placement, and per-team lock live in lib/buildings/service.
 */
const PlaceBody = z
  .object({
    key: z.string().trim().min(1).max(64),
    gx: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
    gy: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, {
    tier: 'mutate',
    feature: 'buildings',
  })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, PlaceBody)
  if (error) return error

  const result = await placeBuilding(ctx.teamId, ctx.dbUserId, data)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ ok: true, kp: result.kp, building: result.building })
}
