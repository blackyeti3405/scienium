import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

async function ownedExperiment(id: string, teamId: string) {
  const exp = await db.experiment.findUnique({ where: { id }, select: { id: true, teamId: true } })
  return exp && exp.teamId === teamId ? exp : null
}

// Finite numbers only — reject NaN/Infinity so a bad client can't poison a chart.
const finite = z.number().finite()

const AddBody = z
  .object({
    points: z
      .array(
        z
          .object({
            x: finite,
            y: finite,
            series: z.string().trim().max(40).optional(),
            note: z.string().trim().max(200).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(500), // bounded so a paste can't insert unbounded rows in one call
  })
  .strict()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const { data, error: bodyError } = await parseJson(req, AddBody)
  if (bodyError) return bodyError

  await db.measurement.createMany({
    data: data.points.map((p) => ({
      experimentId: params.id,
      x: p.x,
      y: p.y,
      series: p.series ?? '',
      note: p.note ?? null,
    })),
  })

  const measurements = await db.measurement.findMany({
    where: { experimentId: params.id },
    orderBy: { x: 'asc' },
    select: { id: true, x: true, y: true, series: true, note: true },
  })

  return NextResponse.json({ measurements })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const measurementId = req.nextUrl.searchParams.get('measurementId')
  if (!measurementId) {
    return NextResponse.json({ error: 'measurementId required' }, { status: 400 })
  }

  // Scope the delete to this experiment so an id from another experiment is inert.
  await db.measurement.deleteMany({ where: { id: measurementId, experimentId: params.id } })

  return NextResponse.json({ ok: true })
}
