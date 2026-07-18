import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/** Confirm the experiment exists AND belongs to the caller's team (IDOR guard).
 * Scoped single query (SEC-1's standard shape) — never fetch-by-id-then-check. */
async function ownedExperiment(id: string, teamId: string) {
  return db.experiment.findFirst({ where: { id, teamId }, select: { id: true } })
}

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    xLabel: z.string().trim().max(40).optional(),
    yLabel: z.string().trim().max(40).optional(),
  })
  .strict()

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const { data, error: bodyError } = await parseJson(req, PatchBody)
  if (bodyError) return bodyError

  const experiment = await db.experiment.update({
    where: { id: params.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.xLabel ? { xLabel: data.xLabel } : {}),
      ...(data.yLabel ? { yLabel: data.yLabel } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      xLabel: true,
      yLabel: true,
      _count: { select: { measurements: true } },
    },
  })

  // Same count-only list shape as GET /api/data-terminal (PERF-2) — points are
  // lazy-loaded via GET /api/data-terminal/[id]/measurements.
  const { _count, ...exp } = experiment
  return NextResponse.json({ experiment: { ...exp, measurementCount: _count.measurements } })
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  // Cascade in a transaction (no DB-level cascade configured, matching the
  // codebase's explicit-delete convention).
  await db.$transaction([
    db.measurement.deleteMany({ where: { experimentId: params.id } }),
    db.experiment.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ ok: true })
}
