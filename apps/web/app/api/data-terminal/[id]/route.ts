import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/** Confirm the experiment exists AND belongs to the caller's team (IDOR guard). */
async function ownedExperiment(id: string, teamId: string) {
  const exp = await db.experiment.findUnique({ where: { id }, select: { id: true, teamId: true } })
  if (!exp || exp.teamId !== teamId) return null
  return exp
}

const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    xLabel: z.string().trim().max(40).optional(),
    yLabel: z.string().trim().max(40).optional(),
  })
  .strict()

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    include: { measurements: { orderBy: { x: 'asc' } } },
  })

  return NextResponse.json({ experiment })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
