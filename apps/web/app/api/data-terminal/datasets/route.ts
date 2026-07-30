import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { MAX_DATASETS_PER_TEAM } from '@/lib/data-terminal/dataset'
import { Prisma } from '@prisma/client'
import {
  AnalysesSchema,
  ChartsSchema,
  LayoutsSchema,
  ScriptsSchema,
  ColumnsSchema,
  DatasetNameSchema,
  RowsSchema,
  TableTypeSchema,
  datasetProblem,
  MAX_DATASET_BODY_BYTES,
} from '@/lib/data-terminal/dataset-schema'

/**
 * Data Terminal datasets — the spine under all three lanes (Sheets / Lab /
 * Code). Team-scoped; every route asserts `data_terminal`, so datasets unlock
 * at the `working` phase exactly as the experiments they replace did.
 *
 * See docs/SPEC.md §7.6 (Data Terminal).
 */

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  // `rows` is never in the list payload — a term of datasets would be megabytes
  // of cells nobody is looking at. The selected dataset loads its own rows.
  const datasets = await db.dataset.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { createdAt: 'desc' },
    // Exactly the write cap, so the list is a backstop that cannot hide a row.
    take: MAX_DATASETS_PER_TEAM,
    select: {
      id: true,
      name: true,
      tableType: true,
      sourceFilename: true,
      columns: true,
      rowCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ datasets })
}

const CreateBody = z
  .object({
    name: DatasetNameSchema,
    tableType: TableTypeSchema,
    sourceFilename: z.string().trim().max(255).optional(),
    // Both optional so "New dataset" and "import this CSV" are one route. An
    // empty dataset starts with no columns and the grid adds the first one.
    columns: ColumnsSchema.optional(),
    rows: RowsSchema.optional(),
    // Rare on create (a fresh dataset has no charts yet), but accepted so a
    // "duplicate this dataset" ever needs only one route.
    charts: ChartsSchema.optional(),
    // Likewise for Code-lane scripts — fresh datasets have none, but a duplicate
    // may carry them.
    scripts: ScriptsSchema.optional(),
    // Likewise for Lab-mode analysis specs.
    analyses: AnalysesSchema.optional(),
    // Likewise for poster layouts (Phase F2).
    layouts: LayoutsSchema.optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CreateBody, {
    maxBytes: MAX_DATASET_BODY_BYTES,
  })
  if (bodyError) return bodyError

  const columns = data.columns ?? []
  const rows = data.rows ?? []

  // An empty dataset is a legitimate starting point, so `allowEmpty` waives the
  // "needs at least one column" issue — and ONLY that one. Gating the whole
  // check on `columns.length > 0` instead waived the byte cap and the
  // rectangular-rows check too, which let a body with no columns and megabytes
  // of rows through.
  const problem = datasetProblem(columns, rows, data.tableType, true)
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 })
  }

  // Count + create under one advisory lock so two concurrent creates at the cap
  // cannot both see room.
  const dataset = await db.$transaction(async (tx) => {
    await lockAggregate(tx, `team-datasets:${ctx.teamId}`)
    const existing = await tx.dataset.count({ where: { teamId: ctx.teamId } })
    if (existing >= MAX_DATASETS_PER_TEAM) return null
    return tx.dataset.create({
      data: {
        teamId: ctx.teamId,
        createdByUserId: ctx.dbUserId,
        name: data.name,
        tableType: data.tableType,
        sourceFilename: data.sourceFilename ?? null,
        columns,
        rows,
        ...(data.charts ? { charts: data.charts as unknown as Prisma.InputJsonValue } : {}),
        ...(data.scripts ? { scripts: data.scripts as unknown as Prisma.InputJsonValue } : {}),
        ...(data.analyses ? { analyses: data.analyses as unknown as Prisma.InputJsonValue } : {}),
        ...(data.layouts ? { layouts: data.layouts as unknown as Prisma.InputJsonValue } : {}),
        rowCount: rows.length,
      },
      select: {
        id: true,
        name: true,
        tableType: true,
        sourceFilename: true,
        columns: true,
        rowCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  if (!dataset) {
    return NextResponse.json(
      {
        error: `A lab holds at most ${MAX_DATASETS_PER_TEAM} datasets — delete one to start another.`,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ dataset })
}
