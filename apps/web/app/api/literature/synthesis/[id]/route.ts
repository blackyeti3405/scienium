import { NextResponse } from 'next/server'
import { withTeamRoute, ApiError } from '@/lib/api/with-route'
import { db } from '@/lib/db'
import { PatchBody, parseColumns, toMatrixView } from '@/lib/literature/synthesis'

/**
 * GET    /api/literature/synthesis/[id]   — one matrix, joined with its (still
 *          team-owned) papers and its cells. The team-scoped `findFirst` below
 *          IS the IDOR guard — a matrix id from another team 404s.
 * PATCH  /api/literature/synthesis/[id]   — any teammate may edit (papers are
 *          a team asset and the grid is a shared team artifact — same model as
 *          citations and the rubric self-check). `createdByUserId` stays
 *          attribution-only and is never checked for write access.
 * DELETE /api/literature/synthesis/[id]   — team-scoped delete; cells cascade.
 */
export const GET = withTeamRoute({ tier: 'read', feature: 'literature' }, async ({ ctx, params }) => {
  const matrix = await db.synthesisMatrix.findFirst({ where: { id: params.id, teamId: ctx.teamId } })
  if (!matrix) throw new ApiError('Not found', 404)

  const [papers, cells] = await Promise.all([
    db.paper.findMany({
      where: { id: { in: matrix.paperIds }, teamId: ctx.teamId },
      select: { id: true, title: true, authors: true },
    }),
    db.synthesisCell.findMany({ where: { matrixId: matrix.id } }),
  ])

  return NextResponse.json(toMatrixView(matrix, papers, cells))
})

export const PATCH = withTeamRoute(
  { tier: 'mutate', feature: 'literature', body: PatchBody },
  async ({ ctx, data, params }) => {
    const existing = await db.synthesisMatrix.findFirst({ where: { id: params.id, teamId: ctx.teamId } })
    if (!existing) throw new ApiError('Not found', 404)

    // Resolve what the columns/paperIds set will be ONCE this PATCH lands —
    // used both to write the row and to validate any `cells` in this SAME
    // request against the post-edit grid (not the stale pre-edit one).
    let nextColumnIds = new Set(parseColumns(existing.columnsJson).map((c) => c.id))
    let nextPaperIds = existing.paperIds
    let droppedColumnIds: string[] = []
    let droppedPaperIds: string[] = []

    if (data.columns) {
      const newIds = new Set(data.columns.map((c) => c.id))
      droppedColumnIds = [...nextColumnIds].filter((id) => !newIds.has(id))
      nextColumnIds = newIds
    }

    if (data.paperIds) {
      // Team-scope + ownership guard (IDOR), re-checked on every PATCH that
      // touches paperIds — never trust a previously-validated set.
      const validPapers = await db.paper.findMany({
        where: { id: { in: data.paperIds }, teamId: ctx.teamId, status: 'ready' },
        select: { id: true },
      })
      if (validPapers.length !== data.paperIds.length) {
        throw new ApiError('Pick 2–4 of your own ready sources', 400)
      }
      droppedPaperIds = nextPaperIds.filter((id) => !data.paperIds!.includes(id))
      nextPaperIds = data.paperIds
    }

    const nextPaperIdSet = new Set(nextPaperIds)
    for (const cell of data.cells ?? []) {
      if (!nextPaperIdSet.has(cell.paperId) || !nextColumnIds.has(cell.columnId)) {
        throw new ApiError('A cell referenced a paper or column not in this matrix', 400)
      }
    }

    const updated = await db.$transaction(async (tx) => {
      if (droppedColumnIds.length > 0) {
        await tx.synthesisCell.deleteMany({
          where: { matrixId: existing.id, columnId: { in: droppedColumnIds } },
        })
      }
      if (droppedPaperIds.length > 0) {
        await tx.synthesisCell.deleteMany({
          where: { matrixId: existing.id, paperId: { in: droppedPaperIds } },
        })
      }
      for (const cell of data.cells ?? []) {
        await tx.synthesisCell.upsert({
          where: {
            matrixId_paperId_columnId: { matrixId: existing.id, paperId: cell.paperId, columnId: cell.columnId },
          },
          create: { matrixId: existing.id, paperId: cell.paperId, columnId: cell.columnId, text: cell.text },
          update: { text: cell.text },
        })
      }
      return tx.synthesisMatrix.update({
        where: { id: existing.id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.columns ? { columnsJson: data.columns } : {}),
          ...(data.paperIds ? { paperIds: data.paperIds } : {}),
        },
      })
    })

    const [papers, cells] = await Promise.all([
      db.paper.findMany({
        where: { id: { in: updated.paperIds }, teamId: ctx.teamId },
        select: { id: true, title: true, authors: true },
      }),
      db.synthesisCell.findMany({ where: { matrixId: updated.id } }),
    ])

    return NextResponse.json(toMatrixView(updated, papers, cells))
  },
)

export const DELETE = withTeamRoute({ tier: 'mutate', feature: 'literature' }, async ({ ctx, params }) => {
  const existing = await db.synthesisMatrix.findFirst({
    where: { id: params.id, teamId: ctx.teamId },
    select: { id: true },
  })
  if (!existing) throw new ApiError('Not found', 404)

  await db.synthesisMatrix.delete({ where: { id: existing.id } })

  return NextResponse.json({ ok: true })
})
