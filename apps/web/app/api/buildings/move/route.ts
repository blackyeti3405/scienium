import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamRoute } from '@/lib/api/with-route'
import { moveBuilding } from '@/lib/buildings/service'
import { PLOT_RADIUS } from '@/lib/plot'

/**
 * Reposition a building already on the plot. Thin wrapper — the placement rules,
 * per-team lock, and occupancy re-check live in lib/buildings/service.
 */
const MoveBody = z
  .object({
    kind: z.enum(['economy', 'gateway']),
    key: z.string().trim().min(1).max(64),
    gx: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
    gy: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
  })
  .strict()

export const POST = withTeamRoute(
  { tier: 'mutate', feature: 'buildings', body: MoveBody },
  async ({ ctx, data }) => {
    const result = await moveBuilding(ctx.teamId, data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ ok: true })
  },
)
