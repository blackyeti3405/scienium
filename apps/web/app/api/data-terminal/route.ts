import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

/**
 * Data Terminal (spec §14.1) — experiment tracking + graphing, unlocked at the
 * `working` phase. Each experiment is a titled x/y dataset the team records
 * measurements against and charts. Team-scoped; every route asserts
 * `data_terminal` so it 403s outside `working`.
 */

/**
 * Hard cap on experiments per team (REFACTOR2 P2-S2). The list used to persist
 * without limit and render `take: 200`, so a 201st experiment was stored and
 * then unreachable — no pagination, no error, just gone. A real cap refused at
 * write time is the honest version of the same bound: the list's `take` is now
 * exactly the cap, which makes it a backstop that can never hide a row.
 */
export const MAX_EXPERIMENTS_PER_TEAM = 200

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  // The list only needs point COUNTS — the selected experiment's measurements
  // are lazy-loaded via GET /api/data-terminal/[id]/measurements (PERF-2).
  const experiments = await db.experiment.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'desc' },
    // Exactly the write cap — a backstop that cannot hide a row.
    take: MAX_EXPERIMENTS_PER_TEAM,
    select: {
      id: true,
      title: true,
      description: true,
      xLabel: true,
      yLabel: true,
      _count: { select: { measurements: true } },
    },
  })

  return NextResponse.json({
    experiments: experiments.map(({ _count, ...exp }) => ({
      ...exp,
      measurementCount: _count.measurements,
    })),
  })
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

  // Count + create under one advisory lock (P2-S1) so two concurrent creates
  // at the cap cannot both see room.
  const experiment = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `team-experiments:${ctx.teamId}`)
    const existing = await tx.experiment.count({ where: { teamId: ctx.teamId } })
    if (existing >= MAX_EXPERIMENTS_PER_TEAM) return null
    return tx.experiment.create({
      data: {
        teamId: ctx.teamId,
        createdByUserId: ctx.dbUserId,
        title: data.title,
        description: data.description ?? '',
        xLabel: data.xLabel || 'x',
        yLabel: data.yLabel || 'y',
      },
      select: { id: true, title: true, description: true, xLabel: true, yLabel: true },
    })
  })

  if (!experiment) {
    return NextResponse.json(
      {
        error: `A lab holds at most ${MAX_EXPERIMENTS_PER_TEAM} experiments — delete one to start another.`,
      },
      { status: 409 },
    )
  }

  // A fresh experiment has no points yet — same list shape as GET.
  return NextResponse.json({ experiment: { ...experiment, measurementCount: 0 } })
}
