import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { GATEWAYS } from '@/lib/gateways'
import { loadPlotState, occupancyOf } from '@/lib/plot-server'
import { isOnGrid, cellKey, PLOT_RADIUS } from '@/lib/plot'

/**
 * Reposition a building already on the plot. Moving is always free and works for
 * both economy buildings and the 7 gateways (which persist a per-team override
 * row). The target cell must be on the grid and unoccupied by any OTHER building
 * — the moving building's own cell is excluded so a no-op drop is allowed.
 */
const MoveBody = z
  .object({
    kind: z.enum(['economy', 'gateway']),
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

  const { data, error } = await parseJson(req, MoveBody)
  if (error) return error

  if (!isOnGrid(data.gx, data.gy)) {
    return NextResponse.json({ error: 'That spot is off the plot.' }, { status: 400 })
  }

  const plot = await loadPlotState(ctx.teamId)

  if (occupancyOf(plot, { kind: data.kind, key: data.key }).has(cellKey(data.gx, data.gy))) {
    return NextResponse.json({ error: 'That spot is already taken.' }, { status: 409 })
  }

  if (data.kind === 'gateway') {
    const gateway = GATEWAYS.find((g) => g.key === data.key)
    if (!gateway) return NextResponse.json({ error: 'Unknown gateway' }, { status: 404 })
    await db.teamGatewayPlacement.upsert({
      where: { teamId_gatewayKey: { teamId: ctx.teamId, gatewayKey: data.key } },
      create: { teamId: ctx.teamId, gatewayKey: data.key, posX: data.gx, posY: data.gy },
      update: { posX: data.gx, posY: data.gy },
    })
    return NextResponse.json({ ok: true })
  }

  // economy: must already be placed on this team's plot.
  if (!plot.economy.some((e) => e.key === data.key)) {
    return NextResponse.json({ error: 'That building is not on your plot.' }, { status: 404 })
  }
  await db.teamShopBuilding.update({
    where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
    data: { posX: data.gx, posY: data.gy },
  })
  return NextResponse.json({ ok: true })
}
