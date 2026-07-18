import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

// Scoped single query (SEC-1's standard shape) — never fetch-by-id-then-check.
async function ownedExperiment(id: string, teamId: string) {
  return db.experiment.findFirst({ where: { id, teamId }, select: { id: true } })
}

/**
 * Hard cap on points per experiment: enforced at write time and used as a
 * read backstop, so payloads stay bounded as a class accumulates a year of
 * data. Far above any real classroom dataset (charts get unreadable long
 * before this), so no pagination UI is needed for the pilot.
 */
const MAX_POINTS_PER_EXPERIMENT = 2_000

function listMeasurements(experimentId: string) {
  return db.measurement.findMany({
    where: { experimentId },
    orderBy: { x: 'asc' },
    select: { id: true, x: true, y: true, series: true, note: true },
    take: MAX_POINTS_PER_EXPERIMENT,
  })
}

/**
 * GET /api/data-terminal/[id]/measurements — one experiment's points, loaded
 * lazily when it's selected (the list route returns counts only — PERF-2).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  return NextResponse.json({ measurements: await listMeasurements(params.id) })
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

  const existing = await db.measurement.count({ where: { experimentId: params.id } })
  if (existing + data.points.length > MAX_POINTS_PER_EXPERIMENT) {
    return NextResponse.json(
      {
        error: `An experiment holds at most ${MAX_POINTS_PER_EXPERIMENT} points (${existing} recorded). Start a new experiment or delete old points.`,
      },
      { status: 409 },
    )
  }

  await db.measurement.createMany({
    data: data.points.map((p) => ({
      experimentId: params.id,
      x: p.x,
      y: p.y,
      series: p.series ?? '',
      note: p.note ?? null,
    })),
  })

  return NextResponse.json({ measurements: await listMeasurements(params.id) })
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
