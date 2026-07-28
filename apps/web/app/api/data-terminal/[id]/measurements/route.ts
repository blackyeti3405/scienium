import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'

// Scoped single query (SEC-1's standard shape) — never fetch-by-id-then-check.
async function ownedExperiment(id: string, teamId: string) {
  return db.experiment.findFirst({ where: { id, teamId }, select: { id: true } })
}

/**
 * Hard cap on points per experiment: enforced at write time and used as a
 * read backstop, so payloads stay bounded as a class accumulates a year of
 * data. Far above any real classroom dataset (charts get unreadable long
 * before this), so no pagination UI is needed for the pilot.
 *
 * The write cap is ATOMIC (REFACTOR2 P2-S1): the count and the insert run in
 * one transaction behind an advisory lock, so two concurrent pastes cannot
 * each see room for 500 points and store 2,500 between them.
 */
const MAX_POINTS_PER_EXPERIMENT = 2_000

/**
 * Reads ONE row past the cap so overflow is DETECTED rather than hidden
 * (REFACTOR2 P2-S2). With the write cap now atomic no new experiment can
 * exceed it, but rows a pre-fix race already stored must announce themselves
 * instead of vanishing off the end of an x-ascending `take`.
 */
function listMeasurements(experimentId: string) {
  return db.measurement.findMany({
    where: { experimentId },
    orderBy: { x: 'asc' },
    select: { id: true, x: true, y: true, series: true, note: true },
    take: MAX_POINTS_PER_EXPERIMENT + 1,
  })
}

/**
 * GET /api/data-terminal/[id]/measurements — one experiment's points, loaded
 * lazily when it's selected (the list route returns counts only — PERF-2).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const rows = await listMeasurements(params.id)
  const truncated = rows.length > MAX_POINTS_PER_EXPERIMENT
  if (truncated) rows.pop()

  return NextResponse.json({ measurements: rows, truncated, cap: MAX_POINTS_PER_EXPERIMENT })
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

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  if (!(await ownedExperiment(params.id, ctx.teamId))) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const { data, error: bodyError } = await parseJson(req, AddBody)
  if (bodyError) return bodyError

  // Count and insert under one advisory lock (P2-S1) — a count outside the
  // write's transaction is a suggestion, not a cap. Same shape as the showcase
  // slot cap in app/api/showcase/asset/link/route.ts.
  const outcome = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `experiment-points:${params.id}`)
    const existing = await tx.measurement.count({ where: { experimentId: params.id } })
    if (existing + data.points.length > MAX_POINTS_PER_EXPERIMENT) {
      return { existing, created: null }
    }
    // Return ONLY the created rows (P2-1): echoing the whole history after
    // every write made the POST payload grow with a term's data; the client
    // merges these into its already-loaded set instead.
    const created = await tx.measurement.createManyAndReturn({
      data: data.points.map((p) => ({
        experimentId: params.id,
        x: p.x,
        y: p.y,
        series: p.series ?? '',
        note: p.note ?? null,
      })),
      select: { id: true, x: true, y: true, series: true, note: true },
    })
    return { existing, created }
  })

  if (!outcome.created) {
    return NextResponse.json(
      {
        error: `An experiment holds at most ${MAX_POINTS_PER_EXPERIMENT} points (${outcome.existing} recorded). Start a new experiment or delete old points.`,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({
    created: outcome.created,
    total: outcome.existing + outcome.created.length,
  })
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
