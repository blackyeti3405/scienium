import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { GATEWAYS } from '@/lib/gateways'
import { loadPlotState, occupancyOf } from '@/lib/plot-server'
import { isOnGrid, cellKey, PLOT_RADIUS } from '@/lib/plot'

/**
 * Reposition a building already on the plot. Moving is always free and works for
 * both economy buildings and the 7 gateways (which persist a per-team override
 * row). The target cell must be on the grid and unoccupied by any OTHER building
 * — the moving building's own cell is excluded so a no-op drop is allowed.
 *
 * Race safety: the write runs inside a per-team advisory lock (the same
 * `team-plot:<teamId>` lock `place`/`sell` take), and re-checks occupancy against
 * the committed rows INSIDE the lock — so two simultaneous moves can never land
 * two items on the same cell.
 */
const MoveBody = z
  .object({
    kind: z.enum(['economy', 'gateway']),
    key: z.string().trim().min(1).max(64),
    gx: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
    gy: z.number().int().min(-PLOT_RADIUS).max(PLOT_RADIUS),
  })
  .strict()

class MoveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

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

  if (data.kind === 'gateway' && !GATEWAYS.find((g) => g.key === data.key)) {
    return NextResponse.json({ error: 'Unknown gateway' }, { status: 404 })
  }

  // Fast pre-check against a snapshot (excludes the moving item's own cell). The
  // authoritative check runs inside the advisory lock below.
  const plot = await loadPlotState(ctx.teamId)
  if (occupancyOf(plot, { kind: data.kind, key: data.key }).has(cellKey(data.gx, data.gy))) {
    return NextResponse.json({ error: 'That spot is already taken.' }, { status: 409 })
  }
  if (data.kind === 'economy' && !plot.economy.some((e) => e.key === data.key)) {
    return NextResponse.json({ error: 'That building is not on your plot.' }, { status: 404 })
  }

  try {
    await db.$transaction(async (tx) => {
      await lockAggregate(tx, `team-plot:${ctx.teamId}`)

      // Authoritative occupancy re-check inside the lock — a concurrent place/move
      // that won the lock first is now committed and visible. Exclude the moving
      // item's own row so dropping it back on its current cell is a no-op, not a
      // self-collision.
      const [occBuilding, occGateway] = await Promise.all([
        tx.teamShopBuilding.findFirst({
          where: {
            teamId: ctx.teamId,
            posX: data.gx,
            posY: data.gy,
            ...(data.kind === 'economy' ? { NOT: { buildingKey: data.key } } : {}),
          },
          select: { buildingKey: true },
        }),
        tx.teamGatewayPlacement.findFirst({
          where: {
            teamId: ctx.teamId,
            posX: data.gx,
            posY: data.gy,
            ...(data.kind === 'gateway' ? { NOT: { gatewayKey: data.key } } : {}),
          },
          select: { gatewayKey: true },
        }),
      ])
      if (occBuilding || occGateway) {
        throw new MoveError('That spot is already taken.', 409)
      }

      if (data.kind === 'gateway') {
        await tx.teamGatewayPlacement.upsert({
          where: { teamId_gatewayKey: { teamId: ctx.teamId, gatewayKey: data.key } },
          create: { teamId: ctx.teamId, gatewayKey: data.key, posX: data.gx, posY: data.gy },
          update: { posX: data.gx, posY: data.gy },
        })
        return
      }

      // economy: must already be placed on this team's plot.
      const placed = await tx.teamShopBuilding.findUnique({
        where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
        select: { posX: true },
      })
      if (!placed || placed.posX === null) {
        throw new MoveError('That building is not on your plot.', 404)
      }
      await tx.teamShopBuilding.update({
        where: { teamId_buildingKey: { teamId: ctx.teamId, buildingKey: data.key } },
        data: { posX: data.gx, posY: data.gy },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MoveError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
