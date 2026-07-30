import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamRoute } from '@/lib/api/with-route'
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

export const POST = withTeamRoute(
  { tier: 'mutate', feature: 'buildings', body: PlaceBody },
  async ({ ctx, data }) => {
    const result = await placeBuilding(ctx.teamId, ctx.dbUserId, data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, kp: result.kp, building: result.building })
  },
)
