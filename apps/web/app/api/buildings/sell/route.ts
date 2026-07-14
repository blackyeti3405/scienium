import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamRoute } from '@/lib/api/with-route'
import { sellBuilding } from '@/lib/buildings/service'

/**
 * Sell a placed economy building for a partial KP refund. Thin wrapper — the
 * delete + refund + per-team lock live in lib/buildings/service.
 */
const SellBody = z.object({ key: z.string().trim().min(1).max(64) }).strict()

export const POST = withTeamRoute(
  { tier: 'mutate', feature: 'buildings', body: SellBody },
  async ({ ctx, data }) => {
    const result = await sellBuilding(ctx.teamId, ctx.dbUserId, data.key)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true, kp: result.kp, refund: result.refund })
  },
)
