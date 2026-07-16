import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { withTeamRoute, ApiError } from '@/lib/api/with-route'
import { db } from '@/lib/db'
import { findTemplate, templateForLabType } from '@/content/literature/synthesis-templates'
import { CreateBody, MAX_MATRICES_PER_TEAM, toMatrixView } from '@/lib/literature/synthesis'

/**
 * GET  /api/literature/synthesis — the team's matrix list (light shape —
 * paperCount only, not the full grid; see [id]/route.ts for the full detail).
 * POST /api/literature/synthesis — create a matrix from 2-4 of the team's own
 * ready papers, seeded from a template (explicit `templateId`, or the team's
 * `labType` default).
 */
export const GET = withTeamRoute({ tier: 'read', feature: 'literature' }, async ({ ctx }) => {
  const matrices = await db.synthesisMatrix.findMany({
    where: { teamId: ctx.teamId },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    matrices: matrices.map((m) => ({
      id: m.id,
      title: m.title,
      templateId: m.templateId,
      paperCount: m.paperIds.length,
      updatedAt: m.updatedAt.toISOString(),
      lastCheckedAt: m.lastCheckedAt ? m.lastCheckedAt.toISOString() : null,
    })),
  })
})

export const POST = withTeamRoute(
  { tier: 'mutate', feature: 'literature', body: CreateBody },
  async ({ ctx, data }) => {
    const existingCount = await db.synthesisMatrix.count({ where: { teamId: ctx.teamId } })
    if (existingCount >= MAX_MATRICES_PER_TEAM) {
      throw new ApiError(
        `You can have at most ${MAX_MATRICES_PER_TEAM} synthesis matrices — delete one to make room.`,
        409,
      )
    }

    // Team-scope + ownership guard (IDOR): every paperId must resolve under
    // this team AND be a ready source — a paperId from another team, or one
    // that's still processing, fails the count check below.
    const papers = await db.paper.findMany({
      where: { id: { in: data.paperIds }, teamId: ctx.teamId, status: 'ready' },
      select: { id: true, title: true, authors: true },
    })
    if (papers.length !== data.paperIds.length) {
      throw new ApiError('Pick 2–4 of your own ready sources', 400)
    }

    const template = (data.templateId ? findTemplate(data.templateId) : undefined) ?? templateForLabType(ctx.labType)

    const matrix = await db.synthesisMatrix.create({
      data: {
        teamId: ctx.teamId,
        templateId: template.id,
        columnsJson: template.columns as unknown as Prisma.InputJsonValue,
        paperIds: data.paperIds,
        createdByUserId: ctx.dbUserId,
      },
    })

    return NextResponse.json(toMatrixView(matrix, papers, []), { status: 201 })
  },
)
