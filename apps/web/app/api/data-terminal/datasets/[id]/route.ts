import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import type { ColumnSpec, DataRow, TableType } from '@/lib/data-terminal/dataset'
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
 * One dataset — read, edit, delete. Every query is scoped by `teamId` in the
 * SAME statement that selects by id (SEC-1's standard shape): never
 * fetch-by-id-then-check, which leaks existence through timing and is one
 * forgotten `if` away from an IDOR.
 */

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'data_terminal' })
  if (error) return error

  const dataset = await db.dataset.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: {
      id: true,
      name: true,
      tableType: true,
      sourceFilename: true,
      columns: true,
      rows: true,
      charts: true,
      scripts: true,
      analyses: true,
      layouts: true,
      rowCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  return NextResponse.json({ dataset })
}

const PatchBody = z
  .object({
    name: DatasetNameSchema.optional(),
    tableType: TableTypeSchema.optional(),
    columns: ColumnsSchema.optional(),
    rows: RowsSchema.optional(),
    // Sheets-mode chart specs. Client-owned draft state; the editor round-trips
    // the whole array, so a save carrying `charts` replaces them wholesale.
    charts: ChartsSchema.optional(),
    // Code-lane scripts. Same round-trip-the-whole-array contract as charts.
    scripts: ScriptsSchema.optional(),
    // Lab-mode analysis specs (inputs only). Same whole-array round-trip.
    analyses: AnalysesSchema.optional(),
    // Poster layouts (Phase F2). Same whole-array round-trip as the others.
    layouts: LayoutsSchema.optional(),
    /**
     * Optimistic concurrency. A dataset is team-shared, so two students can
     * have the same grid open; without this the second save silently discards
     * the first student's work. The client echoes the `updatedAt` it loaded and
     * gets a 409 if the row moved underneath it.
     */
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strict()

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PatchBody, {
    maxBytes: MAX_DATASET_BODY_BYTES,
  })
  if (bodyError) return bodyError

  // Read, merge and write in ONE transaction. `tableType` changes which roles
  // are legal, so a patch that only changes the type still has to be validated
  // against the columns already stored — validating the patch alone would let
  // an XY table keep its x column after becoming a Column table.
  const outcome = await db.$transaction(async (tx) => {
    // Serialize writers for this dataset for the length of the transaction.
    //
    // Without it the version check was read-then-update: `$transaction` runs at
    // READ COMMITTED, so two students' autosaves could both SELECT the same
    // `updatedAt`, both pass the comparison, and the second overwrite the first
    // — losing exactly the work the 409 exists to protect, and telling neither
    // of them. The lock makes the compare and the write one indivisible step.
    await lockAggregate(tx, `dataset:${params.id}`)

    const current = await tx.dataset.findFirst({
      where: { id: params.id, teamId: ctx.teamId },
      select: { id: true, tableType: true, columns: true, rows: true, updatedAt: true },
    })
    if (!current) return { status: 404 as const }

    if (
      data.expectedUpdatedAt &&
      current.updatedAt.toISOString() !== new Date(data.expectedUpdatedAt).toISOString()
    ) {
      return { status: 409 as const }
    }

    const tableType = (data.tableType ?? current.tableType) as TableType
    const columns = (data.columns ?? (current.columns as unknown as ColumnSpec[])) ?? []
    const rows = (data.rows ?? (current.rows as unknown as DataRow[])) ?? []

    // No `allowEmpty` here: an existing dataset may be emptied only by deleting
    // it. A PATCH carrying `columns: []` was previously waived along with every
    // other check, so it wiped the stored schema AND skipped the byte cap.
    const problem = datasetProblem(columns, rows, tableType)
    if (problem) return { status: 400 as const, problem }

    const dataset = await tx.dataset.update({
      where: { id: current.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.tableType !== undefined ? { tableType: data.tableType } : {}),
        // Prisma's `InputJsonValue` only admits index-signature types, so a
        // declared interface array needs the cast even though the value is
        // plain JSON. Both have already been through `ColumnsSchema`/`RowsSchema`
        // and `datasetProblem`, so this widens the type, never the trust.
        ...(data.columns !== undefined ? { columns: columns as unknown as Prisma.InputJsonValue } : {}),
        ...(data.rows !== undefined
          ? { rows: rows as unknown as Prisma.InputJsonValue, rowCount: rows.length }
          : {}),
        // Charts are not part of the structural dataset (they carry no rows), so
        // they skip `datasetProblem` and persist straight through once zod has
        // bounded them. Same widen-the-type-not-the-trust cast as columns/rows.
        ...(data.charts !== undefined
          ? { charts: data.charts as unknown as Prisma.InputJsonValue }
          : {}),
        // Same widen-the-type-not-the-trust cast; `ScriptsSchema` has bounded it.
        ...(data.scripts !== undefined
          ? { scripts: data.scripts as unknown as Prisma.InputJsonValue }
          : {}),
        // Analysis specs (inputs only) — `AnalysesSchema` has bounded them.
        ...(data.analyses !== undefined
          ? { analyses: data.analyses as unknown as Prisma.InputJsonValue }
          : {}),
        // Poster layouts — `LayoutsSchema` has bounded them.
        ...(data.layouts !== undefined
          ? { layouts: data.layouts as unknown as Prisma.InputJsonValue }
          : {}),
      },
      select: {
        id: true,
        name: true,
        tableType: true,
        sourceFilename: true,
        columns: true,
        rows: true,
        charts: true,
        scripts: true,
        analyses: true,
        layouts: true,
        rowCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return { status: 200 as const, dataset }
  })

  if (outcome.status === 404) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }
  if (outcome.status === 409) {
    return NextResponse.json(
      {
        error:
          'Someone on your team saved this dataset while you were editing. Reload to see their changes before saving yours.',
      },
      { status: 409 },
    )
  }
  if (outcome.status === 400) {
    return NextResponse.json({ error: outcome.problem }, { status: 400 })
  }

  return NextResponse.json({ dataset: outcome.dataset })
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate', feature: 'data_terminal' })
  if (error) return error

  // Scoped delete — an id from another team matches nothing and is inert.
  const { count } = await db.dataset.deleteMany({
    where: { id: params.id, teamId: ctx.teamId },
  })
  if (count === 0) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
