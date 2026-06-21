import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/**
 * Data Terminal (spec §14.1) — experiment tracking + graphing, unlocked at the
 * `working` phase. Each experiment is a titled x/y dataset the team records
 * measurements against and charts. Team-scoped; every route asserts
 * `data_terminal` so it 403s outside `working`.
 */

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  const experiments = await db.experiment.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      measurements: {
        orderBy: { x: 'asc' },
        select: { id: true, x: true, y: true, series: true, note: true },
      },
    },
  })

  return NextResponse.json({ experiments })
}

const CreateBody = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: z.string().trim().max(500).optional(),
    xLabel: z.string().trim().max(40).optional(),
    yLabel: z.string().trim().max(40).optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CreateBody)
  if (bodyError) return bodyError

  const experiment = await db.experiment.create({
    data: {
      teamId: ctx.teamId,
      createdByUserId: ctx.dbUserId,
      title: data.title,
      description: data.description ?? '',
      xLabel: data.xLabel || 'x',
      yLabel: data.yLabel || 'y',
    },
    include: { measurements: true },
  })

  return NextResponse.json({ experiment })
}
